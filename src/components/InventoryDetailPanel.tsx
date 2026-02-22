import { cn } from '../lib/cn'
import {
  X, Trash2, Zap, Folder, Clock,
  Gift, TrendingUp, Percent, Gamepad2, Clapperboard,
} from 'lucide-react'
import { HabitIcon } from './HabitIcon'
import { useRpgStore } from '../store/useRpgStore'
import type { ShopItem } from '../types/domain'
import {
  getItemIcon, getItemTypeBadge,
  RARITY_LABELS, RARITY_BADGE_CLASSES, RARITY_COLORS,
} from './shop/shopUtils'

interface InventoryDetailPanelProps {
  item: ShopItem
  quantity: number
  acquiredAt: number
  onDeselect: () => void
  onUse: () => void
  onDelete: () => void
}

export default function InventoryDetailPanel({
  item, quantity, acquiredAt, onDeselect, onUse, onDelete,
}: InventoryDetailPanelProps) {
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const group = item.groupId ? allItemGroups.find((g) => g.id === item.groupId) : null
  const iconBgColor = group?.color ?? RARITY_COLORS[item.rarity]
  const typeBadge = getItemTypeBadge(item)

  const isUsable = item.isDiscountVoucher || item.streakMultiplierEnabled

  const acquiredDate = new Date(acquiredAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="glass-card relative flex h-full flex-col rounded-2xl overflow-hidden">
      {/* Accent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] z-10"
        style={{
          background: `linear-gradient(90deg, ${iconBgColor}, ${iconBgColor}40)`,
        }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            {/* Icon */}
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl overflow-hidden ring-2 ring-inset shadow-md"
              style={{
                background: `linear-gradient(135deg, ${iconBgColor}40, ${iconBgColor}20)`,
                boxShadow: `0 4px 12px ${iconBgColor}30`,
                '--tw-ring-color': `${iconBgColor}35`,
              } as React.CSSProperties}
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

          {/* Close button */}
          <button type="button" onClick={onDeselect} className="icon-btn shrink-0" title="Закрыть">
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
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-medium',
                  typeBadge.type === 'lootbox' && 'bg-gradient-to-b from-violet-500/20 to-violet-500/10 text-violet-500 ring-1 ring-inset ring-violet-400/25',
                  typeBadge.type === 'multiplier' && 'bg-gradient-to-b from-amber-500/20 to-amber-500/10 text-amber-500 ring-1 ring-inset ring-amber-400/25',
                  typeBadge.type === 'discount' && 'bg-gradient-to-b from-red-500/20 to-red-500/10 text-red-500 ring-1 ring-inset ring-red-400/25',
                  typeBadge.type === 'videogame' && 'bg-gradient-to-b from-cyan-500/20 to-cyan-500/10 text-cyan-500 ring-1 ring-inset ring-cyan-400/25',
                  typeBadge.type === 'serial' && 'bg-gradient-to-b from-pink-500/20 to-pink-500/10 text-pink-500 ring-1 ring-inset ring-pink-400/25',
                )}
              >
                {typeBadge.type === 'lootbox' && <Gift className="h-3.5 w-3.5" />}
                {typeBadge.type === 'multiplier' && <TrendingUp className="h-3.5 w-3.5" />}
                {typeBadge.type === 'discount' && <Percent className="h-3.5 w-3.5" />}
                {typeBadge.type === 'videogame' && <Gamepad2 className="h-3.5 w-3.5" />}
                {typeBadge.type === 'serial' && <Clapperboard className="h-3.5 w-3.5" />}
                {typeBadge.label}
              </span>
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
        {typeBadge && (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 mb-6">
            <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Свойства</h3>
            <div className="space-y-2">
              {item.isLootBox && (
                <div className="rounded-xl bg-[var(--surface-card)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="h-4 w-4 text-violet-500" />
                    <span className="text-sm font-medium text-[var(--fg)]">Лутбокс</span>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)]">
                    Содержит случайный предмет. Используйте, чтобы открыть.
                  </p>
                </div>
              )}
              {item.streakMultiplierEnabled && (
                <div className="rounded-xl bg-[var(--surface-card)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-[var(--fg)]">
                      Множитель x{item.streakMultiplierValue ?? 1.5}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)]">
                    Увеличивает награды за серию каждые {item.streakMultiplierInterval ?? 3} выполнения.
                  </p>
                </div>
              )}
              {item.isDiscountVoucher && (
                <div className="rounded-xl bg-[var(--surface-card)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-[var(--fg)]">
                      Скидка {item.discountPercent ?? 10}%
                    </span>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)]">
                    Активирует скидку на следующую покупку в магазине.
                  </p>
                </div>
              )}
              {item.isVideoGame && (
                <div className="rounded-xl bg-[var(--surface-card)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Gamepad2 className="h-4 w-4 text-cyan-500" />
                    <span className="text-sm font-medium text-[var(--fg)]">Видеоигра</span>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)]">
                    Всего наиграно: {Math.round((item.gameTimeTotalMinutes ?? 0) / 60 * 10) / 10} ч.
                  </p>
                </div>
              )}
              {item.isTvSerial && (
                <div className="rounded-xl bg-[var(--surface-card)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clapperboard className="h-4 w-4 text-pink-500" />
                    <span className="text-sm font-medium text-[var(--fg)]">Сериал</span>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {item.serialSeasons?.length ?? 0} сезонов
                  </p>
                </div>
              )}
            </div>
          </div>
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
                Использовать
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
}
