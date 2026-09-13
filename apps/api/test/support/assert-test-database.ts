// Guards destructive test setup (schema drops) from ever running against a
// database whose name doesn't mark it as disposable.
export function assertTestDatabaseUrl(url: string): void {
  const name = new URL(url).pathname.slice(1)
  if (!name.endsWith('_test')) {
    throw new Error(
      `refusing to reset database '${name}': name must end with '_test'`,
    )
  }
}
