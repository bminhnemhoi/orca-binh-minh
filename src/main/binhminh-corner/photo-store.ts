import { app, nativeImage } from 'electron'
import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rm, stat, writeFile, copyFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { isCornerPhotoId } from '../../shared/binhminh-corner-settings'

/**
 * Photos for the Bình Minh corner frame, stored inside Orca's profile.
 *
 * Why copy instead of pointing at the original: the frame keeps working after the original is
 * moved, the files never sit in a git repository, and a downscaled copy (longest side 1280 px)
 * keeps each photo around 100–300 KB so decoding stays cheap in the sidebar.
 */
const MAX_EDGE = 1280
const JPEG_QUALITY = 86
/** Formats nativeImage cannot decode are kept as-is up to this size. */
const MAX_PASSTHROUGH_BYTES = 6 * 1024 * 1024

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}

export const CORNER_PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']

export function getCornerPhotosDir(): string {
  return join(app.getPath('userData'), 'binhminh-corner', 'photos')
}

async function findPhotoFile(id: string): Promise<string | null> {
  if (!isCornerPhotoId(id)) {
    return null
  }
  const entries = await readdir(getCornerPhotosDir()).catch(() => [] as string[])
  const name = entries.find((entry) => entry.startsWith(`${id}.`) && MIME_BY_EXT[extname(entry)])
  return name ? join(getCornerPhotosDir(), name) : null
}

/** Imports one picked file; returns the new id or null when the format is unsupported. */
export async function importCornerPhoto(source: string): Promise<string | null> {
  const dir = getCornerPhotosDir()
  await mkdir(dir, { recursive: true })
  const id = randomUUID()
  const ext = extname(source).toLowerCase()
  const image = nativeImage.createFromPath(source)
  if (!image.isEmpty()) {
    const { width, height } = image.getSize()
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height, 1))
    const sized =
      scale < 1
        ? image.resize({
            width: Math.round(width * scale),
            height: Math.round(height * scale),
            quality: 'good'
          })
        : image
    // Why PNG stays PNG: a transparent PNG flattened to JPEG gets a black background.
    const asPng = ext === '.png'
    await writeFile(
      join(dir, `${id}${asPng ? '.png' : '.jpg'}`),
      asPng ? sized.toPNG() : sized.toJPEG(JPEG_QUALITY)
    )
    return id
  }
  const passthroughExt = ext === '.webp' || ext === '.gif' ? ext : null
  const size = (await stat(source).catch(() => null))?.size ?? Infinity
  if (!passthroughExt || size > MAX_PASSTHROUGH_BYTES) {
    return null
  }
  await copyFile(source, join(dir, `${id}${passthroughExt}`))
  return id
}

export async function readCornerPhoto(
  id: string
): Promise<{ data: Uint8Array; mimeType: string } | null> {
  const file = await findPhotoFile(id)
  if (!file) {
    return null
  }
  const data = await readFile(file).catch(() => null)
  return data ? { data, mimeType: MIME_BY_EXT[extname(file)] ?? 'image/jpeg' } : null
}

export async function deleteCornerPhoto(id: string): Promise<void> {
  const file = await findPhotoFile(id)
  if (file) {
    await rm(file, { force: true })
  }
}
