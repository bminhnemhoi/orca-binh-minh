import { useEffect, useRef, useState } from 'react'
import type { BinhMinhCornerSettings } from '../../../../shared/binhminh-corner-settings'
import type { DashboardRevealAgentArgs } from '../../../../shared/dashboard-snapshot'
import { revealDashboardAgent } from '../dashboard/reveal-dashboard-agent'
import { derivePetMood, describePetMood } from './corner-logic'
import { getPetSpecies } from './pet-species'
import { PetSprite } from './PetSprite'
import { playPetVoice } from './pet-voice'
import { useLocalHour, useRiseFlag, useWindowActive } from './use-window-attention'

const HAPPY_MS = 6_000
const PETTED_MS = 1_100

export function CornerPet({
  settings,
  working,
  waiting,
  finished,
  lowestQuotaLeft,
  attentionTarget
}: {
  settings: BinhMinhCornerSettings
  working: number
  waiting: number
  /** Finished-but-unseen agents; a rise makes the pet celebrate. */
  finished: number
  lowestQuotaLeft: number | null
  attentionTarget: DashboardRevealAgentArgs | null
}): React.JSX.Element {
  const species = getPetSpecies(settings.pet.species)
  const hour = useLocalHour()
  const active = useWindowActive()
  const justFinished = useRiseFlag(finished, HAPPY_MS)
  const [petted, setPetted] = useState(false)
  const pettedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (pettedTimer.current) {
        clearTimeout(pettedTimer.current)
      }
    },
    []
  )
  const result = derivePetMood({
    working,
    waiting,
    errored: 0,
    justFinished,
    lowestQuotaLeft,
    hour,
    lateNightFromHour: settings.lateNightFromHour
  })
  const status = describePetMood(result, { working, waiting, errored: 0 }, settings.pet.name)
  const jump = result.mood === 'alert' && attentionTarget !== null

  const onClick = (): void => {
    if (jump && attentionTarget) {
      revealDashboardAgent(attentionTarget)
      return
    }
    setPetted(true)
    if (pettedTimer.current) {
      clearTimeout(pettedTimer.current)
    }
    pettedTimer.current = setTimeout(() => setPetted(false), PETTED_MS)
    if (settings.pet.sound && !(settings.pet.muteLateNight && result.lateNight)) {
      playPetVoice(species.voice, settings.pet.volume)
    }
  }

  return (
    <section aria-label="Thú cưng" className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-label={jump ? `Mở agent đang chờ` : `Vuốt ve ${settings.pet.name}`}
        title={jump ? 'Bấm để mở agent đang chờ bạn' : `Vuốt ve ${settings.pet.name}`}
      >
        <PetSprite
          species={species}
          mood={result.mood}
          speed={result.speed}
          petted={petted}
          paused={!active}
          size={64}
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{settings.pet.name}</p>
        <p
          className={`text-[11px] leading-snug ${result.mood === 'alert' ? 'text-amber-500' : 'text-muted-foreground'}`}
        >
          {status}
        </p>
        {jump ? (
          <p className="text-[10.5px] text-muted-foreground">Bấm vào {settings.pet.name} để mở</p>
        ) : null}
      </div>
    </section>
  )
}
