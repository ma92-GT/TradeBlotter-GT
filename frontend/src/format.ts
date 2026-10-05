// Formatters are created once; Intl.NumberFormat construction is comparatively expensive.

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const price = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

const quantity = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const signedQuantity = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  signDisplay: 'exceptZero',
})

/** Totals such as notional: always 2 decimal places. */
export const formatMoney = (value: number) => money.format(value)

/** Prices and average costs: 2 to 4 decimal places. */
export const formatPrice = (value: number) => price.format(value)

export const formatQuantity = (value: number) => quantity.format(value)

/** Position quantities, with an explicit sign: +100 long, −100 short. */
export const formatSignedQuantity = (value: number) => signedQuantity.format(value)

/** Local time as yyyy-MM-dd HH:mm:ss. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const pad = (part: number) => String(part).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}
