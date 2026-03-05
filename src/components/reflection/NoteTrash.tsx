import { Trash2, RotateCcw, X } from 'lucide-react'
import { relativeDateRu } from '../../lib/reflectionUtils'
import type { Note } from '../../types/domain'

interface NoteTrashProps {
  notes: Note[]
  onRestore: (id: string) => void
  onPermanentDelete: (id: string) => void
  onEmptyTrash: () => void
  onBack: () => void
}

export default function NoteTrash({ notes, onRestore, onPermanentDelete, onEmptyTrash, onBack }: NoteTrashProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="icon-btn h-8 w-8 shrink-0">
          <X className="h-4 w-4" />
        </button>
        <Trash2 className="h-5 w-5 text-[var(--fg-muted)]" />
        <h3 className="flex-1 text-sm font-semibold text-[var(--fg)]">Корзина</h3>
        {notes.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Удалить все заметки из корзины навсегда?')) onEmptyTrash()
            }}
            className="text-xs text-[var(--danger)] hover:underline"
          >
            Очистить
          </button>
        )}
      </div>

      <p className="text-xs text-[var(--fg-muted)]">
        Удалённые заметки хранятся 30 дней
      </p>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-[var(--fg-muted)]">Корзина пуста</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--fg)]">
                  {note.title || 'Без названия'}
                </p>
                <p className="text-[10px] text-[var(--fg-muted)]">
                  Удалено {relativeDateRu(note.deletedAt!)}
                </p>
              </div>
              <button
                onClick={() => onRestore(note.id)}
                className="icon-btn h-8 w-8 text-[var(--accent)]"
                title="Восстановить"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm('Удалить заметку навсегда?')) onPermanentDelete(note.id)
                }}
                className="icon-btn h-8 w-8 text-[var(--danger)]"
                title="Удалить навсегда"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
