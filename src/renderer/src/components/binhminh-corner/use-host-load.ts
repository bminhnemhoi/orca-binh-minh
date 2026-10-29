import { useEffect, useState } from 'react'
import type { CornerHostLoad } from '../../../../shared/binhminh-corner-host-load'
import type { HostSample } from './corner-insights'

export const HOST_LOAD_POLL_MS = 3_000
/** Five minutes at one sample per 3 s, as the CPU sparkline shows it. */
export const HOST_LOAD_HISTORY = 100

export type HostLoadState = {
  latest: CornerHostLoad | null
  /** Oldest first; `cpu` is null for the first sample, which has no delta yet. */
  samples: HostSample[]
}

/**
 * Polls whole-machine CPU/RAM while `enabled` and the window is visible.
 *
 * Why pause when hidden: a minimized Orca has nobody to show the gauge to, and each sample is an
 * IPC round trip plus a kernel counter read.
 */
export function useHostLoad(enabled: boolean): HostLoadState {
  const [state, setState] = useState<HostLoadState>({ latest: null, samples: [] })
  useEffect(() => {
    const api = window.api?.binhminhCorner
    if (!enabled || !api) {
      return
    }
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const tick = async (): Promise<void> => {
      timer = null
      if (document.visibilityState === 'visible') {
        try {
          const latest = await api.getHostLoad()
          if (disposed) {
            return
          }
          const sample: HostSample = {
            t: Date.now(),
            cpu: latest.cpuPercent,
            availableBytes: Math.max(0, latest.memoryTotalBytes - latest.memoryUsedBytes)
          }
          setState((prev) => ({
            latest,
            samples: [...prev.samples, sample].slice(-HOST_LOAD_HISTORY)
          }))
        } catch {
          // A failed sample keeps the last reading; the next tick tries again.
        }
      }
      if (!disposed) {
        timer = setTimeout(() => void tick(), HOST_LOAD_POLL_MS)
      }
    }
    const onVisible = (): void => {
      if (document.visibilityState === 'visible' && timer === null && !disposed) {
        void tick()
      }
    }
    void tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      disposed = true
      if (timer) {
        clearTimeout(timer)
      }
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])
  return state
}
