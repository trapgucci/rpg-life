import { useState, useMemo, useEffect } from 'react'
import { cn } from '../lib/cn'
import { CheckSquare, Plus, Sparkles, Target, FolderOpen, Pencil, Trash2, X } from 'lucide-react'
import TaskCreateForm from '../components/TaskCreateForm'
import TaskCard from '../components/TaskCard'
import TaskDetailPanel from '../components/TaskDetailPanel'
import { useRpgStore } from '../store/useRpgStore'
import type { TaskRpg, TaskGroupId } from '../types/domain'

/** Специальный id для «Без группы» */
const NO_GROUP_ID: TaskGroupId | null = null

export default function TasksPage() {
  const tasks = useRpgStore((s) => s.tasks)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const taskGroupsRaw = useRpgStore((s) => s.taskGroups)
  const addTaskGroup = useRpgStore((s) => s.addTaskGroup)
  const updateTaskGroup = useRpgStore((s) => s.updateTaskGroup)
  const deleteTaskGroup = useRpgStore((s) => s.deleteTaskGroup)

  const taskGroups = useMemo(
    () =>
      activeProfileId
        ? taskGroupsRaw
            .filter((g) => g.profileId === activeProfileId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [taskGroupsRaw, activeProfileId]
  )

  const [selectedGroupId, setSelectedGroupId] = useState<TaskGroupId | null>(NO_GROUP_ID)
  const [selectedId, setSelectedId] = useState<TaskRpg['id'] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formVisible, setFormVisible] = useState(false)

  useEffect(() => {
    if (showForm) {
      // Небольшая задержка для запуска анимации
      const timeout = setTimeout(() => setFormVisible(true), 20)
      return () => clearTimeout(timeout)
    } else {
      setFormVisible(false)
    }
  }, [showForm])
  const [newGroupName, setNewGroupName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<TaskGroupId | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')

  const filteredTasks = useMemo(() => {
    if (!activeProfileId) return []
    const list = tasks.filter((t) => {
      if (t.profileId !== activeProfileId) return false
      if (t.archived) return false
      const g = t.groupId ?? null
      if (selectedGroupId === NO_GROUP_ID) return g === null
      return g === selectedGroupId
    })
    return list
  }, [tasks, activeProfileId, selectedGroupId])

  const sortedTasks = useMemo(
    () =>
      [...filteredTasks].sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1
        return b.updatedAt - a.updatedAt
      }),
    [filteredTasks]
  )

  const selectedTask = selectedId ? filteredTasks.find((t) => t.id === selectedId) : null

  const handleAddGroup = () => {
    const name = newGroupName.trim()
    if (!name) return
    const group = addTaskGroup(name)
    setNewGroupName('')
    setAddingGroup(false)
    setSelectedGroupId(group.id)
  }

  const handleSaveGroupEdit = (id: TaskGroupId) => {
    const name = editingGroupName.trim()
    if (!name) return
    updateTaskGroup(id, (g) => ({ ...g, name }))
    setEditingGroupId(null)
    setEditingGroupName('')
  }

  const handleDeleteGroup = (id: TaskGroupId) => {
    if (!confirm('Удалить группу? Задачи останутся в «Без группы».')) return
    deleteTaskGroup(id)
    if (selectedGroupId === id) setSelectedGroupId(NO_GROUP_ID)
    setEditingGroupId(null)
  }

  const taskCountByGroup = useMemo(() => {
    const map = new Map<TaskGroupId | null, number>()
    if (!activeProfileId) return map
    tasks
      .filter((t) => t.profileId === activeProfileId && !t.archived)
      .forEach((t) => {
        const g = t.groupId ?? null
        map.set(g, (map.get(g) ?? 0) + 1)
      })
    return map
  }, [tasks, activeProfileId])

  const countNoGroup = taskCountByGroup.get(null) ?? 0

  // Режим «Новая задача»: форма с красивой анимацией появления
  if (showForm) {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col",
          "transition-all duration-500 ease-out",
          formVisible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-8 scale-95"
        )}
      >
        <div className="glass-card mb-4 flex shrink-0 items-center justify-between rounded-2xl px-4 py-3">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Новая задача</h2>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="icon-btn h-9 w-9 shrink-0 rounded-full p-0 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            title="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="glass-card min-h-0 rounded-2xl p-4">
            <TaskCreateForm
              defaultGroupId={selectedGroupId === NO_GROUP_ID ? null : selectedGroupId}
              onCreated={() => setShowForm(false)}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 gap-4">
      <div className="flex w-[400px] shrink-0 flex-col gap-4">
        {/* Header */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--fg)]">Задачи</h1>
                <p className="text-xs text-[var(--fg-muted)]">{filteredTasks.length} в выбранной группе</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Новая
            </button>
          </div>

          {/* Группы */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-[var(--fg-muted)]">Группы</p>
            <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
              {/* Без группы */}
              <button
                type="button"
                onClick={() => setSelectedGroupId(NO_GROUP_ID)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all',
                  selectedGroupId === NO_GROUP_ID
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                    : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)]'
                )}
              >
                <FolderOpen className="h-4 w-4 shrink-0 opacity-70" />
                <span className="flex-1 truncate">Без группы</span>
                <span className="text-xs text-[var(--fg-muted)]">{countNoGroup}</span>
              </button>

              {/* Пользовательские группы */}
              {taskGroups.map((group) => (
                <div
                  key={group.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all',
                    selectedGroupId === group.id
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                      : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)]'
                  )}
                >
                  {editingGroupId === group.id ? (
                    <>
                      <input
                        type="text"
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveGroupEdit(group.id)
                          if (e.key === 'Escape') setEditingGroupId(null)
                        }}
                        className="input flex-1 py-1.5 text-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveGroupEdit(group.id)}
                        className="icon-btn h-8 w-8 p-0 text-[var(--accent)]"
                      >
                        <CheckSquare className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedGroupId(group.id)}
                        className="flex flex-1 items-center gap-2 min-w-0"
                      >
                        <FolderOpen className="h-4 w-4 shrink-0 opacity-70" />
                        <span className="truncate">{group.name}</span>
                        <span className="text-xs text-[var(--fg-muted)] shrink-0">
                          {taskCountByGroup.get(group.id) ?? 0}
                        </span>
                      </button>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroupId(group.id)
                            setEditingGroupName(group.name)
                          }}
                          className="icon-btn h-7 w-7 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group.id)}
                          className="icon-btn icon-btn-danger h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Добавить группу */}
              {addingGroup ? (
                <div className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-3 py-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddGroup()
                      if (e.key === 'Escape') setAddingGroup(false)
                    }}
                    placeholder="Название группы"
                    className="input flex-1 py-1.5 text-sm"
                    autoFocus
                  />
                  <button type="button" onClick={handleAddGroup} className="icon-btn h-8 w-8 p-0 text-[var(--accent)]">
                    <CheckSquare className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setAddingGroup(false)} className="icon-btn h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingGroup(true)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Добавить группу
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl">
          {sortedTasks.length === 0 ? (
            <div className="glass-card flex h-full flex-col items-center justify-center rounded-2xl py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] mb-4">
                <CheckSquare className="h-8 w-8 text-[var(--accent)]" />
              </div>
              <p className="font-medium text-[var(--fg)]">Нет задач в этой группе</p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">
                Создайте задачу или выберите другую группу
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  selected={task.id === selectedId}
                  onSelect={() => setSelectedId(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {selectedTask ? (
          <TaskDetailPanel task={selectedTask} onDeselect={() => setSelectedId(null)} />
        ) : (
          <div className="glass-card flex h-full flex-col items-center justify-center rounded-2xl">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--surface)] mb-4">
              <Sparkles className="h-10 w-10 text-[var(--fg-muted)]" />
            </div>
            <p className="font-medium text-[var(--fg)]">Выберите задачу</p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">или создайте новую из списка слева</p>
          </div>
        )}
      </div>
    </div>
  )
}
