import { useState, useLayoutEffect, useEffect } from 'react'
import { X, Plus, Save, Zap, Coins } from 'lucide-react'
import { cn } from '../lib/cn'

interface SubtaskCreateModalProps {
  isOpen: boolean
  editingSubtask?: { id: string; title: string; description: string; coinReward: number; xpReward: number } | null
  onAdd: (subtask: { title: string; description: string; coinReward: number; xpReward: number }) => void
  onEdit?: (subtask: { id: string; title: string; description: string; coinReward: number; xpReward: number }) => void
  onClose: () => void
}

export default function SubtaskCreateModal({ isOpen, editingSubtask, onAdd, onEdit, onClose }: SubtaskCreateModalProps) {
  const [animatedOpen, setAnimatedOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coinReward, setCoinReward] = useState(0)
  const [xpReward, setXpReward] = useState(0)

  // Загрузка данных при редактировании
  useEffect(() => {
    if (isOpen && editingSubtask) {
      setTitle(editingSubtask.title)
      setDescription(editingSubtask.description)
      setCoinReward(editingSubtask.coinReward)
      setXpReward(editingSubtask.xpReward)
    } else if (isOpen && !editingSubtask) {
      setTitle('')
      setDescription('')
      setCoinReward(0)
      setXpReward(0)
    }
  }, [isOpen, editingSubtask])

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

  const handleSubmit = () => {
    if (!title.trim()) return

    if (editingSubtask && onEdit) {
      onEdit({
        id: editingSubtask.id,
        title: title.trim(),
        description,
        coinReward,
        xpReward
      })
    } else {
      onAdd({ title: title.trim(), description, coinReward, xpReward })
    }

    setTitle('')
    setDescription('')
    setCoinReward(0)
    setXpReward(0)
    handleClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div
        role="presentation"
        onClick={handleClose}
        className={cn(
          'fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          animatedOpen ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Добавить подзадачу"
        className={cn(
          'fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none'
        )}
      >
        <div
          className={cn(
            'pointer-events-auto w-full max-w-md rounded-2xl bg-white dark:bg-[var(--surface-overlay)] shadow-2xl transition-all duration-300 ease-out',
            animatedOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
          )}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--fg)]">
              {editingSubtask ? 'Редактировать подзадачу' : 'Новая подзадача'}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="icon-btn h-9 w-9 shrink-0 rounded-full p-0 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Название</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Название подзадачи"
                className="input w-full"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание (опционально)"
                rows={2}
                className="input w-full resize-none"
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-[var(--fg-muted)] mb-1.5">
                  🪙 Монеты
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCoinReward((v) => Math.max(0, v - 5))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={coinReward}
                    onChange={(e) => setCoinReward(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="input flex-1 h-10 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setCoinReward((v) => v + 5)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-[var(--fg-muted)] mb-1.5">
                  <Zap className="h-3 w-3 text-purple-500" /> XP
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setXpReward((v) => Math.max(0, v - 5))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={xpReward}
                    onChange={(e) => setXpReward(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="input flex-1 h-10 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setXpReward((v) => v + 5)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[var(--fg-muted)]">
              XP подзадачи начисляются в атрибуты основной задачи
            </p>
          </div>
          <div className="px-5 pb-5 flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {editingSubtask ? (
                <>
                  <Save className="h-4 w-4" />
                  Сохранить
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Добавить
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary flex-1"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
