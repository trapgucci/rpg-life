import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  ArrowLeft, Trash2, Search,
  Check, X, ImagePlus,
  CheckSquare, Hash, ClipboardList,
} from 'lucide-react'
import ImageLightbox from './ImageLightbox'
import { useRpgStore } from '../../store/useRpgStore'
import { vaultStorage } from '../../lib/vaultStorage'
import { resizeImageFile } from '../../lib/resizeImage'
import { relativeDateRu } from '../../lib/reflectionUtils'
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

interface NoteEditorProps {
  note: Note
  onBack: () => void
  onDelete: () => void
}

/** Auto-resize textarea to fit content */
function useAutoResize(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [ref, value])
}

export default function NoteEditor({ note, onBack, onDelete }: NoteEditorProps) {
  const updateNote = useRpgStore((s) => s.updateNote)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const rawTasks = useRpgStore((s) => s.tasks)

  const tasks = useMemo(
    () => rawTasks.filter((t) => t.profileId === activeProfileId),
    [rawTasks, activeProfileId],
  )

  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(typeof note.content === 'string' ? note.content : '')
  const [taskSearch, setTaskSearch] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [mediaThumbs, setMediaThumbs] = useState<Map<string, string>>(new Map())

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const savedIndicatorRef = useRef<ReturnType<typeof setTimeout>>()

  useAutoResize(textareaRef, content)

  // Resolve media thumbnails
  useEffect(() => {
    let cancelled = false
    const resolve = async () => {
      const thumbs = new Map<string, string>()
      for (const path of note.mediaFiles) {
        const dataUrl = await vaultStorage.readMedia(path)
        if (cancelled) return
        if (dataUrl) thumbs.set(path, dataUrl)
      }
      if (!cancelled) setMediaThumbs(thumbs)
    }
    resolve()
    return () => { cancelled = true }
  }, [note.mediaFiles])

  // Sync from note prop when switching notes
  useEffect(() => {
    setTitle(note.title)
    setContent(typeof note.content === 'string' ? note.content : '')
  }, [note.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save helper
  const scheduleSave = useCallback((updater: (n: Note) => Note) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(() => {
      updateNote(note.id, updater)
      setSaveStatus('saved')
      if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current)
      savedIndicatorRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
  }, [note.id, updateNote])

  // Save title
  useEffect(() => {
    scheduleSave((n) => ({ ...n, title }))
  }, [title]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save content
  useEffect(() => {
    const excerpt = content.slice(0, 200)
    scheduleSave((n) => ({ ...n, content, excerpt }))
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current)
    }
  }, [])

  const handleDone = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = undefined
    }
    if (savedIndicatorRef.current) {
      clearTimeout(savedIndicatorRef.current)
      savedIndicatorRef.current = undefined
    }
    // Discard empty notes instead of saving
    if (!title.trim() && !content.trim()) {
      onDelete()
      return
    }
    const excerpt = content.slice(0, 200)
    updateNote(note.id, (n) => ({ ...n, title, content, excerpt }))
    onBack()
  }, [title, content, note.id, updateNote, onBack, onDelete])

  const setLinkedTask = (taskId: string | null) => {
    updateNote(note.id, (n) => ({
      ...n,
      linkedTaskIds: taskId ? [taskId] : [],
    }))
  }

  // Images
  const handleInsertImage = () => fileInputRef.current?.click()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fileList = Array.from(files)
    e.target.value = ''

    for (const file of fileList) {
      try {
        const resized = await resizeImageFile(file)
        const mediaPath = await vaultStorage.saveMedia(resized, 'webp')
        if (!mediaPath) continue
        updateNote(note.id, (n) => ({
          ...n,
          mediaFiles: [...n.mediaFiles, mediaPath],
        }))
      } catch (err) {
        console.error('Failed to add image:', err)
      }
    }
  }

  const removeImage = (mediaPath: string) => {
    vaultStorage.deleteMedia(mediaPath).catch(() => {})
    updateNote(note.id, (n) => ({
      ...n,
      mediaFiles: n.mediaFiles.filter((p) => p !== mediaPath),
    }))
  }

  // Linked tasks for display
  const linkedTasks = useMemo(
    () => tasks.filter((t) => note.linkedTaskIds.includes(t.id)),
    [tasks, note.linkedTaskIds],
  )

  // Filtered tasks for task selector
  const filteredTasks = useMemo(() => {
    const q = taskSearch.toLowerCase().trim()
    const active = tasks.filter((t) => !t.archived && !note.linkedTaskIds.includes(t.id))
    if (!q) return active.slice(0, 20)
    return active.filter((t) => t.title.toLowerCase().includes(q))
  }, [tasks, taskSearch, note.linkedTaskIds])

  const canSave = title.trim() || content.trim()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <button onClick={handleDone} className="icon-btn h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Без названия"
          className="flex-1 bg-transparent text-lg font-bold text-[var(--fg)] outline-none placeholder:text-[var(--fg-muted)]"
        />
        <button onClick={onDelete} className="icon-btn h-8 w-8 shrink-0 text-[var(--danger)]" title="Удалить">
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          onClick={handleDone}
          disabled={!canSave}
          className="shrink-0 rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Готово
        </button>
      </div>

      {/* Content */}
      <div className="flex-1">
        {/* Text content */}
        <div className="px-4 py-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Начните писать…"
            className="w-full resize-none overflow-hidden bg-transparent text-sm text-[var(--fg)] leading-relaxed outline-none placeholder:text-[var(--fg-muted)]"
            style={{ minHeight: '120px' }}
          />
        </div>

        {/* Linked tasks — achievement-style */}
        <div className="px-4 pb-3">
          <div
            className="rounded-2xl border border-[var(--border)] p-4 space-y-3"
            style={{
              background: 'linear-gradient(135deg, var(--surface-card) 0%, var(--surface) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
              <ClipboardList className="h-3.5 w-3.5" />
              Привязка к задачам
            </label>

            {linkedTasks.length > 0 ? (() => {
              const task = linkedTasks[0]
              const recInfo = RECURRENCE_LABELS[task.recurrence]
              const KindIcon = TASK_KIND_ICONS[task.kind] ?? CheckSquare
              return (
                <div
                  className="flex items-center gap-3 rounded-xl border-2 border-[var(--accent)] p-3 transition-all"
                  style={{ background: 'var(--accent-subtle)' }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${recInfo.color}20` }}
                  >
                    <KindIcon className="h-4.5 w-4.5" style={{ color: recInfo.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--fg)] truncate">{task.title}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: recInfo.color }}>{recInfo.label}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLinkedTask(null)}
                    className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] transition-colors"
                  >
                    Изменить
                  </button>
                </div>
              )
            })() : (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Поиск задачи..."
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                {/* Task list */}
                <div className="max-h-52 overflow-y-auto space-y-1 scrollbar-thin">
                  {filteredTasks.length === 0 ? (
                    <p className="text-xs text-[var(--fg-muted)] text-center py-4">Задачи не найдены</p>
                  ) : (
                    filteredTasks.map((task) => {
                      const recInfo = RECURRENCE_LABELS[task.recurrence]
                      const KindIcon = TASK_KIND_ICONS[task.kind] ?? CheckSquare
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => { setLinkedTask(task.id); setTaskSearch('') }}
                          className="w-full flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all hover:bg-[var(--surface-elevated)]"
                        >
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${recInfo.color}15` }}
                          >
                            <KindIcon className="h-4 w-4" style={{ color: recInfo.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate text-[var(--fg)]">{task.title}</p>
                            <p className="text-[10px] mt-0.5 text-[var(--fg-muted)]">{recInfo.label}</p>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Images */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-[var(--fg-muted)]">Изображения</p>
            <button
              onClick={handleInsertImage}
              className="icon-btn h-7 w-7"
              title="Добавить изображение"
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </button>
          </div>

          {note.mediaFiles.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {note.mediaFiles.map((path, idx) => {
                const thumb = mediaThumbs.get(path)
                return (
                  <div key={path} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover cursor-pointer"
                        onClick={() => {
                          setLightboxImages(note.mediaFiles)
                          setLightboxIndex(idx)
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--fg-muted)]">
                        Загрузка…
                      </div>
                    )}
                    <button
                      onClick={() => removeImage(path)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <button
              onClick={handleInsertImage}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] py-8 text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              <ImagePlus className="h-8 w-8 opacity-40" />
              <span className="text-xs">Добавить изображение</span>
            </button>
          )}
        </div>

      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2 text-[10px] text-[var(--fg-muted)]">
        <span>
          Обновлено {relativeDateRu(note.updatedAt)}
          {note.linkedTaskIds.length > 0 && ` · ${note.linkedTaskIds.length} задач привязано`}
          {note.mediaFiles.length > 0 && ` · ${note.mediaFiles.length} изображений`}
        </span>
        {saveStatus === 'saving' && (
          <span className="text-[var(--fg-muted)] animate-pulse">Сохраняю…</span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1 text-emerald-500">
            <Check className="h-3 w-3" />
            Сохранено
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Lightbox */}
      {lightboxImages && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxImages(null)}
        />
      )}
    </div>
  )
}
