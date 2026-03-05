import { useEffect, useState } from 'react'
import { Pin } from 'lucide-react'
import { cn } from '../../lib/cn'
import { relativeDateRu } from '../../lib/reflectionUtils'
import { vaultStorage } from '../../lib/vaultStorage'
import { useRpgStore } from '../../store/useRpgStore'
import type { Note } from '../../types/domain'

interface NoteCardProps {
  note: Note
  isSelected: boolean
  onClick: () => void
}

export default function NoteCard({ note, isSelected, onClick }: NoteCardProps) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const noteTags = useRpgStore((s) => s.noteTags)

  // Resolve first image thumbnail
  useEffect(() => {
    if (note.mediaFiles.length === 0) {
      setThumbSrc(null)
      return
    }
    let cancelled = false
    vaultStorage.readMedia(note.mediaFiles[0]).then((data) => {
      if (!cancelled && data) setThumbSrc(data)
    })
    return () => { cancelled = true }
  }, [note.mediaFiles])

  const content = typeof note.content === 'string' ? note.content : note.excerpt

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full rounded-2xl text-left transition-all duration-200',
        'bg-[var(--surface-card)] backdrop-blur-lg',
        'border border-[var(--border)]',
        'hover:border-[var(--border-accent)] hover:shadow-lg hover:-translate-y-0.5',
        isSelected && 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg',
      )}
    >
      <div className="p-4">
        {/* Title + date row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="truncate text-sm font-semibold text-[var(--fg)]">
              {note.title || 'Без названия'}
            </h3>
            {note.pinned && (
              <Pin className="h-3 w-3 shrink-0 text-[var(--accent)]" />
            )}
          </div>
          <span className="shrink-0 text-[10px] text-[var(--fg-muted)]">
            {relativeDateRu(note.updatedAt)}
          </span>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {note.tags.map((tag) => {
              const tagObj = noteTags.find(
                (t) => t.profileId === activeProfileId && t.name === tag
              )
              const color = tagObj?.color ?? '#6b7280'
              return (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: color + '20', color }}
                >
                  {tag}
                </span>
              )
            })}
          </div>
        )}

        {/* Content preview */}
        {content && (
          <p className="line-clamp-3 text-xs text-[var(--fg-muted)] leading-relaxed">
            {content}
          </p>
        )}

        {/* Image thumbnail */}
        {thumbSrc && (
          <div className="mt-2 overflow-hidden rounded-xl">
            <img
              src={thumbSrc}
              alt=""
              className="h-32 w-full object-cover"
            />
          </div>
        )}

        {/* Meta badges */}
        {(note.linkedTaskIds.length > 0 || note.mediaFiles.length > 1) && (
          <div className="mt-2 flex items-center gap-2">
            {note.linkedTaskIds.length > 0 && (
              <span className="rounded-full bg-[var(--accent-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                {note.linkedTaskIds.length} задач
              </span>
            )}
            {note.mediaFiles.length > 1 && (
              <span className="rounded-full bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--fg-muted)]">
                {note.mediaFiles.length} фото
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
