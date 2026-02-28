import { useState, useMemo } from 'react'
import { cn } from '../../lib/cn'
import { X, Plus, Trash2, ChevronRight, Check } from 'lucide-react'
import { useRpgStore } from '../../store/useRpgStore'
import type { ShopItem } from '../../types/domain'
import { getItemIcon } from './shopUtils'
import { HabitIcon } from '../HabitIcon'

// ─── Crafting Type Picker ────────────────────────────────────────────────────

interface CraftingTypePickerModalProps {
  onSelect: (type: 'create' | 'material') => void
  onClose: () => void
}

export function CraftingTypePickerModal({ onSelect, onClose }: CraftingTypePickerModalProps) {
  const options = [
    { type: 'create' as const, label: 'Создание предмета', desc: 'Крафт нового предмета из материалов', iconName: 'Hammer' },
    { type: 'material' as const, label: 'Материал для крафта', desc: 'Предмет используется как ингредиент', iconName: 'Puzzle' },
  ]
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Тип рецепта крафта</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-[var(--fg-muted)] mb-4">Выберите тип рецепта для настройки</p>
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelect(opt.type)}
              className="w-full flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left hover:bg-[var(--surface-elevated)] hover:border-[var(--accent)]/50 transition-colors"
            >
              <span className="text-[var(--fg-muted)]"><HabitIcon iconName={opt.iconName} size={24} /></span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[var(--fg)]">{opt.label}</div>
                <div className="text-xs text-[var(--fg-muted)] mt-0.5">{opt.desc}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--fg-muted)] shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Item Picker Modal ───────────────────────────────────────────────────────

export function ItemPickerModal({
  shopItems,
  title,
  onSelect,
  onClose,
}: {
  shopItems: ShopItem[]
  title: string
  onSelect: (itemId: string, quantity: number) => void
  onClose: () => void
}) {
  const [pickedId, setPickedId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const handleAdd = () => {
    if (!pickedId || quantity < 1) return
    onSelect(pickedId, quantity)
    setPickedId('')
    setQuantity(1)
    onClose()
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[var(--surface-overlay)] backdrop-blur-xl rounded-2xl shadow-2xl border border-[var(--border)] w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h4 className="text-base font-semibold text-[var(--fg)]">{title}</h4>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--surface-elevated)] text-[var(--fg-muted)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {shopItems.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => setPickedId(i.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all border',
                pickedId === i.id
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-sm'
                  : 'border-transparent bg-[var(--surface-elevated)] hover:bg-[var(--bg)] hover:border-[var(--border)]'
              )}
            >
              <span className="shrink-0 text-[var(--fg-muted)]"><HabitIcon iconName={getItemIcon(i)} size={24} /></span>
              <span className="flex-1 min-w-0 font-medium text-[var(--fg)] truncate">{i.name}</span>
              {pickedId === i.id && <Check className="h-5 w-5 text-[var(--accent)] shrink-0" />}
            </button>
          ))}
        </div>
        {pickedId && (
          <div className="p-4 border-t border-[var(--border)] flex items-center gap-3">
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="input w-20 text-center"
            />
            <span className="text-sm text-[var(--fg-muted)]">шт.</span>
            <button type="button" onClick={handleAdd} className="btn-primary flex-1">
              Добавить
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Crafting Create Item Modal ──────────────────────────────────────────────

type RecipeIngredient = { itemId: string; quantity: number }
type RecipeResultExtra = { itemId: string; quantity: number }

interface CraftingCreateItemModalProps {
  onClose: () => void
  defaultResultName?: string
  defaultResultIcon?: string
}

export function CraftingCreateItemModal({ onClose, defaultResultName, defaultResultIcon }: CraftingCreateItemModalProps) {
  const allShopItems = useRpgStore((s) => s.shopItems)
  const shopItems = useMemo(() => allShopItems.filter((i) => !i.deletedFromShop), [allShopItems])
  const [recipeName, setRecipeName] = useState('')
  const [recipeDescription, setRecipeDescription] = useState('')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [mainResultQuantity, setMainResultQuantity] = useState(1)
  const [extraResults, setExtraResults] = useState<RecipeResultExtra[]>([])
  const [showIngredientPicker, setShowIngredientPicker] = useState(false)
  const [showResultPicker, setShowResultPicker] = useState(false)

  const mainResultLabel = (defaultResultName?.trim() || 'Неизвестный предмет')
  const mainResultIconName = defaultResultIcon || 'Sword'

  const addIngredient = (itemId: string, quantity: number) => {
    setIngredients((prev) => {
      const idx = prev.findIndex((e) => e.itemId === itemId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity }
        return next
      }
      return [...prev, { itemId, quantity }]
    })
    setShowIngredientPicker(false)
  }

  const updateIngredientQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return
    setIngredients((prev) => prev.map((e) => (e.itemId === itemId ? { ...e, quantity } : e)))
  }

  const removeIngredient = (itemId: string) => {
    setIngredients((prev) => prev.filter((e) => e.itemId !== itemId))
  }

  const addExtraResult = (itemId: string, quantity: number) => {
    setExtraResults((prev) => {
      const idx = prev.findIndex((e) => e.itemId === itemId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity }
        return next
      }
      return [...prev, { itemId, quantity }]
    })
    setShowResultPicker(false)
  }

  const updateExtraResultQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return
    setExtraResults((prev) => prev.map((e) => (e.itemId === itemId ? { ...e, quantity } : e)))
  }

  const removeExtraResult = (itemId: string) => {
    setExtraResults((prev) => prev.filter((e) => e.itemId !== itemId))
  }

  return (
    <>
      <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !showIngredientPicker && !showResultPicker && onClose()}>
        <div className="modal-content max-w-lg max-h-[90vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-[var(--border)]">
          <div className="bg-[var(--surface-elevated)] border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[var(--fg)] tracking-tight">Создание предмета</h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--surface-elevated)]/50 text-[var(--fg-muted)] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-[var(--fg-muted)] mt-1">Настройте рецепт: из каких материалов и в каком количестве создаётся предмет.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Название рецепта</label>
              <input type="text" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} placeholder="Введите название рецепта..." className="input w-full rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Описание</label>
              <textarea value={recipeDescription} onChange={(e) => setRecipeDescription(e.target.value)} placeholder="Опционально: описание рецепта" className="input w-full min-h-[88px] resize-y rounded-xl" rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Ингредиенты</label>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]/50 p-4 space-y-3">
                {ingredients.length === 0 ? (
                  <p className="text-sm text-[var(--fg-muted)] text-center py-4">Добавьте предметы из магазина</p>
                ) : (
                  <ul className="space-y-2">
                    {ingredients.map(({ itemId, quantity }) => {
                      const item = shopItems.find((i) => i.id === itemId)
                      return (
                        <li key={itemId} className="flex items-center gap-3 rounded-xl bg-[var(--bg)]/80 p-3 border border-[var(--border)]/50">
                          <span className="shrink-0 text-[var(--fg-muted)]"><HabitIcon iconName={item ? getItemIcon(item) : 'Sword'} size={24} /></span>
                          <span className="flex-1 min-w-0 truncate text-sm font-medium text-[var(--fg)]">{item?.name ?? itemId}</span>
                          <input type="number" min={1} value={quantity} onChange={(e) => updateIngredientQuantity(itemId, Math.max(1, parseInt(e.target.value, 10) || 1))} className="input w-16 text-center text-sm py-1.5 rounded-lg" />
                          <button type="button" onClick={() => removeIngredient(itemId)} className="p-2 rounded-lg hover:bg-[var(--surface-elevated)] text-[var(--fg-muted)]"><Trash2 className="h-4 w-4" /></button>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <button type="button" onClick={() => setShowIngredientPicker(true)} className="w-full mt-2 py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--fg-muted)] text-sm font-medium hover:border-[var(--accent)]/50 hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]/30 transition-colors flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />Выбрать предмет
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Результат</label>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]/50 p-4 space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-[var(--bg)]/80 p-3 border border-[var(--accent)]/40 shadow-sm">
                  <span className="shrink-0 text-[var(--fg-muted)]"><HabitIcon iconName={mainResultIconName} size={24} /></span>
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-[var(--fg)]">{mainResultLabel}</span>
                  <input type="number" min={1} value={mainResultQuantity} onChange={(e) => setMainResultQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} className="input w-16 text-center text-sm py-1.5 rounded-lg" />
                </div>
                {extraResults.length > 0 && (
                  <ul className="space-y-2">
                    {extraResults.map(({ itemId, quantity }) => {
                      const item = shopItems.find((i) => i.id === itemId)
                      return (
                        <li key={itemId} className="flex items-center gap-3 rounded-xl bg-[var(--bg)]/80 p-3 border border-[var(--border)]/50">
                          <span className="shrink-0 text-[var(--fg-muted)]"><HabitIcon iconName={item ? getItemIcon(item) : 'Sword'} size={24} /></span>
                          <span className="flex-1 min-w-0 truncate text-sm font-medium text-[var(--fg)]">{item?.name ?? itemId}</span>
                          <input type="number" min={1} value={quantity} onChange={(e) => updateExtraResultQuantity(itemId, Math.max(1, parseInt(e.target.value, 10) || 1))} className="input w-16 text-center text-sm py-1.5 rounded-lg" />
                          <button type="button" onClick={() => removeExtraResult(itemId)} className="p-2 rounded-lg hover:bg-[var(--surface-elevated)] text-[var(--fg-muted)]"><Trash2 className="h-4 w-4" /></button>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <button type="button" onClick={() => setShowResultPicker(true)} className="w-full mt-2 py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--fg-muted)] text-sm font-medium hover:border-[var(--accent)]/50 hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]/30 transition-colors flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />Выбрать предмет
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-5 border-t border-[var(--border)] bg-[var(--surface)]">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 rounded-xl py-2.5">Отмена</button>
            <button type="button" className="btn-primary flex-1 rounded-xl py-2.5">Сохранить</button>
          </div>
        </div>
      </div>

      {showIngredientPicker && <ItemPickerModal shopItems={shopItems} title="Выберите предмет для ингредиентов" onSelect={addIngredient} onClose={() => setShowIngredientPicker(false)} />}
      {showResultPicker && <ItemPickerModal shopItems={shopItems} title="Добавить предмет в результат" onSelect={addExtraResult} onClose={() => setShowResultPicker(false)} />}
    </>
  )
}

// ─── Crafting Material Modal ─────────────────────────────────────────────────

type MaterialRecipeIngredient = { itemId: string; quantity: number }
type MaterialRecipeResult = { itemId: string; quantity: number }

interface CraftingMaterialModalProps {
  onClose: () => void
  defaultIngredientName?: string
  defaultIngredientIcon?: string
}

export function CraftingMaterialModal({ onClose, defaultIngredientName, defaultIngredientIcon }: CraftingMaterialModalProps) {
  const allShopItems = useRpgStore((s) => s.shopItems)
  const shopItems = useMemo(() => allShopItems.filter((i) => !i.deletedFromShop), [allShopItems])
  const [recipeName, setRecipeName] = useState('')
  const [recipeDescription, setRecipeDescription] = useState('')
  const [mainIngredientQuantity, setMainIngredientQuantity] = useState(1)
  const [extraIngredients, setExtraIngredients] = useState<MaterialRecipeIngredient[]>([])
  const [results, setResults] = useState<MaterialRecipeResult[]>([])
  const [showIngredientPicker, setShowIngredientPicker] = useState(false)
  const [showResultPicker, setShowResultPicker] = useState(false)

  const mainIngredientLabel = defaultIngredientName?.trim() || 'Неизвестный предмет'
  const mainIngredientIconName = defaultIngredientIcon || 'Sword'

  const addExtraIngredient = (itemId: string, quantity: number) => {
    setExtraIngredients((prev) => {
      const idx = prev.findIndex((e) => e.itemId === itemId)
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity }; return next }
      return [...prev, { itemId, quantity }]
    })
    setShowIngredientPicker(false)
  }

  const updateExtraIngredientQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return
    setExtraIngredients((prev) => prev.map((e) => (e.itemId === itemId ? { ...e, quantity } : e)))
  }

  const removeExtraIngredient = (itemId: string) => {
    setExtraIngredients((prev) => prev.filter((e) => e.itemId !== itemId))
  }

  const addResult = (itemId: string, quantity: number) => {
    setResults((prev) => {
      const idx = prev.findIndex((e) => e.itemId === itemId)
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity }; return next }
      return [...prev, { itemId, quantity }]
    })
    setShowResultPicker(false)
  }

  const updateResultQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return
    setResults((prev) => prev.map((e) => (e.itemId === itemId ? { ...e, quantity } : e)))
  }

  const removeResult = (itemId: string) => {
    setResults((prev) => prev.filter((e) => e.itemId !== itemId))
  }

  return (
    <>
      <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !showIngredientPicker && !showResultPicker && onClose()}>
        <div className="modal-content max-w-lg max-h-[90vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-[var(--border)]">
          <div className="bg-[var(--surface-elevated)] border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[var(--fg)] tracking-tight">Материал для крафта</h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--surface-elevated)]/50 text-[var(--fg-muted)] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-[var(--fg-muted)] mt-1">Настройте, в каких рецептах этот предмет выступает ингредиентом и в каком количестве.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Название рецепта</label>
              <input type="text" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} placeholder="Введите название рецепта..." className="input w-full rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Описание</label>
              <textarea value={recipeDescription} onChange={(e) => setRecipeDescription(e.target.value)} placeholder="Опционально: описание рецепта" className="input w-full min-h-[88px] resize-y rounded-xl" rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Ингредиенты</label>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]/50 p-4 space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-[var(--bg)]/80 p-3 border border-[var(--accent)]/40 shadow-sm">
                  <span className="shrink-0 text-[var(--fg-muted)]"><HabitIcon iconName={mainIngredientIconName} size={24} /></span>
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-[var(--fg)]">{mainIngredientLabel}</span>
                  <input type="number" min={1} value={mainIngredientQuantity} onChange={(e) => setMainIngredientQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} className="input w-16 text-center text-sm py-1.5 rounded-lg" />
                </div>
                {extraIngredients.length > 0 && (
                  <ul className="space-y-2">
                    {extraIngredients.map(({ itemId, quantity }) => {
                      const it = shopItems.find((i) => i.id === itemId)
                      return (
                        <li key={itemId} className="flex items-center gap-3 rounded-xl bg-[var(--bg)]/80 p-3 border border-[var(--border)]/50">
                          <span className="shrink-0 text-[var(--fg-muted)]"><HabitIcon iconName={it ? getItemIcon(it) : 'Sword'} size={24} /></span>
                          <span className="flex-1 min-w-0 truncate text-sm font-medium text-[var(--fg)]">{it?.name ?? itemId}</span>
                          <input type="number" min={1} value={quantity} onChange={(e) => updateExtraIngredientQuantity(itemId, Math.max(1, parseInt(e.target.value, 10) || 1))} className="input w-16 text-center text-sm py-1.5 rounded-lg" />
                          <button type="button" onClick={() => removeExtraIngredient(itemId)} className="p-2 rounded-lg hover:bg-[var(--surface-elevated)] text-[var(--fg-muted)]"><Trash2 className="h-4 w-4" /></button>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <button type="button" onClick={() => setShowIngredientPicker(true)} className="w-full mt-2 py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--fg-muted)] text-sm font-medium hover:border-[var(--accent)]/50 hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]/30 transition-colors flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />Выбрать предмет
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Результат</label>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]/50 p-4 space-y-3">
                {results.length === 0 ? (
                  <p className="text-sm text-[var(--fg-muted)] text-center py-4">Добавьте предметы результата крафта</p>
                ) : (
                  <ul className="space-y-2">
                    {results.map(({ itemId, quantity }) => {
                      const it = shopItems.find((i) => i.id === itemId)
                      return (
                        <li key={itemId} className="flex items-center gap-3 rounded-xl bg-[var(--bg)]/80 p-3 border border-[var(--border)]/50">
                          <span className="shrink-0 text-[var(--fg-muted)]"><HabitIcon iconName={it ? getItemIcon(it) : 'Sword'} size={24} /></span>
                          <span className="flex-1 min-w-0 truncate text-sm font-medium text-[var(--fg)]">{it?.name ?? itemId}</span>
                          <input type="number" min={1} value={quantity} onChange={(e) => updateResultQuantity(itemId, Math.max(1, parseInt(e.target.value, 10) || 1))} className="input w-16 text-center text-sm py-1.5 rounded-lg" />
                          <button type="button" onClick={() => removeResult(itemId)} className="p-2 rounded-lg hover:bg-[var(--surface-elevated)] text-[var(--fg-muted)]"><Trash2 className="h-4 w-4" /></button>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <button type="button" onClick={() => setShowResultPicker(true)} className="w-full mt-2 py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--fg-muted)] text-sm font-medium hover:border-[var(--accent)]/50 hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]/30 transition-colors flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />Выбрать предмет
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-5 border-t border-[var(--border)] bg-[var(--surface)]">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 rounded-xl py-2.5">Отмена</button>
            <button type="button" className="btn-primary flex-1 rounded-xl py-2.5">Сохранить</button>
          </div>
        </div>
      </div>

      {showIngredientPicker && <ItemPickerModal shopItems={shopItems} title="Выберите предмет для ингредиентов" onSelect={addExtraIngredient} onClose={() => setShowIngredientPicker(false)} />}
      {showResultPicker && <ItemPickerModal shopItems={shopItems} title="Выберите предмет для результата" onSelect={addResult} onClose={() => setShowResultPicker(false)} />}
    </>
  )
}
