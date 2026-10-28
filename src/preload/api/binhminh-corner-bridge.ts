import { ipcRenderer } from 'electron'
import type {
  CornerHostLoad,
  CornerPhoto,
  CornerPhotoImportResult
} from '../../shared/binhminh-corner-host-load'
import type { PreloadApi } from '../api-types'

export const binhminhCornerApi = {
  getHostLoad: (): Promise<CornerHostLoad> => ipcRenderer.invoke('binhminhCorner:getHostLoad'),
  importPhotos: (room: number): Promise<CornerPhotoImportResult> =>
    ipcRenderer.invoke('binhminhCorner:importPhotos', room),
  readPhoto: (id: string): Promise<CornerPhoto | null> =>
    ipcRenderer.invoke('binhminhCorner:readPhoto', id),
  deletePhoto: (id: string): Promise<void> => ipcRenderer.invoke('binhminhCorner:deletePhoto', id),
  flashTaskbar: (): void => ipcRenderer.send('binhminhCorner:flashTaskbar')
} satisfies PreloadApi['binhminhCorner']
