import type { CreateTradeRequest, TradeSide } from './types'

// Mirrors the server's rules (CreateTradeRequest) so most mistakes are caught before a round trip.
// The server remains the authority; its messages are shown if it disagrees.

/** Raw form input. Numbers stay strings until validated so empty fields aren't mistaken for 0. */
export interface TradeFormValues {
  symbol: string
  side: TradeSide
  quantity: string
  price: string
}

export type TradeField = keyof TradeFormValues
export type TradeFormErrors = Partial<Record<TradeField, string>>

export type TradeValidationResult =
  | { ok: true; trade: CreateTradeRequest }
  | { ok: false; errors: TradeFormErrors }

const SYMBOL_PATTERN = /^[A-Za-z][A-Za-z0-9.-]{0,9}$/
const WHOLE_NUMBER_PATTERN = /^\d+$/
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/
const MAX_QUANTITY = 1_000_000_000
const MAX_PRICE = 1_000_000

export function validateTrade(values: TradeFormValues): TradeValidationResult {
  const errors: TradeFormErrors = {}

  const symbol = values.symbol.trim()
  if (!symbol) {
    errors.symbol = 'Symbol is required.'
  } else if (!SYMBOL_PATTERN.test(symbol)) {
    errors.symbol = "Symbol must be 1-10 letters, digits, '.' or '-', starting with a letter."
  }

  const quantityText = values.quantity.trim()
  const quantity = Number(quantityText)
  if (!quantityText) {
    errors.quantity = 'Quantity is required.'
  } else if (!WHOLE_NUMBER_PATTERN.test(quantityText) || quantity < 1 || quantity > MAX_QUANTITY) {
    errors.quantity = 'Quantity must be a whole number between 1 and 1,000,000,000.'
  }

  const priceText = values.price.trim()
  const price = Number(priceText)
  if (!priceText) {
    errors.price = 'Price is required.'
  } else if (!DECIMAL_PATTERN.test(priceText) || price <= 0 || price > MAX_PRICE) {
    errors.price = 'Price must be greater than 0 and at most 1,000,000.'
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }
  return { ok: true, trade: { symbol: symbol.toUpperCase(), side: values.side, quantity, price } }
}
