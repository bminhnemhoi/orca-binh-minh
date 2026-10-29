import type { ProviderRateLimits, RateLimitWindow } from '../../../../shared/rate-limit-types'

export type QuotaSection = { label: string; window: RateLimitWindow }

/**
 * The quota windows a provider reports, with stable untranslated labels.
 *
 * Why not the status bar's getWindowSections: its labels are translated (so history keys would
 * change with the UI language), and it lives in a component module the store must not import.
 */
export function quotaSections(usage: ProviderRateLimits): QuotaSection[] {
  const sections: QuotaSection[] = []
  for (const bucket of usage.buckets ?? []) {
    sections.push({ label: bucket.name, window: bucket })
  }
  if (sections.length === 0 && usage.session) {
    sections.push({ label: 'Session', window: usage.session })
  }
  if (usage.weekly) {
    // Why skip when buckets exist: Antigravity reports its weekly figure as a bucket too.
    if (!usage.buckets?.length) {
      sections.push({ label: 'Weekly', window: usage.weekly })
    }
  }
  if (usage.fableWeekly) {
    sections.push({ label: 'Fable', window: usage.fableWeekly })
  }
  return sections
}

/** The window closest to running out. */
export function tightestQuotaSection(usage: ProviderRateLimits): QuotaSection | null {
  let best: QuotaSection | null = null
  for (const section of quotaSections(usage)) {
    if (!best || section.window.usedPercent > best.window.usedPercent) {
      best = section
    }
  }
  return best
}
