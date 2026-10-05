<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBlotterStore } from '@/stores/blotter'
import { formatNotional, formatQuantity } from '@/format'

const { totalTrades, activePositions, grossNotional } = storeToRefs(useBlotterStore())
</script>

<template>
  <section class="summary-bar" aria-label="Summary">
    <dl>
      <div class="metric">
        <dt>Total Trades</dt>
        <dd class="numeric">{{ formatQuantity(totalTrades) }}</dd>
      </div>
      <div class="metric">
        <dt>Active Positions</dt>
        <dd class="numeric">{{ formatQuantity(activePositions) }}</dd>
      </div>
      <div class="metric">
        <dt>Gross Notional</dt>
        <dd class="numeric">{{ formatNotional(grossNotional) }}</dd>
      </div>
    </dl>
  </section>
</template>
