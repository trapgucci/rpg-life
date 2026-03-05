import { useState, useEffect } from 'react'
import Modal from '../Modal'
import type { NoteFolder, TiptapContent } from '../../types/domain'

const FOLDER_ICONS = ['📁', '📂', '📝', '💡', '🎯', '💪', '🧠', '🎨', '🎬', '📚', '🎮', '🍳', '🏃', '❤️', '⭐', '🔥']
const FOLDER_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#22c55e', '#f97316', '#3b82f6']

const TEMPLATE_PRESETS: { label: string; name: string; content: TiptapContent }[] = [
  {
    label: '📋 Обзор дня',
    name: 'Обзор дня',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Что сделано' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }] }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Что не получилось' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'План на завтра' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }] }] },
      ],
    },
  },
  {
    label: '💪 Тренировка',
    name: 'Тренировка',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Упражнения' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }] }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Самочувствие' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Заметки' }] },
        { type: 'paragraph' },
      ],
    },
  },
  {
    label: '💡 Идея',
    name: 'Идея',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Суть идеи' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Почему это важно' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Следующие шаги' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }] }] },
      ],
    },
  },
]

interface FolderFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, icon: string, color: string, template: TiptapContent | null, templateName: string | undefined) => void
  folder?: NoteFolder | null
}

export default function FolderFormModal({ isOpen, onClose, onSave, folder }: FolderFormModalProps) {
  const [name, setName] = useState(folder?.name ?? '')
  const [icon, setIcon] = useState(folder?.icon ?? '📁')
  const [color, setColor] = useState(folder?.color ?? '#14b8a6')
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null) // index in TEMPLATE_PRESETS, null = no template

  // Reset state when modal opens with new folder
  useEffect(() => {
    if (isOpen) {
      setName(folder?.name ?? '')
      setIcon(folder?.icon ?? '📁')
      setColor(folder?.color ?? '#14b8a6')
      // Find matching template preset
      if (folder?.templateName) {
        const idx = TEMPLATE_PRESETS.findIndex((t) => t.name === folder.templateName)
        setSelectedTemplate(idx >= 0 ? idx : null)
      } else {
        setSelectedTemplate(null)
      }
    }
  }, [isOpen, folder])

  const handleSave = () => {
    if (!name.trim()) return
    const preset = selectedTemplate !== null ? TEMPLATE_PRESETS[selectedTemplate] : null
    onSave(
      name.trim(),
      icon,
      color,
      preset?.content ?? null,
      preset?.name ?? undefined,
    )
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

        {/* Icon */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--fg)]">Иконка</label>
          <div className="flex flex-wrap gap-2">
            {FOLDER_ICONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setIcon(emoji)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all ${
                  icon === emoji
                    ? 'bg-[var(--accent-subtle)] ring-2 ring-[var(--accent)] scale-110'
                    : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
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

        {/* Template */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--fg)]">Шаблон заметки</label>
          <p className="mb-2 text-xs text-[var(--fg-muted)]">Новые заметки в папке будут созданы с этим шаблоном</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTemplate(null)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
                selectedTemplate === null
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent)] ring-2 ring-[var(--accent)]'
                  : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)]'
              }`}
            >
              Без шаблона
            </button>
            {TEMPLATE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedTemplate(idx)}
                className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
                  selectedTemplate === idx
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)] ring-2 ring-[var(--accent)]'
                    : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)]'
                }`}
              >
                {preset.label}
              </button>
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
