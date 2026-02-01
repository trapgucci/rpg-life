import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  TaskRpg,
  TaskId,
  TaskGroup,
  TaskGroupId,
  Profile,
  ProfileId,
  Attribute,
  AttributeId,
  Habit,
  HabitId,
  Achievement,
  AchievementId,
  CraftRecipe,
  CraftRecipeId,
  ShopItem,
  ItemId,
  InventoryEntry,
  AppSettings,
  CurrencyId,
} from '../types/domain'
import {
  TASK_XP_BY_DIFFICULTY,
  DEFAULT_ATTRIBUTES,
  DEFAULT_SETTINGS,
  CURRENCY_IDS,
  xpForLevelStandard,
  xpForLevelFast,
  xpForLevelCustom,
} from '../types/domain'

const DEFAULT_PENALTY_FACTOR = 0.2
const EMPTY_ATTRIBUTES: Attribute[] = []

function now() {
  return Date.now()
}

function getTodayStart(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function createDefaultProfile(name: string): Profile {
  const id = crypto.randomUUID()
  const attributes: Attribute[] = DEFAULT_ATTRIBUTES.map((a, i) => ({
    ...a,
    id: `attr-${id}-${i}`,
  }))
  return {
    id,
    name,
    level: 1,
    xp: 0,
    levelingMode: 'standard',
    levelCurve: [],
    attributes,
    currencies: { 
      [CURRENCY_IDS.COINS]: 0,
      [CURRENCY_IDS.GEMS]: 0,
    },
    createdAt: now(),
    updatedAt: now(),
  }
}

function xpRequiredForNextLevel(profile: Profile, currentLevel: number): number {
  if (profile.levelingMode === 'standard') {
    return xpForLevelStandard(currentLevel + 1) - xpForLevelStandard(currentLevel)
  }
  if (profile.levelingMode === 'fast') {
    return xpForLevelFast(currentLevel + 1) - xpForLevelFast(currentLevel)
  }
  const segs = profile.levelCurve
  return xpForLevelCustom(currentLevel + 1, segs) - xpForLevelCustom(currentLevel, segs)
}

function addXpToAttribute(profile: Profile, attributeId: AttributeId, xpGain: number): Attribute[] {
  return profile.attributes.map((attr) => {
    if (attr.id !== attributeId) return attr
    let { level, current_xp } = attr
    current_xp += xpGain
    let required = xpRequiredForNextLevel(profile, level)
    while (required > 0 && current_xp >= required) {
      current_xp -= required
      level += 1
      required = xpRequiredForNextLevel(profile, level)
    }
    return { ...attr, level, current_xp }
  })
}

function deductXpFromAttribute(
  profile: Profile,
  attributeId: AttributeId,
  xpDeduct: number
): Attribute[] {
  return profile.attributes.map((attr) => {
    if (attr.id !== attributeId) return attr
    let { level, current_xp } = attr
    current_xp = Math.max(0, current_xp - xpDeduct)
    while (level > 1 && current_xp === 0) {
      const prevRequired = xpRequiredForNextLevel(profile, level - 1)
      level -= 1
      current_xp = prevRequired - 1
    }
    return { ...attr, level, current_xp }
  })
}

// ─── Store State Interface ──────────────────────────────────────────────────

interface RpgStoreState {
  // Data
  profiles: Profile[]
  activeProfileId: ProfileId | null
  taskGroups: TaskGroup[]
  tasks: TaskRpg[]
  habits: Habit[]
  achievements: Achievement[]
  craftRecipes: CraftRecipe[]
  shopItems: ShopItem[]
  inventory: InventoryEntry[]
  settings: AppSettings
  
  // Stats
  stats: {
    totalTasksCompleted: number
    totalHabitsPositive: number
    totalHabitsNegative: number
    totalCoinsEarned: number
    totalItemsCrafted: number
    currentStreak: number
    bestStreak: number
    lastActiveDate: number
  }

  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void

  // Profile actions
  getActiveProfile: () => Profile | null
  addProfile: (name: string) => Profile
  setActiveProfile: (id: ProfileId) => void
  updateProfile: (id: ProfileId, updater: (p: Profile) => Profile) => void
  
  // Attribute actions
  getAttributes: () => Attribute[]
  addAttribute: (attr: Omit<Attribute, 'id'>) => Attribute
  updateAttribute: (id: AttributeId, updater: (a: Attribute) => Attribute) => void
  deleteAttribute: (id: AttributeId) => void
  
  // Currency actions
  addCurrency: (currencyId: CurrencyId, amount: number) => void
  deductCurrency: (currencyId: CurrencyId, amount: number) => boolean
  getCurrency: (currencyId: CurrencyId) => number

  // Task group actions
  getTaskGroups: () => TaskGroup[]
  addTaskGroup: (name: string) => TaskGroup
  updateTaskGroup: (id: TaskGroupId, updater: (g: TaskGroup) => TaskGroup) => void
  deleteTaskGroup: (id: TaskGroupId) => void

  // Task actions
  getTasks: () => TaskRpg[]
  addTask: (task: Omit<TaskRpg, 'id' | 'createdAt' | 'updatedAt' | 'profileId'>) => TaskRpg
  updateTask: (id: TaskId, updater: (t: TaskRpg) => TaskRpg) => void
  deleteTask: (id: TaskId) => void
  completeTask: (id: TaskId) => void
  canCompleteTask: (task: TaskRpg) => boolean
  skipTask: (id: TaskId) => void
  abandonTask: (id: TaskId) => void
  incrementCounter: (id: TaskId) => void
  decrementCounter: (id: TaskId) => void
  toggleSubtask: (taskId: TaskId, subtaskId: string) => void
  getTaskRewardPreview: (task: TaskRpg) => { xp: number; coins: number }
  getTaskPenaltyPreview: (task: TaskRpg) => { xp: number; coins: number }

  // Habit actions
  getHabits: () => Habit[]
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'profileId' | 'todayPositive' | 'todayNegative' | 'lastResetDate' | 'streak' | 'totalPositive' | 'totalNegative'>) => Habit
  updateHabit: (id: HabitId, updater: (h: Habit) => Habit) => void
  deleteHabit: (id: HabitId) => void
  clickHabitPositive: (id: HabitId) => void
  clickHabitNegative: (id: HabitId) => void
  resetDailyHabits: () => void

  // Achievement actions
  getAchievements: () => Achievement[]
  addAchievement: (achievement: Omit<Achievement, 'id' | 'createdAt' | 'updatedAt' | 'profileId' | 'unlocked' | 'unlockedAt' | 'currentProgress'>) => Achievement
  updateAchievement: (id: AchievementId, updater: (a: Achievement) => Achievement) => void
  deleteAchievement: (id: AchievementId) => void
  checkAchievements: () => void
  unlockAchievement: (id: AchievementId) => void

  // Craft actions
  getCraftRecipes: () => CraftRecipe[]
  addCraftRecipe: (recipe: Omit<CraftRecipe, 'id' | 'createdAt' | 'updatedAt' | 'profileId' | 'fragmentsCollected' | 'crafted' | 'craftedAt'>) => CraftRecipe
  updateCraftRecipe: (id: CraftRecipeId, updater: (r: CraftRecipe) => CraftRecipe) => void
  deleteCraftRecipe: (id: CraftRecipeId) => void
  addFragment: (recipeId: CraftRecipeId, amount?: number) => void
  craftItem: (recipeId: CraftRecipeId) => boolean
  tryRandomFragmentDrop: () => void

  // Shop actions
  getShopItems: () => ShopItem[]
  addShopItem: (item: Omit<ShopItem, 'id'>) => ShopItem
  updateShopItem: (id: ItemId, updater: (i: ShopItem) => ShopItem) => void
  deleteShopItem: (id: ItemId) => void
  purchaseItem: (itemId: ItemId) => boolean
  openLootbox: (itemId: ItemId) => { itemId: string; name: string } | null

  // Inventory actions
  getInventory: () => InventoryEntry[]
  addToInventory: (itemId: ItemId, quantity?: number) => void
  removeFromInventory: (itemId: ItemId, quantity?: number) => boolean
  useItem: (itemId: ItemId) => boolean

  // Export/Import
  exportData: () => string
  importData: (json: string) => boolean
  resetProgress: () => void
}

// Initialize store with default profile if needed (called once after rehydration)
let storeInitialized = false

export const useRpgStore = create<RpgStoreState>()(
  persist(
    (set, get) => {
      const updateStats = (updater: (s: typeof get extends () => infer S ? S['stats'] : never) => Partial<typeof get extends () => infer S ? S['stats'] : never>) => {
        set((s) => ({ stats: { ...s.stats, ...updater(s.stats) } }))
      }

      return {
        // Initial state
        profiles: [],
        activeProfileId: null,
        taskGroups: [],
        tasks: [],
        habits: [],
        achievements: [],
        craftRecipes: [],
        shopItems: [],
        inventory: [],
        settings: { ...DEFAULT_SETTINGS },
        stats: {
          totalTasksCompleted: 0,
          totalHabitsPositive: 0,
          totalHabitsNegative: 0,
          totalCoinsEarned: 0,
          totalItemsCrafted: 0,
          currentStreak: 0,
          bestStreak: 0,
          lastActiveDate: 0,
        },

        // ─── Settings ─────────────────────────────────────────────────────
        updateSettings: (newSettings) => {
          set((s) => ({ settings: { ...s.settings, ...newSettings } }))
        },

        // ─── Profile ──────────────────────────────────────────────────────
        getActiveProfile: () => {
          const { profiles, activeProfileId } = get()
          if (profiles.length === 0) return null
          return profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null
        },

        addProfile: (name) => {
          const profile = createDefaultProfile(name)
          set((s) => ({ profiles: [...s.profiles, profile] }))
          return profile
        },

        setActiveProfile: (id) => set({ activeProfileId: id }),

        updateProfile: (id, updater) => {
          set((s) => ({
            profiles: s.profiles.map((p) => (p.id === id ? { ...updater(p), updatedAt: now() } : p)),
          }))
        },

        // ─── Attributes ───────────────────────────────────────────────────
        getAttributes: () => {
          const profile = get().getActiveProfile()
          return profile?.attributes ?? EMPTY_ATTRIBUTES
        },

        addAttribute: (attr) => {
          const profile = get().getActiveProfile()
          if (!profile) throw new Error('No active profile')
          const newAttr: Attribute = { ...attr, id: crypto.randomUUID() }
          get().updateProfile(profile.id, (p) => ({
            ...p,
            attributes: [...p.attributes, newAttr],
          }))
          return newAttr
        },

        updateAttribute: (id, updater) => {
          const profile = get().getActiveProfile()
          if (!profile) return
          get().updateProfile(profile.id, (p) => ({
            ...p,
            attributes: p.attributes.map((a) => (a.id === id ? updater(a) : a)),
          }))
        },

        deleteAttribute: (id) => {
          const profile = get().getActiveProfile()
          if (!profile) return
          get().updateProfile(profile.id, (p) => ({
            ...p,
            attributes: p.attributes.filter((a) => a.id !== id),
          }))
        },

        // ─── Currency ─────────────────────────────────────────────────────
        addCurrency: (currencyId, amount) => {
          const profile = get().getActiveProfile()
          if (!profile) return
          const current = profile.currencies[currencyId] ?? 0
          get().updateProfile(profile.id, (p) => ({
            ...p,
            currencies: { ...p.currencies, [currencyId]: current + amount },
          }))
          if (currencyId === CURRENCY_IDS.COINS) {
            updateStats((s) => ({ totalCoinsEarned: s.totalCoinsEarned + amount }))
          }
        },

        deductCurrency: (currencyId, amount) => {
          const profile = get().getActiveProfile()
          if (!profile) return false
          const current = profile.currencies[currencyId] ?? 0
          if (current < amount) return false
          get().updateProfile(profile.id, (p) => ({
            ...p,
            currencies: { ...p.currencies, [currencyId]: current - amount },
          }))
          return true
        },

        getCurrency: (currencyId) => {
          const profile = get().getActiveProfile()
          return profile?.currencies[currencyId] ?? 0
        },

        // ─── Task groups ────────────────────────────────────────────────────
        getTaskGroups: () => {
          const { taskGroups, activeProfileId } = get()
          return activeProfileId
            ? taskGroups.filter((g) => g.profileId === activeProfileId).sort((a, b) => a.sortOrder - b.sortOrder)
            : []
        },

        addTaskGroup: (name) => {
          const profile = get().getActiveProfile()
          if (!profile) throw new Error('No active profile')
          const groups = get().getTaskGroups()
          const sortOrder = groups.length === 0 ? 0 : Math.max(...groups.map((g) => g.sortOrder), 0) + 1
          const newGroup: TaskGroup = {
            id: crypto.randomUUID(),
            profileId: profile.id,
            name: name.trim(),
            sortOrder,
            createdAt: now(),
            updatedAt: now(),
          }
          set((s) => ({ taskGroups: [...s.taskGroups, newGroup] }))
          return newGroup
        },

        updateTaskGroup: (id, updater) => {
          set((s) => ({
            taskGroups: s.taskGroups.map((g) => (g.id === id ? { ...updater(g), updatedAt: now() } : g)),
          }))
        },

        deleteTaskGroup: (id) => {
          set((s) => ({
            taskGroups: s.taskGroups.filter((g) => g.id !== id),
            tasks: s.tasks.map((t) => (t.groupId === id ? { ...t, groupId: null } : t)),
          }))
        },

        // ─── Tasks ────────────────────────────────────────────────────────
        getTasks: () => {
          const { tasks, activeProfileId } = get()
          return activeProfileId ? tasks.filter((t) => t.profileId === activeProfileId) : []
        },

        addTask: (task) => {
          const profile = get().getActiveProfile()
          if (!profile) throw new Error('No active profile')
          const id = crypto.randomUUID()
          const created = now()
          const newTask = {
            ...task,
            profileId: profile.id,
            groupId: task.groupId ?? null,
            deadlineAt: task.deadlineAt ?? null,
            recurrence: task.recurrence ?? 'once',
            coinReward: task.coinReward ?? 0,
            id,
            createdAt: created,
            updatedAt: created,
          } as TaskRpg
          set((s) => ({ tasks: [newTask, ...(s.tasks ?? [])] }))
          return newTask
        },

        updateTask: (id, updater) => {
          set((s) => ({
            tasks: s.tasks.map((t) => (t.id === id ? { ...updater(t), updatedAt: now() } : t)),
          }))
        },

        deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

        getTaskRewardPreview: (task) => {
          const xp = TASK_XP_BY_DIFFICULTY[task.difficulty]
          const coins = task.coinReward
          return { xp, coins }
        },

        getTaskPenaltyPreview: (task) => {
          const { xp, coins } = get().getTaskRewardPreview(task)
          const factor = task.penaltyFactor ?? DEFAULT_PENALTY_FACTOR
          return { xp: Math.round(xp * factor), coins: Math.round(coins * factor) }
        },

        canCompleteTask: (task) => {
          if (task.isCompleted) return false
          const deadlineAt = task.deadlineAt ?? null
          if (deadlineAt != null && now() > deadlineAt) return false
          return true
        },

        completeTask: (id) => {
          const { tasks, getActiveProfile, updateTask, updateProfile, tryRandomFragmentDrop, checkAchievements, canCompleteTask } = get()
          const task = tasks.find((t) => t.id === id)
          const profile = getActiveProfile()
          if (!task || !profile) return
          if (!canCompleteTask(task)) return

          const xpGain = TASK_XP_BY_DIFFICULTY[task.difficulty]
          const coinGain = task.coinReward

          // Add XP to attribute
          if (task.attributeId) {
            const nextAttributes = addXpToAttribute(profile, task.attributeId, xpGain)
            updateProfile(profile.id, (p) => ({ ...p, attributes: nextAttributes }))
          }

          // Add coins
          get().addCurrency(CURRENCY_IDS.COINS, coinGain)

          // Instant recurrence: после выполнения награды выданы — задача остаётся, можно выполнить снова
          if (task.recurrence === 'instant') {
            updateStats((s) => ({ totalTasksCompleted: s.totalTasksCompleted + 1 }))
            tryRandomFragmentDrop()
            checkAchievements()
            // Сбрасываем задачу: isCompleted = false, подзадачи сбрасываем
            updateTask(id, (t) => {
              if (t.kind === 'checkbox') return { ...t, isCompleted: false, completedAt: undefined }
              if (t.kind === 'counter') return { ...t, isCompleted: false, current: 0, completedAt: undefined }
              if (t.kind === 'nested') return { ...t, isCompleted: false, subtasks: t.subtasks.map((s) => ({ ...s, isCompleted: false, completedAt: undefined })), completedAt: undefined }
              return t
            })
            return
          }

          // Mark completed
          updateTask(id, (t) => {
            if (t.kind === 'checkbox') return { ...t, isCompleted: true, completedAt: now() }
            if (t.kind === 'counter') return { ...t, isCompleted: true, current: t.target, completedAt: now() }
            if (t.kind === 'nested') return { ...t, isCompleted: true, completedAt: now() }
            return t
          })

          updateStats((s) => ({ totalTasksCompleted: s.totalTasksCompleted + 1 }))
          tryRandomFragmentDrop()
          checkAchievements()
        },

        skipTask: (id) => {
          get().updateTask(id, (t) => {
            if (t.kind === 'checkbox') return { ...t, isCompleted: true, completedAt: now() }
            if (t.kind === 'counter') return { ...t, isCompleted: true, current: t.target, completedAt: now() }
            if (t.kind === 'nested') return { ...t, isCompleted: true, completedAt: now() }
            return t
          })
        },

        abandonTask: (id) => {
          const { tasks, getActiveProfile, updateTask, updateProfile, getTaskPenaltyPreview } = get()
          const task = tasks.find((t) => t.id === id)
          const profile = getActiveProfile()
          if (!task || !profile) return

          const { xp, coins } = getTaskPenaltyPreview(task)

          if (task.attributeId && xp > 0) {
            const nextAttributes = deductXpFromAttribute(profile, task.attributeId, xp)
            updateProfile(profile.id, (p) => ({ ...p, attributes: nextAttributes }))
          }

          get().deductCurrency(CURRENCY_IDS.COINS, coins)
          updateTask(id, (t) => ({ ...t, archived: true, updatedAt: now() }))
        },

        incrementCounter: (id) => {
          const { tasks, completeTask } = get()
          const task = tasks.find((t) => t.id === id)
          if (!task || task.kind !== 'counter' || task.isCompleted) return
          
          const newCurrent = task.current + 1
          if (newCurrent >= task.target) {
            completeTask(id)
          } else {
            get().updateTask(id, (t) => t.kind === 'counter' ? { ...t, current: newCurrent } : t)
          }
        },

        decrementCounter: (id) => {
          const { tasks } = get()
          const task = tasks.find((t) => t.id === id)
          if (!task || task.kind !== 'counter') return
          
          const newCurrent = Math.max(0, task.current - 1)
          get().updateTask(id, (t) => t.kind === 'counter' ? { ...t, current: newCurrent, isCompleted: false } : t)
        },

        toggleSubtask: (taskId, subtaskId) => {
          const { tasks, completeTask } = get()
          const task = tasks.find((t) => t.id === taskId)
          if (!task || task.kind !== 'nested') return

          const updatedSubtasks = task.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted, completedAt: !s.isCompleted ? now() : undefined } : s
          )
          const allDone = updatedSubtasks.every((s) => s.isCompleted)

          if (allDone && !task.isCompleted) {
            get().updateTask(taskId, (t) => t.kind === 'nested' ? { ...t, subtasks: updatedSubtasks } : t)
            completeTask(taskId)
          } else {
            get().updateTask(taskId, (t) => t.kind === 'nested' ? { ...t, subtasks: updatedSubtasks, isCompleted: false } : t)
          }
        },

        // ─── Habits ───────────────────────────────────────────────────────
        getHabits: () => {
          const { habits, activeProfileId } = get()
          return activeProfileId ? habits.filter((h) => h.profileId === activeProfileId) : []
        },

        addHabit: (habit) => {
          const profile = get().getActiveProfile()
          if (!profile) throw new Error('No active profile')
          const newHabit: Habit = {
            ...habit,
            id: crypto.randomUUID(),
            profileId: profile.id,
            todayPositive: 0,
            todayNegative: 0,
            lastResetDate: getTodayStart(),
            streak: 0,
            totalPositive: 0,
            totalNegative: 0,
            createdAt: now(),
            updatedAt: now(),
          }
          set((s) => ({ habits: [newHabit, ...s.habits] }))
          return newHabit
        },

        updateHabit: (id, updater) => {
          set((s) => ({
            habits: s.habits.map((h) => (h.id === id ? { ...updater(h), updatedAt: now() } : h)),
          }))
        },

        deleteHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

        clickHabitPositive: (id) => {
          const { habits, getActiveProfile, updateProfile, checkAchievements, tryRandomFragmentDrop } = get()
          const habit = habits.find((h) => h.id === id)
          const profile = getActiveProfile()
          if (!habit || !profile || !habit.positiveEnabled) return

          // Reset daily counters if new day
          const todayStart = getTodayStart()
          const isNewDay = habit.lastResetDate < todayStart

          // Add XP to attribute
          if (habit.attributeId && habit.positiveXp > 0) {
            const nextAttributes = addXpToAttribute(profile, habit.attributeId, habit.positiveXp)
            updateProfile(profile.id, (p) => ({ ...p, attributes: nextAttributes }))
          }

          // Add coins
          if (habit.positiveCoins > 0) {
            get().addCurrency(CURRENCY_IDS.COINS, habit.positiveCoins)
          }

          // Add gems
          if ((habit.positiveGemsEnabled ?? false) && (habit.positiveGems ?? 0) > 0) {
            get().addCurrency(CURRENCY_IDS.GEMS, habit.positiveGems ?? 0)
          }

          // Update habit
          get().updateHabit(id, (h) => ({
            ...h,
            todayPositive: isNewDay ? 1 : h.todayPositive + 1,
            todayNegative: isNewDay ? 0 : h.todayNegative,
            lastResetDate: todayStart,
            totalPositive: h.totalPositive + 1,
            streak: isNewDay ? h.streak + 1 : h.streak,
          }))

          // Update stats
          updateStats((s) => ({ totalHabitsPositive: s.totalHabitsPositive + 1 }))

          tryRandomFragmentDrop()
          checkAchievements()
        },

        clickHabitNegative: (id) => {
          const { habits, getActiveProfile, updateProfile } = get()
          const habit = habits.find((h) => h.id === id)
          const profile = getActiveProfile()
          if (!habit || !profile || !habit.negativeEnabled) return

          const todayStart = getTodayStart()
          const isNewDay = habit.lastResetDate < todayStart

          // Deduct XP
          if (habit.attributeId && habit.negativeXp > 0) {
            const nextAttributes = deductXpFromAttribute(profile, habit.attributeId, habit.negativeXp)
            updateProfile(profile.id, (p) => ({ ...p, attributes: nextAttributes }))
          }

          // Deduct coins
          if (habit.negativeCoins > 0) {
            get().deductCurrency(CURRENCY_IDS.COINS, habit.negativeCoins)
          }

          // Deduct gems
          if ((habit.negativeGemsEnabled ?? false) && (habit.negativeGems ?? 0) > 0) {
            get().deductCurrency(CURRENCY_IDS.GEMS, habit.negativeGems ?? 0)
          }

          // Update habit
          get().updateHabit(id, (h) => ({
            ...h,
            todayPositive: isNewDay ? 0 : h.todayPositive,
            todayNegative: isNewDay ? 1 : h.todayNegative + 1,
            lastResetDate: todayStart,
            totalNegative: h.totalNegative + 1,
            streak: 0, // Reset streak on negative
          }))

          updateStats((s) => ({ totalHabitsNegative: s.totalHabitsNegative + 1 }))
        },

        resetDailyHabits: () => {
          const todayStart = getTodayStart()
          set((s) => ({
            habits: s.habits.map((h) => {
              if (h.lastResetDate >= todayStart) return h
              return { ...h, todayPositive: 0, todayNegative: 0, lastResetDate: todayStart }
            }),
          }))
        },

        // ─── Achievements ─────────────────────────────────────────────────
        getAchievements: () => {
          const { achievements, activeProfileId } = get()
          return activeProfileId ? achievements.filter((a) => a.profileId === activeProfileId) : []
        },

        addAchievement: (achievement) => {
          const profile = get().getActiveProfile()
          if (!profile) throw new Error('No active profile')
          const newAchievement: Achievement = {
            ...achievement,
            id: crypto.randomUUID(),
            profileId: profile.id,
            unlocked: false,
            currentProgress: 0,
            createdAt: now(),
            updatedAt: now(),
          }
          set((s) => ({ achievements: [newAchievement, ...s.achievements] }))
          return newAchievement
        },

        updateAchievement: (id, updater) => {
          set((s) => ({
            achievements: s.achievements.map((a) => (a.id === id ? { ...updater(a), updatedAt: now() } : a)),
          }))
        },

        deleteAchievement: (id) => set((s) => ({ achievements: s.achievements.filter((a) => a.id !== id) })),

        checkAchievements: () => {
          const { achievements, stats, getAttributes, unlockAchievement } = get()
          const attributes = getAttributes()

          achievements.forEach((ach) => {
            if (ach.unlocked) return

            let progress = 0
            let target = ach.condition.targetValue

            switch (ach.condition.type) {
              case 'tasks_completed':
                progress = stats.totalTasksCompleted
                break
              case 'habits_positive':
                progress = stats.totalHabitsPositive
                break
              case 'attribute_level':
                const attr = attributes.find((a) => a.id === ach.condition.attributeId)
                progress = attr?.level ?? 0
                break
              case 'streak_days':
                progress = stats.currentStreak
                break
              case 'coins_earned':
                progress = stats.totalCoinsEarned
                break
              case 'items_crafted':
                progress = stats.totalItemsCrafted
                break
              case 'custom':
                // Manual unlock only
                return
            }

            // Update progress
            get().updateAchievement(ach.id, (a) => ({ ...a, currentProgress: progress }))

            // Check if unlocked
            if (progress >= target) {
              unlockAchievement(ach.id)
            }
          })
        },

        unlockAchievement: (id) => {
          const { achievements, addCurrency, addToInventory } = get()
          const ach = achievements.find((a) => a.id === id)
          if (!ach || ach.unlocked) return

          // Give rewards
          if (ach.rewardCoins > 0) addCurrency(CURRENCY_IDS.COINS, ach.rewardCoins)
          if (ach.rewardGems > 0) addCurrency(CURRENCY_IDS.GEMS, ach.rewardGems)
          if (ach.rewardItemId) addToInventory(ach.rewardItemId)

          // Mark as unlocked
          get().updateAchievement(id, (a) => ({ ...a, unlocked: true, unlockedAt: now() }))

          // TODO: Show notification
        },

        // ─── Crafting ─────────────────────────────────────────────────────
        getCraftRecipes: () => {
          const { craftRecipes, activeProfileId } = get()
          return activeProfileId ? craftRecipes.filter((r) => r.profileId === activeProfileId) : []
        },

        addCraftRecipe: (recipe) => {
          const profile = get().getActiveProfile()
          if (!profile) throw new Error('No active profile')
          const newRecipe: CraftRecipe = {
            ...recipe,
            id: crypto.randomUUID(),
            profileId: profile.id,
            fragmentsCollected: 0,
            crafted: false,
            createdAt: now(),
            updatedAt: now(),
          }
          set((s) => ({ craftRecipes: [newRecipe, ...s.craftRecipes] }))
          return newRecipe
        },

        updateCraftRecipe: (id, updater) => {
          set((s) => ({
            craftRecipes: s.craftRecipes.map((r) => (r.id === id ? { ...updater(r), updatedAt: now() } : r)),
          }))
        },

        deleteCraftRecipe: (id) => set((s) => ({ craftRecipes: s.craftRecipes.filter((r) => r.id !== id) })),

        addFragment: (recipeId, amount = 1) => {
          const { craftRecipes } = get()
          const recipe = craftRecipes.find((r) => r.id === recipeId)
          if (!recipe || recipe.crafted) return

          const newCollected = Math.min(recipe.fragmentsRequired, recipe.fragmentsCollected + amount)
          get().updateCraftRecipe(recipeId, (r) => ({ ...r, fragmentsCollected: newCollected }))
        },

        craftItem: (recipeId) => {
          const { craftRecipes, addToInventory, checkAchievements } = get()
          const recipe = craftRecipes.find((r) => r.id === recipeId)
          if (!recipe || recipe.crafted || recipe.fragmentsCollected < recipe.fragmentsRequired) return false

          // Add item to inventory
          addToInventory(recipe.resultItemId)

          // Mark as crafted
          get().updateCraftRecipe(recipeId, (r) => ({ ...r, crafted: true, craftedAt: now() }))

          // Update stats
          updateStats((s) => ({ totalItemsCrafted: s.totalItemsCrafted + 1 }))

          checkAchievements()
          return true
        },

        tryRandomFragmentDrop: () => {
          const recipes = get().getCraftRecipes().filter((r) => !r.crafted)
          
          recipes.forEach((recipe) => {
            recipe.sources.forEach((source) => {
              if (source.type === 'random_drop' && source.dropChance) {
                if (Math.random() < source.dropChance) {
                  get().addFragment(recipe.id, 1)
                }
              }
            })
          })
        },

        // ─── Shop ─────────────────────────────────────────────────────────
        getShopItems: () => get().shopItems,

        addShopItem: (item) => {
          const newItem: ShopItem = { ...item, id: crypto.randomUUID() }
          set((s) => ({ shopItems: [newItem, ...s.shopItems] }))
          return newItem
        },

        updateShopItem: (id, updater) => {
          set((s) => ({
            shopItems: s.shopItems.map((i) => (i.id === id ? updater(i) : i)),
          }))
        },

        deleteShopItem: (id) => set((s) => ({ shopItems: s.shopItems.filter((i) => i.id !== id) })),

        purchaseItem: (itemId) => {
          const { shopItems, deductCurrency, addToInventory, openLootbox } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item) return false

          // Check all currencies
          for (const [currencyId, cost] of Object.entries(item.cost)) {
            if (get().getCurrency(currencyId as CurrencyId) < cost) return false
          }

          // Deduct all currencies
          for (const [currencyId, cost] of Object.entries(item.cost)) {
            deductCurrency(currencyId as CurrencyId, cost)
          }

          // Handle lootbox or regular item
          if (item.isLootBox) {
            openLootbox(itemId)
          } else {
            addToInventory(itemId)
          }

          return true
        },

        openLootbox: (itemId) => {
          const { shopItems, addToInventory, addCurrency } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item || !item.isLootBox || !item.lootTable) return null

          // Calculate total weight
          const totalWeight = item.lootTable.reduce((sum, entry) => sum + entry.weight, 0)
          let random = Math.random() * totalWeight

          // Select item based on weight
          for (const entry of item.lootTable) {
            random -= entry.weight
            if (random <= 0) {
              // Check if it's a currency or item
              if (entry.id === CURRENCY_IDS.COINS || entry.id === CURRENCY_IDS.GEMS) {
                addCurrency(entry.id as CurrencyId, entry.weight * 10) // Weight * 10 as amount
              } else {
                addToInventory(entry.id)
              }
              const resultItem = get().shopItems.find((i) => i.id === entry.id)
              return { itemId: entry.id, name: resultItem?.name ?? 'Награда' }
            }
          }

          return null
        },

        // ─── Inventory ────────────────────────────────────────────────────
        getInventory: () => {
          return get().inventory
        },

        addToInventory: (itemId, quantity = 1) => {
          set((s) => {
            const existing = s.inventory.find((e) => e.itemId === itemId)
            if (existing) {
              return {
                inventory: s.inventory.map((e) =>
                  e.itemId === itemId ? { ...e, quantity: e.quantity + quantity } : e
                ),
              }
            }
            return {
              inventory: [...s.inventory, { itemId, quantity, acquiredAt: now() }],
            }
          })
        },

        removeFromInventory: (itemId, quantity = 1) => {
          const { inventory } = get()
          const existing = inventory.find((e) => e.itemId === itemId)
          if (!existing || existing.quantity < quantity) return false

          set((s) => {
            if (existing.quantity === quantity) {
              return { inventory: s.inventory.filter((e) => e.itemId !== itemId) }
            }
            return {
              inventory: s.inventory.map((e) =>
                e.itemId === itemId ? { ...e, quantity: e.quantity - quantity } : e
              ),
            }
          })
          return true
        },

        useItem: (itemId) => {
          return get().removeFromInventory(itemId, 1)
        },

        // ─── Export/Import ────────────────────────────────────────────────
        exportData: () => {
          const state = get()
          const exportObj = {
            version: 1,
            exportedAt: now(),
            profiles: state.profiles,
            activeProfileId: state.activeProfileId,
            taskGroups: state.taskGroups,
            tasks: state.tasks,
            habits: state.habits,
            achievements: state.achievements,
            craftRecipes: state.craftRecipes,
            shopItems: state.shopItems,
            inventory: state.inventory,
            settings: state.settings,
            stats: state.stats,
          }
          return JSON.stringify(exportObj, null, 2)
        },

        importData: (json) => {
          try {
            const data = JSON.parse(json)
            if (data.version !== 1) return false
            set({
              profiles: data.profiles ?? [],
              activeProfileId: data.activeProfileId ?? null,
              taskGroups: data.taskGroups ?? [],
              tasks: (data.tasks ?? []).map((t: TaskRpg) => ({ ...t, groupId: t.groupId ?? null, deadlineAt: t.deadlineAt ?? null })),
              habits: data.habits ?? [],
              achievements: data.achievements ?? [],
              craftRecipes: data.craftRecipes ?? [],
              shopItems: data.shopItems ?? [],
              inventory: data.inventory ?? [],
              settings: { ...DEFAULT_SETTINGS, ...data.settings },
              stats: data.stats ?? get().stats,
            })
            return true
          } catch {
            return false
          }
        },

        resetProgress: () => {
          const defaultProfile = createDefaultProfile('Моя жизнь')
          set({
            profiles: [defaultProfile],
            activeProfileId: defaultProfile.id,
            taskGroups: [],
            tasks: [],
            habits: [],
            achievements: [],
            craftRecipes: [],
            inventory: [],
            stats: {
              totalTasksCompleted: 0,
              totalHabitsPositive: 0,
              totalHabitsNegative: 0,
              totalCoinsEarned: 0,
              totalItemsCrafted: 0,
              currentStreak: 0,
              bestStreak: 0,
              lastActiveDate: 0,
            },
          })
        },
      }
    },
    {
      name: 'rpg-life-store-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        profiles: s.profiles,
        activeProfileId: s.activeProfileId,
        taskGroups: s.taskGroups,
        tasks: s.tasks,
        habits: s.habits,
        achievements: s.achievements,
        craftRecipes: s.craftRecipes,
        shopItems: s.shopItems,
        inventory: s.inventory,
        settings: s.settings,
        stats: s.stats,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (!state.taskGroups) useRpgStore.setState({ taskGroups: [] })
        if (!state.tasks) useRpgStore.setState({ tasks: [] })
        if (state.tasks?.length && state.tasks.some((t: TaskRpg) => t.groupId === undefined || t.deadlineAt === undefined)) {
          useRpgStore.setState({
            tasks: state.tasks.map((t: TaskRpg) => ({
              ...t,
              groupId: t.groupId ?? null,
              deadlineAt: t.deadlineAt ?? null,
            })),
          })
        }
        const profiles = state.profiles ?? []
        if (profiles.length === 0 && !storeInitialized) {
          storeInitialized = true
          const defaultProfile = createDefaultProfile('Моя жизнь')
          useRpgStore.setState({
            profiles: [defaultProfile],
            activeProfileId: defaultProfile.id,
            taskGroups: useRpgStore.getState().taskGroups ?? [],
          })
        } else if (profiles.length > 0 && !state.activeProfileId) {
          useRpgStore.setState({ activeProfileId: profiles[0].id })
        }
        storeInitialized = true
      },
    }
  )
)
