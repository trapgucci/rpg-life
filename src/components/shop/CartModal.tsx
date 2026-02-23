import { useMemo } from 'react'
import { X, Trash2, Coins, Gem, ShoppingCart } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useRpgStore } from '../../store/useRpgStore'
import { CURRENCY_IDS } from '../../types/domain'
import { getItemIcon } from './shopUtils'
import { HabitIcon } from '../HabitIcon'

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
}

export default function CartModal({ cart, onRemove, onClear, onCheckout, onClose }: CartModalProps) {
  const shopItems = useRpgStore((s) => s.shopItems)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const activeShopDiscountPercent = useRpgStore((s) => s.activeShopDiscountPercent)

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
      const effectiveCoinCost =
        activeShopDiscountPercent != null && coinCost > 0
          ? Math.ceil(coinCost * (1 - activeShopDiscountPercent / 100))
          : coinCost
      totalCoins += effectiveCoinCost * e.quantity
      totalGems += (e.item.cost[CURRENCY_IDS.GEMS] ?? 0) * e.quantity
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
                    ? Math.ceil(coinCost * (1 - activeShopDiscountPercent / 100))
                    : coinCost
                const display = e.item.iconImage
                  ? { type: 'image' as const, value: e.item.iconImage }
                  : { type: 'icon' as const, value: getItemIcon(e.item) }

                return (
                  <li
                    key={e.itemId}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-elevated)] overflow-hidden text-[var(--fg-muted)]">
                      {display.type === 'image' ? (
                        <img src={display.value} alt="" className="h-6 w-6 rounded object-cover" />
                      ) : (
                        <HabitIcon iconName={display.value} size={18} />
                      )}
                    </span>

                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[var(--fg)] truncate block">
                        {e.item.name}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {effectiveCoinCost > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <Coins className="h-3 w-3" />
                            {(effectiveCoinCost * e.quantity).toLocaleString('ru-RU')}
                          </span>
                        )}
                        {gemCost > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                            <Gem className="h-3 w-3" />
                            {(gemCost * e.quantity).toLocaleString('ru-RU')}
                          </span>
                        )}
                        {e.item.canGetForFree && (
                          <span className="text-[10px] font-bold text-emerald-500">Бесплатно</span>
                        )}
                        {e.quantity > 1 && (
                          <span className="text-[10px] text-[var(--fg-muted)]">×{e.quantity}</span>
                        )}
                      </div>
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
              <div className="flex items-center gap-3">
                {totals.totalCoins > 0 && (
                  <span className={cn(
                    'inline-flex items-center gap-1 text-sm font-bold',
                    coins >= totals.totalCoins ? 'text-amber-600 dark:text-amber-400' : 'text-red-500',
                  )}>
                    <Coins className="h-4 w-4" />
                    {totals.totalCoins.toLocaleString('ru-RU')}
                  </span>
                )}
                {totals.totalGems > 0 && (
                  <span className={cn(
                    'inline-flex items-center gap-1 text-sm font-bold',
                    gems >= totals.totalGems ? 'text-purple-600 dark:text-purple-400' : 'text-red-500',
                  )}>
                    <Gem className="h-4 w-4" />
                    {totals.totalGems.toLocaleString('ru-RU')}
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
