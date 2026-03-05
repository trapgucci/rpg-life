import { Plus, FileText, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/cn'
import type { NoteFolder, NoteFolderId } from '../../types/domain'

interface ReflectionSidebarProps {
  folders: NoteFolder[]
  activeFolderId: NoteFolderId | null  // null = "Все заметки", '__trash__' = корзина
  noteCounts: Record<string, number>  // folderId -> count, 'all' -> total, 'unfiled' -> no-folder
  trashCount: number
  onSelectFolder: (id: NoteFolderId | null) => void
  onShowTrash: () => void
  onCreateFolder: () => void
  onEditFolder: (folder: NoteFolder) => void
  onDeleteFolder: (id: NoteFolderId) => void
}

export default function ReflectionSidebar({
  folders,
  activeFolderId,
  noteCounts,
  trashCount,
  onSelectFolder,
  onShowTrash,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
}: ReflectionSidebarProps) {
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenu) return
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [contextMenu])

  return (
    <div className="flex flex-col gap-1">
      {/* All notes */}
      <button
        onClick={() => onSelectFolder(null)}
        className={cn(
          'flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-all',
          activeFolderId === null
            ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
            : 'text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)]',
        )}
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">Все заметки</span>
        <span className="text-xs opacity-60">{noteCounts['all'] ?? 0}</span>
      </button>

      {/* Divider */}
      <div className="mx-3 my-1 border-t border-[var(--border)]" />

      {/* Folders */}
      {folders.map((folder) => (
        <div key={folder.id} className="relative">
          <button
            onClick={() => onSelectFolder(folder.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ id: folder.id, x: e.clientX, y: e.clientY })
            }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-all',
              activeFolderId === folder.id
                ? 'bg-[var(--accent-subtle)] font-medium'
                : 'text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)]',
            )}
            style={activeFolderId === folder.id ? { color: folder.color } : undefined}
          >
            <span className="shrink-0 text-base">{folder.icon}</span>
            <span className="flex-1 truncate">{folder.name}</span>
            <span className="text-xs opacity-60">{noteCounts[folder.id] ?? 0}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setContextMenu(contextMenu?.id === folder.id ? null : { id: folder.id, x: 0, y: 0 })
              }}
              className="icon-btn-compact h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
              style={{ opacity: contextMenu?.id === folder.id ? 1 : undefined }}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </button>

          {/* Context menu */}
          {contextMenu?.id === folder.id && (
            <div
              ref={menuRef}
              className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] p-1 shadow-lg"
            >
              <button
                onClick={() => { onEditFolder(folder); setContextMenu(null) }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
              >
                <Pencil className="h-3.5 w-3.5" /> Редактировать
              </button>
              <button
                onClick={() => { onDeleteFolder(folder.id); setContextMenu(null) }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Удалить
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add folder button */}
      <button
        onClick={onCreateFolder}
        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)] transition-all"
      >
        <Plus className="h-4 w-4 shrink-0" />
        <span>Новая папка</span>
      </button>

      {/* Trash */}
      {trashCount > 0 && (
        <>
          <div className="mx-3 my-1 border-t border-[var(--border)]" />
          <button
            onClick={onShowTrash}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)] transition-all"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">Корзина</span>
            <span className="text-xs opacity-60">{trashCount}</span>
          </button>
        </>
      )}
    </div>
  )
}
