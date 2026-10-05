<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBlotterStore } from '@/stores/blotter'
import { formatMoney, formatQuantity } from '@/format'

const { totalTrades, grossNotional, activePositionCount } = storeToRefs(useBlotterStore())
</script>

<template>
  <section class="summary" aria-label="Summary">
    <div class="metric">
      <span class="metric-label">Total Trades</span>
      <span class="metric-value numeric">{{ formatQuantity(totalTrades) }}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Gross Notional</span>
      <span class="metric-value numeric">{{ formatMoney(grossNotional) }}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Active Positions</span>
      <span class="metric-value numeric">{{ formatQuantity(activePositionCount) }}</span>
    </div>
  </section>
</template>
