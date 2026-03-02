import { Plus, Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import type { Note, NoteFolderId } from '../../types/domain'
import NoteCard from './NoteCard'

interface NoteListProps {
  notes: Note[]
  selectedNoteId: string | null
  activeFolderId: NoteFolderId | null
  onSelectNote: (id: string) => void
  onCreateNote: () => void
}

export default function NoteList({
  notes,
  selectedNoteId,
  activeFolderId,
  onSelectNote,
  onCreateNote,
}: NoteListProps) {
  const [search, setSearch] = useState('')

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
            <NoteCard
              key={note.id}
              note={note}
              isSelected={selectedNoteId === note.id}
              onClick={() => onSelectNote(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
