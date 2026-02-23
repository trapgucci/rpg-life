import { memo, useMemo } from 'react'
import { Clock, ShoppingCart, Zap } from 'lucide-react'
import { useRpgStore } from '../store/useRpgStore'
import { HabitIcon } from './HabitIcon'
import { getItemIcon } from './shop/shopUtils'
import type { ShopItem } from '../types/domain'

/* ─── Action labels ─────────────────────────────────────────────────────────── */

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  purchased: {
    label: 'Покупка',
    cls: 'bg-emerald-500/15 text-emerald-500',
  },
  used: {
    label: 'Использовано',
    cls: 'bg-blue-500/15 text-blue-500',
  },
  opened_lootbox: {
    label: 'Открыто',
    cls: 'bg-violet-500/15 text-violet-500',
  },
  activated_discount: {
    label: 'Скидка',
    cls: 'bg-red-500/15 text-red-500',
  },
  activated_multiplier: {
    label: 'Множитель',
    cls: 'bg-amber-500/15 text-amber-500',
  },
}

/* ─── Relative time helper ──────────────────────────────────────────────────── */

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Только что'
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} д назад`
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
}

/* ─── Timeline entry type ───────────────────────────────────────────────────── */

interface TimelineEntry {
  itemId: string
  itemName: string
  timestamp: number
  action: string
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function InventoryHistorySidebar() {
  const usageHistory = useRpgStore((s) => s.usageHistory)
  const purchaseHistory = useRpgStore((s) => s.purchaseHistory)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const shopItems = useRpgStore((s) => s.shopItems)

  const shopItemMap = useMemo(() => {
    const map = new Map<string, ShopItem>()
    for (const item of shopItems) map.set(item.id, item)
    return map
  }, [shopItems])

  const timeline = useMemo(() => {
    if (!activeProfileId) return []

    const usage: TimelineEntry[] = usageHistory
      .filter((e) => e.profileId === activeProfileId)
      .map((e) => ({
        itemId: e.itemId,
        itemName: e.itemName,
        timestamp: e.timestamp,
        action: e.action,
      }))

    const purchases: TimelineEntry[] = purchaseHistory
      .filter((e) => e.profileId === activeProfileId)
      .map((e) => ({
        itemId: e.itemId,
        itemName: e.itemName,
        timestamp: e.timestamp,
        action: 'purchased',
      }))

    return [...usage, ...purchases]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50)
  }, [usageHistory, purchaseHistory, activeProfileId])

  return (
    <div className="glass-card flex h-full w-full flex-col rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3 shrink-0">
        <Clock className="h-4 w-4 text-[var(--fg-muted)]" />
        <h3 className="text-sm font-bold text-[var(--fg)]">История</h3>
        {timeline.length > 0 && (
          <span className="text-[10px] text-[var(--fg-muted)] tabular-nums">
            {timeline.length}
          </span>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2">
        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)] mb-3">
              <Clock className="h-5 w-5 text-[var(--fg-muted)]" />
            </div>
            <p className="text-xs text-[var(--fg-muted)]">Пока нет записей</p>
            <p className="text-[10px] text-[var(--fg-muted)] mt-1">
              Покупки и использование предметов появятся здесь
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {timeline.map((event, idx) => (
              <HistoryEntry
                key={`${event.timestamp}-${event.itemId}-${idx}`}
                event={event}
                shopItemMap={shopItemMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── History entry row ─────────────────────────────────────────────────────── */

const HistoryEntry = memo(function HistoryEntry({
  event,
  shopItemMap,
}: {
  event: TimelineEntry
  shopItemMap: Map<string, ShopItem>
}) {
  const shopItem = shopItemMap.get(event.itemId)
  const actionInfo = ACTION_LABELS[event.action] ?? ACTION_LABELS.used
  const isPurchase = event.action === 'purchased'

  const iconDisplay = useMemo(() => {
    if (!shopItem) return { type: 'icon' as const, value: 'Package' }
    if (shopItem.iconImage) return { type: 'image' as const, value: shopItem.iconImage }
    return { type: 'icon' as const, value: getItemIcon(shopItem) }
  }, [shopItem])

  return (
    <div className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-[var(--surface)] transition-colors">
      {/* Icon */}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-elevated)] overflow-hidden text-[var(--fg-muted)]">
        {iconDisplay.type === 'image' ? (
          <img src={iconDisplay.value} alt="" className="h-5 w-5 rounded object-cover" />
        ) : (
          <HabitIcon iconName={iconDisplay.value} size={14} />
        )}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-[var(--fg)] truncate leading-tight">
          {event.itemName}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-medium ${actionInfo.cls}`}>
            {isPurchase ? (
              <ShoppingCart className="h-2.5 w-2.5" />
            ) : (
              <Zap className="h-2.5 w-2.5" />
            )}
            {actionInfo.label}
          </span>
          <span className="text-[9px] text-[var(--fg-muted)] tabular-nums">
            {formatRelativeTime(event.timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
})
