import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import type { DashboardRevealAgentArgs } from '../../../../shared/dashboard-snapshot'
import { useAgentBucketCounts } from '../dashboard/useAgentBucketCounts'
import { CornerInsightChip } from './CornerInsightChip'
import { CornerNeedsYou } from './CornerNeedsYou'
import { CornerPet } from './CornerPet'
import { CornerPhotoFrame } from './CornerPhotoFrame'
import { CornerQuotaCard } from './CornerQuotaCard'
import { CornerReminders } from './CornerReminders'
import { CornerSystemCard } from './CornerSystemCard'
import { loadCornerPhotoUrl } from './corner-photo-cache'
import { readQuotaSeries } from './quota-history'
import { buildQuotaRows, lowestQuotaLabel, lowestQuotaLeft } from './quota-rows'
import { useCornerSettings } from './use-corner-settings'
import { useHostLoad } from './use-host-load'
import { useNow } from './use-window-attention'

/** Glass style backdrop: the photo blurred once by CSS on a static layer (no backdrop-filter). */
function Ambient({ photoId }: { photoId: string }): React.JSX.Element | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadCornerPhotoUrl(photoId).then((next) => {
      if (!cancelled) {
        setUrl(next)
      }
    })
    return () => {
      cancelled = true
    }
  }, [photoId])
  return url ? (
    <div className="bm-ambient" aria-hidden>
      <img src={url} alt="" decoding="async" />
    </div>
  ) : null
}

/**
 * Góc Bình Minh: the bottom of the right sidebar.
 *
 * Calm by default, loud only when something needs the user: the companion and a summary line
 * first, then what waits for you and the one tip worth acting on, then the numbers. Every part
 * can be switched off, and the whole corner restyled, in Settings → Góc Bình Minh.
 */
export function BinhMinhCorner(): React.JSX.Element | null {
  const settings = useCornerSettings()
  const counts = useAgentBucketCounts()
  const limits = useAppStore((s) => s.rateLimits)
  const now = useNow(60_000)
  const [attentionTarget, setAttentionTarget] = useState<DashboardRevealAgentArgs | null>(null)
  const onFirstTarget = useCallback(
    (target: DashboardRevealAgentArgs | null) => setAttentionTarget(target),
    []
  )
  // Why one poller here: both the CPU/RAM card and the tips read it; off when neither is shown.
  const load = useHostLoad(settings.enabled && (settings.hostLoad || settings.insights))
  const [detail, setDetail] = useState<'memory' | 'cpu' | null>(null)
  const quotaRows = useMemo(
    () =>
      buildQuotaRows(limits, now, (provider, section) =>
        readQuotaSeries(provider, section.label, section.window)
      ),
    [limits, now]
  )
  if (!settings.enabled) {
    return null
  }
  const needsTargets = counts.attention > 0 && (settings.needsYou || settings.pet.enabled)
  const photoReady = settings.photo.enabled && settings.photo.ids.length > 0
  return (
    <div
      className="bm-corner deck-binhminh-corner min-h-0 shrink-0 overflow-y-auto border-t scrollbar-sleek"
      data-w={settings.style}
      style={{ borderTopColor: 'var(--w-border)', maxHeight: '64%' }}
    >
      {settings.style === 'glass' && photoReady ? (
        <Ambient photoId={settings.photo.ids[0]!} />
      ) : null}
      <div className="bm-layer space-y-2.5 p-3">
        {settings.pet.enabled ? (
          <CornerPet
            settings={settings}
            working={counts.working}
            waiting={counts.attention}
            finished={counts.done}
            lowestQuotaLeft={lowestQuotaLeft(quotaRows)}
            quotaLabel={lowestQuotaLabel(quotaRows)}
            attentionTarget={counts.attention > 0 ? attentionTarget : null}
          />
        ) : null}
        {needsTargets ? (
          <CornerNeedsYou showList={settings.needsYou} onFirstTarget={onFirstTarget} />
        ) : null}
        {settings.insights ? (
          <CornerInsightChip
            host={load.samples}
            quota={quotaRows}
            onShowDetail={(kind) => {
              setDetail(kind)
              void useAppStore.getState().fetchMemorySnapshot()
            }}
          />
        ) : null}
        {settings.photo.enabled ? <CornerPhotoFrame settings={settings} /> : null}
        {settings.quotaCard ? <CornerQuotaCard /> : null}
        {settings.hostLoad ? (
          <CornerSystemCard load={load} detail={detail} onDetail={setDetail} />
        ) : null}
        <CornerReminders settings={settings} showTogetherCounter={!photoReady} />
      </div>
    </div>
  )
}
