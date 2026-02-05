import { useState, useMemo, useRef, useEffect } from 'react'
import { cn } from '../lib/cn'
import { 
  ShoppingBag, Package, Plus, Pencil, Trash2, X, 
  Coins, Gem, Gift, Sparkles, Check, ChevronRight, ChevronDown, Box, Lightbulb, Hammer, CheckCircle2, Trash, GripVertical, Settings
} from 'lucide-react'
import { useRpgStore } from '../store/useRpgStore'
import type { ShopItem, ItemRarity, CraftRecipe, FragmentSourceType, ItemGroup } from '../types/domain'
import { CURRENCY_IDS } from '../types/domain'

type Tab = 'shop' | 'crafting' | 'inventory'

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

// ─── Item Groups Manager Modal ────────────────────────────────────────────────

interface ItemGroupManagerModalProps {
  onClose: () => void
}

function ItemGroupManagerModal({ onClose }: ItemGroupManagerModalProps) {
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const groups = useMemo(
    () =>
      activeProfileId
        ? allItemGroups
            .filter((g) => g.profileId === activeProfileId)
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [allItemGroups, activeProfileId]
  )
  const addItemGroup = useRpgStore((s) => s.addItemGroup)
  const updateItemGroup = useRpgStore((s) => s.updateItemGroup)
  const deleteItemGroup = useRpgStore((s) => s.deleteItemGroup)
  const reorderItemGroups = useRpgStore((s) => s.reorderItemGroups)
  const [name, setName] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    addItemGroup(trimmed)
    setName('')
  }

  const handleRename = (group: ItemGroup, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === group.name) return
    updateItemGroup(group.id, (g) => ({ ...g, name: trimmed }))
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.setData('application/x-group-id', id)
  }
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (draggedId && draggedId !== id) setDragOverId(id)
  }
  const handleDragLeave = () => setDragOverId(null)
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)
    setDraggedId(null)
    const id = e.dataTransfer.getData('application/x-group-id')
    if (!id || id === targetId) return
    const ids = groups.map((g) => g.id)
    const fromIdx = ids.indexOf(id)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const next = [...ids]
    next.splice(fromIdx, 1)
    next.splice(toIdx, 0, id)
    reorderItemGroups(next)
  }
  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Группы предметов</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-[var(--fg-muted)] mb-4">
          Создавайте пользовательские группы, чтобы удобно сортировать предметы в магазине. Порядок групп здесь = порядок в строке магазина. Перетаскивайте группы для изменения порядка.
        </p>

        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название группы, например «Базовые»"
            className="input flex-1"
          />
          <button type="submit" className="btn-primary">
            <Plus className="h-4 w-4" />
          </button>
        </form>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--fg-muted)] text-center">
            Пока нет ни одной группы. Создайте первую, чтобы начать сортировку.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div
                key={group.id}
                draggable
                onDragStart={(e) => handleDragStart(e, group.id)}
                onDragOver={(e) => handleDragOver(e, group.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, group.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'group-card flex items-center gap-2 rounded-xl border bg-[var(--surface)] px-3 py-2 transition-colors',
                  dragOverId === group.id ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30' : 'border-[var(--border)]',
                  draggedId === group.id && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="cursor-grab active:cursor-grabbing text-[var(--fg-muted)] hover:text-[var(--fg)] touch-none"
                    title="Перетащить для изменения порядка"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                  <input
                    defaultValue={group.name}
                    onBlur={(e) => handleRename(group, e.target.value)}
                    className="bg-transparent flex-1 text-sm text-[var(--fg)] outline-none min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Удалить группу? Предметы из неё останутся без группы.')) {
                        deleteItemGroup(group.id)
                      }
                    }}
                    className="icon-btn icon-btn-danger shrink-0"
                    title="Удалить группу"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

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
  onSelect: (type: 'create' | 'material') => void
  onClose: () => void
}

function CraftingTypePickerModal({ onSelect, onClose }: CraftingTypePickerModalProps) {
  const options = [
    { type: 'create' as const, label: 'Создание предмета', desc: 'Крафт нового предмета из материалов', icon: '⚒️' },
    { type: 'material' as const, label: 'Материал для крафта', desc: 'Предмет используется как ингредиент', icon: '🧩' },
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

// ─── Item Form ──────────────────────────────────────────────────────────────

interface ItemFormProps {
  item?: ShopItem
  onClose: () => void
}

function ItemForm({ item, onClose }: ItemFormProps) {
  const addItem = useRpgStore((s) => s.addShopItem)
  const updateItem = useRpgStore((s) => s.updateShopItem)
  const shopItems = useRpgStore((s) => s.shopItems)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)

  const itemGroups = activeProfileId
    ? allItemGroups
        .filter((g) => g.profileId === activeProfileId)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [rarity, setRarity] = useState<ItemRarity>(item?.rarity ?? 'common')
  const [coinCost, setCoinCost] = useState(item?.cost[CURRENCY_IDS.COINS] ?? 15)
  const [gemCost, setGemCost] = useState(item?.cost[CURRENCY_IDS.GEMS] ?? 0)
  const [isLootBox, setIsLootBox] = useState(item?.isLootBox ?? false)
  const [lootTable, setLootTable] = useState<LootTableEntry[]>(item?.lootTable ?? [])
  const [stock, setStock] = useState<number | undefined>(item?.stock)
  const [availableForPurchase, setAvailableForPurchase] = useState(item?.availableForPurchase ?? true)
  const [canGetForFree, setCanGetForFree] = useState(item?.canGetForFree ?? false)
  const [groupId, setGroupId] = useState<string | null>(item?.groupId ?? null)
  const [showLootboxModal, setShowLootboxModal] = useState(false)
  const [showCraftingTypePicker, setShowCraftingTypePicker] = useState(false)
  const [activeCraftingModal, setActiveCraftingModal] = useState<'create' | 'material' | null>(null)
  const [groupsExpanded, setGroupsExpanded] = useState(false)
  const groupsContainerRef = useRef<HTMLDivElement>(null)
  const [groupsFormOverflow, setGroupsFormOverflow] = useState(false)

  useEffect(() => {
    const el = groupsContainerRef.current
    if (!el) return
    const check = () => setGroupsFormOverflow(el.scrollHeight > el.clientHeight)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [itemGroups])

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
      groupId,
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
            {itemGroups.length === 0 ? (
              <p className="text-xs text-[var(--fg-muted)]">
                Группы пока не созданы. Добавьте их на странице магазина через кнопку «Управлять группами».
              </p>
            ) : (
              <>
                <div
                  ref={groupsContainerRef}
                  className={cn(
                    'flex flex-wrap gap-1.5',
                    !groupsExpanded && 'max-h-[4.5rem] overflow-hidden'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setGroupId(null)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                      groupId === null
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                        : 'bg-[var(--surface)] text-[var(--fg-muted)] border-[var(--border)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)]'
                    )}
                  >
                    Без группы
                  </button>
                  {itemGroups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setGroupId(group.id)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                        groupId === group.id
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                          : 'bg-[var(--surface)] text-[var(--fg-muted)] border-[var(--border)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)]'
                      )}
                    >
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      {group.name}
                    </button>
                  ))}
                </div>
                {(groupsFormOverflow || groupsExpanded) && (
                  <button
                    type="button"
                    onClick={() => setGroupsExpanded((v) => !v)}
                    className="mt-2 text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    {groupsExpanded ? 'Свернуть' : 'Показать все группы'}
                  </button>
                )}
              </>
            )}
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
          <div className="mt-4">
            <div className="glass-card flex flex-col items-center justify-center rounded-2xl px-6 py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
                <Hammer className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-sm font-semibold text-[var(--fg)]">Рецептов крафта пока нет</p>
              <p className="mt-1 text-sm text-[var(--fg-muted)] max-w-xs">
                Создайте рецепты крафта, чтобы получать этот предмет разными способами: из фрагментов, за задания или другие активности.
              </p>
              <button
                type="button"
                onClick={() => setShowCraftingTypePicker(true)}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-shadow"
              >
                <Plus className="h-4 w-4" />
                Добавить рецепт
              </button>
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

// ─── Crafting components (recipes) ──────────────────────────────────────────

interface RecipeCardProps {
  recipe: CraftRecipe
  onEdit: () => void
}

function RecipeCard({ recipe, onEdit }: RecipeCardProps) {
  const deleteRecipe = useRpgStore((s) => s.deleteCraftRecipe)
  const craftItem = useRpgStore((s) => s.craftItem)

  const progress = recipe.fragmentsRequired > 0
    ? Math.min(1, recipe.fragmentsCollected / recipe.fragmentsRequired)
    : 0

  const canCraft = recipe.fragmentsCollected >= recipe.fragmentsRequired && !recipe.crafted
  const rarityColor = RARITY_COLORS[recipe.resultRarity]

  const handleCraft = () => {
    if (craftItem(recipe.id)) {
      // success
    }
  }

  return (
    <div
      className={cn(
        'glass-card group relative rounded-2xl p-5 transition-all duration-300',
        recipe.crafted && 'opacity-60',
        recipe.resultRarity === 'legendary' && !recipe.crafted && 'animate-pulse-glow'
      )}
      style={{ 
        borderColor: `${rarityColor}30`,
        boxShadow: recipe.resultRarity === 'legendary' && !recipe.crafted ? `0 0 20px ${rarityColor}30` : undefined
      }}
    >
      {/* Edit/Delete buttons */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onEdit} className="icon-btn">
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => { if (confirm('Удалить рецепт?')) deleteRecipe(recipe.id) }}
          className="icon-btn icon-btn-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Crafted badge */}
      {recipe.crafted && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-500">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Скрафчено
        </div>
      )}

      <div className="flex flex-col items-center text-center pt-4">
        {/* Fragment icon */}
        <div
          className={cn(
            'flex h-20 w-20 items-center justify-center rounded-2xl text-4xl mb-4 shadow-lg',
            `bg-gradient-to-br ${RARITY_GRADIENTS[recipe.resultRarity]}`
          )}
          style={{ boxShadow: `0 8px 20px ${rarityColor}40` }}
        >
          {recipe.fragmentIcon}
        </div>

        {/* Fragment name */}
        <h3 className="font-semibold text-[var(--fg)]">{recipe.fragmentName}</h3>

        {/* Result info */}
        <div className="mt-2 flex items-center gap-2">
          <span
            className="rounded-lg px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${rarityColor}20`, color: rarityColor }}
          >
            {RARITY_LABELS[recipe.resultRarity]}
          </span>
          <span className="text-xs text-[var(--fg-muted)]">→</span>
          <span className="text-sm text-[var(--fg)]">{recipe.resultItemName}</span>
        </div>

        {/* Source info */}
        <p className="mt-3 text-xs text-[var(--fg-muted)]">
          {recipe.fragmentSource.type === 'task_linked' && '🎯 Привязано к задачам'}
          {recipe.fragmentSource.type === 'habit_linked' && '🔁 Привязано к привычкам'}
          {recipe.fragmentSource.type === 'random_drop' && (
            <>
              🎲 Случайный дроп
              <span className="ml-1">
                ({recipe.fragmentSource.dropChance}% шанс)
              </span>
            </>
          )}
        </p>

        {/* Progress */}
        <div className="mt-4 w-full">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-[var(--fg-muted)]">Фрагменты</span>
            <span className="font-semibold" style={{ color: canCraft ? '#10b981' : 'var(--fg)' }}>
              {recipe.fragmentsCollected} / {recipe.fragmentsRequired}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${progress * 100}%`,
                background: canCraft 
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : `linear-gradient(90deg, ${rarityColor}, ${rarityColor}cc)`
              }}
            />
          </div>
        </div>

        {/* Craft button */}
        {!recipe.crafted && (
          <button
            type="button"
            onClick={handleCraft}
            disabled={!canCraft}
            className={cn(
              'mt-4 w-full rounded-xl py-3 font-semibold transition-all duration-200',
              canCraft
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40'
                : 'bg-[var(--surface)] text-[var(--fg-muted)] cursor-not-allowed'
            )}
          >
            {canCraft ? (
              <>
                <Sparkles className="h-4 w-4 inline mr-2" />
                Скрафтить!
              </>
            ) : (
              `Нужно ещё ${recipe.fragmentsRequired - recipe.fragmentsCollected} фрагментов`
            )}
          </button>
        )}
      </div>
    </div>
  )
}

interface RecipeFormProps {
  recipe?: CraftRecipe
  onClose: () => void
}

const FRAGMENT_ICONS = ['🧩', '💎', '⚡', '🔮', '🌟', '🔥', '❄️', '🌊', '🍀', '🎭', '⚙️', '🗝️', '📜', '🧬', '💠']

function RecipeForm({ recipe, onClose }: RecipeFormProps) {
  const addRecipe = useRpgStore((s) => s.addCraftRecipe)
  const updateRecipe = useRpgStore((s) => s.updateCraftRecipe)
  const allTasks = useRpgStore((s) => s.tasks)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const tasks = activeProfileId ? allTasks.filter((t) => t.profileId === activeProfileId) : []

  const [fragmentName, setFragmentName] = useState(recipe?.fragmentName ?? '')
  const [fragmentIcon, setFragmentIcon] = useState(recipe?.fragmentIcon ?? '🧩')
  const [fragmentsRequired, setFragmentsRequired] = useState(recipe?.fragmentsRequired ?? 1)
  const [resultItemName] = useState(recipe?.resultItemName ?? 'Награда')
  const [resultRarity, setResultRarity] = useState<ItemRarity>(recipe?.resultRarity ?? 'common')
  const [sourceType, setSourceType] = useState<FragmentSourceType>(
    recipe?.fragmentSource.type ?? 'random_drop'
  )
  const [dropChance, setDropChance] = useState(recipe?.fragmentSource.dropChance ?? 15)
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>(
    recipe?.fragmentSource.linkedTaskIds ?? []
  )
  const [showTaskPicker, setShowTaskPicker] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fragmentName.trim()) return

    const data = {
      fragmentName: fragmentName.trim(),
      fragmentIcon,
      fragmentsRequired,
      resultItemName: resultItemName.trim(),
      resultRarity,
      fragmentSource: sourceType === 'task_linked'
        ? { type: 'task_linked' as const, linkedTaskIds }
        : sourceType === 'habit_linked'
          ? { type: 'habit_linked' as const }
          : { type: 'random_drop' as const, dropChance },
    }

    if (recipe) {
      updateRecipe(recipe.id, (r) => ({ ...r, ...data }))
    } else {
      addRecipe(data)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--fg)]">
            {recipe ? 'Редактировать рецепт' : 'Новый рецепт'}
          </h2>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Fragment info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Название фрагмента</label>
              <input
                type="text"
                value={fragmentName}
                onChange={(e) => setFragmentName(e.target.value)}
                placeholder="Осколок тьмы"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Доступно фрагментов</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFragmentsRequired((prev) => Math.max(1, prev - 1))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)]"
                >
                  −
                </button>
                <input
                  type="number"
                  value={fragmentsRequired}
                  onChange={(e) => setFragmentsRequired(Math.max(1, Number(e.target.value) || 1))}
                  min={1}
                  className="input w-full text-center h-9"
                />
                <button
                  type="button"
                  onClick={() => setFragmentsRequired((prev) => prev + 1)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Fragment icon */}
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Иконка фрагмента</label>
            <div className="flex flex-wrap gap-2">
              {FRAGMENT_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFragmentIcon(i)}
                  className={cn(
                    'h-10 w-10 rounded-xl text-xl transition-all',
                    fragmentIcon === i 
                      ? 'bg-[var(--accent)] shadow-lg scale-110' 
                      : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Result rarity */}
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Редкость</label>
            <select
              value={resultRarity}
              onChange={(e) => setResultRarity(e.target.value as ItemRarity)}
              className="select w-full"
            >
              {Object.entries(RARITY_LABELS)
                .filter(([value]) => value !== 'uncommon')
                .map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
            </select>
          </div>

          {/* Source type */}
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Источник фрагментов</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSourceType('random_drop')}
                className={cn(
                  'rounded-xl p-4 text-left transition-all',
                  sourceType === 'random_drop' 
                    ? 'bg-[var(--accent-subtle)] border-2 border-[var(--accent)]' 
                    : 'bg-[var(--surface)] border-2 border-transparent'
                )}
              >
                <div className="text-lg mb-1">🎲</div>
                <div className="font-medium text-sm">Случайный дроп</div>
                <div className="text-xs text-[var(--fg-muted)]">Шанс при выполнении задач</div>
              </button>
              <button
                type="button"
                onClick={() => setSourceType('task_linked')}
                className={cn(
                  'rounded-xl p-4 text-left transition-all',
                  sourceType === 'task_linked' 
                    ? 'bg-[var(--accent-subtle)] border-2 border-[var(--accent)]' 
                    : 'bg-[var(--surface)] border-2 border-transparent'
                )}
              >
                <div className="text-lg mb-1">🎯</div>
                <div className="font-medium text-sm">Привязка к задачам</div>
                <div className="text-xs text-[var(--fg-muted)]">Конкретные задачи</div>
              </button>
              <button
                type="button"
                onClick={() => setSourceType('habit_linked')}
                className={cn(
                  'rounded-xl p-4 text-left transition-all',
                  sourceType === 'habit_linked' 
                    ? 'bg-[var(--accent-subtle)] border-2 border-[var(--accent)]' 
                    : 'bg-[var(--surface)] border-2 border-transparent'
                )}
              >
                <div className="text-lg mb-1">🔁</div>
                <div className="font-medium text-sm">Привязка к привычкам</div>
                <div className="text-xs text-[var(--fg-muted)]">Награда за выполнение привычек</div>
              </button>
            </div>
          </div>

          {/* Source options */}
          {sourceType === 'random_drop' && (
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">
                Шанс выпадения (%)
              </label>
              <input
                type="number"
                value={dropChance}
                onChange={(e) => setDropChance(Number(e.target.value) || 1)}
                min={1}
                max={100}
                className="input w-full"
              />
            </div>
          )}

          {sourceType === 'task_linked' && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--fg)]">Привязанные задачи</p>
                <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                  Выбрано задач: {linkedTaskIds.length || 0}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTaskPicker(true)}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                Выбрать задачи
              </button>
            </div>
          )}

          {/* Дополнительные настройки (пока неактивно) */}
          <div className="mt-2 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-3 flex items-center gap-3 opacity-80 cursor-default select-none">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-elevated)]">
              <Settings className="h-5 w-5 text-[var(--fg-muted)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--fg)]">Дополнительные настройки</p>
              <p className="text-xs text-[var(--fg-muted)]">Скоро здесь появятся продвинутые параметры рецепта.</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" className="btn-primary flex-1">
              {recipe ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>

      {showTaskPicker && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setShowTaskPicker(false)}
        >
          <div className="modal-content max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--fg)]">Выбрать задачи</h3>
              <button
                type="button"
                onClick={() => setShowTaskPicker(false)}
                className="icon-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-[var(--fg-muted)] mb-3">
              Отметьте одну или несколько задач, за выполнение которых будут выдаваться фрагменты.
            </p>
            <div className="max-h-72 overflow-y-auto rounded-xl bg-[var(--surface)] p-2 mb-4">
              {tasks.filter(t => !t.archived && !t.isCompleted).map((task) => (
                <label
                  key={task.id}
                  className="flex items-center gap-2 rounded-lg p-2 hover:bg-[var(--surface-elevated)] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={linkedTaskIds.includes(task.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLinkedTaskIds((prev) => [...prev, task.id])
                      } else {
                        setLinkedTaskIds((prev) => prev.filter(id => id !== task.id))
                      }
                    }}
                    className="h-4 w-4 rounded accent-[var(--accent)]"
                  />
                  <span className="text-sm truncate">{task.title}</span>
                </label>
              ))}
              {tasks.filter(t => !t.archived && !t.isCompleted).length === 0 && (
                <p className="text-sm text-[var(--fg-muted)] text-center py-4">
                  Нет активных задач
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowTaskPicker(false)}
                className="btn-secondary flex-1"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Shop Page ─────────────────────────────────────────────────────────

export default function ShopPage() {
  const shopItems = useRpgStore((s) => s.shopItems)
  const inventory = useRpgStore((s) => s.inventory)
  const allRecipes = useRpgStore((s) => s.craftRecipes)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const recipes = activeProfileId ? allRecipes.filter((r) => r.profileId === activeProfileId) : []
  const [tab, setTab] = useState<Tab>('shop')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ShopItem | undefined>()
  const [groupFilter, setGroupFilter] = useState<'all' | string>('all')
  const [showGroupManager, setShowGroupManager] = useState(false)
  const [showGroupsOverflow, setShowGroupsOverflow] = useState(false)
  const [showRecipeForm, setShowRecipeForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<CraftRecipe | undefined>()

  const itemGroups = activeProfileId
    ? allItemGroups
        .filter((g) => g.profileId === activeProfileId)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  const handleEdit = (item: ShopItem) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingItem(undefined)
  }

  const filteredItems =
    groupFilter === 'all'
      ? shopItems
      : shopItems.filter((i) => i.groupId === groupFilter)

  const handleEditRecipe = (recipe: CraftRecipe) => {
    setEditingRecipe(recipe)
    setShowRecipeForm(true)
  }

  const handleCloseRecipeForm = () => {
    setShowRecipeForm(false)
    setEditingRecipe(undefined)
  }

  const activeRecipes = recipes.filter((r) => !r.crafted)
  const craftedRecipes = recipes.filter((r) => r.crafted)

  const groupsRowOuterRef = useRef<HTMLDivElement>(null)
  const groupsRowInnerRef = useRef<HTMLDivElement>(null)
  const [visibleGroupCount, setVisibleGroupCount] = useState(0)

  useEffect(() => {
    if (tab !== 'shop') return
    const outer = groupsRowOuterRef.current
    const inner = groupsRowInnerRef.current
    if (!outer || !inner || !itemGroups.length) {
      setVisibleGroupCount(itemGroups.length)
      return
    }
    const check = () => {
      const children = inner.children
      if (!children.length) {
        setVisibleGroupCount(itemGroups.length)
        return
      }
      const outerRight = outer.getBoundingClientRect().right
      let lastVisible = -1
      for (let i = 0; i < children.length; i++) {
        const childRight = (children[i] as HTMLElement).getBoundingClientRect().right
        if (childRight <= outerRight + 2) lastVisible = i
      }
      const count = lastVisible >= 0 ? lastVisible : 0
      setVisibleGroupCount((prev) => {
        const next = Math.min(count, itemGroups.length)
        return prev !== next ? next : prev
      })
    }
    const raf = requestAnimationFrame(check)
    const ro = new ResizeObserver(() => requestAnimationFrame(check))
    ro.observe(outer)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [tab, itemGroups])

  const visibleGroups = itemGroups.slice(0, visibleGroupCount)
  const overflowGroups = itemGroups.slice(visibleGroupCount)
  const groupsOverflow = overflowGroups.length > 0

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg',
              tab === 'shop' && 'from-amber-500 to-orange-600 shadow-amber-500/30',
              tab === 'crafting' && 'from-purple-500 to-violet-600 shadow-purple-500/30',
              tab === 'inventory' && 'from-amber-800 to-amber-900 shadow-amber-900/30'
            )}
          >
            {tab === 'shop' && <ShoppingBag className="h-6 w-6 text-white" />}
            {tab === 'crafting' && <Hammer className="h-6 w-6 text-white" />}
            {tab === 'inventory' && <Box className="h-6 w-6 text-white" />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--fg)]">
              {tab === 'shop'
                ? 'Магазин'
                : tab === 'crafting'
                  ? 'Мастерская'
                  : 'Инвентарь'}
            </h1>
            <p className="text-sm text-[var(--fg-muted)]">
              {tab === 'shop'
                ? `${shopItems.length} предметов`
                : tab === 'inventory'
                  ? `${inventory.length} в инвентаре`
                  : `${recipes.length} рецептов крафта`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (tab === 'crafting') {
              setShowRecipeForm(true)
            } else {
              setShowForm(true)
            }
          }}
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
          onClick={() => setTab('crafting')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all',
          tab === 'crafting' 
              ? 'bg-[var(--accent)] text-white shadow-md' 
              : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
          )}
        >
          <Hammer className="h-4 w-4" />
          Крафт
          {recipes.length > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {recipes.length}
            </span>
          )}
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
          {/* Filter by groups */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 relative flex gap-1.5 flex-nowrap">
            {/* Скрытый контейнер для измерения — все группы, чтобы вычислить visibleGroupCount */}
            <div
              ref={groupsRowOuterRef}
              className="absolute inset-0 overflow-hidden opacity-0 pointer-events-none"
              aria-hidden
            >
              <div ref={groupsRowInnerRef} className="flex gap-1.5 flex-nowrap">
                <span className="shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  Все предметы
                </span>
                {itemGroups.map((g) => (
                  <span key={g.id} className="shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
            {/* Видимая строка — только полностью помещающиеся группы */}
              <button
                type="button"
                onClick={() => setGroupFilter('all')}
                className={cn(
                  'shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                  groupFilter === 'all'
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                    : 'bg-[var(--surface)] text-[var(--fg-muted)] border-[var(--border)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)]'
                )}
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                Все предметы
              </button>
              {visibleGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setGroupFilter(group.id)}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                    groupFilter === group.id
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--surface)] text-[var(--fg-muted)] border-[var(--border)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)]'
                  )}
                >
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  {group.name}
                </button>
              ))}
            </div>
            {groupsOverflow && (
              <div className="relative shrink-0 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowGroupsOverflow((v) => !v)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)] active:bg-[var(--surface-elevated)] transition-colors"
                  title="Остальные группы"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showGroupsOverflow && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/20"
                      onClick={() => setShowGroupsOverflow(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 shadow-xl overflow-hidden">
                      {overflowGroups.map((group) => (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => {
                              setGroupFilter(group.id)
                              setShowGroupsOverflow(false)
                            }}
                            className={cn(
                              'w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors',
                              groupFilter === group.id
                                ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                                : 'bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-elevated)]'
                            )}
                          >
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            {group.name}
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowGroupManager(true)}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
            >
              Управлять группами
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
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

      {tab === 'crafting' && (
        <>
          {recipes.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center rounded-2xl py-16">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-500/10 mb-4">
                <Package className="h-10 w-10 text-purple-500" />
              </div>
              <p className="font-medium text-[var(--fg)]">Нет рецептов</p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">Создайте свой первый рецепт крафта</p>
              <button
                type="button"
                onClick={() => setShowRecipeForm(true)}
                className="btn-primary mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Создать рецепт
              </button>
            </div>
          ) : (
            <>
              {activeRecipes.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-[var(--fg)] mb-4">В процессе</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {activeRecipes.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} onEdit={() => handleEditRecipe(recipe)} />
                    ))}
                  </div>
                </div>
              )}

              {craftedRecipes.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-[var(--fg)] mb-4">Скрафченные</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {craftedRecipes.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} onEdit={() => handleEditRecipe(recipe)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Form modal */}
      {showForm && <ItemForm key={editingItem?.id ?? 'new'} item={editingItem} onClose={handleCloseForm} />}
      {showRecipeForm && <RecipeForm recipe={editingRecipe} onClose={handleCloseRecipeForm} />}

      {showGroupManager && (
        <ItemGroupManagerModal onClose={() => setShowGroupManager(false)} />
      )}
    </div>
  )
}
