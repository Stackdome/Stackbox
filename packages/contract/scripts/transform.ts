// Copies the Stackdome OpenAPI document and applies the prune, flatten and
// rename passes described in the slice-0 plan. Run once via
// `pnpm --filter @stackbox/contract exec tsx scripts/transform.ts`; the
// output is then hand-owned. Deleted once slice 1 closes.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { load, dump } from 'js-yaml'

const SOURCE = '/Users/akshaysasidharan/code/stackdome/config/openapi/stackdome_api.yaml'
const OUTPUT = resolve(import.meta.dirname, '../openapi/stackbox_api.yaml')

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

// Prunes two properties that survive reachability only because a surviving
// schema still points at a schema whose own dedicated group is pruned. Left
// alone, the schema-name test would still see Volume/DomainName/ProjectRole
// (StackSpec, StackReleaseSnapshot, Organisation and DemoteAdminRequest all
// stay reachable), and deleting those schemas anyway would leave a dangling
// $ref. Removing the referencing property is the fix the plan calls for.
const DANGLING_REF_FIXUPS: Array<{ schema: string; property: string }> = [
  { schema: 'StackSpec', property: 'volumes' },
  { schema: 'StackReleaseSnapshot', property: 'volumes' },
  { schema: 'Organisation', property: 'domains' },
  { schema: 'DemoteAdminRequest', property: 'role' },
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

function prune(doc: JsonObject, report: string[]): void {
  const paths = doc.paths as JsonObject
  for (const path of Object.keys(paths)) {
    if (isPrunedPath(path)) delete paths[path]
  }

  const schemas = doc.components as unknown as { schemas: JsonObject; parameters: JsonObject }
  removeDanglingRefs(schemas.schemas, report)

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

function flatten(doc: JsonObject, report: string[]): void {
  const paths = doc.paths as JsonObject
  for (const path of Object.keys(paths)) {
    if (!path.includes('/projects/{project_name}')) continue
    const flattened = path.replace('/projects/{project_name}', '')
    paths[flattened] = paths[path]
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

  // A few surviving schemas (invite/membership request-response bodies) still
  // carried a plain project_name string field left over from the pruned
  // Project resource. Same fix as a dangling $ref: drop the field.
  const schemas = (doc.components as JsonObject).schemas as JsonObject
  for (const [name, schema] of Object.entries(schemas)) {
    const properties = (schema as JsonObject).properties as JsonObject | undefined
    if (!properties || !('project_name' in properties)) continue
    delete properties.project_name
    const required = (schema as JsonObject).required as string[] | undefined
    if (required) (schema as JsonObject).required = required.filter((n) => n !== 'project_name')
    report.push(`${name}.project_name`)
  }
}

function renamedSchemaName(name: string): string {
  if (SCHEMA_RENAME_MAP[name]) return SCHEMA_RENAME_MAP[name]
  if (name.startsWith('StackRelease')) return name.replace('StackRelease', 'Release')
  if (name.includes('Stack')) return name.replace('Stack', 'ApplicationInstance')
  return name
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

function renameKey(key: string): string {
  return key === 'stack_id' ? 'instance_id' : key
}

// Recursively rewrites schema $refs, the "stack_id" property key, and the
// word "stack" (plus direct schema-name mentions) inside summary/description
// strings. Schema-name renaming itself happens separately, directly on
// components.schemas' keys.
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
        result[newKey] = renameStackWord(renameSchemaMentions(value, renameMap))
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
  const doc = load(readFileSync(SOURCE, 'utf8')) as JsonObject

  prune(doc, report)
  flatten(doc, report)
  rename(doc)

  writeFileSync(OUTPUT, dump(doc, { lineWidth: -1 }))

  if (report.length > 0) {
    console.log(`Removed dangling $ref properties: ${report.join(', ')}`)
  }
  console.log(`Wrote ${OUTPUT}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
