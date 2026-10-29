import { useEffect, useRef, useState } from 'react'
import type { PetMood } from '../corner-logic'
import type { PetSpeciesId } from '../pet-species'
import { PetStage } from './pet-stage'

/** One lazily loaded module per model, so only the chosen pet's bytes are read. */
const MODELS: Partial<Record<PetSpeciesId, () => Promise<{ default: string }>>> = {
  cat: () => import('./models/cat'),
  dog: () => import('./models/dog'),
  fox: () => import('./models/fox'),
  rabbit: () => import('./models/rabbit'),
  panda: () => import('./models/panda'),
  penguin: () => import('./models/penguin')
}

/**
 * The 3D pet (Kenney Cube Pets, CC0) with HTML overlays for the moods a clip can't say:
 * "zzz" asleep, "!" when an agent waits, sparkles when one finishes, a heart when petted.
 */
export default function Pet3D({
  speciesId,
  mood,
  speed,
  petted,
  paused,
  size,
  onUnavailable
}: {
  speciesId: PetSpeciesId
  mood: PetMood
  speed: 1 | 2 | 3
  petted: boolean
  paused: boolean
  size: number
  /** WebGL is unavailable or the context was lost: the caller shows the flat pet instead. */
  onUnavailable: () => void
}): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null)
  const stage = useRef<PetStage | null>(null)
  const [ready, setReady] = useState(false)
  // Why refs: the renderer is created once per mount; species, mood and pause update it in place.
  const initialSize = useRef(size)
  const unavailable = useRef(onUnavailable)
  useEffect(() => {
    unavailable.current = onUnavailable
  }, [onUnavailable])

  useEffect(() => {
    let created: PetStage
    try {
      created = new PetStage(initialSize.current, () => unavailable.current())
    } catch {
      unavailable.current()
      return
    }
    stage.current = created
    host.current?.prepend(created.canvas)
    return () => {
      created.dispose()
      stage.current = null
    }
  }, [])

  useEffect(() => {
    const load = MODELS[speciesId]
    if (!load) {
      unavailable.current()
      return
    }
    let cancelled = false
    setReady(false)
    void load()
      .then(async (module) => {
        if (!cancelled && stage.current) {
          await stage.current.load(module.default)
          setReady(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          unavailable.current()
        }
      })
    return () => {
      cancelled = true
    }
  }, [speciesId])

  useEffect(() => {
    stage.current?.setMood(mood, speed)
  }, [mood, speed, ready])

  useEffect(() => {
    if (petted) {
      stage.current?.react()
    }
  }, [petted])

  useEffect(() => {
    stage.current?.setPaused(paused || !ready)
  }, [paused, ready])

  return (
    <div
      ref={host}
      className="bm-pet3d relative"
      style={{ width: size, height: size }}
      data-mood={mood}
      data-petted={petted || undefined}
      data-paused={paused || undefined}
      role="img"
      aria-label={`Thú cưng 3D: ${mood}`}
    >
      <span className="bm-pet3d-shadow" aria-hidden />
      <span className="bm-ov bm-ov-zzz" aria-hidden>
        z<small>z</small>
      </span>
      <span className="bm-ov bm-ov-bubble" aria-hidden>
        !
      </span>
      <span className="bm-ov bm-ov-sparkles" aria-hidden>
        ✦<small>✦</small>
      </span>
      <span className="bm-ov bm-ov-heart" aria-hidden>
        ♥
      </span>
      <span className="bm-ov bm-ov-sweat" aria-hidden />
    </div>
  )
}
