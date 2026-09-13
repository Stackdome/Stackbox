export function fillResource(template: string, params: Record<string, string>): string {
  return template.replace(/:([a-z_]+)/g, (token, name: string) => params[name] ?? token)
}
