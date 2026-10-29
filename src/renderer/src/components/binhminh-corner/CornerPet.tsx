import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { BinhMinhCornerSettings } from '../../../../shared/binhminh-corner-settings'
import type { DashboardRevealAgentArgs } from '../../../../shared/dashboard-snapshot'
import { revealDashboardAgent } from '../dashboard/reveal-dashboard-agent'
import { derivePetMood, describePetMood } from './corner-logic'
import { resolvePetSpecies } from './pet-species'
import { PetSprite } from './PetSprite'
import { playPetSound } from './pet-voice'
import { useLocalHour, useRiseFlag, useWindowActive } from './use-window-attention'

// Why lazy: three.js (~600 KB) loads only when the 3D pet is actually shown.
const Pet3D = lazy(() => import('./pet3d/Pet3D'))

const HAPPY_MS = 6_000
const PETTED_MS = 1_100
const PET_SIZE = 76

function summary(working: number, waiting: number, finished: number): string | null {
  const parts = [
    working > 0 ? `${working} đang làm` : null,
    waiting > 0 ? `${waiting} cần bạn` : null,
    finished > 0 ? `${finished} vừa xong` : null
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

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
  const [webglFailed, setWebglFailed] = useState(false)
  const render = settings.pet.render === '3d' && !webglFailed ? '3d' : 'flat'
  const species = resolvePetSpecies(settings.pet.species, render)
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
  const onUnavailable = useCallback(() => setWebglFailed(true), [])
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
  const line = summary(working, waiting, finished)
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
      playPetSound(species, settings.pet.volume)
    }
  }

  const flat = (
    <PetSprite
      species={species}
      mood={result.mood}
      speed={result.speed}
      petted={petted}
      paused={!active}
      size={PET_SIZE - 12}
    />
  )
  return (
    <section aria-label="Thú cưng" className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        className="flex shrink-0 cursor-pointer items-center justify-center rounded-[var(--w-radius-card)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-accent)]"
        style={{ width: PET_SIZE, height: PET_SIZE }}
        aria-label={jump ? 'Mở agent đang chờ' : `Vuốt ve ${settings.pet.name}`}
        title={jump ? 'Bấm để mở agent đang chờ bạn' : `Vuốt ve ${settings.pet.name}`}
      >
        {render === '3d' ? (
          <Suspense fallback={flat}>
            <Pet3D
              speciesId={species.id}
              mood={result.mood}
              speed={result.speed}
              petted={petted}
              paused={!active}
              size={PET_SIZE}
              onUnavailable={onUnavailable}
            />
          </Suspense>
        ) : (
          flat
        )}
      </button>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold bm-t1">
          {settings.pet.name}
          {waiting > 0 ? (
            <span
              key={waiting}
              className="bm-badge-pulse inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
              style={{ background: 'var(--w-warn)', color: 'var(--w-warn-ink)' }}
              aria-label={`${waiting} agent cần bạn`}
            >
              {waiting}
            </span>
          ) : null}
        </p>
        <p className="text-[11.5px] leading-snug bm-t2">{line ?? status}</p>
        {line && result.mood !== 'work' ? <p className="text-[11px] bm-t3">{status}</p> : null}
        {jump ? <p className="text-[10.5px] bm-t3">Bấm vào {settings.pet.name} để mở</p> : null}
      </div>
    </section>
  )
}
