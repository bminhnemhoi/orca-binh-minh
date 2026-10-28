import { describe, expect, it } from 'vitest'
import {
  daysTogether,
  derivePetMood,
  isLateNight,
  parseLocalDate,
  pickPhotoIndex,
  togetherMilestone,
  upcomingReminders,
  type PetMoodInput
} from './corner-logic'

const calm: PetMoodInput = {
  working: 0,
  waiting: 0,
  errored: 0,
  justFinished: false,
  lowestQuotaLeft: 80,
  hour: 14,
  lateNightFromHour: 1
}

describe('derivePetMood', () => {
  it('puts an agent waiting for the user above everything else', () => {
    expect(derivePetMood({ ...calm, waiting: 1, errored: 2, working: 5 }).mood).toBe('alert')
  })

  it('orders error, finished, working, then rest', () => {
    expect(derivePetMood({ ...calm, errored: 1, justFinished: true }).mood).toBe('worried')
    expect(derivePetMood({ ...calm, justFinished: true, working: 1 }).mood).toBe('happy')
    expect(derivePetMood({ ...calm, working: 1 }).mood).toBe('work')
    expect(derivePetMood(calm).mood).toBe('idle')
  })

  it('runs faster with more agents working', () => {
    expect(derivePetMood({ ...calm, working: 1 }).speed).toBe(1)
    expect(derivePetMood({ ...calm, working: 2 }).speed).toBe(2)
    expect(derivePetMood({ ...calm, working: 6 }).speed).toBe(3)
  })

  it('gets tired late at night or on low quota, but keeps working while agents run', () => {
    expect(derivePetMood({ ...calm, hour: 2 }).mood).toBe('tired')
    expect(derivePetMood({ ...calm, lowestQuotaLeft: 10 })).toMatchObject({
      mood: 'tired',
      quotaLow: true
    })
    expect(derivePetMood({ ...calm, hour: 2, working: 1 })).toMatchObject({
      mood: 'work',
      lateNight: true
    })
  })

  it('sleeps in the small hours when the late-night reminder is off', () => {
    expect(derivePetMood({ ...calm, hour: 3, lateNightFromHour: null }).mood).toBe('sleep')
  })
})

describe('isLateNight', () => {
  it('handles windows that start before and after midnight', () => {
    expect(isLateNight(23, 23)).toBe(true)
    expect(isLateNight(2, 23)).toBe(true)
    expect(isLateNight(6, 23)).toBe(false)
    expect(isLateNight(0, 1)).toBe(false)
    expect(isLateNight(4, 1)).toBe(true)
    expect(isLateNight(4, null)).toBe(false)
  })
})

describe('dates', () => {
  it('rejects malformed and impossible dates', () => {
    expect(parseLocalDate('2026-02-30')).toBeNull()
    expect(parseLocalDate('30/01/2026')).toBeNull()
    expect(parseLocalDate('2024-02-29')?.getDate()).toBe(29)
  })

  it('counts the first day together as day 1', () => {
    expect(daysTogether('2026-10-29', new Date(2026, 9, 29, 23, 0))).toBe(1)
    expect(daysTogether('2025-10-29', new Date(2026, 9, 29, 8, 0))).toBe(366)
    expect(daysTogether('2027-01-01', new Date(2026, 9, 29))).toBeNull()
  })

  it('celebrates day-count milestones only', () => {
    expect(togetherMilestone(500)).toBe('500 ngày')
    expect(togetherMilestone(3000)).toBe('3000 ngày')
    expect(togetherMilestone(501)).toBeNull()
  })

  it('lists the next yearly occurrences within the window, soonest first', () => {
    const now = new Date(2026, 9, 29, 9, 0)
    const list = upcomingReminders(
      [
        { label: 'Sinh nhật em', date: '2001-11-05' },
        { label: 'Kỷ niệm', date: '2024-10-29' },
        { label: 'Xa quá', date: '2000-03-01' },
        { label: '  ', date: '2000-10-30' }
      ],
      now,
      14
    )
    expect(list).toEqual([
      { label: 'Kỷ niệm', daysUntil: 0, years: 2 },
      { label: 'Sinh nhật em', daysUntil: 7, years: 25 }
    ])
  })

  it('moves a Feb 29 date to Feb 28 in a common year', () => {
    expect(
      upcomingReminders([{ label: 'Nhuận', date: '2024-02-29' }], new Date(2027, 1, 20), 30)
    ).toEqual([{ label: 'Nhuận', daysUntil: 8, years: 3 }])
  })
})

describe('pickPhotoIndex', () => {
  it('keeps one photo per time slot and wraps around', () => {
    const slot = 30 * 60 * 1000
    expect(pickPhotoIndex(3, 30, 0)).toBe(0)
    expect(pickPhotoIndex(3, 30, slot - 1)).toBe(0)
    expect(pickPhotoIndex(3, 30, slot)).toBe(1)
    expect(pickPhotoIndex(3, 30, 3 * slot)).toBe(0)
  })

  it('pins the first photo when rotation is off and reports no photo when empty', () => {
    expect(pickPhotoIndex(5, 0, 123_456_789)).toBe(0)
    expect(pickPhotoIndex(0, 30, 0)).toBe(-1)
  })
})
