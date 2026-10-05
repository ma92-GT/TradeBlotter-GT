import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { api, ApiError } from '@/api'
import { useBlotterStore } from '@/stores/blotter'
import type { CreateTradeRequest, Position, Trade } from '@/types'

// Mock at the API boundary: the store's logic runs for real, the network does not.
vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  api: { getTrades: vi.fn(), getPositions: vi.fn(), createTrade: vi.fn() },
}))

const trade = (id: number, overrides: Partial<Trade> = {}): Trade => ({
  id,
  symbol: 'AAPL',
  side: 'Buy',
  quantity: 100,
  price: 20,
  timestamp: `2026-10-05T14:30:0${id}+00:00`,
  ...overrides,
})

const existingTrades = [trade(2, { side: 'Sell', quantity: 40, price: 25 }), trade(1)]
const existingPositions: Position[] = [{ symbol: 'AAPL', quantity: 60, averageCost: 20 }]

// Like real responses, every call returns fresh arrays, so the store can't mutate the fixtures.
const serve = <T>(data: T[]) => async () => structuredClone(data)

async function loadedStore() {
  vi.mocked(api.getTrades).mockImplementation(serve(existingTrades))
  vi.mocked(api.getPositions).mockImplementation(serve(existingPositions))
  const store = useBlotterStore()
  await store.load()
  vi.clearAllMocks()
  return store
}

const request: CreateTradeRequest = { symbol: 'AAPL', side: 'Sell', quantity: 100, price: 22 }

describe('blotter store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  describe('loading', () => {
    it('populates trades and positions from the API', async () => {
      const store = await loadedStore()

      expect(store.trades).toEqual(existingTrades)
      expect(store.positions).toEqual(existingPositions)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('exposes a failure and keeps the data it already had', async () => {
      const store = await loadedStore()
      vi.mocked(api.getTrades).mockRejectedValue(new ApiError('Cannot reach the trade server.', 0))
      vi.mocked(api.getPositions).mockImplementation(serve(existingPositions))

      await store.load()

      expect(store.error).toBe('Could not load trades. Cannot reach the trade server.')
      expect(store.trades).toEqual(existingTrades)
      expect(store.isLoading).toBe(false)
    })

    it('clears the error on retry and on request', async () => {
      const store = await loadedStore()
      store.error = 'Could not load trades. Cannot reach the trade server.'
      vi.mocked(api.getTrades).mockImplementation(serve(existingTrades))
      vi.mocked(api.getPositions).mockImplementation(serve(existingPositions))

      await store.load()
      expect(store.error).toBeNull()

      store.error = 'Something went wrong.'
      store.clearError()
      expect(store.error).toBeNull()
    })
  })

  describe('summary getters', () => {
    it('count trades and open positions, and sum gross notional across buys and sells', async () => {
      const store = await loadedStore()

      expect(store.totalTrades).toBe(2)
      expect(store.activePositions).toBe(1)
      expect(store.grossNotional).toBe(3000) // |40 × 25| + |100 × 20|; the sell adds, it does not net
    })
  })

  describe('booking a trade', () => {
    it('prepends the server-created trade, marks it as last booked and refreshes positions', async () => {
      const store = await loadedStore()
      const booked = trade(3, { side: 'Sell', quantity: 100, price: 22 })
      const refreshedPositions: Position[] = [{ symbol: 'AAPL', quantity: -40, averageCost: 22 }]
      vi.mocked(api.createTrade).mockResolvedValue(booked)
      vi.mocked(api.getPositions).mockResolvedValue(refreshedPositions)

      const result = await store.submitTrade(request)

      expect(api.createTrade).toHaveBeenCalledWith(request) // no client-side id or timestamp
      expect(result).toEqual(booked)
      expect(store.trades).toEqual([booked, ...existingTrades])
      expect(store.lastBookedTradeId).toBe(3)
      expect(api.getPositions).toHaveBeenCalledOnce()
      expect(store.positions).toEqual(refreshedPositions)
      expect(store.totalTrades).toBe(3)
      expect(store.isSubmitting).toBe(false)
    })

    it('does not add the trade twice if an overlapping reload already returned it', async () => {
      const store = await loadedStore()
      const booked = trade(3)
      store.trades = [booked, ...existingTrades]
      vi.mocked(api.createTrade).mockResolvedValue(booked)
      vi.mocked(api.getPositions).mockImplementation(serve(existingPositions))

      await store.submitTrade(request)

      expect(store.trades.map((t) => t.id)).toEqual([3, 2, 1])
    })

    it('rethrows a rejection and leaves trades, positions and the last booked trade unchanged', async () => {
      const store = await loadedStore()
      const rejection = new ApiError('One or more validation errors occurred.', 400, {
        price: ['Price must be greater than 0 and at most 1,000,000.'],
      })
      vi.mocked(api.createTrade).mockRejectedValue(rejection)

      await expect(store.submitTrade(request)).rejects.toBe(rejection)

      expect(store.trades).toEqual(existingTrades)
      expect(store.positions).toEqual(existingPositions)
      expect(store.lastBookedTradeId).toBeNull()
      expect(api.getPositions).not.toHaveBeenCalled()
      expect(store.error).toBeNull() // the caller shows booking errors
      expect(store.isSubmitting).toBe(false)
    })

    it('keeps the booked trade and reports it when the positions refresh fails', async () => {
      const store = await loadedStore()
      vi.mocked(api.createTrade).mockResolvedValue(trade(3))
      vi.mocked(api.getPositions).mockRejectedValue(new ApiError('The trade server is unavailable. Please try again.', 503))

      await store.submitTrade(request)

      expect(store.trades.map((t) => t.id)).toEqual([3, 2, 1])
      expect(store.lastBookedTradeId).toBe(3)
      expect(store.positions).toEqual(existingPositions)
      expect(store.error).toBe(
        'Trade booked, but positions could not be refreshed. The trade server is unavailable. Please try again.',
      )
    })
  })
})
