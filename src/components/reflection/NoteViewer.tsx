import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import ImageExtension from '@tiptap/extension-image'
import UnderlineExtension from '@tiptap/extension-underline'
import { ArrowLeft, Pencil, Pin, Trash2, Link as LinkIcon } from 'lucide-react'
import ImageLightbox from './ImageLightbox'
import { useRpgStore } from '../../store/useRpgStore'
import { vaultStorage } from '../../lib/vaultStorage'
import { relativeDateRu } from '../../lib/reflectionUtils'
import type { Note, TiptapContent } from '../../types/domain'

interface NoteViewerProps {
  note: Note
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function NoteViewer({ note, onBack, onEdit, onDelete }: NoteViewerProps) {
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const rawTasks = useRpgStore((s) => s.tasks)
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const mediaCache = useRef<Map<string, string>>(new Map())

  // Linked task names
  const linkedTasks = rawTasks.filter(
    (t) => t.profileId === activeProfileId && note.linkedTaskIds.includes(t.id),
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      LinkExtension.configure({
        openOnClick: true,
        HTMLAttributes: { class: 'text-[var(--accent)] underline cursor-pointer' },
      }),
      ImageExtension.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full my-2 cursor-pointer' },
      }),
      UnderlineExtension,
    ],
    content: note.content,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement
        if (target.tagName === 'IMG') {
          const src = target.getAttribute('src')
          if (src && note.mediaFiles.length > 0) {
            let idx = note.mediaFiles.indexOf(src)
            if (idx < 0) {
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
  })

  // Resolve media paths → data URLs
  const resolveMediaInContent = useCallback(async (content: TiptapContent): Promise<TiptapContent> => {
    if (!vaultStorage.isElectron()) return content

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

    if (paths.size === 0 && !JSON.stringify(content).includes('"media/')) return content

    await Promise.all(
      [...paths].map(async (p) => {
        const dataUrl = await vaultStorage.readMedia(p)
        if (dataUrl) mediaCache.current.set(p, dataUrl)
      }),
    )

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

  // Resolve media on mount / note switch
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
    return () => { cancelled = true }
  }, [note.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <button onClick={onBack} className="icon-btn h-8 w-8 shrink-0 md:hidden">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="flex-1 truncate text-lg font-bold text-[var(--fg)]">
          {note.title || 'Без названия'}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="icon-btn h-8 w-8 text-[var(--accent)]" title="Редактировать">
            <Pencil className="h-4 w-4" />
          </button>
          {note.pinned && (
            <div className="flex h-8 w-8 items-center justify-center text-[var(--fg-muted)]" title="Закреплено">
              <Pin className="h-4 w-4" />
            </div>
          )}
          <button onClick={onDelete} className="icon-btn h-8 w-8 text-[var(--danger)]" title="Удалить">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Linked tasks */}
      {linkedTasks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] px-4 py-2">
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

      {/* Read-only content */}
      <div className="flex-1 overflow-y-auto" onDoubleClick={onEdit}>
        <EditorContent editor={editor} />
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--border)] px-4 py-2 text-[10px] text-[var(--fg-muted)]">
        Обновлено {relativeDateRu(note.updatedAt)}
        {note.mediaFiles.length > 0 && ` · ${note.mediaFiles.length} изображений`}
        {' · '}
        <button onClick={onEdit} className="text-[var(--accent)] hover:underline">
          Редактировать
        </button>
      </div>

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
