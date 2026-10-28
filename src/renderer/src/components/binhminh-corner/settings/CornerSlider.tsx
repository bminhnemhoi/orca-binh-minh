import { useEffect, useState } from 'react'
import { Slider } from '@/components/ui/slider'

/** A 0–100 slider that commits once on release, not on every drag step. */
export function CornerSlider({
  value,
  min = 0,
  max = 100,
  step = 5,
  ariaLabel,
  disabled,
  onCommit
}: {
  value: number
  min?: number
  max?: number
  step?: number
  ariaLabel: string
  disabled?: boolean
  onCommit: (value: number) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <div className="flex w-56 items-center gap-3">
      <Slider
        value={[draft]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([next]) => setDraft(next ?? draft)}
        onValueCommit={([next]) => onCommit(next ?? draft)}
        className="flex-1"
        aria-label={ariaLabel}
      />
      <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {draft}%
      </span>
    </div>
  )
}
