import { describe, expect, it } from 'vitest'
import {
  mapServerErrors,
  parsePrice,
  parseQuantity,
  validateTrade,
  type TradeFormValues,
} from '@/validation'

const valid: TradeFormValues = { symbol: 'AAPL', side: 'Buy', quantity: '100', price: '187.25' }

function errorFieldsFor(overrides: Partial<TradeFormValues>) {
  const result = validateTrade({ ...valid, ...overrides })
  return result.ok ? [] : Object.keys(result.errors)
}

describe('validateTrade', () => {
  it('turns valid input into a request, trimming and upper-casing the symbol', () => {
    expect(validateTrade({ symbol: ' brk.b ', side: 'Sell', quantity: ' 100 ', price: '187.25' })).toEqual({
      ok: true,
      trade: { symbol: 'BRK.B', side: 'Sell', quantity: 100, price: 187.25 },
    })
  })

  it('reports every missing field, including an unchosen side, without treating blanks as zero', () => {
    expect(validateTrade({ symbol: ' ', side: '', quantity: '', price: '' })).toEqual({
      ok: false,
      errors: {
        symbol: 'Symbol is required.',
        side: 'Choose Buy or Sell.',
        quantity: 'Quantity is required.',
        price: 'Price is required.',
      },
    })
  })

  it.each(['A', 'msft', 'BRK.B', 'BF-B', 'ABCDEFGHIJ'])('accepts symbol %s', (symbol) => {
    expect(errorFieldsFor({ symbol })).toEqual([])
  })

  it.each(['1ABC', '.AAPL', 'AA PL', 'AAPL$', 'ABCDEFGHIJK'])('rejects symbol %s', (symbol) => {
    expect(errorFieldsFor({ symbol })).toEqual(['symbol'])
  })
})

describe('parseQuantity', () => {
  it.each([
    ['1', 1],
    ['007', 7],
    ['1000000000', 1_000_000_000],
  ])('accepts %s as %d', (text, expected) => {
    expect(parseQuantity(text)).toBe(expected)
  })

  it.each(['', '0', '-5', '1.5', '1e3', '1,000', 'abc', '1000000001'])('rejects %j', (text) => {
    expect(parseQuantity(text)).toBeNull()
  })
})

describe('parsePrice', () => {
  it.each([
    ['187.25', 187.25],
    ['0.0001', 0.0001],
    ['.5', 0.5],
    ['12.', 12],
    ['1000000', 1_000_000],
  ])('accepts %s as %d', (text, expected) => {
    expect(parsePrice(text)).toBe(expected)
  })

  it.each(['', '0', '0.00', '-1', '1e3', '$10', '1,000.50', 'abc', '1000000.01'])('rejects %j', (text) => {
    expect(parsePrice(text)).toBeNull()
  })
})

describe('mapServerErrors', () => {
  it('assigns field messages to form fields and keeps the rest for a form-level message', () => {
    const result = mapServerErrors({
      price: ['Price must be greater than 0 and at most 1,000,000.'],
      side: ['The input was not valid.'],
      '': ['A non-empty request body is required.'],
    })

    expect(result).toEqual({
      fieldErrors: {
        price: 'Price must be greater than 0 and at most 1,000,000.',
        side: 'The input was not valid.',
      },
      otherErrors: ['A non-empty request body is required.'],
    })
  })
})
