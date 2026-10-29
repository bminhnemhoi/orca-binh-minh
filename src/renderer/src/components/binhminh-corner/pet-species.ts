/**
 * Pet species for the Bình Minh corner.
 *
 * Every species shares one sitting "chibi" rig (PetSprite.tsx) and differs only in palette, ears,
 * tail, face markings and voice, so all pets look like one family and cost the same to render.
 */
export type PetSpeciesId = 'cat' | 'dog' | 'fox' | 'rabbit' | 'panda' | 'penguin' | 'hamster'

export type PetVoice = 'meow' | 'bark' | 'yip' | 'squeak' | 'hum'

export type PetSpecies = {
  id: PetSpeciesId
  label: string
  /** Main fur. */
  body: string
  /** Belly, muzzle and inner ears. */
  light: string
  /** Ear tips, paws, panda patches. */
  accent: string
  ears: 'pointy' | 'tall-pointy' | 'floppy' | 'long' | 'round' | 'small-round'
  tail: 'curl' | 'bushy' | 'wag' | 'puff' | 'stub'
  markings: 'none' | 'fox-cheeks' | 'muzzle' | 'panda-eyes' | 'cheek-pouches'
  voice: PetVoice
  /** Has a Kenney Cube Pets model (CC0) for the 3D view. */
  has3d: boolean
  /** Has a drawing in the flat SVG rig. */
  hasFlat: boolean
}

export const PET_SPECIES: readonly PetSpecies[] = [
  {
    id: 'cat',
    label: 'Mèo',
    body: '#f4b183',
    light: '#fde7d4',
    accent: '#c97b4a',
    ears: 'pointy',
    tail: 'curl',
    markings: 'none',
    voice: 'meow',
    has3d: true,
    hasFlat: true
  },
  {
    id: 'dog',
    label: 'Chó',
    body: '#d9a066',
    light: '#f6e3c8',
    accent: '#8a5a33',
    ears: 'floppy',
    tail: 'wag',
    markings: 'muzzle',
    voice: 'bark',
    has3d: true,
    hasFlat: true
  },
  {
    id: 'fox',
    label: 'Cáo',
    body: '#ec7a3c',
    light: '#fff4ea',
    accent: '#3b2a24',
    ears: 'tall-pointy',
    tail: 'bushy',
    markings: 'fox-cheeks',
    voice: 'yip',
    has3d: true,
    hasFlat: true
  },
  {
    id: 'rabbit',
    label: 'Thỏ',
    body: '#e9e4f0',
    light: '#ffffff',
    accent: '#f3a9c0',
    ears: 'long',
    tail: 'puff',
    markings: 'none',
    voice: 'squeak',
    has3d: true,
    hasFlat: true
  },
  {
    id: 'panda',
    label: 'Gấu trúc',
    body: '#f7f7f5',
    light: '#ffffff',
    accent: '#2b2b2e',
    ears: 'round',
    tail: 'stub',
    markings: 'panda-eyes',
    voice: 'hum',
    has3d: true,
    hasFlat: true
  },
  {
    id: 'hamster',
    label: 'Hamster',
    body: '#f0c27b',
    light: '#fff3dc',
    accent: '#c98d46',
    ears: 'small-round',
    tail: 'stub',
    markings: 'cheek-pouches',
    voice: 'squeak',
    has3d: false,
    hasFlat: true
  }
]

/** Penguin exists only as a 3D model; its flat fields are unused. */
const PENGUIN: PetSpecies = {
  id: 'penguin',
  label: 'Chim cánh cụt',
  body: '#2f3640',
  light: '#f5f6fa',
  accent: '#f6a623',
  ears: 'small-round',
  tail: 'stub',
  markings: 'none',
  voice: 'squeak',
  has3d: true,
  hasFlat: false
}

export const ALL_PET_SPECIES: readonly PetSpecies[] = [
  ...PET_SPECIES.slice(0, 5),
  PENGUIN,
  PET_SPECIES[5]!
]

export function speciesFor(render: '3d' | 'flat'): readonly PetSpecies[] {
  return ALL_PET_SPECIES.filter((species) => (render === '3d' ? species.has3d : species.hasFlat))
}

/** The chosen species if it exists in this view, otherwise the first one that does. */
export function resolvePetSpecies(id: string | undefined, render: '3d' | 'flat'): PetSpecies {
  const list = speciesFor(render)
  return list.find((species) => species.id === id) ?? list[0]!
}

export function getPetSpecies(id: string | undefined): PetSpecies {
  return ALL_PET_SPECIES.find((species) => species.id === id) ?? PET_SPECIES[0]!
}
