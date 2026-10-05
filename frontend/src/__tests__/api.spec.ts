import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '@/api'

function respondWith(status: number, body?: unknown, contentType = 'application/problem+json') {
  const payload = typeof body === 'string' || body === undefined ? body : JSON.stringify(body)
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(payload, { status, headers: { 'Content-Type': contentType } })),
  )
}

async function failureOf(call: Promise<unknown>): Promise<ApiError> {
  const error = await call.then(
    () => undefined,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(ApiError)
  return error as ApiError
}

describe('api', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns the parsed body on success', async () => {
    respondWith(200, [{ symbol: 'AAPL', quantity: 100, averageCost: 20 }], 'application/json')

    await expect(api.getPositions()).resolves.toEqual([{ symbol: 'AAPL', quantity: 100, averageCost: 20 }])
  })

  it('keeps per-field validation messages, using plain field names for JSON-path keys', async () => {
    respondWith(400, {
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: {
        price: ['Price must be greater than 0 and at most 1,000,000.'],
        '$.side': ['The input was not valid.'],
      },
    })

    const error = await failureOf(api.createTrade({ symbol: 'AAPL', side: 'Buy', quantity: 1, price: 0 }))

    expect(error.status).toBe(400)
    expect(error.message).toBe('One or more validation errors occurred.')
    expect(error.fieldErrors).toEqual({
      price: ['Price must be greater than 0 and at most 1,000,000.'],
      side: ['The input was not valid.'],
    })
  })

  it('falls back to a readable message when the error body is not problem details', async () => {
    respondWith(502, '<html>Bad Gateway</html>', 'text/html')

    const error = await failureOf(api.getTrades())

    expect(error.status).toBe(502)
    expect(error.message).toBe('The trade server is unavailable. Please try again.')
    expect(error.fieldErrors).toEqual({})
  })

  it('reports an unreachable server as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await failureOf(api.getTrades())

    expect(error.status).toBe(0)
    expect(error.message).toBe('Cannot reach the trade server.')
  })
})
