import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'
import {
  ShoppingBag, ShoppingCart, Plus, Search, X, ArrowUpDown, ArrowUp, ArrowDown,
  Folder, List, ChevronDown, Sparkles, History, Pencil, Trash2, CheckSquare,
  Package, Puzzle, Palette,
} from 'lucide-react'

const GROUP_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#9ca3af', '#64748b',
]
import { useRpgStore } from '../store/useRpgStore'
import ConfirmModal from '../components/ConfirmModal'

import ShopItemCard from '../components/shop/ShopItemCard'
import ShopDetailPanel from '../components/shop/ShopDetailPanel'
import ShopItemForm from '../components/shop/ShopItemForm'
import RecipeCard from '../components/shop/RecipeCard'
import RecipeDetailPanel from '../components/shop/RecipeDetailPanel'
import RecipeForm from '../components/shop/RecipeForm'
import PurchaseHistoryModal from '../components/shop/PurchaseHistoryModal'
import CartModal, { type CartEntry } from '../components/shop/CartModal'

import {
  filterShopItems, sortShopItems, filterRecipes,
  type ShopSortField, type RecipeFilter,
} from '../components/shop/shopUtils'

// ─── Sort labels ─────────────────────────────────────────────────────────────

const SORT_LABELS: Record<ShopSortField, string> = {
  default: 'По умолчанию',
  name: 'Название',
  price: 'Цена',
  rarity: 'Редкость',
}

// ─── Tab type ────────────────────────────────────────────────────────────────

type Tab = 'shop' | 'fragments'

// ═════════════════════════════════════════════════════════════════════════════
// ─── PAGE ────────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

export default function ShopPage() {
  // ── Store ────────────────────────────────────────────────────────────────
  const shopItems = useRpgStore((s) => s.shopItems)
  const craftRecipes = useRpgStore((s) => s.craftRecipes)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const allItemGroups = useRpgStore((s) => s.itemGroups)

  const itemGroups = useMemo(
    () =>
      activeProfileId
        ? allItemGroups
            .filter((g) => g.profileId === activeProfileId)
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [allItemGroups, activeProfileId],
  )

  // ── Local state ──────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('shop')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [showItemForm, setShowItemForm] = useState(false)
  const [showRecipeForm, setShowRecipeForm] = useState(false)

  // Store actions for groups
  const addItemGroup = useRpgStore((s) => s.addItemGroup)
  const updateItemGroup = useRpgStore((s) => s.updateItemGroup)
  const deleteItemGroup = useRpgStore((s) => s.deleteItemGroup)
  const reorderItemGroups = useRpgStore((s) => s.reorderItemGroups)

  // Filters
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>('all')
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Sort
  const [sortField, setSortField] = useState<ShopSortField>('default')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  // Group selector (portal)
  const [showGroupSelector, setShowGroupSelector] = useState(false)
  const groupButtonRef = useRef<HTMLButtonElement>(null)
  const groupSelectorRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  // Inline group management
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)
  const [colorPickerGroupId, setColorPickerGroupId] = useState<string | null>(null)

  // Modals
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false)
  const [showCart, setShowCart] = useState(false)

  // Cart
  const [cart, setCart] = useState<CartEntry[]>([])
  const purchaseItem = useRpgStore((s) => s.purchaseItem)

  const addToCart = (itemId: string) => {
    const item = shopItems.find((i) => i.id === itemId)
    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === itemId)
      const currentQty = existing?.quantity ?? 0
      // If item has limited stock, don't exceed it
      if (item?.stock !== undefined && currentQty >= item.stock) return prev
      if (existing) return prev.map((c) => c.itemId === itemId ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { itemId, quantity: 1 }]
    })
  }
  const removeFromCart = (itemId: string) => setCart((prev) => prev.filter((c) => c.itemId !== itemId))
  const clearCart = () => setCart([])
  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }
    const item = shopItems.find((i) => i.id === itemId)
    const maxQty = item?.stock !== undefined ? item.stock : Infinity
    setCart((prev) => prev.map((c) => c.itemId === itemId ? { ...c, quantity: Math.min(quantity, maxQty) } : c))
  }
  const checkoutCart = () => {
    // Скидка действует на ОДНУ покупку — весь чекаут корзины считается одной покупкой.
    // purchaseItem сбрасывает скидку после каждого вызова, поэтому сохраняем/восстанавливаем вручную.
    const savedDiscount = useRpgStore.getState().activeShopDiscountPercent
    for (const entry of cart) {
      for (let i = 0; i < entry.quantity; i++) {
        // Восстанавливаем скидку перед каждым предметом в рамках одной покупки
        if (savedDiscount != null) {
          useRpgStore.setState({ activeShopDiscountPercent: savedDiscount })
        }
        purchaseItem(entry.itemId)
      }
    }
    // Гарантируем сброс скидки после чекаута
    useRpgStore.setState({ activeShopDiscountPercent: null })
    setCart([])
    setShowCart(false)
  }

  // ── Close sort menu on outside click ─────────────────────────────────────
  useEffect(() => {
    if (!showSortMenu) return
    const handler = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSortMenu])

  // ── Group dropdown position ──────────────────────────────────────────────
  useEffect(() => {
    if (showGroupSelector && groupButtonRef.current) {
      const rect = groupButtonRef.current.getBoundingClientRect()
      setDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
  }, [showGroupSelector])

  // ── Close group selector on outside click ────────────────────────────────
  useEffect(() => {
    if (!showGroupSelector) return
    const handler = (e: MouseEvent) => {
      if (
        groupSelectorRef.current &&
        !groupSelectorRef.current.contains(e.target as Node) &&
        groupButtonRef.current &&
        !groupButtonRef.current.contains(e.target as Node)
      ) {
        setShowGroupSelector(false)
        setColorPickerGroupId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showGroupSelector])

  // ── Derived data ─────────────────────────────────────────────────────────

  const profileItems = useMemo(
    () => activeProfileId ? shopItems.filter((i) => i.profileId === activeProfileId && i.stock !== 0) : [],
    [shopItems, activeProfileId],
  )

  const profileRecipes = useMemo(
    () => activeProfileId ? craftRecipes.filter((r) => r.profileId === activeProfileId) : [],
    [craftRecipes, activeProfileId],
  )

  const filteredItems = useMemo(
    () => sortShopItems(
      filterShopItems(profileItems, { groupId: groupFilter, searchQuery }),
      sortField,
      sortDirection,
    ),
    [profileItems, groupFilter, searchQuery, sortField, sortDirection],
  )

  const filteredRecipes = useMemo(
    () => filterRecipes(profileRecipes, recipeFilter, searchQuery),
    [profileRecipes, recipeFilter, searchQuery],
  )

  // Count items per group for the selector badge
  const itemCountByGroup = useMemo(() => {
    const map = new Map<string | null, number>()
    for (const item of profileItems) {
      const g = item.groupId ?? null
      map.set(g, (map.get(g) ?? 0) + 1)
    }
    return map
  }, [profileItems])

  const totalItemCount = profileItems.length
  const countNoGroup = itemCountByGroup.get(null) ?? 0

  // Look up selected items in ALL items (not just filtered) to persist selection across filter changes
  const selectedItem = selectedItemId ? shopItems.find((i) => i.id === selectedItemId) ?? null : null
  const selectedRecipe = selectedRecipeId ? craftRecipes.find((r) => r.id === selectedRecipeId) ?? null : null

  // ── Helpers ──────────────────────────────────────────────────────────────

  const showForm = tab === 'shop' ? showItemForm : showRecipeForm
  const hasRightPanel = showForm || (tab === 'shop' ? !!selectedItem : !!selectedRecipe)

  const handleNewClick = () => {
    if (tab === 'shop') {
      setShowItemForm(true)
      setSelectedItemId(null)
    } else {
      setShowRecipeForm(true)
      setSelectedRecipeId(null)
    }
  }

  const handleItemCreated = (id: string) => {
    setShowItemForm(false)
    setSelectedItemId(id)
  }

  const handleRecipeCreated = (id: string) => {
    setShowRecipeForm(false)
    setSelectedRecipeId(id)
  }

  // ── Group management helpers ──────────────────────────────────────────────

  const handleAddGroup = () => {
    const name = newGroupName.trim()
    if (!name) return
    addItemGroup(name)
    setNewGroupName('')
    setAddingGroup(false)
  }

  const handleSaveGroupEdit = (id: string) => {
    const trimmed = editingGroupName.trim()
    if (trimmed) {
      updateItemGroup(id, (g) => ({ ...g, name: trimmed }))
    }
    setEditingGroupId(null)
  }

  const handleDeleteGroup = (id: string) => {
    setDeletingGroupId(id)
  }

  const confirmDeleteGroup = () => {
    if (deletingGroupId) {
      if (groupFilter === deletingGroupId) setGroupFilter(null)
      deleteItemGroup(deletingGroupId)
    }
    setDeletingGroupId(null)
  }

  const handleDragStart = (id: string) => setDraggedGroupId(id)
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (draggedGroupId && draggedGroupId !== id) setDragOverGroupId(id)
  }
  const handleDragLeave = () => setDragOverGroupId(null)
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverGroupId(null)
    if (!draggedGroupId || draggedGroupId === targetId) { setDraggedGroupId(null); return }
    const ids = itemGroups.map((g) => g.id)
    const fromIdx = ids.indexOf(draggedGroupId)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) { setDraggedGroupId(null); return }
    const next = [...ids]
    next.splice(fromIdx, 1)
    next.splice(toIdx, 0, draggedGroupId)
    reorderItemGroups(next)
    setDraggedGroupId(null)
  }
  const handleDragEnd = () => { setDraggedGroupId(null); setDragOverGroupId(null) }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── RENDER ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex h-full min-h-0 gap-4">
      {/* ─── LEFT PANEL ─────────────────────────────────────────────────── */}
      <div className="flex w-full md:basis-[42%] md:max-w-[560px] md:min-w-[420px] md:shrink-0 flex-col gap-4">
        {/* Header */}
        <div className="glass-card rounded-2xl p-3 md:p-4">
          {/* Title row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
                <ShoppingBag className="h-4.5 w-4.5 md:h-5 md:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-bold text-[var(--fg)]">Магазин</h1>
                <p className="text-[10px] md:text-xs text-[var(--fg-muted)]">
                  {tab === 'shop'
                    ? `${profileItems.length} предметов`
                    : `${profileRecipes.length} рецептов`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Cart */}
              {tab === 'shop' && (
                <button
                  type="button"
                  onClick={() => setShowCart(true)}
                  className={cn(
                    'relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                    'border border-[var(--border)] text-[var(--fg-muted)]',
                    'hover:border-[var(--border-accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]',
                  )}
                  title="Корзина"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] text-white text-[9px] font-bold px-0.5 leading-none">
                      {cart.reduce((s, c) => s + c.quantity, 0)}
                    </span>
                  )}
                </button>
              )}

              {/* History */}
              {tab === 'shop' && (
                <button
                  type="button"
                  onClick={() => setShowPurchaseHistory(true)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                    'border border-[var(--border)] text-[var(--fg-muted)]',
                    'hover:border-[var(--border-accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]',
                  )}
                  title="История покупок"
                >
                  <History className="h-4 w-4" />
                </button>
              )}

              {/* Sort */}
              <div className="relative" ref={sortMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowSortMenu((v) => !v)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                    'border border-[var(--border)] text-[var(--fg-muted)]',
                    'hover:border-[var(--border-accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]',
                    showSortMenu && 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-subtle)]',
                  )}
                  title="Сортировка"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>

                {showSortMenu && (
                  <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] shadow-lg backdrop-blur-xl overflow-hidden">
                    <div className="px-3 py-2 text-xs font-medium text-[var(--fg-muted)] border-b border-[var(--border)]">
                      Сортировка
                    </div>
                    {(Object.keys(SORT_LABELS) as ShopSortField[]).map((field) => {
                      const isActive = sortField === field
                      return (
                        <button
                          key={field}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
                            } else {
                              setSortField(field)
                              setSortDirection('asc')
                            }
                          }}
                          className={cn(
                            'flex w-full items-center justify-between px-3 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                              : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)]',
                          )}
                        >
                          <span>{SORT_LABELS[field]}</span>
                          {isActive && (
                            sortDirection === 'asc'
                              ? <ArrowUp className="h-3.5 w-3.5" />
                              : <ArrowDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Search */}
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                  'border border-[var(--border)] text-[var(--fg-muted)]',
                  'hover:border-[var(--border-accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]',
                  showSearch && 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-subtle)]',
                )}
                title="Поиск"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* New button */}
              <button
                type="button"
                onClick={handleNewClick}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {tab === 'shop' ? 'Новый' : 'Новый'}
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="mt-4 flex rounded-2xl bg-[var(--surface)] p-1">
            <button
              type="button"
              onClick={() => { setTab('shop'); setSearchQuery('') }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all',
                tab === 'shop'
                  ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)]',
              )}
            >
              <ShoppingBag className="h-4 w-4" />
              Магазин
            </button>
            <button
              type="button"
              onClick={() => { setTab('fragments'); setSearchQuery('') }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all',
                tab === 'fragments'
                  ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)]',
              )}
            >
              <Puzzle className="h-4 w-4" />
              Фрагменты
            </button>
          </div>

          {/* Search input */}
          {showSearch && (
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('')
                    setShowSearch(false)
                  }
                }}
                placeholder={tab === 'shop' ? 'Поиск по предметам...' : 'Поиск по рецептам...'}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-9 py-2.5 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-md text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* ── Shop tab controls ─────────────────────────────────────── */}
          {tab === 'shop' && (
            <>
              {/* Group selector */}
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-[var(--fg-muted)]">Группа</p>
                <button
                  ref={groupButtonRef}
                  type="button"
                  onClick={() => setShowGroupSelector(!showGroupSelector)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all',
                    'border border-[var(--border)]',
                    showGroupSelector
                      ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                      : 'text-[var(--fg-secondary)] hover:border-[var(--border-accent)] hover:bg-[var(--surface)]',
                  )}
                >
                  {(() => {
                    const selectedGroup = groupFilter ? itemGroups.find((g) => g.id === groupFilter) : null
                    const gColor = selectedGroup?.color
                    return (
                      <div
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors',
                          !gColor && (showGroupSelector ? 'bg-[var(--accent)]/15' : 'bg-[var(--surface)]'),
                        )}
                        style={gColor ? { background: `linear-gradient(135deg, ${gColor}30, ${gColor}15)` } : undefined}
                      >
                        <Folder className="h-3.5 w-3.5 shrink-0" style={gColor ? { color: gColor } : undefined} />
                      </div>
                    )
                  })()}
                  <span className="flex-1 truncate font-medium">
                    {groupFilter === null
                      ? 'Все группы'
                      : itemGroups.find((g) => g.id === groupFilter)?.name ?? 'Группа'}
                  </span>
                  <span className="shrink-0 rounded-md bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--fg-muted)] tabular-nums">
                    {groupFilter === null
                      ? totalItemCount
                      : itemCountByGroup.get(groupFilter) ?? 0}
                  </span>
                  <ChevronDown className={cn(
                    'h-4 w-4 shrink-0 text-[var(--fg-muted)] transition-transform',
                    showGroupSelector && 'rotate-180',
                  )} />
                </button>
              </div>

              {/* Group dropdown (portal) */}
              {showGroupSelector && createPortal(
                <div
                  ref={groupSelectorRef}
                  className="fixed z-[100] rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] shadow-2xl shadow-black/20 backdrop-blur-xl max-h-[320px] overflow-y-auto"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`,
                  }}
                >
                  <div className="p-1.5 space-y-0.5">
                    {/* All groups */}
                    <button
                      type="button"
                      onClick={() => { setGroupFilter(null); setShowGroupSelector(false) }}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-all',
                        groupFilter === null
                          ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                          : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)] hover:text-[var(--fg)]',
                      )}
                    >
                      <div className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
                        groupFilter === null ? 'bg-[var(--accent)]/15' : 'bg-[var(--surface)]',
                      )}>
                        <List className="h-3.5 w-3.5" />
                      </div>
                      <span className="flex-1 truncate">Все группы</span>
                      <span className="shrink-0 rounded-md bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--fg-muted)] tabular-nums">
                        {totalItemCount}
                      </span>
                    </button>

                  </div>

                  {/* Custom groups */}
                  {itemGroups.length > 0 && (
                    <>
                      <div className="mx-3 h-px bg-[var(--border)]" />
                      <div className="p-1.5 space-y-0.5">
                        {itemGroups.map((group) => (
                          <div
                            key={group.id}
                            draggable={editingGroupId !== group.id}
                            onDragStart={() => handleDragStart(group.id)}
                            onDragOver={(e) => handleDragOver(e, group.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, group.id)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              'group flex items-center gap-2 text-left text-sm transition-all rounded-lg',
                              groupFilter === group.id
                                ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                                : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)] hover:text-[var(--fg)]',
                              draggedGroupId === group.id && 'opacity-50',
                              dragOverGroupId === group.id && 'ring-2 ring-[var(--accent)] ring-inset',
                              editingGroupId !== group.id && 'cursor-move',
                            )}
                          >
                            {editingGroupId === group.id ? (
                              <div className="flex w-full items-center gap-2 px-2.5 py-1.5">
                                <input
                                  type="text"
                                  value={editingGroupName}
                                  onChange={(e) => setEditingGroupName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveGroupEdit(group.id)
                                    if (e.key === 'Escape') setEditingGroupId(null)
                                  }}
                                  className="input flex-1 py-1.5 text-sm"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveGroupEdit(group.id)}
                                  className="icon-btn h-7 w-7 p-0 text-[var(--accent)]"
                                >
                                  <CheckSquare className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGroupFilter(group.id)
                                    setShowGroupSelector(false)
                                  }}
                                  className="flex flex-1 items-center gap-2.5 px-2.5 py-2 min-w-0"
                                >
                                  <div
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                                    style={{
                                      background: group.color
                                        ? `linear-gradient(135deg, ${group.color}30, ${group.color}15)`
                                        : undefined,
                                    }}
                                  >
                                    <Folder className="h-3.5 w-3.5 shrink-0" style={group.color ? { color: group.color } : undefined} />
                                  </div>
                                  <span className="truncate">{group.name}</span>
                                  <span className="shrink-0 rounded-md bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--fg-muted)] tabular-nums">
                                    {itemCountByGroup.get(group.id) ?? 0}
                                  </span>
                                </button>
                                <div className="flex gap-0.5 pr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setColorPickerGroupId(colorPickerGroupId === group.id ? null : group.id)
                                      }}
                                      className={cn(
                                        'icon-btn h-6 w-6 p-0 relative',
                                        colorPickerGroupId === group.id && 'bg-[var(--accent-subtle)] text-[var(--accent)]',
                                      )}
                                      title="Цвет группы"
                                    >
                                      <Palette className="h-3 w-3" />
                                      <span
                                        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface-overlay)]"
                                        style={{ backgroundColor: group.color ?? '#22c55e' }}
                                      />
                                    </button>
                                    {colorPickerGroupId === group.id && (
                                      <div
                                        className="absolute right-0 top-full mt-1 z-50 rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] p-2 shadow-xl backdrop-blur-xl"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="grid grid-cols-5 gap-1.5" style={{ width: 130 }}>
                                          {GROUP_COLORS.map((c) => (
                                            <button
                                              key={c}
                                              type="button"
                                              onClick={() => {
                                                updateItemGroup(group.id, (g) => ({ ...g, color: c }))
                                                setColorPickerGroupId(null)
                                              }}
                                              className={cn(
                                                'h-5 w-5 rounded-full transition-all hover:scale-125 active:scale-95',
                                                group.color === c && 'ring-2 ring-offset-1 ring-[var(--fg)]',
                                              )}
                                              style={{ backgroundColor: c, ringOffset: 'var(--surface-overlay)' } as React.CSSProperties}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingGroupId(group.id)
                                      setEditingGroupName(group.name)
                                    }}
                                    className="icon-btn h-6 w-6 p-0"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteGroup(group.id)
                                    }}
                                    className="icon-btn icon-btn-danger h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Add group */}
                  <div className="mx-3 h-px bg-[var(--border)]" />
                  <div className="p-1.5">
                    {addingGroup ? (
                      <div className="flex items-center gap-2 rounded-lg bg-[var(--surface)] px-2.5 py-1.5">
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddGroup()
                              setShowGroupSelector(false)
                            }
                            if (e.key === 'Escape') setAddingGroup(false)
                          }}
                          placeholder="Название группы"
                          className="input flex-1 py-1.5 text-sm"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleAddGroup()
                            setShowGroupSelector(false)
                          }}
                          className="icon-btn h-7 w-7 p-0 text-[var(--accent)]"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setAddingGroup(false)} className="icon-btn h-7 w-7 p-0">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingGroup(true)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--surface)] hover:text-[var(--accent)] transition-all"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)]">
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                        Добавить группу
                      </button>
                    )}
                  </div>
                </div>,
                document.body,
              )}

            </>
          )}

          {/* ── Fragments tab controls ─────────────────────────────────── */}
          {tab === 'fragments' && (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="mb-2 text-xs font-medium text-[var(--fg-muted)]">Статус рецепта</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'all', icon: <List className="h-5 w-5" />, title: 'Все' },
                  { key: 'active', icon: <Sparkles className="h-5 w-5" />, title: 'Активные' },
                  { key: 'crafted', icon: <Package className="h-5 w-5" />, title: 'Скрафченные' },
                ] as { key: RecipeFilter; icon: React.ReactNode; title: string }[]).map(({ key, icon, title }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRecipeFilter(key)}
                    className={cn(
                      'flex items-center justify-center rounded-xl px-3 py-2.5 text-sm transition-all',
                      recipeFilter === key
                        ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                        : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)]',
                    )}
                    title={title}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── List area ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto rounded-2xl">
          {tab === 'shop' ? (
            filteredItems.length === 0 ? (
              <div className="glass-card flex h-full flex-col items-center justify-center rounded-2xl py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] mb-4">
                  <ShoppingBag className="h-8 w-8 text-[var(--accent)]" />
                </div>
                <p className="font-medium text-[var(--fg)]">
                  {searchQuery.trim() ? 'Ничего не найдено' : 'Нет предметов'}
                </p>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">
                  {searchQuery.trim() ? 'Попробуйте изменить запрос' : 'Создайте первый предмет'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredItems.map((item) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    selected={item.id === selectedItemId}
                    onSelect={() => {
                      setSelectedItemId(item.id)
                      setShowItemForm(false)
                    }}
                    onAddToCart={addToCart}
                  />
                ))}
              </div>
            )
          ) : (
            filteredRecipes.length === 0 ? (
              <div className="glass-card flex h-full flex-col items-center justify-center rounded-2xl py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] mb-4">
                  <Puzzle className="h-8 w-8 text-[var(--accent)]" />
                </div>
                <p className="font-medium text-[var(--fg)]">
                  {searchQuery.trim() ? 'Ничего не найдено' : 'Нет рецептов'}
                </p>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">
                  {searchQuery.trim() ? 'Попробуйте изменить запрос' : 'Создайте первый рецепт крафта'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    selected={recipe.id === selectedRecipeId}
                    onSelect={() => {
                      setSelectedRecipeId(recipe.id)
                      setShowRecipeForm(false)
                    }}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL (desktop) ──────────────────────────────────────── */}
      <div className="hidden md:block min-w-0 flex-1">
        {/* Shop item form */}
        {tab === 'shop' && showItemForm ? (
          <ShopItemForm
            defaultGroupId={groupFilter === '__no_group__' ? null : groupFilter}
            onCreated={handleItemCreated}
            onClose={() => setShowItemForm(false)}
          />
        ) : tab === 'fragments' && showRecipeForm ? (
          <RecipeForm
            onCreated={handleRecipeCreated}
            onClose={() => setShowRecipeForm(false)}
          />
        ) : tab === 'shop' && selectedItem ? (
          <ShopDetailPanel
            item={selectedItem}
            onDeselect={() => setSelectedItemId(null)}
          />
        ) : tab === 'fragments' && selectedRecipe ? (
          <RecipeDetailPanel
            recipe={selectedRecipe}
            onDeselect={() => setSelectedRecipeId(null)}
          />
        ) : (
          <div className="glass-card flex h-full flex-col items-center justify-center rounded-2xl">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--surface)] mb-4">
              {tab === 'shop'
                ? <ShoppingBag className="h-10 w-10 text-[var(--fg-muted)]" />
                : <Puzzle className="h-10 w-10 text-[var(--fg-muted)]" />}
            </div>
            <p className="font-medium text-[var(--fg)]">
              {tab === 'shop' ? 'Выберите предмет' : 'Выберите рецепт'}
            </p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              или создайте новый из списка слева
            </p>
          </div>
        )}
      </div>

      {/* ─── MOBILE OVERLAYS ────────────────────────────────────────────── */}

      {/* Item form */}
      {tab === 'shop' && showItemForm && (
        <div className="fixed inset-0 z-40 md:hidden overflow-y-auto p-4 animate-habit-slide-up" style={{ background: 'var(--bg)', backgroundColor: 'var(--bg-solid)' }}>
          <ShopItemForm
            defaultGroupId={groupFilter === '__no_group__' ? null : groupFilter}
            onCreated={handleItemCreated}
            onClose={() => setShowItemForm(false)}
          />
        </div>
      )}

      {/* Recipe form */}
      {tab === 'fragments' && showRecipeForm && (
        <div className="fixed inset-0 z-40 md:hidden overflow-y-auto p-4 animate-habit-slide-up" style={{ background: 'var(--bg)', backgroundColor: 'var(--bg-solid)' }}>
          <RecipeForm
            onCreated={handleRecipeCreated}
            onClose={() => setShowRecipeForm(false)}
          />
        </div>
      )}

      {/* Item detail panel */}
      {tab === 'shop' && selectedItem && !showItemForm && (
        <div className="fixed inset-0 z-40 md:hidden overflow-y-auto p-4 animate-habit-slide-up" style={{ background: 'var(--bg)', backgroundColor: 'var(--bg-solid)' }}>
          <ShopDetailPanel
            item={selectedItem}
            onDeselect={() => setSelectedItemId(null)}
          />
        </div>
      )}

      {/* Recipe detail panel */}
      {tab === 'fragments' && selectedRecipe && !showRecipeForm && (
        <div className="fixed inset-0 z-40 md:hidden overflow-y-auto p-4 animate-habit-slide-up" style={{ background: 'var(--bg)', backgroundColor: 'var(--bg-solid)' }}>
          <RecipeDetailPanel
            recipe={selectedRecipe}
            onDeselect={() => setSelectedRecipeId(null)}
          />
        </div>
      )}

      {/* ─── MODALS ─────────────────────────────────────────────────────── */}
      {showPurchaseHistory && <PurchaseHistoryModal onClose={() => setShowPurchaseHistory(false)} />}
      {showCart && (
        <CartModal
          cart={cart}
          onRemove={removeFromCart}
          onClear={clearCart}
          onCheckout={checkoutCart}
          onClose={() => setShowCart(false)}
          onUpdateQuantity={updateCartQuantity}
        />
      )}
      <ConfirmModal
        isOpen={deletingGroupId !== null}
        title="Удалить группу?"
        message="Предметы из неё останутся без группы."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={confirmDeleteGroup}
        onCancel={() => setDeletingGroupId(null)}
      />
    </div>
  )
}
