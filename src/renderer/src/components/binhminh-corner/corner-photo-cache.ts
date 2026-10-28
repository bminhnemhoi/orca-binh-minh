/**
 * Object URLs for corner photos, newest last.
 *
 * Why a small LRU: rotating between a handful of photos should not re-read and re-decode each one
 * every slot, but a 30-photo album must not pin 30 decoded images either. Evicted URLs are revoked.
 */
const MAX_ENTRIES = 4
const urls = new Map<string, string>()
const pending = new Map<string, Promise<string | null>>()

function remember(id: string, url: string): void {
  urls.delete(id)
  urls.set(id, url)
  while (urls.size > MAX_ENTRIES) {
    const oldest = urls.keys().next().value as string
    URL.revokeObjectURL(urls.get(oldest)!)
    urls.delete(oldest)
  }
}

export function loadCornerPhotoUrl(id: string): Promise<string | null> {
  const cached = urls.get(id)
  if (cached) {
    remember(id, cached)
    return Promise.resolve(cached)
  }
  const inFlight = pending.get(id)
  if (inFlight) {
    return inFlight
  }
  const api = window.api?.binhminhCorner
  if (!api) {
    return Promise.resolve(null)
  }
  const request = api
    .readPhoto(id)
    .then((photo) => {
      if (!photo) {
        return null
      }
      // Why the copy: IPC hands back a view over a shared buffer, which Blob's types reject.
      const bytes = new Uint8Array(photo.data)
      const url = URL.createObjectURL(new Blob([bytes], { type: photo.mimeType }))
      remember(id, url)
      return url
    })
    .catch(() => null)
    .finally(() => pending.delete(id))
  pending.set(id, request)
  return request
}

export function forgetCornerPhoto(id: string): void {
  const url = urls.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    urls.delete(id)
  }
}
