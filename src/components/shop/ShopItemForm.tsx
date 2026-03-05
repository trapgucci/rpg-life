import { useState, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { resizeImageFile } from '../../lib/resizeImage'
import { cn } from '../../lib/cn'
import { X, Settings, Gift, ChevronRight, Percent, Folder, Plus, Trash2, Clapperboard, ChevronDown } from 'lucide-react'
import { HabitIcon } from '../HabitIcon'
import { useRpgStore } from '../../store/useRpgStore'
import type { ShopItem, GameTimePackage, SerialSeason } from '../../types/domain'
import { CURRENCY_IDS } from '../../types/domain'
import type { LootTableEntry } from './shopUtils'
import EmojiPickerModal from './EmojiPickerModal'
import IconSourcePicker from './IconSourcePicker'
import LootboxEffectModal from './LootboxEffectModal'
import DiscountVoucherModal from './DiscountVoucherModal'
import ItemGroupSelectModal from './ItemGroupSelectModal'

interface ShopItemFormProps {
  defaultGroupId?: string | null
  onCreated: (id: string) => void
  onClose: () => void
}

export default function ShopItemForm({ defaultGroupId, onCreated, onClose }: ShopItemFormProps) {
  const addItem = useRpgStore((s) => s.addShopItem)
  const allShopItems = useRpgStore((s) => s.shopItems)
  const shopItems = useMemo(() => allShopItems.filter((i) => !i.deletedFromShop), [allShopItems])
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)

  const itemGroups = useMemo(
    () => activeProfileId
      ? allItemGroups.filter((g) => g.profileId === activeProfileId).slice().sort((a, b) => a.sortOrder - b.sortOrder)
      : [],
    [allItemGroups, activeProfileId]
  )

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('Scroll')
  const [iconImage, setIconImage] = useState('')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showIconSource, setShowIconSource] = useState(false)
  const iconFileInputRef = useRef<HTMLInputElement>(null)
  const [coinCost, setCoinCost] = useState(15)
  const [gemCost, setGemCost] = useState(0)
  const [availableForPurchase, setAvailableForPurchase] = useState(true)
  const [canGetForFree, setCanGetForFree] = useState(false)
  const [groupId, setGroupId] = useState<string | null>(defaultGroupId ?? null)
  const [stock, setStock] = useState<number | undefined>(undefined)
  const [isLootBox, setIsLootBox] = useState(false)
  const [lootTable, setLootTable] = useState<LootTableEntry[]>([])
  const [streakMultiplierEnabled, setStreakMultiplierEnabled] = useState(false)
  const [streakMultiplierMode, setStreakMultiplierMode] = useState<'streak' | 'instant'>('streak')
  const [streakMultiplierValue, setStreakMultiplierValue] = useState(1.5)
  const [streakMultiplierInterval, setStreakMultiplierInterval] = useState(3)
  const [isDiscountVoucher, setIsDiscountVoucher] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(10)
  const [isVideoGame, setIsVideoGame] = useState(false)
  const [gameTimePackages, setGameTimePackages] = useState<GameTimePackage[]>([])
  const [isTvSerial, setIsTvSerial] = useState(false)
  const [serialSeasons, setSerialSeasons] = useState<SerialSeason[]>([])
  const [collapsedSeasons, setCollapsedSeasons] = useState<Set<string>>(new Set())
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showLootboxModal, setShowLootboxModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)

  const selectedGroup = groupId ? itemGroups.find((g) => g.id === groupId) : null
  const iconBgColor = selectedGroup?.color ?? '#9ca3af'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !activeProfileId || !groupId) return

    const cost = availableForPurchase && !canGetForFree
      ? { [CURRENCY_IDS.COINS]: coinCost, [CURRENCY_IDS.GEMS]: gemCost }
      : { [CURRENCY_IDS.COINS]: 0, [CURRENCY_IDS.GEMS]: 0 }

    const data: Omit<ShopItem, 'id'> = {
      profileId: activeProfileId,
      name: name.trim(),
      description: description.trim() || undefined,
      icon: icon.trim() || undefined,
      iconImage: iconImage || undefined,
      rarity: 'common',
      cost,
      isLootBox,
      lootTable: isLootBox ? lootTable : undefined,
      stock: (isVideoGame || isTvSerial) ? 1 : stock,
      availableForPurchase,
      canGetForFree,
      groupId,
      streakMultiplierEnabled: streakMultiplierEnabled || undefined,
      streakMultiplierMode: streakMultiplierEnabled ? streakMultiplierMode : undefined,
      streakMultiplierValue: streakMultiplierEnabled ? streakMultiplierValue : undefined,
      streakMultiplierInterval: streakMultiplierEnabled ? streakMultiplierInterval : undefined,
      isDiscountVoucher: isDiscountVoucher || undefined,
      discountPercent: isDiscountVoucher ? Math.min(85, Math.max(1, discountPercent)) : undefined,
      isVideoGame: isVideoGame || undefined,
      gameTimePackages: isVideoGame && gameTimePackages.length > 0 ? gameTimePackages : undefined,
      gameTimeTotalMinutes: isVideoGame ? 0 : undefined,
      isTvSerial: isTvSerial || undefined,
      serialSeasons: isTvSerial && serialSeasons.length > 0 ? serialSeasons : undefined,
    }

    const created = addItem(data)
    onCreated(created.id)
  }

  return (
    <div className="glass-card relative flex h-full flex-col rounded-2xl overflow-hidden">
      {/* Accent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] z-10"
        style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent) / 40%)' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-5 md:p-6 pb-0">
        <h2 className="text-xl font-bold text-[var(--fg)]">Новый предмет</h2>
        <button type="button" onClick={onClose} className="icon-btn">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6 pt-5 flex flex-col gap-5">

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
              {iconImage ? (
                <img src={iconImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <HabitIcon iconName={icon || 'Scroll'} size={24} />
              )}
              {iconImage && (
                <span
                  onClick={(e) => { e.stopPropagation(); setIconImage('') }}
                  className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover/preview:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название..."
              className="input flex-1 min-w-0 text-base"
              autoFocus
            />
            <input ref={iconFileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file || !file.type.startsWith('image/')) return
              const dataUrl = await resizeImageFile(file)
              setIconImage(dataUrl)
              e.target.value = ''
            }} />
          </div>
        </div>

        {/* ─── Description ─── */}
        <div className="glass rounded-2xl p-4">
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание (опционально)" rows={3} className="input w-full resize-none" />
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
            <span className={cn('flex-1 text-sm font-medium', groupId ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]')}>
              {groupId ? itemGroups.find((g) => g.id === groupId)?.name ?? 'Выберите группу' : 'Выберите группу'}
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
              <button type="button" role="switch" aria-checked={availableForPurchase} onClick={() => setAvailableForPurchase((v) => !v)} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', availableForPurchase ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', availableForPurchase ? 'right-1 left-auto' : 'left-1 right-auto')} />
              </button>
            </div>
            {availableForPurchase && (
              <>
                <div className="border-t border-[var(--border)]" />
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm font-medium text-[var(--fg)]">Можно получить бесплатно</span>
                  <button type="button" role="switch" aria-checked={canGetForFree} onClick={() => setCanGetForFree((v) => !v)} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', canGetForFree ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                    <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', canGetForFree ? 'right-1 left-auto' : 'left-1 right-auto')} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── Cost + Stock (in one row: coins / gems / stock) ─── */}
        {availableForPurchase && !canGetForFree && (
          <div className="glass rounded-2xl p-4">
            <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Стоимость и запас</label>
            <div className="grid grid-cols-3 gap-3">
              {/* Coins */}
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Монеты</label>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setCoinCost((p) => Math.max(0, p - 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-gray-300/30 to-gray-400/10 text-gray-400 ring-1 ring-inset ring-gray-300/25 shadow-sm shadow-gray-400/10 hover:from-gray-300/40 hover:to-gray-400/20 hover:scale-105 active:scale-95">
                    <span className="text-sm font-bold">−</span>
                  </button>
                  <input type="number" min={0} value={coinCost || ''} placeholder="0" onChange={(e) => setCoinCost(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onBlur={(e) => { if (e.target.value === '') setCoinCost(0) }} className="input w-full flex-1 min-w-0 h-9 py-0 text-center text-sm font-bold placeholder:text-[var(--fg-muted)]/40" />
                  <button type="button" onClick={() => setCoinCost((p) => p + 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-indigo-500/35 to-indigo-600/20 text-indigo-400 ring-1 ring-inset ring-indigo-500/35 shadow-sm shadow-indigo-600/10 hover:from-indigo-500/50 hover:to-indigo-600/35 hover:text-indigo-300 hover:scale-105 active:scale-95">
                    <span className="text-sm font-bold">+</span>
                  </button>
                </div>
              </div>
              {/* Gems */}
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Гемы</label>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setGemCost((p) => Math.max(0, p - 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-gray-300/30 to-gray-400/10 text-gray-400 ring-1 ring-inset ring-gray-300/25 shadow-sm shadow-gray-400/10 hover:from-gray-300/40 hover:to-gray-400/20 hover:scale-105 active:scale-95">
                    <span className="text-sm font-bold">−</span>
                  </button>
                  <input type="number" min={0} value={gemCost || ''} placeholder="0" onChange={(e) => setGemCost(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onBlur={(e) => { if (e.target.value === '') setGemCost(0) }} className="input w-full flex-1 min-w-0 h-9 py-0 text-center text-sm font-bold placeholder:text-[var(--fg-muted)]/40" />
                  <button type="button" onClick={() => setGemCost((p) => p + 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-indigo-500/35 to-indigo-600/20 text-indigo-400 ring-1 ring-inset ring-indigo-500/35 shadow-sm shadow-indigo-600/10 hover:from-indigo-500/50 hover:to-indigo-600/35 hover:text-indigo-300 hover:scale-105 active:scale-95">
                    <span className="text-sm font-bold">+</span>
                  </button>
                </div>
              </div>
              {/* Stock */}
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Запас</label>
                {(isVideoGame || isTvSerial) ? (
                  <div className="flex h-9 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-sm font-bold text-[var(--fg-muted)]">1</div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setStock((p) => { if (p == null || p <= 1) return undefined; return p - 1 })} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-gray-300/30 to-gray-400/10 text-gray-400 ring-1 ring-inset ring-gray-300/25 shadow-sm shadow-gray-400/10 hover:from-gray-300/40 hover:to-gray-400/20 hover:scale-105 active:scale-95">
                      <span className="text-sm font-bold">−</span>
                    </button>
                    <input type="number" min={1} value={stock ?? ''} onChange={(e) => { const v = e.target.value; setStock(v ? Math.max(1, Number(v) || 1) : undefined) }} placeholder="∞" className="input input-stock-infinite w-full flex-1 min-w-0 h-9 py-0 text-center text-sm font-bold" />
                    <button type="button" onClick={() => setStock((p) => (p == null ? 1 : p + 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-indigo-500/35 to-indigo-600/20 text-indigo-400 ring-1 ring-inset ring-indigo-500/35 shadow-sm shadow-indigo-600/10 hover:from-indigo-500/50 hover:to-indigo-600/35 hover:text-indigo-300 hover:scale-105 active:scale-95">
                      <span className="text-sm font-bold">+</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Stock only (when free or not purchasable) ─── */}
        {(!availableForPurchase || canGetForFree) && (
          <div className="glass rounded-2xl p-4">
            <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Запас</label>
            {(isVideoGame || isTvSerial) ? (
              <div className="flex h-11 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-lg font-bold text-[var(--fg-muted)]">1</div>
            ) : (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setStock((p) => { if (p == null || p <= 1) return undefined; return p - 1 })} className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-gray-300/30 to-gray-400/10 text-gray-400 ring-1 ring-inset ring-gray-300/25 shadow-sm shadow-gray-400/10 hover:from-gray-300/40 hover:to-gray-400/20 hover:scale-105 active:scale-95">
                  <span className="text-lg font-bold">−</span>
                </button>
                <input type="number" min={1} value={stock ?? ''} onChange={(e) => { const v = e.target.value; setStock(v ? Math.max(1, Number(v) || 1) : undefined) }} placeholder="∞" className="input input-stock-infinite w-full flex-1 min-w-0 h-11 py-0 text-center text-lg font-bold" />
                <button type="button" onClick={() => setStock((p) => (p == null ? 1 : p + 1))} className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-gray-500/30 to-gray-600/15 text-gray-300 ring-1 ring-inset ring-gray-500/30 shadow-sm shadow-gray-600/10 hover:from-gray-500/40 hover:to-gray-600/25 hover:scale-105 active:scale-95">
                  <span className="text-lg font-bold">+</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Advanced settings ─── */}
        <div className="glass rounded-2xl p-4">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(true)}
            className="flex w-full items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-[var(--fg-muted)]/15 to-[var(--fg-muted)]/5 ring-1 ring-inset ring-[var(--fg-muted)]/15">
              <Settings className="h-5 w-5 text-[var(--fg-muted)]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--fg)]">Свойства предмета</p>
              <p className="text-xs text-[var(--fg-muted)]">Лутбокс, множитель, скидочник, видеоигра, сериал</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
          </button>
        </div>

        {/* ─── Buttons ─── */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button
            type="submit"
            disabled={!name.trim() || !groupId}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold transition-all duration-200',
              !name.trim() || !groupId
                ? 'bg-[var(--surface)] text-[var(--fg-muted)] cursor-not-allowed opacity-50'
                : 'text-white bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:shadow-[var(--accent)]/35 hover:scale-[1.02] active:scale-[0.98]'
            )}
          >
            Создать
          </button>
        </div>
      </form>

      {/* Modals (portaled to body to escape glass-card containing block) */}
      {showAdvancedSettings && !showLootboxModal && !showDiscountModal && createPortal(
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowAdvancedSettings(false)}>
          <div className="modal-content max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--fg)]">Свойства предмета</h3>
              <button type="button" onClick={() => setShowAdvancedSettings(false)} className="icon-btn"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-[var(--fg-muted)] mb-2">Включить можно только одну опцию.</p>
              {/* Lootbox */}
              <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (streakMultiplierEnabled || isDiscountVoucher || isVideoGame || isTvSerial) && 'opacity-70')}>
                <div className="flex items-center justify-between gap-3">
                  <div><span className="font-medium text-[var(--fg)]">Лутбокс</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Случайный предмет при открытии</p></div>
                  <button type="button" role="switch" aria-checked={isLootBox} disabled={streakMultiplierEnabled || isDiscountVoucher || isVideoGame || isTvSerial} onClick={() => { setIsLootBox((v) => !v); if (!isLootBox) { setStreakMultiplierEnabled(false); setIsDiscountVoucher(false); setIsVideoGame(false); setIsTvSerial(false) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', isLootBox ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                    <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', isLootBox ? 'right-1 left-auto' : 'left-1 right-auto')} />
                  </button>
                </div>
                {isLootBox && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <button type="button" onClick={() => setShowLootboxModal(true)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] py-3 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)]">
                      <Gift className="h-5 w-5" />Настроить лутбокс<ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
              {/* Streak Multiplier */}
              <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (isLootBox || isDiscountVoucher || isVideoGame || isTvSerial) && 'opacity-70')}>
                <div className="flex items-center justify-between gap-3">
                  <div><span className="font-medium text-[var(--fg)]">Множитель за стрик</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Увеличивает награды за серию выполнений</p></div>
                  <button type="button" role="switch" aria-checked={streakMultiplierEnabled} disabled={isLootBox || isDiscountVoucher || isVideoGame || isTvSerial} onClick={() => { setStreakMultiplierEnabled((v) => !v); if (!streakMultiplierEnabled) { setIsLootBox(false); setIsDiscountVoucher(false); setIsVideoGame(false); setIsTvSerial(false) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', streakMultiplierEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                    <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', streakMultiplierEnabled ? 'right-1 left-auto' : 'left-1 right-auto')} />
                  </button>
                </div>
                {streakMultiplierEnabled && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-4">
                    {/* Mode selector */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Режим</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setStreakMultiplierMode('streak')}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-xl border py-2.5 px-2 text-center transition-all',
                            streakMultiplierMode === 'streak'
                              ? 'border-[var(--accent)] bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/30'
                              : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                          )}
                        >
                          <span className={cn('text-sm font-bold', streakMultiplierMode === 'streak' ? 'text-[var(--accent)]' : 'text-[var(--fg)]')}>За стрик</span>
                          <span className="text-[10px] text-[var(--fg-muted)]">Классический режим</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStreakMultiplierMode('instant')}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-xl border py-2.5 px-2 text-center transition-all',
                            streakMultiplierMode === 'instant'
                              ? 'border-[var(--accent)] bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/30'
                              : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                          )}
                        >
                          <span className={cn('text-sm font-bold', streakMultiplierMode === 'instant' ? 'text-[var(--accent)]' : 'text-[var(--fg)]')}>Для инстант</span>
                          <span className="text-[10px] text-[var(--fg-muted)]">Ограничен N выполнениями</span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Множитель</label>
                      <div className="grid grid-cols-3 gap-2">
                        {([{ value: 1.5, label: '1.5x', desc: 'Простой' }, { value: 2, label: '2x', desc: 'Средний' }, { value: 2.5, label: '2.5x', desc: 'Сложный' }] as const).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setStreakMultiplierValue(opt.value)}
                            className={cn(
                              'flex flex-col items-center gap-1 rounded-xl border py-2.5 px-2 text-center transition-all',
                              streakMultiplierValue === opt.value
                                ? 'border-[var(--accent)] bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/30'
                                : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                            )}
                          >
                            <span className={cn('text-sm font-bold', streakMultiplierValue === opt.value ? 'text-[var(--accent)]' : 'text-[var(--fg)]')}>{opt.label}</span>
                            <span className="text-[10px] text-[var(--fg-muted)]">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">
                        {streakMultiplierMode === 'streak' ? 'Срабатывает каждые' : 'Действует на'}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { value: 3, label: '3', desc: streakMultiplierMode === 'streak' ? 'выполнения' : 'выполнения' },
                          { value: 5, label: '5', desc: 'выполнений' },
                          { value: 7, label: '7', desc: 'выполнений' },
                        ] as const).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setStreakMultiplierInterval(opt.value)}
                            className={cn(
                              'flex flex-col items-center gap-1 rounded-xl border py-2.5 px-2 text-center transition-all',
                              streakMultiplierInterval === opt.value
                                ? 'border-[var(--accent)] bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/30'
                                : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                            )}
                          >
                            <span className={cn('text-sm font-bold', streakMultiplierInterval === opt.value ? 'text-[var(--accent)]' : 'text-[var(--fg)]')}>{opt.label}</span>
                            <span className="text-[10px] text-[var(--fg-muted)]">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {streakMultiplierMode === 'instant' && (
                      <p className="text-xs text-[var(--fg-muted)] bg-[var(--surface-elevated)] rounded-lg p-2.5">
                        Множитель будет действовать на следующие {streakMultiplierInterval} выполнений мгновенной задачи. Инстант задачу нельзя пропустить, поэтому множитель не теряется.
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* Discount Voucher */}
              <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (isLootBox || streakMultiplierEnabled || isVideoGame || isTvSerial) && 'opacity-70')}>
                <div className="flex items-center justify-between gap-3">
                  <div><span className="font-medium text-[var(--fg)]">Скидочный талон</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Снижает цены в магазине на N%</p></div>
                  <button type="button" role="switch" aria-checked={isDiscountVoucher} disabled={isLootBox || streakMultiplierEnabled || isVideoGame || isTvSerial} onClick={() => { setIsDiscountVoucher((v) => !v); if (!isDiscountVoucher) { setIsLootBox(false); setStreakMultiplierEnabled(false); setIsVideoGame(false); setIsTvSerial(false); setShowDiscountModal(true) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', isDiscountVoucher ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                    <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', isDiscountVoucher ? 'right-1 left-auto' : 'left-1 right-auto')} />
                  </button>
                </div>
                {isDiscountVoucher && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <button type="button" onClick={() => setShowDiscountModal(true)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] py-3 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)]">
                      <Percent className="h-5 w-5" />Размер скидки: {Math.min(85, Math.max(1, discountPercent))}%<ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
              {/* Video Game */}
              <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (isLootBox || streakMultiplierEnabled || isDiscountVoucher || isTvSerial) && 'opacity-70')}>
                <div className="flex items-center justify-between gap-3">
                  <div><span className="font-medium text-[var(--fg)]">Видеоигра</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Докупка часов после покупки</p></div>
                  <button type="button" role="switch" aria-checked={isVideoGame} disabled={isLootBox || streakMultiplierEnabled || isDiscountVoucher || isTvSerial} onClick={() => { setIsVideoGame((v) => !v); if (!isVideoGame) { setIsLootBox(false); setStreakMultiplierEnabled(false); setIsDiscountVoucher(false); setIsTvSerial(false); setStock(1) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', isVideoGame ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                    <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', isVideoGame ? 'right-1 left-auto' : 'left-1 right-auto')} />
                  </button>
                </div>
                {isVideoGame && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-[var(--fg-muted)]">Пакеты времени</label>
                      <button
                        type="button"
                        onClick={() => setGameTimePackages((prev) => [...prev, { id: crypto.randomUUID(), hours: 1, cost: 15 }])}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />Добавить
                      </button>
                    </div>
                    {gameTimePackages.length === 0 && (
                      <p className="text-xs text-[var(--fg-muted)] text-center py-2">Нет пакетов. Добавьте хотя бы один.</p>
                    )}
                    <div className="space-y-2">
                      {gameTimePackages.map((pkg, idx) => (
                        <div key={pkg.id} className="flex items-center gap-2 rounded-xl bg-[var(--surface-elevated)] p-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <label className="block text-[10px] text-[var(--fg-muted)] mb-1">Часов</label>
                                <input
                                  type="number"
                                  min={0.5}
                                  step={0.5}
                                  value={pkg.hours || ''}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : Math.max(0.5, Number(e.target.value))
                                    setGameTimePackages((prev) => prev.map((p, i) => i === idx ? { ...p, hours: val } : p))
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value === '') setGameTimePackages((prev) => prev.map((p, i) => i === idx ? { ...p, hours: 0.5 } : p))
                                  }}
                                  className="input w-full h-8 py-0 text-center text-sm font-bold placeholder:text-[var(--fg-muted)]/40"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[10px] text-[var(--fg-muted)] mb-1">Монет</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={pkg.cost || ''}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                                    setGameTimePackages((prev) => prev.map((p, i) => i === idx ? { ...p, cost: val } : p))
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value === '') setGameTimePackages((prev) => prev.map((p, i) => i === idx ? { ...p, cost: 0 } : p))
                                  }}
                                  className="input w-full h-8 py-0 text-center text-sm font-bold placeholder:text-[var(--fg-muted)]/40"
                                />
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setGameTimePackages((prev) => prev.filter((_, i) => i !== idx))}
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
              <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (isLootBox || streakMultiplierEnabled || isDiscountVoucher || isVideoGame) && 'opacity-70')}>
                <div className="flex items-center justify-between gap-3">
                  <div><span className="font-medium text-[var(--fg)]">Сериал</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Покупка серий по сезонам (напр. «Во все тяжкие»)</p></div>
                  <button type="button" role="switch" aria-checked={isTvSerial} disabled={isLootBox || streakMultiplierEnabled || isDiscountVoucher || isVideoGame} onClick={() => { setIsTvSerial((v) => !v); if (!isTvSerial) { setIsLootBox(false); setStreakMultiplierEnabled(false); setIsDiscountVoucher(false); setIsVideoGame(false); setStock(1) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', isTvSerial ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                    <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', isTvSerial ? 'right-1 left-auto' : 'left-1 right-auto')} />
                  </button>
                </div>
                {isTvSerial && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
                    <p className="text-xs text-[var(--fg-muted)]">
                      Например: «Во все тяжкие» — 5 сезонов. Каждый сезон содержит набор серий, каждая со своей ценой. Покупайте серии по мере просмотра.
                    </p>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-[var(--fg-muted)]">Сезоны</label>
                      <button
                        type="button"
                        onClick={() => {
                          const num = serialSeasons.length + 1
                          setSerialSeasons((prev) => [...prev, {
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
                    {serialSeasons.length === 0 && (
                      <p className="text-xs text-[var(--fg-muted)] text-center py-2">Нет сезонов. Добавьте хотя бы один.</p>
                    )}
                    <div className="space-y-2">
                      {serialSeasons.map((season, sIdx) => {
                        const isCollapsed = collapsedSeasons.has(season.id)
                        return (
                          <div key={season.id} className="rounded-xl bg-[var(--surface-elevated)] overflow-hidden">
                            {/* Season header */}
                            <div className="flex items-center gap-2 px-3 py-2.5">
                              <button
                                type="button"
                                onClick={() => setCollapsedSeasons((prev) => {
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
                              {/* Add episode */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSerialSeasons((prev) => prev.map((s, i) => i === sIdx ? {
                                    ...s,
                                    episodes: [...s.episodes, { id: crypto.randomUUID(), number: s.episodes.length + 1, cost: 15 }],
                                  } : s))
                                }}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors"
                                title="Добавить серию"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                              {/* Delete season */}
                              <button
                                type="button"
                                onClick={() => setSerialSeasons((prev) => prev.filter((_, i) => i !== sIdx).map((s, i) => ({ ...s, number: i + 1 })))}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/15 transition-colors"
                                title="Удалить сезон"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            {/* Episodes */}
                            {!isCollapsed && (
                              <div className="px-3 pb-2.5 space-y-1">
                                {/* Bulk price setter */}
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
                                        setSerialSeasons((prev) => prev.map((s, i) => i === sIdx ? {
                                          ...s,
                                          episodes: s.episodes.map((ep) => ({ ...ep, cost: val })),
                                        } : s))
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const val = e.target.value
                                      if (val) {
                                        const num = Math.max(0, Number(val) || 0)
                                        setSerialSeasons((prev) => prev.map((s, i) => i === sIdx ? {
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
                                        setSerialSeasons((prev) => prev.map((s, si) => si === sIdx ? {
                                          ...s, episodes: s.episodes.map((e, ei) => ei === eIdx ? { ...e, cost: Math.max(0, e.cost - 1) } : e),
                                        } : s))
                                      }} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-gray-300/30 to-gray-400/10 text-gray-400 ring-1 ring-inset ring-gray-300/25 text-[10px] font-bold hover:scale-105 active:scale-95 transition-all">−</button>
                                      <input
                                        type="number"
                                        min={0}
                                        value={ep.cost || ''}
                                        placeholder="0"
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                                          setSerialSeasons((prev) => prev.map((s, si) => si === sIdx ? {
                                            ...s, episodes: s.episodes.map((ep2, ei) => ei === eIdx ? { ...ep2, cost: val } : ep2),
                                          } : s))
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === '') {
                                            setSerialSeasons((prev) => prev.map((s, si) => si === sIdx ? {
                                              ...s, episodes: s.episodes.map((ep2, ei) => ei === eIdx ? { ...ep2, cost: 0 } : ep2),
                                            } : s))
                                          }
                                        }}
                                        className="input w-full flex-1 min-w-0 h-6 py-0 text-center text-xs font-bold placeholder:text-[var(--fg-muted)]/40"
                                      />
                                      <button type="button" onClick={() => {
                                        setSerialSeasons((prev) => prev.map((s, si) => si === sIdx ? {
                                          ...s, episodes: s.episodes.map((e, ei) => ei === eIdx ? { ...e, cost: e.cost + 1 } : e),
                                        } : s))
                                      }} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-gray-500/30 to-gray-600/15 text-gray-300 ring-1 ring-inset ring-gray-500/30 text-[10px] font-bold hover:scale-105 active:scale-95 transition-all">+</button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSerialSeasons((prev) => prev.map((s, si) => si === sIdx ? {
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
            {(isLootBox || streakMultiplierEnabled || isDiscountVoucher || isVideoGame || isTvSerial) && (
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(false)}
                className="mt-4 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Готово
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
      {showDiscountModal && createPortal(<DiscountVoucherModal value={discountPercent} onSave={(p) => setDiscountPercent(p)} onClose={() => setShowDiscountModal(false)} />, document.body)}
      {showLootboxModal && createPortal(<LootboxEffectModal lootTable={lootTable} shopItems={shopItems} onSave={setLootTable} onClose={() => setShowLootboxModal(false)} />, document.body)}
      {showIconSource && createPortal(
        <IconSourcePicker
          onSelectIcon={() => { setShowIconSource(false); setShowIconPicker(true) }}
          onSelectPhoto={() => { setShowIconSource(false); iconFileInputRef.current?.click() }}
          onClose={() => setShowIconSource(false)}
        />,
        document.body
      )}
      {showIconPicker && createPortal(<EmojiPickerModal currentIcon={icon} onSelect={setIcon} onClose={() => setShowIconPicker(false)} />, document.body)}
      {createPortal(
        <ItemGroupSelectModal
          isOpen={showGroupModal}
          selectedGroupId={groupId}
          onSelect={setGroupId}
          onClose={() => setShowGroupModal(false)}
        />,
        document.body
      )}
    </div>
  )
}
