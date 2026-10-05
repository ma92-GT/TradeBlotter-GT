<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBlotterStore } from '@/stores/blotter'
import SummaryBar from '@/components/SummaryBar.vue'
import TradeForm from '@/components/TradeForm.vue'
import PositionsPanel from '@/components/PositionsPanel.vue'
import TradeBlotter from '@/components/TradeBlotter.vue'

const store = useBlotterStore()
const { error, isLoading } = storeToRefs(store)

onMounted(store.load)
</script>

<template>
  <header class="app-header">
    <h1>Trade Blotter</h1>
    <p class="app-subtitle">
      <span>All amounts in USD</span> · <span>Positions use weighted-average cost</span>
    </p>
  </header>

  <!-- Data already on screen stays visible; Retry reloads trades and positions. -->
  <div v-if="error" class="error-banner" role="alert">
    <p>
      <strong>Trade data could not be loaded.</strong>
      <span>{{ error }}</span>
    </p>
    <button type="button" class="secondary-button" :disabled="isLoading" @click="store.load">
      Retry
    </button>
  </div>

  <SummaryBar />

  <main class="layout">
    <div class="sidebar">
      <TradeForm />
      <PositionsPanel />
    </div>
    <TradeBlotter />
  </main>
</template>
