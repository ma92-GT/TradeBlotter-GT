// Display formatting. Each Intl formatter is built once at module load, not per render.
// All amounts are USD; the API has no currency field.

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
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

/** Number of decimal places in a formatted amount such as "$300.125". */
export function decimalPlaces(formatted: string): number {
  return formatted.length - formatted.indexOf('.') - 1
}

/**
 * Zeros that pad a formatted price to `columnDecimals` places. Rendered invisibly, they line up
 * decimal points in a right-aligned column without padding past the widest value in it.
 */
export function priceDecimalPadding(formattedPrice: string, columnDecimals: number): string {
  return '0'.repeat(Math.max(0, columnDecimals - decimalPlaces(formattedPrice)))
}

/** Notional amounts, totals and position average costs: $18,725.00 (always 2 decimal places). */
export const formatNotional = (value: number) => notional.format(value)

/**
 * Position average cost for display: $190.22. Display only; the full-precision value from the
 * API is kept and shown in the cell's tooltip.
 */
export const formatAverageCost = formatNotional

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
