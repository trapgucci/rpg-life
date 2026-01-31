import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Task, TaskId, CharacterState, Reward, GameStateSnapshot, TodoTask, DailyTask } from '../types/domain'

function now() { return Date.now() }

function createDefaultCharacter(): CharacterState {
  return {
    name: 'Герой',
    stats: { level: 1, xp: 0, hp: 50, maxHp: 50, gold: 0 },
    inventory: [],
  }
}

function calculateXpForLevel(level: number): number {
  return 100 + (level - 1) * 50
}

type Theme = 'system' | 'light' | 'dark'

interface GameStoreState {
  tasks: Task[]
  character: CharacterState
  rewards: Reward[]
  ui: { theme: Theme }

  setTheme: (theme: Theme) => void

  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task
  updateTask: (id: TaskId, updater: (t: Task) => Task) => void
  deleteTask: (id: TaskId) => void

  completeTask: (id: TaskId) => void
  failTask: (id: TaskId) => void

  purchaseReward: (rewardId: string) => boolean
  addReward: (reward: Reward) => void

  getSnapshot: () => GameStateSnapshot
}

export const useGameStore = create<GameStoreState>()(persist(
  (set, get) => ({
    tasks: [],
    character: createDefaultCharacter(),
    rewards: [],
    ui: { theme: 'system' },

    setTheme: (theme) => set(state => ({ ui: { ...state.ui, theme } })),

    addTask: (task) => {
      const id = crypto.randomUUID()
      const base = { id, createdAt: now(), updatedAt: now() }
      const newTask = { ...task, ...base } as Task
      set(state => ({ tasks: [newTask, ...state.tasks] }))
      return newTask
    },

    updateTask: (id, updater) => {
      set(state => ({
        tasks: state.tasks.map(t => t.id === id ? { ...updater(t), updatedAt: now() } : t)
      }))
    },

    deleteTask: (id) => {
      set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }))
    },

    completeTask: (id) => {
      const { tasks, character } = get()
      const task = tasks.find(t => t.id === id)
      if (!task) return

      const diffMultiplier = task.difficulty === 'easy' ? 1 : task.difficulty === 'normal' ? 1.5 : 2
      const xpGain = Math.round(10 * diffMultiplier)
      const goldGain = Math.round(5 * diffMultiplier)

      if (task.kind === 'todo') {
        const todo = task as TodoTask
        if ((todo as TodoTask).isCompleted) return
        get().updateTask(id, (t) => ({ ...(t as TodoTask), isCompleted: true, completedAt: now() }))
      } else if (task.kind === 'daily') {
        const daily = task as DailyTask
        const today = new Date(); today.setHours(0,0,0,0)
        const todayStart = today.getTime()
        if (daily.lastCompletedAt && daily.lastCompletedAt >= todayStart) return
        get().updateTask(id, (t) => ({ ...(t as DailyTask), streak: daily.streak + 1, lastCompletedAt: now() }))
      }

      let { xp, level, hp, maxHp, gold } = character.stats
      xp += xpGain
      gold += goldGain
      while (xp >= calculateXpForLevel(level)) {
        xp -= calculateXpForLevel(level)
        level += 1
        maxHp += 5
        hp = Math.min(maxHp, hp + 5)
      }

      set(state => ({
        character: { ...state.character, stats: { ...state.character.stats, xp, level, hp, maxHp, gold } }
      }))
    },

    failTask: (id) => {
      const { tasks, character } = get()
      const task = tasks.find(t => t.id === id)
      if (!task) return

      const diffMultiplier = task.difficulty === 'easy' ? 1 : task.difficulty === 'normal' ? 1.5 : 2
      const hpLoss = Math.round(5 * diffMultiplier)

      let { hp } = character.stats
      hp = Math.max(0, hp - hpLoss)

      set(state => ({ character: { ...state.character, stats: { ...state.character.stats, hp } } }))
    },

    purchaseReward: (rewardId) => {
      const { rewards, character } = get()
      const reward = rewards.find(r => r.id === rewardId)
      if (!reward) return false
      if (character.stats.gold < reward.costGold) return false

      set(state => ({
        character: {
          ...state.character,
          stats: { ...state.character.stats, gold: state.character.stats.gold - reward.costGold }
        }
      }))
      return true
    },

    addReward: (reward) => set(state => ({ rewards: [reward, ...state.rewards] })),

    getSnapshot: () => ({
      tasks: get().tasks,
      character: get().character,
      rewards: get().rewards,
      lastSaveAt: now(),
    }),
  }),
  {
    name: 'rpg-life-store',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ tasks: state.tasks, character: state.character, rewards: state.rewards, ui: state.ui }),
  }
))
