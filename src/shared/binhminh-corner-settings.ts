/**
 * Settings for the Bình Minh corner at the bottom of the right sidebar: quota card, "needs you"
 * strip, host load, photo frame, pet and personal reminders.
 *
 * Why one nested object: the settings store merges top-level keys shallowly, so the corner always
 * writes its whole object and readers resolve it against the defaults below.
 */
export const CORNER_STYLES = ['orca', 'glass', 'neon', 'paper', 'pastel'] as const
export type CornerStyle = (typeof CORNER_STYLES)[number]

export type BinhMinhPetSettings = {
  enabled: boolean
  /** '3d' renders the animated model; 'flat' the light SVG pet. */
  render: '3d' | 'flat'
  species: string
  name: string
  sound: boolean
  /** 0–1. */
  volume: number
  /** Call out once when an agent starts waiting for the user. */
  soundOnNeedsYou: boolean
  /** Stay quiet during the late-night window. */
  muteLateNight: boolean
}

export type BinhMinhPhotoSettings = {
  enabled: boolean
  /** Ids of photos imported into Orca's profile (main-generated UUIDs). */
  ids: string[]
  /** 0 keeps the first photo; otherwise rotate every N minutes. */
  intervalMinutes: number
  fit: 'cover' | 'contain'
  /** 0.3–1. */
  opacity: number
  caption: string
  /** Quick privacy toggle: blur the photo, e.g. while sharing the screen. */
  blurred: boolean
}

export type BinhMinhReminder = { id: string; label: string; date: string }

export type BinhMinhCornerSettings = {
  enabled: boolean
  style: CornerStyle
  /** One actionable tip at a time: RAM pressure, quota pace, CPU load. */
  insights: boolean
  quotaCard: boolean
  needsYou: boolean
  hostLoad: boolean
  /** Flash the Windows taskbar button when an agent starts waiting and Orca is not focused. */
  flashTaskbar: boolean
  /** The estimated API cost card from local logs (off by default: needs tracking enabled). */
  apiCostCard: boolean
  pet: BinhMinhPetSettings
  photo: BinhMinhPhotoSettings
  together: { enabled: boolean; startDate: string; label: string }
  reminders: BinhMinhReminder[]
  /** Days ahead a reminder starts showing. */
  reminderLeadDays: number
  /** Hour (0–23) the late-night window starts, null turns the reminder off. */
  lateNightFromHour: number | null
}

export const DEFAULT_BINHMINH_CORNER_SETTINGS: BinhMinhCornerSettings = {
  enabled: true,
  style: 'glass',
  insights: true,
  quotaCard: true,
  needsYou: true,
  hostLoad: true,
  flashTaskbar: true,
  apiCostCard: false,
  pet: {
    enabled: true,
    render: '3d',
    species: 'cat',
    name: 'Mochi',
    sound: true,
    volume: 0.6,
    soundOnNeedsYou: true,
    muteLateNight: true
  },
  photo: {
    enabled: false,
    ids: [],
    intervalMinutes: 30,
    fit: 'cover',
    opacity: 1,
    caption: '',
    blurred: false
  },
  together: { enabled: false, startDate: '', label: 'Bên nhau' },
  reminders: [],
  reminderLeadDays: 7,
  lateNightFromHour: 1
}

const PHOTO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const MAX_CORNER_PHOTOS = 30
const MAX_REMINDERS = 20

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Math.max(value, min), max)
    : fallback
}

function text(value: unknown, fallback: string, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : fallback
}

export function isCornerPhotoId(id: unknown): id is string {
  return typeof id === 'string' && PHOTO_ID.test(id)
}

/** Resolves a possibly partial or hand-edited value against the defaults. */
export function resolveBinhMinhCornerSettings(value: unknown): BinhMinhCornerSettings {
  const d = DEFAULT_BINHMINH_CORNER_SETTINGS
  const v = (value && typeof value === 'object' ? value : {}) as Partial<BinhMinhCornerSettings>
  const pet = (v.pet ?? {}) as Partial<BinhMinhPetSettings>
  const photo = (v.photo ?? {}) as Partial<BinhMinhPhotoSettings>
  const together = (v.together ?? {}) as Partial<BinhMinhCornerSettings['together']>
  return {
    enabled: bool(v.enabled, d.enabled),
    style: CORNER_STYLES.includes(v.style as CornerStyle) ? (v.style as CornerStyle) : d.style,
    insights: bool(v.insights, d.insights),
    quotaCard: bool(v.quotaCard, d.quotaCard),
    needsYou: bool(v.needsYou, d.needsYou),
    hostLoad: bool(v.hostLoad, d.hostLoad),
    flashTaskbar: bool(v.flashTaskbar, d.flashTaskbar),
    apiCostCard: bool(v.apiCostCard, d.apiCostCard),
    pet: {
      enabled: bool(pet.enabled, d.pet.enabled),
      render: pet.render === 'flat' ? 'flat' : '3d',
      species: text(pet.species, d.pet.species, 32),
      name: text(pet.name, d.pet.name, 24).trim() || d.pet.name,
      sound: bool(pet.sound, d.pet.sound),
      volume: num(pet.volume, d.pet.volume, 0, 1),
      soundOnNeedsYou: bool(pet.soundOnNeedsYou, d.pet.soundOnNeedsYou),
      muteLateNight: bool(pet.muteLateNight, d.pet.muteLateNight)
    },
    photo: {
      enabled: bool(photo.enabled, d.photo.enabled),
      ids: Array.isArray(photo.ids)
        ? photo.ids.filter(isCornerPhotoId).slice(0, MAX_CORNER_PHOTOS)
        : d.photo.ids,
      intervalMinutes: Math.round(num(photo.intervalMinutes, d.photo.intervalMinutes, 0, 1440)),
      fit: photo.fit === 'contain' ? 'contain' : 'cover',
      opacity: num(photo.opacity, d.photo.opacity, 0.3, 1),
      caption: text(photo.caption, d.photo.caption, 60),
      blurred: bool(photo.blurred, d.photo.blurred)
    },
    together: {
      enabled: bool(together.enabled, d.together.enabled),
      startDate: text(together.startDate, d.together.startDate, 10),
      label: text(together.label, d.together.label, 30).trim() || d.together.label
    },
    reminders: Array.isArray(v.reminders)
      ? v.reminders
          .filter(
            (r): r is BinhMinhReminder =>
              Boolean(r) && typeof r.label === 'string' && typeof r.date === 'string'
          )
          .slice(0, MAX_REMINDERS)
          .map((r, index) => ({
            // Why a deterministic fallback: resolving runs on every read, so a random id would
            // change each render and remount the editor rows.
            id: typeof r.id === 'string' && r.id ? r.id.slice(0, 64) : `reminder-${index}`,
            label: r.label.slice(0, 40),
            date: r.date.slice(0, 10)
          }))
      : d.reminders,
    reminderLeadDays: Math.round(num(v.reminderLeadDays, d.reminderLeadDays, 0, 60)),
    lateNightFromHour:
      v.lateNightFromHour === null
        ? null
        : Math.round(num(v.lateNightFromHour, d.lateNightFromHour ?? 1, 0, 23))
  }
}
