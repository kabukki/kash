import { describe, expect, it } from 'vitest'
import { elapsedPaidSeconds, isEarning, monthPaidSeconds } from './workmonth'

const NINE_TO_FIVE = { start: 9, end: 17 }

// September 2025: 30 days, 22 weekdays.
const MONDAY_NOON = new Date(2025, 8, 15, 12, 0, 0)

describe('monthPaidSeconds', () => {
  it('counts every second of the month in full mode', () => {
    expect(monthPaidSeconds(MONDAY_NOON, 'full', NINE_TO_FIVE)).toBe(30 * 86400)
  })

  it('counts 8h per weekday in working mode', () => {
    expect(monthPaidSeconds(MONDAY_NOON, 'working', NINE_TO_FIVE)).toBe(22 * 8 * 3600)
  })
})

describe('elapsedPaidSeconds', () => {
  it('follows the wall clock in full mode', () => {
    expect(elapsedPaidSeconds(MONDAY_NOON, 'full', NINE_TO_FIVE)).toBe(14 * 86400 + 12 * 3600)
  })

  it('adds past weekdays plus clamped time today', () => {
    // 10 past weekdays (1-5, 8-12) + 3h into today's 9h-17h window.
    expect(elapsedPaidSeconds(MONDAY_NOON, 'working', NINE_TO_FIVE)).toBe(10 * 8 * 3600 + 3 * 3600)
  })

  it('adds nothing before 9h', () => {
    expect(elapsedPaidSeconds(new Date(2025, 8, 15, 7, 0, 0), 'working', NINE_TO_FIVE)).toBe(10 * 8 * 3600)
  })

  it('caps today at a full day after 17h', () => {
    expect(elapsedPaidSeconds(new Date(2025, 8, 15, 22, 0, 0), 'working', NINE_TO_FIVE)).toBe(11 * 8 * 3600)
  })

  it('adds nothing on a weekend', () => {
    expect(elapsedPaidSeconds(new Date(2025, 8, 20, 12, 0, 0), 'working', NINE_TO_FIVE)).toBe(15 * 8 * 3600)
  })

  it.each(['full', 'working'] as const)('never exceeds the month total (%s)', (mode) => {
    const end = new Date(2025, 8, 30, 23, 59, 59)
    expect(elapsedPaidSeconds(end, mode, NINE_TO_FIVE)).toBeLessThanOrEqual(monthPaidSeconds(end, mode, NINE_TO_FIVE) + 1)
  })
})

describe('isEarning', () => {
  it('always earns in full mode', () => {
    expect(isEarning(new Date(2025, 8, 20, 3, 0, 0), 'full', NINE_TO_FIVE)).toBe(true)
  })

  it.each([
    ['Monday noon', new Date(2025, 8, 15, 12, 0, 0), true],
    ['before 9h', new Date(2025, 8, 15, 7, 0, 0), false],
    ['17h sharp', new Date(2025, 8, 15, 17, 0, 0), false],
    ['Saturday', new Date(2025, 8, 20, 12, 0, 0), false],
  ] as const)('%s', (_label, date, expected) => {
    expect(isEarning(date, 'working', NINE_TO_FIVE)).toBe(expected)
  })
})

describe('custom work hours', () => {
  const hours = { start: 10, end: 18 }

  it('scales the month total to the configured span', () => {
    expect(monthPaidSeconds(MONDAY_NOON, 'working', hours)).toBe(22 * 8 * 3600)
  })

  it('shifts the window', () => {
    // Monday noon = 2h into a 10h-18h day.
    expect(elapsedPaidSeconds(MONDAY_NOON, 'working', hours)).toBe(10 * 8 * 3600 + 2 * 3600)
    expect(isEarning(new Date(2025, 8, 15, 9, 30, 0), 'working', hours)).toBe(false)
    expect(isEarning(new Date(2025, 8, 15, 17, 30, 0), 'working', hours)).toBe(true)
  })

  it('earns from the first instant of the window', () => {
    expect(isEarning(new Date(2025, 8, 15, 10, 0, 0), 'working', hours)).toBe(true)
  })

  it('survives a zero-length or inverted span without dividing by zero', () => {
    for (const bad of [{ start: 9, end: 9 }, { start: 18, end: 9 }]) {
      expect(monthPaidSeconds(MONDAY_NOON, 'working', bad)).toBe(0)
      expect(elapsedPaidSeconds(MONDAY_NOON, 'working', bad)).toBe(0)
    }
  })
})
