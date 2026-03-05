import { Plus, Search } from 'lucide-react'
import { useState, useMemo, useRef, useCallback } from 'react'
import type { Note, NoteFolderId, NoteId } from '../../types/domain'
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
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const draggedId = useRef<string | null>(null)

  const filtered = useMemo(() => {
    let list = notes
    if (activeFolderId !== undefined && activeFolderId !== null) {
      list = list.filter((n) => n.folderId === activeFolderId)
    }
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

  const handleDragStart = useCallback((noteId: string) => {
    draggedId.current = noteId
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
      {/* Search + Create */}
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
        <button
          onClick={onCreateNote}
          className="btn-primary flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Заметка</span>
        </button>
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
              draggable={canDrag}
              onDragStart={() => handleDragStart(note.id)}
              onDragOver={(e) => handleDragOver(e, note.id)}
              onDrop={(e) => handleDrop(e, note.id)}
              onDragEnd={handleDragEnd}
              className={dragOverId === note.id ? 'border-t-2 border-[var(--accent)] rounded-t-sm' : ''}
            >
              <NoteCard
                note={note}
                isSelected={selectedNoteId === note.id}
                onClick={() => onSelectNote(note.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
