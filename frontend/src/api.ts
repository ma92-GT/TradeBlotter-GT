import type { NewTrade, Position, Trade } from './types'

/** A failed API call, carrying any per-field validation messages from the server. */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string[]>

  constructor(message: string, status: number, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

interface ProblemDetails {
  title?: string
  errors?: Record<string, string[]>
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    })
  } catch {
    throw new ApiError('Cannot reach the trade server.', 0)
  }

  if (!response.ok) {
    throw await toApiError(response)
  }
  return (await response.json()) as T
}

async function toApiError(response: Response): Promise<ApiError> {
  const problem = (await response.json().catch(() => null)) as ProblemDetails | null

  // Errors raised while reading the JSON body are keyed by path ("$.side"); normalise to "side".
  const fieldErrors: Record<string, string[]> = {}
  for (const [key, messages] of Object.entries(problem?.errors ?? {})) {
    fieldErrors[key.replace(/^\$\./, '')] = messages
  }

  const message =
    problem?.title ??
    (response.status >= 500 ? 'The trade server is unavailable.' : `Request failed (${response.status}).`)
  return new ApiError(message, response.status, fieldErrors)
}

export const api = {
  getTrades: () => request<Trade[]>('/trades'),
  getPositions: () => request<Position[]>('/positions'),
  createTrade: (trade: NewTrade) =>
    request<Trade>('/trades', { method: 'POST', body: JSON.stringify(trade) }),
}
