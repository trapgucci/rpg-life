import { Folder, Check } from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import type { TaskGroupId } from '../types/domain'
import Modal from './Modal'

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
  const getTaskGroups = useRpgStore((s) => s.getTaskGroups)
  const groups = getTaskGroups()

  const handleSelect = (groupId: TaskGroupId | null) => {
    onSelect(groupId)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title="Выбрать группу"
      showCloseButton
      closeOnBackdropClick
      closeOnEscape
    >
      <div className="px-4 pb-4 pt-3 max-h-[65vh] overflow-y-auto">
        <div className="space-y-2">
          {/* Без группы */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
              selectedGroupId === null
                ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)]">
              <Folder className="h-4 w-4 text-[var(--fg-muted)]" />
            </div>
            <span className="flex-1 text-sm font-medium text-[var(--fg)]">Без группы</span>
            {selectedGroupId === null && (
              <Check className="h-4 w-4 text-[var(--accent)] shrink-0" />
            )}
          </button>

          {/* Группы */}
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => handleSelect(group.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
                selectedGroupId === group.id
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-subtle)]">
                <Folder className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <span className="flex-1 text-sm font-medium text-[var(--fg)]">{group.name}</span>
              {selectedGroupId === group.id && (
                <Check className="h-4 w-4 text-[var(--accent)] shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
