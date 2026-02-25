import { useMemo } from 'react'
import { X, Trash2, Coins, Gem, ShoppingCart, Plus, Minus, Gift, TrendingUp, Percent, Gamepad2, Clapperboard } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useRpgStore } from '../../store/useRpgStore'
import { CURRENCY_IDS } from '../../types/domain'
import { getItemIcon, getItemTypeBadge } from './shopUtils'
import { HabitIcon } from '../HabitIcon'

const TYPE_COLORS: Record<string, string> = {
  lootbox: '#8b5cf6',
  multiplier: '#f59e0b',
  discount: '#ef4444',
  videogame: '#06b6d4',
  serial: '#ec4899',
}

export interface CartEntry {
  itemId: string
  quantity: number
}

interface CartModalProps {
  cart: CartEntry[]
  onRemove: (itemId: string) => void
  onClear: () => void
  onCheckout: () => void
  onClose: () => void
  onUpdateQuantity: (itemId: string, quantity: number) => void
}

export default function CartModal({ cart, onRemove, onClear, onCheckout, onClose, onUpdateQuantity }: CartModalProps) {
  const shopItems = useRpgStore((s) => s.shopItems)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const activeShopDiscountPercent = useRpgStore((s) => s.activeShopDiscountPercent)
  const allItemGroups = useRpgStore((s) => s.itemGroups)

  const profile = profiles.find((p) => p.id === activeProfileId)
  const coins = profile?.currencies[CURRENCY_IDS.COINS] ?? 0
  const gems = profile?.currencies[CURRENCY_IDS.GEMS] ?? 0

  const enriched = useMemo(() =>
    cart.map((c) => {
      const item = shopItems.find((i) => i.id === c.itemId)
      return item ? { ...c, item } : null
    }).filter(Boolean) as { itemId: string; quantity: number; item: typeof shopItems[0] }[],
    [cart, shopItems],
  )

  const totals = useMemo(() => {
    let totalCoins = 0
    let totalGems = 0
    for (const e of enriched) {
      const coinCost = e.item.cost[CURRENCY_IDS.COINS] ?? 0
      const gemCost = e.item.cost[CURRENCY_IDS.GEMS] ?? 0
      const effectiveCoinCost =
        activeShopDiscountPercent != null && coinCost > 0
          ? Math.round(coinCost * (1 - activeShopDiscountPercent / 100))
          : coinCost
      const effectiveGemCost =
        activeShopDiscountPercent != null && gemCost > 0
          ? Math.round(gemCost * (1 - activeShopDiscountPercent / 100))
          : gemCost
      totalCoins += effectiveCoinCost * e.quantity
      totalGems += effectiveGemCost * e.quantity
    }
    return { totalCoins, totalGems }
  }, [enriched, activeShopDiscountPercent])

  const canAffordAll = coins >= totals.totalCoins && gems >= totals.totalGems

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-[var(--fg)]">Корзина</h3>
          <div className="flex items-center gap-2">
            {enriched.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-[var(--fg-muted)] hover:text-red-500 transition-colors"
              >
                Очистить
              </button>
            )}
            <button type="button" onClick={onClose} className="icon-btn">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {enriched.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
              <ShoppingCart className="h-8 w-8 text-[var(--fg-muted)] mx-auto mb-2 opacity-40" />
              <p className="text-sm text-[var(--fg-muted)]">Корзина пуста</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {enriched.map((e) => {
                const coinCost = e.item.cost[CURRENCY_IDS.COINS] ?? 0
                const gemCost = e.item.cost[CURRENCY_IDS.GEMS] ?? 0
                const effectiveCoinCost =
                  activeShopDiscountPercent != null && coinCost > 0
                    ? Math.round(coinCost * (1 - activeShopDiscountPercent / 100))
                    : coinCost
                const effectiveGemCost =
                  activeShopDiscountPercent != null && gemCost > 0
                    ? Math.round(gemCost * (1 - activeShopDiscountPercent / 100))
                    : gemCost
                const typeBadge = getItemTypeBadge(e.item)
                const group = e.item.groupId ? allItemGroups.find((g) => g.id === e.item.groupId) : null
                const bgColor = group?.color ?? (typeBadge ? TYPE_COLORS[typeBadge.type] : '#9ca3af')

                const totalItemCoins = effectiveCoinCost * e.quantity
                const totalItemGems = effectiveGemCost * e.quantity
                const hasCoins = effectiveCoinCost > 0
                const hasGems = effectiveGemCost > 0

                // Max quantity = stock (if limited) or unlimited
                const maxQty = e.item.stock !== undefined ? e.item.stock : Infinity

                return (
                  <li
                    key={e.itemId}
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
                        {e.item.iconImage ? (
                          <img src={e.item.iconImage} alt="" className="h-full w-full object-cover" style={{ imageRendering: 'auto' }} />
                        ) : (
                          <HabitIcon iconName={getItemIcon(e.item)} size={18} />
                        )}
                      </div>
                      {typeBadge && (
                        <div
                          className={cn(
                            'absolute -top-1 -right-1 z-20 flex h-4.5 w-4.5 items-center justify-center rounded-md',
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
                        {e.item.name}
                      </span>

                      {/* Currency badges */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {(hasCoins || hasGems) && !e.item.canGetForFree && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-xl shadow-sm',
                              hasCoins && hasGems
                                ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-purple-500/15 ring-1 ring-inset ring-amber-400/15 shadow-amber-500/5'
                                : hasGems
                                ? 'bg-gradient-to-b from-purple-500/15 to-purple-500/5 ring-1 ring-inset ring-purple-400/20 shadow-purple-500/10'
                                : 'bg-gradient-to-b from-amber-500/15 to-amber-500/5 ring-1 ring-inset ring-amber-400/20 shadow-amber-500/10',
                              'px-2 py-0.5 text-xs font-semibold'
                            )}
                          >
                            {hasCoins && (
                              <>
                                <Coins className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                <span className="text-amber-600 dark:text-amber-400 tabular-nums">
                                  {totalItemCoins.toLocaleString('ru-RU')}
                                </span>
                              </>
                            )}
                            {hasCoins && hasGems && (
                              <span className="w-px h-3 bg-[var(--border)] rounded-full self-center" />
                            )}
                            {hasGems && (
                              <>
                                <Gem className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" strokeWidth={2.5} />
                                <span className="text-purple-600 dark:text-purple-400 tabular-nums">
                                  {totalItemGems.toLocaleString('ru-RU')}
                                </span>
                              </>
                            )}
                          </span>
                        )}
                        {e.item.canGetForFree && (
                          <span className="text-[10px] font-bold text-emerald-500">Бесплатно</span>
                        )}
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(e.itemId, e.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-hover)] transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-[var(--fg)] tabular-nums">
                        {e.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(e.itemId, e.quantity + 1)}
                        disabled={e.quantity >= maxQty}
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--border)] transition-colors',
                          e.quantity >= maxQty
                            ? 'text-[var(--fg-muted)] opacity-30 cursor-not-allowed'
                            : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-hover)]',
                        )}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemove(e.itemId)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--fg-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer with totals and checkout */}
        {enriched.length > 0 && (
          <div className="flex-shrink-0 border-t border-[var(--border)] pt-4 mt-4">
            {/* Totals */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[var(--fg)]">Итого:</span>
              <div className="flex items-center gap-2">
                {(totals.totalCoins > 0 || totals.totalGems > 0) && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-sm font-bold shadow-sm',
                      totals.totalCoins > 0 && totals.totalGems > 0
                        ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-purple-500/15 ring-1 ring-inset ring-amber-400/15'
                        : totals.totalGems > 0
                        ? 'bg-gradient-to-b from-purple-500/15 to-purple-500/5 ring-1 ring-inset ring-purple-400/20'
                        : 'bg-gradient-to-b from-amber-500/15 to-amber-500/5 ring-1 ring-inset ring-amber-400/20',
                    )}
                  >
                    {totals.totalCoins > 0 && (
                      <>
                        <Coins className={cn('h-4 w-4', coins >= totals.totalCoins ? 'text-amber-600 dark:text-amber-400' : 'text-red-500')} />
                        <span className={cn('tabular-nums', coins >= totals.totalCoins ? 'text-amber-600 dark:text-amber-400' : 'text-red-500')}>
                          {totals.totalCoins.toLocaleString('ru-RU')}
                        </span>
                      </>
                    )}
                    {totals.totalCoins > 0 && totals.totalGems > 0 && (
                      <span className="w-px h-4 bg-[var(--border)] rounded-full self-center" />
                    )}
                    {totals.totalGems > 0 && (
                      <>
                        <Gem className={cn('h-4 w-4', gems >= totals.totalGems ? 'text-purple-600 dark:text-purple-400' : 'text-red-500')} strokeWidth={2.5} />
                        <span className={cn('tabular-nums', gems >= totals.totalGems ? 'text-purple-600 dark:text-purple-400' : 'text-red-500')}>
                          {totals.totalGems.toLocaleString('ru-RU')}
                        </span>
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Checkout button */}
            <button
              type="button"
              onClick={onCheckout}
              disabled={!canAffordAll}
              className={cn(
                'w-full rounded-2xl py-3.5 font-semibold transition-all duration-200',
                canAffordAll
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:scale-[1.01] active:scale-[0.98]'
                  : 'bg-[var(--surface)] text-[var(--fg-muted)] cursor-not-allowed opacity-50',
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {canAffordAll ? 'Купить всё' : 'Недостаточно средств'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
