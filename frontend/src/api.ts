import type { CreateTradeRequest, Position, ProblemDetails, Trade } from './types'

/** A failed API call, with any per-field validation messages the server returned. */
export class ApiError extends Error {
  /** HTTP status, or 0 when the server could not be reached. */
  readonly status: number
  /** Field name (e.g. "price") to messages; empty unless the server rejected specific fields. */
  readonly fieldErrors: Record<string, string[]>

  constructor(message: string, status: number, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export const api = {
  getTrades: () => request<Trade[]>('/trades'),
  getPositions: () => request<Position[]>('/positions'),
  createTrade: (trade: CreateTradeRequest) =>
    request<Trade>('/trades', { method: 'POST', body: JSON.stringify(trade) }),
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
  } catch {
    throw new ApiError('Cannot reach the trade server.', 0)
  }

  if (!response.ok) {
    throw toApiError(response.status, await readJson(response))
  }

  const body = await readJson(response)
  if (body === undefined) {
    throw new ApiError('The trade server returned an unexpected response.', response.status)
  }
  return body as T
}

/** The parsed JSON body, or undefined if there is none or it isn't JSON (e.g. a proxy error page). */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function toApiError(status: number, body: unknown): ApiError {
  const problem = isProblemDetails(body) ? body : undefined
  const message = problem?.detail ?? problem?.title ?? fallbackMessage(status)
  return new ApiError(message, status, fieldErrorsFrom(problem))
}

function isProblemDetails(body: unknown): body is ProblemDetails {
  return typeof body === 'object' && body !== null && ('title' in body || 'errors' in body)
}

function fieldErrorsFrom(problem: ProblemDetails | undefined): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const [key, messages] of Object.entries(problem?.errors ?? {})) {
    if (Array.isArray(messages)) {
      // Errors raised while reading the JSON body are keyed by path ("$.side"); use the field name.
      fieldErrors[key.replace(/^\$\./, '')] = messages
    }
  }
  return fieldErrors
}

function fallbackMessage(status: number): string {
  if (status >= 500) return 'The trade server is unavailable. Please try again.'
  if (status === 404) return 'The requested resource was not found.'
  return `The request failed (HTTP ${status}).`
}
