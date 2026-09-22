import { describe, expect, it } from 'vitest'
import { elapsedPaidSeconds, isEarning, monthPaidSeconds } from './workmonth'

// September 2025: 30 days, 22 weekdays.
const MONDAY_NOON = new Date(2025, 8, 15, 12, 0, 0)

describe('monthPaidSeconds', () => {
  it('counts every second of the month in full mode', () => {
    expect(monthPaidSeconds(MONDAY_NOON, 'full')).toBe(30 * 86400)
  })

  it('counts 8h per weekday in working mode', () => {
    expect(monthPaidSeconds(MONDAY_NOON, 'working')).toBe(22 * 8 * 3600)
  })
})

describe('elapsedPaidSeconds', () => {
  it('follows the wall clock in full mode', () => {
    expect(elapsedPaidSeconds(MONDAY_NOON, 'full')).toBe(14 * 86400 + 12 * 3600)
  })

  it('adds past weekdays plus clamped time today', () => {
    // 10 past weekdays (1-5, 8-12) + 3h into today's 9h-17h window.
    expect(elapsedPaidSeconds(MONDAY_NOON, 'working')).toBe(10 * 8 * 3600 + 3 * 3600)
  })

  it('adds nothing before 9h', () => {
    expect(elapsedPaidSeconds(new Date(2025, 8, 15, 7, 0, 0), 'working')).toBe(10 * 8 * 3600)
  })

  it('caps today at a full day after 17h', () => {
    expect(elapsedPaidSeconds(new Date(2025, 8, 15, 22, 0, 0), 'working')).toBe(11 * 8 * 3600)
  })

  it('adds nothing on a weekend', () => {
    expect(elapsedPaidSeconds(new Date(2025, 8, 20, 12, 0, 0), 'working')).toBe(15 * 8 * 3600)
  })

  it.each(['full', 'working'] as const)('never exceeds the month total (%s)', (mode) => {
    const end = new Date(2025, 8, 30, 23, 59, 59)
    expect(elapsedPaidSeconds(end, mode)).toBeLessThanOrEqual(monthPaidSeconds(end, mode) + 1)
  })
})

describe('isEarning', () => {
  it('always earns in full mode', () => {
    expect(isEarning(new Date(2025, 8, 20, 3, 0, 0), 'full')).toBe(true)
  })

  it.each([
    ['Monday noon', new Date(2025, 8, 15, 12, 0, 0), true],
    ['before 9h', new Date(2025, 8, 15, 7, 0, 0), false],
    ['17h sharp', new Date(2025, 8, 15, 17, 0, 0), false],
    ['Saturday', new Date(2025, 8, 20, 12, 0, 0), false],
  ] as const)('%s', (_label, date, expected) => {
    expect(isEarning(date, 'working')).toBe(expected)
  })
})
