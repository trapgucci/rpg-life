import { useState, useEffect } from 'react'
import Modal from '../Modal'
import type { NoteFolder } from '../../types/domain'

const FOLDER_COLORS = [
  '#14b8a6', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#22c55e', '#f97316', '#3b82f6',
  '#a855f7', '#84cc16', '#e11d48', '#0891b2', '#d946ef',
  '#64748b', '#ea580c', '#059669', '#7c3aed', '#dc2626',
]

interface FolderFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, icon: string, color: string) => void
  folder?: NoteFolder | null
}

export default function FolderFormModal({ isOpen, onClose, onSave, folder }: FolderFormModalProps) {
  const [name, setName] = useState(folder?.name ?? '')
  const [color, setColor] = useState(folder?.color ?? '#14b8a6')

  // Reset state when modal opens with new folder
  useEffect(() => {
    if (isOpen) {
      setName(folder?.name ?? '')
      setColor(folder?.color ?? '#14b8a6')
    }
  }, [isOpen, folder])

  const handleSave = () => {
    if (!name.trim()) return
    onSave(name.trim(), '', color)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={folder ? 'Редактировать папку' : 'Новая папка'} size="sm">
      <div className="flex flex-col gap-4 p-6">
        {/* Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--fg)]">Название</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название папки"
            className="input w-full text-sm"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>

        {/* Color */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--fg)]">Цвет</label>
          <div className="flex flex-wrap gap-2">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full transition-all ${
                  color === c ? 'ring-2 ring-[var(--fg)] ring-offset-2 scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary rounded-xl px-4 py-2 text-sm">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="btn-primary rounded-xl px-4 py-2 text-sm disabled:opacity-50"
          >
            {folder ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
