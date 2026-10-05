import type { CreateTradeRequest, TradeSide } from './types'

// Mirrors the server's rules (CreateTradeRequest) so most mistakes are caught before a round trip.
// The server remains the authority; its messages are shown if it disagrees.

/**
 * Raw form input. Numbers stay strings so an empty or half-typed field isn't mistaken for 0,
 * and side is '' until the user chooses one.
 */
export interface TradeFormValues {
  symbol: string
  side: TradeSide | ''
  quantity: string
  price: string
}

export type TradeField = keyof TradeFormValues
export type TradeFormErrors = Partial<Record<TradeField, string>>

export type TradeValidationResult =
  | { ok: true; trade: CreateTradeRequest }
  | { ok: false; errors: TradeFormErrors }

export const TRADE_FIELDS: readonly TradeField[] = ['symbol', 'side', 'quantity', 'price']

const SYMBOL_PATTERN = /^[A-Za-z][A-Za-z0-9.-]{0,9}$/
const WHOLE_NUMBER_PATTERN = /^\d+$/
const DECIMAL_PATTERN = /^(?:\d+\.?\d*|\.\d+)$/ // 12, 12.5, 12., .5
const MAX_QUANTITY = 1_000_000_000
const MAX_PRICE = 1_000_000

/** A whole number from 1 to 1,000,000,000, or null if the text isn't one. */
export function parseQuantity(text: string): number | null {
  const trimmed = text.trim()
  const quantity = Number(trimmed)
  return WHOLE_NUMBER_PATTERN.test(trimmed) && quantity >= 1 && quantity <= MAX_QUANTITY
    ? quantity
    : null
}

/** A price above 0 and at most 1,000,000, or null if the text isn't one. */
export function parsePrice(text: string): number | null {
  const trimmed = text.trim()
  const price = Number(trimmed)
  return DECIMAL_PATTERN.test(trimmed) && price > 0 && price <= MAX_PRICE ? price : null
}

export function validateTrade(values: TradeFormValues): TradeValidationResult {
  const errors: TradeFormErrors = {}

  const symbol = values.symbol.trim().toUpperCase()
  if (!symbol) {
    errors.symbol = 'Symbol is required.'
  } else if (!SYMBOL_PATTERN.test(symbol)) {
    errors.symbol = "Symbol must be 1-10 letters, digits, '.' or '-', starting with a letter."
  }

  const side = values.side
  if (!side) {
    errors.side = 'Choose Buy or Sell.'
  }

  const quantity = parseQuantity(values.quantity)
  if (!values.quantity.trim()) {
    errors.quantity = 'Quantity is required.'
  } else if (quantity === null) {
    errors.quantity = 'Quantity must be a whole number between 1 and 1,000,000,000.'
  }

  const price = parsePrice(values.price)
  if (!values.price.trim()) {
    errors.price = 'Price is required.'
  } else if (price === null) {
    errors.price = 'Price must be greater than 0 and at most 1,000,000.'
  }

  if (!side || quantity === null || price === null || errors.symbol) {
    return { ok: false, errors }
  }
  return { ok: true, trade: { symbol, side, quantity, price } }
}

/**
 * Splits the server's validation messages (see ApiError.fieldErrors) into messages for the form's
 * fields and any that don't belong to a field, such as a problem with the request body as a whole.
 */
export function mapServerErrors(serverErrors: Record<string, string[]>): {
  fieldErrors: TradeFormErrors
  otherErrors: string[]
} {
  const fieldErrors: TradeFormErrors = {}
  const otherErrors: string[] = []
  for (const [key, messages] of Object.entries(serverErrors)) {
    const field = TRADE_FIELDS.find((name) => name === key.toLowerCase())
    if (field && messages[0]) {
      fieldErrors[field] = messages[0]
    } else {
      otherErrors.push(...messages)
    }
  }
  return { fieldErrors, otherErrors }
}
