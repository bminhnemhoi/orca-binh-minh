import { useEffect, useState } from 'react'
import { ChevronRight, Eye, EyeOff, Heart, ImagePlus } from 'lucide-react'
import { useAppStore } from '@/store'
import type { BinhMinhCornerSettings } from '../../../../shared/binhminh-corner-settings'
import { daysTogether, pickPhotoIndex } from './corner-logic'
import { loadCornerPhotoUrl } from './corner-photo-cache'
import { updateCornerSettings } from './use-corner-settings'

/** Re-renders at the next rotation boundary only, never on a fixed tick. */
function useSlotNow(intervalMinutes: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (intervalMinutes <= 0) {
      return
    }
    const slot = intervalMinutes * 60 * 1000
    const timer = setTimeout(() => setNow(Date.now()), slot - (Date.now() % slot) + 50)
    return () => clearTimeout(timer)
  }, [intervalMinutes, now])
  return now
}

function openCornerSettings(): void {
  const state = useAppStore.getState()
  state.openSettingsTarget({ pane: 'corner', repoId: null })
  state.openSettingsPage()
}

export function CornerPhotoFrame({
  settings
}: {
  settings: BinhMinhCornerSettings
}): React.JSX.Element {
  const { photo, together } = settings
  const now = useSlotNow(photo.intervalMinutes)
  const [manualOffset, setManualOffset] = useState(0)
  const count = photo.ids.length
  const base = pickPhotoIndex(count, photo.intervalMinutes, now)
  const id = count > 0 ? photo.ids[(base + manualOffset) % count]! : null
  const [shown, setShown] = useState<{ id: string; url: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    if (!id) {
      setShown(null)
      return
    }
    void loadCornerPhotoUrl(id).then((url) => {
      if (!cancelled && url) {
        setShown({ id, url })
      }
    })
    return () => {
      cancelled = true
    }
  }, [id])
  const days = together.enabled ? daysTogether(together.startDate, new Date(now)) : null

  if (count === 0) {
    return (
      <button
        type="button"
        onClick={openCornerSettings}
        className="flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground hover:bg-accent/40"
      >
        <ImagePlus className="size-4" />
        Thêm ảnh idol hoặc người thương
      </button>
    )
  }

  return (
    <figure className="group/photo relative m-0 overflow-hidden rounded-lg bg-muted/40">
      <div className="aspect-[4/3] max-h-44 w-full">
        {shown ? (
          <img
            key={shown.id}
            src={shown.url}
            alt={photo.caption || 'Ảnh của bạn'}
            decoding="async"
            draggable={false}
            className="bm-photo size-full"
            style={{
              objectFit: photo.fit,
              opacity: photo.opacity,
              filter: photo.blurred ? 'blur(14px) saturate(0.6)' : undefined
            }}
          />
        ) : null}
      </div>
      {photo.caption || days !== null ? (
        <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 text-[11px] text-white">
          {photo.caption ? <span className="block truncate">{photo.caption}</span> : null}
          {days !== null ? (
            <span className="flex items-center gap-1 font-medium">
              <Heart className="size-3 fill-current text-rose-400" />
              {together.label} {days.toLocaleString('vi-VN')} ngày
            </span>
          ) : null}
        </figcaption>
      ) : null}
      <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover/photo:opacity-100 group-focus-within/photo:opacity-100">
        <button
          type="button"
          aria-label={photo.blurred ? 'Hiện ảnh' : 'Làm mờ ảnh'}
          title={photo.blurred ? 'Hiện ảnh' : 'Làm mờ ảnh (riêng tư)'}
          onClick={() => void updateCornerSettings({ photo: { blurred: !photo.blurred } })}
          className="flex size-6 cursor-pointer items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70"
        >
          {photo.blurred ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </button>
        {count > 1 ? (
          <button
            type="button"
            aria-label="Ảnh tiếp theo"
            title="Ảnh tiếp theo"
            onClick={() => setManualOffset((n) => (n + 1) % count)}
            className="flex size-6 cursor-pointer items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70"
          >
            <ChevronRight className="size-3.5" />
          </button>
        ) : null}
      </div>
    </figure>
  )
}
