import { useMemo } from 'react'
import { X, Gift, TrendingUp, Percent, Gamepad2, Clapperboard } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useRpgStore } from '../../store/useRpgStore'
import { getItemIcon, getItemTypeBadge } from './shopUtils'
import { HabitIcon } from '../HabitIcon'

interface PurchaseHistoryModalProps {
  onClose: () => void
}

const TYPE_COLORS: Record<string, string> = {
  lootbox: '#8b5cf6',
  multiplier: '#f59e0b',
  discount: '#ef4444',
  videogame: '#06b6d4',
  serial: '#ec4899',
}

function formatDateKey(timestamp: number): string {
  const d = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (target.getTime() === today.getTime()) return 'Сегодня'
  if (target.getTime() === yesterday.getTime()) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PurchaseHistoryModal({ onClose }: PurchaseHistoryModalProps) {
  const purchaseHistory = useRpgStore((s) => s.purchaseHistory)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const shopItems = useRpgStore((s) => s.shopItems)
  const allItemGroups = useRpgStore((s) => s.itemGroups)

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

  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>()
    for (const e of entries) {
      const key = formatDateKey(e.timestamp)
      const arr = map.get(key)
      if (arr) arr.push(e)
      else map.set(key, [e])
    }
    return [...map.entries()]
  }, [entries])

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
            <div className="space-y-5">
              {grouped.map(([dateLabel, items]) => (
                <div key={dateLabel}>
                  <p className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-2 px-1">
                    {dateLabel}
                  </p>
                  <ul className="space-y-1.5">
                    {items.map((e, idx) => {
                      const it = shopItems.find((i) => i.id === e.itemId)
                      const typeBadge = it ? getItemTypeBadge(it) : null
                      const group = it?.groupId ? allItemGroups.find((g) => g.id === it.groupId) : null
                      const bgColor = group?.color ?? (typeBadge ? TYPE_COLORS[typeBadge.type] : '#9ca3af')

                      return (
                        <li
                          key={`${e.timestamp}-${e.itemId}-${idx}`}
                          className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
                        >
                          <div className="relative shrink-0">
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden ring-1 ring-inset"
                              style={{
                                background: `linear-gradient(135deg, ${bgColor}35, ${bgColor}15)`,
                                '--tw-ring-color': `${bgColor}30`,
                              } as React.CSSProperties}
                            >
                              {it?.iconImage ? (
                                <img src={it.iconImage} alt="" className="h-full w-full object-cover" style={{ imageRendering: 'auto' }} />
                              ) : (
                                <HabitIcon iconName={it ? getItemIcon(it) : 'Sword'} size={18} />
                              )}
                            </div>
                            {typeBadge && (
                              <div
                                className={cn(
                                  'absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-md',
                                  'shadow-sm ring-1.5 ring-[var(--surface)]',
                                  typeBadge.type === 'lootbox' && 'bg-gradient-to-br from-violet-400 to-violet-600',
                                  typeBadge.type === 'multiplier' && 'bg-gradient-to-br from-amber-400 to-orange-500',
                                  typeBadge.type === 'discount' && 'bg-gradient-to-br from-red-400 to-rose-600',
                                  typeBadge.type === 'videogame' && 'bg-gradient-to-br from-cyan-400 to-cyan-600',
                                  typeBadge.type === 'serial' && 'bg-gradient-to-br from-pink-400 to-rose-600',
                                )}
                              >
                                {typeBadge.type === 'lootbox' && <Gift className="h-2.5 w-2.5 text-white" />}
                                {typeBadge.type === 'multiplier' && <TrendingUp className="h-2.5 w-2.5 text-white" />}
                                {typeBadge.type === 'discount' && <Percent className="h-2.5 w-2.5 text-white" />}
                                {typeBadge.type === 'videogame' && <Gamepad2 className="h-2.5 w-2.5 text-white" />}
                                {typeBadge.type === 'serial' && <Clapperboard className="h-2.5 w-2.5 text-white" />}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-[var(--fg)] truncate block">
                              {e.itemName}
                            </span>
                            {e.seasonNumber != null && e.episodeNumber != null && (
                              <span className="text-[10px] text-pink-500 font-medium">
                                Сезон {e.seasonNumber}, Серия {e.episodeNumber}
                              </span>
                            )}
                            {e.packageName && (
                              <span className="text-[10px] text-cyan-500 font-medium">
                                Пакет: {e.packageName}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[var(--fg-muted)] shrink-0">
                            {new Date(e.timestamp).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
