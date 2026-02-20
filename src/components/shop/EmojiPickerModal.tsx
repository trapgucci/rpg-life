import { useMemo, useState } from 'react'
import { cn } from '../../lib/cn'
import { X, Search } from 'lucide-react'
import { ITEM_ICON_CATEGORIES } from './shopUtils'
import { HabitIcon } from '../HabitIcon'

interface IconPickerModalProps {
  currentIcon: string
  onSelect: (iconName: string) => void
  onClose: () => void
}

export default function EmojiPickerModal({ currentIcon, onSelect, onClose }: IconPickerModalProps) {
  const [search, setSearch] = useState('')

  const handlePick = (iconName: string) => {
    onSelect(iconName)
    onClose()
  }

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return ITEM_ICON_CATEGORIES
    const q = search.toLowerCase()
    return ITEM_ICON_CATEGORIES
      .map((cat) => ({
        ...cat,
        icons: cat.icons.filter((name) => name.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.icons.length > 0)
  }, [search])

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-[var(--fg)]">Выберите иконку</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск иконки..."
            className="input w-full h-9 text-sm pl-9"
          />
        </div>

        {/* Icon grid by category */}
        <div className="max-h-64 overflow-y-auto space-y-3 mb-3">
          {filteredCategories.map((cat) => (
            <div key={cat.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-1.5 px-0.5">
                {cat.label}
              </p>
              <div className="grid grid-cols-7 gap-1.5">
                {cat.icons.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => handlePick(iconName)}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                      currentIcon === iconName
                        ? 'bg-[var(--accent)] text-white scale-110 shadow-md'
                        : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)]'
                    )}
                    title={iconName}
                  >
                    <HabitIcon iconName={iconName} size={20} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <p className="text-center text-sm text-[var(--fg-muted)] py-4">
              Ничего не найдено
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
