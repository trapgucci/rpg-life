import { useEffect, useState, useMemo } from 'react'
import { Pin, CheckSquare, Hash, ClipboardList } from 'lucide-react'
import { cn } from '../../lib/cn'
import { relativeDateRu } from '../../lib/reflectionUtils'
import { vaultStorage } from '../../lib/vaultStorage'
import { useRpgStore } from '../../store/useRpgStore'
import type { Note, TaskRecurrence } from '../../types/domain'

const RECURRENCE_LABELS: Record<TaskRecurrence, { label: string; color: string }> = {
  once: { label: 'Один раз', color: '#6b7280' },
  daily: { label: 'Ежедневно', color: '#3b82f6' },
  weekly: { label: 'Еженедельно', color: '#8b5cf6' },
  monthly: { label: 'Ежемесячно', color: '#ec4899' },
  yearly: { label: 'Ежегодно', color: '#f59e0b' },
  instant: { label: 'Инстант', color: '#22c55e' },
  custom: { label: 'Кастомный', color: '#6366f1' },
}

const TASK_KIND_ICONS: Record<string, typeof CheckSquare> = {
  checkbox: CheckSquare,
  counter: Hash,
  nested: ClipboardList,
}

interface NoteCardProps {
  note: Note
  isSelected: boolean
  onClick: () => void
}

export default function NoteCard({ note, isSelected, onClick }: NoteCardProps) {
  const [thumbs, setThumbs] = useState<Map<string, string>>(new Map())
  const rawTasks = useRpgStore((s) => s.tasks)

  // Resolve all image thumbnails
  useEffect(() => {
    if (note.mediaFiles.length === 0) {
      setThumbs(new Map())
      return
    }
    let cancelled = false
    const resolve = async () => {
      const map = new Map<string, string>()
      for (const path of note.mediaFiles) {
        const data = await vaultStorage.readMedia(path)
        if (cancelled) return
        if (data) map.set(path, data)
      }
      if (!cancelled) setThumbs(map)
    }
    resolve()
    return () => { cancelled = true }
  }, [note.mediaFiles])

  const content = typeof note.content === 'string' ? note.content : note.excerpt

  const linkedTask = useMemo(() => {
    if (note.linkedTaskIds.length === 0) return null
    return rawTasks.find((t) => t.id === note.linkedTaskIds[0]) ?? null
  }, [rawTasks, note.linkedTaskIds])

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

        {/* Content preview */}
        {content && (
          <p className="line-clamp-3 text-xs text-[var(--fg-muted)] leading-relaxed">
            {content}
          </p>
        )}

        {/* Image thumbnails */}
        {note.mediaFiles.length > 0 && thumbs.size > 0 && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {note.mediaFiles.map((path) => {
              const src = thumbs.get(path)
              if (!src) return null
              return (
                <div key={path} className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </div>
              )
            })}
          </div>
        )}

        {/* Linked task */}
        {linkedTask && (() => {
          const recInfo = RECURRENCE_LABELS[linkedTask.recurrence]
          const KindIcon = TASK_KIND_ICONS[linkedTask.kind] ?? CheckSquare
          return (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--accent)]/8 px-2 py-1">
              <KindIcon className="h-3 w-3 shrink-0" style={{ color: recInfo.color }} />
              <p className="text-[10px] font-medium text-[var(--accent)] truncate">{linkedTask.title}</p>
            </div>
          )
        })()}
      </div>
    </button>
  )
}
