import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useRpgStore } from '../../store/useRpgStore'
import { getItemIcon } from './shopUtils'
import { HabitIcon } from '../HabitIcon'

interface PurchaseHistoryModalProps {
  onClose: () => void
}

export default function PurchaseHistoryModal({ onClose }: PurchaseHistoryModalProps) {
  const purchaseHistory = useRpgStore((s) => s.purchaseHistory)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const shopItems = useRpgStore((s) => s.shopItems)

  const entries = useMemo(
    () =>
      activeProfileId
        ? purchaseHistory
            .filter((e) => e.profileId === activeProfileId)
            .slice()
            .sort((a, b) => b.timestamp - a.timestamp)
        : [],
    [purchaseHistory, activeProfileId]
  )

  const getItemDisplay = (itemId: string) => {
    const it = shopItems.find((i) => i.id === itemId)
    if (!it) return { type: 'icon' as const, value: 'Sword' }
    if (it.iconImage) return { type: 'image' as const, value: it.iconImage }
    return { type: 'icon' as const, value: getItemIcon(it) }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-[var(--fg)]">История покупок</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--fg-muted)]">
              Покупок пока нет. Совершённые покупки появятся здесь.
            </div>
          ) : (
            <ul className="space-y-2">
              {entries.map((e, idx) => {
                const display = getItemDisplay(e.itemId)
                return (
                  <li
                    key={`${e.timestamp}-${e.itemId}-${idx}`}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-elevated)] overflow-hidden text-[var(--fg-muted)]">
                      {display.type === 'image' ? (
                        <img src={display.value} alt="" className="h-6 w-6 rounded object-cover" />
                      ) : (
                        <HabitIcon iconName={display.value} size={18} />
                      )}
                    </span>
                    <span className="flex-1 min-w-0 text-sm font-medium text-[var(--fg)] truncate">
                      {e.itemName}
                    </span>
                    <span className="text-xs text-[var(--fg-muted)] shrink-0">
                      {new Date(e.timestamp).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
