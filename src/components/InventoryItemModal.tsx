import { memo, useMemo } from 'react'
import { cn } from '../lib/cn'
import {
  X, Trash2, Zap, Folder, Clock, Check,
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
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function InventoryItemModal({
  isOpen, itemId, onClose, onUse, onDelete,
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
}

const ModalContent = memo(function ModalContent({
  item, quantity, acquiredAt, group, onClose, onUse, onDelete,
}: ModalContentProps) {
  const iconBgColor = group?.color ?? RARITY_COLORS[item.rarity]
  const typeBadge = getItemTypeBadge(item)
  const isUsable = item.isDiscountVoucher || item.streakMultiplierEnabled || item.isLootBox

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

        {/* Purchased episodes for serials */}
        {item.isTvSerial && item.serialSeasons && item.serialSeasons.length > 0 && (
          <PurchasedEpisodesBlock seasons={item.serialSeasons} />
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {isUsable && (
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
                {item.isLootBox ? 'Открыть' : 'Использовать'}
              </span>
            </button>
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
      title: `Множитель x${item.streakMultiplierValue ?? 1.5}`,
      description: `Увеличивает награды за серию каждые ${item.streakMultiplierInterval ?? 3} выполнения.`,
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

const PurchasedEpisodesBlock = memo(function PurchasedEpisodesBlock({ seasons }: { seasons: SerialSeason[] }) {
  const purchasedSeasons = seasons.filter((s) => s.episodes.some((e) => e.purchased))
  if (purchasedSeasons.length === 0) return null

  const totalEp = seasons.reduce((sum, s) => sum + s.episodes.length, 0)
  const purchasedEp = seasons.reduce((sum, s) => sum + s.episodes.filter((e) => e.purchased).length, 0)

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--fg)]">Купленные серии</h3>
        <span className="text-xs text-[var(--fg-muted)]">{purchasedEp} / {totalEp}</span>
      </div>
      <div className="space-y-2">
        {purchasedSeasons.map((season) => {
          const purchased = season.episodes.filter((e) => e.purchased)
          return (
            <div key={season.id} className="rounded-xl bg-[var(--surface-card)] p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clapperboard className="h-4 w-4 text-pink-500" />
                <span className="text-sm font-medium text-[var(--fg)]">Сезон {season.number}</span>
                <span className="text-[10px] text-[var(--fg-muted)]">{purchased.length}/{season.episodes.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {purchased.map((ep) => (
                  <span
                    key={ep.id}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 ring-1 ring-inset ring-emerald-400/20"
                  >
                    <Check className="h-3 w-3" />
                    Серия {ep.number}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
