import { memo, useMemo, useState } from 'react'
import { cn } from '../lib/cn'
import {
  X, Trash2, Zap, Folder, Clock, Check, Minus, Plus,
  Gift, TrendingUp, Percent, Gamepad2, Clapperboard,
} from 'lucide-react'
import Modal from './Modal'
import { HabitIcon } from './HabitIcon'
import { useRpgStore } from '../store/useRpgStore'
import type { ShopItem, ItemGroup, SerialSeason } from '../types/domain'
import {
  getItemIcon, getItemTypeBadge,
  RARITY_LABELS, RARITY_BADGE_CLASSES, RARITY_COLORS,
  type ItemTypeBadge,
} from './shop/shopUtils'

/* ─── Type badge style map ──────────────────────────────────────────────────── */

const TYPE_BADGE_STYLES: Record<ItemTypeBadge['type'], { cls: string; Icon: typeof Gift }> = {
  lootbox: {
    cls: 'bg-gradient-to-b from-violet-500/20 to-violet-500/10 text-violet-500 ring-1 ring-inset ring-violet-400/25',
    Icon: Gift,
  },
  multiplier: {
    cls: 'bg-gradient-to-b from-amber-500/20 to-amber-500/10 text-amber-500 ring-1 ring-inset ring-amber-400/25',
    Icon: TrendingUp,
  },
  discount: {
    cls: 'bg-gradient-to-b from-red-500/20 to-red-500/10 text-red-500 ring-1 ring-inset ring-red-400/25',
    Icon: Percent,
  },
  videogame: {
    cls: 'bg-gradient-to-b from-cyan-500/20 to-cyan-500/10 text-cyan-500 ring-1 ring-inset ring-cyan-400/25',
    Icon: Gamepad2,
  },
  serial: {
    cls: 'bg-gradient-to-b from-pink-500/20 to-pink-500/10 text-pink-500 ring-1 ring-inset ring-pink-400/25',
    Icon: Clapperboard,
  },
}

const PROPERTY_ICON_COLORS: Record<string, string> = {
  lootbox: 'text-violet-500',
  multiplier: 'text-amber-500',
  discount: 'text-red-500',
  videogame: 'text-cyan-500',
  serial: 'text-pink-500',
}

/* ─── Props ─────────────────────────────────────────────────────────────────── */

interface InventoryItemModalProps {
  isOpen: boolean
  itemId: string | null
  onClose: () => void
  onUse: (itemId: string) => void
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
        onUse={() => onUse(resolved.item.id)}
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
  onUse: () => void
  onDelete: () => void
  onOpenAll?: () => void
}

const ModalContent = memo(function ModalContent({
  item, quantity, acquiredAt, group, onClose, onUse, onDelete, onOpenAll,
}: ModalContentProps) {
  const iconBgColor = group?.color ?? RARITY_COLORS[item.rarity]
  const typeBadge = getItemTypeBadge(item)
  const acquiredDate = useMemo(
    () =>
      new Date(acquiredAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [acquiredAt],
  )

  const accentStyle = useMemo(
    () => ({
      background: `linear-gradient(90deg, ${iconBgColor}, ${iconBgColor}40)`,
    }),
    [iconBgColor],
  )

  const iconContainerStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${iconBgColor}40, ${iconBgColor}20)`,
      boxShadow: `0 4px 12px ${iconBgColor}30`,
      '--tw-ring-color': `${iconBgColor}35`,
    } as React.CSSProperties),
    [iconBgColor],
  )

  return (
    <div className="relative">
      {/* Accent strip */}
      <div className="absolute top-0 left-0 right-0 h-[3px] z-10" style={accentStyle} />

      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl overflow-hidden ring-2 ring-inset shadow-md"
              style={iconContainerStyle}
            >
              {!item.iconImage && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-60" />
              )}
              {item.iconImage ? (
                <img src={item.iconImage} alt="" className="h-full w-full object-cover" style={{ imageRendering: 'auto' }} />
              ) : (
                <span className="relative z-10 drop-shadow-sm">
                  <HabitIcon iconName={getItemIcon(item)} size={28} />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[var(--fg)] break-words">{item.name}</h2>
            </div>
          </div>

          <button type="button" onClick={onClose} className="icon-btn shrink-0" title="Закрыть">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span
            className={cn(
              'inline-flex items-center rounded-2xl px-3 py-1.5 text-xs font-medium',
              RARITY_BADGE_CLASSES[item.rarity],
            )}
          >
            {RARITY_LABELS[item.rarity]}
          </span>

          {typeBadge && (
            <>
              <span className="w-px h-5 bg-[var(--border)] rounded-full" />
              <TypeBadgeChip badge={typeBadge} />
            </>
          )}

          {group && (
            <>
              <span className="w-px h-5 bg-[var(--border)] rounded-full" />
              <span className="inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-medium bg-[var(--surface)] text-[var(--fg-secondary)] border border-[var(--border)]">
                <Folder className="h-3.5 w-3.5 shrink-0" style={group.color ? { color: group.color } : undefined} />
                {group.name}
              </span>
            </>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-[var(--fg-muted)] text-sm leading-relaxed break-words mb-6">
            {item.description}
          </p>
        )}

        {/* Info block */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 mb-6">
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Информация</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--surface-card)] p-3 text-center">
              <p className="text-2xl font-bold text-[var(--fg)]">{quantity}</p>
              <p className="text-xs text-[var(--fg-muted)] mt-1">В наличии</p>
            </div>
            <div className="rounded-xl bg-[var(--surface-card)] p-3 text-center">
              <Clock className="h-4 w-4 text-[var(--fg-muted)] mx-auto mb-1" />
              <p className="text-xs text-[var(--fg-muted)]">{acquiredDate}</p>
              <p className="text-[10px] text-[var(--fg-muted)] mt-0.5">Получено</p>
            </div>
          </div>
        </div>

        {/* Properties block */}
        {typeBadge && <PropertiesBlock item={item} />}

        {/* Game time balance for video games */}
        {item.isVideoGame && <GameTimeBlock item={item} />}

        {/* Episodes for serials */}
        {item.isTvSerial && item.serialSeasons && item.serialSeasons.length > 0 && (
          <SerialEpisodesBlock itemId={item.id} seasons={item.serialSeasons} />
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {/* Hide "Use" button for serials and video games — interaction is inline */}
          {!item.isTvSerial && !item.isVideoGame && (
            item.isLootBox ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onUse}
                  className={cn(
                    'flex-1 rounded-2xl py-4 font-semibold transition-all duration-200',
                    'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white',
                    'shadow-lg shadow-[var(--accent)]/25',
                    'hover:shadow-xl hover:scale-[1.01] active:scale-[0.98]',
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Gift className="h-5 w-5" />
                    Открыть
                  </span>
                </button>
                {quantity > 1 && onOpenAll && (
                  <button
                    type="button"
                    onClick={onOpenAll}
                    className={cn(
                      'flex-1 rounded-2xl py-4 font-semibold transition-all duration-200',
                      'bg-gradient-to-r from-violet-500 to-violet-600 text-white',
                      'shadow-lg shadow-violet-500/25',
                      'hover:shadow-xl hover:scale-[1.01] active:scale-[0.98]',
                    )}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Gift className="h-5 w-5" />
                      Открыть все ({quantity})
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onUse}
                className={cn(
                  'w-full rounded-2xl py-4 font-semibold transition-all duration-200',
                  'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white',
                  'shadow-lg shadow-[var(--accent)]/25',
                  'hover:shadow-xl hover:scale-[1.01] active:scale-[0.98]',
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  <Zap className="h-5 w-5" />
                  Использовать
                </span>
              </button>
            )
          )}

          <button
            type="button"
            onClick={onDelete}
            className={cn(
              'w-full rounded-2xl py-3.5 font-semibold transition-all duration-200',
              'border border-red-500/30 text-red-500',
              'hover:bg-red-500/10 active:scale-[0.98]',
            )}
          >
            <span className="flex items-center justify-center gap-2">
              <Trash2 className="h-4 w-4" />
              Удалить из инвентаря
            </span>
          </button>
        </div>
      </div>
    </div>
  )
})

/* ─── Sub-components ────────────────────────────────────────────────────────── */

const TypeBadgeChip = memo(function TypeBadgeChip({ badge }: { badge: ItemTypeBadge }) {
  const style = TYPE_BADGE_STYLES[badge.type]
  const { Icon } = style
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-medium', style.cls)}>
      <Icon className="h-3.5 w-3.5" />
      {badge.label}
    </span>
  )
})

const PropertiesBlock = memo(function PropertiesBlock({ item }: { item: ShopItem }) {
  const properties: Array<{
    key: string
    Icon: typeof Gift
    colorCls: string
    title: string
    description: string
  }> = []

  if (item.isLootBox) {
    properties.push({
      key: 'lootbox',
      Icon: Gift,
      colorCls: PROPERTY_ICON_COLORS.lootbox,
      title: 'Лутбокс',
      description: 'Содержит случайный предмет. Используйте, чтобы открыть.',
    })
  }
  if (item.streakMultiplierEnabled) {
    properties.push({
      key: 'multiplier',
      Icon: TrendingUp,
      colorCls: PROPERTY_ICON_COLORS.multiplier,
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
      key: 'discount',
      Icon: Percent,
      colorCls: PROPERTY_ICON_COLORS.discount,
      title: `Скидка ${item.discountPercent ?? 10}%`,
      description: 'Активирует скидку на следующую покупку в магазине.',
    })
  }
  if (item.isVideoGame) {
    properties.push({
      key: 'videogame',
      Icon: Gamepad2,
      colorCls: PROPERTY_ICON_COLORS.videogame,
      title: 'Видеоигра',
      description: `Всего наиграно: ${Math.round((item.gameTimeTotalMinutes ?? 0) / 60 * 10) / 10} ч.`,
    })
  }
  if (item.isTvSerial) {
    properties.push({
      key: 'serial',
      Icon: Clapperboard,
      colorCls: PROPERTY_ICON_COLORS.serial,
      title: 'Сериал',
      description: `${item.serialSeasons?.length ?? 0} сезонов`,
    })
  }

  if (properties.length === 0) return null

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 mb-6">
      <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Свойства</h3>
      <div className="space-y-2">
        {properties.map(({ key, Icon, colorCls, title, description }) => (
          <div key={key} className="rounded-xl bg-[var(--surface-card)] p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn('h-4 w-4', colorCls)} />
              <span className="text-sm font-medium text-[var(--fg)]">{title}</span>
            </div>
            <p className="text-xs text-[var(--fg-muted)]">{description}</p>
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

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 mb-6">
      <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Игровое время</h3>

      {/* Balance */}
      <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-card)] px-4 py-3 mb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-cyan-500/15 to-cyan-500/5 text-cyan-500 ring-1 ring-inset ring-cyan-400/20 shadow-sm shadow-cyan-500/10">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <p className="text-lg font-bold text-[var(--fg)]">{timeStr}</p>
          <p className="text-xs text-[var(--fg-muted)]">В запасе</p>
        </div>
      </div>

      {/* Use game time */}
      {total > 0 && (
        <div className="rounded-xl bg-[var(--surface-card)] p-3">
          <p className="text-xs font-medium text-[var(--fg-muted)] mb-2">Использовать часы</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="decimal"
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUse()}
                placeholder="0"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 pr-8 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all tabular-nums"
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
                  ? 'bg-gradient-to-b from-cyan-500 to-cyan-600 text-white shadow-sm shadow-cyan-500/25 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-[var(--surface)] text-[var(--fg-muted)] opacity-50 cursor-not-allowed',
              )}
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
        <p className="text-xs text-[var(--fg-muted)] text-center py-2">Купите пакеты времени в магазине</p>
      )}
    </div>
  )
}

const SerialEpisodesBlock = memo(function SerialEpisodesBlock({ itemId, seasons }: { itemId: string; seasons: SerialSeason[] }) {
  const useEpisode = useRpgStore((s) => s.useEpisode)

  const purchasedSeasons = seasons.filter((s) => s.episodes.some((e) => e.purchased))
  if (purchasedSeasons.length === 0) return null

  const totalEp = seasons.reduce((sum, s) => sum + s.episodes.length, 0)
  const purchasedEp = seasons.reduce((sum, s) => sum + s.episodes.filter((e) => e.purchased).length, 0)
  const usedEp = seasons.reduce((sum, s) => sum + s.episodes.filter((e) => e.purchased && e.used).length, 0)

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--fg)]">Серии</h3>
        <span className="text-xs text-[var(--fg-muted)]">
          {usedEp > 0 && <span className="text-emerald-500">{usedEp} просм.</span>}
          {usedEp > 0 && ' · '}
          {purchasedEp} / {totalEp} купл.
        </span>
      </div>
      <div className="space-y-2">
        {purchasedSeasons.map((season) => {
          const purchased = season.episodes.filter((e) => e.purchased)
          const usedInSeason = purchased.filter((e) => e.used).length
          return (
            <div key={season.id} className="rounded-xl bg-[var(--surface-card)] p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clapperboard className="h-4 w-4 text-pink-500" />
                <span className="text-sm font-medium text-[var(--fg)]">Сезон {season.number}</span>
                <span className="text-[10px] text-[var(--fg-muted)]">{usedInSeason}/{purchased.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {purchased.map((ep) => (
                  ep.used ? (
                    <span
                      key={ep.id}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 ring-1 ring-inset ring-emerald-400/20"
                    >
                      <Check className="h-3 w-3" />
                      Серия {ep.number}
                    </span>
                  ) : (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => useEpisode(itemId, season.id, ep.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-pink-500 bg-pink-500/10 ring-1 ring-inset ring-pink-400/20 hover:bg-pink-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
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
