import { useMemo } from 'react'
import { useAppStore } from '@/store'
import {
  resolveBinhMinhCornerSettings,
  type BinhMinhCornerSettings
} from '../../../../shared/binhminh-corner-settings'

export type CornerSettingsPatch = Partial<
  Omit<BinhMinhCornerSettings, 'pet' | 'photo' | 'together'>
> & {
  pet?: Partial<BinhMinhCornerSettings['pet']>
  photo?: Partial<BinhMinhCornerSettings['photo']>
  together?: Partial<BinhMinhCornerSettings['together']>
}

export function useCornerSettings(): BinhMinhCornerSettings {
  const raw = useAppStore((s) => s.settings?.binhMinhCorner)
  return useMemo(() => resolveBinhMinhCornerSettings(raw), [raw])
}

/** Why the whole object: the settings store merges top-level keys shallowly. */
export function updateCornerSettings(patch: CornerSettingsPatch): Promise<void> {
  const state = useAppStore.getState()
  const current = resolveBinhMinhCornerSettings(state.settings?.binhMinhCorner)
  const next: BinhMinhCornerSettings = {
    ...current,
    ...patch,
    pet: { ...current.pet, ...patch.pet },
    photo: { ...current.photo, ...patch.photo },
    together: { ...current.together, ...patch.together }
  }
  return state.updateSettings({ binhMinhCorner: resolveBinhMinhCornerSettings(next) })
}
