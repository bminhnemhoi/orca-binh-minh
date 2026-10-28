/**
 * Pet species for the Bình Minh corner.
 *
 * Every species shares one sitting "chibi" rig (PetSprite.tsx) and differs only in palette, ears,
 * tail, face markings and voice, so all pets look like one family and cost the same to render.
 */
export type PetSpeciesId = 'cat' | 'dog' | 'fox' | 'rabbit' | 'panda' | 'hamster'

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
    voice: 'meow'
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
    voice: 'bark'
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
    voice: 'yip'
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
    voice: 'squeak'
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
    voice: 'hum'
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
    voice: 'squeak'
  }
]

export function getPetSpecies(id: string | undefined): PetSpecies {
  return PET_SPECIES.find((species) => species.id === id) ?? PET_SPECIES[0]!
}
