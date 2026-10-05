import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatNotional,
  formatQuantity,
  formatSignedQuantity,
  formatTimestamp,
} from '@/format'

describe('formatTimestamp', () => {
  // Tests run in America/New_York (see vitest.config.ts).
  it('shows an API UTC timestamp in local time', () => {
    expect(formatTimestamp('2026-10-05T14:30:05.1234567+00:00')).toBe('2026-10-05 10:30:05')
  })

  it('rolls the date back when local time is still the previous day', () => {
    expect(formatTimestamp('2026-01-01T03:00:00+00:00')).toBe('2025-12-31 22:00:00')
  })

  it('uses a 24-hour clock with midnight as 00', () => {
    expect(formatTimestamp('2026-10-05T04:00:00+00:00')).toBe('2026-10-05 00:00:00')
  })
})

describe('number formatting', () => {
  it('shows prices with 2 to 4 decimal places', () => {
    expect([187.25, 300.125, 0.0001, 10.666667].map(formatCurrency)).toEqual([
      '$187.25',
      '$300.125',
      '$0.0001',
      '$10.6667',
    ])
  })

  it('shows notional amounts with exactly 2 decimal places', () => {
    expect(formatNotional(18725)).toBe('$18,725.00')
  })

  it('groups quantities and signs position quantities', () => {
    expect(formatQuantity(1500000)).toBe('1,500,000')
    expect([100, -50].map(formatSignedQuantity)).toEqual(['+100', '-50'])
  })
})
