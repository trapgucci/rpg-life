import { useState, useLayoutEffect, useEffect } from 'react'
import { X, Folder, Check } from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import type { TaskGroupId } from '../types/domain'

interface TaskGroupSelectModalProps {
  isOpen: boolean
  selectedGroupId: TaskGroupId | null
  onSelect: (groupId: TaskGroupId | null) => void
  onClose: () => void
}

export default function TaskGroupSelectModal({
  isOpen,
  selectedGroupId,
  onSelect,
  onClose,
}: TaskGroupSelectModalProps) {
  const [animatedOpen, setAnimatedOpen] = useState(false)
  const getTaskGroups = useRpgStore((s) => s.getTaskGroups)
  const groups = getTaskGroups()

  useLayoutEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => setAnimatedOpen(true))
      return () => cancelAnimationFrame(id)
    }
    setAnimatedOpen(false)
  }, [isOpen])

  useEffect(() => {
    if (!animatedOpen && isOpen) {
      const t = setTimeout(onClose, 300)
      return () => clearTimeout(t)
    }
  }, [animatedOpen, isOpen, onClose])

  const handleClose = () => setAnimatedOpen(false)
  const handleSelect = (groupId: TaskGroupId | null) => {
    onSelect(groupId)
    handleClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div
        role="presentation"
        onClick={handleClose}
        className={cn(
          'fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300',
          animatedOpen ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Выбор группы задачи"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white dark:bg-[var(--surface-overlay)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out max-h-[70vh] overflow-hidden flex flex-col',
          animatedOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Выбрать группу</h2>
          <button
            type="button"
            onClick={handleClose}
            className="icon-btn h-9 w-9 shrink-0 rounded-full p-0 text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 pb-6 pt-4 overflow-y-auto">
          <div className="space-y-2">
            {/* Без группы */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all',
                selectedGroupId === null
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)]">
                <Folder className="h-5 w-5 text-[var(--fg-muted)]" />
              </div>
              <span className="flex-1 font-medium text-[var(--fg)]">Без группы</span>
              {selectedGroupId === null && (
                <Check className="h-5 w-5 text-[var(--accent)]" />
              )}
            </button>

            {/* Группы */}
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => handleSelect(group.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all',
                  selectedGroupId === group.id
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-subtle)]">
                  <Folder className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <span className="flex-1 font-medium text-[var(--fg)]">{group.name}</span>
                {selectedGroupId === group.id && (
                  <Check className="h-5 w-5 text-[var(--accent)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
