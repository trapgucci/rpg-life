import { useState } from 'react'
import { cn } from '../lib/cn'
import { 
  ShoppingBag, Package, Plus, Pencil, Trash2, X, 
  Coins, Gem, Gift, Sparkles, Check
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

// ─── Item Form ──────────────────────────────────────────────────────────────

interface ItemFormProps {
  item?: ShopItem
  onClose: () => void
}

function ItemForm({ item, onClose }: ItemFormProps) {
  const addItem = useRpgStore((s) => s.addShopItem)
  const updateItem = useRpgStore((s) => s.updateShopItem)

  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [rarity, setRarity] = useState<ItemRarity>(item?.rarity ?? 'common')
  const [coinCost, setCoinCost] = useState(item?.cost[CURRENCY_IDS.COINS] ?? 100)
  const [gemCost, setGemCost] = useState(item?.cost[CURRENCY_IDS.GEMS] ?? 0)
  const [isLootBox, setIsLootBox] = useState(item?.isLootBox ?? false)
  const [stock, setStock] = useState<number | undefined>(item?.stock)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const data: Omit<ShopItem, 'id'> = {
      name: name.trim(),
      description: description.trim() || undefined,
      rarity,
      cost: {
        [CURRENCY_IDS.COINS]: coinCost,
        [CURRENCY_IDS.GEMS]: gemCost,
      },
      isLootBox,
      stock,
    }

    if (item) {
      updateItem(item.id, () => ({ ...item, ...data }))
    } else {
      addItem(data)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
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
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название предмета"
            className="input"
            autoFocus
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание (опционально)"
            rows={2}
            className="input resize-none"
          />

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

          <div className="grid grid-cols-2 gap-4">
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

          <label className="flex items-center gap-3 rounded-xl bg-[var(--surface)] p-4">
            <input
              type="checkbox"
              checked={isLootBox}
              onChange={(e) => setIsLootBox(e.target.checked)}
              className="h-5 w-5 rounded accent-[var(--accent)]"
            />
            <div>
              <span className="font-medium text-[var(--fg)]">Лутбокс</span>
              <p className="text-xs text-[var(--fg-muted)]">Случайный предмет при открытии</p>
            </div>
          </label>

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
      {showForm && <ItemForm item={editingItem} onClose={handleCloseForm} />}
    </div>
  )
}
