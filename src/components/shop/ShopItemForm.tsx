import { useState, useRef, useMemo } from 'react'
import { resizeImageFile } from '../../lib/resizeImage'
import { cn } from '../../lib/cn'
import { X, Plus, Settings, Gift, ChevronRight, Percent, Sparkles, Folder } from 'lucide-react'
import { HabitIcon } from '../HabitIcon'
import { useRpgStore } from '../../store/useRpgStore'
import type { ShopItem, ItemRarity } from '../../types/domain'
import { CURRENCY_IDS } from '../../types/domain'
import { getItemIcon, RARITY_LABELS, RARITY_BADGE_CLASSES } from './shopUtils'
import type { LootTableEntry } from './shopUtils'
import EmojiPickerModal from './EmojiPickerModal'
import IconSourcePicker from './IconSourcePicker'
import LootboxEffectModal from './LootboxEffectModal'
import DiscountVoucherModal from './DiscountVoucherModal'
import ItemGroupSelectModal from './ItemGroupSelectModal'
import { CraftingTypePickerModal, CraftingCreateItemModal, CraftingMaterialModal } from './CraftingModals'

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
  const [rarity, setRarity] = useState<ItemRarity>('common')
  const [coinCost, setCoinCost] = useState(15)
  const [gemCost, setGemCost] = useState(0)
  const [availableForPurchase, setAvailableForPurchase] = useState(true)
  const [canGetForFree, setCanGetForFree] = useState(false)
  const [groupId, setGroupId] = useState<string | null>(defaultGroupId ?? null)
  const [stock, setStock] = useState<number | undefined>(undefined)
  const [isLootBox, setIsLootBox] = useState(false)
  const [lootTable, setLootTable] = useState<LootTableEntry[]>([])
  const [streakFreezeEnabled, setStreakFreezeEnabled] = useState(false)
  const [streakFreezeDays, setStreakFreezeDays] = useState(3)
  const [isDiscountVoucher, setIsDiscountVoucher] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(10)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showLootboxModal, setShowLootboxModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showCraftingTypePicker, setShowCraftingTypePicker] = useState(false)
  const [activeCraftingModal, setActiveCraftingModal] = useState<'create' | 'material' | null>(null)
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
      rarity,
      cost,
      isLootBox,
      lootTable: isLootBox ? lootTable : undefined,
      stock,
      availableForPurchase,
      canGetForFree,
      groupId,
      streakFreezeEnabled: streakFreezeEnabled || undefined,
      streakFreezeDays: streakFreezeEnabled ? streakFreezeDays : undefined,
      isDiscountVoucher: isDiscountVoucher || undefined,
      discountPercent: isDiscountVoucher ? Math.min(85, Math.max(1, discountPercent)) : undefined,
    }

    const created = addItem(data)
    onCreated(created.id)
  }

  const divider = <div className="border-t border-[var(--border)]" />

  return (
    <div className="glass-card flex h-full flex-col rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6 pb-4">
        <h2 className="text-lg font-semibold text-[var(--fg)]">Новый предмет</h2>
        <button type="button" onClick={onClose} className="icon-btn">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-4 md:pb-6 flex flex-col gap-4">
        {/* Name + icon avatar */}
        <div>
          <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Название предмета</label>
          <div className="flex gap-2 items-stretch">
            <button
              type="button"
              onClick={() => setShowIconSource(true)}
              className="relative shrink-0 group/preview flex items-center justify-center w-[42px] rounded-xl overflow-hidden ring-1 ring-inset ring-[var(--border)] shadow-sm bg-[var(--surface)] hover:ring-[var(--accent)] transition-all cursor-pointer"
              title="Изменить иконку"
            >
              {iconImage ? (
                <img src={iconImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <HabitIcon iconName={icon || 'Scroll'} size={22} />
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

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Описание предмета</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание (опционально)" rows={3} className="input w-full resize-none" />
        </div>

        {/* Rarity */}
        <div>
          <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Редкость</label>
          <div className="grid grid-cols-5 gap-1.5">
            {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as ItemRarity[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRarity(r)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold transition-all',
                  rarity === r
                    ? cn(RARITY_BADGE_CLASSES[r], 'ring-2 scale-105')
                    : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] border border-[var(--border)]'
                )}
              >
                {RARITY_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Group */}
        <div>
          <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Группа</label>
          <button
            type="button"
            onClick={() => setShowGroupModal(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--surface)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]"
          >
            <Folder className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span className="flex-1 text-sm text-[var(--fg)]">
              {groupId ? itemGroups.find((g) => g.id === groupId)?.name ?? 'Без группы' : 'Без группы'}
            </span>
            <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
          </button>
        </div>

        {/* Availability */}
        <div>
          <p className="text-sm font-medium text-[var(--fg-muted)] mb-3">Способ получения</p>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm font-medium text-[var(--fg)]">Доступно для покупки</span>
              <button type="button" role="switch" aria-checked={availableForPurchase} onClick={() => setAvailableForPurchase((v) => !v)} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', availableForPurchase ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', availableForPurchase ? 'right-1 left-auto' : 'left-1 right-auto')} />
              </button>
            </div>
            {availableForPurchase && (
              <>{divider}
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm font-medium text-[var(--fg)]">Можно получить бесплатно</span>
                  <button type="button" role="switch" aria-checked={canGetForFree} onClick={() => setCanGetForFree((v) => !v)} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', canGetForFree ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                    <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', canGetForFree ? 'right-1 left-auto' : 'left-1 right-auto')} />
                  </button>
                </div>
              </>
            )}
            {availableForPurchase && !canGetForFree && (
              <>{divider}
                <div className="grid grid-cols-2 gap-4 px-4 py-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Монеты</label>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setCoinCost((p) => Math.max(0, p - 1))} className="input-group-btn input-group-btn-minus">−</button>
                      <input type="number" min={0} value={coinCost} onChange={(e) => setCoinCost(Math.max(0, Number(e.target.value) || 0))} className="input w-full flex-1 min-w-0 h-9 py-0" />
                      <button type="button" onClick={() => setCoinCost((p) => p + 1)} className="input-group-btn input-group-btn-plus">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Гемы</label>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setGemCost((p) => Math.max(0, p - 1))} className="input-group-btn input-group-btn-minus">−</button>
                      <input type="number" min={0} value={gemCost} onChange={(e) => setGemCost(Math.max(0, Number(e.target.value) || 0))} className="input w-full flex-1 min-w-0 h-9 py-0" />
                      <button type="button" onClick={() => setGemCost((p) => p + 1)} className="input-group-btn input-group-btn-plus">+</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Запас</label>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setStock((p) => { if (p == null || p <= 1) return undefined; return p - 1 })} className="input-group-btn input-group-btn-minus">−</button>
              <input type="number" min={1} value={stock ?? ''} onChange={(e) => { const v = e.target.value; setStock(v ? Math.max(1, Number(v) || 1) : undefined) }} placeholder="∞" className="input input-stock-infinite w-full flex-1 min-w-0 h-9 py-0" />
              <button type="button" onClick={() => setStock((p) => (p == null ? 1 : p + 1))} className="input-group-btn input-group-btn-plus">+</button>
            </div>
          </div>
        </div>

        {/* Advanced settings */}
        <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-elevated)] transition-colors" onClick={() => setShowAdvancedSettings(true)}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-elevated)]">
            <Settings className="h-5 w-5 text-[var(--fg-muted)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--fg)]">Дополнительные настройки</p>
            <p className="text-xs text-[var(--fg-muted)]">Лутбокс и будущие продвинутые параметры предмета.</p>
          </div>
        </div>

        {/* Crafting recipes placeholder */}
        <div className="mt-4">
          <div className="glass-card flex flex-col items-center justify-center rounded-2xl px-6 py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
              <Sparkles className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-sm font-semibold text-[var(--fg)]">Рецептов крафта пока нет</p>
            <p className="mt-1 text-sm text-[var(--fg-muted)] max-w-xs">Создайте рецепты крафта, чтобы получать этот предмет разными способами.</p>
            <button type="button" onClick={() => setShowCraftingTypePicker(true)} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-shadow">
              <Plus className="h-4 w-4" />Добавить рецепт
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button type="submit" className="btn-primary flex-1">Создать</button>
        </div>
      </form>

      {/* Modals */}
      {showCraftingTypePicker && (
        <CraftingTypePickerModal onSelect={(type) => { setShowCraftingTypePicker(false); setActiveCraftingModal(type) }} onClose={() => setShowCraftingTypePicker(false)} />
      )}
      {activeCraftingModal === 'create' && <CraftingCreateItemModal onClose={() => setActiveCraftingModal(null)} defaultResultName={name} defaultResultIcon={icon || 'Sword'} />}
      {activeCraftingModal === 'material' && <CraftingMaterialModal onClose={() => setActiveCraftingModal(null)} defaultIngredientName={name} defaultIngredientIcon={icon || 'Sword'} />}
      {showAdvancedSettings && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowAdvancedSettings(false)}>
          <div className="modal-content max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--fg)]">Дополнительные настройки</h3>
              <button type="button" onClick={() => setShowAdvancedSettings(false)} className="icon-btn"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-[var(--fg-muted)] mb-2">Включить можно только одну опцию: лутбокс, заморозка стрика или скидочный талон.</p>
              {/* Lootbox */}
              <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (streakFreezeEnabled || isDiscountVoucher) && 'opacity-70')}>
                <div className="flex items-center justify-between gap-3">
                  <div><span className="font-medium text-[var(--fg)]">Лутбокс</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Случайный предмет при открытии</p></div>
                  <button type="button" role="switch" aria-checked={isLootBox} disabled={streakFreezeEnabled || isDiscountVoucher} onClick={() => { setIsLootBox((v) => !v); if (!isLootBox) { setStreakFreezeEnabled(false); setIsDiscountVoucher(false) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', isLootBox ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
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
              {/* Streak Freeze */}
              <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (isLootBox || isDiscountVoucher) && 'opacity-70')}>
                <div className="flex items-center justify-between gap-3">
                  <div><span className="font-medium text-[var(--fg)]">Заморозка стрика</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Позволяет пропустить привычки без потери стрика</p></div>
                  <button type="button" role="switch" aria-checked={streakFreezeEnabled} disabled={isLootBox || isDiscountVoucher} onClick={() => { setStreakFreezeEnabled((v) => !v); if (!streakFreezeEnabled) { setIsLootBox(false); setIsDiscountVoucher(false) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', streakFreezeEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
                    <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', streakFreezeEnabled ? 'right-1 left-auto' : 'left-1 right-auto')} />
                  </button>
                </div>
                {streakFreezeEnabled && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Длительность (дней)</label>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setStreakFreezeDays((p) => Math.max(1, p - 1))} className="input-group-btn input-group-btn-minus">−</button>
                      <input type="number" min={1} value={streakFreezeDays} onChange={(e) => setStreakFreezeDays(Math.max(1, Number(e.target.value) || 1))} className="input w-full flex-1 min-w-0 h-9 py-0" />
                      <button type="button" onClick={() => setStreakFreezeDays((p) => p + 1)} className="input-group-btn input-group-btn-plus">+</button>
                    </div>
                  </div>
                )}
              </div>
              {/* Discount Voucher */}
              <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4', (isLootBox || streakFreezeEnabled) && 'opacity-70')}>
                <div className="flex items-center justify-between gap-3">
                  <div><span className="font-medium text-[var(--fg)]">Скидочный талон</span><p className="text-xs text-[var(--fg-muted)] mt-0.5">Снижает цены в магазине на N%</p></div>
                  <button type="button" role="switch" aria-checked={isDiscountVoucher} disabled={isLootBox || streakFreezeEnabled} onClick={() => { setIsDiscountVoucher((v) => !v); if (!isDiscountVoucher) { setIsLootBox(false); setStreakFreezeEnabled(false); setShowDiscountModal(true) } }} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed', isDiscountVoucher ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
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
