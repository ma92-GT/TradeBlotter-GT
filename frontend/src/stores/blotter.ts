import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api, ApiError } from '@/api'
import type { CreateTradeRequest, Position, Trade } from '@/types'

/**
 * Server-backed state for the blotter: trades, the positions derived from them, and request status.
 *
 * The server owns trade ids, timestamps and all position accounting. This store never creates
 * either and never calculates positions; it shows what the API returns.
 */
export const useBlotterStore = defineStore('blotter', () => {
  /** Newest first, as GET /trades returns them. The blotter applies its own display sort. */
  const trades = ref<Trade[]>([])
  const positions = ref<Position[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  /** Load or refresh failure to show the user. Booking rejections are returned to the caller instead. */
  const error = ref<string | null>(null)
  /** The most recent trade booked in this session, so the blotter can identify it. */
  const lastBookedTradeId = ref<number | null>(null)

  const totalTrades = computed(() => trades.value.length)
  const activePositions = computed(() => positions.value.length)
  /** Sum of |quantity × price| over all trades. Buys and sells both add; nothing nets off. */
  const grossNotional = computed(() =>
    trades.value.reduce((total, trade) => total + Math.abs(trade.quantity * trade.price), 0),
  )

  // On failure, each fetch keeps the data it already had and records why.
  async function fetchTrades() {
    try {
      trades.value = await api.getTrades()
    } catch (e) {
      error.value = `Could not load trades. ${describe(e)}`
    }
  }

  async function fetchPositions() {
    try {
      positions.value = await api.getPositions()
    } catch (e) {
      error.value = `Could not load positions. ${describe(e)}`
    }
  }

  /** Loads everything the page needs. Also serves as "retry" after a failure. */
  async function load() {
    isLoading.value = true
    error.value = null
    try {
      await Promise.all([fetchTrades(), fetchPositions()])
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Books a trade: the server-created trade goes to the top of the blotter immediately,
   * then positions are refreshed from the server.
   *
   * If the server rejects the trade, the ApiError (with any field messages) is rethrown for the
   * form to show, and no state changes.
   */
  async function submitTrade(request: CreateTradeRequest): Promise<Trade> {
    isSubmitting.value = true
    try {
      const trade = await api.createTrade(request)

      // A reload that overlapped this request may already have returned the new trade.
      if (!trades.value.some((existing) => existing.id === trade.id)) {
        trades.value.unshift(trade)
      }
      lastBookedTradeId.value = trade.id

      try {
        positions.value = await api.getPositions()
      } catch (e) {
        error.value = `Trade booked, but positions could not be refreshed. ${describe(e)}`
      }
      return trade
    } finally {
      isSubmitting.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    trades,
    positions,
    isLoading,
    isSubmitting,
    error,
    lastBookedTradeId,
    totalTrades,
    activePositions,
    grossNotional,
    load,
    fetchTrades,
    fetchPositions,
    submitTrade,
    clearError,
  }
})

function describe(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Unexpected error.'
}
