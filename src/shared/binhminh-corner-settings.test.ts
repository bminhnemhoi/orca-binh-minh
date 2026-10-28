import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BINHMINH_CORNER_SETTINGS,
  MAX_CORNER_PHOTOS,
  resolveBinhMinhCornerSettings
} from './binhminh-corner-settings'

const PHOTO = '0f0e0d0c-0b0a-4908-8706-050403020100'

describe('resolveBinhMinhCornerSettings', () => {
  it('returns the defaults for a missing or malformed value', () => {
    expect(resolveBinhMinhCornerSettings(undefined)).toEqual(DEFAULT_BINHMINH_CORNER_SETTINGS)
    expect(resolveBinhMinhCornerSettings('nope')).toEqual(DEFAULT_BINHMINH_CORNER_SETTINGS)
  })

  it('keeps valid nested values and fills the rest', () => {
    const resolved = resolveBinhMinhCornerSettings({
      pet: { species: 'fox', volume: 0.2 },
      photo: { ids: [PHOTO], intervalMinutes: 60 }
    })
    expect(resolved.pet).toMatchObject({ species: 'fox', volume: 0.2, name: 'Mochi', sound: true })
    expect(resolved.photo).toMatchObject({ ids: [PHOTO], intervalMinutes: 60, fit: 'cover' })
  })

  it('clamps numbers and drops ids that could reach outside the photo folder', () => {
    const resolved = resolveBinhMinhCornerSettings({
      pet: { volume: 7, name: '   ' },
      photo: { ids: ['../../secret', PHOTO, 3], opacity: 0, intervalMinutes: -5 },
      reminderLeadDays: 999,
      lateNightFromHour: 40
    })
    expect(resolved.pet.volume).toBe(1)
    expect(resolved.pet.name).toBe('Mochi')
    expect(resolved.photo.ids).toEqual([PHOTO])
    expect(resolved.photo.opacity).toBe(0.3)
    expect(resolved.photo.intervalMinutes).toBe(0)
    expect(resolved.reminderLeadDays).toBe(60)
    expect(resolved.lateNightFromHour).toBe(23)
  })

  it('keeps an explicit null late-night hour (reminder off)', () => {
    expect(resolveBinhMinhCornerSettings({ lateNightFromHour: null }).lateNightFromHour).toBeNull()
  })

  it('caps the album and gives legacy reminders a stable id', () => {
    const ids = Array.from({ length: MAX_CORNER_PHOTOS + 5 }, () => PHOTO)
    const resolved = resolveBinhMinhCornerSettings({
      photo: { ids },
      reminders: [
        { label: 'Sinh nhật', date: '2001-11-05' },
        { label: 1, date: 'x' }
      ]
    })
    expect(resolved.photo.ids).toHaveLength(MAX_CORNER_PHOTOS)
    expect(resolved.reminders).toEqual([
      { id: 'reminder-0', label: 'Sinh nhật', date: '2001-11-05' }
    ])
  })
})
