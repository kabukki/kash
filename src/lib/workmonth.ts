import { eachDayOfInterval, endOfMonth, isWeekend, startOfMonth } from 'date-fns'

export type SalaryMode = 'full' | 'working'

// ponytail: weekends only, no bank holidays; fixed 9h-17h. Add a holiday list / settings when someone complains.
const WORK_START_HOUR = 9
const WORK_END_HOUR = 17
const WORK_DAY_SECONDS = (WORK_END_HOUR - WORK_START_HOUR) * 3600

/** Paid seconds in `date`'s month. */
export function monthPaidSeconds(date: Date, mode: SalaryMode): number {
  if (mode === 'full') {
    return (endOfMonth(date).getTime() - startOfMonth(date).getTime() + 1) / 1000
  }
  return workDaysIn(startOfMonth(date), endOfMonth(date)) * WORK_DAY_SECONDS
}

/** Paid seconds already elapsed in `date`'s month. */
export function elapsedPaidSeconds(date: Date, mode: SalaryMode): number {
  const monthStart = startOfMonth(date)
  if (mode === 'full') {
    return (date.getTime() - monthStart.getTime()) / 1000
  }
  const pastDays = workDaysIn(monthStart, date) - (isWeekend(date) ? 0 : 1)
  return pastDays * WORK_DAY_SECONDS + secondsWorkedToday(date)
}

/** Is the counter currently ticking? */
export function isEarning(date: Date, mode: SalaryMode): boolean {
  if (mode === 'full') return true
  if (isWeekend(date)) return false
  const hour = date.getHours()
  return hour >= WORK_START_HOUR && hour < WORK_END_HOUR
}

function workDaysIn(start: Date, end: Date): number {
  return eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d)).length
}

function secondsWorkedToday(date: Date): number {
  if (isWeekend(date)) return 0
  const intoDay =
    date.getHours() * 3600 +
    date.getMinutes() * 60 +
    date.getSeconds() +
    date.getMilliseconds() / 1000
  return Math.min(Math.max(intoDay - WORK_START_HOUR * 3600, 0), WORK_DAY_SECONDS)
}
