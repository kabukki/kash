import { eachDayOfInterval, endOfMonth, isWeekend, startOfMonth } from 'date-fns'

export type SalaryMode = 'full' | 'working'

export type WorkHours = { start: number; end: number }

export const DEFAULT_WORK_HOURS: WorkHours = { start: 9, end: 17 }

/** Paid seconds in `date`'s month. */
export function monthPaidSeconds(
  date: Date,
  mode: SalaryMode,
  hours: WorkHours,
): number {
  if (mode === 'full') {
    return (endOfMonth(date).getTime() - startOfMonth(date).getTime() + 1) / 1000
  }
  return workDaysIn(startOfMonth(date), endOfMonth(date)) * daySeconds(hours)
}

/** Paid seconds already elapsed in `date`'s month. */
export function elapsedPaidSeconds(
  date: Date,
  mode: SalaryMode,
  hours: WorkHours,
): number {
  const monthStart = startOfMonth(date)
  if (mode === 'full') {
    return (date.getTime() - monthStart.getTime()) / 1000
  }
  const pastDays = workDaysIn(monthStart, date) - (isWeekend(date) ? 0 : 1)
  return pastDays * daySeconds(hours) + secondsWorkedToday(date, hours)
}

/** Is the counter currently ticking? */
export function isEarning(
  date: Date,
  mode: SalaryMode,
  hours: WorkHours,
): boolean {
  if (mode === 'full') return true
  if (isWeekend(date)) return false
  const into = hoursIntoDay(date)
  return into >= hours.start && into < hours.end
}

/** Paid seconds in one working day; always positive, so the rate can never divide by zero. */
function daySeconds(hours: WorkHours): number {
  return Math.max(hours.end - hours.start, 0) * 3600
}

function workDaysIn(start: Date, end: Date): number {
  return eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d)).length
}

function hoursIntoDay(date: Date): number {
  return (
    date.getHours() +
    date.getMinutes() / 60 +
    date.getSeconds() / 3600 +
    date.getMilliseconds() / 3_600_000
  )
}

function secondsWorkedToday(date: Date, hours: WorkHours): number {
  if (isWeekend(date)) return 0
  const intoDay = hoursIntoDay(date) * 3600
  return Math.min(Math.max(intoDay - hours.start * 3600, 0), daySeconds(hours))
}
