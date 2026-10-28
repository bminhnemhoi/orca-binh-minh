import type {
  CornerHostLoad,
  CornerPhoto,
  CornerPhotoImportResult
} from '../../shared/binhminh-corner-host-load'

export type BinhMinhCornerApi = {
  getHostLoad: () => Promise<CornerHostLoad>
  /** Opens a multi-select picker; imports at most `room` photos into Orca's profile. */
  importPhotos: (room: number) => Promise<CornerPhotoImportResult>
  readPhoto: (id: string) => Promise<CornerPhoto | null>
  deletePhoto: (id: string) => Promise<void>
  /** Flashes the taskbar button until Orca is focused; no-op when already focused. */
  flashTaskbar: () => void
}
