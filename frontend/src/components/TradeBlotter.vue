<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBlotterStore } from '@/stores/blotter'
import {
  decimalPlaces,
  formatCurrency,
  formatNotional,
  formatQuantity,
  formatTimestamp,
  priceDecimalPadding,
} from '@/format'
import type { Trade } from '@/types'

type SortKey = 'timestamp' | 'symbol' | 'side' | 'quantity' | 'price' | 'notional'
type SortDirection = 'asc' | 'desc'

interface Column {
  key: SortKey
  label: string
  numeric: boolean
  /** Text reads naturally A→Z on first click; times and amounts are most useful newest/largest first. */
  firstDirection: SortDirection
}

const { trades, isLoading, error, lastBookedTradeId } = storeToRefs(useBlotterStore())

const columns: Column[] = [
  { key: 'timestamp', label: 'Time', numeric: false, firstDirection: 'desc' },
  { key: 'symbol', label: 'Symbol', numeric: false, firstDirection: 'asc' },
  { key: 'side', label: 'Side', numeric: false, firstDirection: 'asc' },
  { key: 'quantity', label: 'Quantity', numeric: true, firstDirection: 'desc' },
  { key: 'price', label: 'Price', numeric: true, firstDirection: 'desc' },
  { key: 'notional', label: 'Notional', numeric: true, firstDirection: 'desc' },
]

// Sorting is view state for this table only, so it lives here rather than in the store.
const sortKey = ref<SortKey>('timestamp')
const sortDirection = ref<SortDirection>('desc')

const notional = (trade: Trade) => trade.quantity * trade.price

// Prices show 2-4 decimals. Padding each one (invisibly) to the most decimals in the column lines
// up the decimal points, and the header still ends on the same edge as the widest price.
const priceDecimals = computed(() =>
  Math.max(2, ...trades.value.map((trade) => decimalPlaces(formatCurrency(trade.price)))),
)

function sortValue(trade: Trade, key: SortKey): string | number {
  switch (key) {
    case 'timestamp':
      return trade.id // ids are assigned in booking order, and avoid parsing dates
    case 'notional':
      return notional(trade)
    default:
      return trade[key]
  }
}

/** A sorted copy for display; the store's array is never reordered. */
const sortedTrades = computed(() => {
  const key = sortKey.value
  const direction = sortDirection.value === 'asc' ? 1 : -1
  return [...trades.value].sort((a, b) => {
    const left = sortValue(a, key)
    const right = sortValue(b, key)
    const order =
      typeof left === 'string' ? left.localeCompare(String(right)) : left - Number(right)
    return (order || a.id - b.id) * direction // ties: booking order
  })
})

const sortDescription = computed(() => {
  const label = columns.find((column) => column.key === sortKey.value)?.label
  return `sorted by ${label}, ${sortDirection.value === 'asc' ? 'ascending' : 'descending'}`
})

function sortBy(column: Column) {
  if (sortKey.value === column.key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = column.key
    sortDirection.value = column.firstDirection
  }
}

/** Only the sorted column carries aria-sort, as the ARIA spec recommends. */
function ariaSort(key: SortKey) {
  if (sortKey.value !== key) return undefined
  return sortDirection.value === 'asc' ? 'ascending' : 'descending'
}

// Each newly booked trade is highlighted once. The highlight is dropped when its fade ends, so
// re-sorting (which moves rows and would restart a CSS animation) can't replay it.
const highlightedTradeId = ref<number | null>(null)
watch(lastBookedTradeId, (id) => {
  highlightedTradeId.value = id
})

function onRowAnimationEnd(tradeId: number) {
  if (highlightedTradeId.value === tradeId) {
    highlightedTradeId.value = null
  }
}
</script>

<template>
  <section class="panel blotter">
    <h2>Trades</h2>

    <p v-if="isLoading && trades.length === 0" class="empty-state">Loading trades…</p>
    <p v-else-if="trades.length === 0" class="empty-state">
      {{ error ? 'Trades are unavailable.' : 'No trades yet. Book a trade to populate the blotter.' }}
    </p>

    <div v-else class="table-scroll" role="region" aria-label="Trades table" tabindex="0">
      <table>
        <caption class="visually-hidden">
          Trades, {{ sortDescription }}
        </caption>
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :class="{ numeric: column.numeric }"
              :aria-sort="ariaSort(column.key)"
            >
              <button type="button" class="sort-button" @click="sortBy(column)">
                {{ column.label }}
                <span
                  :class="['sort-indicator', { active: sortKey === column.key }]"
                  aria-hidden="true"
                  >{{ sortKey !== column.key ? '↕' : sortDirection === 'asc' ? '▲' : '▼' }}</span
                >
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="trade in sortedTrades"
            :key="trade.id"
            :class="{ 'row-new': trade.id === highlightedTradeId }"
            @animationend="onRowAnimationEnd(trade.id)"
          >
            <td class="time" :title="trade.timestamp">{{ formatTimestamp(trade.timestamp) }}</td>
            <td class="symbol">{{ trade.symbol }}</td>
            <td>
              <span :class="['badge', trade.side.toLowerCase()]">{{ trade.side }}</span>
            </td>
            <td class="numeric">{{ formatQuantity(trade.quantity) }}</td>
            <td class="numeric">
              {{ formatCurrency(trade.price)
              }}<span class="decimal-pad" aria-hidden="true">{{
                priceDecimalPadding(formatCurrency(trade.price), priceDecimals)
              }}</span>
            </td>
            <td class="numeric">{{ formatNotional(notional(trade)) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
