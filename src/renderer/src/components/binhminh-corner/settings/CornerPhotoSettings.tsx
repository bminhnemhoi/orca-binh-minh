import { useEffect, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  SettingsRow,
  SettingsSegmentedControl,
  SettingsSwitchRow
} from '@/components/settings/SettingsFormControls'
import { DebouncedSettingsTextInput } from '@/components/settings/DebouncedSettingsTextInput'
import {
  MAX_CORNER_PHOTOS,
  type BinhMinhCornerSettings
} from '../../../../../shared/binhminh-corner-settings'
import { forgetCornerPhoto, loadCornerPhotoUrl } from '../corner-photo-cache'
import { updateCornerSettings } from '../use-corner-settings'
import { CornerSlider } from './CornerSlider'

const INTERVAL_OPTIONS = [
  { value: 0, label: 'Cố định' },
  { value: 15, label: '15 phút' },
  { value: 30, label: '30 phút' },
  { value: 60, label: '1 giờ' },
  { value: 180, label: '3 giờ' },
  { value: 1440, label: 'Mỗi ngày' }
] as const

function Thumbnail({ id, onRemove }: { id: string; onRemove: () => void }): React.JSX.Element {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadCornerPhotoUrl(id).then((next) => {
      if (!cancelled) {
        setUrl(next)
      }
    })
    return () => {
      cancelled = true
    }
  }, [id])
  return (
    <div className="group/thumb relative aspect-square overflow-hidden rounded-md bg-muted">
      {url ? <img src={url} alt="" className="size-full object-cover" draggable={false} /> : null}
      <button
        type="button"
        aria-label="Xoá ảnh"
        onClick={onRemove}
        className="absolute right-0.5 top-0.5 flex size-5 cursor-pointer items-center justify-center rounded bg-black/60 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100 focus-visible:opacity-100"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

export function CornerPhotoSettings({
  settings
}: {
  settings: BinhMinhCornerSettings
}): React.JSX.Element {
  const photo = settings.photo
  const [busy, setBusy] = useState(false)
  const room = MAX_CORNER_PHOTOS - photo.ids.length

  const addPhotos = async (): Promise<void> => {
    const api = window.api?.binhminhCorner
    if (!api || busy) {
      return
    }
    setBusy(true)
    try {
      const result = await api.importPhotos(room)
      if (result.ids.length > 0) {
        await updateCornerSettings({ photo: { ids: [...photo.ids, ...result.ids], enabled: true } })
      }
      if (result.skipped > 0) {
        toast.warning(
          `Bỏ qua ${result.skipped} tệp: không phải ảnh Orca đọc được, hoặc đã đủ ${MAX_CORNER_PHOTOS} ảnh.`
        )
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thêm được ảnh.')
    } finally {
      setBusy(false)
    }
  }

  const removePhoto = (id: string): void => {
    forgetCornerPhoto(id)
    void updateCornerSettings({ photo: { ids: photo.ids.filter((other) => other !== id) } })
    void window.api?.binhminhCorner?.deletePhoto(id)
  }

  return (
    <div className="space-y-1">
      <SettingsSwitchRow
        label="Hiện khung ảnh"
        description="Ảnh được thu nhỏ và lưu riêng trong hồ sơ Orca trên máy này; không đưa vào repo hay lên mạng."
        checked={photo.enabled}
        disabled={!settings.enabled}
        onChange={() => void updateCornerSettings({ photo: { enabled: !photo.enabled } })}
      />
      <div className="grid grid-cols-6 gap-2 py-2">
        {photo.ids.map((id) => (
          <Thumbnail key={id} id={id} onRemove={() => removePhoto(id)} />
        ))}
        {room > 0 ? (
          <Button
            variant="outline"
            className="aspect-square h-auto flex-col gap-1 text-xs"
            disabled={busy}
            onClick={() => void addPhotos()}
          >
            <ImagePlus className="size-4" />
            Thêm ảnh
          </Button>
        ) : null}
      </div>
      <SettingsRow
        label="Đổi ảnh"
        description="Cố định giữ ảnh đầu tiên; bấm mũi tên trên khung để xem ảnh kế tiếp bất cứ lúc nào."
        control={
          <SettingsSegmentedControl
            size="sm"
            value={photo.intervalMinutes}
            options={INTERVAL_OPTIONS}
            ariaLabel="Chu kỳ đổi ảnh"
            onChange={(intervalMinutes) =>
              void updateCornerSettings({ photo: { intervalMinutes } })
            }
          />
        }
      />
      <SettingsRow
        label="Cách hiển thị"
        control={
          <SettingsSegmentedControl
            size="sm"
            value={photo.fit}
            options={[
              { value: 'cover', label: 'Lấp đầy khung' },
              { value: 'contain', label: 'Trọn ảnh' }
            ]}
            ariaLabel="Cách hiển thị ảnh"
            onChange={(fit) => void updateCornerSettings({ photo: { fit } })}
          />
        }
      />
      <SettingsRow
        label="Độ rõ"
        description="Giảm để ảnh dịu hơn khi làm việc khuya."
        control={
          <CornerSlider
            value={Math.round(photo.opacity * 100)}
            min={30}
            ariaLabel="Độ rõ của ảnh"
            onCommit={(value) => void updateCornerSettings({ photo: { opacity: value / 100 } })}
          />
        }
      />
      <SettingsRow
        label="Chú thích"
        control={
          <DebouncedSettingsTextInput
            className="w-56"
            value={photo.caption}
            maxLength={60}
            placeholder="Ví dụ: Cố lên nhé!"
            commit={(caption) => void updateCornerSettings({ photo: { caption } })}
          />
        }
      />
      <SettingsSwitchRow
        label="Làm mờ ảnh (riêng tư)"
        description="Bật khi chia sẻ màn hình hoặc trình bày. Cũng bật/tắt được bằng nút con mắt trên khung ảnh."
        checked={photo.blurred}
        onChange={() => void updateCornerSettings({ photo: { blurred: !photo.blurred } })}
      />
    </div>
  )
}
