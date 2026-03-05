import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  ArrowLeft, Pin, PinOff, Trash2, Link as LinkIcon, Unlink,
  FilePlus, Check, Plus, X, ImagePlus, Tag,
} from 'lucide-react'
import ImageLightbox from './ImageLightbox'
import { useRpgStore } from '../../store/useRpgStore'
import { vaultStorage } from '../../lib/vaultStorage'
import { resizeImageFile } from '../../lib/resizeImage'
import { relativeDateRu } from '../../lib/reflectionUtils'
import type { Note } from '../../types/domain'

interface NoteEditorProps {
  note: Note
  onBack: () => void
  onDelete: () => void
  onCreateNote?: () => void
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

export default function NoteEditor({ note, onBack, onDelete, onCreateNote }: NoteEditorProps) {
  const updateNote = useRpgStore((s) => s.updateNote)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const rawTasks = useRpgStore((s) => s.tasks)
  const noteTags = useRpgStore((s) => s.noteTags)
  const addNoteTag = useRpgStore((s) => s.addNoteTag)

  const tasks = useMemo(
    () => rawTasks.filter((t) => t.profileId === activeProfileId),
    [rawTasks, activeProfileId],
  )
  const profileTags = useMemo(
    () => noteTags.filter((t) => t.profileId === activeProfileId),
    [noteTags, activeProfileId],
  )

  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(typeof note.content === 'string' ? note.content : '')
  const [showLinkTasks, setShowLinkTasks] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [mediaThumbs, setMediaThumbs] = useState<Map<string, string>>(new Map())

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const savedIndicatorRef = useRef<ReturnType<typeof setTimeout>>()
  const tagInputRef = useRef<HTMLInputElement>(null)

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

  const handleBack = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = undefined
    }
    if (savedIndicatorRef.current) {
      clearTimeout(savedIndicatorRef.current)
      savedIndicatorRef.current = undefined
    }
    const excerpt = content.slice(0, 200)
    updateNote(note.id, (n) => ({ ...n, title, content, excerpt }))
    onBack()
  }, [title, content, note.id, updateNote, onBack])

  const togglePin = () => {
    updateNote(note.id, (n) => ({ ...n, pinned: !n.pinned }))
  }

  const toggleTaskLink = (taskId: string) => {
    updateNote(note.id, (n) => {
      const has = n.linkedTaskIds.includes(taskId)
      return {
        ...n,
        linkedTaskIds: has
          ? n.linkedTaskIds.filter((id) => id !== taskId)
          : [...n.linkedTaskIds, taskId],
      }
    })
  }

  // Tags
  const addTagToNote = (tagName: string) => {
    const name = tagName.trim()
    if (!name) return
    // Add to global tags if not exists
    if (!profileTags.find((t) => t.name.toLowerCase() === name.toLowerCase())) {
      addNoteTag(name)
    }
    // Add to note
    if (!note.tags.includes(name)) {
      updateNote(note.id, (n) => ({ ...n, tags: [...n.tags, name] }))
    }
    setTagSearch('')
    setShowTagInput(false)
  }

  const removeTagFromNote = (tagName: string) => {
    updateNote(note.id, (n) => ({ ...n, tags: n.tags.filter((t) => t !== tagName) }))
  }

  const filteredTags = useMemo(() => {
    const q = tagSearch.toLowerCase().trim()
    if (!q) return profileTags.filter((t) => !note.tags.includes(t.name)).slice(0, 10)
    return profileTags.filter(
      (t) => t.name.toLowerCase().includes(q) && !note.tags.includes(t.name)
    )
  }, [profileTags, tagSearch, note.tags])

  // Images
  const handleInsertImage = () => fileInputRef.current?.click()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    e.target.value = ''

    for (const file of Array.from(files)) {
      try {
        const resized = await resizeImageFile(file)
        const mediaPath = await vaultStorage.saveMedia(resized, 'webp')
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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <button onClick={handleBack} className="icon-btn h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Без названия"
          className="flex-1 bg-transparent text-lg font-bold text-[var(--fg)] outline-none placeholder:text-[var(--fg-muted)]"
        />
        <div className="flex items-center gap-1">
          {onCreateNote && (
            <button onClick={onCreateNote} className="icon-btn h-8 w-8" title="Новая заметка">
              <FilePlus className="h-4 w-4" />
            </button>
          )}
          <button onClick={togglePin} className="icon-btn h-8 w-8" title={note.pinned ? 'Открепить' : 'Закрепить'}>
            {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
          <button onClick={() => setShowLinkTasks(!showLinkTasks)} className="icon-btn h-8 w-8" title="Привязать к задаче">
            {note.linkedTaskIds.length > 0 ? <Unlink className="h-4 w-4 text-[var(--accent)]" /> : <LinkIcon className="h-4 w-4" />}
          </button>
          <button onClick={onDelete} className="icon-btn h-8 w-8 text-[var(--danger)]" title="Удалить">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Link tasks panel */}
      {showLinkTasks && (
        <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <p className="mb-2 text-xs font-medium text-[var(--fg-muted)]">Привязать к задачам:</p>
          <input
            type="text"
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            placeholder="Поиск задач…"
            className="input mb-2 w-full text-sm"
            autoFocus
          />
          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {(() => {
              const q = taskSearch.toLowerCase().trim()
              const active = tasks.filter((t) => !t.archived)
              const linked = active.filter((t) => note.linkedTaskIds.includes(t.id))
              const unlinked = active.filter((t) => !note.linkedTaskIds.includes(t.id))
              const filtered = q
                ? [...linked, ...unlinked].filter((t) => t.title.toLowerCase().includes(q))
                : [...linked, ...unlinked.slice(0, Math.max(0, 20 - linked.length))]
              if (filtered.length === 0) {
                return <p className="py-2 text-center text-xs text-[var(--fg-muted)]">Ничего не найдено</p>
              }
              return filtered.map((task) => (
                <label key={task.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-[var(--surface-elevated)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={note.linkedTaskIds.includes(task.id)}
                    onChange={() => toggleTaskLink(task.id)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="truncate text-[var(--fg)]">{task.title}</span>
                </label>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Linked tasks chips */}
        {linkedTasks.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3">
            <LinkIcon className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
            {linkedTasks.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center rounded-md bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]"
              >
                {t.title}
              </span>
            ))}
          </div>
        )}

        {/* Text content */}
        <div className="px-4 py-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Начните писать…"
            className="w-full resize-none bg-transparent text-sm text-[var(--fg)] leading-relaxed outline-none placeholder:text-[var(--fg-muted)]"
            style={{ minHeight: '120px' }}
          />
        </div>

        {/* Tags */}
        <div className="px-4 pb-3">
          <p className="mb-2 text-xs font-medium text-[var(--fg-muted)]">Теги</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {note.tags.map((tag) => {
              const tagObj = profileTags.find((t) => t.name === tag)
              const color = tagObj?.color ?? '#6b7280'
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: color + '20', color }}
                >
                  {tag}
                  <button
                    onClick={() => removeTagFromNote(tag)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )
            })}

            {showTagInput ? (
              <div className="relative">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTagToNote(tagSearch)
                    }
                    if (e.key === 'Escape') {
                      setShowTagInput(false)
                      setTagSearch('')
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => {
                      setShowTagInput(false)
                      setTagSearch('')
                    }, 200)
                  }}
                  placeholder="Название тега…"
                  className="input h-7 w-36 text-xs"
                  autoFocus
                />
                {/* Suggestions dropdown */}
                {filteredTags.length > 0 && (
                  <div className="absolute left-0 top-full z-10 mt-1 max-h-32 w-48 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-card)] p-1 shadow-lg">
                    {filteredTags.map((t) => (
                      <button
                        key={t.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addTagToNote(t.name)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-[var(--surface-elevated)]"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="text-[var(--fg)]">{t.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowTagInput(true)
                  setTimeout(() => tagInputRef.current?.focus(), 50)
                }}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                <Tag className="h-3 w-3" />
                Добавить тег
              </button>
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
