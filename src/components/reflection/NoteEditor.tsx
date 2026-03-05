import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import ImageExtension from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import UnderlineExtension from '@tiptap/extension-underline'
import { ArrowLeft, Pin, PinOff, Trash2, Link as LinkIcon, Unlink, FilePlus, Check } from 'lucide-react'
import NoteEditorToolbar from './NoteEditorToolbar'
import ImageLightbox from './ImageLightbox'
import { useRpgStore } from '../../store/useRpgStore'
import { vaultStorage } from '../../lib/vaultStorage'
import { resizeImageFile } from '../../lib/resizeImage'
import { extractExcerpt, relativeDateRu } from '../../lib/reflectionUtils'
import type { Note, TiptapContent } from '../../types/domain'

/** Replace resolved data URLs back to vault-relative paths before saving */
function restoreMediaPaths(content: TiptapContent, cache: Map<string, string>): TiptapContent {
  if (cache.size === 0) return content
  // Build reverse map: dataUrl → vaultPath
  const reverse = new Map<string, string>()
  for (const [vaultPath, dataUrl] of cache) reverse.set(dataUrl, vaultPath)

  const walk = (node: Record<string, unknown>): Record<string, unknown> => {
    if (node.type === 'image' && typeof (node.attrs as Record<string, unknown>)?.src === 'string') {
      const src = (node.attrs as Record<string, string>).src
      const original = reverse.get(src)
      if (original) {
        return { ...node, attrs: { ...(node.attrs as object), src: original } }
      }
    }
    if (Array.isArray(node.content)) {
      return { ...node, content: node.content.map((c: Record<string, unknown>) => walk(c)) }
    }
    return node
  }
  return walk(content as unknown as Record<string, unknown>) as unknown as TiptapContent
}

interface NoteEditorProps {
  note: Note
  onBack: () => void
  onDelete: () => void
  onCreateNote?: () => void
}

export default function NoteEditor({ note, onBack, onDelete, onCreateNote }: NoteEditorProps) {
  const updateNote = useRpgStore((s) => s.updateNote)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const rawTasks = useRpgStore((s) => s.tasks)
  const tasks = useMemo(
    () => rawTasks.filter((t) => t.profileId === activeProfileId),
    [rawTasks, activeProfileId],
  )
  const [title, setTitle] = useState(note.title)
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showLinkTasks, setShowLinkTasks] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const savedIndicatorRef = useRef<ReturnType<typeof setTimeout>>()
  // Map vault relative paths → data URLs for display
  const mediaCache = useRef<Map<string, string>>(new Map())

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      LinkExtension.configure({
        openOnClick: true,
        HTMLAttributes: { class: 'text-[var(--accent)] underline cursor-pointer' },
      }),
      ImageExtension.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full my-2 cursor-pointer' },
      }),
      Placeholder.configure({ placeholder: 'Начните писать…' }),
      UnderlineExtension,
    ],
    content: note.content,
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement
        if (target.tagName === 'IMG') {
          const src = target.getAttribute('src')
          if (src && note.mediaFiles.length > 0) {
            // src might be a data URL — find matching media path via cache
            let idx = note.mediaFiles.indexOf(src)
            if (idx < 0) {
              // Reverse-lookup: find vault path whose resolved data URL matches src
              for (const [vaultPath, dataUrl] of mediaCache.current) {
                if (dataUrl === src) {
                  idx = note.mediaFiles.indexOf(vaultPath)
                  break
                }
              }
            }
            setLightboxImages(note.mediaFiles)
            setLightboxIndex(idx >= 0 ? idx : 0)
          }
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Debounced save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setSaveStatus('saving')
      saveTimerRef.current = setTimeout(() => {
        const content = ed.getJSON() as TiptapContent
        // Replace resolved data URLs back to vault paths before persisting
        const persistContent = restoreMediaPaths(content, mediaCache.current)
        const excerpt = extractExcerpt(persistContent)
        updateNote(note.id, (n) => ({ ...n, content: persistContent, excerpt }))
        setSaveStatus('saved')
        if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current)
        savedIndicatorRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      }, 500)
    },
  })

  // Sync title on change
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(() => {
      updateNote(note.id, (n) => ({ ...n, title }))
      setSaveStatus('saved')
      if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current)
      savedIndicatorRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
  }, [title, note.id, updateNote])

  // Resolve vault media paths (media/xxx.webp) → data URLs in Tiptap JSON
  const resolveMediaInContent = useCallback(async (content: TiptapContent): Promise<TiptapContent> => {
    if (!vaultStorage.isElectron()) return content

    // Collect all media paths that need resolving
    const paths = new Set<string>()
    const walk = (node: Record<string, unknown>) => {
      if (node.type === 'image' && typeof (node.attrs as Record<string, unknown>)?.src === 'string') {
        const src = (node.attrs as Record<string, string>).src
        if (src.startsWith('media/') && !mediaCache.current.has(src)) {
          paths.add(src)
        }
      }
      if (Array.isArray(node.content)) {
        for (const child of node.content) walk(child as Record<string, unknown>)
      }
    }
    walk(content as unknown as Record<string, unknown>)

    if (paths.size === 0 && !hasMediaPaths(content)) return content

    // Resolve all paths in parallel
    await Promise.all(
      [...paths].map(async (p) => {
        const dataUrl = await vaultStorage.readMedia(p)
        if (dataUrl) mediaCache.current.set(p, dataUrl)
      }),
    )

    // Replace src in a deep clone
    const replace = (node: Record<string, unknown>): Record<string, unknown> => {
      if (node.type === 'image' && typeof (node.attrs as Record<string, unknown>)?.src === 'string') {
        const src = (node.attrs as Record<string, string>).src
        const resolved = mediaCache.current.get(src)
        if (resolved) {
          return { ...node, attrs: { ...(node.attrs as object), src: resolved } }
        }
      }
      if (Array.isArray(node.content)) {
        return { ...node, content: node.content.map((c: Record<string, unknown>) => replace(c)) }
      }
      return node
    }
    return replace(content as unknown as Record<string, unknown>) as unknown as TiptapContent
  }, [])

  // Check if content has any media/ paths
  const hasMediaPaths = (content: TiptapContent): boolean => {
    const json = JSON.stringify(content)
    return json.includes('"media/')
  }

  // Resolve media on mount and when switching notes
  useEffect(() => {
    if (!editor || !note.content) return
    let cancelled = false
    resolveMediaInContent(note.content).then((resolved) => {
      if (cancelled) return
      const currentJson = JSON.stringify(editor.getJSON())
      const resolvedJson = JSON.stringify(resolved)
      if (currentJson !== resolvedJson) {
        editor.commands.setContent(resolved)
      }
    })
    setTitle(note.title)
    return () => { cancelled = true }
  }, [note.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current)
    }
  }, [])

  const handleInsertImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    e.target.value = ''

    try {
      const resized = await resizeImageFile(file)
      const mediaPath = await vaultStorage.saveMedia(resized, 'webp')
      // Add to note mediaFiles
      updateNote(note.id, (n) => ({
        ...n,
        mediaFiles: [...n.mediaFiles, mediaPath],
      }))
      // Resolve to data URL for display, fall back to raw path
      const displaySrc = await vaultStorage.readMedia(mediaPath) ?? mediaPath
      // Cache the mapping so restoreMediaPaths can reverse it on save
      if (displaySrc !== mediaPath) mediaCache.current.set(mediaPath, displaySrc)
      // Insert into editor
      editor.chain().focus().setImage({ src: displaySrc }).run()
    } catch (err) {
      console.error('Failed to insert image:', err)
    }
  }

  const handleBack = useCallback(() => {
    // Flush any pending debounced save immediately
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = undefined
    }
    if (savedIndicatorRef.current) {
      clearTimeout(savedIndicatorRef.current)
      savedIndicatorRef.current = undefined
    }
    // Save current state before leaving
    if (editor) {
      const content = editor.getJSON() as TiptapContent
      const persistContent = restoreMediaPaths(content, mediaCache.current)
      const excerpt = extractExcerpt(persistContent)
      updateNote(note.id, (n) => ({ ...n, title, content: persistContent, excerpt }))
    } else {
      updateNote(note.id, (n) => ({ ...n, title }))
    }
    onBack()
  }, [editor, title, note.id, updateNote, onBack])

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
              // Show linked first, then filtered by search
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

      {/* Toolbar */}
      <div className="border-b border-[var(--border)] px-4 py-2">
        <NoteEditorToolbar editor={editor} onInsertImage={handleInsertImage} />
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Footer meta */}
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
