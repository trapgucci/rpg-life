import { useState, useMemo } from 'react'
import { cn } from '../../lib/cn'
import { X, Plus, Trash2, ChevronRight, Sparkles, Box, Lightbulb, Check, Search } from 'lucide-react'
import { CURRENCY_IDS } from '../../types/domain'
import type { ShopItem, ItemGroup } from '../../types/domain'
import { getItemIcon } from './shopUtils'
import type { LootTableEntry } from './shopUtils'
import { HabitIcon } from '../HabitIcon'
import { useRpgStore } from '../../store/useRpgStore'

// ─── Reward Picker Modal (multi-select) ──────────────────────────────────────

interface RewardPickerModalProps {
  shopItems: ShopItem[]
  excludeIds?: string[]
  onSelect: (ids: string[]) => void
  onClose: () => void
}

function RewardPickerModal({ shopItems, excludeIds = [], onSelect, onClose }: RewardPickerModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const itemGroups = useMemo(() => allItemGroups.filter((g) => g.profileId === activeProfileId), [allItemGroups, activeProfileId])

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

  const currencyOptions: { id: string; name: string; iconName: string; iconImage?: string; groupId?: string | null }[] = [
    { id: CURRENCY_IDS.COINS, name: 'Монеты', iconName: 'Coins' },
    { id: CURRENCY_IDS.GEMS, name: 'Кристаллы', iconName: 'Gem' },
  ]

  const itemOptions = shopItems
    .filter((i) => !excludeIds.includes(i.id))
    .map((i) => ({ id: i.id, name: i.name, iconName: getItemIcon(i), iconImage: i.iconImage, groupId: i.groupId }))

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const filteredItems = itemOptions.filter((o) => {
      if (q && !o.name.toLowerCase().includes(q)) return false
      if (groupFilter && o.groupId !== groupFilter) return false
      return true
    })
    const filteredCurrencies = q
      ? currencyOptions.filter((o) => o.name.toLowerCase().includes(q))
      : groupFilter ? [] : currencyOptions
    return [...filteredCurrencies, ...filteredItems]
  }, [search, groupFilter, shopItems, excludeIds])

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Выберите награды</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search + group filter */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="input w-full pl-9 h-9 text-sm"
            />
          </div>
          {itemGroups.length > 0 && (
            <select
              value={groupFilter ?? ''}
              onChange={(e) => setGroupFilter(e.target.value || null)}
              className="select h-9 text-sm min-w-[120px]"
            >
              <option value="">Все группы</option>
              {itemGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 mb-4">
          {filtered.length === 0 && (
            <p className="text-sm text-[var(--fg-muted)] text-center py-8">Ничего не найдено</p>
          )}
          {filtered.map((opt) => (
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
              {opt.iconImage ? (
                <img src={opt.iconImage} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--fg-muted)] shrink-0">
                  <HabitIcon iconName={opt.iconName} size={20} />
                </span>
              )}
              <span className="font-medium text-[var(--fg)] truncate">{opt.name}</span>
              {selected.has(opt.id) && <Check className="h-5 w-5 text-[var(--accent)] ml-auto shrink-0" />}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button type="button" onClick={handleConfirm} disabled={selected.size === 0} className="btn-primary flex-1">
            Добавить{selected.size > 0 && ` (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reward Picker Modal (single-select for replace) ─────────────────────────

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
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const itemGroups = useMemo(() => allItemGroups.filter((g) => g.profileId === activeProfileId), [allItemGroups, activeProfileId])

  const currencyOptions: { id: string; name: string; iconName: string; iconImage?: string; groupId?: string | null }[] = [
    { id: CURRENCY_IDS.COINS, name: 'Монеты', iconName: 'Coins' },
    { id: CURRENCY_IDS.GEMS, name: 'Кристаллы', iconName: 'Gem' },
  ]

  const itemOptions = shopItems.map((i) => ({
    id: i.id, name: i.name, iconName: getItemIcon(i), iconImage: i.iconImage, groupId: i.groupId,
  }))

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const filteredItems = itemOptions.filter((o) => {
      if (q && !o.name.toLowerCase().includes(q)) return false
      if (groupFilter && o.groupId !== groupFilter) return false
      return true
    })
    const filteredCurrencies = q
      ? currencyOptions.filter((o) => o.name.toLowerCase().includes(q))
      : groupFilter ? [] : currencyOptions
    return [...filteredCurrencies, ...filteredItems]
  }, [search, groupFilter, shopItems])

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Изменить награду</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search + group filter */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="input w-full pl-9 h-9 text-sm"
            />
          </div>
          {itemGroups.length > 0 && (
            <select
              value={groupFilter ?? ''}
              onChange={(e) => setGroupFilter(e.target.value || null)}
              className="select h-9 text-sm min-w-[120px]"
            >
              <option value="">Все группы</option>
              {itemGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 mb-4">
          {filtered.length === 0 && (
            <p className="text-sm text-[var(--fg-muted)] text-center py-8">Ничего не найдено</p>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelected(opt.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                selected === opt.id ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' : 'border-[var(--border)] bg-[var(--surface)]'
              )}
            >
              {opt.iconImage ? (
                <img src={opt.iconImage} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--fg-muted)] shrink-0">
                  <HabitIcon iconName={opt.iconName} size={20} />
                </span>
              )}
              <span className="font-medium text-[var(--fg)] truncate">{opt.name}</span>
              {selected === opt.id && <Check className="h-5 w-5 text-[var(--accent)] ml-auto shrink-0" />}
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

// ─── Lootbox Effect Modal ────────────────────────────────────────────────────

interface LootboxEffectModalProps {
  lootTable: LootTableEntry[]
  shopItems: ShopItem[]
  onSave: (table: LootTableEntry[]) => void
  onClose: () => void
}

export default function LootboxEffectModal({ lootTable: initial, shopItems, onSave, onClose }: LootboxEffectModalProps) {
  const safeInitial = Array.isArray(initial)
    ? initial.filter((e): e is LootTableEntry => e != null && typeof e.id === 'string' && typeof e.weight === 'number')
    : []
  const [entries, setEntries] = useState<LootTableEntry[]>(safeInitial.length ? safeInitial : [])
  const [showPicker, setShowPicker] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const totalPercentCorrect = entries.reduce((s, e) => s + e.weight, 0)

  const addRewards = (ids: string[]) => {
    setEntries((prev) => {
      const existingSum = prev.reduce((s, e) => s + e.weight, 0)
      const remaining = Math.max(0, 100 - existingSum)
      const count = ids.length
      if (count === 0) return prev
      const weightPer = remaining > 0 ? Math.floor((remaining / count) * 100) / 100 : 0
      const newEntries = ids.map((id, i) => ({
        id,
        weight: i === count - 1 && remaining > 0
          ? Math.round((remaining - weightPer * (count - 1)) * 100) / 100
          : weightPer,
        quantity: 1,
      }))
      return [...prev, ...newEntries]
    })
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

  const equalizeChances = () => {
    setEntries((prev) => {
      const n = prev.length
      if (n === 0) return prev
      const w = 100 / n
      return prev.map((e, i) => ({
        ...e,
        weight: i === prev.length - 1 ? Math.round((100 - (n - 1) * w) * 100) / 100 : Math.round(w * 100) / 100,
      }))
    })
  }

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const getEntryName = (id: string) => {
    if (id === CURRENCY_IDS.COINS) return 'Монеты'
    if (id === CURRENCY_IDS.GEMS) return 'Кристаллы'
    return shopItems.find((i) => i.id === id)?.name ?? id
  }

  const getEntryIconName = (id: string) => {
    if (id === CURRENCY_IDS.COINS) return 'Coins'
    if (id === CURRENCY_IDS.GEMS) return 'Gem'
    const it = shopItems.find((i) => i.id === id)
    return it ? getItemIcon(it) : 'Sword'
  }

  const getEntryIconImage = (id: string): string | undefined => {
    if (id === CURRENCY_IDS.COINS || id === CURRENCY_IDS.GEMS) return undefined
    return shopItems.find((i) => i.id === id)?.iconImage
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
                      {getEntryIconImage(entry.id) ? (
                        <img src={getEntryIconImage(entry.id)} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--fg-muted)] shrink-0">
                          <HabitIcon iconName={getEntryIconName(entry.id)} size={20} />
                        </span>
                      )}
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
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <Sparkles className="h-5 w-5 text-[var(--accent)]" />
                <span className="text-sm font-medium text-[var(--fg)]">Общий шанс выпадения: {totalPercentCorrect}%</span>
              </div>
              {totalPercentCorrect < 99.5 && (
                <button
                  type="button"
                  onClick={equalizeChances}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
                >
                  Уравнять шансы
                </button>
              )}
            </div>
            {totalPercentCorrect < 100 && (
              <div className="flex items-start gap-2 rounded-xl border border-[var(--warning)] bg-[var(--warning-subtle)] px-4 py-3 mb-2 text-sm text-[var(--fg-muted)]">
                <Lightbulb className="h-5 w-5 shrink-0 text-[var(--warning)]" />
                <span>
                  Общая вероятность меньше 100%. Оставшиеся {100 - totalPercentCorrect}% — это шанс, что при открытии не выпадет ничего.
                </span>
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
