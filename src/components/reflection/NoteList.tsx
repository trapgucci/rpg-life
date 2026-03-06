import { Plus, Search, CheckSquare, Trash2, X } from 'lucide-react'
import { useState, useMemo, useRef, useCallback } from 'react'
import type { Note, NoteFolderId, NoteId } from '../../types/domain'
import { useRpgStore } from '../../store/useRpgStore'
import NoteCard from './NoteCard'

interface NoteListProps {
  notes: Note[]
  selectedNoteId: string | null
  activeFolderId: NoteFolderId | null
  onSelectNote: (id: string) => void
  onCreateNote: () => void
  onReorder?: (orderedIds: NoteId[]) => void
}

export default function NoteList({
  notes,
  selectedNoteId,
  activeFolderId,
  onSelectNote,
  onCreateNote,
  onReorder,
}: NoteListProps) {
  const [search, setSearch] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const draggedId = useRef<string | null>(null)
  const deleteNote = useRpgStore((s) => s.deleteNote)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((n) => n.id)))
    }
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    selectedIds.forEach((id) => deleteNote(id as NoteId))
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const filtered = useMemo(() => {
    let list = notes
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.excerpt.toLowerCase().includes(q),
      )
    }
    return list
  }, [notes, activeFolderId, search])

  const canDrag = !search.trim() && !!onReorder

  const handleDragStart = useCallback((e: React.DragEvent, noteId: string) => {
    draggedId.current = noteId
    e.dataTransfer.setData('application/note-id', noteId)
    e.dataTransfer.effectAllowed = 'move'

    // Create a small drag preview
    const el = e.currentTarget as HTMLElement
    const clone = el.cloneNode(true) as HTMLElement
    clone.style.width = '180px'
    clone.style.height = 'auto'
    clone.style.maxHeight = '60px'
    clone.style.overflow = 'hidden'
    clone.style.opacity = '0.85'
    clone.style.borderRadius = '12px'
    clone.style.position = 'fixed'
    clone.style.top = '-9999px'
    clone.style.left = '-9999px'
    clone.style.transform = 'scale(1)'
    clone.style.pointerEvents = 'none'
    document.body.appendChild(clone)
    e.dataTransfer.setDragImage(clone, 90, 30)
    requestAnimationFrame(() => document.body.removeChild(clone))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, noteId: string) => {
    e.preventDefault()
    if (draggedId.current && draggedId.current !== noteId) {
      setDragOverId(noteId)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)
    const sourceId = draggedId.current
    draggedId.current = null
    if (!sourceId || sourceId === targetId || !onReorder) return

    const ids = filtered.map((n) => n.id)
    const fromIdx = ids.indexOf(sourceId)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx < 0 || toIdx < 0) return

    ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, sourceId)
    onReorder(ids)
  }, [filtered, onReorder])

  const handleDragEnd = useCallback(() => {
    draggedId.current = null
    setDragOverId(null)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      {/* Search + Create + Select */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск заметок…"
            className="input w-full pl-9 text-sm"
          />
        </div>
        {!selectMode && (
          <>
            <button
              onClick={() => setSelectMode(true)}
              className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-accent)] hover:text-[var(--fg)] transition-colors"
            >
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Выбрать</span>
            </button>
            <button
              onClick={onCreateNote}
              className="btn-primary flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Заметка</span>
            </button>
          </>
        )}
        {selectMode && (
          <>
            <button
              onClick={handleSelectAll}
              className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-accent)] hover:text-[var(--fg)] transition-colors"
            >
              {selectedIds.size === filtered.length ? 'Снять все' : 'Все'}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0}
              className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">
                Удалить{selectedIds.size > 0 && ` (${selectedIds.size})`}
              </span>
            </button>
            <button
              onClick={exitSelectMode}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-accent)] hover:text-[var(--fg)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Notes */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-[var(--fg-muted)]">
            {search ? 'Ничего не найдено' : 'Нет заметок'}
          </p>
          {!search && (
            <button
              onClick={onCreateNote}
              className="mt-2 text-sm text-[var(--accent)] hover:underline"
            >
              Создать первую заметку
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((note) => (
            <div
              key={note.id}
              draggable={canDrag && !selectMode}
              onDragStart={(e) => handleDragStart(e, note.id)}
              onDragOver={(e) => handleDragOver(e, note.id)}
              onDrop={(e) => handleDrop(e, note.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-start gap-2 ${dragOverId === note.id ? 'border-t-2 border-[var(--accent)] rounded-t-sm' : ''}`}
            >
              {selectMode && (
                <button
                  onClick={() => toggleSelect(note.id)}
                  className="mt-4 shrink-0 flex items-center justify-center h-5 w-5 rounded-md border-2 transition-all duration-150"
                  style={{
                    borderColor: selectedIds.has(note.id) ? 'var(--accent)' : 'var(--border)',
                    backgroundColor: selectedIds.has(note.id) ? 'var(--accent)' : 'transparent',
                  }}
                >
                  {selectedIds.has(note.id) && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )}
              <div className="flex-1 min-w-0">
                <NoteCard
                  note={note}
                  isSelected={selectedNoteId === note.id}
                  onClick={() => selectMode ? toggleSelect(note.id) : onSelectNote(note.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
