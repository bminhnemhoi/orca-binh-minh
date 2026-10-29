import { useEffect, useRef } from 'react'
import { useAgentBucketCounts } from '../dashboard/useAgentBucketCounts'
import { isLateNight } from './corner-logic'
import { resolvePetSpecies } from './pet-species'
import { playPetSound } from './pet-voice'
import { useCornerSettings } from './use-corner-settings'

/** Why a cooldown: several agents finishing a turn together should not bark in a chorus. */
const VOICE_COOLDOWN_MS = 15_000

/**
 * Taskbar flash and pet call when an agent starts waiting for the user.
 *
 * Why headless and mounted beside the right sidebar rather than inside the corner: the corner
 * unmounts while the sidebar is closed, and that is exactly when the user most needs a signal.
 */
export function CornerAttentionSignals(): null {
  const settings = useCornerSettings()
  const { attention } = useAgentBucketCounts()
  const previous = useRef(attention)
  const lastVoiceAt = useRef(0)
  useEffect(() => {
    const rose = attention > previous.current
    previous.current = attention
    if (!rose || !settings.enabled) {
      return
    }
    if (settings.flashTaskbar) {
      window.api?.binhminhCorner?.flashTaskbar()
    }
    const pet = settings.pet
    const quiet =
      pet.muteLateNight && isLateNight(new Date().getHours(), settings.lateNightFromHour)
    const now = Date.now()
    if (
      pet.enabled &&
      pet.sound &&
      pet.soundOnNeedsYou &&
      !quiet &&
      now - lastVoiceAt.current >= VOICE_COOLDOWN_MS
    ) {
      lastVoiceAt.current = now
      playPetSound(resolvePetSpecies(pet.species, pet.render), pet.volume)
    }
  }, [attention, settings])
  return null
}
