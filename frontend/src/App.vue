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
  </header>

  <p v-if="error" class="error-banner" role="alert">
    {{ error }}
    <button type="button" :disabled="isLoading" @click="store.load">Retry</button>
  </p>

  <SummaryBar />

  <main class="layout">
    <div class="sidebar">
      <TradeForm />
      <PositionsPanel />
    </div>
    <TradeBlotter />
  </main>
</template>
