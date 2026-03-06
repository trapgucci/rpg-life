import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  ArrowLeft, Trash2, Search,
  Check, X, ImagePlus,
  CheckSquare,
  Link,
} from 'lucide-react'
import ImageLightbox from './ImageLightbox'
import { useRpgStore } from '../../store/useRpgStore'
import { RECURRENCE_LABELS, TASK_KIND_ICONS } from '../../lib/taskConstants'
import { vaultStorage } from '../../lib/vaultStorage'
import { resizeImageFile } from '../../lib/resizeImage'
import { relativeDateRu } from '../../lib/reflectionUtils'
import type { Note } from '../../types/domain'

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
  const [content, setContent] = useState('')
  const [contentLoaded, setContentLoaded] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [showTaskPicker, setShowTaskPicker] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [mediaThumbs, setMediaThumbs] = useState<Map<string, string>>(new Map())

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const savedIndicatorRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const titleRef = useRef(title)
  const contentRef = useRef(content)

  useAutoResize(textareaRef, content)

  // Keep refs in sync with latest values
  useEffect(() => { titleRef.current = title }, [title])
  useEffect(() => { contentRef.current = content }, [content])

  // Resolve media thumbnails
  useEffect(() => {
    let cancelled = false
    const resolve = async () => {
      const thumbs = new Map<string, string>()
      const results = await Promise.all(
        note.mediaFiles.map(async (path) => {
          const data = await vaultStorage.readMedia(path)
          return { path, data }
        })
      )
      if (cancelled) return
      for (const { path, data } of results) {
        if (data) thumbs.set(path, data)
      }
      setMediaThumbs(thumbs)
    }
    resolve()
    return () => { cancelled = true }
  }, [note.mediaFiles])

  // Sync from note prop when switching notes — load content from file
  useEffect(() => {
    setTitle(note.title)
    setContent('')
    setContentLoaded(false)
    setShowTaskPicker(false)

    vaultStorage.readNoteContent(note.id).then((loaded) => {
      setContent(loaded)
      setContentLoaded(true)
    }).catch(() => {
      setContent('')
      setContentLoaded(true)
    })
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

  // Cleanup — flush unsaved changes on unmount
  useEffect(() => {
    return () => {
      if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        const t = titleRef.current
        const c = contentRef.current
        const excerpt = c.slice(0, 200)
        updateNote(note.id, (n) => ({ ...n, title: t, content: c, excerpt }))
      }
    }
  }, [note.id, updateNote])

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
    setShowTaskPicker(false)
    setTaskSearch('')
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
  const hasLinkedTask = linkedTasks.length > 0
  const hasImages = note.mediaFiles.length > 0

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
          {!contentLoaded ? (
            <div className="flex items-center justify-center text-[var(--fg-muted)] text-sm" style={{ minHeight: '120px' }}>
              Загрузка…
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Начните писать…"
              className="w-full resize-none overflow-hidden bg-transparent text-sm text-[var(--fg)] leading-relaxed outline-none placeholder:text-[var(--fg-muted)]"
              style={{ minHeight: '120px' }}
            />
          )}
        </div>

        {/* Toolbar buttons for attachments */}
        <div className="flex items-center gap-2 px-4 pb-3">
          {/* Link task button / chip */}
          {hasLinkedTask ? (() => {
            const task = linkedTasks[0]
            const recInfo = RECURRENCE_LABELS[task.recurrence]
            const KindIcon = TASK_KIND_ICONS[task.kind] ?? CheckSquare
            return (
              <button
                onClick={() => setShowTaskPicker(!showTaskPicker)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--surface-elevated)]"
              >
                <KindIcon className="h-3 w-3" style={{ color: recInfo.color }} />
                <span className="max-w-[150px] truncate text-[var(--fg)]">{task.title}</span>
                <X
                  className="h-3 w-3 text-[var(--fg-muted)] hover:text-[var(--danger)]"
                  onClick={(e) => { e.stopPropagation(); setLinkedTask(null) }}
                />
              </button>
            )
          })() : (
            <button
              onClick={() => setShowTaskPicker(!showTaskPicker)}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--fg-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Link className="h-3 w-3" />
              Привязать задачу
            </button>
          )}

          {/* Add image button */}
          <button
            onClick={handleInsertImage}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--fg-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <ImagePlus className="h-3 w-3" />
            Фото
            {hasImages && <span className="text-[var(--fg-muted)]">({note.mediaFiles.length})</span>}
          </button>
        </div>

        {/* Task picker dropdown */}
        {showTaskPicker && !hasLinkedTask && (
          <div className="mx-4 mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--fg-muted)]" />
              <input
                type="text"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Поиск задачи..."
                className="w-full rounded-lg border border-[var(--border)] bg-transparent pl-8 pr-3 py-1.5 text-xs text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)]"
                autoFocus
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-0.5 scrollbar-thin">
              {filteredTasks.length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)] text-center py-3">Задачи не найдены</p>
              ) : (
                filteredTasks.map((task) => {
                  const recInfo = RECURRENCE_LABELS[task.recurrence]
                  const KindIcon = TASK_KIND_ICONS[task.kind] ?? CheckSquare
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setLinkedTask(task.id)}
                      className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all hover:bg-[var(--surface-elevated)]"
                    >
                      <KindIcon className="h-3.5 w-3.5 shrink-0" style={{ color: recInfo.color }} />
                      <span className="text-xs truncate text-[var(--fg)]">{task.title}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Images grid — only when there are images */}
        {hasImages && (
          <div className="px-4 pb-3">
            <div className="grid grid-cols-4 gap-1.5">
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
                        ...
                      </div>
                    )}
                    <button
                      onClick={() => removeImage(path)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2 text-[10px] text-[var(--fg-muted)]">
        <span>
          Обновлено {relativeDateRu(note.updatedAt)}
          {note.linkedTaskIds.length > 0 && ` · ${note.linkedTaskIds.length} задач`}
          {note.mediaFiles.length > 0 && ` · ${note.mediaFiles.length} фото`}
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
