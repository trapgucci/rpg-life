import type { ShopItem, ItemRarity, CraftRecipe } from '../../types/domain'

// ─── Rarity ─────────────────────────────────────────────────────────────────

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

export const RARITY_LABELS: Record<ItemRarity, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
}

export const RARITY_GRADIENTS: Record<ItemRarity, string> = {
  common: 'from-gray-400 to-gray-500',
  uncommon: 'from-green-400 to-emerald-500',
  rare: 'from-blue-400 to-indigo-500',
  epic: 'from-purple-400 to-violet-500',
  legendary: 'from-amber-400 to-orange-500',
}

export const RARITY_BADGE_CLASSES: Record<ItemRarity, string> = {
  common: 'bg-gradient-to-b from-gray-400/20 to-gray-400/10 text-gray-500 ring-1 ring-inset ring-gray-400/25 shadow-sm shadow-gray-400/10',
  uncommon: 'bg-gradient-to-b from-green-500/20 to-green-500/10 text-green-500 ring-1 ring-inset ring-green-400/25 shadow-sm shadow-green-500/10',
  rare: 'bg-gradient-to-b from-blue-500/20 to-blue-500/10 text-blue-500 ring-1 ring-inset ring-blue-400/25 shadow-sm shadow-blue-500/10',
  epic: 'bg-gradient-to-b from-purple-500/20 to-purple-500/10 text-purple-500 ring-1 ring-inset ring-purple-400/25 shadow-sm shadow-purple-500/10',
  legendary: 'bg-gradient-to-b from-amber-500/20 to-amber-500/10 text-amber-500 ring-1 ring-inset ring-amber-400/25 shadow-sm shadow-amber-500/10',
}

export const RARITY_ORDER: Record<ItemRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type LootTableEntry = { id: string; weight: number; quantity?: number }
export type ShopTypeFilter = 'all' | 'regular' | 'lootbox' | 'freeze' | 'discount'
export type ShopSortField = 'default' | 'name' | 'price' | 'rarity'
export type RecipeFilter = 'all' | 'active' | 'crafted'

export type ItemTypeBadge =
  | { type: 'lootbox'; label: string }
  | { type: 'freeze'; label: string }
  | { type: 'discount'; label: string }

// ─── Emoji / Icon Constants ─────────────────────────────────────────────────

export const ITEM_EMOJI_OPTIONS = [
  '🎁', '⚔️', '🎫', '🪙', '💎', '⭐', '🔥', '💪', '🧠', '🏃',
  '🛡️', '🎨', '✨', '🍀', '🎭', '⚙️', '🗝️', '📜', '🧬', '💠',
  '📦', '🎯', '🔮', '🌟', '❤️', '💀', '🏆', '🎪', '🎬', '📱',
  '💻', '🌿', '🐉', '🦋', '🌸', '☕', '📚', '🎵', '🛒', '🧪',
]

export const FRAGMENT_ICONS = [
  '🧩', '💎', '⚡', '🔮', '🌟', '🔥', '❄️', '🌊', '🍀', '🎭', '⚙️', '🗝️', '📜', '🧬', '💠',
]

// ─── Icon Helpers ───────────────────────────────────────────────────────────

export function getItemIcon(item: ShopItem): string {
  return item.icon ?? (item.isLootBox ? '🎁' : item.isDiscountVoucher ? '🎫' : '⚔️')
}

export function getItemTypeBadge(item: ShopItem): ItemTypeBadge | null {
  if (item.isLootBox) return { type: 'lootbox', label: 'Лутбокс' }
  if (item.streakFreezeEnabled) return { type: 'freeze', label: 'Заморозка стрика' }
  if (item.isDiscountVoucher) return { type: 'discount', label: 'Скидочник' }
  return null
}

// ─── Filtering ──────────────────────────────────────────────────────────────

export function filterShopItems(
  items: ShopItem[],
  opts: {
    typeFilter?: ShopTypeFilter
    groupId?: string | null
    searchQuery?: string
  },
): ShopItem[] {
  let filtered = [...items]

  // Type filter
  if (opts.typeFilter && opts.typeFilter !== 'all') {
    switch (opts.typeFilter) {
      case 'lootbox':
        filtered = filtered.filter((i) => i.isLootBox)
        break
      case 'freeze':
        filtered = filtered.filter((i) => i.streakFreezeEnabled)
        break
      case 'discount':
        filtered = filtered.filter((i) => i.isDiscountVoucher)
        break
      case 'regular':
        filtered = filtered.filter((i) => !i.isLootBox && !i.streakFreezeEnabled && !i.isDiscountVoucher)
        break
    }
  }

  // Group filter
  if (opts.groupId) {
    if (opts.groupId === '__no_group__') {
      filtered = filtered.filter((i) => !i.groupId)
    } else {
      filtered = filtered.filter((i) => i.groupId === opts.groupId)
    }
  }

  // Search
  if (opts.searchQuery && opts.searchQuery.trim()) {
    const q = opts.searchQuery.toLowerCase()
    filtered = filtered.filter((i) => i.name.toLowerCase().includes(q))
  }

  return filtered
}

export function sortShopItems(items: ShopItem[], field: ShopSortField, direction: 'asc' | 'desc' = 'asc'): ShopItem[] {
  const sorted = [...items]
  const dir = direction === 'desc' ? -1 : 1

  switch (field) {
    case 'name':
      return sorted.sort((a, b) => dir * a.name.localeCompare(b.name, 'ru'))
    case 'price':
      return sorted.sort((a, b) => {
        const aPrice = (a.cost.coins ?? 0) + (a.cost.gems ?? 0) * 100
        const bPrice = (b.cost.coins ?? 0) + (b.cost.gems ?? 0) * 100
        return dir * (aPrice - bPrice)
      })
    case 'rarity':
      return sorted.sort((a, b) => {
        const diff = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
        return diff !== 0 ? dir * diff : a.name.localeCompare(b.name, 'ru')
      })
    case 'default':
    default:
      return sorted
  }
}

// ─── Recipe Filtering ───────────────────────────────────────────────────────

export function filterRecipes(recipes: CraftRecipe[], filter: RecipeFilter, searchQuery?: string): CraftRecipe[] {
  let filtered = [...recipes]

  if (filter === 'active') filtered = filtered.filter((r) => !r.crafted)
  if (filter === 'crafted') filtered = filtered.filter((r) => r.crafted)

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter((r) => r.fragmentName.toLowerCase().includes(q))
  }

  return filtered
}
