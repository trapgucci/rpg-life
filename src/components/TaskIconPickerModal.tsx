import { useState } from 'react'
import { X, Search } from 'lucide-react'
import { cn } from '../lib/cn'
import { HabitIcon, TASK_ICONS } from './HabitIcon'

interface TaskIconPickerModalProps {
  isOpen: boolean
  selectedIcon?: string
  onSelect: (icon: string | undefined) => void
  onClose: () => void
}

export default function TaskIconPickerModal({
  isOpen,
  selectedIcon,
  onSelect,
  onClose,
}: TaskIconPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen) return null

  const filteredIcons = searchQuery.trim()
    ? TASK_ICONS.filter((icon) => icon.toLowerCase().includes(searchQuery.toLowerCase()))
    : TASK_ICONS

  const handleSelect = (icon: string | undefined) => {
    onSelect(icon)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card relative w-full max-w-2xl max-h-[80vh] rounded-2xl p-6 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-xl font-bold text-[var(--fg)]">Выбрать иконку</h2>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn h-9 w-9 rounded-full p-0"
            title="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="mb-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--fg-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск иконки..."
              className="input w-full pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Icons grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-8 gap-2 pb-2">
            {/* Clear icon option */}
            <button
              type="button"
              onClick={() => handleSelect(undefined)}
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-xl border transition-all duration-150',
                !selectedIcon
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] scale-105 shadow-md'
                  : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] hover:scale-105'
              )}
              title="Без иконки"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Icon options */}
            {filteredIcons.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleSelect(name)}
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-xl border transition-all duration-150',
                  selectedIcon === name
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] scale-105 shadow-md'
                    : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] hover:scale-105'
                )}
                title={name}
              >
                <HabitIcon iconName={name} size={24} />
              </button>
            ))}
          </div>

          {/* Empty state */}
          {filteredIcons.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] mb-4">
                <Search className="h-8 w-8 text-[var(--accent)]" />
              </div>
              <p className="font-medium text-[var(--fg)]">Иконки не найдены</p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">Попробуйте другой запрос</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-4 border-t border-[var(--border)] shrink-0">
          <p className="text-xs text-[var(--fg-muted)] text-center">
            Всего иконок: {TASK_ICONS.length} • Показано: {filteredIcons.length}
          </p>
        </div>
      </div>
    </div>
  )
}
