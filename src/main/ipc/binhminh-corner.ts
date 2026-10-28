import { BrowserWindow, dialog, ipcMain } from 'electron'
import { MAX_CORNER_PHOTOS } from '../../shared/binhminh-corner-settings'
import type {
  CornerHostLoad,
  CornerPhoto,
  CornerPhotoImportResult
} from '../../shared/binhminh-corner-host-load'
import { sampleCornerHostLoad } from '../binhminh-corner/host-load'
import {
  CORNER_PHOTO_EXTENSIONS,
  deleteCornerPhoto,
  importCornerPhoto,
  readCornerPhoto
} from '../binhminh-corner/photo-store'

const flashingWindows = new WeakSet<BrowserWindow>()

export function registerBinhMinhCornerHandlers(): void {
  ipcMain.handle('binhminhCorner:getHostLoad', (): Promise<CornerHostLoad> =>
    sampleCornerHostLoad()
  )

  ipcMain.handle(
    'binhminhCorner:importPhotos',
    async (event, room: unknown): Promise<CornerPhotoImportResult> => {
      const limit = Math.max(0, Math.min(MAX_CORNER_PHOTOS, typeof room === 'number' ? room : 0))
      if (limit === 0) {
        return { ids: [], skipped: 0 }
      }
      const owner = BrowserWindow.fromWebContents(event.sender) ?? undefined
      const options: Electron.OpenDialogOptions = {
        title: 'Chọn ảnh cho Góc Bình Minh',
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Ảnh', extensions: CORNER_PHOTO_EXTENSIONS }]
      }
      const picked = owner
        ? await dialog.showOpenDialog(owner, options)
        : await dialog.showOpenDialog(options)
      if (picked.canceled) {
        return { ids: [], skipped: 0 }
      }
      const ids: string[] = []
      let skipped = 0
      for (const file of picked.filePaths.slice(0, limit)) {
        const id = await importCornerPhoto(file).catch(() => null)
        if (id) {
          ids.push(id)
        } else {
          skipped++
        }
      }
      return { ids, skipped: skipped + Math.max(0, picked.filePaths.length - limit) }
    }
  )

  ipcMain.handle('binhminhCorner:readPhoto', (_event, id: unknown): Promise<CornerPhoto | null> =>
    typeof id === 'string' ? readCornerPhoto(id) : Promise.resolve(null)
  )

  ipcMain.handle('binhminhCorner:deletePhoto', async (_event, id: unknown): Promise<void> => {
    if (typeof id === 'string') {
      await deleteCornerPhoto(id)
    }
  })

  // Why main owns the flash: only BrowserWindow can flash the Windows taskbar button, and it must
  // stop by itself once the user brings Orca to the front.
  ipcMain.on('binhminhCorner:flashTaskbar', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed() || win.isFocused() || flashingWindows.has(win)) {
      return
    }
    flashingWindows.add(win)
    win.flashFrame(true)
    win.once('focus', () => {
      flashingWindows.delete(win)
      if (!win.isDestroyed()) {
        win.flashFrame(false)
      }
    })
  })
}
