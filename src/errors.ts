// Errors a worker handler throws reach the panel's plugin.request() as a rejection carrying
// `code`. Orca keeps the codes it knows (invalid_params, conflict, unavailable, ...) and turns
// anything else into `action_failed`.

export type HostErrorCode =
  | 'invalid_params'
  | 'unavailable'
  | 'action_failed'
  | 'conflict'
  | 'timeout'
  | 'not_permitted'

export type HostError = Error & { code: HostErrorCode }

export function hostError(code: HostErrorCode, message: string): HostError {
  return Object.assign(new Error(message), { code })
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
