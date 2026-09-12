// Copies the Stackdome OpenAPI document and applies the prune, flatten and
// rename passes described in the slice-0 plan. Run once via
// `pnpm --filter @stackbox/contract exec tsx scripts/transform.ts`; the
// output is then hand-owned. Deleted once slice 1 closes.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { load, dump } from 'js-yaml'

const OUTPUT = resolve(import.meta.dirname, '../openapi/stackbox_api.yaml')

// The Stackdome checkout is a sibling repo, not part of this one, so its path
// is never hard-coded: only a machine with that checkout can regenerate the
// contract, and every other machine gets a clear error instead of a bad path.
function sourcePath(): string {
  const value = process.env.STACKDOME_OPENAPI
  if (!value) {
    throw new Error(
      'STACKDOME_OPENAPI is required: set it to the path of stackdome_api.yaml before running pnpm generate.',
    )
  }
  return value
}

// Shared with transform.spec.ts so the prune list is never a magic string
// duplicated between the script and its test.
export const PRUNED_GROUPS = [
  'addons', 'postgres', 'clusters', 'secrets', 'object-stores', 'volumes',
  'domains', 'image_registries', 'registry-credentials', 'projects',
  'project-roles', 'preview', 'templates',
]

// Exact schema-name overrides called out by the plan. Any other schema whose
// name contains "Stack" falls through to the generic substitution below.
export const SCHEMA_RENAME_MAP: Record<string, string> = {
  Stack: 'ApplicationInstance',
  StackList: 'ApplicationInstanceList',
  StackSpec: 'ApplicationInstanceSpec',
  StackSettings: 'ApplicationInstanceSettings',
  StackLifecycle: 'InstanceLifecycle',
}

type JsonObject = Record<string, unknown>

// A path is "project management" shaped when, ignoring path params, it ends
// at "projects" or "projects/members" -- the Project CRUD/membership
// resource itself. Deeper resources nested under a project (stacks and
// everything under it) are NOT project management and survive prune; the
// flatten pass strips their leading projects/{project_name} segment instead.
function isProjectManagementPath(path: string): boolean {
  const statics = path.split('/').filter((seg) => seg && !seg.startsWith('{'))
  const index = statics.indexOf('projects')
  if (index === -1) return false
  const next = statics[index + 1]
  return next === undefined || next === 'members'
}

function isPrunedPath(path: string): boolean {
  if (isProjectManagementPath(path)) return true
  return PRUNED_GROUPS.filter((g) => g !== 'projects').some((group) => path.includes(group))
}

function isRef(value: unknown): value is { $ref: string } {
  return typeof value === 'object' && value !== null && typeof (value as JsonObject).$ref === 'string'
}

// Depth-first walk of every value in a JSON-ish tree, invoking `visit` on
// every $ref target string found.
function walkRefs(node: unknown, visit: (target: string) => void): void {
  if (Array.isArray(node)) {
    for (const item of node) walkRefs(item, visit)
    return
  }
  if (node && typeof node === 'object') {
    if (isRef(node)) visit(node.$ref)
    for (const value of Object.values(node as JsonObject)) walkRefs(value, visit)
  }
}

function schemaNameFromRef(ref: string): string | undefined {
  const match = /^#\/components\/schemas\/(.+)$/.exec(ref)
  return match?.[1]
}

// Properties that survive reachability only because a surviving schema still
// points at a schema whose own dedicated group is pruned (or whose
// vocabulary is banned outright). Left alone, the schema-name test would
// still see Volume/DomainName/UserProjectMembership, and deleting those
// schemas anyway would leave a dangling $ref. Removing the referencing
// property is the fix the plan calls for.
const DANGLING_REF_FIXUPS: Array<{ schema: string; property: string }> = [
  { schema: 'StackSpec', property: 'volumes' },
  { schema: 'StackReleaseSnapshot', property: 'volumes' },
  { schema: 'Organisation', property: 'domains' },
  { schema: 'User', property: 'projects' },
]

// Schemas dropped outright even though something used to reference them --
// their whole vocabulary (Project) is banned, not just one field. Removing
// the properties above already makes these unreachable; listing them here
// too is belt and suspenders, and it's the single place a future prune adds
// another one.
export const PRUNED_SCHEMAS = ['UserProjectMembership']

// The demote-admin request body was 100% Project-scoped fields (project_name,
// role). Once those are gone there's nothing left to send, so the operation
// loses its request body outright rather than keeping an empty schema.
const REMOVED_REQUEST_BODIES: Array<{ path: string; method: string }> = [
  { path: '/api/v1/organizations/{org_id}/admins/{user_id}/demote', method: 'post' },
]

function removeDanglingRefs(schemas: JsonObject, report: string[]): void {
  for (const { schema, property } of DANGLING_REF_FIXUPS) {
    const target = schemas[schema] as JsonObject | undefined
    const properties = target?.properties as JsonObject | undefined
    if (!properties || !(property in properties)) continue
    delete properties[property]
    const required = target!.required as string[] | undefined
    if (required) target!.required = required.filter((name) => name !== property)
    report.push(`${schema}.${property}`)
  }
}

function removeObsoleteRequestBodies(paths: JsonObject, report: string[]): void {
  for (const { path, method } of REMOVED_REQUEST_BODIES) {
    const operation = (paths[path] as JsonObject | undefined)?.[method] as JsonObject | undefined
    if (!operation || !('requestBody' in operation)) continue
    delete operation.requestBody
    if (typeof operation.description === 'string') operation.description = 'Demotes an OrgAdmin.'
    report.push(`${method.toUpperCase()} ${path} requestBody`)
  }
}

function prune(doc: JsonObject, report: string[]): void {
  const paths = doc.paths as JsonObject
  for (const path of Object.keys(paths)) {
    if (isPrunedPath(path)) delete paths[path]
  }

  const schemas = doc.components as unknown as { schemas: JsonObject; parameters: JsonObject }
  removeDanglingRefs(schemas.schemas, report)
  removeObsoleteRequestBodies(paths, report)

  const reachable = new Set<string>()
  const queue: string[] = []
  const enqueue = (name: string) => {
    if (!reachable.has(name)) {
      reachable.add(name)
      queue.push(name)
    }
  }
  walkRefs(paths, (ref) => {
    const name = schemaNameFromRef(ref)
    if (name) enqueue(name)
  })
  while (queue.length > 0) {
    const name = queue.pop()!
    walkRefs(schemas.schemas[name], (ref) => {
      const next = schemaNameFromRef(ref)
      if (next) enqueue(next)
    })
  }

  for (const name of Object.keys(schemas.schemas)) {
    if (!reachable.has(name)) delete schemas.schemas[name]
  }
  for (const name of PRUNED_SCHEMAS) delete schemas.schemas[name]

  // Safety net: fail loudly rather than ship a dangling $ref if reachability
  // missed a case symmetrical to the ones fixed above.
  const dangling: string[] = []
  walkRefs(doc, (ref) => {
    const name = schemaNameFromRef(ref)
    if (name && !(name in schemas.schemas)) dangling.push(ref)
  })
  if (dangling.length > 0) {
    throw new Error(`prune left dangling $refs: ${dangling.join(', ')}`)
  }
}

// One flatten target collides with a path that was already there: the
// project-scoped "list/create instances" path lands on
// /organizations/{org_id}/stacks, which already held the org-wide "list
// across all projects" GET. Once there's no more project partitioning those
// two GETs are the same operation; keep the project-scoped one (it already
// had pagination) and carry forward the org-wide one's OrgAdmin-visibility
// note before it's discarded, rather than silently dropping it.
const ORG_WIDE_LIST_SUMMARY = 'List all stacks'
const ORG_WIDE_LIST_DESCRIPTION =
  'Returns instances the user has access to in the org. OrgAdmins see all instances in the org.'

function mergeFlattenedCollision(paths: JsonObject, target: string, incomingPath: string, report: string[]): void {
  const existing = paths[target] as JsonObject
  const incoming = paths[incomingPath] as JsonObject
  for (const [method, operation] of Object.entries(incoming)) {
    if (!(method in existing)) {
      existing[method] = operation
      continue
    }
    const incomingOp = operation as JsonObject
    incomingOp.summary = ORG_WIDE_LIST_SUMMARY
    if (!incomingOp.description) incomingOp.description = ORG_WIDE_LIST_DESCRIPTION
    existing[method] = incomingOp
    report.push(`merged ${method.toUpperCase()} ${target} (collision with ${incomingPath})`)
  }
}

function flatten(doc: JsonObject, report: string[]): void {
  const paths = doc.paths as JsonObject
  for (const path of Object.keys(paths)) {
    if (!path.includes('/projects/{project_name}')) continue
    const flattened = path.replace('/projects/{project_name}', '')
    if (flattened in paths) {
      mergeFlattenedCollision(paths, flattened, path, report)
    } else {
      paths[flattened] = paths[path]
    }
    delete paths[path]
  }

  for (const path of Object.keys(paths)) {
    const operations = paths[path] as JsonObject
    for (const operation of Object.values(operations)) {
      const params = (operation as JsonObject)?.parameters as unknown[] | undefined
      if (!Array.isArray(params)) continue
      ;(operation as JsonObject).parameters = params.filter(
        (p) => !(isRef(p) && p.$ref === '#/components/parameters/project_name'),
      )
    }
  }

  const parameters = (doc.components as JsonObject).parameters as JsonObject
  delete parameters.project_name

  // A number of surviving schemas -- some top-level, some inline objects
  // nested inside a surviving schema (e.g. ReleaseSnapshot's embedded
  // `stack` object) -- still carried a plain project_name/project_id string
  // field left over from the pruned Project resource. Same fix as a
  // dangling $ref: drop the field, wherever in the tree it appears.
  const schemas = (doc.components as JsonObject).schemas as JsonObject
  for (const [name, schema] of Object.entries(schemas)) {
    stripPrunedScalarProperties(schema, name, report)
  }
}

const PRUNED_SCALAR_PROPERTIES = ['project_name', 'project_id']

function stripPrunedScalarProperties(node: unknown, label: string, report: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((item) => stripPrunedScalarProperties(item, label, report))
    return
  }
  if (!node || typeof node !== 'object') return
  const obj = node as JsonObject
  const properties = obj.properties as JsonObject | undefined
  if (properties) {
    for (const prop of PRUNED_SCALAR_PROPERTIES) {
      if (!(prop in properties)) continue
      delete properties[prop]
      const required = obj.required as string[] | undefined
      if (required) obj.required = required.filter((n) => n !== prop)
      report.push(`${label}.${prop}`)
    }
  }
  for (const value of Object.values(obj)) stripPrunedScalarProperties(value, label, report)
}

function renamedSchemaName(name: string): string {
  if (SCHEMA_RENAME_MAP[name]) return SCHEMA_RENAME_MAP[name]
  if (name.startsWith('StackRelease')) return name.replace('StackRelease', 'Release')
  if (name.includes('Stack')) return name.replace('Stack', 'ApplicationInstance')
  return name
}

// A couple of description phrases stated project-scoped uniqueness rules
// that no longer hold once Projects are pruned. Exact-string fixups
// (verified unique in the source) rather than a broad prose scrub.
const PROSE_FIXUPS: Array<[string, string]> = [
  ['unique per project', 'unique per org'],
  ['exists in the project it is reconciled', 'exists it is reconciled'],
  // Em dashes in source prose. Fixed here so a future regeneration never
  // reintroduces one; each entry is the exact source text, verified unique.
  // The dash itself is a — escape rather than a literal character so
  // this file, which people read, carries no em dash of its own.
  ['ignored — add\nchildren via', 'ignored. Add\nchildren via'],
  ['body are ignored — use `PUT', 'body are ignored. Use `PUT'],
  ['Idempotent — clients need not know', 'Idempotent: clients need not know'],
  ['not started — retry later', 'not started. Retry later'],
  // Volumes no longer has a schema of its own once its group is pruned, so
  // naming it beside StackResources is stale; say "resources" instead.
  [' such as StackResources or Volumes', ''],
]

function applyProseFixups(text: string): string {
  return PROSE_FIXUPS.reduce((result, [from, to]) => result.split(from).join(to), text)
}

// Case-preserving whole-word replace of "stack"/"stacks" -> "instance"/
// "instances". Word boundaries mean Stackfile/Stackdome never match.
function renameStackWord(text: string): string {
  const applyCase = (match: string, replacement: string) => {
    if (match === match.toUpperCase()) return replacement.toUpperCase()
    if (match[0] === match[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1)
    return replacement
  }
  return text
    .replace(/\bstacks\b/gi, (m) => applyCase(m, 'instances'))
    .replace(/\bstack\b/gi, (m) => applyCase(m, 'instance'))
}

// Description/summary prose sometimes names a schema directly (`Corresponds
// to StackConnection.from`). Once that schema is renamed the mention would
// point at an identifier that no longer exists, so rewrite it too -- exact
// name and the informal plural (StackResources) both count as a mention.
function renameSchemaMentions(text: string, renameMap: Map<string, string>): string {
  let result = text
  for (const [oldName, newName] of renameMap) {
    if (oldName === newName) continue
    result = result
      .replace(new RegExp(`\\b${oldName}s\\b`, 'g'), `${newName}s`)
      .replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName)
  }
  return result
}

// Property keys that still spelled out "stack" verbatim. A bare `stack` key
// only ever names ReleaseSnapshot's embedded object, never a path or schema
// name, so it is safe to rename unconditionally wherever it appears.
const RENAMED_PROPERTY_KEYS: Record<string, string> = {
  stack_id: 'instance_id',
  stack_resources: 'instance_resources',
  stack_resource_id: 'instance_resource_id',
  stack_resource_name: 'instance_resource_name',
  stack: 'instance',
}

function renameKey(key: string): string {
  return RENAMED_PROPERTY_KEYS[key] ?? key
}

// Same substitution as a schema name (Stack -> ApplicationInstance,
// Stackfile untouched), applied inside a camelCase operationId instead of a
// standalone identifier: applyStackByName -> applyApplicationInstanceByName.
function renameOperationId(id: string): string {
  return id.replace(/Stack(?!file)/g, 'ApplicationInstance')
}

// Recursively rewrites schema $refs, the "stack_id" property key, the word
// "stack" (plus direct schema-name mentions) inside summary/description
// strings, and Stack inside operationId. Schema-name renaming itself happens
// separately, directly on components.schemas' keys.
function renameTree(node: unknown, renameMap: Map<string, string>): unknown {
  if (Array.isArray(node)) return node.map((item) => renameTree(item, renameMap))
  if (node && typeof node === 'object') {
    if (isRef(node)) {
      const name = schemaNameFromRef(node.$ref)
      return name ? { $ref: `#/components/schemas/${renameMap.get(name) ?? name}` } : node
    }
    const result: JsonObject = {}
    for (const [key, value] of Object.entries(node as JsonObject)) {
      const newKey = renameKey(key)
      if ((key === 'summary' || key === 'description') && typeof value === 'string') {
        result[newKey] = renameStackWord(renameSchemaMentions(applyProseFixups(value), renameMap))
      } else if (key === 'operationId' && typeof value === 'string') {
        result[newKey] = renameOperationId(value)
      } else if (key === 'required' && Array.isArray(value)) {
        // A required list names properties by their old keys; keep it in
        // sync with the property rename above or it points at fields that
        // no longer exist.
        result[newKey] = value.map((name) => (typeof name === 'string' ? renameKey(name) : name))
      } else {
        result[newKey] = renameTree(value, renameMap)
      }
    }
    return result
  }
  return node
}

function rename(doc: JsonObject): void {
  const info = doc.info as JsonObject
  info.title = 'Stackbox API'

  const schemas = (doc.components as JsonObject).schemas as JsonObject
  const renameMap = new Map(Object.keys(schemas).map((name) => [name, renamedSchemaName(name)]))

  const paths = doc.paths as JsonObject
  for (const path of Object.keys(paths)) {
    const renamedPath = path.replace('/stacks', '/instances').replace('{stack_id}', '{instance_id}')
    paths[renamedPath] = renameTree(paths[path], renameMap)
    if (renamedPath !== path) delete paths[path]
  }

  for (const name of Object.keys(schemas)) {
    const renamed = renameMap.get(name)!
    schemas[renamed] = renameTree(schemas[name], renameMap)
    if (renamed !== name) delete schemas[name]
  }

  const parameters = (doc.components as JsonObject).parameters as JsonObject
  for (const name of Object.keys(parameters)) {
    parameters[name] = renameTree(parameters[name], renameMap)
  }
}

function main(): void {
  const report: string[] = []
  const doc = load(readFileSync(sourcePath(), 'utf8')) as JsonObject

  prune(doc, report)
  flatten(doc, report)
  rename(doc)

  writeFileSync(OUTPUT, dump(doc, { lineWidth: -1 }))

  if (report.length > 0) {
    console.log(`Removed: ${report.join(', ')}`)
  }
  console.log(`Wrote ${OUTPUT}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
