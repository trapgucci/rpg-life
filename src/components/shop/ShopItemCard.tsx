import { memo, useMemo } from 'react'
import { cn } from '../../lib/cn'
import { Coins, Gem, Gift, Percent, ShoppingCart, TrendingUp, Gamepad2, Clapperboard, Check, Hammer, Trophy } from 'lucide-react'
import { useRpgStore } from '../../store/useRpgStore'
import type { ShopItem } from '../../types/domain'
import { CURRENCY_IDS } from '../../types/domain'
import { getItemTypeBadge, getItemTypeColor } from './shopUtils'
import { ItemIconBadge } from '../ItemIconBadge'

interface ShopItemCardProps {
  item: ShopItem
  selected?: boolean
  onSelect: () => void
  onAddToCart?: (itemId: string) => void
}

export default memo(function ShopItemCard({ item, selected, onSelect, onAddToCart }: ShopItemCardProps) {
  const activeShopDiscountPercent = useRpgStore((s) => s.activeShopDiscountPercent)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const craftRecipes = useRpgStore((s) => s.craftRecipes)
  const achievements = useRpgStore((s) => s.achievements)

  // Check if this item has an active (non-crafted) recipe
  const hasCraftRecipe = useMemo(
    () => craftRecipes.some((r) => r.resultItemId === item.id && !r.crafted),
    [craftRecipes, item.id],
  )

  // Check if this item is a reward from any achievement
  const isAchievementReward = useMemo(
    () => achievements.some((a) =>
      (a.rewardItems?.some((ri) => ri.itemId === item.id)) ||
      (a.rewardItemId === item.id)
    ),
    [achievements, item.id],
  )
  const craftColor = useMemo(() => hasCraftRecipe ? getItemTypeColor(item) : '#9ca3af', [hasCraftRecipe, item])

  const profile = profiles.find((p) => p.id === activeProfileId)
  const coins = profile?.currencies[CURRENCY_IDS.COINS] ?? 0
  const gems = profile?.currencies[CURRENCY_IDS.GEMS] ?? 0
  const group = item.groupId ? allItemGroups.find((g) => g.id === item.groupId) : null
  const typeBadge = getItemTypeBadge(item)
  const typeColor = typeBadge
    ? ({ lootbox: '#8b5cf6', multiplier: '#f59e0b', discount: '#ef4444', videogame: '#06b6d4', serial: '#ec4899' })[typeBadge.type]
    : '#9ca3af'
  const iconBgColor = group?.color ?? typeColor

  const coinCost = item.cost?.[CURRENCY_IDS.COINS] ?? 0
  const gemCost = item.cost?.[CURRENCY_IDS.GEMS] ?? 0
  const effectiveCoinCost =
    activeShopDiscountPercent != null && coinCost > 0
      ? Math.round(coinCost * (1 - activeShopDiscountPercent / 100))
      : coinCost
  const effectiveGemCost = gemCost // скидка не применяется к кристаллам
  const canAfford = coins >= effectiveCoinCost && gems >= effectiveGemCost
  const availableForPurchase = item.availableForPurchase !== false
  const canGetForFree = item.canGetForFree === true
  const isMediaItem = item.isVideoGame || item.isTvSerial
  const basePurchased = item.basePurchased === true
  const showBuyButton = availableForPurchase && item.stock !== 0 && !(isMediaItem && basePurchased)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!showBuyButton) return
    onAddToCart?.(item.id)
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
        selected && 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10'
      )}
    >

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

          <ItemIconBadge
            item={item}
            size="lg"
            groupColor={group?.color}
            className={cn(
              'group-hover:scale-110',
              selected && 'scale-110'
            )}
          />

          {/* Type indicator badge */}
          {typeBadge && (
            <div
              className={cn(
                'absolute -top-1 -right-1 z-20 flex h-6 w-6 items-center justify-center rounded-lg',
                'shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]',
                'ring-2 ring-[var(--surface-card)] transition-transform group-hover:scale-110',
                typeBadge.type === 'lootbox' && 'bg-gradient-to-br from-violet-400 to-violet-600',
                typeBadge.type === 'multiplier' && 'bg-gradient-to-br from-amber-400 to-orange-500',
                typeBadge.type === 'discount' && 'bg-gradient-to-br from-red-400 to-rose-600',
                typeBadge.type === 'videogame' && 'bg-gradient-to-br from-cyan-400 to-cyan-600',
                typeBadge.type === 'serial' && 'bg-gradient-to-br from-pink-400 to-rose-600'
              )}
            >
              {typeBadge.type === 'lootbox' && <Gift className="h-3.5 w-3.5 text-white drop-shadow" />}
              {typeBadge.type === 'multiplier' && <TrendingUp className="h-3.5 w-3.5 text-white drop-shadow" />}
              {typeBadge.type === 'discount' && <Percent className="h-3.5 w-3.5 text-white drop-shadow" />}
              {typeBadge.type === 'videogame' && <Gamepad2 className="h-3.5 w-3.5 text-white drop-shadow" />}
              {typeBadge.type === 'serial' && <Clapperboard className="h-3.5 w-3.5 text-white drop-shadow" />}
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
            {/* Cost badges (hide for purchased serials/videogames) */}
            {availableForPurchase && !canGetForFree && coinCost > 0 && !(item.isTvSerial && basePurchased) && !(item.isVideoGame && basePurchased) && (
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

            {availableForPurchase && !canGetForFree && gemCost > 0 && !(item.isTvSerial && basePurchased) && !(item.isVideoGame && basePurchased) && (
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

            {/* Not for sale — show specific source */}
            {!availableForPurchase && hasCraftRecipe && (
              <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold bg-gradient-to-b from-orange-400/20 to-orange-400/10 text-orange-600 dark:text-orange-400 ring-1 ring-inset ring-orange-400/25">
                <Hammer className="h-3 w-3" />
                Только крафт
              </span>
            )}
            {!availableForPurchase && isAchievementReward && !hasCraftRecipe && (
              <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold bg-gradient-to-b from-yellow-400/20 to-yellow-400/10 text-yellow-600 dark:text-yellow-400 ring-1 ring-inset ring-yellow-400/25">
                <Trophy className="h-3 w-3" />
                Награда
              </span>
            )}
            {!availableForPurchase && !hasCraftRecipe && !isAchievementReward && (
              <span className="inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-semibold bg-gradient-to-b from-gray-400/20 to-gray-400/10 text-[var(--fg-muted)] ring-1 ring-inset ring-gray-400/25">
                Не для продажи
              </span>
            )}

            {/* Stock badge (hide for serials and video games — stock=1 is obvious) */}
            {item.stock !== undefined && item.stock > 0 && !item.isTvSerial && !item.isVideoGame && (
              <span className="inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-bold bg-gradient-to-b from-[var(--accent)]/20 to-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/25">
                ×{item.stock}
              </span>
            )}

            {/* Craftable badge — glassmorphic neumorphism */}
            {hasCraftRecipe && (
              <span
                className="relative inline-flex items-center justify-center rounded-xl h-6 w-6 overflow-hidden backdrop-blur-md"
                style={{
                  background: `linear-gradient(135deg, ${craftColor}30, ${craftColor}15)`,
                  boxShadow: `
                    inset 1px 1px 2px rgba(255,255,255,0.25),
                    inset -1px -1px 2px rgba(0,0,0,0.08),
                    0 2px 6px ${craftColor}25,
                    0 0 0 1px ${craftColor}30
                  `,
                  color: craftColor,
                }}
              >
                {/* Glass highlight */}
                <span
                  className="absolute top-0 left-0 w-[65%] h-[55%] rounded-br-full pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.35), transparent)' }}
                />
                <Hammer className="relative h-3.5 w-3.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]" />
              </span>
            )}

            {/* Video game: can buy time packages badge */}
            {item.isVideoGame && basePurchased && (
              <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold bg-gradient-to-b from-cyan-500/20 to-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-inset ring-cyan-400/25 shadow-sm shadow-cyan-500/10">
                <Gamepad2 className="h-3 w-3" />
                Можно докупить пакеты
              </span>
            )}

            {/* Serial: can buy episodes badge */}
            {item.isTvSerial && basePurchased && (
              <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold bg-gradient-to-b from-pink-500/20 to-pink-500/10 text-pink-600 dark:text-pink-400 ring-1 ring-inset ring-pink-400/25 shadow-sm shadow-pink-500/10">
                <Clapperboard className="h-3 w-3" />
                Можно купить серию
              </span>
            )}
          </div>
        </div>

        {/* Quick buy button */}
        {showBuyButton && (
          <div className="shrink-0 self-center flex flex-col items-center">
            <button
              onClick={handleAddToCart}
              className={cn(
                'relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300',
                'shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-2px_0_rgba(0,0,0,0.1)]',
                'active:translate-y-0.5 active:shadow-[0_2px_6px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]',
                'bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] text-white hover:from-[var(--accent-light)] hover:to-[var(--accent)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] hover:scale-110',
              )}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60 pointer-events-none" />
              <ShoppingCart className="relative h-5 w-5 drop-shadow-sm z-10" />
            </button>
          </div>
        )}
      </div>
    </button>
  )
})
