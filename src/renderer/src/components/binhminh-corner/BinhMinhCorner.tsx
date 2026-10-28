import { useCallback, useState } from 'react'
import { useAppStore } from '@/store'
import type { DashboardRevealAgentArgs } from '../../../../shared/dashboard-snapshot'
import { useAgentBucketCounts } from '../dashboard/useAgentBucketCounts'
import { CornerHostLoad } from './CornerHostLoad'
import { CornerNeedsYou } from './CornerNeedsYou'
import { CornerPet } from './CornerPet'
import { CornerPhotoFrame } from './CornerPhotoFrame'
import { CornerQuotaCard, lowestQuotaLeft, selectQuotaRows } from './CornerQuotaCard'
import { CornerReminders } from './CornerReminders'
import { useCornerSettings } from './use-corner-settings'

/**
 * Góc Bình Minh: the bottom of the right sidebar.
 *
 * Order follows how often each part needs the eye: what waits for you, the companion, then the
 * numbers (quota, machine load). Every part can be switched off in Settings → Góc Bình Minh.
 */
export function BinhMinhCorner(): React.JSX.Element | null {
  const settings = useCornerSettings()
  const counts = useAgentBucketCounts()
  const limits = useAppStore((s) => s.rateLimits)
  const [attentionTarget, setAttentionTarget] = useState<DashboardRevealAgentArgs | null>(null)
  const onFirstTarget = useCallback(
    (target: DashboardRevealAgentArgs | null) => setAttentionTarget(target),
    []
  )
  if (!settings.enabled) {
    return null
  }
  const quotaRows = selectQuotaRows(limits)
  const needsTargets = counts.attention > 0 && (settings.needsYou || settings.pet.enabled)
  return (
    <div
      className="deck-binhminh-corner min-h-0 shrink-0 space-y-3 overflow-y-auto border-t bg-sidebar p-3 scrollbar-sleek"
      style={{ borderTopColor: 'var(--sidebar-border)', maxHeight: '62%' }}
    >
      {needsTargets ? (
        <CornerNeedsYou showList={settings.needsYou} onFirstTarget={onFirstTarget} />
      ) : null}
      {settings.photo.enabled ? <CornerPhotoFrame settings={settings} /> : null}
      {settings.pet.enabled ? (
        <CornerPet
          settings={settings}
          working={counts.working}
          waiting={counts.attention}
          finished={counts.done}
          lowestQuotaLeft={lowestQuotaLeft(quotaRows)}
          attentionTarget={counts.attention > 0 ? attentionTarget : null}
        />
      ) : null}
      <CornerReminders
        settings={settings}
        showTogetherCounter={!(settings.photo.enabled && settings.photo.ids.length > 0)}
      />
      {settings.quotaCard ? <CornerQuotaCard /> : null}
      {settings.hostLoad ? <CornerHostLoad /> : null}
    </div>
  )
}
