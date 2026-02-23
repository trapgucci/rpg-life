import { memo, useMemo } from 'react'
import { cn } from '../lib/cn'
import { Gift, TrendingUp, Percent, Gamepad2, Clapperboard } from 'lucide-react'
import { HabitIcon } from './HabitIcon'
import type { ShopItem, ItemGroup } from '../types/domain'
import { getItemIcon, getItemTypeBadge, RARITY_COLORS, type ItemTypeBadge } from './shop/shopUtils'

/* ─── Type badge style map ──────────────────────────────────────────────────── */

const TYPE_BADGE_CARD_STYLES: Record<ItemTypeBadge['type'], { cls: string; Icon: typeof Gift }> = {
  lootbox: { cls: 'bg-gradient-to-br from-violet-400 to-violet-600', Icon: Gift },
  multiplier: { cls: 'bg-gradient-to-br from-amber-400 to-orange-500', Icon: TrendingUp },
  discount: { cls: 'bg-gradient-to-br from-red-400 to-rose-600', Icon: Percent },
  videogame: { cls: 'bg-gradient-to-br from-cyan-400 to-cyan-600', Icon: Gamepad2 },
  serial: { cls: 'bg-gradient-to-br from-pink-400 to-rose-600', Icon: Clapperboard },
}

/* ─── Props ─────────────────────────────────────────────────────────────────── */

interface InventoryItemCardProps {
  item: ShopItem
  quantity: number
  /** Pre-resolved group from parent — avoids per-card store subscription */
  group: ItemGroup | null
  onClick: () => void
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default memo(function InventoryItemCard({
  item, quantity, group, onClick,
}: InventoryItemCardProps) {
  const iconBgColor = group?.color ?? RARITY_COLORS[item.rarity]
  const typeBadge = getItemTypeBadge(item)

  const iconContainerStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${iconBgColor}40, ${iconBgColor}25)`,
      '--tw-ring-color': `${iconBgColor}40`,
    } as React.CSSProperties),
    [iconBgColor],
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center rounded-2xl p-3 text-center transition-all duration-200',
        'bg-[var(--surface-card)] backdrop-blur-lg overflow-hidden min-w-0',
        'border border-[var(--border)]',
        'hover:border-[var(--border-accent)] hover:shadow-lg hover:scale-[1.02]',
      )}
    >
      {/* Quantity badge */}
      {quantity > 1 && (
        <span className="absolute top-1.5 right-1.5 z-10 rounded-lg bg-[var(--surface-overlay)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--fg)] shadow-sm ring-1 ring-inset ring-[var(--border)] tabular-nums backdrop-blur-sm">
          x{quantity}
        </span>
      )}

      {/* Type badge */}
      {typeBadge && <TypeBadgeMini badge={typeBadge} />}

      {/* Icon */}
      <div className="relative mb-2 mt-1">
        <div
          className={cn(
            'relative flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden transition-all duration-300',
            'shadow-[inset_0_2px_8px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08)]',
            'ring-2 ring-inset group-hover:scale-110',
          )}
          style={iconContainerStyle}
        >
          {!item.iconImage && (
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-60" />
          )}
          {item.iconImage ? (
            <img
              src={item.iconImage}
              alt=""
              className="relative h-full w-full object-cover z-10"
              style={{ imageRendering: 'auto' }}
            />
          ) : (
            <span className="relative z-10 drop-shadow-sm">
              <HabitIcon iconName={getItemIcon(item)} size={24} />
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 className="w-full text-xs font-semibold text-[var(--fg)] line-clamp-2 leading-tight min-h-[2rem] break-words">
        {item.name}
      </h3>
    </button>
  )
})

/* ─── Sub-components ────────────────────────────────────────────────────────── */

const TypeBadgeMini = memo(function TypeBadgeMini({ badge }: { badge: ItemTypeBadge }) {
  const style = TYPE_BADGE_CARD_STYLES[badge.type]
  const { Icon } = style
  return (
    <div
      className={cn(
        'absolute top-1.5 left-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-lg',
        'shadow-sm ring-1 ring-[var(--surface-card)]',
        style.cls,
      )}
    >
      <Icon className="h-3 w-3 text-white" />
    </div>
  )
})
