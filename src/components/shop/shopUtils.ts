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
export type ShopTypeFilter = 'all' | 'regular' | 'lootbox' | 'multiplier' | 'discount' | 'videogame'
export type ShopSortField = 'default' | 'name' | 'price' | 'rarity'
export type RecipeFilter = 'all' | 'active' | 'crafted'

export type ItemTypeBadge =
  | { type: 'lootbox'; label: string }
  | { type: 'multiplier'; label: string }
  | { type: 'discount'; label: string }
  | { type: 'videogame'; label: string }

// ─── Icon Constants (Lucide icon names) ─────────────────────────────────────

export const ITEM_ICON_OPTIONS = [
  // RPG / Combat
  'Sword', 'Shield', 'Crosshair', 'Flame', 'Zap', 'Crown', 'Trophy',
  // Items & Loot
  'Gift', 'Package', 'Key', 'Gem', 'Coins', 'Star', 'Sparkles',
  // Tools & Craft
  'Wrench', 'Cog', 'Hammer', 'Pickaxe', 'FlaskConical', 'Wand2',
  // Nature & Elements
  'Leaf', 'Flower', 'Snowflake', 'Droplet', 'Sun', 'Moon', 'Cloud',
  // Status & Buffs
  'Heart', 'HeartPulse', 'ShieldCheck', 'Timer', 'Hourglass', 'Rocket',
  // Knowledge & Skills
  'BookOpen', 'GraduationCap', 'Brain', 'Lightbulb', 'Scroll',
  // Social
  'Users', 'Handshake', 'MessageSquare', 'Bell',
  // Lifestyle
  'Coffee', 'Dumbbell', 'Music', 'Camera', 'Palette', 'Gamepad2',
  // Finance
  'Wallet', 'PiggyBank', 'CreditCard', 'TrendingUp',
  // Misc
  'Tag', 'Bookmark', 'Flag', 'MapPin', 'Compass', 'Globe',
  'Lock', 'Eye', 'Footprints', 'Puzzle', 'Dice5', 'Cat', 'Dog',
]

export const FRAGMENT_ICON_OPTIONS = [
  'Puzzle', 'Gem', 'Zap', 'Wand2', 'Star', 'Flame', 'Snowflake', 'Droplet',
  'Leaf', 'Cog', 'Key', 'Scroll', 'FlaskConical', 'Sparkles', 'Crown',
]

// ─── Legacy emoji → Lucide migration map ────────────────────────────────────

const EMOJI_TO_ICON: Record<string, string> = {
  '🎁': 'Gift', '⚔️': 'Sword', '🎫': 'Tag', '🪙': 'Coins', '💎': 'Gem',
  '⭐': 'Star', '🔥': 'Flame', '💪': 'Dumbbell', '🧠': 'Brain', '🏃': 'Footprints',
  '🛡️': 'Shield', '🎨': 'Palette', '✨': 'Sparkles', '🍀': 'Leaf', '🎭': 'Eye',
  '⚙️': 'Cog', '🗝️': 'Key', '📜': 'Scroll', '🧬': 'FlaskConical', '💠': 'Gem',
  '📦': 'Package', '🎯': 'Target', '🔮': 'Wand2', '🌟': 'Star', '❤️': 'Heart',
  '💀': 'Crosshair', '🏆': 'Trophy', '🎪': 'Crown', '🎬': 'Film', '📱': 'Smartphone',
  '💻': 'Laptop', '🌿': 'Leaf', '🐉': 'Flame', '🦋': 'Flower', '🌸': 'Flower',
  '☕': 'Coffee', '📚': 'BookOpen', '🎵': 'Music', '🛒': 'ShoppingCart', '🧪': 'FlaskConical',
  // Fragment emojis
  '🧩': 'Puzzle', '⚡': 'Zap', '❄️': 'Snowflake', '🌊': 'Droplet',
}

// ─── Icon Helpers ───────────────────────────────────────────────────────────

/** Convert a legacy emoji or valid icon name to a Lucide icon name */
export function migrateIcon(raw: string | undefined, fallback = 'Sword'): string {
  if (!raw) return fallback
  return EMOJI_TO_ICON[raw] ?? (ITEM_ICON_OPTIONS.includes(raw) || FRAGMENT_ICON_OPTIONS.includes(raw) ? raw : fallback)
}

export function getItemIcon(item: ShopItem): string {
  const fallback = item.isLootBox ? 'Gift' : item.isDiscountVoucher ? 'Tag' : item.isVideoGame ? 'Gamepad2' : 'Sword'
  return migrateIcon(item.icon, fallback)
}

export function getItemTypeBadge(item: ShopItem): ItemTypeBadge | null {
  if (item.isLootBox) return { type: 'lootbox', label: 'Лутбокс' }
  if (item.streakMultiplierEnabled) return { type: 'multiplier', label: 'Множитель' }
  if (item.isDiscountVoucher) return { type: 'discount', label: 'Скидочник' }
  if (item.isVideoGame) return { type: 'videogame', label: 'Видеоигра' }
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
      case 'multiplier':
        filtered = filtered.filter((i) => i.streakMultiplierEnabled)
        break
      case 'discount':
        filtered = filtered.filter((i) => i.isDiscountVoucher)
        break
      case 'videogame':
        filtered = filtered.filter((i) => i.isVideoGame)
        break
      case 'regular':
        filtered = filtered.filter((i) => !i.isLootBox && !i.streakMultiplierEnabled && !i.isDiscountVoucher && !i.isVideoGame)
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
