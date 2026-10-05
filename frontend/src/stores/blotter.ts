import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api, ApiError } from '@/api'
import type { CreateTradeRequest, Position, Trade } from '@/types'

/**
 * Server state for the blotter: trades, the positions derived from them, and request status.
 * Positions are always fetched from the API, never calculated here, so the accounting rules
 * live in one place (the backend).
 */
export const useBlotterStore = defineStore('blotter', () => {
  const trades = ref<Trade[]>([]) // newest first, as returned by GET /trades
  const positions = ref<Position[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const error = ref<string | null>(null)

  const totalTrades = computed(() => trades.value.length)
  const grossNotional = computed(() =>
    trades.value.reduce((total, trade) => total + trade.quantity * trade.price, 0),
  )
  const activePositionCount = computed(() => positions.value.length)

  async function loadTrades() {
    try {
      trades.value = await api.getTrades()
    } catch (e) {
      error.value = `Could not load trades: ${describe(e)}`
    }
  }

  async function loadPositions() {
    try {
      positions.value = await api.getPositions()
    } catch (e) {
      error.value = `Could not load positions: ${describe(e)}`
    }
  }

  async function load() {
    isLoading.value = true
    error.value = null
    await Promise.all([loadTrades(), loadPositions()])
    isLoading.value = false
  }

  /**
   * Books a trade, shows it at the top of the blotter and refreshes positions.
   * Rejects with the ApiError on failure so the form can show the server's field messages.
   */
  async function submitTrade(newTrade: CreateTradeRequest): Promise<Trade> {
    isSubmitting.value = true
    try {
      const trade = await api.createTrade(newTrade)
      trades.value.unshift(trade)
      await loadPositions()
      return trade
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    trades,
    positions,
    isLoading,
    isSubmitting,
    error,
    totalTrades,
    grossNotional,
    activePositionCount,
    load,
    loadTrades,
    loadPositions,
    submitTrade,
  }
})

function describe(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Unexpected error.'
}
