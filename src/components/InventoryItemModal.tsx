import { memo, useMemo, useState } from 'react'
import { cn } from '../lib/cn'
import {
  X, Trash2, Zap, Clock, Check, Minus, Plus,
  Gift, TrendingUp, Percent, Gamepad2, Clapperboard,
  ShoppingCart, Hammer, Coins, Gem,
} from 'lucide-react'
import Modal from './Modal'
import { useRpgStore } from '../store/useRpgStore'
import type { ShopItem, ItemGroup, SerialSeason } from '../types/domain'
import { CURRENCY_IDS } from '../types/domain'
import {
  getItemTypeBadge,
  RARITY_COLORS,
} from './shop/shopUtils'
import { ItemIconBadge } from './ItemIconBadge'

/* ─── Props ─────────────────────────────────────────────────────────────────── */

interface InventoryItemModalProps {
  isOpen: boolean
  itemId: string | null
  onClose: () => void
  onUse: (itemId: string, quantity?: number) => void
  onDelete: (itemId: string) => void
  onOpenAll?: (itemId: string, quantity: number) => void
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function InventoryItemModal({
  isOpen, itemId, onClose, onUse, onDelete, onOpenAll,
}: InventoryItemModalProps) {
  const inventory = useRpgStore((s) => s.inventory)
  const shopItems = useRpgStore((s) => s.shopItems)
  const allItemGroups = useRpgStore((s) => s.itemGroups)

  const resolved = useMemo(() => {
    if (!itemId) return null
    const entry = inventory.find((e) => e.itemId === itemId)
    if (!entry) return null
    const item = shopItems.find((i) => i.id === itemId)
    if (!item) return null
    const group = item.groupId ? allItemGroups.find((g) => g.id === item.groupId) ?? null : null
    return { entry, item, group }
  }, [itemId, inventory, shopItems, allItemGroups])

  if (!resolved) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" showCloseButton={false}>
      <ModalContent
        item={resolved.item}
        quantity={resolved.entry.quantity}
        acquiredAt={resolved.entry.acquiredAt}
        group={resolved.group}
        onClose={onClose}
        onUse={(useQuantity) => onUse(resolved.item.id, useQuantity)}
        onDelete={() => onDelete(resolved.item.id)}
        onOpenAll={onOpenAll ? () => onOpenAll(resolved.item.id, resolved.entry.quantity) : undefined}
      />
    </Modal>
  )
}

/* ─── Modal content ─────────────────────────────────────────────────────────── */

interface ModalContentProps {
  item: ShopItem
  quantity: number
  acquiredAt: number
  group: ItemGroup | null
  onClose: () => void
  onUse: (useQuantity?: number) => void
  onDelete: () => void
  onOpenAll?: () => void
}

const ModalContent = memo(function ModalContent({
  item, quantity, acquiredAt, group, onClose, onUse, onDelete, onOpenAll,
}: ModalContentProps) {
  const themeColor = group?.color ?? RARITY_COLORS[item.rarity]
  const typeBadge = getItemTypeBadge(item)
  const isMedia = item.isVideoGame || item.isTvSerial
  const isPlainItem = !item.isLootBox && !item.streakMultiplierEnabled && !item.isDiscountVoucher && !item.isVideoGame && !item.isTvSerial
  const [useQuantity, setUseQuantity] = useState(1)

  const purchaseHistory = useRpgStore((s) => s.purchaseHistory)
  const craftRecipes = useRpgStore((s) => s.craftRecipes)

  const acquisitionMethod = useMemo(() => {
    if (!isMedia) return null
    const wasCrafted = craftRecipes.some((r) => r.resultItemId === item.id && r.crafted)
    if (wasCrafted) return 'crafted' as const
    const wasPurchased = purchaseHistory.some((e) => e.itemId === item.id && !e.seasonNumber && !e.packageName)
    if (wasPurchased) return 'purchased' as const
    return 'purchased' as const
  }, [isMedia, item.id, craftRecipes, purchaseHistory])

  const acquiredDate = useMemo(
    () =>
      new Date(acquiredAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [acquiredAt],
  )

  return (
    <div className="relative overflow-hidden">
      {/* ── Background accent glow ──────────────────────────────────────── */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-[0.07] pointer-events-none"
        style={{ background: themeColor }}
      />
      <div
        className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full blur-3xl opacity-[0.05] pointer-events-none"
        style={{ background: themeColor }}
      />

      <div className="relative p-5 md:p-6">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-5">
          {/* Icon — enamel pin */}
          <ItemIconBadge item={item} size="lg" className="h-16 w-16" />

          {/* Title */}
          <div className="flex-1 min-w-0 flex items-center">
            <h2 className="text-xl font-bold text-[var(--fg)] break-words leading-tight">{item.name}</h2>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-elevated)]/60 text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)] backdrop-blur-sm ring-1 ring-inset ring-[var(--border)]/50 transition-all active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Description ───────────────────────────────────────────────── */}
        {item.description && (
          <p className="text-sm text-[var(--fg-muted)] leading-relaxed break-words mb-5">
            {item.description}
          </p>
        )}

        {/* ── Info cards ────────────────────────────────────────────────── */}
        <div
          className="glass rounded-2xl p-4 mb-5"
          style={{
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)`,
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            {/* Quantity or Acquisition method */}
            {isMedia ? (
              <div
                className="rounded-xl px-4 py-3 flex flex-col items-center justify-center"
                style={{
                  background: acquisitionMethod === 'crafted'
                    ? 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.04))'
                    : `linear-gradient(135deg, ${themeColor}12, ${themeColor}06)`,
                  boxShadow: acquisitionMethod === 'crafted'
                    ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(168,85,247,0.15)'
                    : `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px ${themeColor}15`,
                }}
              >
                {acquisitionMethod === 'crafted' ? (
                  <Hammer className="h-4 w-4 text-purple-500 mb-1" />
                ) : (
                  <ShoppingCart className="h-4 w-4 mb-1" style={{ color: themeColor }} />
                )}
                <p className="text-[11px] text-[var(--fg-muted)]">
                  {acquisitionMethod === 'crafted' ? 'Скрафчено' : 'Куплено'}
                </p>
              </div>
            ) : (
              <div
                className="rounded-xl px-4 py-3 text-center"
                style={{
                  background: `linear-gradient(135deg, ${themeColor}12, ${themeColor}06)`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px ${themeColor}15`,
                }}
              >
                <p className="text-2xl font-bold text-[var(--fg)] tabular-nums">{quantity}</p>
                <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">В наличии</p>
              </div>
            )}

            {/* Acquired date */}
            <div
              className="rounded-xl px-4 py-3 text-center"
              style={{
                background: 'linear-gradient(135deg, var(--surface-elevated), transparent)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px var(--border)',
              }}
            >
              <Clock className="h-4 w-4 text-[var(--fg-muted)] mx-auto mb-1" />
              <p className="text-[11px] text-[var(--fg-muted)]">{acquiredDate}</p>
              <p className="text-[10px] text-[var(--fg-muted)] mt-0.5 opacity-60">Получено</p>
            </div>
          </div>
        </div>

        {/* ── Properties ────────────────────────────────────────────────── */}
        {typeBadge && <PropertiesBlock item={item} />}

        {/* ── Loot table (lootboxes) ──────────────────────────────────── */}
        {item.isLootBox && item.lootTable && item.lootTable.length > 0 && (
          <LootTableBlock lootTable={item.lootTable} />
        )}

        {/* ── Game time (video games) ───────────────────────────────────── */}
        {item.isVideoGame && <GameTimeBlock item={item} />}

        {/* ── Episodes (serials) ────────────────────────────────────────── */}
        {item.isTvSerial && item.serialSeasons && item.serialSeasons.length > 0 && (
          <SerialEpisodesBlock itemId={item.id} seasons={item.serialSeasons} />
        )}

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2.5 mt-1">
          {!item.isTvSerial && !item.isVideoGame && (
            item.isLootBox ? (
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => onUse()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.97]"
                  style={{
                    background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
                    boxShadow: `0 4px 16px ${themeColor}35, inset 0 1px 0 rgba(255,255,255,0.2)`,
                  }}
                >
                  <Gift className="h-5 w-5" />
                  Открыть
                </button>
                {quantity > 1 && onOpenAll && (
                  <button
                    type="button"
                    onClick={onOpenAll}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold transition-all hover:scale-[1.01] active:scale-[0.97]"
                    style={{
                      background: `linear-gradient(135deg, ${themeColor}20, ${themeColor}10)`,
                      color: themeColor,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px ${themeColor}25`,
                    }}
                  >
                    <Gift className="h-5 w-5" />
                    Все ({quantity})
                  </button>
                )}
              </div>
            ) : isPlainItem && quantity > 1 ? (
              /* Plain item with quantity > 1: show quantity picker */
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setUseQuantity((q) => Math.max(1, q - 1))}
                    disabled={useQuantity <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] disabled:opacity-30 transition-all active:scale-90"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-2xl font-bold text-[var(--fg)] min-w-[3ch] text-center tabular-nums">{useQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setUseQuantity((q) => Math.min(quantity, q + 1))}
                    disabled={useQuantity >= quantity}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] disabled:opacity-30 transition-all active:scale-90"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {quantity > 2 && (
                    <button
                      type="button"
                      onClick={() => setUseQuantity(quantity)}
                      className={cn(
                        'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                        useQuantity === quantity
                          ? 'text-white ring-1 ring-inset ring-white/20'
                          : 'bg-[var(--surface)] text-[var(--fg-muted)] border border-[var(--border)] hover:bg-[var(--surface-elevated)]',
                      )}
                      style={useQuantity === quantity ? {
                        background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
                      } : undefined}
                    >
                      Все ({quantity})
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onUse(useQuantity)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.97]"
                  style={{
                    background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
                    boxShadow: `0 4px 16px ${themeColor}35, inset 0 1px 0 rgba(255,255,255,0.2)`,
                  }}
                >
                  <Zap className="h-5 w-5" />
                  Использовать{useQuantity > 1 ? ` (${useQuantity})` : ''}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onUse()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.97]"
                style={{
                  background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
                  boxShadow: `0 4px 16px ${themeColor}35, inset 0 1px 0 rgba(255,255,255,0.2)`,
                }}
              >
                <Zap className="h-5 w-5" />
                Использовать
              </button>
            )
          )}

          <button
            type="button"
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-red-500 transition-all hover:scale-[1.01] active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(239,68,68,0.15)',
            }}
          >
            <Trash2 className="h-4 w-4" />
            Удалить из инвентаря
          </button>
        </div>
      </div>
    </div>
  )
})

/* ─── Sub-components ────────────────────────────────────────────────────────── */

const PROPERTY_COLORS: Record<string, string> = {
  lootbox: '#8b5cf6',
  multiplier: '#f59e0b',
  discount: '#ef4444',
  videogame: '#06b6d4',
  serial: '#ec4899',
}

const PropertiesBlock = memo(function PropertiesBlock({ item }: { item: ShopItem }) {
  const properties: Array<{
    key: string
    Icon: typeof Gift
    color: string
    title: string
    description: string
  }> = []

  if (item.isLootBox) {
    properties.push({
      key: 'lootbox', Icon: Gift, color: PROPERTY_COLORS.lootbox,
      title: 'Лутбокс',
      description: 'Содержит случайный предмет. Используйте, чтобы открыть.',
    })
  }
  if (item.streakMultiplierEnabled) {
    properties.push({
      key: 'multiplier', Icon: TrendingUp, color: PROPERTY_COLORS.multiplier,
      title: item.streakMultiplierMode === 'instant'
        ? `Множитель x${item.streakMultiplierValue ?? 1.5} (инстант)`
        : `Множитель x${item.streakMultiplierValue ?? 1.5}`,
      description: item.streakMultiplierMode === 'instant'
        ? `Действует на следующие ${item.streakMultiplierInterval ?? 3} выполнений мгновенной задачи.`
        : `Увеличивает награды за серию каждые ${item.streakMultiplierInterval ?? 3} выполнения.`,
    })
  }
  if (item.isDiscountVoucher) {
    properties.push({
      key: 'discount', Icon: Percent, color: PROPERTY_COLORS.discount,
      title: `Скидка ${item.discountPercent ?? 10}%`,
      description: 'Активирует скидку на следующую покупку в магазине.',
    })
  }
  if (item.isVideoGame) {
    properties.push({
      key: 'videogame', Icon: Gamepad2, color: PROPERTY_COLORS.videogame,
      title: 'Видеоигра',
      description: `Всего наиграно: ${Math.round((item.gameTimePlayedMinutes ?? 0) / 60 * 10) / 10} ч.`,
    })
  }
  if (item.isTvSerial) {
    properties.push({
      key: 'serial', Icon: Clapperboard, color: PROPERTY_COLORS.serial,
      title: 'Сериал',
      description: `${item.serialSeasons?.length ?? 0} сезонов`,
    })
  }

  if (properties.length === 0) return null

  return (
    <div
      className="glass rounded-2xl p-4 mb-5"
      style={{
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Свойства</h3>
      <div className="space-y-2">
        {properties.map(({ key, Icon, color, title, description }) => (
          <div
            key={key}
            className="flex items-start gap-3 rounded-xl px-3 py-2.5"
            style={{
              background: `linear-gradient(135deg, ${color}10, ${color}05)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px ${color}15`,
            }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5"
              style={{
                background: `linear-gradient(135deg, ${color}25, ${color}10)`,
                boxShadow: `inset 1px 1px 2px rgba(255,255,255,0.15), 0 2px 6px ${color}20`,
              }}
            >
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--fg)]">{title}</p>
              <p className="text-[11px] text-[var(--fg-muted)] mt-0.5 leading-relaxed">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

function GameTimeBlock({ item }: { item: ShopItem }) {
  const useGameTime = useRpgStore((s) => s.useGameTime)
  const total = item.gameTimeTotalMinutes ?? 0
  const h = Math.floor(total / 60)
  const m = total % 60
  const timeStr = h > 0 ? `${h} ч ${m > 0 ? `${m} мин` : ''}` : `${m} мин`

  const [hoursInput, setHoursInput] = useState('')
  const parsedHours = parseFloat(hoursInput.replace(',', '.'))
  const minutesToUse = !isNaN(parsedHours) && parsedHours > 0 ? Math.round(parsedHours * 60) : 0
  const canUse = minutesToUse > 0 && minutesToUse <= total

  const handleUse = () => {
    if (!canUse) return
    useGameTime(item.id, minutesToUse)
    setHoursInput('')
  }

  const color = PROPERTY_COLORS.videogame

  return (
    <div
      className="glass rounded-2xl p-4 mb-5 relative overflow-hidden"
      style={{
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: color }}
      />

      <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Игровое время</h3>

      {/* Balance */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 mb-3"
        style={{
          background: `linear-gradient(135deg, ${color}12, ${color}06)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px ${color}15`,
        }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${color}30, ${color}15)`,
            boxShadow: `inset 1px 1px 2px rgba(255,255,255,0.15), 0 2px 6px ${color}25`,
          }}
        >
          <Clock className="h-4 w-4" style={{ color }} />
        </div>
        <div>
          <p className="text-lg font-bold text-[var(--fg)]">{timeStr}</p>
          <p className="text-[11px] text-[var(--fg-muted)]">В запасе</p>
        </div>
      </div>

      {/* Use game time */}
      {total > 0 && (
        <div
          className="rounded-xl p-3"
          style={{
            background: 'linear-gradient(135deg, var(--surface-elevated), transparent)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px var(--border)',
          }}
        >
          <p className="text-[11px] font-semibold text-[var(--fg-muted)] mb-2">Использовать часы</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="decimal"
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUse()}
                placeholder="0"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 pr-8 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] outline-none transition-all tabular-nums"
                style={{
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = color
                  e.currentTarget.style.boxShadow = `inset 0 2px 4px rgba(0,0,0,0.06), 0 0 0 1px ${color}40`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = ''
                  e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.06)'
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--fg-muted)]">ч</span>
            </div>
            <button
              type="button"
              disabled={!canUse}
              onClick={handleUse}
              className={cn(
                'flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-all',
                canUse
                  ? 'text-white hover:scale-[1.02] active:scale-[0.97]'
                  : 'bg-[var(--surface)] text-[var(--fg-muted)] opacity-40 cursor-not-allowed',
              )}
              style={canUse ? {
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                boxShadow: `0 4px 12px ${color}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
              } : undefined}
            >
              <Gamepad2 className="h-4 w-4" />
              Играть
            </button>
          </div>
          {minutesToUse > total && (
            <p className="text-[10px] text-red-500 mt-1.5">Недостаточно часов в запасе</p>
          )}
        </div>
      )}

      {total === 0 && (
        <p className="text-[11px] text-[var(--fg-muted)] text-center py-2 opacity-60">Купите пакеты времени в магазине</p>
      )}
    </div>
  )
}

const LootTableBlock = memo(function LootTableBlock({ lootTable }: { lootTable: { id: string; weight: number; quantity?: number }[] }) {
  const shopItems = useRpgStore((s) => s.shopItems)
  const color = PROPERTY_COLORS.lootbox
  const totalWeight = lootTable.reduce((sum, e) => sum + e.weight, 0)

  const entries = lootTable.map((entry) => {
    const isCoins = entry.id === CURRENCY_IDS.COINS
    const isGems = entry.id === CURRENCY_IDS.GEMS
    const item = !isCoins && !isGems ? shopItems.find((i) => i.id === entry.id) : null
    const name = isCoins ? 'Монеты' : isGems ? 'Кристаллы' : item?.name ?? '???'
    const chance = totalWeight > 0 ? Math.round((entry.weight / totalWeight) * 100) : 0
    return { ...entry, name, chance, isCoins, isGems, item }
  })

  return (
    <div
      className="glass rounded-2xl p-4 mb-5 relative overflow-hidden"
      style={{
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: color }}
      />

      <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Содержимое</h3>
      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2"
            style={{
              background: `linear-gradient(135deg, ${color}08, ${color}03)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 0 0 1px ${color}10`,
            }}
          >
            {/* Icon */}
            {entry.isCoins ? (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                <Coins className="h-3.5 w-3.5 text-white" />
              </div>
            ) : entry.isGems ? (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-400 to-violet-600 shadow-sm">
                <Gem className="h-3.5 w-3.5 text-white" />
              </div>
            ) : entry.item ? (
              <ItemIconBadge item={entry.item} size="sm" className="h-7 w-7" />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-elevated)]">
                <Gift className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
              </div>
            )}

            {/* Name + quantity */}
            <div className="flex-1 min-w-0">
              <span className="text-sm text-[var(--fg)] truncate block">
                {entry.name}
                {(entry.quantity ?? 1) > 1 && (
                  <span className="text-[var(--fg-muted)]"> x{entry.quantity}</span>
                )}
              </span>
            </div>

            {/* Chance */}
            <span
              className="shrink-0 text-xs font-semibold tabular-nums"
              style={{ color }}
            >
              {entry.chance}%
            </span>
          </div>
        ))}
      </div>
      {totalWeight < 100 && (
        <p className="text-[10px] text-[var(--fg-muted)] mt-2 opacity-60 text-center">
          Шанс пустого открытия: {100 - totalWeight}%
        </p>
      )}
    </div>
  )
})

const SerialEpisodesBlock = memo(function SerialEpisodesBlock({ itemId, seasons }: { itemId: string; seasons: SerialSeason[] }) {
  const useEpisode = useRpgStore((s) => s.useEpisode)
  const color = PROPERTY_COLORS.serial

  const purchasedSeasons = seasons.filter((s) => s.episodes.some((e) => e.purchased))
  if (purchasedSeasons.length === 0) return null

  const totalEp = seasons.reduce((sum, s) => sum + s.episodes.length, 0)
  const purchasedEp = seasons.reduce((sum, s) => sum + s.episodes.filter((e) => e.purchased).length, 0)
  const usedEp = seasons.reduce((sum, s) => sum + s.episodes.filter((e) => e.purchased && e.used).length, 0)

  return (
    <div
      className="glass rounded-2xl p-4 mb-5 relative overflow-hidden"
      style={{
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: color }}
      />

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider">Серии</h3>
        <span className="text-[11px] text-[var(--fg-muted)]">
          {usedEp > 0 && <span style={{ color: '#10b981' }}>{usedEp} просм.</span>}
          {usedEp > 0 && ' · '}
          {purchasedEp} / {totalEp} купл.
        </span>
      </div>
      <div className="space-y-2">
        {purchasedSeasons.map((season) => {
          const purchased = season.episodes.filter((e) => e.purchased)
          const usedInSeason = purchased.filter((e) => e.used).length
          return (
            <div
              key={season.id}
              className="rounded-xl p-3"
              style={{
                background: `linear-gradient(135deg, ${color}10, ${color}05)`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px ${color}15`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Clapperboard className="h-4 w-4" style={{ color }} />
                <span className="text-sm font-medium text-[var(--fg)]">Сезон {season.number}</span>
                <span className="text-[10px] text-[var(--fg-muted)]">{usedInSeason}/{purchased.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {purchased.map((ep) => (
                  ep.used ? (
                    <span
                      key={ep.id}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold"
                      style={{
                        color: '#10b981',
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.05))',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(16,185,129,0.2)',
                      }}
                    >
                      <Check className="h-3 w-3" />
                      Серия {ep.number}
                    </span>
                  ) : (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => useEpisode(itemId, season.id, ep.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold cursor-pointer transition-all hover:scale-105 active:scale-95"
                      style={{
                        color,
                        background: `linear-gradient(135deg, ${color}15, ${color}08)`,
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px ${color}20`,
                      }}
                    >
                      <Zap className="h-3 w-3" />
                      Серия {ep.number}
                    </button>
                  )
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
