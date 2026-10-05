<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ApiError } from '@/api'
import { useBlotterStore } from '@/stores/blotter'
import type { Side } from '@/types'
import {
  validateTrade,
  type TradeField,
  type TradeFormErrors,
  type TradeFormValues,
} from '@/validation'

const store = useBlotterStore()
const { isSubmitting } = storeToRefs(store)

const sides: Side[] = ['Buy', 'Sell']
const form = reactive<TradeFormValues>({ symbol: '', side: 'Buy', quantity: '', price: '' })

// Errors appear once a field has been left or a submit was attempted, not while typing.
const touched = reactive<Partial<Record<TradeField, boolean>>>({})
const submitAttempted = ref(false)
const serverErrors = ref<TradeFormErrors>({})
const formError = ref<string | null>(null)
const quantityInput = useTemplateRef<HTMLInputElement>('quantity-input')

const validation = computed(() => validateTrade(form))

const visibleErrors = computed<TradeFormErrors>(() => {
  const clientErrors = validation.value.ok ? {} : validation.value.errors
  const errors: TradeFormErrors = {}
  for (const field of ['symbol', 'side', 'quantity', 'price'] as const) {
    const message = serverErrors.value[field] ?? clientErrors[field]
    if (message && (submitAttempted.value || touched[field] || serverErrors.value[field])) {
      errors[field] = message
    }
  }
  return errors
})

// Server messages describe the values that were sent; drop them once the user edits the form.
watch(form, () => {
  serverErrors.value = {}
  formError.value = null
})

async function submit() {
  submitAttempted.value = true
  formError.value = null
  const result = validation.value
  if (!result.ok || isSubmitting.value) {
    return
  }

  try {
    await store.submitTrade(result.trade)
    // Keep symbol and side for quick follow-up orders; clear the amounts.
    form.quantity = ''
    form.price = ''
    submitAttempted.value = false
    touched.quantity = false
    touched.price = false
    quantityInput.value?.focus()
  } catch (e) {
    showSubmitError(e)
  }
}

function showSubmitError(e: unknown) {
  if (!(e instanceof ApiError)) {
    formError.value = 'Unexpected error. The trade was not booked.'
    return
  }

  const fieldErrors: TradeFormErrors = {}
  for (const [key, messages] of Object.entries(e.fieldErrors)) {
    if (key in form && messages[0]) {
      fieldErrors[key as TradeField] = messages[0]
    }
  }
  serverErrors.value = fieldErrors
  if (Object.keys(fieldErrors).length === 0) {
    formError.value = `${e.message} The trade was not booked.`
  }
}
</script>

<template>
  <form class="panel trade-form" novalidate @submit.prevent="submit">
    <h2>New Trade</h2>

    <fieldset class="side-choice">
      <legend>Side</legend>
      <label v-for="side in sides" :key="side" :class="['side-option', side.toLowerCase()]">
        <input v-model="form.side" type="radio" name="side" :value="side" />
        {{ side }}
      </label>
    </fieldset>

    <label class="field">
      <span>Symbol</span>
      <input
        v-model="form.symbol"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="AAPL"
        :aria-invalid="!!visibleErrors.symbol"
        @blur="touched.symbol = true"
      />
      <span v-if="visibleErrors.symbol" class="field-error">{{ visibleErrors.symbol }}</span>
    </label>

    <label class="field">
      <span>Quantity</span>
      <input
        ref="quantity-input"
        v-model="form.quantity"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        placeholder="100"
        :aria-invalid="!!visibleErrors.quantity"
        @blur="touched.quantity = true"
      />
      <span v-if="visibleErrors.quantity" class="field-error">{{ visibleErrors.quantity }}</span>
    </label>

    <label class="field">
      <span>Price</span>
      <input
        v-model="form.price"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        placeholder="187.25"
        :aria-invalid="!!visibleErrors.price"
        @blur="touched.price = true"
      />
      <span v-if="visibleErrors.price" class="field-error">{{ visibleErrors.price }}</span>
    </label>

    <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

    <button type="submit" :disabled="isSubmitting">
      {{ isSubmitting ? 'Booking…' : 'Book Trade' }}
    </button>
  </form>
</template>
