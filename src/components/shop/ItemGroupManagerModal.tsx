import { useState, useMemo } from 'react'
import { cn } from '../../lib/cn'
import { Plus, X, Trash, GripVertical, Palette } from 'lucide-react'
import { useRpgStore } from '../../store/useRpgStore'
import ConfirmModal from '../ConfirmModal'
import type { ItemGroup } from '../../types/domain'

interface ItemGroupManagerModalProps {
  onClose: () => void
}

export default function ItemGroupManagerModal({ onClose }: ItemGroupManagerModalProps) {
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const groups = useMemo(
    () =>
      activeProfileId
        ? allItemGroups
            .filter((g) => g.profileId === activeProfileId)
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [allItemGroups, activeProfileId]
  )
  const addItemGroup = useRpgStore((s) => s.addItemGroup)
  const updateItemGroup = useRpgStore((s) => s.updateItemGroup)
  const deleteItemGroup = useRpgStore((s) => s.deleteItemGroup)
  const reorderItemGroups = useRpgStore((s) => s.reorderItemGroups)
  const [name, setName] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    addItemGroup(trimmed)
    setName('')
  }

  const handleRename = (group: ItemGroup, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === group.name) return
    updateItemGroup(group.id, (g) => ({ ...g, name: trimmed }))
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.setData('application/x-group-id', id)
  }
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (draggedId && draggedId !== id) setDragOverId(id)
  }
  const handleDragLeave = () => setDragOverId(null)
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)
    setDraggedId(null)
    const id = e.dataTransfer.getData('application/x-group-id')
    if (!id || id === targetId) return
    const ids = groups.map((g) => g.id)
    const fromIdx = ids.indexOf(id)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const next = [...ids]
    next.splice(fromIdx, 1)
    next.splice(toIdx, 0, id)
    reorderItemGroups(next)
  }
  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Группы предметов</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-[var(--fg-muted)] mb-4">
          Создавайте пользовательские группы, чтобы удобно сортировать предметы в магазине. Порядок групп здесь = порядок в строке магазина. Перетаскивайте группы для изменения порядка.
        </p>

        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название группы, например «Базовые»"
            className="input flex-1"
          />
          <button type="submit" className="btn-primary">
            <Plus className="h-4 w-4" />
          </button>
        </form>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--fg-muted)] text-center">
            Пока нет ни одной группы. Создайте первую, чтобы начать сортировку.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div
                key={group.id}
                draggable
                onDragStart={(e) => handleDragStart(e, group.id)}
                onDragOver={(e) => handleDragOver(e, group.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, group.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'group-card flex items-center gap-2 rounded-xl border bg-[var(--surface)] px-3 py-2 transition-colors',
                  dragOverId === group.id ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30' : 'border-[var(--border)]',
                  draggedId === group.id && 'opacity-50'
                )}
              >
                <span
                  className="cursor-grab active:cursor-grabbing text-[var(--fg-muted)] hover:text-[var(--fg)] touch-none shrink-0"
                  title="Перетащить для изменения порядка"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
                <input
                  defaultValue={group.name}
                  onBlur={(e) => handleRename(group, e.target.value)}
                  className="bg-transparent flex-1 text-sm text-[var(--fg)] outline-none min-w-0"
                />
                <label
                  className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] cursor-pointer hover:bg-[var(--surface)] transition-colors"
                  title="Цвет группы (фон иконки на карточках)"
                >
                  <Palette className="h-4 w-4 text-[var(--fg-muted)]" />
                  <span
                    className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-white/80 shadow-sm"
                    style={{ backgroundColor: group.color ?? '#22c55e' }}
                  />
                  <input
                    type="color"
                    value={group.color ?? '#22c55e'}
                    onChange={(e) => updateItemGroup(group.id, (g) => ({ ...g, color: e.target.value }))}
                    className="sr-only"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setDeletingGroupId(group.id)}
                  className="icon-btn icon-btn-danger shrink-0"
                  title="Удалить группу"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <ConfirmModal
          isOpen={deletingGroupId !== null}
          title="Удалить группу?"
          message="Предметы из неё останутся без группы."
          variant="danger"
          confirmText="Удалить"
          onConfirm={() => {
            if (deletingGroupId) deleteItemGroup(deletingGroupId)
            setDeletingGroupId(null)
          }}
          onCancel={() => setDeletingGroupId(null)}
        />
      </div>
    </div>
  )
}
