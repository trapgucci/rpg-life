import { useState, useRef, useMemo } from 'react'
import { resizeImageFile } from '../../lib/resizeImage'
import { cn } from '../../lib/cn'
import { X, Settings, Gift, ChevronRight, Percent, Folder, TrendingUp } from 'lucide-react'
import { HabitIcon } from '../HabitIcon'
import { useRpgStore } from '../../store/useRpgStore'
import type { ShopItem } from '../../types/domain'
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
  const shopItems = useRpgStore((s) => s.shopItems)
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
  const [streakMultiplierValue, setStreakMultiplierValue] = useState(1.5)
  const [streakMultiplierInterval, setStreakMultiplierInterval] = useState(3)
  const [isDiscountVoucher, setIsDiscountVoucher] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(10)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showLootboxModal, setShowLootboxModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !activeProfileId) return

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
      stock,
      availableForPurchase,
      canGetForFree,
      groupId,
      streakMultiplierEnabled: streakMultiplierEnabled || undefined,
      streakMultiplierValue: streakMultiplierEnabled ? streakMultiplierValue : undefined,
      streakMultiplierInterval: streakMultiplierEnabled ? streakMultiplierInterval : undefined,
      isDiscountVoucher: isDiscountVoucher || undefined,
      discountPercent: isDiscountVoucher ? Math.min(85, Math.max(1, discountPercent)) : undefined,
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
              className="relative shrink-0 group/preview flex items-center justify-center w-[48px] h-[48px] rounded-xl overflow-hidden transition-all cursor-pointer ring-1 ring-inset ring-[var(--border)] shadow-md hover:ring-[var(--accent)] hover:scale-105 active:scale-95 bg-[var(--surface)]"
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
            <span className="flex-1 text-sm font-medium text-[var(--fg)]">
              {groupId ? itemGroups.find((g) => g.id === groupId)?.name ?? 'Без группы' : 'Без группы'}
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
                  <button type="button" onClick={() => setCoinCost((p) => Math.max(0, p - 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10 hover:from-red-500/30 hover:to-red-500/15 hover:scale-105 active:scale-95">
                    <span className="text-sm font-bold">−</span>
                  </button>
                  <input type="number" min={0} value={coinCost} onChange={(e) => setCoinCost(Math.max(0, Number(e.target.value) || 0))} className="input w-full flex-1 min-w-0 h-9 py-0 text-center text-sm font-bold" />
                  <button type="button" onClick={() => setCoinCost((p) => p + 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-emerald-400/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10 hover:from-emerald-400/35 hover:to-emerald-500/20 hover:scale-105 active:scale-95">
                    <span className="text-sm font-bold">+</span>
                  </button>
                </div>
              </div>
              {/* Gems */}
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Гемы</label>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setGemCost((p) => Math.max(0, p - 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10 hover:from-red-500/30 hover:to-red-500/15 hover:scale-105 active:scale-95">
                    <span className="text-sm font-bold">−</span>
                  </button>
                  <input type="number" min={0} value={gemCost} onChange={(e) => setGemCost(Math.max(0, Number(e.target.value) || 0))} className="input w-full flex-1 min-w-0 h-9 py-0 text-center text-sm font-bold" />
                  <button type="button" onClick={() => setGemCost((p) => p + 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-emerald-400/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10 hover:from-emerald-400/35 hover:to-emerald-500/20 hover:scale-105 active:scale-95">
                    <span className="text-sm font-bold">+</span>
                  </button>
                </div>
              </div>
              {/* Stock */}
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Запас</label>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setStock((p) => { if (p == null || p <= 1) return undefined; return p - 1 })} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10 hover:from-red-500/30 hover:to-red-500/15 hover:scale-105 active:scale-95">
                    <span className="text-sm font-bold">−</span>
                  </button>
                  <input type="number" min={1} value={stock ?? ''} onChange={(e) => { const v = e.target.value; setStock(v ? Math.max(1, Number(v) || 1) : undefined) }} placeholder="∞" className="input input-stock-infinite w-full flex-1 min-w-0 h-9 py-0 text-center text-sm font-bold" />
                  <button type="button" onClick={() => setStock((p) => (p == null ? 1 : p + 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-emerald-400/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10 hover:from-emerald-400/35 hover:to-emerald-500/20 hover:scale-105 active:scale-95">
                    <span className="text-sm font-bold">+</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Stock only (when free or not purchasable) ─── */}
        {(!availableForPurchase || canGetForFree) && (
          <div className="glass rounded-2xl p-4">
            <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Запас</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setStock((p) => { if (p == null || p <= 1) return undefined; return p - 1 })} className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10 hover:from-red-500/30 hover:to-red-500/15 hover:scale-105 active:scale-95">
                <span className="text-lg font-bold">−</span>
              </button>
              <input type="number" min={1} value={stock ?? ''} onChange={(e) => { const v = e.target.value; setStock(v ? Math.max(1, Number(v) || 1) : undefined) }} placeholder="∞" className="input input-stock-infinite w-full flex-1 min-w-0 h-11 py-0 text-center text-lg font-bold" />
              <button type="button" onClick={() => setStock((p) => (p == null ? 1 : p + 1))} className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-emerald-400/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10 hover:from-emerald-400/35 hover:to-emerald-500/20 hover:scale-105 active:scale-95">
                <span className="text-lg font-bold">+</span>
              </button>
            </div>
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
              <p className="text-xs text-[var(--fg-muted)]">Лутбокс, множитель за стрик, скидочный талон</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
          </button>
        </div>

        {/* ─── Buttons ─── */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:shadow-[var(--accent)]/35 hover:scale-[1.02] active:scale-[0.98]"
          >
            Создать
          </button>
        </div>
      </form>

      {/* Modals */}
      {showAdvancedSettings && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowAdvancedSettings(false)}>
          <div className="modal-content max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--fg)]">Свойства предмета</h3>
              <button type="button" onClick={() => setShowAdvancedSettings(false)} className="icon-btn"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-[var(--fg-muted)] mb-2">Включить можно только одну опцию: лутбокс, множитель за стрик или скидочный талон.</p>
              {/* Lootbox */}
              <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (streakMultiplierEnabled || isDiscountVoucher) && 'opacity-70')}>
                <div className="flex items-center justify-between gap-3">
                  <div><span className="font-medium text-[var(--fg)]">Лутбокс</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Случайный предмет при открытии</p></div>
                  <button type="button" role="switch" aria-checked={isLootBox} disabled={streakMultiplierEnabled || isDiscountVoucher} onClick={() => { setIsLootBox((v) => !v); if (!isLootBox) { setStreakMultiplierEnabled(false); setIsDiscountVoucher(false) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', isLootBox ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
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
              <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (isLootBox || isDiscountVoucher) && 'opacity-70')}>
                <div className="flex items-center justify-between gap-3">
                  <div><span className="font-medium text-[var(--fg)]">Множитель за стрик</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Увеличивает награды за серию выполнений</p></div>
                  <button type="button" role="switch" aria-checked={streakMultiplierEnabled} disabled={isLootBox || isDiscountVoucher} onClick={() => { setStreakMultiplierEnabled((v) => !v); if (!streakMultiplierEnabled) { setIsLootBox(false); setIsDiscountVoucher(false) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', streakMultiplierEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                    <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', streakMultiplierEnabled ? 'right-1 left-auto' : 'left-1 right-auto')} />
                  </button>
                </div>
                {streakMultiplierEnabled && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-4">
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
                      <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Срабатывает каждые</label>
                      <div className="grid grid-cols-3 gap-2">
                        {([{ value: 3, label: '3', desc: 'выполнения' }, { value: 5, label: '5', desc: 'выполнений' }, { value: 7, label: '7', desc: 'выполнений' }] as const).map((opt) => (
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
                  </div>
                )}
              </div>
              {/* Discount Voucher */}
              <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (isLootBox || streakMultiplierEnabled) && 'opacity-70')}>
                <div className="flex items-center justify-between gap-3">
                  <div><span className="font-medium text-[var(--fg)]">Скидочный талон</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Снижает цены в магазине на N%</p></div>
                  <button type="button" role="switch" aria-checked={isDiscountVoucher} disabled={isLootBox || streakMultiplierEnabled} onClick={() => { setIsDiscountVoucher((v) => !v); if (!isDiscountVoucher) { setIsLootBox(false); setStreakMultiplierEnabled(false); setShowDiscountModal(true) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', isDiscountVoucher ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
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
            </div>
          </div>
        </div>
      )}
      {showDiscountModal && <DiscountVoucherModal value={discountPercent} onSave={(p) => setDiscountPercent(p)} onClose={() => setShowDiscountModal(false)} />}
      {showLootboxModal && <LootboxEffectModal lootTable={lootTable} shopItems={shopItems} onSave={setLootTable} onClose={() => setShowLootboxModal(false)} />}
      {showIconSource && (
        <IconSourcePicker
          onSelectIcon={() => { setShowIconSource(false); setShowIconPicker(true) }}
          onSelectPhoto={() => { setShowIconSource(false); iconFileInputRef.current?.click() }}
          onClose={() => setShowIconSource(false)}
        />
      )}
      {showIconPicker && <EmojiPickerModal currentIcon={icon} onSelect={setIcon} onClose={() => setShowIconPicker(false)} />}
      <ItemGroupSelectModal
        isOpen={showGroupModal}
        selectedGroupId={groupId}
        onSelect={setGroupId}
        onClose={() => setShowGroupModal(false)}
      />
    </div>
  )
}
