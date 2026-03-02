import { Pin, FileText } from 'lucide-react'
import { cn } from '../../lib/cn'
import { relativeDateRu } from '../../lib/reflectionUtils'
import type { Note } from '../../types/domain'

interface NoteCardProps {
  note: Note
  isSelected: boolean
  onClick: () => void
}

export default function NoteCard({ note, isSelected, onClick }: NoteCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full rounded-2xl p-4 text-left transition-all duration-200',
        'bg-[var(--surface-card)] backdrop-blur-lg',
        'border border-[var(--border)]',
        'hover:border-[var(--border-accent)] hover:shadow-lg hover:-translate-y-0.5',
        isSelected && 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)]">
          <FileText className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[var(--fg)]">
              {note.title || 'Без названия'}
            </h3>
            {note.pinned && (
              <Pin className="h-3 w-3 shrink-0 text-[var(--accent)]" />
            )}
          </div>
          {note.excerpt && (
            <p className="mt-1 line-clamp-2 text-xs text-[var(--fg-muted)]">
              {note.excerpt}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-[var(--fg-muted)]">
              {relativeDateRu(note.updatedAt)}
            </span>
            {note.linkedTaskIds.length > 0 && (
              <span className="rounded-full bg-[var(--accent-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                {note.linkedTaskIds.length} задач
              </span>
            )}
            {note.mediaFiles.length > 0 && (
              <span className="rounded-full bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--fg-muted)]">
                {note.mediaFiles.length} фото
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
