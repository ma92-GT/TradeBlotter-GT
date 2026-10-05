<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useBlotterStore } from '@/stores/blotter'
import { formatMoney, formatPrice, formatQuantity, formatTimestamp } from '@/format'
import type { Trade } from '@/types'

type SortKey = 'timestamp' | 'symbol' | 'side' | 'quantity' | 'price' | 'notional'
type SortDirection = 'asc' | 'desc'

const { trades, isLoading, error } = storeToRefs(useBlotterStore())

// Text reads naturally A→Z on first click; times and amounts are most useful newest/largest first.
const columns: { key: SortKey; label: string; numeric: boolean; firstDirection: SortDirection }[] = [
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

const sortedTrades = computed(() => {
  const key = sortKey.value
  const direction = sortDirection.value === 'asc' ? 1 : -1
  return [...trades.value].sort((a, b) => {
    const left = sortValue(a, key)
    const right = sortValue(b, key)
    const order =
      typeof left === 'string' ? left.localeCompare(String(right)) : left - Number(right)
    return (order || a.id - b.id) * direction
  })
})

function sortBy(column: (typeof columns)[number]) {
  if (sortKey.value === column.key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = column.key
    sortDirection.value = column.firstDirection
  }
}

function ariaSort(key: SortKey) {
  if (sortKey.value !== key) return 'none'
  return sortDirection.value === 'asc' ? 'ascending' : 'descending'
}
</script>

<template>
  <section class="panel blotter">
    <h2>Trade Blotter</h2>

    <p v-if="isLoading && trades.length === 0" class="empty-state">Loading trades…</p>
    <p v-else-if="trades.length === 0" class="empty-state">
      {{ error ? 'Trades are unavailable.' : 'No trades yet. Book your first trade with the New Trade form.' }}
    </p>

    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              :class="{ numeric: column.numeric }"
              :aria-sort="ariaSort(column.key)"
            >
              <button type="button" class="sort-button" @click="sortBy(column)">
                {{ column.label }}
                <span aria-hidden="true">{{
                  sortKey === column.key ? (sortDirection === 'asc' ? '▲' : '▼') : ''
                }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="trade in sortedTrades" :key="trade.id">
            <td :title="trade.timestamp">{{ formatTimestamp(trade.timestamp) }}</td>
            <td>{{ trade.symbol }}</td>
            <td>
              <span :class="['badge', trade.side.toLowerCase()]">{{ trade.side }}</span>
            </td>
            <td class="numeric">{{ formatQuantity(trade.quantity) }}</td>
            <td class="numeric">{{ formatPrice(trade.price) }}</td>
            <td class="numeric">{{ formatMoney(notional(trade)) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
