import { useState, useEffect, useRef, useCallback } from 'react'
import { resizeImageFile } from '../../lib/resizeImage'
import { cn } from '../../lib/cn'
import {
  X, Pencil, Trash2, Coins, Gem, Gift, Percent, ShoppingCart,
  ChevronRight, Settings, Plus, Sparkles, Folder,
} from 'lucide-react'
import ItemGroupSelectModal from './ItemGroupSelectModal'
import IconSourcePicker from './IconSourcePicker'
import { HabitIcon } from '../HabitIcon'
import { useRpgStore } from '../../store/useRpgStore'
import type { ShopItem, ItemRarity } from '../../types/domain'
import { CURRENCY_IDS } from '../../types/domain'
import {
  getItemIcon, getItemTypeBadge, migrateIcon,
  RARITY_LABELS, RARITY_BADGE_CLASSES, RARITY_COLORS,
} from './shopUtils'
import type { LootTableEntry } from './shopUtils'
import ConfirmModal from '../ConfirmModal'
import EmojiPickerModal from './EmojiPickerModal'
import LootboxEffectModal from './LootboxEffectModal'
import DiscountVoucherModal from './DiscountVoucherModal'
import { CraftingTypePickerModal, CraftingCreateItemModal, CraftingMaterialModal } from './CraftingModals'

// ─── Props ───────────────────────────────────────────────────────────────────

interface ShopDetailPanelProps {
  item: ShopItem
  onDeselect?: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ShopDetailPanel({ item, onDeselect }: ShopDetailPanelProps) {
  // ── Store selectors ──────────────────────────────────────────────────────
  const updateItem = useRpgStore((s) => s.updateShopItem)
  const deleteShopItem = useRpgStore((s) => s.deleteShopItem)
  const purchaseItem = useRpgStore((s) => s.purchaseItem)
  const activeShopDiscountPercent = useRpgStore((s) => s.activeShopDiscountPercent)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const shopItems = useRpgStore((s) => s.shopItems)
  const purchaseHistory = useRpgStore((s) => s.purchaseHistory)

  const profile = profiles.find((p) => p.id === activeProfileId)
  const coins = profile?.currencies[CURRENCY_IDS.COINS] ?? 0
  const gems = profile?.currencies[CURRENCY_IDS.GEMS] ?? 0

  const itemGroups = activeProfileId
    ? allItemGroups
        .filter((g) => g.profileId === activeProfileId)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  const group = item.groupId ? allItemGroups.find((g) => g.id === item.groupId) : null
  const iconBgColor = group?.color ?? '#9ca3af'

  // ── Cost calculations ────────────────────────────────────────────────────
  const coinCostRaw = item.cost[CURRENCY_IDS.COINS] ?? 0
  const gemCostRaw = item.cost[CURRENCY_IDS.GEMS] ?? 0
  const effectiveCoinCost =
    activeShopDiscountPercent != null && coinCostRaw > 0
      ? Math.ceil(coinCostRaw * (1 - activeShopDiscountPercent / 100))
      : coinCostRaw
  const canAfford = coins >= effectiveCoinCost && gems >= gemCostRaw
  const availableForPurchase = item.availableForPurchase !== false
  const canGetForFree = item.canGetForFree === true
  const showBuyButton = availableForPurchase && item.stock !== 0

  // ── Edit state ───────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(item.name)
  const [editDescription, setEditDescription] = useState(item.description ?? '')
  const [editIcon, setEditIcon] = useState(migrateIcon(item.icon, ''))
  const [editIconImage, setEditIconImage] = useState(item.iconImage ?? '')
  const [editGroupId, setEditGroupId] = useState<string | null>(item.groupId ?? null)
  const [editAvailableForPurchase, setEditAvailableForPurchase] = useState(availableForPurchase)
  const [editCanGetForFree, setEditCanGetForFree] = useState(canGetForFree)
  const [editCoinCost, setEditCoinCost] = useState(coinCostRaw)
  const [editGemCost, setEditGemCost] = useState(gemCostRaw)
  const [editStock, setEditStock] = useState<number | undefined>(item.stock)
  const [editIsLootBox, setEditIsLootBox] = useState(item.isLootBox)
  const [editLootTable, setEditLootTable] = useState<LootTableEntry[]>(item.lootTable ?? [])
  const [editStreakFreezeEnabled, setEditStreakFreezeEnabled] = useState(item.streakFreezeEnabled ?? false)
  const [editStreakFreezeDays, setEditStreakFreezeDays] = useState(item.streakFreezeDays ?? 3)
  const [editIsDiscountVoucher, setEditIsDiscountVoucher] = useState(item.isDiscountVoucher ?? false)
  const [editDiscountPercent, setEditDiscountPercent] = useState(item.discountPercent ?? 10)

  // ── Modal state ──────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showLootboxModal, setShowLootboxModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showCraftingTypePicker, setShowCraftingTypePicker] = useState(false)
  const [activeCraftingModal, setActiveCraftingModal] = useState<'create' | 'material' | null>(null)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showIconSource, setShowIconSource] = useState(false)

  const iconFileInputRef = useRef<HTMLInputElement>(null)

  // ── Unsaved-changes tracking ─────────────────────────────────────────────
  const prevItemRef = useRef(item)
  const pendingItemRef = useRef<ShopItem | null>(null)

  const resetEditState = useCallback((i: ShopItem) => {
    setIsEditing(false)
    setEditName(i.name)
    setEditDescription(i.description ?? '')
    setEditIcon(migrateIcon(i.icon, ''))
    setEditIconImage(i.iconImage ?? '')
    setEditGroupId(i.groupId ?? null)
    setEditAvailableForPurchase(i.availableForPurchase !== false)
    setEditCanGetForFree(i.canGetForFree === true)
    setEditCoinCost(i.cost[CURRENCY_IDS.COINS] ?? 0)
    setEditGemCost(i.cost[CURRENCY_IDS.GEMS] ?? 0)
    setEditStock((i as any).stock)
    setEditIsLootBox(i.isLootBox)
    setEditLootTable(i.lootTable ?? [])
    setEditStreakFreezeEnabled(i.streakFreezeEnabled ?? false)
    setEditStreakFreezeDays(i.streakFreezeDays ?? 3)
    setEditIsDiscountVoucher(i.isDiscountVoucher ?? false)
    setEditDiscountPercent(i.discountPercent ?? 10)
    setShowAdvancedSettings(false)
  }, [])

  const hasChanges = useCallback(() => {
    const prev = prevItemRef.current
    return (
      editName !== prev.name ||
      editDescription !== (prev.description ?? '') ||
      editIcon !== (prev.icon ?? '') ||
      editIconImage !== (prev.iconImage ?? '') ||
      editGroupId !== (prev.groupId ?? null) ||
      editAvailableForPurchase !== (prev.availableForPurchase !== false) ||
      editCanGetForFree !== (prev.canGetForFree === true) ||
      editCoinCost !== (prev.cost[CURRENCY_IDS.COINS] ?? 0) ||
      editGemCost !== (prev.cost[CURRENCY_IDS.GEMS] ?? 0) ||
      editStock !== (prev as any).stock ||
      editIsLootBox !== prev.isLootBox ||
      JSON.stringify(editLootTable) !== JSON.stringify(prev.lootTable ?? []) ||
      editStreakFreezeEnabled !== (prev.streakFreezeEnabled ?? false) ||
      editStreakFreezeDays !== (prev.streakFreezeDays ?? 3) ||
      editIsDiscountVoucher !== (prev.isDiscountVoucher ?? false) ||
      editDiscountPercent !== (prev.discountPercent ?? 10)
    )
  }, [
    editName, editDescription, editIcon, editIconImage, editGroupId,
    editAvailableForPurchase, editCanGetForFree, editCoinCost, editGemCost,
    editStock, editIsLootBox, editLootTable, editStreakFreezeEnabled,
    editStreakFreezeDays, editIsDiscountVoucher, editDiscountPercent,
  ])

  // Detect item switch while editing
  useEffect(() => {
    const prev = prevItemRef.current
    if (prev.id !== item.id) {
      if (isEditing && hasChanges()) {
        pendingItemRef.current = item
        setShowUnsavedConfirm(true)
        return
      }
      resetEditState(item)
      prevItemRef.current = item
    }
  }, [item.id])

  const handleUnsavedSave = () => {
    setShowUnsavedConfirm(false)
    const prevId = prevItemRef.current.id
    doSave(prevId)
    const pending = pendingItemRef.current
    if (pending) {
      resetEditState(pending)
      prevItemRef.current = pending
      pendingItemRef.current = null
    }
  }

  const handleUnsavedDiscard = () => {
    setShowUnsavedConfirm(false)
    const pending = pendingItemRef.current
    if (pending) {
      resetEditState(pending)
      prevItemRef.current = pending
      pendingItemRef.current = null
    }
  }

  // ── Save handler ─────────────────────────────────────────────────────────
  const doSave = (targetId?: string) => {
    if (!editName.trim()) return
    const id = targetId ?? item.id
    const cost = editAvailableForPurchase && !editCanGetForFree
      ? { [CURRENCY_IDS.COINS]: editCoinCost, [CURRENCY_IDS.GEMS]: editGemCost }
      : { [CURRENCY_IDS.COINS]: 0, [CURRENCY_IDS.GEMS]: 0 }

    updateItem(id, (prev) => ({
      ...prev,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      icon: editIcon.trim() || undefined,
      iconImage: editIconImage || undefined,
      rarity: prev.rarity,
      cost,
      isLootBox: editIsLootBox,
      lootTable: editIsLootBox ? editLootTable : undefined,
      stock: editStock,
      availableForPurchase: editAvailableForPurchase,
      canGetForFree: editCanGetForFree,
      groupId: editGroupId,
      streakFreezeEnabled: editStreakFreezeEnabled || undefined,
      streakFreezeDays: editStreakFreezeEnabled ? editStreakFreezeDays : undefined,
      isDiscountVoucher: editIsDiscountVoucher || undefined,
      discountPercent: editIsDiscountVoucher ? Math.min(85, Math.max(1, editDiscountPercent)) : undefined,
    } as ShopItem))
    setIsEditing(false)
  }

  const handleSave = () => doSave()

  // ── Delete handler ───────────────────────────────────────────────────────
  const confirmDelete = () => {
    setShowDeleteConfirm(false)
    deleteShopItem(item.id)
    onDeselect?.()
  }

  // ── Purchase handler ─────────────────────────────────────────────────────
  const handlePurchase = () => {
    const result = purchaseItem(item.id)
    if (result && typeof result === 'object' && 'loot' in result) {
      if (result.loot) alert(`Вы получили: ${result.loot.name}!`)
      else alert('Ничего не выпало.')
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalPurchases = purchaseHistory.filter((e) => e.itemId === item.id).length
  const typeBadge = getItemTypeBadge(item)

  // ── Divider helper ───────────────────────────────────────────────────────
  const divider = <div className="border-t border-[var(--border)]" />

  // ═══════════════════════════════════════════════════════════════════════════
  // ── RENDER ─────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="glass-card relative flex h-full flex-col rounded-2xl overflow-hidden">
      {/* Rarity accent strip at top */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] z-10"
        style={{ background: `linear-gradient(90deg, ${RARITY_COLORS[item.rarity]}, ${RARITY_COLORS[item.rarity]}40)` }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-6">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          {isEditing ? (
            /* ── EDIT MODE ─────────────────────────────────────────────── */
            <div className="flex-1 flex flex-col gap-4">

              {/* Name + icon avatar */}
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Название предмета</label>
                <div className="flex gap-2 items-stretch">
                  <button
                    type="button"
                    onClick={() => setShowIconSource(true)}
                    className="relative shrink-0 group/preview flex items-center justify-center w-[42px] rounded-xl overflow-hidden ring-1 ring-inset shadow-sm hover:ring-[var(--accent)] transition-all cursor-pointer"
                    style={{
                      background: `linear-gradient(to bottom, ${iconBgColor}35, ${iconBgColor}18)`,
                      boxShadow: `0 1px 3px ${iconBgColor}25`,
                      '--tw-ring-color': `${iconBgColor}30`,
                    } as React.CSSProperties}
                    title="Изменить иконку"
                  >
                    {editIconImage ? (
                      <img src={editIconImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <HabitIcon iconName={editIcon || 'Scroll'} size={22} />
                    )}
                    {editIconImage && (
                      <span
                        onClick={(e) => { e.stopPropagation(); setEditIconImage('') }}
                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover/preview:opacity-100 transition-opacity"
                      >
                        <X className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Введите название..."
                    className="input flex-1 min-w-0 text-base"
                    autoFocus
                  />
                  <input
                    ref={iconFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file || !file.type.startsWith('image/')) return
                      const dataUrl = await resizeImageFile(file)
                      setEditIconImage(dataUrl)
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Описание предмета</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Описание (опционально)"
                  rows={3}
                  className="input w-full resize-none"
                />
              </div>

              {/* Group selector (button + modal) */}
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Группа</label>
                <button
                  type="button"
                  onClick={() => setShowGroupModal(true)}
                  className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--surface)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]"
                >
                  <Folder className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span className="flex-1 text-sm text-[var(--fg)]">
                    {editGroupId ? itemGroups.find((g) => g.id === editGroupId)?.name ?? 'Без группы' : 'Без группы'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
                </button>
              </div>

              {/* Availability toggles */}
              <div>
                <p className="text-sm font-medium text-[var(--fg-muted)] mb-3">Способ получения</p>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                  {/* Available for purchase */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm font-medium text-[var(--fg)]">Доступно для покупки</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={editAvailableForPurchase}
                      onClick={() => setEditAvailableForPurchase((v) => !v)}
                      className={cn(
                        'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
                        editAvailableForPurchase ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                      )}
                    >
                      <span className={cn(
                        'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                        editAvailableForPurchase ? 'right-1 left-auto' : 'left-1 right-auto'
                      )} />
                    </button>
                  </div>

                  {/* Free toggle */}
                  {editAvailableForPurchase && (
                    <>
                      {divider}
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="text-sm font-medium text-[var(--fg)]">Можно получить бесплатно</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={editCanGetForFree}
                          onClick={() => setEditCanGetForFree((v) => !v)}
                          className={cn(
                            'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
                            editCanGetForFree ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                          )}
                        >
                          <span className={cn(
                            'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                            editCanGetForFree ? 'right-1 left-auto' : 'left-1 right-auto'
                          )} />
                        </button>
                      </div>
                    </>
                  )}

                  {/* Not for sale info */}
                  {!editAvailableForPurchase && (
                    <>
                      {divider}
                      <p className="px-4 py-3 text-xs text-[var(--fg-muted)]">
                        Этот предмет не будет продаваться в магазине, но его по-прежнему можно получить за выполнение заданий, достижений или через другие игровые активности.
                      </p>
                    </>
                  )}

                  {/* Cost steppers */}
                  {editAvailableForPurchase && !editCanGetForFree && (
                    <>
                      {divider}
                      <div className="grid grid-cols-2 gap-4 px-4 py-3">
                        <div>
                          <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Монеты</label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditCoinCost((prev) => Math.max(0, prev - 1))}
                              className="input-group-btn input-group-btn-minus"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={editCoinCost}
                              onChange={(e) => setEditCoinCost(Math.max(0, Number(e.target.value) || 0))}
                              className="input w-full flex-1 min-w-0 h-9 py-0"
                            />
                            <button
                              type="button"
                              onClick={() => setEditCoinCost((prev) => prev + 1)}
                              className="input-group-btn input-group-btn-plus"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Гемы</label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditGemCost((prev) => Math.max(0, prev - 1))}
                              className="input-group-btn input-group-btn-minus"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={editGemCost}
                              onChange={(e) => setEditGemCost(Math.max(0, Number(e.target.value) || 0))}
                              className="input w-full flex-1 min-w-0 h-9 py-0"
                            />
                            <button
                              type="button"
                              onClick={() => setEditGemCost((prev) => prev + 1)}
                              className="input-group-btn input-group-btn-plus"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Free info */}
                  {editAvailableForPurchase && editCanGetForFree && (
                    <>
                      {divider}
                      <p className="px-4 py-3 text-xs text-[var(--fg-muted)]">
                        Этот предмет можно получить в магазине бесплатно
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Stock stepper */}
              <div>
                <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Запас</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setEditStock((prev) => {
                        if (prev == null || prev <= 1) return undefined
                        return prev - 1
                      })
                    }
                    className="input-group-btn input-group-btn-minus"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={editStock ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      setEditStock(value ? Math.max(1, Number(value) || 1) : undefined)
                    }}
                    placeholder="∞"
                    className="input input-stock-infinite w-full flex-1 min-w-0 h-9 py-0"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditStock((prev) => (prev == null ? 1 : prev + 1))
                    }
                    className="input-group-btn input-group-btn-plus"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* ── Advanced settings (inline) ──────────────────────────── */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings((v) => !v)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 flex items-center gap-3 hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-elevated)]">
                    <Settings className="h-5 w-5 text-[var(--fg-muted)]" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[var(--fg)]">Дополнительные настройки</p>
                    <p className="text-xs text-[var(--fg-muted)]">Лутбокс, заморозка стрика, скидочный талон</p>
                  </div>
                  <ChevronRight className={cn(
                    'h-4 w-4 text-[var(--fg-muted)] transition-transform duration-200',
                    showAdvancedSettings && 'rotate-90'
                  )} />
                </button>

                {/* Advanced settings panel (inline, animated) */}
                <div className={cn(
                  'overflow-hidden transition-all duration-300 ease-out',
                  showAdvancedSettings ? 'max-h-[2000px] opacity-100 mt-3' : 'max-h-0 opacity-0'
                )}>
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--fg-muted)]">
                      Включить можно только одну опцию: лутбокс, заморозка стрика или скидочный талон.
                    </p>

                    {/* Lootbox */}
                    <div className={cn(
                      'rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4',
                      (editStreakFreezeEnabled || editIsDiscountVoucher) && 'opacity-70'
                    )}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="font-medium text-[var(--fg)]">Лутбокс</span>
                          <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                            Случайный предмет при открытии
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={editIsLootBox}
                          disabled={editStreakFreezeEnabled || editIsDiscountVoucher}
                          onClick={() => {
                            setEditIsLootBox((v) => !v)
                            if (!editIsLootBox) {
                              setEditStreakFreezeEnabled(false)
                              setEditIsDiscountVoucher(false)
                            }
                          }}
                          className={cn(
                            'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed',
                            editIsLootBox ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                          )}
                        >
                          <span className={cn(
                            'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                            editIsLootBox ? 'right-1 left-auto' : 'left-1 right-auto'
                          )} />
                        </button>
                      </div>
                      {editIsLootBox && (
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

                    {/* Streak Freeze */}
                    <div className={cn(
                      'rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4',
                      (editIsLootBox || editIsDiscountVoucher) && 'opacity-70'
                    )}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="font-medium text-[var(--fg)]">Заморозка стрика</span>
                          <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                            Позволяет пропустить выполнение привычек без потери текущего стрика в течение N дней
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={editStreakFreezeEnabled}
                          disabled={editIsLootBox || editIsDiscountVoucher}
                          onClick={() => {
                            setEditStreakFreezeEnabled((v) => !v)
                            if (!editStreakFreezeEnabled) {
                              setEditIsLootBox(false)
                              setEditIsDiscountVoucher(false)
                            }
                          }}
                          className={cn(
                            'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed',
                            editStreakFreezeEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                          )}
                        >
                          <span className={cn(
                            'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                            editStreakFreezeEnabled ? 'right-1 left-auto' : 'left-1 right-auto'
                          )} />
                        </button>
                      </div>
                      {editStreakFreezeEnabled && (
                        <div className="mt-4 pt-4 border-t border-[var(--border)]">
                          <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Длительность (дней)</label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditStreakFreezeDays((prev) => Math.max(1, prev - 1))}
                              className="input-group-btn input-group-btn-minus"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={editStreakFreezeDays}
                              onChange={(e) => setEditStreakFreezeDays(Math.max(1, Number(e.target.value) || 1))}
                              className="input w-full flex-1 min-w-0 h-9 py-0"
                            />
                            <button
                              type="button"
                              onClick={() => setEditStreakFreezeDays((prev) => prev + 1)}
                              className="input-group-btn input-group-btn-plus"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Discount Voucher */}
                    <div className={cn(
                      'rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4',
                      (editIsLootBox || editStreakFreezeEnabled) && 'opacity-70'
                    )}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="font-medium text-[var(--fg)]">Скидочный талон</span>
                          <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                            Снижает цены в магазине на N% на следующую покупку (только монеты)
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={editIsDiscountVoucher}
                          disabled={editIsLootBox || editStreakFreezeEnabled}
                          onClick={() => {
                            setEditIsDiscountVoucher((v) => !v)
                            if (!editIsDiscountVoucher) {
                              setEditIsLootBox(false)
                              setEditStreakFreezeEnabled(false)
                              setShowDiscountModal(true)
                            }
                          }}
                          className={cn(
                            'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed',
                            editIsDiscountVoucher ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                          )}
                        >
                          <span className={cn(
                            'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                            editIsDiscountVoucher ? 'right-1 left-auto' : 'left-1 right-auto'
                          )} />
                        </button>
                      </div>
                      {editIsDiscountVoucher && (
                        <div className="mt-4 pt-4 border-t border-[var(--border)]">
                          <button
                            type="button"
                            onClick={() => setShowDiscountModal(true)}
                            className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] py-3 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
                          >
                            <Percent className="h-5 w-5" />
                            Размер скидки: {Math.min(85, Math.max(1, editDiscountPercent))}%
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Crafting type picker */}
              <div>
                <div className="glass-card flex flex-col items-center justify-center rounded-2xl px-6 py-6 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                    <Sparkles className="h-6 w-6 text-purple-500" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--fg)]">Рецепты крафта</p>
                  <p className="mt-1 text-xs text-[var(--fg-muted)] max-w-xs">
                    Создайте рецепты крафта для этого предмета.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCraftingTypePicker(true)}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg transition-shadow"
                  >
                    <Plus className="h-4 w-4" />
                    Добавить рецепт
                  </button>
                </div>
              </div>

              {/* Save / Cancel buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  className="btn-primary flex-1"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => resetEditState(item)}
                  className="btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            /* ── VIEW MODE HEADER ──────────────────────────────────────── */
            <>
              <div className="flex-1 min-w-0 overflow-hidden">
                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden transition-all ring-1 ring-inset shadow-md"
                    style={{
                      background: `linear-gradient(to bottom, ${iconBgColor}40, ${iconBgColor}20)`,
                      boxShadow: `0 4px 12px ${iconBgColor}30`,
                      '--tw-ring-color': `${iconBgColor}35`,
                    } as React.CSSProperties}
                  >
                    {item.iconImage ? (
                      <img src={item.iconImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <HabitIcon iconName={getItemIcon(item)} size={24} />
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-[var(--fg)] break-words min-w-0">
                    {item.name}
                  </h2>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={cn(
                    'inline-flex items-center rounded-2xl px-3.5 py-1.5 text-sm font-medium',
                    RARITY_BADGE_CLASSES[item.rarity]
                  )}>
                    {RARITY_LABELS[item.rarity]}
                  </span>

                  {typeBadge && (
                    <>
                      <span className="w-px h-5 bg-[var(--border)] rounded-full self-center select-none" />
                      <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-sm font-medium',
                        typeBadge.type === 'lootbox' && 'bg-gradient-to-b from-violet-500/20 to-violet-500/10 text-violet-500 ring-1 ring-inset ring-violet-400/25',
                        typeBadge.type === 'freeze' && 'bg-gradient-to-b from-sky-500/20 to-sky-500/10 text-sky-500 ring-1 ring-inset ring-sky-400/25',
                        typeBadge.type === 'discount' && 'bg-gradient-to-b from-red-500/20 to-red-500/10 text-red-500 ring-1 ring-inset ring-red-400/25',
                      )}>
                        {typeBadge.type === 'lootbox' && <Gift className="h-3.5 w-3.5" />}
                        {typeBadge.type === 'freeze' && <HabitIcon iconName="Snowflake" size={14} />}
                        {typeBadge.type === 'discount' && <Percent className="h-3.5 w-3.5" />}
                        {typeBadge.label}
                      </span>
                    </>
                  )}

                  {group && (
                    <>
                      <span className="w-px h-5 bg-[var(--border)] rounded-full self-center select-none" />
                      <span className="inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-sm font-medium bg-[var(--surface)] text-[var(--fg-secondary)] border border-[var(--border)]">
                        <Folder className="h-3.5 w-3.5 shrink-0" />
                        {group.name}
                      </span>
                    </>
                  )}
                </div>

                {/* Description */}
                {item.description && (
                  <p className="text-[var(--fg-muted)] text-sm leading-relaxed break-words overflow-hidden">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-1 shrink-0">
                <button type="button" onClick={() => setIsEditing(true)} className="icon-btn" title="Редактировать">
                  <Pencil className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="icon-btn icon-btn-danger" title="Удалить">
                  <Trash2 className="h-5 w-5" />
                </button>
                <button type="button" onClick={onDeselect} className="icon-btn" title="Закрыть">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── VIEW MODE BODY ──────────────────────────────────────────── */}
        {!isEditing && (
          <>
            {/* ── Purchase section ──────────────────────────────────────── */}
            <div className="glass rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Стоимость</h3>

              {/* Cost badges */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {availableForPurchase && !canGetForFree && coinCostRaw > 0 && (
                  <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-500/5 px-4 py-2.5 ring-1 ring-inset ring-amber-400/20 shadow-sm shadow-amber-500/10">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-amber-500/25 to-amber-500/10 ring-1 ring-inset ring-amber-400/30">
                      <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      {activeShopDiscountPercent != null && effectiveCoinCost < coinCostRaw ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-amber-600 dark:text-amber-400 line-through opacity-60">{coinCostRaw}</span>
                          <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{effectiveCoinCost}</span>
                        </div>
                      ) : (
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{coinCostRaw}</p>
                      )}
                      <p className="text-xs text-[var(--fg-muted)]">Монет</p>
                    </div>
                  </div>
                )}

                {availableForPurchase && !canGetForFree && gemCostRaw > 0 && (
                  <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-b from-purple-500/15 to-purple-500/5 px-4 py-2.5 ring-1 ring-inset ring-purple-400/20 shadow-sm shadow-purple-500/10">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-purple-500/25 to-purple-500/10 ring-1 ring-inset ring-purple-400/30">
                      <Gem className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{gemCostRaw}</p>
                      <p className="text-xs text-[var(--fg-muted)]">Кристаллов</p>
                    </div>
                  </div>
                )}

                {availableForPurchase && canGetForFree && (
                  <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 px-4 py-2.5 ring-1 ring-inset ring-emerald-400/20 shadow-sm shadow-emerald-500/10">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-emerald-500/25 to-emerald-500/10 ring-1 ring-inset ring-emerald-400/30">
                      <Gift className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Бесплатно</p>
                  </div>
                )}

                {!availableForPurchase && (
                  <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-b from-gray-400/15 to-gray-400/5 px-4 py-2.5 ring-1 ring-inset ring-gray-400/20 shadow-sm shadow-gray-400/10">
                    <p className="text-sm font-medium text-[var(--fg-muted)]">Не для продажи</p>
                  </div>
                )}

                {/* Discount indicator */}
                {activeShopDiscountPercent != null && availableForPurchase && !canGetForFree && coinCostRaw > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-b from-red-500/20 to-red-500/10 px-2 py-1 text-xs font-semibold text-red-500 ring-1 ring-inset ring-red-400/25">
                    <Percent className="h-3 w-3" />
                    -{activeShopDiscountPercent}%
                  </span>
                )}
              </div>

              {/* Buy button */}
              {showBuyButton && (
                <button
                  type="button"
                  onClick={handlePurchase}
                  disabled={!canGetForFree && !canAfford}
                  className={cn(
                    'w-full rounded-2xl py-4 font-semibold transition-all duration-200',
                    canGetForFree
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]'
                      : canAfford
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-[var(--surface)] text-[var(--fg-muted)] cursor-not-allowed opacity-50'
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    {canGetForFree
                      ? 'Получить бесплатно'
                      : canAfford
                        ? 'Купить'
                        : 'Недостаточно средств'}
                  </span>
                </button>
              )}

              {!showBuyButton && !availableForPurchase && (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-2xl py-4 font-semibold bg-[var(--surface)] text-[var(--fg-muted)] cursor-not-allowed opacity-50"
                >
                  Не для продажи
                </button>
              )}

              {/* Stock remaining */}
              {item.stock !== undefined && item.stock > 0 && (
                <p className="text-center text-xs text-[var(--fg-muted)] mt-3">
                  Осталось: {item.stock}
                </p>
              )}
            </div>

            {/* ── Properties section ────────────────────────────────────── */}
            <div className="glass rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Свойства</h3>

              {/* Type badge with description */}
              {typeBadge && (
                <div className="mb-3">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium',
                    typeBadge.type === 'lootbox' && 'bg-gradient-to-b from-violet-500/20 to-violet-500/10 text-violet-500 ring-1 ring-inset ring-violet-400/25',
                    typeBadge.type === 'freeze' && 'bg-gradient-to-b from-sky-500/20 to-sky-500/10 text-sky-500 ring-1 ring-inset ring-sky-400/25',
                    typeBadge.type === 'discount' && 'bg-gradient-to-b from-red-500/20 to-red-500/10 text-red-500 ring-1 ring-inset ring-red-400/25',
                  )}>
                    {typeBadge.type === 'lootbox' && <Gift className="h-4 w-4" />}
                    {typeBadge.type === 'freeze' && <HabitIcon iconName="Snowflake" size={14} />}
                    {typeBadge.type === 'discount' && <Percent className="h-4 w-4" />}
                    {typeBadge.label}
                  </span>

                  <p className="text-xs text-[var(--fg-muted)] mt-2">
                    {typeBadge.type === 'lootbox' && 'Открытие выдает случайный предмет из таблицы наград.'}
                    {typeBadge.type === 'freeze' && `Заморозка стрика на ${item.streakFreezeDays ?? 3} дней. Защищает серию привычек от сброса.`}
                    {typeBadge.type === 'discount' && `Скидка ${item.discountPercent ?? 10}% на следующую покупку (только монеты).`}
                  </p>
                </div>
              )}

              {!typeBadge && (
                <p className="text-xs text-[var(--fg-muted)] mb-3">Обычный предмет</p>
              )}

              {/* Loot table preview */}
              {item.isLootBox && item.lootTable && item.lootTable.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-[var(--fg)] mb-2">Таблица наград</p>
                  <div className="space-y-1.5">
                    {item.lootTable.map((entry, idx) => {
                      const lootItem = shopItems.find((i) => i.id === entry.id)
                      const entryName =
                        entry.id === CURRENCY_IDS.COINS ? 'Монеты'
                        : entry.id === CURRENCY_IDS.GEMS ? 'Кристаллы'
                        : lootItem?.name ?? entry.id
                      const entryIconName =
                        entry.id === CURRENCY_IDS.COINS ? 'Coins'
                        : entry.id === CURRENCY_IDS.GEMS ? 'Gem'
                        : lootItem ? getItemIcon(lootItem) : 'Sword'

                      return (
                        <div
                          key={`${entry.id}-${idx}`}
                          className="flex items-center gap-2 rounded-xl bg-[var(--surface-elevated)] px-3 py-2"
                        >
                          <span className="shrink-0 text-[var(--fg-muted)]"><HabitIcon iconName={entryIconName} size={18} /></span>
                          <span className="flex-1 min-w-0 text-sm font-medium text-[var(--fg)] truncate">{entryName}</span>
                          {(entry.quantity ?? 1) > 1 && (
                            <span className="text-xs text-[var(--fg-muted)]">x{entry.quantity}</span>
                          )}
                          <span className="text-xs font-semibold text-[var(--accent)]">{entry.weight}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Stats section ─────────────────────────────────────────── */}
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Статистика</h3>
              <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-elevated)] px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-[var(--accent)]/15 to-[var(--accent)]/5 text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/10">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--fg)]">{totalPurchases}</p>
                  <p className="text-xs text-[var(--fg-muted)]">Всего покупок</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────────── */}

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Удалить предмет?"
        message={`Предмет "${item.name}" будет удалён без возможности восстановления.`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />

      {/* Unsaved changes confirmation */}
      <ConfirmModal
        isOpen={showUnsavedConfirm}
        onConfirm={handleUnsavedSave}
        onCancel={handleUnsavedDiscard}
        title="Сохранить изменения?"
        message="Вы переключаетесь на другой предмет. Сохранить текущие изменения?"
        confirmText="Сохранить"
        cancelText="Не сохранять"
        variant="save"
      />

      {/* Icon source picker */}
      {showIconSource && (
        <IconSourcePicker
          onSelectIcon={() => { setShowIconSource(false); setShowIconPicker(true) }}
          onSelectPhoto={() => { setShowIconSource(false); iconFileInputRef.current?.click() }}
          onClose={() => setShowIconSource(false)}
        />
      )}

      {/* Emoji picker */}
      {showIconPicker && (
        <EmojiPickerModal
          currentIcon={editIcon}
          onSelect={setEditIcon}
          onClose={() => setShowIconPicker(false)}
        />
      )}

      {/* Lootbox editor */}
      {showLootboxModal && (
        <LootboxEffectModal
          lootTable={editLootTable}
          shopItems={shopItems}
          onSave={setEditLootTable}
          onClose={() => setShowLootboxModal(false)}
        />
      )}

      {/* Discount voucher editor */}
      {showDiscountModal && (
        <DiscountVoucherModal
          value={editDiscountPercent}
          onSave={(p) => setEditDiscountPercent(p)}
          onClose={() => setShowDiscountModal(false)}
        />
      )}

      {/* Crafting type picker */}
      {showCraftingTypePicker && (
        <CraftingTypePickerModal
          onSelect={(type) => {
            setShowCraftingTypePicker(false)
            setActiveCraftingModal(type)
          }}
          onClose={() => setShowCraftingTypePicker(false)}
        />
      )}

      {/* Crafting create item modal */}
      {activeCraftingModal === 'create' && (
        <CraftingCreateItemModal
          onClose={() => setActiveCraftingModal(null)}
          defaultResultName={editName}
          defaultResultIcon={editIcon || getItemIcon(item)}
        />
      )}

      {/* Crafting material modal */}
      {activeCraftingModal === 'material' && (
        <CraftingMaterialModal
          onClose={() => setActiveCraftingModal(null)}
          defaultIngredientName={editName}
          defaultIngredientIcon={editIcon || getItemIcon(item)}
        />
      )}

      {/* Group select modal */}
      <ItemGroupSelectModal
        isOpen={showGroupModal}
        selectedGroupId={editGroupId}
        onSelect={setEditGroupId}
        onClose={() => setShowGroupModal(false)}
      />
    </div>
  )
}
