// Display formatting. Each Intl formatter is built once at module load, not per render.
// All amounts are USD; the API has no currency field.

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

const averageCost = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

const notional = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const quantity = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const signedQuantity = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  signDisplay: 'exceptZero',
})

// No timeZone option: the browser's local time zone is used.
const timestamp = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Trade prices: $187.25, $300.125, $0.0001 (2 to 4 decimal places). */
export const formatCurrency = (value: number) => currency.format(value)

/**
 * Zeros that pad a formatCurrency() price out to its maximum of 4 decimal places. Rendered
 * invisibly, they make decimal points line up in a right-aligned price column.
 */
export function priceDecimalPadding(formattedPrice: string): string {
  const decimals = formattedPrice.length - formattedPrice.indexOf('.') - 1
  return '0'.repeat(Math.max(0, 4 - decimals))
}

/**
 * Position average cost: $190.2200 (always 4 decimal places, so decimal points align down the
 * column). The API rounds to 6; the exact value is available for a tooltip.
 */
export const formatAverageCost = (value: number) => averageCost.format(value)

/** Notional amounts and totals: $18,725.00 (always 2 decimal places). */
export const formatNotional = (value: number) => notional.format(value)

/** Trade quantities and counts: 1,000. */
export const formatQuantity = (value: number) => quantity.format(value)

/** Position quantities with an explicit direction: +100 long, -100 short. */
export const formatSignedQuantity = (value: number) => signedQuantity.format(value)

/**
 * An API timestamp (ISO 8601, UTC) shown in the browser's local time as
 * "yyyy-MM-dd HH:mm:ss". The ISO string itself is never modified.
 */
export function formatTimestamp(iso: string): string {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const { type, value } of timestamp.formatToParts(new Date(iso))) {
    parts[type] = value
  }
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}
