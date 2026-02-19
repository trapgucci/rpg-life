import { cn } from '../../lib/cn'
import { Coins, Gem, Gift, Percent, ShoppingCart, TrendingUp } from 'lucide-react'
import { useRpgStore } from '../../store/useRpgStore'
import type { ShopItem } from '../../types/domain'
import { CURRENCY_IDS } from '../../types/domain'
import { getItemIcon, getItemTypeBadge, RARITY_LABELS, RARITY_BADGE_CLASSES, RARITY_COLORS } from './shopUtils'
import { HabitIcon } from '../HabitIcon'

interface ShopItemCardProps {
  item: ShopItem
  selected?: boolean
  onSelect: () => void
}

export default function ShopItemCard({ item, selected, onSelect }: ShopItemCardProps) {
  const activeShopDiscountPercent = useRpgStore((s) => s.activeShopDiscountPercent)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const purchaseItem = useRpgStore((s) => s.purchaseItem)

  const profile = profiles.find((p) => p.id === activeProfileId)
  const coins = profile?.currencies[CURRENCY_IDS.COINS] ?? 0
  const gems = profile?.currencies[CURRENCY_IDS.GEMS] ?? 0
  const group = item.groupId ? allItemGroups.find((g) => g.id === item.groupId) : null
  const iconBgColor = group?.color ?? RARITY_COLORS[item.rarity]

  const coinCost = item.cost[CURRENCY_IDS.COINS] ?? 0
  const gemCost = item.cost[CURRENCY_IDS.GEMS] ?? 0
  const effectiveCoinCost =
    activeShopDiscountPercent != null && coinCost > 0
      ? Math.ceil(coinCost * (1 - activeShopDiscountPercent / 100))
      : coinCost
  const canAfford = coins >= effectiveCoinCost && gems >= gemCost
  const availableForPurchase = item.availableForPurchase !== false
  const canGetForFree = item.canGetForFree === true
  const showBuyButton = availableForPurchase && (item as any).stock !== 0

  const typeBadge = getItemTypeBadge(item)
  const rarityColor = RARITY_COLORS[item.rarity]

  const handleQuickBuy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!showBuyButton) return
    if (!canGetForFree && !canAfford) return
    const result = purchaseItem(item.id)
    if (result && typeof result === 'object' && 'loot' in result) {
      if (result.loot) alert(`Вы получили: ${result.loot.name}!`)
      else alert('Ничего не выпало.')
    }
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative w-full rounded-2xl overflow-hidden text-left transition-all duration-200',
        'bg-[var(--surface-card)] backdrop-blur-lg',
        'border border-[var(--border)]',
        'hover:border-[var(--border-accent)] hover:shadow-lg hover:-translate-y-0.5',
        selected && 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10',
        !availableForPurchase && 'opacity-50 saturate-50'
      )}
    >
      {/* Rarity glow overlay */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 transition-opacity duration-300',
          'bg-gradient-to-br pointer-events-none',
          'group-hover:opacity-[0.04]',
          selected && 'opacity-[0.06]',
          item.rarity === 'legendary' && 'from-amber-500/30 to-orange-500/20',
          item.rarity === 'epic' && 'from-purple-500/30 to-violet-500/20',
          item.rarity === 'rare' && 'from-blue-500/30 to-indigo-500/20',
          item.rarity === 'uncommon' && 'from-green-500/30 to-emerald-500/20'
        )}
      />

      {/* Rarity accent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${rarityColor}60, ${rarityColor}20)` }}
      />

      <div className="relative flex items-start gap-3 p-4">
        {/* Neumorphic icon with rarity accent */}
        <div className="relative shrink-0">
          {selected && (
            <div
              className="absolute inset-0 rounded-2xl blur-xl opacity-40 animate-pulse"
              style={{
                background: `radial-gradient(circle, ${iconBgColor}80, transparent 70%)`,
              }}
            />
          )}

          <div
            className={cn(
              'relative flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden transition-all duration-300',
              'shadow-[inset_0_2px_8px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08)]',
              'ring-2 ring-inset group-hover:scale-110',
              selected && 'scale-110 shadow-[inset_0_2px_12px_rgba(0,0,0,0.15),0_6px_20px_rgba(0,0,0,0.12)]'
            )}
            style={{
              background: `linear-gradient(135deg, ${iconBgColor}40, ${iconBgColor}25)`,
              '--tw-ring-color': `${iconBgColor}40`,
            } as React.CSSProperties}
          >
            {!item.iconImage && <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-60" />}
            {item.iconImage ? (
              <img src={item.iconImage} alt="" className="relative h-full w-full object-cover z-10" style={{ imageRendering: 'auto' }} />
            ) : (
              <span className="relative z-10 drop-shadow-sm"><HabitIcon iconName={getItemIcon(item)} size={24} /></span>
            )}
          </div>

          {/* Type indicator badge */}
          {typeBadge && (
            <div
              className={cn(
                'absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg',
                'shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]',
                'ring-2 ring-[var(--surface-card)] transition-transform group-hover:scale-110',
                typeBadge.type === 'lootbox' && 'bg-gradient-to-br from-violet-400 to-violet-600',
                typeBadge.type === 'multiplier' && 'bg-gradient-to-br from-amber-400 to-orange-500',
                typeBadge.type === 'discount' && 'bg-gradient-to-br from-red-400 to-rose-600'
              )}
            >
              {typeBadge.type === 'lootbox' && <Gift className="h-3.5 w-3.5 text-white drop-shadow" />}
              {typeBadge.type === 'multiplier' && <TrendingUp className="h-3.5 w-3.5 text-white drop-shadow" />}
              {typeBadge.type === 'discount' && <Percent className="h-3.5 w-3.5 text-white drop-shadow" />}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="font-bold text-base leading-tight line-clamp-1 mb-2.5 text-[var(--fg)]">
            {item.name}
          </h3>

          {/* Badges grid */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Rarity badge */}
            <span
              className={cn(
                'inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-bold tracking-wide',
                RARITY_BADGE_CLASSES[item.rarity],
              )}
            >
              {RARITY_LABELS[item.rarity]}
            </span>

            {/* Cost badges */}
            {availableForPurchase && !canGetForFree && coinCost > 0 && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold',
                  'ring-1 ring-inset transition-all',
                  canAfford
                    ? 'bg-gradient-to-b from-amber-500/20 to-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-400/25 shadow-sm shadow-amber-500/10'
                    : 'bg-gradient-to-b from-red-400/20 to-red-500/10 text-red-600 dark:text-red-400 ring-red-400/25 shadow-sm shadow-red-500/10'
                )}
              >
                <Coins className="h-3.5 w-3.5" />
                {activeShopDiscountPercent != null && effectiveCoinCost < coinCost ? (
                  <>
                    <span className="line-through opacity-60 text-[10px]">{coinCost}</span>
                    <span className="font-black">{effectiveCoinCost}</span>
                  </>
                ) : (
                  <span className="font-black">{coinCost.toLocaleString('ru-RU')}</span>
                )}
              </span>
            )}

            {availableForPurchase && !canGetForFree && gemCost > 0 && (
              <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold bg-gradient-to-b from-purple-500/20 to-purple-500/10 text-purple-600 dark:text-purple-400 ring-1 ring-inset ring-purple-400/25 shadow-sm shadow-purple-500/10">
                <Gem className="h-3.5 w-3.5" />
                <span className="font-black">{gemCost.toLocaleString('ru-RU')}</span>
              </span>
            )}

            {/* Free badge */}
            {availableForPurchase && canGetForFree && (
              <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold bg-gradient-to-b from-emerald-500/20 to-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10">
                <Gift className="h-3.5 w-3.5" />
                Бесплатно
              </span>
            )}

            {/* Not for sale */}
            {!availableForPurchase && (
              <span className="inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-semibold bg-gradient-to-b from-gray-400/20 to-gray-400/10 text-[var(--fg-muted)] ring-1 ring-inset ring-gray-400/25">
                Не для продажи
              </span>
            )}

            {/* Stock badge */}
            {(item as any).stock !== undefined && (item as any).stock > 0 && (
              <span className="inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-bold bg-gradient-to-b from-[var(--accent)]/20 to-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/25">
                ×{(item as any).stock}
              </span>
            )}
          </div>
        </div>

        {/* Quick buy button */}
        {showBuyButton && (
          <div className="shrink-0 self-center">
            <button
              onClick={handleQuickBuy}
              className={cn(
                'relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300',
                'shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-2px_0_rgba(0,0,0,0.1)]',
                'active:translate-y-0.5 active:shadow-[0_2px_6px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]',
                canGetForFree
                  ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700 hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] hover:scale-110'
                  : canAfford
                    ? 'bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] text-white hover:from-[var(--accent-light)] hover:to-[var(--accent)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] hover:scale-110'
                    : 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-500 cursor-not-allowed opacity-60'
              )}
              disabled={!canGetForFree && !canAfford}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60 pointer-events-none" />
              <ShoppingCart className="relative h-5 w-5 drop-shadow-sm z-10" />
            </button>
          </div>
        )}
      </div>
    </button>
  )
}
