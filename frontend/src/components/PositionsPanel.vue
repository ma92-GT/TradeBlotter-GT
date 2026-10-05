<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBlotterStore } from '@/stores/blotter'
import { formatAverageCost, formatSignedQuantity } from '@/format'
import type { Position } from '@/types'

const { positions, isLoading, error } = storeToRefs(useBlotterStore())

// The API never returns flat positions, so every row is either long or short.
const isLong = (position: Position) => position.quantity > 0
</script>

<template>
  <section class="panel positions">
    <h2>Positions</h2>

    <p v-if="isLoading && positions.length === 0" class="empty-state">Loading positions…</p>
    <p v-else-if="positions.length === 0" class="empty-state">
      {{ error ? 'Positions are unavailable.' : 'No active positions.' }}
    </p>

    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Symbol</th>
            <th scope="col">Direction</th>
            <th scope="col" class="numeric">Net Qty</th>
            <th scope="col" class="numeric">Avg Cost</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="position in positions" :key="position.symbol">
            <td class="symbol">{{ position.symbol }}</td>
            <td>
              <span :class="['badge', isLong(position) ? 'long' : 'short']">
                {{ isLong(position) ? 'Long' : 'Short' }}
              </span>
            </td>
            <td :class="['numeric', isLong(position) ? 'positive' : 'negative']">
              {{ formatSignedQuantity(position.quantity) }}
            </td>
            <td class="numeric" :title="`Average cost ${position.averageCost}`">
              {{ formatAverageCost(position.averageCost) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
