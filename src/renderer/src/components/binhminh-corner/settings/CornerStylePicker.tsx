import type { CornerStyle } from '../../../../../shared/binhminh-corner-settings'
import { updateCornerSettings } from '../use-corner-settings'

const STYLES: { id: CornerStyle; label: string; hint: string }[] = [
  { id: 'glass', label: 'Kính mờ', hint: 'Ảnh của bạn làm nền mờ' },
  { id: 'neon', label: 'Neon đêm', hint: 'Tối, điểm sáng xanh' },
  { id: 'paper', label: 'Giấy', hint: 'Tối giản, chỉ cảnh báo có màu' },
  { id: 'pastel', label: 'Pastel', hint: 'Dịu, bo tròn, hợp thú cưng' },
  { id: 'orca', label: 'Orca', hint: 'Hoà vào giao diện Orca' }
]

/** Live miniatures: each preview is a real `.bm-corner` scope, so it shows the actual tokens. */
export function CornerStylePicker({ value }: { value: CornerStyle }): React.JSX.Element {
  return (
    <div className="grid grid-cols-5 gap-2 py-2" role="radiogroup" aria-label="Phong cách">
      {STYLES.map((style) => (
        <button
          key={style.id}
          type="button"
          role="radio"
          aria-checked={value === style.id}
          title={style.hint}
          onClick={() => void updateCornerSettings({ style: style.id })}
          className={`cursor-pointer rounded-lg border p-1 text-left transition-colors ${value === style.id ? 'border-primary' : 'border-border hover:border-muted-foreground'}`}
        >
          <div className="bm-corner rounded-md p-1.5" data-w={style.id}>
            <div className="bm-card space-y-1 p-1.5">
              <div className="bm-track" style={{ height: 4 }}>
                <div className="bm-fill" style={{ transform: 'scaleX(0.62)' }} />
              </div>
              <div className="bm-track" style={{ height: 2 }}>
                <div className="bm-fill" data-level="warn" style={{ transform: 'scaleX(0.3)' }} />
              </div>
              <div className="h-1.5 w-2/3 rounded-sm" style={{ background: 'var(--w-text-3)' }} />
            </div>
          </div>
          <div className="pt-1 text-[11px] font-medium">{style.label}</div>
        </button>
      ))}
    </div>
  )
}
