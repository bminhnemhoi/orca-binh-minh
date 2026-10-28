import { CalendarHeart, Heart, PartyPopper } from 'lucide-react'
import type { BinhMinhCornerSettings } from '../../../../shared/binhminh-corner-settings'
import { daysTogether, togetherMilestone, upcomingReminders } from './corner-logic'
import { useNow } from './use-window-attention'

function whenLabel(daysUntil: number): string {
  return daysUntil === 0 ? 'hôm nay' : daysUntil === 1 ? 'ngày mai' : `còn ${daysUntil} ngày`
}

/**
 * Upcoming birthdays/anniversaries and together-day milestones. Renders nothing on an ordinary
 * day, so the corner only grows when there is something worth saying.
 */
export function CornerReminders({
  settings,
  showTogetherCounter
}: {
  settings: BinhMinhCornerSettings
  /** The photo frame already shows the counter; show it here only without the frame. */
  showTogetherCounter: boolean
}): React.JSX.Element | null {
  // Why a minute clock: "today/tomorrow" turns over at midnight without a per-second timer.
  const now = new Date(useNow(60_000))
  const upcoming = upcomingReminders(settings.reminders, now, settings.reminderLeadDays).slice(0, 3)
  const days = settings.together.enabled ? daysTogether(settings.together.startDate, now) : null
  const milestone = togetherMilestone(days)
  if (upcoming.length === 0 && !milestone && !(showTogetherCounter && days !== null)) {
    return null
  }
  return (
    <section aria-label="Lời nhắc" className="space-y-1 text-[11px]">
      {showTogetherCounter && days !== null && !milestone ? (
        <p className="flex items-center gap-1.5 text-foreground">
          <Heart className="size-3.5 fill-current text-rose-400" />
          {settings.together.label} {days.toLocaleString('vi-VN')} ngày
        </p>
      ) : null}
      {milestone ? (
        <p className="flex items-center gap-1.5 font-medium text-rose-400">
          <PartyPopper className="size-3.5" />
          Hôm nay tròn {milestone} {settings.together.label.toLowerCase()}!
        </p>
      ) : null}
      {upcoming.map((reminder) => (
        <p
          key={`${reminder.label}-${reminder.daysUntil}`}
          className={`flex items-center gap-1.5 ${reminder.daysUntil === 0 ? 'font-medium text-rose-400' : 'text-muted-foreground'}`}
        >
          <CalendarHeart className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {reminder.label}
            {reminder.years > 0 ? ` · tròn ${reminder.years} năm` : ''}
          </span>
          <span className="shrink-0">{whenLabel(reminder.daysUntil)}</span>
        </p>
      ))}
    </section>
  )
}
