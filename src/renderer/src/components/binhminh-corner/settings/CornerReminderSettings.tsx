import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createBrowserUuid } from '@/lib/browser-uuid'
import { Input } from '@/components/ui/input'
import {
  SettingsRow,
  SettingsSegmentedControl,
  SettingsSwitchRow
} from '@/components/settings/SettingsFormControls'
import { DebouncedSettingsTextInput } from '@/components/settings/DebouncedSettingsTextInput'
import type {
  BinhMinhCornerSettings,
  BinhMinhReminder
} from '../../../../../shared/binhminh-corner-settings'
import { daysTogether } from '../corner-logic'
import { updateCornerSettings } from '../use-corner-settings'
import { useNow } from '../use-window-attention'

const LEAD_OPTIONS = [
  { value: 3, label: '3 ngày' },
  { value: 7, label: '1 tuần' },
  { value: 14, label: '2 tuần' },
  { value: 30, label: '1 tháng' }
] as const

export function CornerReminderSettings({
  settings
}: {
  settings: BinhMinhCornerSettings
}): React.JSX.Element {
  const { together, reminders } = settings
  const days = daysTogether(together.startDate, new Date(useNow(60_000)))
  const setReminders = (next: BinhMinhReminder[]): void =>
    void updateCornerSettings({ reminders: next })
  const editReminder = (index: number, patch: Partial<BinhMinhReminder>): void =>
    setReminders(reminders.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  return (
    <div className="space-y-1">
      <SettingsSwitchRow
        label="Đếm ngày bên nhau"
        description={
          together.enabled && days !== null
            ? `Hôm nay là ngày thứ ${days.toLocaleString('vi-VN')}. Hiện trên khung ảnh, có chúc mừng các mốc 100, 365, 500, 1000 ngày.`
            : 'Hiện trên khung ảnh, có chúc mừng các mốc 100, 365, 500, 1000 ngày.'
        }
        checked={together.enabled}
        onChange={() => void updateCornerSettings({ together: { enabled: !together.enabled } })}
      />
      <SettingsRow
        label="Ngày bắt đầu"
        control={
          <Input
            type="date"
            className="w-44"
            value={together.startDate}
            disabled={!together.enabled}
            onChange={(e) => void updateCornerSettings({ together: { startDate: e.target.value } })}
          />
        }
      />
      <SettingsRow
        label="Nhãn"
        control={
          <DebouncedSettingsTextInput
            className="w-44"
            value={together.label}
            maxLength={30}
            disabled={!together.enabled}
            commit={(label) => void updateCornerSettings({ together: { label } })}
          />
        }
      />

      <div className="space-y-2 py-2">
        <p className="text-sm font-medium">Ngày cần nhớ</p>
        <p className="text-xs text-muted-foreground">
          Sinh nhật, kỷ niệm... lặp lại mỗi năm; hiện ở góc khi sắp tới ngày.
        </p>
        {reminders.map((reminder, index) => (
          <div key={reminder.id} className="flex items-center gap-2">
            <DebouncedSettingsTextInput
              className="flex-1"
              value={reminder.label}
              maxLength={40}
              placeholder="Ví dụ: Sinh nhật em"
              commit={(label) => editReminder(index, { label })}
            />
            <Input
              type="date"
              className="w-44"
              value={reminder.date}
              onChange={(e) => editReminder(index, { date: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Xoá ngày này"
              onClick={() => setReminders(reminders.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setReminders([...reminders, { id: createBrowserUuid(), label: '', date: '' }])
          }
        >
          <Plus className="size-3.5" />
          Thêm ngày
        </Button>
      </div>
      <SettingsRow
        label="Nhắc trước"
        control={
          <SettingsSegmentedControl
            size="sm"
            value={settings.reminderLeadDays}
            options={LEAD_OPTIONS}
            ariaLabel="Nhắc trước bao nhiêu ngày"
            onChange={(reminderLeadDays) => void updateCornerSettings({ reminderLeadDays })}
          />
        }
      />
    </div>
  )
}
