import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  SettingsRow,
  SettingsSegmentedControl,
  SettingsSwitchRow
} from '@/components/settings/SettingsFormControls'
import { DebouncedSettingsTextInput } from '@/components/settings/DebouncedSettingsTextInput'
import { PET_SPECIES, getPetSpecies } from '../pet-species'
import { PetSprite } from '../PetSprite'
import { playPetVoice } from '../pet-voice'
import { updateCornerSettings, useCornerSettings } from '../use-corner-settings'
import { CornerPhotoSettings } from './CornerPhotoSettings'
import { CornerReminderSettings } from './CornerReminderSettings'
import { CornerSlider } from './CornerSlider'

const LATE_NIGHT_OPTIONS = [
  { value: -1, label: 'Tắt' },
  { value: 23, label: '23h' },
  { value: 0, label: '0h' },
  { value: 1, label: '1h' },
  { value: 2, label: '2h' }
] as const

function Heading({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <h3 className="pt-4 text-sm font-semibold text-foreground first:pt-0">{children}</h3>
}

export function BinhMinhCornerPane(): React.JSX.Element {
  const s = useCornerSettings()
  const pet = s.pet
  return (
    <div className="space-y-1">
      <Heading>Chung</Heading>
      <SettingsSwitchRow
        label="Bật Góc Bình Minh"
        description="Khu vực cuối sidebar phải: thú cưng, ảnh, hạn mức, CPU/RAM và lời nhắc."
        checked={s.enabled}
        onChange={() => void updateCornerSettings({ enabled: !s.enabled })}
      />
      <SettingsSwitchRow
        label="Thẻ hạn mức"
        description="Claude, Codex, Antigravity: % còn lại, giờ reset và dự báo giờ hết theo nhịp đang dùng."
        checked={s.quotaCard}
        disabled={!s.enabled}
        onChange={() => void updateCornerSettings({ quotaCard: !s.quotaCard })}
      />
      <SettingsSwitchRow
        label="Agent cần bạn"
        description="Liệt kê agent đang chờ bạn trả lời; bấm để mở đúng pane."
        checked={s.needsYou}
        disabled={!s.enabled}
        onChange={() => void updateCornerSettings({ needsYou: !s.needsYou })}
      />
      <SettingsSwitchRow
        label="CPU và RAM cả máy"
        description="Đo nhẹ mỗi 3 giây, chỉ khi Orca đang hiện."
        checked={s.hostLoad}
        disabled={!s.enabled}
        onChange={() => void updateCornerSettings({ hostLoad: !s.hostLoad })}
      />
      <SettingsSwitchRow
        label="Nháy taskbar khi agent chờ bạn"
        description="Biểu tượng Orca trên taskbar nhấp nháy cho tới khi bạn quay lại Orca."
        checked={s.flashTaskbar}
        disabled={!s.enabled}
        onChange={() => void updateCornerSettings({ flashTaskbar: !s.flashTaskbar })}
      />
      <SettingsSwitchRow
        label="Ô ước tính chi phí API"
        description="Chi phí quy đổi theo giá API từ log trên máy; cần bật Usage Analytics trong Stats & Usage."
        checked={s.apiCostCard}
        disabled={!s.enabled}
        onChange={() => void updateCornerSettings({ apiCostCard: !s.apiCostCard })}
      />

      <Heading>Thú cưng</Heading>
      <SettingsSwitchRow
        label="Hiện thú cưng"
        description="Ngủ khi rảnh, chạy khi agent làm việc (càng nhiều agent càng nhanh), nhảy lên khi agent chờ bạn."
        checked={pet.enabled}
        disabled={!s.enabled}
        onChange={() => void updateCornerSettings({ pet: { enabled: !pet.enabled } })}
      />
      <div className="grid grid-cols-6 gap-2 py-2" role="radiogroup" aria-label="Chọn thú cưng">
        {PET_SPECIES.map((species) => {
          const selected = species.id === getPetSpecies(pet.species).id
          return (
            <button
              key={species.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                void updateCornerSettings({ pet: { species: species.id } })
                if (pet.sound) {
                  playPetVoice(species.voice, pet.volume)
                }
              }}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-1.5 text-xs transition-colors ${selected ? 'border-primary bg-accent' : 'border-border hover:bg-accent/50'}`}
            >
              <PetSprite
                species={species}
                mood="idle"
                speed={1}
                petted={false}
                paused={!selected}
                size={48}
              />
              {species.label}
            </button>
          )
        })}
      </div>
      <SettingsRow
        label="Tên thú cưng"
        control={
          <DebouncedSettingsTextInput
            className="w-56"
            value={pet.name}
            maxLength={24}
            commit={(name) => void updateCornerSettings({ pet: { name } })}
          />
        }
      />
      <SettingsSwitchRow
        label="Âm thanh"
        description="Tiếng kêu tổng hợp ngay trong Orca: chó sủa, mèo kêu meo, cáo kêu ét, thỏ và hamster chít chít, gấu trúc ư."
        checked={pet.sound}
        onChange={() => void updateCornerSettings({ pet: { sound: !pet.sound } })}
      />
      <SettingsRow
        label="Âm lượng"
        control={
          <div className="flex items-center gap-2">
            <CornerSlider
              value={Math.round(pet.volume * 100)}
              ariaLabel="Âm lượng thú cưng"
              disabled={!pet.sound}
              onCommit={(value) => void updateCornerSettings({ pet: { volume: value / 100 } })}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!pet.sound}
              onClick={() => playPetVoice(getPetSpecies(pet.species).voice, pet.volume)}
            >
              <Volume2 className="size-3.5" />
              Nghe thử
            </Button>
          </div>
        }
      />
      <SettingsSwitchRow
        label="Kêu khi agent chờ bạn"
        description="Kêu một lần khi có agent mới chờ bạn; nghỉ ít nhất 15 giây giữa hai lần."
        checked={pet.soundOnNeedsYou}
        disabled={!pet.sound}
        onChange={() =>
          void updateCornerSettings({ pet: { soundOnNeedsYou: !pet.soundOnNeedsYou } })
        }
      />
      <SettingsSwitchRow
        label="Im lặng khi khuya"
        checked={pet.muteLateNight}
        disabled={!pet.sound}
        onChange={() => void updateCornerSettings({ pet: { muteLateNight: !pet.muteLateNight } })}
      />
      <SettingsRow
        label="Nhắc nghỉ khi thức khuya"
        description="Từ giờ này tới 5h sáng, thú cưng ngáp và nhắc bạn đi nghỉ."
        control={
          <SettingsSegmentedControl
            size="sm"
            value={s.lateNightFromHour ?? -1}
            options={LATE_NIGHT_OPTIONS}
            ariaLabel="Giờ bắt đầu nhắc nghỉ"
            onChange={(hour) =>
              void updateCornerSettings({ lateNightFromHour: hour < 0 ? null : hour })
            }
          />
        }
      />

      <Heading>Khung ảnh</Heading>
      <CornerPhotoSettings settings={s} />

      <Heading>Kỷ niệm và lời nhắc</Heading>
      <CornerReminderSettings settings={s} />
    </div>
  )
}
