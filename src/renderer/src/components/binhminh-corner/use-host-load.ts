import { useEffect, useState } from 'react'
import type { CornerHostLoad } from '../../../../shared/binhminh-corner-host-load'

export const HOST_LOAD_POLL_MS = 3_000
export const HOST_LOAD_HISTORY = 24

export type HostLoadState = {
  latest: CornerHostLoad | null
  /** Recent CPU percents, oldest first. */
  cpuHistory: number[]
}

/**
 * Polls whole-machine CPU/RAM while `enabled` and the window is visible.
 *
 * Why pause when hidden: a minimized Orca has nobody to show the gauge to, and each sample is an
 * IPC round trip plus a kernel counter read.
 */
export function useHostLoad(enabled: boolean): HostLoadState {
  const [state, setState] = useState<HostLoadState>({ latest: null, cpuHistory: [] })
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
          setState((prev) => ({
            latest,
            cpuHistory:
              latest.cpuPercent === null
                ? prev.cpuHistory
                : [...prev.cpuHistory, latest.cpuPercent].slice(-HOST_LOAD_HISTORY)
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
