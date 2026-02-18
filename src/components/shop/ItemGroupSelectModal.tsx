import { useState } from 'react'
import { Folder, Check, Plus, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useRpgStore } from '../../store/useRpgStore'
import Modal from '../Modal'

interface ItemGroupSelectModalProps {
  isOpen: boolean
  selectedGroupId: string | null
  onSelect: (groupId: string | null) => void
  onClose: () => void
}

export default function ItemGroupSelectModal({
  isOpen,
  selectedGroupId,
  onSelect,
  onClose,
}: ItemGroupSelectModalProps) {
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const addItemGroup = useRpgStore((s) => s.addItemGroup)

  const groups = activeProfileId
    ? allItemGroups.filter((g) => g.profileId === activeProfileId).slice().sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  const [showAddGroup, setShowAddGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const handleSelect = (groupId: string | null) => {
    onSelect(groupId)
    onClose()
  }

  const handleAddGroup = () => {
    const name = newGroupName.trim()
    if (!name) return
    const group = addItemGroup(name)
    setNewGroupName('')
    setShowAddGroup(false)
    handleSelect(group.id)
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

          {/* Добавить группу */}
          {showAddGroup ? (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddGroup()
                  if (e.key === 'Escape') {
                    setShowAddGroup(false)
                    setNewGroupName('')
                  }
                }}
                placeholder="Название группы"
                className="input flex-1 text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddGroup}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddGroup(false)
                  setNewGroupName('')
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddGroup(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[var(--accent)] text-[var(--accent)]">
                <Plus className="h-4 w-4" />
              </div>
              <span className="flex-1 text-sm font-medium text-[var(--fg)]">Добавить группу</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
