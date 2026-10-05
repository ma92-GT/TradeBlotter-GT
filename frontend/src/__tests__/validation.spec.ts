import { describe, expect, it } from 'vitest'
import { validateTrade, type TradeFormValues } from '@/validation'

const valid: TradeFormValues = { symbol: ' brk.b ', side: 'Sell', quantity: '100', price: '187.25' }

describe('validateTrade', () => {
  it('accepts a valid trade and normalises the symbol', () => {
    expect(validateTrade(valid)).toEqual({
      ok: true,
      trade: { symbol: 'BRK.B', side: 'Sell', quantity: 100, price: 187.25 },
    })
  })

  it('reports empty fields as required rather than treating them as zero', () => {
    const result = validateTrade({ symbol: '', side: 'Buy', quantity: ' ', price: '' })

    expect(result).toEqual({
      ok: false,
      errors: {
        symbol: 'Symbol is required.',
        quantity: 'Quantity is required.',
        price: 'Price is required.',
      },
    })
  })

  it.each([
    ['symbol', { symbol: '1ABC' }],
    ['symbol', { symbol: 'TOOLONGSYMBOL' }],
    ['quantity', { quantity: '0' }],
    ['quantity', { quantity: '1.5' }],
    ['quantity', { quantity: '-5' }],
    ['quantity', { quantity: '1000000001' }],
    ['price', { price: '0' }],
    ['price', { price: '-1' }],
    ['price', { price: '1e3' }],
    ['price', { price: '1000000.01' }],
  ] as const)('rejects an invalid %s: %o', (field, overrides) => {
    const result = validateTrade({ ...valid, ...overrides })

    expect(result.ok).toBe(false)
    expect(result.ok ? {} : Object.keys(result.errors)).toEqual([field])
  })

  it('accepts the boundary values the server accepts', () => {
    expect(validateTrade({ ...valid, quantity: '1000000000', price: '1000000' }).ok).toBe(true)
    expect(validateTrade({ ...valid, quantity: '1', price: '0.0001' }).ok).toBe(true)
  })
})
