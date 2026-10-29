export type PetMood = 'sleep' | 'idle' | 'work' | 'alert' | 'happy' | 'worried' | 'tired'

export type PetMoodInput = {
  working: number
  waiting: number
  errored: number
  /** An agent finished within the last few seconds. */
  justFinished: boolean
  /** Lowest "% left" across the subscription quotas Orca reads, null when unknown. */
  lowestQuotaLeft: number | null
  /** Local hour 0–23. */
  hour: number
  /** Late-night reminder window start hour, null when the reminder is off. */
  lateNightFromHour: number | null
}

export type PetMoodResult = {
  mood: PetMood
  /** 1 (calm) to 3 (busy); drives animation speed like RunCat. */
  speed: 1 | 2 | 3
  lateNight: boolean
  quotaLow: boolean
}

export const QUOTA_LOW_PERCENT = 20
const LATE_NIGHT_END_HOUR = 5

export function isLateNight(hour: number, fromHour: number | null): boolean {
  if (fromHour === null) {
    return false
  }
  return fromHour <= LATE_NIGHT_END_HOUR
    ? hour >= fromHour && hour < LATE_NIGHT_END_HOUR
    : hour >= fromHour || hour < LATE_NIGHT_END_HOUR
}

/** Why a fixed priority: the pet is a glanceable signal, so the state that needs the user wins. */
export function derivePetMood(input: PetMoodInput): PetMoodResult {
  const lateNight = isLateNight(input.hour, input.lateNightFromHour)
  const quotaLow = input.lowestQuotaLeft !== null && input.lowestQuotaLeft < QUOTA_LOW_PERCENT
  const speed: 1 | 2 | 3 = input.working >= 4 ? 3 : input.working >= 2 ? 2 : 1
  const mood: PetMood =
    input.waiting > 0
      ? 'alert'
      : input.errored > 0
        ? 'worried'
        : input.justFinished
          ? 'happy'
          : input.working > 0
            ? 'work'
            : quotaLow || lateNight
              ? 'tired'
              : input.hour >= 0 && input.hour < LATE_NIGHT_END_HOUR
                ? 'sleep'
                : 'idle'
  return { mood, speed, lateNight, quotaLow }
}

/** Short Vietnamese status line under the pet. */
export function describePetMood(
  result: PetMoodResult,
  counts: { working: number; waiting: number; errored: number },
  petName: string,
  /** Names the quota running low, e.g. "Codex · 5 giờ". */
  quotaLabel?: string | null
): string {
  switch (result.mood) {
    case 'alert':
      return counts.waiting === 1
        ? 'Có 1 agent đang chờ bạn'
        : `Có ${counts.waiting} agent đang chờ bạn`
    case 'worried':
      return counts.errored === 1 ? '1 agent gặp lỗi' : `${counts.errored} agent gặp lỗi`
    case 'happy':
      return 'Xong việc rồi!'
    case 'work':
      return counts.working === 1
        ? '1 agent đang làm việc'
        : `${counts.working} agent đang làm việc`
    case 'tired':
      return result.lateNight
        ? 'Khuya rồi, nghỉ thôi nhé'
        : quotaLabel
          ? `${quotaLabel} sắp hết hạn mức`
          : 'Hạn mức sắp hết rồi'
    case 'sleep':
      return `${petName} đang ngủ`
    default:
      return `${petName} đang chơi`
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Parses a local `YYYY-MM-DD`; null when malformed. */
export function parseLocalDate(value: string | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) {
    return null
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) || date.getDate() !== Number(match[3]) ? null : date
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Whole local days between two dates; Math.round absorbs DST hour shifts. */
function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / DAY_MS)
}

/** Counts the start day as day 1, the way couples usually count. */
export function daysTogether(start: string | undefined, now: Date): number | null {
  const date = parseLocalDate(start)
  if (!date) {
    return null
  }
  const days = daysBetween(date, now)
  return days < 0 ? null : days + 1
}

export type CornerReminder = { label: string; date: string }

export type UpcomingReminder = {
  label: string
  daysUntil: number
  /** Years since the original date on the next occurrence; 0 for the first one. */
  years: number
}

/** Next yearly occurrence, Feb 29 falling back to Feb 28 in common years. */
function nextOccurrence(original: Date, now: Date): Date {
  const today = startOfLocalDay(now)
  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    const lastDay = new Date(year, original.getMonth() + 1, 0).getDate()
    const candidate = new Date(year, original.getMonth(), Math.min(original.getDate(), lastDay))
    if (candidate.getTime() >= today.getTime()) {
      return candidate
    }
  }
  return today
}

export function upcomingReminders(
  reminders: readonly CornerReminder[],
  now: Date,
  withinDays: number
): UpcomingReminder[] {
  const result: UpcomingReminder[] = []
  for (const reminder of reminders) {
    const original = parseLocalDate(reminder.date)
    if (!original || !reminder.label.trim()) {
      continue
    }
    const next = nextOccurrence(original, now)
    const daysUntil = daysBetween(now, next)
    if (daysUntil <= withinDays) {
      result.push({
        label: reminder.label.trim(),
        daysUntil,
        years: next.getFullYear() - original.getFullYear()
      })
    }
  }
  return result.sort((a, b) => a.daysUntil - b.daysUntil)
}

const DAY_MILESTONES = [100, 200, 300, 365, 500, 700, 1500, 2500]

/** A day-count milestone such as "500 ngày" on the day the counter reaches it. Yearly
 *  anniversaries come from the date reminders instead, which follow the calendar. */
export function togetherMilestone(days: number | null): string | null {
  if (days === null) {
    return null
  }
  return DAY_MILESTONES.includes(days) || days % 1000 === 0 ? `${days} ngày` : null
}

/** Why time slots and not a timer: every window and reload shows the same photo for a slot. */
export function pickPhotoIndex(count: number, intervalMinutes: number, nowMs: number): number {
  if (count <= 0) {
    return -1
  }
  if (intervalMinutes <= 0) {
    return 0
  }
  return Math.floor(nowMs / (intervalMinutes * 60 * 1000)) % count
}
