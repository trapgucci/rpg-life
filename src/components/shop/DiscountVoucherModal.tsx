import { useState } from 'react'
import { X } from 'lucide-react'

interface DiscountVoucherModalProps {
  value: number
  onSave: (percent: number) => void
  onClose: () => void
}

export default function DiscountVoucherModal({ value, onSave, onClose }: DiscountVoucherModalProps) {
  const [percent, setPercent] = useState(Math.min(85, Math.max(1, value || 10)))

  const handleSave = () => {
    const p = Math.min(85, Math.max(1, percent))
    onSave(p)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Размер скидки</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-[var(--fg-muted)] mb-4">
          Скидка применяется только к монетам, до 85%.
        </p>
        <div className="flex items-center gap-2 mb-6">
          <input
            type="number"
            min={1}
            max={85}
            value={percent || ''}
            onChange={(e) => setPercent(Math.min(85, Math.max(1, Number(e.target.value) || 1)))}
            className="input flex-1 h-10 text-center text-lg"
          />
          <span className="text-[var(--fg-muted)]">%</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button type="button" onClick={handleSave} className="btn-primary flex-1">Сохранить</button>
        </div>
      </div>
    </div>
  )
}
