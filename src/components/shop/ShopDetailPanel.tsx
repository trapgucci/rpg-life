import { useState, useEffect, useRef, useCallback } from 'react'
import { resizeImageFile } from '../../lib/resizeImage'
import { cn } from '../../lib/cn'
import {
  X, Pencil, Trash2, Coins, Gem, Gift, Percent, ShoppingCart,
  ChevronRight, Settings, Folder, TrendingUp, Gamepad2, Plus, Clock,
  Clapperboard, ChevronDown, Check,
} from 'lucide-react'
import ItemGroupSelectModal from './ItemGroupSelectModal'
import IconSourcePicker from './IconSourcePicker'
import { HabitIcon } from '../HabitIcon'
import { useRpgStore } from '../../store/useRpgStore'
import type { ShopItem, GameTimePackage, SerialSeason } from '../../types/domain'
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
  const purchaseGameTime = useRpgStore((s) => s.purchaseGameTime)
  const purchaseEpisode = useRpgStore((s) => s.purchaseEpisode)
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
  const [editStreakMultiplierEnabled, setEditStreakMultiplierEnabled] = useState(item.streakMultiplierEnabled ?? false)
  const [editStreakMultiplierValue, setEditStreakMultiplierValue] = useState(item.streakMultiplierValue ?? 1.5)
  const [editStreakMultiplierInterval, setEditStreakMultiplierInterval] = useState(item.streakMultiplierInterval ?? 3)
  const [editIsDiscountVoucher, setEditIsDiscountVoucher] = useState(item.isDiscountVoucher ?? false)
  const [editDiscountPercent, setEditDiscountPercent] = useState(item.discountPercent ?? 10)
  const [editIsVideoGame, setEditIsVideoGame] = useState(item.isVideoGame ?? false)
  const [editGameTimePackages, setEditGameTimePackages] = useState<GameTimePackage[]>(item.gameTimePackages ?? [])
  const [editIsTvSerial, setEditIsTvSerial] = useState(item.isTvSerial ?? false)
  const [editSerialSeasons, setEditSerialSeasons] = useState<SerialSeason[]>(item.serialSeasons ?? [])
  const [editCollapsedSeasons, setEditCollapsedSeasons] = useState<Set<string>>(new Set())

  // ── Modal state ──────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showLootboxModal, setShowLootboxModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
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
    setEditStreakMultiplierEnabled(i.streakMultiplierEnabled ?? false)
    setEditStreakMultiplierValue(i.streakMultiplierValue ?? 1.5)
    setEditStreakMultiplierInterval(i.streakMultiplierInterval ?? 3)
    setEditIsDiscountVoucher(i.isDiscountVoucher ?? false)
    setEditDiscountPercent(i.discountPercent ?? 10)
    setEditIsVideoGame(i.isVideoGame ?? false)
    setEditGameTimePackages(i.gameTimePackages ?? [])
    setEditIsTvSerial(i.isTvSerial ?? false)
    setEditSerialSeasons(i.serialSeasons ?? [])
    setEditCollapsedSeasons(new Set())
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
      editStreakMultiplierEnabled !== (prev.streakMultiplierEnabled ?? false) ||
      editStreakMultiplierValue !== (prev.streakMultiplierValue ?? 1.5) ||
      editStreakMultiplierInterval !== (prev.streakMultiplierInterval ?? 3) ||
      editIsDiscountVoucher !== (prev.isDiscountVoucher ?? false) ||
      editDiscountPercent !== (prev.discountPercent ?? 10) ||
      editIsVideoGame !== (prev.isVideoGame ?? false) ||
      JSON.stringify(editGameTimePackages) !== JSON.stringify(prev.gameTimePackages ?? []) ||
      editIsTvSerial !== (prev.isTvSerial ?? false) ||
      JSON.stringify(editSerialSeasons) !== JSON.stringify(prev.serialSeasons ?? [])
    )
  }, [
    editName, editDescription, editIcon, editIconImage, editGroupId,
    editAvailableForPurchase, editCanGetForFree, editCoinCost, editGemCost,
    editStock, editIsLootBox, editLootTable, editStreakMultiplierEnabled,
    editStreakMultiplierValue, editStreakMultiplierInterval, editIsDiscountVoucher, editDiscountPercent,
    editIsVideoGame, editGameTimePackages, editIsTvSerial, editSerialSeasons,
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
    if (!editName.trim() || !editGroupId) return
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
      streakMultiplierEnabled: editStreakMultiplierEnabled || undefined,
      streakMultiplierValue: editStreakMultiplierEnabled ? editStreakMultiplierValue : undefined,
      streakMultiplierInterval: editStreakMultiplierEnabled ? editStreakMultiplierInterval : undefined,
      isDiscountVoucher: editIsDiscountVoucher || undefined,
      discountPercent: editIsDiscountVoucher ? Math.min(85, Math.max(1, editDiscountPercent)) : undefined,
      isVideoGame: editIsVideoGame || undefined,
      gameTimePackages: editIsVideoGame && editGameTimePackages.length > 0 ? editGameTimePackages : undefined,
      gameTimeTotalMinutes: editIsVideoGame ? (prev.gameTimeTotalMinutes ?? 0) : undefined,
      isTvSerial: editIsTvSerial || undefined,
      serialSeasons: editIsTvSerial && editSerialSeasons.length > 0 ? editSerialSeasons : undefined,
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
            /* ── EDIT MODE (Glassmorphic Neumorphism) ─────────────────── */
            <div className="flex-1 flex flex-col gap-5">

              {/* ─── Name + icon ─── */}
              <div className="glass rounded-2xl p-4">
                <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Название предмета</label>
                <div className="flex gap-3 items-stretch">
                  <button
                    type="button"
                    onClick={() => setShowIconSource(true)}
                    className="relative shrink-0 group/preview flex items-center justify-center w-[48px] h-[48px] rounded-xl overflow-hidden transition-all cursor-pointer ring-1 ring-inset shadow-md hover:ring-[var(--accent)] hover:scale-105 active:scale-95"
                    style={{
                      background: `linear-gradient(to bottom, ${iconBgColor}35, ${iconBgColor}15)`,
                      boxShadow: `0 2px 8px ${iconBgColor}25, inset 0 1px 0 ${iconBgColor}20`,
                      '--tw-ring-color': `${iconBgColor}40`,
                    } as React.CSSProperties}
                    title="Изменить иконку"
                  >
                    {editIconImage ? (
                      <img src={editIconImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <HabitIcon iconName={editIcon || 'Scroll'} size={24} />
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

              {/* ─── Description ─── */}
              <div className="glass rounded-2xl p-4">
                <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Описание</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Описание (опционально)"
                  rows={3}
                  className="input w-full resize-none"
                />
              </div>

              {/* ─── Group ─── */}
              <div className="glass rounded-2xl p-4">
                <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Группа</label>
                <button
                  type="button"
                  onClick={() => setShowGroupModal(true)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left transition-all hover:bg-[var(--surface-elevated)] hover:border-[var(--accent)]"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)]">
                    <Folder className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                  <span className={cn('flex-1 text-sm font-medium', editGroupId ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]')}>
                    {editGroupId ? itemGroups.find((g) => g.id === editGroupId)?.name ?? 'Выберите группу' : 'Выберите группу'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
                </button>
              </div>

              {/* ─── Availability ─── */}
              <div className="glass rounded-2xl p-4">
                <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Способ получения</label>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm font-medium text-[var(--fg)]">Доступно для покупки</span>
                    <button type="button" role="switch" aria-checked={editAvailableForPurchase} onClick={() => setEditAvailableForPurchase((v) => !v)} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', editAvailableForPurchase ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                      <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', editAvailableForPurchase ? 'right-1 left-auto' : 'left-1 right-auto')} />
                    </button>
                  </div>
                  {editAvailableForPurchase && (
                    <>
                      {divider}
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="text-sm font-medium text-[var(--fg)]">Можно получить бесплатно</span>
                        <button type="button" role="switch" aria-checked={editCanGetForFree} onClick={() => setEditCanGetForFree((v) => !v)} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', editCanGetForFree ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                          <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', editCanGetForFree ? 'right-1 left-auto' : 'left-1 right-auto')} />
                        </button>
                      </div>
                    </>
                  )}
                  {!editAvailableForPurchase && (
                    <>
                      {divider}
                      <p className="px-4 py-3 text-xs text-[var(--fg-muted)]">
                        Этот предмет не будет продаваться в магазине, но его по-прежнему можно получить за выполнение заданий, достижений или через другие игровые активности.
                      </p>
                    </>
                  )}
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

              {/* ─── Cost + Stock in one row (when purchasable & not free) ─── */}
              {editAvailableForPurchase && !editCanGetForFree && (
                <div className="glass rounded-2xl p-4">
                  <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Стоимость и запас</label>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Coins */}
                    <div>
                      <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Монеты</label>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setEditCoinCost((prev) => Math.max(0, prev - 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10 hover:from-red-500/30 hover:to-red-500/15 hover:scale-105 active:scale-95">
                          <span className="text-sm font-bold">−</span>
                        </button>
                        <input type="number" min={0} value={editCoinCost} onChange={(e) => setEditCoinCost(Math.max(0, Number(e.target.value) || 0))} className="input w-full flex-1 min-w-0 h-9 py-0 text-center text-sm font-bold" />
                        <button type="button" onClick={() => setEditCoinCost((prev) => prev + 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-emerald-400/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10 hover:from-emerald-400/35 hover:to-emerald-500/20 hover:scale-105 active:scale-95">
                          <span className="text-sm font-bold">+</span>
                        </button>
                      </div>
                    </div>
                    {/* Gems */}
                    <div>
                      <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Гемы</label>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setEditGemCost((prev) => Math.max(0, prev - 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10 hover:from-red-500/30 hover:to-red-500/15 hover:scale-105 active:scale-95">
                          <span className="text-sm font-bold">−</span>
                        </button>
                        <input type="number" min={0} value={editGemCost} onChange={(e) => setEditGemCost(Math.max(0, Number(e.target.value) || 0))} className="input w-full flex-1 min-w-0 h-9 py-0 text-center text-sm font-bold" />
                        <button type="button" onClick={() => setEditGemCost((prev) => prev + 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-emerald-400/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10 hover:from-emerald-400/35 hover:to-emerald-500/20 hover:scale-105 active:scale-95">
                          <span className="text-sm font-bold">+</span>
                        </button>
                      </div>
                    </div>
                    {/* Stock */}
                    <div>
                      <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Запас</label>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setEditStock((prev) => { if (prev == null || prev <= 1) return undefined; return prev - 1 })} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10 hover:from-red-500/30 hover:to-red-500/15 hover:scale-105 active:scale-95">
                          <span className="text-sm font-bold">−</span>
                        </button>
                        <input type="number" min={1} value={editStock ?? ''} onChange={(e) => { const value = e.target.value; setEditStock(value ? Math.max(1, Number(value) || 1) : undefined) }} placeholder="∞" className="input input-stock-infinite w-full flex-1 min-w-0 h-9 py-0 text-center text-sm font-bold" />
                        <button type="button" onClick={() => setEditStock((prev) => (prev == null ? 1 : prev + 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-emerald-400/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10 hover:from-emerald-400/35 hover:to-emerald-500/20 hover:scale-105 active:scale-95">
                          <span className="text-sm font-bold">+</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Stock only (when free or not purchasable) ─── */}
              {(!editAvailableForPurchase || editCanGetForFree) && (
                <div className="glass rounded-2xl p-4">
                  <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Запас</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditStock((prev) => { if (prev == null || prev <= 1) return undefined; return prev - 1 })} className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10 hover:from-red-500/30 hover:to-red-500/15 hover:scale-105 active:scale-95">
                      <span className="text-lg font-bold">−</span>
                    </button>
                    <input type="number" min={1} value={editStock ?? ''} onChange={(e) => { const value = e.target.value; setEditStock(value ? Math.max(1, Number(value) || 1) : undefined) }} placeholder="∞" className="input input-stock-infinite w-full flex-1 min-w-0 h-11 py-0 text-center text-lg font-bold" />
                    <button type="button" onClick={() => setEditStock((prev) => (prev == null ? 1 : prev + 1))} className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-emerald-400/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10 hover:from-emerald-400/35 hover:to-emerald-500/20 hover:scale-105 active:scale-95">
                      <span className="text-lg font-bold">+</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ─── Advanced settings ─── */}
              <div className="glass rounded-2xl p-4">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings((v) => !v)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-[var(--fg-muted)]/15 to-[var(--fg-muted)]/5 ring-1 ring-inset ring-[var(--fg-muted)]/15">
                    <Settings className="h-5 w-5 text-[var(--fg-muted)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--fg)]">Свойства предмета</p>
                    <p className="text-xs text-[var(--fg-muted)]">Лутбокс, множитель, скидочник, видеоигра, сериал</p>
                  </div>
                  <ChevronRight className={cn(
                    'h-4 w-4 text-[var(--fg-muted)] transition-transform duration-200',
                    showAdvancedSettings && 'rotate-90'
                  )} />
                </button>

                <div className={cn(
                  'overflow-hidden transition-all duration-300 ease-out',
                  showAdvancedSettings ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
                )}>
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--fg-muted)]">
                      Включить можно только одну опцию.
                    </p>

                    {/* Lootbox */}
                    <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (editStreakMultiplierEnabled || editIsDiscountVoucher || editIsVideoGame || editIsTvSerial) && 'opacity-70')}>
                      <div className="flex items-center justify-between gap-3">
                        <div><span className="font-medium text-[var(--fg)]">Лутбокс</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Случайный предмет при открытии</p></div>
                        <button type="button" role="switch" aria-checked={editIsLootBox} disabled={editStreakMultiplierEnabled || editIsDiscountVoucher || editIsVideoGame || editIsTvSerial} onClick={() => { setEditIsLootBox((v) => !v); if (!editIsLootBox) { setEditStreakMultiplierEnabled(false); setEditIsDiscountVoucher(false); setEditIsVideoGame(false); setEditIsTvSerial(false) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', editIsLootBox ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                          <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', editIsLootBox ? 'right-1 left-auto' : 'left-1 right-auto')} />
                        </button>
                      </div>
                      {editIsLootBox && (
                        <div className="mt-4 pt-4 border-t border-[var(--border)]">
                          <button type="button" onClick={() => setShowLootboxModal(true)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] py-3 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)]">
                            <Gift className="h-5 w-5" />Настроить лутбокс<ChevronRight className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Streak Multiplier */}
                    <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (editIsLootBox || editIsDiscountVoucher || editIsVideoGame || editIsTvSerial) && 'opacity-70')}>
                      <div className="flex items-center justify-between gap-3">
                        <div><span className="font-medium text-[var(--fg)]">Множитель за стрик</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Увеличивает награды за серию выполнений</p></div>
                        <button type="button" role="switch" aria-checked={editStreakMultiplierEnabled} disabled={editIsLootBox || editIsDiscountVoucher || editIsVideoGame || editIsTvSerial} onClick={() => { setEditStreakMultiplierEnabled((v) => !v); if (!editStreakMultiplierEnabled) { setEditIsLootBox(false); setEditIsDiscountVoucher(false); setEditIsVideoGame(false); setEditIsTvSerial(false) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', editStreakMultiplierEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                          <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', editStreakMultiplierEnabled ? 'right-1 left-auto' : 'left-1 right-auto')} />
                        </button>
                      </div>
                      {editStreakMultiplierEnabled && (
                        <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Множитель</label>
                            <div className="grid grid-cols-3 gap-2">
                              {([{ value: 1.5, label: '1.5x', desc: 'Простой' }, { value: 2, label: '2x', desc: 'Средний' }, { value: 2.5, label: '2.5x', desc: 'Сложный' }] as const).map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setEditStreakMultiplierValue(opt.value)}
                                  className={cn(
                                    'flex flex-col items-center gap-1 rounded-xl border py-2.5 px-2 text-center transition-all',
                                    editStreakMultiplierValue === opt.value
                                      ? 'border-[var(--accent)] bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/30'
                                      : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                                  )}
                                >
                                  <span className={cn('text-sm font-bold', editStreakMultiplierValue === opt.value ? 'text-[var(--accent)]' : 'text-[var(--fg)]')}>{opt.label}</span>
                                  <span className="text-[10px] text-[var(--fg-muted)]">{opt.desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Срабатывает каждые</label>
                            <div className="grid grid-cols-3 gap-2">
                              {([{ value: 3, label: '3', desc: 'выполнения' }, { value: 5, label: '5', desc: 'выполнений' }, { value: 7, label: '7', desc: 'выполнений' }] as const).map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setEditStreakMultiplierInterval(opt.value)}
                                  className={cn(
                                    'flex flex-col items-center gap-1 rounded-xl border py-2.5 px-2 text-center transition-all',
                                    editStreakMultiplierInterval === opt.value
                                      ? 'border-[var(--accent)] bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/30'
                                      : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                                  )}
                                >
                                  <span className={cn('text-sm font-bold', editStreakMultiplierInterval === opt.value ? 'text-[var(--accent)]' : 'text-[var(--fg)]')}>{opt.label}</span>
                                  <span className="text-[10px] text-[var(--fg-muted)]">{opt.desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Discount Voucher */}
                    <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (editIsLootBox || editStreakMultiplierEnabled || editIsVideoGame || editIsTvSerial) && 'opacity-70')}>
                      <div className="flex items-center justify-between gap-3">
                        <div><span className="font-medium text-[var(--fg)]">Скидочный талон</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Снижает цены в магазине на N%</p></div>
                        <button type="button" role="switch" aria-checked={editIsDiscountVoucher} disabled={editIsLootBox || editStreakMultiplierEnabled || editIsVideoGame || editIsTvSerial} onClick={() => { setEditIsDiscountVoucher((v) => !v); if (!editIsDiscountVoucher) { setEditIsLootBox(false); setEditStreakMultiplierEnabled(false); setEditIsVideoGame(false); setEditIsTvSerial(false); setShowDiscountModal(true) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', editIsDiscountVoucher ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                          <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', editIsDiscountVoucher ? 'right-1 left-auto' : 'left-1 right-auto')} />
                        </button>
                      </div>
                      {editIsDiscountVoucher && (
                        <div className="mt-4 pt-4 border-t border-[var(--border)]">
                          <button type="button" onClick={() => setShowDiscountModal(true)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] py-3 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)]">
                            <Percent className="h-5 w-5" />Размер скидки: {Math.min(85, Math.max(1, editDiscountPercent))}%<ChevronRight className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Video Game */}
                    <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (editIsLootBox || editStreakMultiplierEnabled || editIsDiscountVoucher || editIsTvSerial) && 'opacity-70')}>
                      <div className="flex items-center justify-between gap-3">
                        <div><span className="font-medium text-[var(--fg)]">Видеоигра</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Докупка часов после покупки</p></div>
                        <button type="button" role="switch" aria-checked={editIsVideoGame} disabled={editIsLootBox || editStreakMultiplierEnabled || editIsDiscountVoucher || editIsTvSerial} onClick={() => { setEditIsVideoGame((v) => !v); if (!editIsVideoGame) { setEditIsLootBox(false); setEditStreakMultiplierEnabled(false); setEditIsDiscountVoucher(false); setEditIsTvSerial(false) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', editIsVideoGame ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                          <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', editIsVideoGame ? 'right-1 left-auto' : 'left-1 right-auto')} />
                        </button>
                      </div>
                      {editIsVideoGame && (
                        <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-[var(--fg-muted)]">Пакеты времени</label>
                            <button
                              type="button"
                              onClick={() => setEditGameTimePackages((prev) => [...prev, { id: crypto.randomUUID(), hours: 1, cost: 15 }])}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />Добавить
                            </button>
                          </div>
                          {editGameTimePackages.length === 0 && (
                            <p className="text-xs text-[var(--fg-muted)] text-center py-2">Нет пакетов. Добавьте хотя бы один.</p>
                          )}
                          <div className="space-y-2">
                            {editGameTimePackages.map((pkg, idx) => (
                              <div key={pkg.id} className="flex items-center gap-2 rounded-xl bg-[var(--surface-elevated)] p-2.5">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                      <label className="block text-[10px] text-[var(--fg-muted)] mb-1">Часов</label>
                                      <input
                                        type="number"
                                        min={0.5}
                                        step={0.5}
                                        value={pkg.hours}
                                        onChange={(e) => {
                                          const val = Math.max(0.5, Number(e.target.value) || 0.5)
                                          setEditGameTimePackages((prev) => prev.map((p, i) => i === idx ? { ...p, hours: val } : p))
                                        }}
                                        className="input w-full h-8 py-0 text-center text-sm font-bold"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-[10px] text-[var(--fg-muted)] mb-1">Монет</label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={pkg.cost}
                                        onChange={(e) => {
                                          const val = Math.max(0, Number(e.target.value) || 0)
                                          setEditGameTimePackages((prev) => prev.map((p, i) => i === idx ? { ...p, cost: val } : p))
                                        }}
                                        className="input w-full h-8 py-0 text-center text-sm font-bold"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditGameTimePackages((prev) => prev.filter((_, i) => i !== idx))}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/15 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* TV Serial */}
                    <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (editIsLootBox || editStreakMultiplierEnabled || editIsDiscountVoucher || editIsVideoGame) && 'opacity-70')}>
                      <div className="flex items-center justify-between gap-3">
                        <div><span className="font-medium text-[var(--fg)]">Сериал</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Покупка серий по сезонам (напр. «Во все тяжкие»)</p></div>
                        <button type="button" role="switch" aria-checked={editIsTvSerial} disabled={editIsLootBox || editStreakMultiplierEnabled || editIsDiscountVoucher || editIsVideoGame} onClick={() => { setEditIsTvSerial((v) => !v); if (!editIsTvSerial) { setEditIsLootBox(false); setEditStreakMultiplierEnabled(false); setEditIsDiscountVoucher(false); setEditIsVideoGame(false) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', editIsTvSerial ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                          <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', editIsTvSerial ? 'right-1 left-auto' : 'left-1 right-auto')} />
                        </button>
                      </div>
                      {editIsTvSerial && (
                        <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
                          <p className="text-xs text-[var(--fg-muted)]">
                            Например: «Во все тяжкие» — 5 сезонов. Каждый сезон содержит набор серий, каждая со своей ценой. Покупайте серии по мере просмотра.
                          </p>
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-[var(--fg-muted)]">Сезоны</label>
                            <button
                              type="button"
                              onClick={() => {
                                const num = editSerialSeasons.length + 1
                                setEditSerialSeasons((prev) => [...prev, {
                                  id: crypto.randomUUID(),
                                  number: num,
                                  episodes: Array.from({ length: 10 }, (_, i) => ({
                                    id: crypto.randomUUID(),
                                    number: i + 1,
                                    cost: 15,
                                  })),
                                }])
                              }}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />Добавить сезон
                            </button>
                          </div>
                          {editSerialSeasons.length === 0 && (
                            <p className="text-xs text-[var(--fg-muted)] text-center py-2">Нет сезонов. Добавьте хотя бы один.</p>
                          )}
                          <div className="space-y-2">
                            {editSerialSeasons.map((season, sIdx) => {
                              const isCollapsed = editCollapsedSeasons.has(season.id)
                              return (
                                <div key={season.id} className="rounded-xl bg-[var(--surface-elevated)] overflow-hidden">
                                  <div className="flex items-center gap-2 px-3 py-2.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditCollapsedSeasons((prev) => {
                                        const next = new Set(prev)
                                        if (next.has(season.id)) next.delete(season.id)
                                        else next.add(season.id)
                                        return next
                                      })}
                                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--surface)] transition-colors"
                                    >
                                      <ChevronDown className={cn('h-3.5 w-3.5 text-[var(--fg-muted)] transition-transform', isCollapsed && '-rotate-90')} />
                                    </button>
                                    <Clapperboard className="h-4 w-4 text-[var(--fg-muted)] shrink-0" />
                                    <span className="text-sm font-bold text-[var(--fg)] flex-1">Сезон {season.number}</span>
                                    <span className="text-[10px] text-[var(--fg-muted)]">{season.episodes.length} серий</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditSerialSeasons((prev) => prev.map((s, i) => i === sIdx ? {
                                          ...s,
                                          episodes: [...s.episodes, { id: crypto.randomUUID(), number: s.episodes.length + 1, cost: 15 }],
                                        } : s))
                                      }}
                                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors"
                                      title="Добавить серию"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditSerialSeasons((prev) => prev.filter((_, i) => i !== sIdx).map((s, i) => ({ ...s, number: i + 1 })))}
                                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/15 transition-colors"
                                      title="Удалить сезон"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                  {!isCollapsed && (
                                    <div className="px-3 pb-2.5 space-y-1">
                                      <div className="flex items-center gap-2 mb-2 px-1">
                                        <span className="text-[10px] text-[var(--fg-muted)]">Цена для всех серий:</span>
                                        <input
                                          type="number"
                                          min={0}
                                          placeholder="15"
                                          className="input h-6 w-16 py-0 text-center text-[10px] font-bold"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault()
                                              const val = Math.max(0, Number((e.target as HTMLInputElement).value) || 0)
                                              setEditSerialSeasons((prev) => prev.map((s, i) => i === sIdx ? {
                                                ...s,
                                                episodes: s.episodes.map((ep) => ({ ...ep, cost: val })),
                                              } : s))
                                            }
                                          }}
                                          onBlur={(e) => {
                                            const val = e.target.value
                                            if (val) {
                                              const num = Math.max(0, Number(val) || 0)
                                              setEditSerialSeasons((prev) => prev.map((s, i) => i === sIdx ? {
                                                ...s,
                                                episodes: s.episodes.map((ep) => ({ ...ep, cost: num })),
                                              } : s))
                                            }
                                          }}
                                        />
                                      </div>
                                      {season.episodes.map((ep, eIdx) => (
                                        <div key={ep.id} className="flex items-center gap-2 rounded-lg bg-[var(--surface)] px-2.5 py-1.5">
                                          <span className="text-xs text-[var(--fg-muted)] w-16 shrink-0">Серия {ep.number}</span>
                                          <div className="flex items-center gap-1 flex-1">
                                            <button type="button" onClick={() => {
                                              setEditSerialSeasons((prev) => prev.map((s, si) => si === sIdx ? {
                                                ...s, episodes: s.episodes.map((e, ei) => ei === eIdx ? { ...e, cost: Math.max(0, e.cost - 1) } : e),
                                              } : s))
                                            }} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 text-[10px] font-bold hover:scale-105 active:scale-95 transition-all">−</button>
                                            <input
                                              type="number"
                                              min={0}
                                              value={ep.cost}
                                              onChange={(e) => {
                                                const val = Math.max(0, Number(e.target.value) || 0)
                                                setEditSerialSeasons((prev) => prev.map((s, si) => si === sIdx ? {
                                                  ...s, episodes: s.episodes.map((ep2, ei) => ei === eIdx ? { ...ep2, cost: val } : ep2),
                                                } : s))
                                              }}
                                              className="input w-full flex-1 min-w-0 h-6 py-0 text-center text-xs font-bold"
                                            />
                                            <button type="button" onClick={() => {
                                              setEditSerialSeasons((prev) => prev.map((s, si) => si === sIdx ? {
                                                ...s, episodes: s.episodes.map((e, ei) => ei === eIdx ? { ...e, cost: e.cost + 1 } : e),
                                              } : s))
                                            }} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-emerald-400/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 text-[10px] font-bold hover:scale-105 active:scale-95 transition-all">+</button>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditSerialSeasons((prev) => prev.map((s, si) => si === sIdx ? {
                                                ...s, episodes: s.episodes.filter((_, ei) => ei !== eIdx).map((e, i) => ({ ...e, number: i + 1 })),
                                              } : s))
                                            }}
                                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/15 transition-colors"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Save / Cancel buttons ─── */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => resetEditState(item)} className="btn-secondary flex-1">Отмена</button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!editName.trim() || !editGroupId}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold transition-all duration-200',
                    !editName.trim() || !editGroupId
                      ? 'bg-[var(--surface)] text-[var(--fg-muted)] cursor-not-allowed opacity-50'
                      : 'text-white bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:shadow-[var(--accent)]/35 hover:scale-[1.02] active:scale-[0.98]'
                  )}
                >
                  Сохранить
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
                        typeBadge.type === 'multiplier' && 'bg-gradient-to-b from-amber-500/20 to-amber-500/10 text-amber-500 ring-1 ring-inset ring-amber-400/25',
                        typeBadge.type === 'discount' && 'bg-gradient-to-b from-red-500/20 to-red-500/10 text-red-500 ring-1 ring-inset ring-red-400/25',
                        typeBadge.type === 'videogame' && 'bg-gradient-to-b from-cyan-500/20 to-cyan-500/10 text-cyan-500 ring-1 ring-inset ring-cyan-400/25',
                        typeBadge.type === 'serial' && 'bg-gradient-to-b from-pink-500/20 to-pink-500/10 text-pink-500 ring-1 ring-inset ring-pink-400/25',
                      )}>
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
                    typeBadge.type === 'multiplier' && 'bg-gradient-to-b from-amber-500/20 to-amber-500/10 text-amber-500 ring-1 ring-inset ring-amber-400/25',
                    typeBadge.type === 'discount' && 'bg-gradient-to-b from-red-500/20 to-red-500/10 text-red-500 ring-1 ring-inset ring-red-400/25',
                    typeBadge.type === 'videogame' && 'bg-gradient-to-b from-cyan-500/20 to-cyan-500/10 text-cyan-500 ring-1 ring-inset ring-cyan-400/25',
                    typeBadge.type === 'serial' && 'bg-gradient-to-b from-pink-500/20 to-pink-500/10 text-pink-500 ring-1 ring-inset ring-pink-400/25',
                  )}>
                    {typeBadge.type === 'lootbox' && <Gift className="h-4 w-4" />}
                    {typeBadge.type === 'multiplier' && <TrendingUp className="h-3.5 w-3.5" />}
                    {typeBadge.type === 'discount' && <Percent className="h-4 w-4" />}
                    {typeBadge.type === 'videogame' && <Gamepad2 className="h-4 w-4" />}
                    {typeBadge.type === 'serial' && <Clapperboard className="h-4 w-4" />}
                    {typeBadge.label}
                  </span>

                  <p className="text-xs text-[var(--fg-muted)] mt-2">
                    {typeBadge.type === 'lootbox' && 'Открытие выдает случайный предмет из таблицы наград.'}
                    {typeBadge.type === 'multiplier' && `Множитель ${item.streakMultiplierValue ?? 1.5}x каждые ${item.streakMultiplierInterval ?? 3} выполнений. Увеличивает награды за серию.`}
                    {typeBadge.type === 'discount' && `Скидка ${item.discountPercent ?? 10}% на следующую покупку (только монеты).`}
                    {typeBadge.type === 'videogame' && 'Видеоигра — после покупки можно докупать часы.'}
                    {typeBadge.type === 'serial' && 'Сериал — покупайте серии по мере просмотра.'}
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

            {/* ── Video Game: time balance + buy packages ─────────────── */}
            {item.isVideoGame && (
              <div className="glass rounded-2xl p-4 mb-6">
                <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Игровое время</h3>

                {/* Current balance */}
                <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-elevated)] px-4 py-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-cyan-500/15 to-cyan-500/5 text-cyan-500 ring-1 ring-inset ring-cyan-400/20 shadow-sm shadow-cyan-500/10">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[var(--fg)]">
                      {(() => {
                        const total = item.gameTimeTotalMinutes ?? 0
                        const h = Math.floor(total / 60)
                        const m = total % 60
                        return h > 0 ? `${h} ч ${m > 0 ? `${m} мин` : ''}` : `${m} мин`
                      })()}
                    </p>
                    <p className="text-xs text-[var(--fg-muted)]">Накоплено</p>
                  </div>
                </div>

                {/* Time packages to buy */}
                {item.gameTimePackages && item.gameTimePackages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--fg)] mb-2">Купить время</p>
                    {item.gameTimePackages.map((pkg) => {
                      const canAffordPkg = coins >= pkg.cost
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          disabled={!canAffordPkg}
                          onClick={() => purchaseGameTime(item.id, pkg.id)}
                          className={cn(
                            'w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-all',
                            canAffordPkg
                              ? 'bg-[var(--surface-elevated)] hover:bg-[var(--accent-subtle)] hover:ring-1 hover:ring-[var(--accent)]/30 active:scale-[0.98]'
                              : 'bg-[var(--surface-elevated)] opacity-50 cursor-not-allowed'
                          )}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-cyan-500/20 to-cyan-500/8 text-cyan-500 ring-1 ring-inset ring-cyan-400/20">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-bold text-[var(--fg)]">
                              {pkg.hours % 1 === 0 ? `${pkg.hours} ч` : `${pkg.hours} ч`}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold bg-gradient-to-b from-amber-500/20 to-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-400/25">
                            <Coins className="h-3.5 w-3.5" />
                            {pkg.cost}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {(!item.gameTimePackages || item.gameTimePackages.length === 0) && (
                  <p className="text-xs text-[var(--fg-muted)] text-center">Нет пакетов времени. Настройте их в режиме редактирования.</p>
                )}
              </div>
            )}

            {/* ── TV Serial: seasons + episodes ────────────────────────── */}
            {item.isTvSerial && item.serialSeasons && item.serialSeasons.length > 0 && (
              <div className="glass rounded-2xl p-4 mb-6">
                <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Серии</h3>

                {/* Progress summary */}
                {(() => {
                  const totalEp = item.serialSeasons.reduce((sum, s) => sum + s.episodes.length, 0)
                  const purchasedEp = item.serialSeasons.reduce((sum, s) => sum + s.episodes.filter((e) => e.purchased).length, 0)
                  return (
                    <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-elevated)] px-4 py-3 mb-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-pink-500/15 to-pink-500/5 text-pink-500 ring-1 ring-inset ring-pink-400/20 shadow-sm shadow-pink-500/10">
                        <Clapperboard className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-bold text-[var(--fg)]">{purchasedEp} / {totalEp}</p>
                        <p className="text-xs text-[var(--fg-muted)]">Серий куплено</p>
                      </div>
                      {/* Progress bar */}
                      <div className="w-20 h-2 rounded-full bg-[var(--border)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-300"
                          style={{ width: `${totalEp > 0 ? (purchasedEp / totalEp) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )
                })()}

                {/* Seasons list */}
                <div className="space-y-3">
                  {item.serialSeasons.map((season) => {
                    const purchasedInSeason = season.episodes.filter((e) => e.purchased).length
                    const allPurchased = purchasedInSeason === season.episodes.length
                    return (
                      <div key={season.id} className="rounded-xl bg-[var(--surface-elevated)] overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <Clapperboard className="h-4 w-4 text-pink-500 shrink-0" />
                          <span className="text-sm font-bold text-[var(--fg)] flex-1">Сезон {season.number}</span>
                          <span className={cn('text-[10px] font-medium', allPurchased ? 'text-emerald-500' : 'text-[var(--fg-muted)]')}>
                            {purchasedInSeason}/{season.episodes.length}
                          </span>
                        </div>
                        <div className="px-3 pb-2.5 space-y-1">
                          {season.episodes.map((ep) => {
                            const canAffordEp = coins >= ep.cost
                            return (
                              <div
                                key={ep.id}
                                className={cn(
                                  'flex items-center gap-2 rounded-lg px-2.5 py-2 transition-all',
                                  ep.purchased ? 'bg-emerald-500/8' : 'bg-[var(--surface)]'
                                )}
                              >
                                <span className={cn('text-xs w-14 shrink-0', ep.purchased ? 'text-emerald-500 font-medium' : 'text-[var(--fg-muted)]')}>
                                  Серия {ep.number}
                                </span>
                                <div className="flex-1" />
                                {ep.purchased ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 ring-1 ring-inset ring-emerald-400/20">
                                    <Check className="h-3 w-3" />Куплено
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={!canAffordEp}
                                    onClick={() => purchaseEpisode(item.id, season.id, ep.id)}
                                    className={cn(
                                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                                      canAffordEp
                                        ? 'bg-gradient-to-b from-amber-500/20 to-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-400/25 hover:scale-105 active:scale-95'
                                        : 'bg-[var(--surface)] text-[var(--fg-muted)] opacity-50 cursor-not-allowed'
                                    )}
                                  >
                                    <Coins className="h-3 w-3" />
                                    {ep.cost}
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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
