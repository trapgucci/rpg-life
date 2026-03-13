import { useState } from 'react'
import { Check, X } from 'lucide-react'
import Modal from './Modal'

interface SavePresetModalProps {
  isOpen: boolean
  onSave: (name: string, icon: string) => void
  onClose: () => void
}

const PRESET_ICONS = ['⚡', '🏋', '📖', '🧹', '💻', '🎯', '🎵', '✍️', '🏃', '🧘', '📝', '🔧', '🎨', '📚', '🏠', '💼']

export default function SavePresetModal({ isOpen, onSave, onClose }: SavePresetModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('⚡')
  const [error, setError] = useState('')

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Введите название пресета')
      return
    }
    onSave(trimmed, icon)
    setName('')
    setIcon('⚡')
    setError('')
    onClose()
  }

  const handleClose = () => {
    setName('')
    setIcon('⚡')
    setError('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="sm"
      title="Сохранить пресет"
      showCloseButton
      closeOnBackdropClick
      closeOnEscape
    >
      <div className="px-4 pb-4 pt-3 space-y-4">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-2">
            Название
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleClose()
            }}
            placeholder="Напр. Ежедневная тренировка"
            className="input w-full text-sm"
            autoFocus
            maxLength={40}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-2">
            Иконка
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all ${
                  icon === ic
                    ? 'bg-[var(--accent-subtle)] ring-2 ring-[var(--accent)] scale-110'
                    : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)] ring-1 ring-inset ring-[var(--border)]'
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border border-[var(--border)] text-[var(--fg-secondary)] hover:bg-[var(--surface-elevated)] transition-all"
          >
            <X className="h-4 w-4" />
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-[var(--accent)] hover:brightness-110 transition-all shadow-lg shadow-[var(--accent)]/25"
          >
            <Check className="h-4 w-4" />
            Сохранить
          </button>
        </div>
      </div>
    </Modal>
  )
}
