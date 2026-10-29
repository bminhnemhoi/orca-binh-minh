import { Suspense, lazy, useState } from 'react'
import type { BinhMinhPetSettings } from '../../../../../shared/binhminh-corner-settings'
import { PetSprite } from '../PetSprite'
import { resolvePetSpecies, speciesFor } from '../pet-species'
import { playPetSound } from '../pet-voice'
import { updateCornerSettings } from '../use-corner-settings'

const Pet3D = lazy(() => import('../pet3d/Pet3D'))

/**
 * Species buttons for the current view, plus a live preview of the chosen pet. Only the preview
 * renders 3D: one WebGL context, however many species there are.
 */
export function CornerPetPicker({ pet }: { pet: BinhMinhPetSettings }): React.JSX.Element {
  const [webglFailed, setWebglFailed] = useState(false)
  const chosen = resolvePetSpecies(pet.species, pet.render)
  const list = speciesFor(pet.render)
  const preview = (
    <PetSprite
      species={resolvePetSpecies(chosen.id, 'flat')}
      mood="happy"
      speed={1}
      petted={false}
      paused={false}
      size={96}
    />
  )
  return (
    <div className="flex items-center gap-4 py-2">
      <div
        className="flex size-[120px] shrink-0 items-center justify-center rounded-xl border border-border bg-muted/30"
        aria-label={`Xem trước: ${chosen.label}`}
      >
        {pet.render === '3d' && !webglFailed ? (
          <Suspense fallback={chosen.hasFlat ? preview : null}>
            <Pet3D
              speciesId={chosen.id}
              mood="happy"
              speed={1}
              petted={false}
              paused={false}
              size={116}
              onUnavailable={() => setWebglFailed(true)}
            />
          </Suspense>
        ) : (
          preview
        )}
      </div>
      <div className="grid flex-1 grid-cols-4 gap-1.5" role="radiogroup" aria-label="Chọn thú cưng">
        {list.map((species) => {
          const selected = species.id === chosen.id
          return (
            <button
              key={species.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                void updateCornerSettings({ pet: { species: species.id } })
                if (pet.sound) {
                  playPetSound(species, pet.volume)
                }
              }}
              className={`h-8 cursor-pointer rounded-md border px-2 text-xs transition-colors ${selected ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}`}
            >
              {species.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
