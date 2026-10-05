<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBlotterStore } from '@/stores/blotter'
import { formatCurrency, formatSignedQuantity } from '@/format'

const { positions, isLoading, error } = storeToRefs(useBlotterStore())
</script>

<template>
  <section class="panel positions">
    <h2>Positions</h2>

    <p v-if="isLoading && positions.length === 0" class="empty-state">Loading positions…</p>
    <p v-else-if="positions.length === 0" class="empty-state">
      {{ error ? 'Positions are unavailable.' : 'No open positions.' }}
    </p>

    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Direction</th>
            <th class="numeric">Quantity</th>
            <th class="numeric">Avg Cost</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="position in positions" :key="position.symbol">
            <td>{{ position.symbol }}</td>
            <td>
              <span :class="['badge', position.quantity > 0 ? 'long' : 'short']">
                {{ position.quantity > 0 ? 'Long' : 'Short' }}
              </span>
            </td>
            <td class="numeric">{{ formatSignedQuantity(position.quantity) }}</td>
            <td class="numeric">{{ formatCurrency(position.averageCost) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
