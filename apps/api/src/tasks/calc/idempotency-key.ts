export function reproKey(taskId: string): string {
  return `${taskId}:repro`
}

export function runKey(taskId: string, number: number): string {
  return `${taskId}:run${number}`
}

export function verifyKey(taskId: string, number: number): string {
  return `${runKey(taskId, number)}:verify`
}

export function messageKey(taskId: string, messageId: string): string {
  return `${taskId}:msg:${messageId}`
}
