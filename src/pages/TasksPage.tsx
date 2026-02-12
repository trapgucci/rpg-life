import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'
import { CheckSquare, Plus, Sparkles, Target, Folder, Pencil, Trash2, X, Clock, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronDown, List } from 'lucide-react'
import TaskCreateForm from '../components/TaskCreateForm'
import TaskCard from '../components/TaskCard'
import TaskDetailPanel from '../components/TaskDetailPanel'
import { useRpgStore } from '../store/useRpgStore'
import ConfirmModal from '../components/ConfirmModal'
import type { TaskRpg, TaskGroupId } from '../types/domain'

/** Специальный id для «Без группы» */
const NO_GROUP_ID: TaskGroupId | null = null
/** Специальный id для «Все группы» */
const ALL_GROUPS_ID = '__all_groups__' as TaskGroupId

/** Типы фильтров для вкладок */
type TaskFilter = 'all' | 'active' | 'completed' | 'canceled'

/** Поля сортировки */
type SortField = 'date' | 'deadline' | 'priority' | 'reward' | 'difficulty'
type SortDirection = 'asc' | 'desc'

const SORT_LABELS: Record<SortField, string> = {
  date: 'Дата',
  deadline: 'Дедлайн',
  priority: 'Приоритет',
  reward: 'Награда',
  difficulty: 'Сложность',
}

const DIFFICULTY_ORDER: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  veryHard: 4,
}

const PRIORITY_ORDER: Record<string, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
}

export default function TasksPage() {
  const tasks = useRpgStore((s) => s.tasks)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const taskGroupsRaw = useRpgStore((s) => s.taskGroups)
  const addTaskGroup = useRpgStore((s) => s.addTaskGroup)
  const updateTaskGroup = useRpgStore((s) => s.updateTaskGroup)
  const deleteTaskGroup = useRpgStore((s) => s.deleteTaskGroup)
  const reorderTaskGroups = useRpgStore((s) => s.reorderTaskGroups)
  const resetRecurringTasks = useRpgStore((s) => s.resetRecurringTasks)
  const getTaskRewardPreview = useRpgStore((s) => s.getTaskRewardPreview)

  const taskGroups = useMemo(
    () =>
      activeProfileId
        ? taskGroupsRaw
            .filter((g) => g.profileId === activeProfileId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [taskGroupsRaw, activeProfileId]
  )

  const [selectedGroupId, setSelectedGroupId] = useState<TaskGroupId | null>(ALL_GROUPS_ID)
  const [selectedId, setSelectedId] = useState<TaskRpg['id'] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('active')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showGroupSelector, setShowGroupSelector] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const groupSelectorRef = useRef<HTMLDivElement>(null)
  const groupButtonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  // Сброс recurring задач при монтировании
  useEffect(() => {
    resetRecurringTasks()
  }, [resetRecurringTasks])

  // Close sort menu on outside click
  useEffect(() => {
    if (!showSortMenu) return
    const handler = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSortMenu])

  // Update dropdown position when opening
  useEffect(() => {
    if (showGroupSelector && groupButtonRef.current) {
      const rect = groupButtonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [showGroupSelector])

  // Close group selector on outside click
  useEffect(() => {
    if (!showGroupSelector) return
    const handler = (e: MouseEvent) => {
      if (
        groupSelectorRef.current &&
        !groupSelectorRef.current.contains(e.target as Node) &&
        groupButtonRef.current &&
        !groupButtonRef.current.contains(e.target as Node)
      ) {
        setShowGroupSelector(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showGroupSelector])

  const [newGroupName, setNewGroupName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<TaskGroupId | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [deletingGroupId, setDeletingGroupId] = useState<TaskGroupId | null>(null)
  const [draggedGroupId, setDraggedGroupId] = useState<TaskGroupId | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<TaskGroupId | null>(null)

  const filteredTasks = useMemo(() => {
    if (!activeProfileId) return []
    const now = Date.now()
    let list = tasks.filter((t) => {
      if (t.profileId !== activeProfileId) return false
      if (t.archived) return false

      // Фильтр по статусу
      if (taskFilter === 'all') {
        // Все задачи - пропускаем фильтрацию по статусу
      } else if (taskFilter === 'active') {
        // Активные: не выполнены и не просрочены
        if (t.isCompleted) return false
        if (t.deadlineAt && now > t.deadlineAt) return false
      } else if (taskFilter === 'completed') {
        // Выполненные
        if (!t.isCompleted) return false
      } else if (taskFilter === 'canceled') {
        // Отмененные (просроченные)
        if (t.isCompleted) return false
        if (!t.deadlineAt || now <= t.deadlineAt) return false
      }

      const g = t.groupId ?? null
      if (selectedGroupId === ALL_GROUPS_ID) return true
      if (selectedGroupId === NO_GROUP_ID) return g === null
      return g === selectedGroupId
    })

    // Поиск по названию
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      list = list.filter(t => t.title.toLowerCase().includes(query))
    }

    return list
  }, [tasks, activeProfileId, selectedGroupId, taskFilter, searchQuery])

  // Вычисляем награды один раз, затем сортируем используя уже вычисленные значения
  const tasksWithRewards = useMemo(() => {
    const rewardMap = new Map<string, { xp: number; coins: number; gems: number }>()
    for (const task of filteredTasks) {
      rewardMap.set(task.id, getTaskRewardPreview(task))
    }

    const sorted = [...filteredTasks].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1

      const dir = sortDirection === 'asc' ? 1 : -1
      switch (sortField) {
        case 'date':
          return (b.updatedAt - a.updatedAt) * dir
        case 'deadline': {
          const aD = a.deadlineAt ?? Infinity
          const bD = b.deadlineAt ?? Infinity
          return (aD - bD) * dir
        }
        case 'priority': {
          const aP = PRIORITY_ORDER[a.priority ?? 'none'] ?? 0
          const bP = PRIORITY_ORDER[b.priority ?? 'none'] ?? 0
          return (aP - bP) * dir
        }
        case 'reward': {
          const aR = rewardMap.get(a.id)!
          const bR = rewardMap.get(b.id)!
          const aTot = aR.coins + aR.gems + aR.xp
          const bTot = bR.coins + bR.gems + bR.xp
          return (aTot - bTot) * dir
        }
        case 'difficulty': {
          const aD2 = DIFFICULTY_ORDER[a.difficulty] ?? 0
          const bD2 = DIFFICULTY_ORDER[b.difficulty] ?? 0
          return (aD2 - bD2) * dir
        }
        default:
          return b.updatedAt - a.updatedAt
      }
    })

    return sorted.map(task => ({ task, rewards: rewardMap.get(task.id)! }))
  }, [filteredTasks, sortField, sortDirection, getTaskRewardPreview])

  // Bug fix: look up selectedTask in ALL tasks (not just filteredTasks)
  // so switching filter/group doesn't lose the selected task panel
  const selectedTask = selectedId ? tasks.find((t) => t.id === selectedId) ?? null : null

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
    setDeletingGroupId(id)
  }

  const confirmDeleteGroup = () => {
    if (deletingGroupId) {
      deleteTaskGroup(deletingGroupId)
      if (selectedGroupId === deletingGroupId) setSelectedGroupId(NO_GROUP_ID)
      setEditingGroupId(null)
    }
    setDeletingGroupId(null)
  }

  const taskCountByGroup = useMemo(() => {
    const map = new Map<TaskGroupId | null, number>()
    if (!activeProfileId) return map
    const now = Date.now()
    tasks
      .filter((t) => {
        if (t.profileId !== activeProfileId || t.archived) return false

        // Применяем тот же фильтр, что и для отображения задач
        if (taskFilter === 'all') {
          // Все задачи - пропускаем фильтрацию по статусу
        } else if (taskFilter === 'active') {
          if (t.isCompleted) return false
          if (t.deadlineAt && now > t.deadlineAt) return false
        } else if (taskFilter === 'completed') {
          if (!t.isCompleted) return false
        } else if (taskFilter === 'canceled') {
          if (t.isCompleted) return false
          if (!t.deadlineAt || now <= t.deadlineAt) return false
        }

        return true
      })
      .forEach((t) => {
        const g = t.groupId ?? null
        map.set(g, (map.get(g) ?? 0) + 1)
      })
    return map
  }, [tasks, activeProfileId, taskFilter])

  const countNoGroup = taskCountByGroup.get(null) ?? 0

  const handleDragStart = (groupId: TaskGroupId) => {
    setDraggedGroupId(groupId)
  }

  const handleDragOver = (e: React.DragEvent, groupId: TaskGroupId) => {
    e.preventDefault()
    if (draggedGroupId && draggedGroupId !== groupId) {
      setDragOverGroupId(groupId)
    }
  }

  const handleDragLeave = () => {
    setDragOverGroupId(null)
  }

  const handleDrop = (e: React.DragEvent, targetGroupId: TaskGroupId) => {
    e.preventDefault()
    if (!draggedGroupId || draggedGroupId === targetGroupId) return

    const draggedIndex = taskGroups.findIndex(g => g.id === draggedGroupId)
    const targetIndex = taskGroups.findIndex(g => g.id === targetGroupId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newGroups = [...taskGroups]
    const [removed] = newGroups.splice(draggedIndex, 1)
    newGroups.splice(targetIndex, 0, removed)

    reorderTaskGroups(newGroups.map(g => g.id))
    setDraggedGroupId(null)
    setDragOverGroupId(null)
  }

  const handleDragEnd = () => {
    setDraggedGroupId(null)
    setDragOverGroupId(null)
  }

  return (
    <div className="flex h-full min-h-0 gap-4">
      <div className="flex w-full md:basis-[42%] md:max-w-[560px] md:min-w-[420px] md:shrink-0 flex-col gap-4">
        {/* Header */}
        <div className="glass-card rounded-2xl p-3 md:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                <Target className="h-4.5 w-4.5 md:h-5 md:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-bold text-[var(--fg)]">Задачи</h1>
                <p className="text-[10px] md:text-xs text-[var(--fg-muted)]">
                  {taskFilter === 'all' && 'Все задачи'}
                  {taskFilter === 'active' && 'Активные'}
                  {taskFilter === 'completed' && 'Выполненные'}
                  {taskFilter === 'canceled' && 'Отмененные'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Sort button */}
              <div className="relative" ref={sortMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowSortMenu((v) => !v)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                    'border border-[var(--border)] text-[var(--fg-muted)]',
                    'hover:border-[var(--border-accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]',
                    showSortMenu && 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-subtle)]'
                  )}
                  title="Сортировка"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>

                {showSortMenu && (
                  <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] shadow-lg backdrop-blur-xl overflow-hidden">
                    <div className="px-3 py-2 text-xs font-medium text-[var(--fg-muted)] border-b border-[var(--border)]">
                      Сортировка
                    </div>
                    {(Object.keys(SORT_LABELS) as SortField[]).map((field) => {
                      const isActive = sortField === field
                      return (
                        <button
                          key={field}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
                            } else {
                              setSortField(field)
                              setSortDirection('desc')
                            }
                          }}
                          className={cn(
                            'flex w-full items-center justify-between px-3 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                              : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)]'
                          )}
                        >
                          <span>{SORT_LABELS[field]}</span>
                          {isActive && (
                            sortDirection === 'asc'
                              ? <ArrowUp className="h-3.5 w-3.5" />
                              : <ArrowDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Search button */}
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                  'border border-[var(--border)] text-[var(--fg-muted)]',
                  'hover:border-[var(--border-accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]',
                  showSearch && 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-subtle)]'
                )}
                title="Поиск"
              >
                <Search className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Новая
              </button>
            </div>
          </div>

          {/* Search input */}
          {showSearch && (
            <div className="glass-card rounded-2xl p-3 mt-4 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию..."
                className="input w-full"
                autoFocus
              />
            </div>
          )}

          {/* Компактный селектор групп */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-[var(--fg-muted)]">Группа</p>
            <button
              ref={groupButtonRef}
              type="button"
              onClick={() => setShowGroupSelector(!showGroupSelector)}
              className={cn(
                'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all',
                'border border-[var(--border)]',
                showGroupSelector
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                  : 'text-[var(--fg-secondary)] hover:border-[var(--border-accent)] hover:bg-[var(--surface)]'
              )}
            >
              <Folder className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">
                {selectedGroupId === ALL_GROUPS_ID
                  ? 'Все группы'
                  : selectedGroupId === NO_GROUP_ID
                  ? 'Без группы'
                  : taskGroups.find((g) => g.id === selectedGroupId)?.name ?? 'Группа'}
              </span>
              <span className="text-xs text-[var(--fg-muted)] mr-1">
                {selectedGroupId === ALL_GROUPS_ID
                  ? Array.from(taskCountByGroup.values()).reduce((a, b) => a + b, 0)
                  : selectedGroupId === NO_GROUP_ID
                  ? countNoGroup
                  : taskCountByGroup.get(selectedGroupId) ?? 0}
              </span>
              <ChevronDown className={cn(
                'h-4 w-4 shrink-0 transition-transform',
                showGroupSelector && 'rotate-180'
              )} />
            </button>
          </div>

          {/* Выпадающий список групп (через портал) */}
          {showGroupSelector && createPortal(
            <div
              ref={groupSelectorRef}
              className="fixed z-[100] rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] shadow-xl backdrop-blur-xl overflow-hidden max-h-[320px] overflow-y-auto"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
              }}
            >
                {/* Без группы */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroupId(NO_GROUP_ID)
                    setShowGroupSelector(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-all',
                    selectedGroupId === NO_GROUP_ID
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                      : 'text-[var(--fg-secondary)] hover:bg-[var(--accent-subtle)] hover:text-[var(--fg)]'
                  )}
                >
                  <Folder className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">Без группы</span>
                  <span className="text-xs text-[var(--fg-muted)]">{countNoGroup}</span>
                </button>

                {/* Все группы */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroupId(ALL_GROUPS_ID)
                    setShowGroupSelector(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-all',
                    selectedGroupId === ALL_GROUPS_ID
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                      : 'text-[var(--fg-secondary)] hover:bg-[var(--accent-subtle)] hover:text-[var(--fg)]'
                  )}
                >
                  <Folder className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">Все группы</span>
                  <span className="text-xs text-[var(--fg-muted)]">
                    {Array.from(taskCountByGroup.values()).reduce((a, b) => a + b, 0)}
                  </span>
                </button>

                {/* Разделитель */}
                {taskGroups.length > 0 && (
                  <div className="h-px bg-[var(--border)] my-1" />
                )}

                {/* Пользовательские группы */}
                {taskGroups.map((group) => (
                  <div
                    key={group.id}
                    draggable={editingGroupId !== group.id}
                    onDragStart={() => handleDragStart(group.id)}
                    onDragOver={(e) => handleDragOver(e, group.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, group.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'group flex items-center gap-2 text-left text-sm transition-all',
                      selectedGroupId === group.id
                        ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                        : 'text-[var(--fg-secondary)] hover:bg-[var(--accent-subtle)] hover:text-[var(--fg)]',
                      draggedGroupId === group.id && 'opacity-50',
                      dragOverGroupId === group.id && 'border-t-2 border-[var(--accent)]',
                      editingGroupId !== group.id && 'cursor-move'
                    )}
                  >
                    {editingGroupId === group.id ? (
                      <div className="flex w-full items-center gap-2 px-3 py-2">
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
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGroupId(group.id)
                            setShowGroupSelector(false)
                          }}
                          className="flex flex-1 items-center gap-2 px-3 py-2.5 min-w-0"
                        >
                          <Folder className="h-4 w-4 shrink-0" />
                          <span className="truncate">{group.name}</span>
                          <span className="text-xs text-[var(--fg-muted)] shrink-0">
                            {taskCountByGroup.get(group.id) ?? 0}
                          </span>
                        </button>
                        <div className="flex gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingGroupId(group.id)
                              setEditingGroupName(group.name)
                            }}
                            className="icon-btn h-7 w-7 p-0"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteGroup(group.id)
                              setShowGroupSelector(false)
                            }}
                            className="icon-btn icon-btn-danger h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* Разделитель */}
                <div className="h-px bg-[var(--border)] my-1" />

                {/* Добавить группу */}
                {addingGroup ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)]">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddGroup()
                          setShowGroupSelector(false)
                        }
                        if (e.key === 'Escape') setAddingGroup(false)
                      }}
                      placeholder="Название группы"
                      className="input flex-1 py-1.5 text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleAddGroup()
                        setShowGroupSelector(false)
                      }}
                      className="icon-btn h-8 w-8 p-0 text-[var(--accent)]"
                    >
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
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[var(--fg-muted)] hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Добавить группу
                  </button>
                )}
              </div>,
            document.body
          )}

          {/* Фильтр по статусу задач */}
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <p className="mb-2 text-xs font-medium text-[var(--fg-muted)]">Статус задач</p>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setTaskFilter('all')}
                className={cn(
                  'flex items-center justify-center rounded-xl px-3 py-2.5 text-sm transition-all',
                  taskFilter === 'all'
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                    : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)]'
                )}
                title="Все задачи"
              >
                <List className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('active')}
                className={cn(
                  'flex items-center justify-center rounded-xl px-3 py-2.5 text-sm transition-all',
                  taskFilter === 'active'
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                    : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)]'
                )}
                title="Активные"
              >
                <Target className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('completed')}
                className={cn(
                  'flex items-center justify-center rounded-xl px-3 py-2.5 text-sm transition-all',
                  taskFilter === 'completed'
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                    : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)]'
                )}
                title="Выполненные"
              >
                <CheckSquare className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('canceled')}
                className={cn(
                  'flex items-center justify-center rounded-xl px-3 py-2.5 text-sm transition-all',
                  taskFilter === 'canceled'
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                    : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)]'
                )}
                title="Отмененные"
              >
                <Clock className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl">
          {tasksWithRewards.length === 0 ? (
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
              {tasksWithRewards.map(({ task, rewards }) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  selected={task.id === selectedId}
                  onSelect={() => setSelectedId(task.id)}
                  rewards={rewards}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop right panel */}
      <div className="hidden md:block min-w-0 flex-1">
        {showForm ? (
          <div className="glass-card flex h-full flex-col rounded-2xl p-6 overflow-hidden">
            <div className="flex shrink-0 items-center justify-between mb-4">
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
              <TaskCreateForm
                defaultGroupId={selectedGroupId === NO_GROUP_ID ? null : selectedGroupId}
                onCreated={() => setShowForm(false)}
              />
            </div>
          </div>
        ) : selectedTask ? (
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

      {/* Mobile detail overlay */}
      {showForm && (
        <div className="fixed inset-0 z-40 md:hidden overflow-y-auto p-4 animate-habit-slide-up" style={{ background: 'var(--bg)', backgroundColor: 'var(--bg-solid)' }}>
          <div className="glass-card flex flex-col rounded-2xl p-4 overflow-hidden">
            <div className="flex shrink-0 items-center justify-between mb-4">
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
            <div className="overflow-y-auto">
              <TaskCreateForm
                defaultGroupId={selectedGroupId === NO_GROUP_ID ? null : selectedGroupId}
                onCreated={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}
      {selectedTask && !showForm && (
        <div className="fixed inset-0 z-40 md:hidden overflow-y-auto p-4 animate-habit-slide-up" style={{ background: 'var(--bg)', backgroundColor: 'var(--bg-solid)' }}>
          <TaskDetailPanel task={selectedTask} onDeselect={() => setSelectedId(null)} />
        </div>
      )}

      <ConfirmModal
        isOpen={deletingGroupId !== null}
        onConfirm={confirmDeleteGroup}
        onCancel={() => setDeletingGroupId(null)}
        title="Удалить группу?"
        message="Задачи из этой группы останутся в «Без группы»."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
    </div>
  )
}
