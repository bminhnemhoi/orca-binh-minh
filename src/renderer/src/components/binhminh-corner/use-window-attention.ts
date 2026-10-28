import { useEffect, useRef, useState } from 'react'

/** True while Orca is visible and focused; animations pause otherwise to spare CPU and GPU. */
export function useWindowActive(): boolean {
  const read = (): boolean => document.visibilityState === 'visible' && document.hasFocus()
  const [active, setActive] = useState(read)
  useEffect(() => {
    const update = (): void => setActive(read())
    window.addEventListener('focus', update)
    window.addEventListener('blur', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.removeEventListener('focus', update)
      window.removeEventListener('blur', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return active
}

/** The local hour, refreshed each minute (the pet's late-night and sleep moods). */
export function useLocalHour(): number {
  const [hour, setHour] = useState(() => new Date().getHours())
  useEffect(() => {
    const timer = setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return hour
}

/** Wall-clock milliseconds, refreshed every `intervalMs` (date counters and reminders). */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

/** True for `ms` after `count` rises; the first value never triggers. */
export function useRiseFlag(count: number, ms: number): boolean {
  const previous = useRef(count)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [active, setActive] = useState(false)
  useEffect(() => {
    const rose = count > previous.current
    previous.current = count
    if (!rose) {
      return
    }
    setActive(true)
    if (timer.current) {
      clearTimeout(timer.current)
    }
    // Why the timer lives in a ref: a later count change must not cancel the pending reset.
    timer.current = setTimeout(() => {
      timer.current = null
      setActive(false)
    }, ms)
  }, [count, ms])
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    },
    []
  )
  return active
}
