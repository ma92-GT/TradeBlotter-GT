import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { api, ApiError } from '@/api'
import { useBlotterStore } from '@/stores/blotter'
import type { Position, Trade } from '@/types'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  api: { getTrades: vi.fn(), getPositions: vi.fn(), createTrade: vi.fn() },
}))

const trade = (id: number, overrides: Partial<Trade> = {}): Trade => ({
  id,
  symbol: 'AAPL',
  side: 'Buy',
  quantity: 100,
  price: 10,
  timestamp: '2026-10-05T09:30:00+00:00',
  ...overrides,
})

describe('blotter store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('loads trades and positions and derives the summary metrics', async () => {
    vi.mocked(api.getTrades).mockResolvedValue([
      trade(2, { side: 'Sell', quantity: 50, price: 12.5 }),
      trade(1, { quantity: 100, price: 10 }),
    ])
    vi.mocked(api.getPositions).mockResolvedValue([{ symbol: 'AAPL', quantity: 50, averageCost: 10 }])
    const store = useBlotterStore()

    await store.load()

    expect(store.trades.map((t) => t.id)).toEqual([2, 1])
    expect(store.totalTrades).toBe(2)
    expect(store.grossNotional).toBe(1625) // 50 × 12.5 + 100 × 10; sells count gross, not net
    expect(store.activePositionCount).toBe(1)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('reports a load failure without throwing', async () => {
    vi.mocked(api.getTrades).mockRejectedValue(new ApiError('Cannot reach the trade server.', 0))
    vi.mocked(api.getPositions).mockResolvedValue([])
    const store = useBlotterStore()

    await store.load()

    expect(store.error).toBe('Could not load trades: Cannot reach the trade server.')
    expect(store.isLoading).toBe(false)
  })

  it('puts a booked trade at the top of the blotter and refreshes positions from the server', async () => {
    vi.mocked(api.getTrades).mockResolvedValue([trade(1)])
    vi.mocked(api.getPositions).mockResolvedValue([])
    const store = useBlotterStore()
    await store.load()

    const booked = trade(2, { side: 'Sell', quantity: 150, price: 12 })
    const refreshed: Position[] = [{ symbol: 'AAPL', quantity: -50, averageCost: 12 }]
    vi.mocked(api.createTrade).mockResolvedValue(booked)
    vi.mocked(api.getPositions).mockResolvedValue(refreshed)

    await store.submitTrade({ symbol: 'AAPL', side: 'Sell', quantity: 150, price: 12 })

    expect(store.trades.map((t) => t.id)).toEqual([2, 1])
    expect(store.positions).toEqual(refreshed)
    expect(store.isSubmitting).toBe(false)
  })

  it('rethrows a rejected trade so the form can show the reasons, leaving the blotter unchanged', async () => {
    const rejection = new ApiError('One or more validation errors occurred.', 400, {
      price: ['Price must be greater than 0 and at most 1,000,000.'],
    })
    vi.mocked(api.createTrade).mockRejectedValue(rejection)
    const store = useBlotterStore()

    await expect(
      store.submitTrade({ symbol: 'AAPL', side: 'Buy', quantity: 1, price: 2_000_000 }),
    ).rejects.toBe(rejection)

    expect(store.trades).toEqual([])
    expect(api.getPositions).not.toHaveBeenCalled()
    expect(store.isSubmitting).toBe(false)
  })
})
