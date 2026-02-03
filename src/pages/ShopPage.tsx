import { useState } from 'react'
import { cn } from '../lib/cn'
import { 
  ShoppingBag, Package, Plus, Pencil, Trash2, X, 
  Coins, Gem, Gift, Sparkles, Check, ChevronRight, Box, Lightbulb, Hammer
} from 'lucide-react'
import { useRpgStore } from '../store/useRpgStore'
import type { ShopItem, ItemRarity } from '../types/domain'
import { CURRENCY_IDS } from '../types/domain'

type Tab = 'shop' | 'inventory'

const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

const RARITY_LABELS: Record<ItemRarity, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
}

const RARITY_GRADIENTS: Record<ItemRarity, string> = {
  common: 'from-gray-400 to-gray-500',
  uncommon: 'from-green-400 to-emerald-500',
  rare: 'from-blue-400 to-indigo-500',
  epic: 'from-purple-400 to-violet-500',
  legendary: 'from-amber-400 to-orange-500',
}

type LootTableEntry = { id: string; weight: number; quantity?: number }

// ─── Reward Picker Modal (multi-select shop items + coins + gems) ────────────

interface RewardPickerModalProps {
  shopItems: ShopItem[]
  excludeIds?: string[]
  onSelect: (ids: string[]) => void
  onClose: () => void
}

function RewardPickerModal({ shopItems, excludeIds = [], onSelect, onClose }: RewardPickerModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    onSelect(Array.from(selected))
    onClose()
  }

  const options = [
    { id: CURRENCY_IDS.COINS, name: 'Монеты', icon: '🪙' },
    { id: CURRENCY_IDS.GEMS, name: 'Кристаллы', icon: '💎' },
    ...shopItems.filter((i) => !excludeIds.includes(i.id)).map((i) => ({ id: i.id, name: i.name, icon: i.isLootBox ? '🎁' : '⚔️' })),
  ]

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Выберите награды</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 mb-4">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                selected.has(opt.id)
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
              )}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="font-medium text-[var(--fg)]">{opt.name}</span>
              {selected.has(opt.id) && <Check className="h-5 w-5 text-[var(--accent)] ml-auto" />}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button type="button" onClick={handleConfirm} className="btn-primary flex-1">Добавить</button>
        </div>
      </div>
    </div>
  )
}

// ─── Lootbox Effect Modal ───────────────────────────────────────────────────

interface LootboxEffectModalProps {
  lootTable: LootTableEntry[]
  shopItems: ShopItem[]
  onSave: (table: LootTableEntry[]) => void
  onClose: () => void
}

function LootboxEffectModal({ lootTable: initial, shopItems, onSave, onClose }: LootboxEffectModalProps) {
  const safeInitial = Array.isArray(initial)
    ? initial.filter((e): e is LootTableEntry => e != null && typeof e.id === 'string' && typeof e.weight === 'number')
    : []
  const [entries, setEntries] = useState<LootTableEntry[]>(safeInitial.length ? safeInitial : [])
  const [showPicker, setShowPicker] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const totalPercentCorrect = entries.reduce((s, e) => s + e.weight, 0)

  const addRewards = (ids: string[]) => {
    const weightPer = ids.length ? 100 / ids.length : 0
    setEntries((prev) => [
      ...prev,
      ...ids.map((id) => ({ id, weight: Math.round(weightPer), quantity: 1 })),
    ])
    setShowPicker(false)
  }

  const replaceReward = (id: string) => {
    if (editingIndex === null) return
    setEntries((prev) => prev.map((e, i) => (i === editingIndex ? { ...e, id, quantity: e.quantity ?? 1 } : e)))
    setEditingIndex(null)
    setShowPicker(false)
  }

  const updateEntry = (index: number, updater: (e: LootTableEntry) => LootTableEntry) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? updater(e) : e)))
  }

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const getEntryName = (id: string) => {
    if (id === CURRENCY_IDS.COINS) return 'Монеты'
    if (id === CURRENCY_IDS.GEMS) return 'Кристаллы'
    return shopItems.find((i) => i.id === id)?.name ?? id
  }

  const getEntryIcon = (id: string) => {
    if (id === CURRENCY_IDS.COINS) return '🪙'
    if (id === CURRENCY_IDS.GEMS) return '💎'
    const item = shopItems.find((i) => i.id === id)
    return item?.isLootBox ? '🎁' : '⚔️'
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && !showPicker && editingIndex === null && onClose()}
    >
      <div className="modal-content max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-[var(--fg)]">Эффект лутбокса</h2>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-[var(--fg-muted)] mb-4">
          Каждое открытие — независимое событие и случайным образом выдаёт одну из наград.
        </p>

        <div className="flex-1 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 mb-4">
          {entries.length === 0 ? (
            <>
              <div className="flex flex-col items-center justify-center py-12">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] mb-4">
                  <Box className="h-10 w-10 text-[var(--fg-muted)]" />
                </div>
                <p className="text-sm font-medium text-[var(--fg-muted)]">Наград пока нет</p>
              </div>
              <div className="border-t border-[var(--border)] pt-4 mt-4" />
            </>
          ) : (
            <div className="space-y-4">
              {entries.map((entry, index) => (
                <div
                  key={`${entry.id}-${index}`}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getEntryIcon(entry.id)}</span>
                      <span className="font-medium text-[var(--fg)]">{getEntryName(entry.id)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingIndex(index)}
                        className="text-sm font-medium text-[var(--accent)] hover:underline"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEntry(index)}
                        className="icon-btn icon-btn-danger p-1"
                        title="Удалить награду"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1">Количество</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateEntry(index, (e) => ({ ...e, quantity: Math.max(1, (e.quantity ?? 1) - 1) }))}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)]"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={entry.quantity ?? 1}
                          onChange={(ev) => updateEntry(index, (entry) => ({ ...entry, quantity: Math.max(1, Number(ev.target?.value) || 1) }))}
                          className="input flex-1 text-center h-9"
                        />
                        <button
                          type="button"
                          onClick={() => updateEntry(index, (e) => ({ ...e, quantity: (e.quantity ?? 1) + 1 }))}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1">Шанс выпадения, %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={entry.weight}
                        onChange={(ev) => {
                          const newWeight = Number(ev.target?.value) || 0
                          const otherSum = entries.reduce((sum, e, i) => (i === index ? sum : sum + e.weight), 0)
                          const maxWeight = Math.max(0, 100 - otherSum)
                          updateEntry(index, (entry) => ({ ...entry, weight: Math.min(maxWeight, Math.max(0, newWeight)) }))
                        }}
                        className="input w-full h-9"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => (editingIndex !== null ? setEditingIndex(null) : setShowPicker(true))}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] py-3 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
          >
            <Plus className="h-5 w-5" />
            Добавить награду
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {entries.length > 0 && (
          <>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 mb-2">
              <Sparkles className="h-5 w-5 text-[var(--accent)]" />
              <span className="text-sm font-medium text-[var(--fg)]">Общий шанс выпадения: {totalPercentCorrect}%</span>
            </div>
            {totalPercentCorrect < 100 && (
              <div className="flex items-start gap-2 rounded-xl border border-[var(--warning)] bg-[var(--warning-subtle)] px-4 py-3 mb-2 text-sm text-[var(--fg-muted)]">
                <Lightbulb className="h-5 w-5 shrink-0 text-[var(--warning)]" />
                <span>Общая вероятность меньше 100%. Оставшиеся {100 - totalPercentCorrect}% не дадут наград.</span>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button
            type="button"
            onClick={() => { onSave(entries); onClose() }}
            className="btn-primary flex-1"
          >
            Сохранить
          </button>
        </div>
      </div>

      {showPicker && editingIndex === null && (
        <RewardPickerModal
          shopItems={shopItems}
          onSelect={addRewards}
          onClose={() => setShowPicker(false)}
        />
      )}
      {editingIndex !== null && entries[editingIndex] && (
        <RewardPickerModalSingle
          shopItems={shopItems}
          currentId={entries[editingIndex].id}
          onSelect={(id) => replaceReward(id)}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </div>
  )
}

// When picker is open for "replace" we need to select one item
function RewardPickerModalSingle({
  shopItems,
  currentId,
  onSelect,
  onClose,
}: {
  shopItems: ShopItem[]
  currentId: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<string | null>(currentId)

  const options = [
    { id: CURRENCY_IDS.COINS, name: 'Монеты', icon: '🪙' },
    { id: CURRENCY_IDS.GEMS, name: 'Кристаллы', icon: '💎' },
    ...shopItems.map((i) => ({ id: i.id, name: i.name, icon: i.isLootBox ? '🎁' : '⚔️' })),
  ]

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Изменить награду</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 mb-4">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelected(opt.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                selected === opt.id ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' : 'border-[var(--border)] bg-[var(--surface)]'
              )}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="font-medium text-[var(--fg)]">{opt.name}</span>
              {selected === opt.id && <Check className="h-5 w-5 text-[var(--accent)] ml-auto" />}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button
            type="button"
            onClick={() => selected && (onSelect(selected), onClose())}
            className="btn-primary flex-1"
          >
            Выбрать
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shop Item Card ─────────────────────────────────────────────────────────

interface ShopItemCardProps {
  item: ShopItem
  onEdit: () => void
}

function ShopItemCard({ item, onEdit }: ShopItemCardProps) {
  const purchaseItem = useRpgStore((s) => s.purchaseItem)
  const deleteItem = useRpgStore((s) => s.deleteShopItem)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  
  const profile = profiles.find((p) => p.id === activeProfileId)
  const coins = profile?.currencies[CURRENCY_IDS.COINS] ?? 0
  const gems = profile?.currencies[CURRENCY_IDS.GEMS] ?? 0

  const coinCost = item.cost[CURRENCY_IDS.COINS] ?? 0
  const gemCost = item.cost[CURRENCY_IDS.GEMS] ?? 0
  const canAfford = coins >= coinCost && gems >= gemCost

  const handlePurchase = () => {
    purchaseItem(item.id)
  }

  const rarityColor = RARITY_COLORS[item.rarity]

  return (
    <div
      className={cn(
        'glass-card group relative rounded-2xl p-5 transition-all duration-300',
        'hover:scale-[1.02]',
        item.rarity === 'legendary' && 'animate-pulse-glow'
      )}
      style={{ 
        borderColor: `${rarityColor}30`,
        boxShadow: item.rarity === 'legendary' ? `0 0 20px ${rarityColor}30` : undefined
      }}
    >
      {/* Edit/Delete buttons */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onEdit} className="icon-btn">
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => { if (confirm('Удалить предмет?')) deleteItem(item.id) }}
          className="icon-btn icon-btn-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div
          className={cn(
            'flex h-20 w-20 items-center justify-center rounded-2xl text-4xl mb-4 shadow-lg',
            `bg-gradient-to-br ${RARITY_GRADIENTS[item.rarity]}`
          )}
          style={{ boxShadow: `0 8px 20px ${rarityColor}40` }}
        >
          {item.isLootBox ? '🎁' : '⚔️'}
        </div>

        {/* Name */}
        <h3 className="font-semibold text-[var(--fg)] line-clamp-1">{item.name}</h3>

        {/* Rarity badge */}
        <span
          className="mt-2 rounded-lg px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor: `${rarityColor}20`,
            color: rarityColor,
          }}
        >
          {RARITY_LABELS[item.rarity]}
          {item.isLootBox && ' • Лутбокс'}
        </span>

        {/* Description */}
        {item.description && (
          <p className="mt-3 text-sm text-[var(--fg-muted)] line-clamp-2">{item.description}</p>
        )}

        {/* Price */}
        <div className="mt-4 flex items-center gap-3">
          {coinCost > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <Coins className="h-4 w-4" />
              {coinCost.toLocaleString('ru-RU')}
            </span>
          )}
          {gemCost > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-purple-500">
              <Gem className="h-4 w-4" />
              {gemCost.toLocaleString('ru-RU')}
            </span>
          )}
        </div>

        {/* Buy button */}
        {item.stock !== 0 && (
          <button
            type="button"
            onClick={handlePurchase}
            disabled={!canAfford}
            className={cn(
              'mt-4 w-full rounded-xl py-2.5 font-medium transition-all duration-200',
              canAfford
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40'
                : 'bg-[var(--surface)] text-[var(--fg-muted)] cursor-not-allowed'
            )}
          >
            {canAfford ? 'Купить' : 'Недостаточно средств'}
          </button>
        )}

        {/* Stock info */}
        {item.stock !== undefined && item.stock > 0 && (
          <p className="mt-2 text-xs text-[var(--fg-muted)]">
            Осталось: {item.stock}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Inventory Item Card ────────────────────────────────────────────────────

interface InventoryItemCardProps {
  itemId: string
  quantity: number
}

function InventoryItemCard({ itemId, quantity }: InventoryItemCardProps) {
  const shopItems = useRpgStore((s) => s.shopItems)
  const useItem = useRpgStore((s) => s.useItem)
  const openLootbox = useRpgStore((s) => s.openLootbox)

  const item = shopItems.find((i) => i.id === itemId)
  if (!item) return null

  const rarityColor = RARITY_COLORS[item.rarity]

  const handleUse = () => {
    if (item.isLootBox) {
      const result = openLootbox(item.id)
      if (result) {
        alert(`Вы получили: ${result.name}!`)
      }
    } else {
      useItem(item.id)
    }
  }

  return (
    <div className="glass-card rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-xl text-2xl shadow-md',
            `bg-gradient-to-br ${RARITY_GRADIENTS[item.rarity]}`
          )}
        >
          {item.isLootBox ? '🎁' : '⚔️'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--fg)] truncate">{item.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="rounded-md px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${rarityColor}20`, color: rarityColor }}
            >
              {RARITY_LABELS[item.rarity]}
            </span>
            <span className="text-sm text-[var(--fg-muted)]">×{quantity}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleUse}
          className="btn-secondary text-sm"
        >
          {item.isLootBox ? 'Открыть' : 'Использовать'}
        </button>
      </div>
    </div>
  )
}

// ─── Crafting type picker & recipe modals ───────────────────────────────────

interface CraftingTypePickerModalProps {
  onSelect: (type: 'create' | 'material' | 'transform') => void
  onClose: () => void
}

function CraftingTypePickerModal({ onSelect, onClose }: CraftingTypePickerModalProps) {
  const options = [
    { type: 'create' as const, label: 'Создание предмета', desc: 'Крафт нового предмета из материалов', icon: '⚒️' },
    { type: 'material' as const, label: 'Материал для крафта', desc: 'Предмет используется как ингредиент', icon: '🧩' },
    { type: 'transform' as const, label: 'Преобразование / Улучшение', desc: 'Улучшение или превращение предмета', icon: '✨' },
  ]
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Тип рецепта крафта</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-[var(--fg-muted)] mb-4">Выберите тип рецепта для настройки</p>
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelect(opt.type)}
              className="w-full flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left hover:bg-[var(--surface-elevated)] hover:border-[var(--accent)]/50 transition-colors"
            >
              <span className="text-2xl">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[var(--fg)]">{opt.label}</div>
                <div className="text-xs text-[var(--fg-muted)] mt-0.5">{opt.desc}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--fg-muted)] shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function CraftingCreateItemModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Создание предмета</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-[var(--fg-muted)] mb-4">Настройте рецепт: из каких материалов и в каком количестве создаётся предмет.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Ингредиенты</label>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-sm text-[var(--fg-muted)]">
              Выбор материалов и количества — скоро
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Результат</label>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-sm text-[var(--fg-muted)]">
              Предмет результата крафта
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button type="button" className="btn-primary flex-1">Сохранить</button>
        </div>
      </div>
    </div>
  )
}

function CraftingMaterialModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Материал для крафта</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-[var(--fg-muted)] mb-4">Настройте, в каких рецептах этот предмет выступает ингредиентом и в каком количестве.</p>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--fg-muted)]">
          Список рецептов, где используется предмет — скоро
        </div>
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button type="button" className="btn-primary flex-1">Сохранить</button>
        </div>
      </div>
    </div>
  )
}

function CraftingTransformModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Преобразование / Улучшение</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-[var(--fg-muted)] mb-4">Настройте рецепт улучшения или превращения предмета в другой.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Исходный предмет</label>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-sm text-[var(--fg-muted)]">
              Выбор предмета и количества
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Результат улучшения</label>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-sm text-[var(--fg-muted)]">
              Предмет или улучшённая версия
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button type="button" className="btn-primary flex-1">Сохранить</button>
        </div>
      </div>
    </div>
  )
}

// ─── Item Form ──────────────────────────────────────────────────────────────

interface ItemFormProps {
  item?: ShopItem
  onClose: () => void
}

function ItemForm({ item, onClose }: ItemFormProps) {
  const addItem = useRpgStore((s) => s.addShopItem)
  const updateItem = useRpgStore((s) => s.updateShopItem)
  const shopItems = useRpgStore((s) => s.shopItems)

  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [rarity, setRarity] = useState<ItemRarity>(item?.rarity ?? 'common')
  const [coinCost, setCoinCost] = useState(item?.cost[CURRENCY_IDS.COINS] ?? 100)
  const [gemCost, setGemCost] = useState(item?.cost[CURRENCY_IDS.GEMS] ?? 0)
  const [isLootBox, setIsLootBox] = useState(item?.isLootBox ?? false)
  const [lootTable, setLootTable] = useState<LootTableEntry[]>(item?.lootTable ?? [])
  const [stock, setStock] = useState<number | undefined>(item?.stock)
  const [availableForPurchase, setAvailableForPurchase] = useState(item?.availableForPurchase ?? true)
  const [canGetForFree, setCanGetForFree] = useState(item?.canGetForFree ?? false)
  const [showLootboxModal, setShowLootboxModal] = useState(false)
  const [showCraftingTypePicker, setShowCraftingTypePicker] = useState(false)
  const [activeCraftingModal, setActiveCraftingModal] = useState<'create' | 'material' | 'transform' | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const cost = availableForPurchase && !canGetForFree
      ? { [CURRENCY_IDS.COINS]: coinCost, [CURRENCY_IDS.GEMS]: gemCost }
      : { [CURRENCY_IDS.COINS]: 0, [CURRENCY_IDS.GEMS]: 0 }

    const data: Omit<ShopItem, 'id'> = {
      name: name.trim(),
      description: description.trim() || undefined,
      rarity,
      cost,
      isLootBox,
      lootTable: isLootBox ? lootTable : undefined,
      stock,
      availableForPurchase,
      canGetForFree,
      groupId: item?.groupId,
    }

    if (item) {
      updateItem(item.id, () => ({ ...item, ...data }))
    } else {
      addItem(data)
    }
    onClose()
  }

  const divider = <div className="border-t border-[var(--border)]" />

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !showLootboxModal && !showCraftingTypePicker && !activeCraftingModal && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--fg)]">
            {item ? 'Редактировать предмет' : 'Новый предмет'}
          </h2>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Название предмета */}
          <div>
            <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Название предмета</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название..."
              className="input w-full text-base"
              autoFocus
            />
          </div>

          {/* Описание предмета */}
          <div>
            <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Описание предмета</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание (опционально)"
              rows={3}
              className="input w-full resize-none"
            />
          </div>

          {/* Группа */}
          <div>
            <p className="text-sm font-medium text-[var(--fg-muted)] mb-2">Группа</p>
            <button
              type="button"
              disabled
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-sm text-[var(--fg-muted)] cursor-not-allowed opacity-70"
            >
              Выберите группу
            </button>
          </div>

          {/* Способ получения */}
          <div>
            <p className="text-sm font-medium text-[var(--fg-muted)] mb-3">Способ получения</p>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm font-medium text-[var(--fg)]">Доступно для покупки</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={availableForPurchase}
                  onClick={() => setAvailableForPurchase((v) => !v)}
                  className={cn(
                    'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
                    availableForPurchase ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                      availableForPurchase ? 'right-1 left-auto' : 'left-1 right-auto'
                    )}
                  />
                </button>
              </div>

              {availableForPurchase && (
                <>
                  {divider}
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm font-medium text-[var(--fg)]">Можно получить бесплатно</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={canGetForFree}
                      onClick={() => setCanGetForFree((v) => !v)}
                      className={cn(
                        'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
                        canGetForFree ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                          canGetForFree ? 'right-1 left-auto' : 'left-1 right-auto'
                        )}
                      />
                    </button>
                  </div>
                </>
              )}

              {!availableForPurchase && (
                <>
                  {divider}
                  <p className="px-4 py-3 text-xs text-[var(--fg-muted)]">
                    Этот предмет не будет продаваться в магазине, но его по-прежнему можно получить за выполнение заданий, достижений или через другие игровые активности.
                  </p>
                </>
              )}

              {availableForPurchase && !canGetForFree && (
                <>
                  {divider}
                  <p className="px-4 py-3 text-xs text-[var(--fg-muted)]">
                    Выберите ниже ресурсы или валюту, необходимые для покупки (обмена) этого предмета
                  </p>
                  {divider}
                  <div className="px-4 py-3">
                    <button
                      type="button"
                      disabled
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-medium text-[var(--accent)] cursor-not-allowed opacity-70"
                    >
                      <Plus className="h-5 w-5" />
                      Выбрать предмет
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 px-4 py-3">
                    <div>
                      <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Монеты</label>
                      <input
                        type="number"
                        value={coinCost}
                        onChange={(e) => setCoinCost(Number(e.target.value) || 0)}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Гемы</label>
                      <input
                        type="number"
                        value={gemCost}
                        onChange={(e) => setGemCost(Number(e.target.value) || 0)}
                        className="input w-full"
                      />
                    </div>
                  </div>
                </>
              )}

              {availableForPurchase && canGetForFree && (
                <>
                  {divider}
                  <p className="px-4 py-3 text-xs text-[var(--fg-muted)]">
                    Этот предмет можно получить в магазине бесплатно
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Редкость</label>
              <select
                value={rarity}
                onChange={(e) => setRarity(e.target.value as ItemRarity)}
                className="select w-full"
              >
                {Object.entries(RARITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Запас</label>
              <input
                type="number"
                value={stock ?? ''}
                onChange={(e) => setStock(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="∞"
                className="input w-full"
              />
            </div>
          </div>

          {/* Лутбокс — тумблер */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-medium text-[var(--fg)]">Лутбокс</span>
                <p className="text-xs text-[var(--fg-muted)] mt-0.5">Случайный предмет при открытии</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isLootBox}
                onClick={() => setIsLootBox((v) => !v)}
                className={cn(
                  'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
                  isLootBox ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                    isLootBox ? 'right-1 left-auto' : 'left-1 right-auto'
                  )}
                />
              </button>
            </div>
            {isLootBox && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowLootboxModal(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] py-3 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
                >
                  <Gift className="h-5 w-5" />
                  Настроить лутбокс
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Рецепты крафта */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs font-medium text-[var(--fg-muted)] mb-2">Рецепты крафта</p>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] py-10 px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface)] mb-4">
                <Hammer className="h-8 w-8 text-[var(--fg-muted)]" />
              </div>
              <p className="font-semibold text-[var(--fg)] text-center">Рецептов крафта пока нет</p>
              <p className="mt-2 text-sm text-[var(--fg-muted)] text-center max-w-sm">
                Создавайте рецепты крафта, чтобы открыть новые способы получения или использования предметов
              </p>
              <div className="mt-6 w-full flex flex-col items-stretch">
                <div className="h-px w-full bg-[var(--border)] mb-3" aria-hidden />
                <button
                  type="button"
                  onClick={() => setShowCraftingTypePicker(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-medium text-[var(--accent)] bg-[var(--accent-subtle)] hover:bg-[var(--accent-subtle)]/80 transition-colors border border-[var(--accent)]/30"
                >
                  <Plus className="h-5 w-5" />
                  — Добавить рецепт
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" className="btn-primary flex-1">
              {item ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>

      {showCraftingTypePicker && (
        <CraftingTypePickerModal
          onSelect={(type) => {
            setShowCraftingTypePicker(false)
            setActiveCraftingModal(type)
          }}
          onClose={() => setShowCraftingTypePicker(false)}
        />
      )}
      {activeCraftingModal === 'create' && (
        <CraftingCreateItemModal onClose={() => setActiveCraftingModal(null)} />
      )}
      {activeCraftingModal === 'material' && (
        <CraftingMaterialModal onClose={() => setActiveCraftingModal(null)} />
      )}
      {activeCraftingModal === 'transform' && (
        <CraftingTransformModal onClose={() => setActiveCraftingModal(null)} />
      )}
      {showLootboxModal && (
        <LootboxEffectModal
          lootTable={lootTable}
          shopItems={shopItems}
          onSave={setLootTable}
          onClose={() => setShowLootboxModal(false)}
        />
      )}
    </div>
  )
}

// ─── Main Shop Page ─────────────────────────────────────────────────────────

export default function ShopPage() {
  const shopItems = useRpgStore((s) => s.shopItems)
  const inventory = useRpgStore((s) => s.inventory)
  const [tab, setTab] = useState<Tab>('shop')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ShopItem | undefined>()
  const [filter, setFilter] = useState<ItemRarity | 'all'>('all')

  const handleEdit = (item: ShopItem) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingItem(undefined)
  }

  const filteredItems = filter === 'all'
    ? shopItems
    : shopItems.filter((i) => i.rarity === filter)

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--fg)]">Магазин</h1>
            <p className="text-sm text-[var(--fg-muted)]">
              {tab === 'shop' ? `${shopItems.length} предметов` : `${inventory.length} в инвентаре`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Добавить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl bg-[var(--surface)] p-1.5">
        <button
          type="button"
          onClick={() => setTab('shop')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all',
            tab === 'shop' 
              ? 'bg-[var(--accent)] text-white shadow-md' 
              : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          Магазин
        </button>
        <button
          type="button"
          onClick={() => setTab('inventory')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all',
            tab === 'inventory' 
              ? 'bg-[var(--accent)] text-white shadow-md' 
              : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
          )}
        >
          <Package className="h-4 w-4" />
          Инвентарь
          {inventory.length > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {inventory.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {tab === 'shop' && (
        <>
          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn('tab', filter === 'all' && 'tab-active')}
            >
              Все
            </button>
            {(Object.keys(RARITY_LABELS) as ItemRarity[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFilter(r)}
                className={cn('tab', filter === r && 'tab-active')}
                style={filter === r ? { color: RARITY_COLORS[r] } : {}}
              >
                {RARITY_LABELS[r]}
              </button>
            ))}
          </div>

          {/* Shop items grid */}
          {filteredItems.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center rounded-2xl py-16">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--accent-subtle)] mb-4">
                <Sparkles className="h-10 w-10 text-[var(--accent)]" />
              </div>
              <p className="font-medium text-[var(--fg)]">Магазин пуст</p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">Добавьте первый предмет</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <ShopItemCard key={item.id} item={item} onEdit={() => handleEdit(item)} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'inventory' && (
        <>
          {inventory.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center rounded-2xl py-16">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--surface)] mb-4">
                <Package className="h-10 w-10 text-[var(--fg-muted)]" />
              </div>
              <p className="font-medium text-[var(--fg)]">Инвентарь пуст</p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">Купите что-нибудь в магазине</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {inventory.map((entry) => (
                <InventoryItemCard
                  key={entry.itemId}
                  itemId={entry.itemId}
                  quantity={entry.quantity}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Form modal */}
      {showForm && <ItemForm key={editingItem?.id ?? 'new'} item={editingItem} onClose={handleCloseForm} />}
    </div>
  )
}
