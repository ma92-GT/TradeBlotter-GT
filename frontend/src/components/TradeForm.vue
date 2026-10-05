<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ApiError } from '@/api'
import { useBlotterStore } from '@/stores/blotter'
import { formatCurrency, formatNotional, formatQuantity } from '@/format'
import type { TradeSide } from '@/types'
import {
  mapServerErrors,
  parsePrice,
  parseQuantity,
  TRADE_FIELDS,
  validateTrade,
  type TradeField,
  type TradeFormErrors,
  type TradeFormValues,
} from '@/validation'

const store = useBlotterStore()
const { isSubmitting } = storeToRefs(store)

const sides: { value: TradeSide; label: string }[] = [
  { value: 'Buy', label: 'BUY' },
  { value: 'Sell', label: 'SELL' },
]

// No side is preselected: the first trade's direction should be a deliberate choice.
const form = reactive<TradeFormValues>({ symbol: '', side: '', quantity: '', price: '' })

// Client errors appear after a submit attempt, or once a field with something in it has been left.
// Leaving an empty field is not an error until the user tries to book.
const touched = reactive<Record<TradeField, boolean>>({
  symbol: false,
  side: false,
  quantity: false,
  price: false,
})
const submitAttempted = ref(false)
const serverErrors = ref<TradeFormErrors>({})
const formError = ref<string | null>(null)
/** Confirms the last booking next to the form (and to screen readers via role="status"). */
const bookedMessage = ref('')
const quantityInput = useTemplateRef<HTMLInputElement>('quantity-input')

const validation = computed(() => validateTrade(form))

const visibleErrors = computed<TradeFormErrors>(() => {
  const clientErrors = validation.value.ok ? {} : validation.value.errors
  const errors: TradeFormErrors = {}
  for (const field of TRADE_FIELDS) {
    const showClientError = submitAttempted.value || (touched[field] && form[field].trim() !== '')
    const message = serverErrors.value[field] ?? (showClientError ? clientErrors[field] : undefined)
    if (message) {
      errors[field] = message
    }
  }
  return errors
})

const estimatedNotional = computed(() => {
  const quantity = parseQuantity(form.quantity)
  const price = parsePrice(form.price)
  return quantity === null || price === null ? null : quantity * price
})

const submitLabel = computed(() => {
  if (isSubmitting.value) return 'Booking…'
  return form.side ? `Book ${form.side}` : 'Book Trade'
})

// A server message describes the value that was sent; drop it once that field is edited.
for (const field of TRADE_FIELDS) {
  watch(
    () => form[field],
    () => {
      serverErrors.value = { ...serverErrors.value, [field]: undefined }
      formError.value = null
    },
  )
}

// Shown upper-case while typing (CSS); the value itself is normalised when the field is left,
// so the caret never jumps mid-edit.
function onSymbolBlur() {
  form.symbol = form.symbol.trim().toUpperCase()
  touched.symbol = true
}

async function submit() {
  submitAttempted.value = true
  formError.value = null
  bookedMessage.value = ''
  const result = validation.value
  if (!result.ok || isSubmitting.value) {
    return
  }

  let trade
  try {
    trade = await store.submitTrade(result.trade)
  } catch (e) {
    showSubmitError(e)
    return
  }
  bookedMessage.value =
    `Booked ${trade.side.toUpperCase()} ${formatQuantity(trade.quantity)} ${trade.symbol} ` +
    `@ ${formatCurrency(trade.price)}`

  // Ready for the next order: same symbol and side, new amounts.
  form.quantity = ''
  form.price = ''
  touched.quantity = false
  touched.price = false
  submitAttempted.value = false
  quantityInput.value?.focus()
}

function showSubmitError(e: unknown) {
  if (!(e instanceof ApiError)) {
    formError.value = 'The trade was not booked because of an unexpected error.'
    return
  }

  const { fieldErrors, otherErrors } = mapServerErrors(e.fieldErrors)
  serverErrors.value = fieldErrors
  if (otherErrors.length > 0) {
    formError.value = `The trade was not booked. ${otherErrors.join(' ')}`
  } else if (Object.keys(fieldErrors).length === 0) {
    formError.value = `The trade was not booked. ${e.message}`
  }
}
</script>

<template>
  <form class="panel trade-form" novalidate @submit.prevent="submit">
    <h2>New Trade</h2>

    <fieldset class="field">
      <legend>Side</legend>
      <div class="side-toggle">
        <label
          v-for="side in sides"
          :key="side.value"
          :class="['side-option', side.value.toLowerCase()]"
        >
          <input
            v-model="form.side"
            class="visually-hidden"
            type="radio"
            name="side"
            :value="side.value"
            @blur="touched.side = true"
          />
          <span>{{ side.label }}</span>
        </label>
      </div>
      <span v-if="visibleErrors.side" class="field-error">{{ visibleErrors.side }}</span>
    </fieldset>

    <label class="field">
      <span>Symbol</span>
      <input
        v-model="form.symbol"
        class="symbol-input"
        type="text"
        maxlength="10"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        placeholder="e.g. AAPL"
        :aria-invalid="!!visibleErrors.symbol"
        @blur="onSymbolBlur"
      />
      <span v-if="visibleErrors.symbol" class="field-error">{{ visibleErrors.symbol }}</span>
    </label>

    <div class="field-row">
      <label class="field">
        <span>Quantity</span>
        <input
          ref="quantity-input"
          v-model="form.quantity"
          type="text"
          inputmode="numeric"
          autocomplete="off"
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
          :aria-invalid="!!visibleErrors.price"
          @blur="touched.price = true"
        />
        <span v-if="visibleErrors.price" class="field-error">{{ visibleErrors.price }}</span>
      </label>
    </div>

    <p class="notional-preview">
      Estimated Notional:
      <span class="numeric">{{
        estimatedNotional === null ? '—' : formatNotional(estimatedNotional)
      }}</span>
    </p>

    <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

    <button
      type="submit"
      :class="['submit-button', form.side.toLowerCase()]"
      :disabled="isSubmitting"
    >
      {{ submitLabel }}
    </button>

    <p class="form-status" role="status">{{ bookedMessage }}</p>
  </form>
</template>
