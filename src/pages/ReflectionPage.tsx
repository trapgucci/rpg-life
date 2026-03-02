import { useState, useMemo, useCallback } from 'react'
import { Brain, BookOpen, Calendar } from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import { getTodayKey } from '../lib/reflectionUtils'
import ReflectionSidebar from '../components/reflection/ReflectionSidebar'
import FolderFormModal from '../components/reflection/FolderFormModal'
import NoteList from '../components/reflection/NoteList'
import NoteEditor from '../components/reflection/NoteEditor'
import DailyReportCalendar from '../components/reflection/DailyReportCalendar'
import DailyReportView from '../components/reflection/DailyReportView'
import type { NoteFolder, NoteFolderId } from '../types/domain'

type Tab = 'notes' | 'diary'

export default function ReflectionPage() {
  const [activeTab, setActiveTab] = useState<Tab>('notes')
  const [activeFolderId, setActiveFolderId] = useState<NoteFolderId | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(getTodayKey())

  // Folder modal state
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null)

  // Store — use raw data + useMemo to avoid infinite re-render
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const rawFolders = useRpgStore((s) => s.noteFolders)
  const rawNotes = useRpgStore((s) => s.notes)
  const rawReports = useRpgStore((s) => s.dailyReports)
  const addFolder = useRpgStore((s) => s.addNoteFolder)
  const updateFolder = useRpgStore((s) => s.updateNoteFolder)
  const deleteFolder = useRpgStore((s) => s.deleteNoteFolder)
  const addNote = useRpgStore((s) => s.addNote)
  const deleteNote = useRpgStore((s) => s.deleteNote)

  const folders = useMemo(
    () => rawFolders.filter((f) => f.profileId === activeProfileId).sort((a, b) => a.sortOrder - b.sortOrder),
    [rawFolders, activeProfileId],
  )
  const notes = useMemo(
    () => rawNotes
      .filter((n) => n.profileId === activeProfileId)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return b.updatedAt - a.updatedAt
      }),
    [rawNotes, activeProfileId],
  )
  const dailyReports = useMemo(
    () => rawReports.filter((r) => r.profileId === activeProfileId).sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [rawReports, activeProfileId],
  )

  // Note counts per folder
  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notes.length }
    let unfiled = 0
    for (const n of notes) {
      if (n.folderId) counts[n.folderId] = (counts[n.folderId] ?? 0) + 1
      else unfiled++
    }
    counts['unfiled'] = unfiled
    return counts
  }, [notes])

  // Selected note
  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  )

  // Filtered notes for current folder
  const filteredNotes = useMemo(() => {
    if (activeFolderId === null) return notes
    return notes.filter((n) => n.folderId === activeFolderId)
  }, [notes, activeFolderId])

  // Handlers
  const handleCreateNote = useCallback(() => {
    const note = addNote({
      title: '',
      folderId: activeFolderId,
    })
    setSelectedNoteId(note.id)
  }, [addNote, activeFolderId])

  const handleDeleteNote = useCallback(() => {
    if (!selectedNoteId) return
    if (confirm('Удалить заметку?')) {
      deleteNote(selectedNoteId)
      setSelectedNoteId(null)
    }
  }, [selectedNoteId, deleteNote])

  const handleSaveFolder = useCallback(
    (name: string, icon: string, color: string) => {
      if (editingFolder) {
        updateFolder(editingFolder.id, (f) => ({ ...f, name, icon, color }))
      } else {
        addFolder(name, icon, color)
      }
      setEditingFolder(null)
    },
    [editingFolder, addFolder, updateFolder],
  )

  const handleEditFolder = useCallback((folder: NoteFolder) => {
    setEditingFolder(folder)
    setFolderModalOpen(true)
  }, [])

  const handleDeleteFolder = useCallback(
    (id: NoteFolderId) => {
      if (confirm('Удалить папку? Заметки из неё будут перемещены в «Все заметки».')) {
        deleteFolder(id)
        if (activeFolderId === id) setActiveFolderId(null)
      }
    },
    [deleteFolder, activeFolderId],
  )

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden pb-2">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
          <Brain className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-xl font-bold text-[var(--fg)]">Рефлексия</h1>
          <p className="text-xs md:text-sm text-[var(--fg-muted)]">Заметки и дневник</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 rounded-xl bg-[var(--surface)] p-1 border border-[var(--border)]">
        <button
          onClick={() => setActiveTab('notes')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'notes'
              ? 'bg-[var(--accent)] text-white shadow-md'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)]',
          )}
        >
          <BookOpen className="h-4 w-4" />
          Заметки
        </button>
        <button
          onClick={() => setActiveTab('diary')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'diary'
              ? 'bg-[var(--accent)] text-white shadow-md'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)]',
          )}
        >
          <Calendar className="h-4 w-4" />
          Дневник
        </button>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 gap-4">
        {activeTab === 'notes' ? (
          <>
            {/* Desktop: sidebar + list + editor */}
            {/* Mobile: list OR editor (not both) */}
            {selectedNote && (
              <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] backdrop-blur-lg">
                <NoteEditor
                  note={selectedNote}
                  onBack={() => setSelectedNoteId(null)}
                  onDelete={handleDeleteNote}
                  onCreateNote={handleCreateNote}
                />
              </div>
            )}

            {!selectedNote && (
              <div className="flex flex-1 flex-col gap-4 md:flex-row">
                {/* Sidebar — desktop only */}
                <div className="hidden md:flex md:w-56 shrink-0 flex-col overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] backdrop-blur-lg p-3">
                  <ReflectionSidebar
                    folders={folders}
                    activeFolderId={activeFolderId}
                    noteCounts={noteCounts}
                    onSelectFolder={setActiveFolderId}
                    onCreateFolder={() => { setEditingFolder(null); setFolderModalOpen(true) }}
                    onEditFolder={handleEditFolder}
                    onDeleteFolder={handleDeleteFolder}
                  />
                </div>

                {/* Mobile folder selector */}
                <div className="md:hidden shrink-0">
                  <select
                    value={activeFolderId ?? '__all__'}
                    onChange={(e) => setActiveFolderId(e.target.value === '__all__' ? null : e.target.value)}
                    className="input w-full text-sm"
                  >
                    <option value="__all__">Все заметки ({noteCounts['all'] ?? 0})</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.icon} {f.name} ({noteCounts[f.id] ?? 0})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Note list */}
                <div className="flex-1 overflow-y-auto">
                  <NoteList
                    notes={filteredNotes}
                    selectedNoteId={selectedNoteId}
                    activeFolderId={activeFolderId}
                    onSelectNote={setSelectedNoteId}
                    onCreateNote={handleCreateNote}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          /* Diary tab */
          <div className="flex flex-1 flex-col gap-4 md:flex-row">
            {/* Calendar sidebar */}
            <div className="md:w-64 shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] backdrop-blur-lg p-4">
              <DailyReportCalendar
                reports={dailyReports}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>

            {/* Report */}
            <div className="flex-1 overflow-y-auto">
              <DailyReportView dateKey={selectedDate} />
            </div>
          </div>
        )}
      </div>

      {/* Folder modal */}
      <FolderFormModal
        isOpen={folderModalOpen}
        onClose={() => { setFolderModalOpen(false); setEditingFolder(null) }}
        onSave={handleSaveFolder}
        folder={editingFolder}
      />
    </div>
  )
}
