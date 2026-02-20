import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { isSameDay, getStartOfDay, getStartOfWeek, getStartOfMonth, getStartOfYear } from '../lib/dateUtils'
import { getCurrentCycleStart as calcCycleStart, getCycleEndDate, getSubtaskXp } from '../lib/taskCycleUtils'
import type {
  TaskRpg,
  TaskId,
  TaskGroup,
  TaskGroupId,
  ItemGroup,
  ItemGroupId,
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
  PurchaseHistoryEntry,
  AppSettings,
  CurrencyId,
  TaskCompletionRecord,
  CompletedSubtaskRecord,
  TaskArchiveReason,
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

// Removed DEFAULT_PENALTY_FACTOR - penalty system removed
const EMPTY_ATTRIBUTES: Attribute[] = []

/** Module-level debug offset kept in sync with the store via subscribe (see bottom of file) */
let _debugDaysOffset = 0
const DAY_MS_STORE = 24 * 60 * 60 * 1000

function now() {
  return Date.now() + _debugDaysOffset * DAY_MS_STORE
}

function getTodayStart(): number {
  const d = new Date(now())
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function getDateKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Начало следующего календарного дня после ts (полночь следующего дня) */
function getNextDayStart(ts: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const MULTIPLIER_BY_LEVEL: Record<string, number> = { easy: 1.25, medium: 1.75, hard: 2.5 }

/** Эффективный множитель награды: streak >= 3 и streak >= interval, иначе 1 */
function getHabitEffectiveMultiplier(habit: Habit, streakAfterAction: number): number {
  if (!habit.difficultyMultiplierEnabled || streakAfterAction < 3) return 1
  const interval = habit.multiplierIntervalDays ?? 3
  if (streakAfterAction < interval) return 1
  const level = habit.difficultyMultiplierLevel ?? 'easy'
  return level === 'custom' ? (habit.difficultyMultiplierCustom ?? 1.5) : (MULTIPLIER_BY_LEVEL[level] ?? 1)
}

function applyMultiplierCeil(value: number, mult: number, applies: boolean): number {
  if (!applies || mult <= 1) return value
  return Math.ceil(value * mult)
}

/** Проверка: достигла ли задача лимита выполнений */
function isTaskRecurrenceCompleted(task: TaskRpg): boolean {
  const settings = task.recurrenceSettings
  if (!settings) return false

  // Если режим "всегда" — задача никогда не завершается
  if (settings.endMode === 'never') return false

  // Проверка по дате окончания
  if (settings.endMode === 'byDate' && settings.endDate) {
    return now() >= settings.endDate
  }

  // Проверка по количеству циклов
  if (settings.endMode === 'byCount' && settings.endCount) {
    const completed = settings.completedCount ?? 0
    return completed >= settings.endCount
  }

  return false
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
    let debt = xpDeduct - current_xp
    if (debt <= 0) {
      // Enough XP in current level — just subtract
      return { ...attr, current_xp: current_xp - xpDeduct }
    }
    // current_xp exhausted, need to go down levels
    current_xp = 0
    while (level > 1 && debt > 0) {
      level -= 1
      const prevRequired = xpRequiredForNextLevel(profile, level)
      if (debt >= prevRequired) {
        debt -= prevRequired
        // current_xp stays 0, continue dropping levels
      } else {
        current_xp = prevRequired - debt
        debt = 0
      }
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
  itemGroups: ItemGroup[]
  tasks: TaskRpg[]
  habits: Habit[]
  achievements: Achievement[]
  craftRecipes: CraftRecipe[]
  shopItems: ShopItem[]
  inventory: InventoryEntry[]
  /** История покупок в магазине (по профилям) */
  purchaseHistory: PurchaseHistoryEntry[]
  /** Активная скидка в магазине в % (только на монеты), сбрасывается после одной покупки */
  activeShopDiscountPercent: number | null
  settings: AppSettings

  // Debug mode (для тестирования циклов)
  debugDaysOffset: number

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
  reorderTaskGroups: (orderedIds: TaskGroupId[]) => void

  // Item group actions (shop)
  getItemGroups: () => ItemGroup[]
  addItemGroup: (name: string) => ItemGroup
  updateItemGroup: (id: ItemGroupId, updater: (g: ItemGroup) => ItemGroup) => void
  deleteItemGroup: (id: ItemGroupId) => void
  reorderItemGroups: (orderedIds: ItemGroupId[]) => void

  // Task actions
  getTasks: () => TaskRpg[]
  addTask: (task: Omit<TaskRpg, 'id' | 'createdAt' | 'updatedAt' | 'profileId'>) => TaskRpg
  updateTask: (id: TaskId, updater: (t: TaskRpg) => TaskRpg) => void
  deleteTask: (id: TaskId) => void
  completeTask: (id: TaskId) => void
  canCompleteTask: (task: TaskRpg) => boolean
  skipTask: (id: TaskId) => void

  archiveTask: (id: TaskId) => void
  resetRecurringTasks: () => void
  incrementCounter: (id: TaskId) => void

  // Debug methods
  incrementDebugDay: () => void
  resetDebugTime: () => void
  getDebugNow: () => number
  decrementCounter: (id: TaskId) => void
  toggleSubtask: (taskId: TaskId, subtaskId: string) => void
  getTaskRewardPreview: (task: TaskRpg) => { xp: number; coins: number; gems: number }
  getTaskPenaltyPreview: (task: TaskRpg) => { xp: number; coins: number }

  // Habit actions
  getHabits: () => Habit[]
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'profileId' | 'todayPositive' | 'todayNegative' | 'lastResetDate' | 'streak' | 'totalPositive' | 'totalNegative'>) => Habit
  updateHabit: (id: HabitId, updater: (h: Habit) => Habit) => void
  deleteHabit: (id: HabitId) => void
  clickHabitPositive: (id: HabitId, asNextDay?: boolean) => void
  clickHabitNegative: (id: HabitId, asNextDay?: boolean) => void
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
  tryRandomFragmentDrop: (taskId?: TaskId) => void

  // Shop actions
  getShopItems: () => ShopItem[]
  addShopItem: (item: Omit<ShopItem, 'id'>) => ShopItem
  updateShopItem: (id: ItemId, updater: (i: ShopItem) => ShopItem) => void
  deleteShopItem: (id: ItemId) => void
  purchaseItem: (itemId: ItemId) => boolean | { loot: { itemId: string; name: string } | null }
  openLootbox: (itemId: ItemId) => { itemId: string; name: string } | null
  purchaseGameTime: (itemId: ItemId, packageId: string) => boolean
  purchaseEpisode: (itemId: ItemId, seasonId: string, episodeId: string) => boolean

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
        itemGroups: [],
        tasks: [],
        habits: [],
        achievements: [],
        craftRecipes: [],
        shopItems: [],
        inventory: [],
        purchaseHistory: [],
        activeShopDiscountPercent: null,
        settings: { ...DEFAULT_SETTINGS },
        debugDaysOffset: 0,
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

        reorderTaskGroups: (orderedIds) => {
          const { taskGroups, activeProfileId } = get()
          if (!activeProfileId) return
          const idSet = new Set(orderedIds)
          const reordered = orderedIds
            .map((id, index) => {
              const g = taskGroups.find((g) => g.id === id && g.profileId === activeProfileId)
              return g ? { ...g, sortOrder: index, updatedAt: now() } : null
            })
            .filter((g): g is TaskGroup => g != null)
          const rest = taskGroups.filter((g) => g.profileId === activeProfileId && !idSet.has(g.id))
          const maxSo = reordered.length - 1
          rest.forEach((g, i) => reordered.push({ ...g, sortOrder: maxSo + 1 + i, updatedAt: now() }))
          set((s) => ({
            taskGroups: s.taskGroups.filter((g) => g.profileId !== activeProfileId).concat(reordered),
          }))
        },

        // ─── Item groups (shop) ─────────────────────────────────────────────
        getItemGroups: () => {
          const { itemGroups, activeProfileId } = get()
          return activeProfileId
            ? itemGroups
                .filter((g) => g.profileId === activeProfileId)
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
            : []
        },

        addItemGroup: (name) => {
          const profile = get().getActiveProfile()
          if (!profile) throw new Error('No active profile')
          const groups = get().getItemGroups()
          const sortOrder =
            groups.length === 0 ? 0 : Math.max(...groups.map((g) => g.sortOrder), 0) + 1
          const newGroup: ItemGroup = {
            id: crypto.randomUUID(),
            profileId: profile.id,
            name: name.trim(),
            color: '#22c55e',
            sortOrder,
            createdAt: now(),
            updatedAt: now(),
          }
          set((s) => ({ itemGroups: [...s.itemGroups, newGroup] }))
          return newGroup
        },

        updateItemGroup: (id, updater) => {
          set((s) => ({
            itemGroups: s.itemGroups.map((g) =>
              g.id === id ? { ...updater(g), updatedAt: now() } : g
            ),
          }))
        },

        deleteItemGroup: (id) => {
          set((s) => ({
            itemGroups: s.itemGroups.filter((g) => g.id !== id),
            shopItems: s.shopItems.map((i) =>
              i.groupId === id ? { ...i, groupId: null } : i
            ),
          }))
        },

        reorderItemGroups: (orderedIds) => {
          const { itemGroups, activeProfileId } = get()
          if (!activeProfileId) return
          const idSet = new Set(orderedIds)
          const reordered = orderedIds
            .map((id, index) => {
              const g = itemGroups.find((g) => g.id === id && g.profileId === activeProfileId)
              return g ? { ...g, sortOrder: index, updatedAt: now() } : null
            })
            .filter((g): g is ItemGroup => g != null)
          const rest = itemGroups.filter((g) => g.profileId === activeProfileId && !idSet.has(g.id))
          const maxSo = reordered.length - 1
          rest.forEach((g, i) => reordered.push({ ...g, sortOrder: maxSo + 1 + i, updatedAt: now() }))
          set((s) => ({
            itemGroups: s.itemGroups.filter((g) => g.profileId !== activeProfileId).concat(reordered),
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
            gemReward: task.gemReward ?? 0,
            attributeIds: task.attributeIds ?? (task.attributeId ? [task.attributeId] : []),
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
          const { settings } = get()
          // Если атрибуты не выбраны, XP = 0
          const attrIds = task.attributeIds?.length ? task.attributeIds : (task.attributeId ? [task.attributeId] : [])
          const xp = attrIds.length > 0
            ? (task.customXp ?? settings.taskDifficultyXp?.[task.difficulty] ?? TASK_XP_BY_DIFFICULTY[task.difficulty])
            : 0
          const coins = task.coinReward
          const gems = task.gemReward ?? 0
          return { xp, coins, gems }
        },

        getTaskPenaltyPreview: (task) => {
          // Penalty system removed
          return { xp: 0, coins: 0 }
        },

        canCompleteTask: (task) => {
          if (task.isCompleted) return false

          // Проверка: если задача достигла даты окончания повтора — завершить нельзя
          if (task.recurrenceSettings?.endMode === 'byDate' && task.recurrenceSettings.endDate) {
            if (now() >= task.recurrenceSettings.endDate) return false
          }

          // Проверка: если задача достигла лимита по количеству — завершить нельзя
          if (task.recurrenceSettings?.endMode === 'byCount' && task.recurrenceSettings.endCount) {
            const completed = task.recurrenceSettings.completedCount ?? 0
            if (completed >= task.recurrenceSettings.endCount) return false
          }

          // Проверка: для timesPerWeek — исчерпаны ли выполнения на этой неделе
          if (task.recurrenceSettings?.weeklyMode === 'timesPerWeek' && task.recurrenceSettings.weeklyTimesPerWeek) {
            const done = task.recurrenceSettings.weeklyCompletedThisWeek ?? 0
            if (done >= task.recurrenceSettings.weeklyTimesPerWeek) return false
          }

          // Проверка: для weekly по дням — сегодня должен быть один из выбранных дней
          if (task.recurrence === 'weekly' && (task.recurrenceSettings?.weeklyMode ?? 'days') === 'days') {
            const weeklyDays = task.recurrenceSettings?.weeklyDays
            if (weeklyDays && weeklyDays.length > 0) {
              const today = new Date(now()).getDay()
              if (!weeklyDays.includes(today)) return false
            }
          }

          // For counter tasks, can only complete when current >= target
          if (task.kind === 'counter' && task.current < task.target) return false
          return true
        },

        completeTask: (id) => {
          const { tasks, getActiveProfile, updateTask, updateProfile, tryRandomFragmentDrop, checkAchievements, canCompleteTask, settings } = get()
          const task = tasks.find((t) => t.id === id)
          const profile = getActiveProfile()
          if (!task || !profile) return
          if (!canCompleteTask(task)) return

          // Add XP to all selected attributes
          const attrIds = task.attributeIds?.length ? task.attributeIds : (task.attributeId ? [task.attributeId] : [])
          // XP начисляется только если есть атрибуты
          const xpGain = attrIds.length > 0
            ? (task.customXp ?? settings.taskDifficultyXp?.[task.difficulty] ?? TASK_XP_BY_DIFFICULTY[task.difficulty])
            : 0
          const coinGain = task.coinReward
          const gemGain = task.gemReward ?? 0

          if (attrIds.length > 0 && xpGain > 0) {
            let currentAttrs = profile.attributes
            for (const attrId of attrIds) {
              const tempProfile = { ...profile, attributes: currentAttrs }
              currentAttrs = addXpToAttribute(tempProfile, attrId, xpGain)
            }
            updateProfile(profile.id, (p) => ({ ...p, attributes: currentAttrs }))
          }

          // Add coins
          get().addCurrency(CURRENCY_IDS.COINS, coinGain)

          // Add gems
          if (gemGain > 0) {
            get().addCurrency(CURRENCY_IDS.GEMS, gemGain)
          }

          // Show coin animation
          if (typeof window !== 'undefined' && coinGain > 0) {
            import('../components/RewardNotifications').then(({ showReward }) => {
              showReward('coins', coinGain)
            })
          }

          // Show gem animation
          if (typeof window !== 'undefined' && gemGain > 0) {
            import('../components/RewardNotifications').then(({ showReward }) => {
              showReward('gems', gemGain)
            })
          }

          // Проверка: достигла ли задача лимита повторов
          const isRecurrenceCompleted = isTaskRecurrenceCompleted(task)

          // Собираем все подзадачи для записи в историю (и выполненные, и нет)
          const completedSubtasks: CompletedSubtaskRecord[] | undefined =
            task.kind === 'nested' && task.subtasks.length > 0
              ? task.subtasks.map(s => {
                  const subXp = s.isCompleted ? getSubtaskXp(s, task, settings) : 0
                  return {
                    id: s.id,
                    title: s.title,
                    isCompleted: s.isCompleted,
                    coinReward: s.isCompleted ? s.coinReward : undefined,
                    gemReward: s.isCompleted ? s.gemReward : undefined,
                    xpEarned: subXp > 0 ? subXp : undefined,
                  }
                })
              : undefined

          // Instant recurrence: награды выданы — сбрасываем задачу для повторного выполнения
          // Награды за подзадачи НЕ забираются — игрок их заработал
          if (task.recurrence === 'instant') {
            updateStats((s) => ({ totalTasksCompleted: s.totalTasksCompleted + 1 }))
            tryRandomFragmentDrop(task.id)
            checkAchievements()

            // Увеличиваем счетчик выполнений для byCount
            const newCompletedCount = (task.recurrenceSettings?.completedCount ?? 0) + 1
            const updatedSettings = task.recurrenceSettings
              ? { ...task.recurrenceSettings, completedCount: newCompletedCount }
              : undefined

            // Запись в историю
            const completionRecord: TaskCompletionRecord = {
              id: crypto.randomUUID(),
              cycleStart: calcCycleStart(task, now()),
              cycleEnd: now(),
              completedAt: now(),
              status: 'completed',
              xpEarned: xpGain,
              coinsEarned: coinGain,
              gemsEarned: gemGain,
              completedSubtasks,
            }
            const newStreak = (task.currentStreak ?? 0) + 1
            const historyFields = {
              completionHistory: [...(task.completionHistory ?? []), completionRecord].slice(-365),
              currentStreak: newStreak,
              bestStreak: Math.max(task.bestStreak ?? 0, newStreak),
            }

            // Если лимит достигнут — помечаем задачу как завершенную и архивируем
            if (isRecurrenceCompleted || (updatedSettings && updatedSettings.endMode === 'byCount' && updatedSettings.endCount && newCompletedCount >= updatedSettings.endCount)) {
              updateTask(id, (t) => ({ ...t, isCompleted: true, completedAt: now(), canceledAt: now(), archiveReason: 'completed' as TaskArchiveReason, recurrenceSettings: updatedSettings, ...historyFields }))
              return
            }

            // Иначе сбрасываем для повторного выполнения
            if (task.kind === 'nested') {
              // Для nested задач сбрасываем основную задачу и все подзадачи в одном обновлении
              updateTask(id, (t) => {
                if (t.kind !== 'nested') return t
                const resetSubtasks = t.subtasks.map(s => ({
                  ...s,
                  isCompleted: false,
                  completedAt: undefined
                }))
                return {
                  ...t,
                  recurrenceSettings: updatedSettings,
                  isCompleted: false,
                  completedAt: undefined,
                  subtasks: resetSubtasks,
                  currentCycleStart: now(),
                  ...historyFields
                }
              })
            } else {
              // Для checkbox и counter задач
              updateTask(id, (t) => {
                const base = { recurrenceSettings: updatedSettings, currentCycleStart: now(), ...historyFields }
                if (t.kind === 'checkbox') return { ...t, ...base, isCompleted: false, completedAt: undefined }
                if (t.kind === 'counter') return { ...t, ...base, isCompleted: false, current: 0, completedAt: undefined }
                return { ...t, ...base }
              })
            }
            return
          }

          // Recurring tasks (daily/weekly/monthly/yearly): сохраняем lastCompletedAt, сбрасываем подзадачи
          if (task.recurrence === 'daily' || task.recurrence === 'weekly' ||
              task.recurrence === 'monthly' || task.recurrence === 'yearly' || task.recurrence === 'custom') {
            updateStats((s) => ({ totalTasksCompleted: s.totalTasksCompleted + 1 }))
            tryRandomFragmentDrop(task.id)
            checkAchievements()

            // Увеличиваем счетчик выполнений для byCount
            const newCompletedCount = (task.recurrenceSettings?.completedCount ?? 0) + 1
            const updatedSettings = task.recurrenceSettings
              ? { ...task.recurrenceSettings, completedCount: newCompletedCount }
              : undefined

            // Запись в историю
            const completionRecord: TaskCompletionRecord = {
              id: crypto.randomUUID(),
              cycleStart: calcCycleStart(task, now()),
              cycleEnd: getCycleEndDate(task, now()) ?? now(),
              completedAt: now(),
              status: 'completed',
              xpEarned: xpGain,
              coinsEarned: coinGain,
              gemsEarned: gemGain,
              completedSubtasks,
            }
            const newStreak = (task.currentStreak ?? 0) + 1
            const historyFields = {
              completionHistory: [...(task.completionHistory ?? []), completionRecord].slice(-365),
              currentStreak: newStreak,
              bestStreak: Math.max(task.bestStreak ?? 0, newStreak),
            }

            // Для timesPerWeek — обновляем weeklyCompletedThisWeek в settings перед проверкой лимита
            if (updatedSettings?.weeklyMode === 'timesPerWeek' && updatedSettings.weeklyTimesPerWeek) {
              const currentWeekStart = getStartOfWeek(now())
              const prevDone = updatedSettings.weeklyCompletedThisWeek ?? 0
              const newDone = (updatedSettings.weeklyWeekStart === currentWeekStart)
                ? prevDone + 1
                : 1
              updatedSettings.weeklyCompletedThisWeek = newDone
              updatedSettings.weeklyWeekStart = currentWeekStart
            }

            // Если лимит достигнут — помечаем задачу как завершенную и архивируем
            if (isRecurrenceCompleted || (updatedSettings && updatedSettings.endMode === 'byCount' && updatedSettings.endCount && newCompletedCount >= updatedSettings.endCount)) {
              updateTask(id, (t) => ({ ...t, isCompleted: true, completedAt: now(), canceledAt: now(), archiveReason: 'completed' as TaskArchiveReason, lastCompletedAt: now(), recurrenceSettings: updatedSettings, ...historyFields }))
              return
            }

            // Режим «N раз в неделю»: помечаем isCompleted только если все разы использованы
            // weeklyCompletedThisWeek уже обновлён в updatedSettings выше
            if (updatedSettings?.weeklyMode === 'timesPerWeek' && updatedSettings.weeklyTimesPerWeek) {
              const allDone = (updatedSettings.weeklyCompletedThisWeek ?? 0) >= updatedSettings.weeklyTimesPerWeek

              updateTask(id, (t) => ({
                ...t,
                isCompleted: allDone,
                completedAt: allDone ? now() : undefined,
                lastCompletedAt: now(),
                recurrenceSettings: updatedSettings,
                ...historyFields,
                // Для nested — сбрасываем подзадачи после каждого выполнения
                ...(t.kind === 'nested' ? {
                  subtasks: t.subtasks.map(s => ({ ...s, isCompleted: false, completedAt: undefined }))
                } : {}),
                // Для counter — сбрасываем прогресс после каждого выполнения (если не все разы использованы)
                ...(t.kind === 'counter' && !allDone ? { current: 0 } : {}),
              }))
              return
            }

            // Обычное выполнение recurring задачи
            updateTask(id, (t) => ({
              ...t,
              isCompleted: true,
              completedAt: now(),
              lastCompletedAt: now(),
              recurrenceSettings: updatedSettings,
              ...historyFields,
              ...(t.kind === 'nested' ? {
                subtasks: t.subtasks.map(s => ({ ...s, isCompleted: false, completedAt: undefined }))
              } : {})
            }))
            return
          }

          // Mark completed — once-задача завершена окончательно, архивируем
          // Запись в историю для once-задач (чтобы блок «История» не был пустым)
          const onceRecord: TaskCompletionRecord = {
            id: crypto.randomUUID(),
            cycleStart: task.currentCycleStart ?? task.createdAt,
            cycleEnd: now(),
            completedAt: now(),
            status: 'completed',
            xpEarned: xpGain,
            coinsEarned: coinGain,
            gemsEarned: gemGain,
            completedSubtasks,
          }
          const onceHistoryFields = {
            completionHistory: [...(task.completionHistory ?? []), onceRecord],
          }

          updateTask(id, (t) => {
            const archiveFields = { isCompleted: true, completedAt: now(), canceledAt: now(), archiveReason: 'completed' as TaskArchiveReason, ...onceHistoryFields }
            if (t.kind === 'checkbox') return { ...t, ...archiveFields }
            if (t.kind === 'counter') return { ...t, ...archiveFields, current: t.target }
            if (t.kind === 'nested') return { ...t, ...archiveFields }
            return t
          })

          updateStats((s) => ({ totalTasksCompleted: s.totalTasksCompleted + 1 }))
          tryRandomFragmentDrop(task.id)
          checkAchievements()
        },

        skipTask: (id) => {
          const task = get().tasks.find((t) => t.id === id)
          if (!task) return
          if (!get().canCompleteTask(task)) return

          // Запись пропуска в историю
          const skipRecord: TaskCompletionRecord = {
            id: crypto.randomUUID(),
            cycleStart: task.recurrence === 'once' ? (task.currentCycleStart ?? task.createdAt) : calcCycleStart(task, now()),
            cycleEnd: task.recurrence === 'once' ? now() : (getCycleEndDate(task, now()) ?? now()),
            completedAt: now(),
            status: 'skipped',
          }
          const skipHistoryFields = {
            completionHistory: [...(task.completionHistory ?? []), skipRecord].slice(-365),
            currentStreak: 0,
            totalSkipped: (task.totalSkipped ?? 0) + 1,
          }

          // Для instant — сбрасываем задачу (без наград), чтобы можно было выполнить снова
          if (task.recurrence === 'instant') {
            get().updateTask(id, (t) => {
              const base = { ...skipHistoryFields, currentCycleStart: now() }
              if (t.kind === 'checkbox') return { ...t, ...base, isCompleted: false, completedAt: undefined }
              if (t.kind === 'counter') return { ...t, ...base, isCompleted: false, current: 0, completedAt: undefined }
              if (t.kind === 'nested') {
                const resetSubtasks = t.subtasks.map(s => ({ ...s, isCompleted: false, completedAt: undefined }))
                return { ...t, ...base, isCompleted: false, completedAt: undefined, subtasks: resetSubtasks }
              }
              return t
            })
            return
          }

          // Для once-задач: пропуск = провал, архивация с причиной 'failed'
          const isOnce = task.recurrence === 'once'
          const archiveFields = isOnce ? { canceledAt: now(), archiveReason: 'failed' as TaskArchiveReason } : {}

          get().updateTask(id, (t) => {
            if (isOnce) {
              // Once-задача провалена — НЕ помечаем как выполненную
              if (t.kind === 'checkbox') return { ...t, ...skipHistoryFields, ...archiveFields }
              if (t.kind === 'counter') return { ...t, ...skipHistoryFields, ...archiveFields }
              if (t.kind === 'nested') return { ...t, ...skipHistoryFields, ...archiveFields }
              return t
            }
            // Recurring-задача — помечаем isCompleted для сброса цикла
            if (t.kind === 'checkbox') return { ...t, ...skipHistoryFields, isCompleted: true, completedAt: now() }
            if (t.kind === 'counter') return { ...t, ...skipHistoryFields, isCompleted: true, current: t.target, completedAt: now() }
            if (t.kind === 'nested') return { ...t, ...skipHistoryFields, isCompleted: true, completedAt: now() }
            return t
          })
        },


        archiveTask: (id) => {
          const { updateTask } = get()
          // Move task to "Отмененные" with canceledAt timestamp — ручная архивация
          updateTask(id, (t) => ({ ...t, canceledAt: now(), archiveReason: 'manual' as TaskArchiveReason, updatedAt: now() }))
        },

        resetRecurringTasks: () => {
          const { tasks, updateTask } = get()
          const nowTime = now()

          tasks.forEach(task => {
            if (task.archived) return

            const rs = task.recurrenceSettings
            const endDate = rs?.endMode === 'byDate' ? rs.endDate : null

            // === Обработка пропущенных задач с крайним сроком ===

            // Тип «once» с endDate: если дата прошла и не выполнена — архивируем как «Проваленная»
            if (task.recurrence === 'once' && endDate && nowTime >= endDate && !task.isCompleted && !task.canceledAt) {
              const missedRecord: TaskCompletionRecord = {
                id: crypto.randomUUID(),
                cycleStart: task.createdAt,
                cycleEnd: endDate,
                status: 'missed',
              }
              updateTask(task.id, t => ({
                ...t,
                canceledAt: nowTime,
                archiveReason: 'failed' as TaskArchiveReason,
                currentStreak: 0,
                totalSkipped: (t.totalSkipped ?? 0) + 1,
                completionHistory: [...(t.completionHistory ?? []), missedRecord].slice(-365),
              }))
              return
            }

            // Recurring (daily/weekly/monthly/yearly/custom) с endDate: если endDate прошла — архивируем
            if (task.recurrence !== 'once' && task.recurrence !== 'instant' && endDate && nowTime >= endDate && !task.canceledAt) {
              // Записываем пропуск последнего цикла, если не выполнена
              const missedFields = !task.isCompleted ? {
                currentStreak: 0,
                totalSkipped: (task.totalSkipped ?? 0) + 1,
                completionHistory: [...(task.completionHistory ?? []), {
                  id: crypto.randomUUID(),
                  cycleStart: task.currentCycleStart ?? nowTime,
                  cycleEnd: endDate,
                  status: 'missed' as const,
                }].slice(-365),
              } : {}
              // Определяем причину архивации:
              // - completed: все циклы выполнены (byCount и completedCount >= endCount, или задача выполнена в последнем цикле)
              // - expired: срок истёк, но часть циклов была выполнена
              // - failed: ни одного выполненного цикла
              const completedCount = task.recurrenceSettings?.completedCount ?? 0
              const endCount = task.recurrenceSettings?.endCount
              const hasAnyCompletion = (task.completionHistory ?? []).some(r => r.status === 'completed') || completedCount > 0
              const allCyclesDone = endCount ? completedCount >= endCount : task.isCompleted
              const reason: TaskArchiveReason = allCyclesDone ? 'completed' : hasAnyCompletion ? 'expired' : 'failed'
              updateTask(task.id, t => ({
                ...t,
                canceledAt: nowTime,
                archiveReason: reason,
                ...missedFields,
              }))
              return
            }

            // Recurring: пропущенный цикл без endDate (или endDate еще не наступила)
            // Если задача не выполнена и цикл закончился — записать «missed» и перейти к следующему
            if (task.recurrence !== 'once' && task.recurrence !== 'instant' && !task.isCompleted && !task.canceledAt) {
              const cycleEnd = getCycleEndDate(task, now())
              if (cycleEnd && nowTime > cycleEnd) {
                // Цикл закончился, а задача не выполнена — «Пропущено»
                const missedRecord: TaskCompletionRecord = {
                  id: crypto.randomUUID(),
                  cycleStart: task.currentCycleStart ?? calcCycleStart(task, now()),
                  cycleEnd: cycleEnd,
                  status: 'missed',
                }
                updateTask(task.id, t => ({
                  ...t,
                  currentStreak: 0,
                  totalSkipped: (t.totalSkipped ?? 0) + 1,
                  completionHistory: [...(t.completionHistory ?? []), missedRecord].slice(-365),
                  currentCycleStart: nowTime,
                  lastCompletedAt: undefined,
                  ...(t.kind === 'counter' ? { current: 0 } : {}),
                  ...(t.kind === 'nested' ? {
                    subtasks: t.subtasks.map(s => ({ ...s, isCompleted: false, completedAt: undefined }))
                  } : {}),
                  // Сброс счётчика «раз в неделю»
                  ...(t.recurrenceSettings?.weeklyMode === 'timesPerWeek' ? {
                    recurrenceSettings: {
                      ...t.recurrenceSettings,
                      weeklyCompletedThisWeek: 0,
                      weeklyWeekStart: getStartOfWeek(nowTime),
                    }
                  } : {}),
                }))
                return
              }
            }

            if (!task.lastCompletedAt || !task.isCompleted) return

            const shouldReset = (() => {
              switch (task.recurrence) {
                case 'daily':
                  // Сбросить если не сегодня
                  return !isSameDay(task.lastCompletedAt, nowTime)

                case 'weekly': {
                  const rsTask = task.recurrenceSettings
                  // Режим «N раз в неделю» — сбросить, если наступила новая неделя
                  if (rsTask?.weeklyMode === 'timesPerWeek') {
                    const weekStart = rsTask.weeklyWeekStart ?? 0
                    const currentWeek = getStartOfWeek(nowTime)
                    return weekStart !== currentWeek
                  }

                  // Вариант В: Задача сбрасывается только когда наступил следующий день из weeklyDays
                  const weeklyDays = rsTask?.weeklyDays
                  if (weeklyDays && weeklyDays.length > 0) {
                    if (!task.lastCompletedAt) return false

                    // Вычисляем следующий запланированный день от даты последнего выполнения
                    const completedDay = new Date(task.lastCompletedAt).getDay()
                    const sorted = [...weeklyDays].sort((a, b) => a - b)
                    const nextDay = sorted.find(d => d > completedDay)
                    let daysUntilNext: number
                    if (nextDay != null) {
                      daysUntilNext = nextDay - completedDay
                    } else {
                      // Первый день на следующей неделе
                      daysUntilNext = (7 - completedDay + sorted[0]) % 7 || 7
                    }
                    const nextScheduledDate = getStartOfDay(task.lastCompletedAt) + daysUntilNext * 24 * 60 * 60 * 1000
                    return nowTime >= nextScheduledDate
                  }
                  // Иначе стандартная логика: сбросить если новая неделя
                  const lastWeek = getStartOfWeek(task.lastCompletedAt)
                  const currentWeek = getStartOfWeek(nowTime)
                  return lastWeek !== currentWeek
                }

                case 'monthly': {
                  // Сбросить если новый месяц
                  const lastMonth = getStartOfMonth(task.lastCompletedAt)
                  const currentMonth = getStartOfMonth(nowTime)
                  return lastMonth !== currentMonth
                }

                case 'yearly': {
                  // Сбросить если новый год
                  const lastYear = getStartOfYear(task.lastCompletedAt)
                  const currentYear = getStartOfYear(nowTime)
                  return lastYear !== currentYear
                }

                case 'custom': {
                  // Кастомный интервал в днях
                  const intervalDays = task.recurrenceSettings?.customIntervalDays ?? task.recurrenceIntervalDays ?? 1
                  const daysSinceCompletion = Math.floor((nowTime - task.lastCompletedAt) / (1000 * 60 * 60 * 24))
                  return daysSinceCompletion >= intervalDays
                }

                default:
                  return false
              }
            })()

            // Не сбрасываем задачу, если достигнут лимит по дате или количеству
            if (shouldReset && !isTaskRecurrenceCompleted(task)) {
              updateTask(task.id, t => ({
                ...t,
                isCompleted: false,
                completedAt: undefined,
                lastCompletedAt: undefined,
                currentCycleStart: nowTime,
                ...(t.kind === 'counter' ? { current: 0 } : {}),
                ...(t.kind === 'nested' ? {
                  subtasks: t.subtasks.map(s => ({ ...s, isCompleted: false, completedAt: undefined }))
                } : {}),
                // Сброс счётчика «раз в неделю» при смене недели
                ...(t.recurrenceSettings?.weeklyMode === 'timesPerWeek' ? {
                  recurrenceSettings: {
                    ...t.recurrenceSettings,
                    weeklyCompletedThisWeek: 0,
                    weeklyWeekStart: getStartOfWeek(nowTime),
                  }
                } : {}),
              }))
            }
          })
        },

        incrementCounter: (id) => {
          const { tasks } = get()
          const task = tasks.find((t) => t.id === id)
          if (!task || task.kind !== 'counter' || task.isCompleted) return

          const newCurrent = Math.min(task.target, task.current + 1)
          get().updateTask(id, (t) => t.kind === 'counter' ? { ...t, current: newCurrent } : t)
        },

        decrementCounter: (id) => {
          const { tasks } = get()
          const task = tasks.find((t) => t.id === id)
          if (!task || task.kind !== 'counter') return
          
          const newCurrent = Math.max(0, task.current - 1)
          get().updateTask(id, (t) => t.kind === 'counter' ? { ...t, current: newCurrent, isCompleted: false } : t)
        },

        toggleSubtask: (taskId, subtaskId) => {
          const { tasks, getActiveProfile, updateProfile } = get()
          const task = tasks.find((t) => t.id === taskId)
          if (!task || task.kind !== 'nested') return

          const subtask = task.subtasks.find((s) => s.id === subtaskId)
          if (!subtask) return

          const wasCompleted = subtask.isCompleted
          const isNowCompleted = !wasCompleted

          const profile = getActiveProfile()
          const settings = get().settings
          if (profile) {
            const coinRwd = subtask.coinReward ?? 0
            const gemRwd = subtask.gemReward ?? 0
            const attrIds = task.attributeIds?.length ? task.attributeIds : (task.attributeId ? [task.attributeId] : [])
            const xpRwd = getSubtaskXp(subtask, task, settings)

            if (isNowCompleted) {
              // Award per-subtask rewards when toggling ON
              if (coinRwd > 0) get().addCurrency(CURRENCY_IDS.COINS, coinRwd)
              if (gemRwd > 0) get().addCurrency(CURRENCY_IDS.GEMS, gemRwd)
              if (xpRwd > 0 && attrIds.length > 0) {
                let currentAttrs = profile.attributes
                for (const attrId of attrIds) {
                  const tempProfile = { ...profile, attributes: currentAttrs }
                  currentAttrs = addXpToAttribute(tempProfile, attrId, xpRwd)
                }
                updateProfile(profile.id, (p) => ({ ...p, attributes: currentAttrs }))
              }
            } else {
              // Revoke per-subtask rewards when toggling OFF
              if (coinRwd > 0) get().deductCurrency(CURRENCY_IDS.COINS, coinRwd)
              if (gemRwd > 0) get().deductCurrency(CURRENCY_IDS.GEMS, gemRwd)
              if (xpRwd > 0 && attrIds.length > 0) {
                let currentAttrs = profile.attributes
                for (const attrId of attrIds) {
                  const tempProfile = { ...profile, attributes: currentAttrs }
                  currentAttrs = deductXpFromAttribute(tempProfile, attrId, xpRwd)
                }
                updateProfile(profile.id, (p) => ({ ...p, attributes: currentAttrs }))
              }
            }
          }

          // Просто обновляем статус подзадачи, без влияния на основную задачу
          const updatedSubtasks = task.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, isCompleted: isNowCompleted, completedAt: isNowCompleted ? now() : undefined } : s
          )

          get().updateTask(taskId, (t) => t.kind === 'nested' ? { ...t, subtasks: updatedSubtasks } : t)
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

        clickHabitPositive: (id, asNextDay = false) => {
          const { habits, getActiveProfile, updateProfile, checkAchievements, tryRandomFragmentDrop } = get()
          const habit = habits.find((h) => h.id === id)
          const profile = getActiveProfile()
          if (!habit || !profile || !habit.positiveEnabled) return

          const todayStart = asNextDay ? getNextDayStart(habit.lastResetDate) : getTodayStart()
          const isNewDay = habit.lastResetDate < todayStart
          // Один раз в день: если уже действовал сегодня — не обрабатывать (кроме экспериментального режима)
          if (!asNextDay && !isNewDay && (habit.todayPositive > 0 || habit.todayNegative > 0)) return

          const streakAfter = isNewDay ? habit.streak + 1 : habit.streak
          const mult = getHabitEffectiveMultiplier(habit, streakAfter)
          const appliesXp = habit.multiplierAppliesToXp !== false
          const appliesCoins = habit.multiplierAppliesToCoins !== false
          const appliesGems = habit.multiplierAppliesToGems !== false

          const xpGain = applyMultiplierCeil(habit.positiveXp, mult, appliesXp)
          const coinsGain = applyMultiplierCeil(habit.positiveCoins, mult, appliesCoins)
          const gemsGain = applyMultiplierCeil(habit.positiveGems ?? 0, mult, appliesGems)

          // Add XP to attribute
          if (habit.attributeId && xpGain > 0) {
            const nextAttributes = addXpToAttribute(profile, habit.attributeId, xpGain)
            updateProfile(profile.id, (p) => ({ ...p, attributes: nextAttributes }))
          }

          // Add coins
          if (coinsGain > 0) {
            get().addCurrency(CURRENCY_IDS.COINS, coinsGain)
          }

          // Add gems
          if ((habit.positiveGemsEnabled ?? false) && gemsGain > 0) {
            get().addCurrency(CURRENCY_IDS.GEMS, gemsGain)
          }

          const dateKey = getDateKey(todayStart)
          const dailyCompletion = { ...(habit.dailyCompletion ?? {}), [dateKey]: 'positive' as const }

          // Update habit
          get().updateHabit(id, (h) => ({
            ...h,
            dailyCompletion,
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

        clickHabitNegative: (id, asNextDay = false) => {
          const { habits, getActiveProfile, updateProfile } = get()
          const habit = habits.find((h) => h.id === id)
          const profile = getActiveProfile()
          if (!habit || !profile || !habit.negativeEnabled) return

          const todayStart = asNextDay ? getNextDayStart(habit.lastResetDate) : getTodayStart()
          const isNewDay = habit.lastResetDate < todayStart
          // Один раз в день: если уже действовал сегодня — не обрабатывать (кроме экспериментального режима)
          if (!asNextDay && !isNewDay && (habit.todayPositive > 0 || habit.todayNegative > 0)) return

          // Заморозка стрика: в период действия эффекта минус не сбрасывает streak
          const freezeFrom = profile.streakFreezeFrom ?? 0
          const freezeUntil = profile.streakFreezeUntil ?? 0
          const isInFreeze = freezeFrom > 0 && freezeUntil > 0 && todayStart >= freezeFrom && todayStart <= freezeUntil

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

          const dateKey = getDateKey(todayStart)
          const dailyCompletion = { ...(habit.dailyCompletion ?? {}), [dateKey]: 'negative' as const }

          // Update habit
          get().updateHabit(id, (h) => ({
            ...h,
            dailyCompletion,
            todayPositive: isNewDay ? 0 : h.todayPositive,
            todayNegative: isNewDay ? 1 : h.todayNegative + 1,
            lastResetDate: todayStart,
            totalNegative: h.totalNegative + 1,
            streak: isInFreeze ? h.streak : 0, // При заморозке стрик не сбрасывается
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
          const { craftRecipes, addToInventory, deductCurrency, getCurrency, checkAchievements } = get()
          const recipe = craftRecipes.find((r) => r.id === recipeId)
          if (!recipe || recipe.crafted || recipe.fragmentsCollected < recipe.fragmentsRequired) return false

          // Deduct craft cost if any
          const craftCost = (recipe as any).craftCost as Record<string, number> | undefined
          if (craftCost) {
            for (const [currId, amount] of Object.entries(craftCost)) {
              if (amount > 0 && getCurrency(currId) < amount) return false
            }
            for (const [currId, amount] of Object.entries(craftCost)) {
              if (amount > 0) deductCurrency(currId, amount)
            }
          }

          // Add item to inventory (only if resultItemId is set)
          if (recipe.resultItemId) {
            addToInventory(recipe.resultItemId)
          }

          // Mark as crafted
          get().updateCraftRecipe(recipeId, (r) => ({ ...r, crafted: true, craftedAt: now() }))

          // Update stats
          updateStats((s) => ({ totalItemsCrafted: s.totalItemsCrafted + 1 }))

          checkAchievements()
          return true
        },

        tryRandomFragmentDrop: (taskId?: string) => {
          const recipes = get().getCraftRecipes().filter((r) => !r.crafted)

          recipes.forEach((recipe) => {
            const fs = (recipe as any).fragmentSource as
              | { type?: string; dropChance?: number; linkedTaskIds?: string[]; streakRequired?: number }
              | undefined
            if (!fs || !fs.type) return

            const chance = typeof fs.dropChance === 'number' ? fs.dropChance / 100 : 0

            if (fs.type === 'random_drop' && chance > 0) {
              if (Math.random() < chance) {
                get().addFragment(recipe.id, 1)
              }
            }

            if (fs.type === 'task_linked' && chance > 0 && taskId) {
              const linked = fs.linkedTaskIds ?? []
              if (linked.includes(taskId)) {
                if (Math.random() < chance) {
                  get().addFragment(recipe.id, 1)
                }
              }
            }
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
          const { shopItems, deductCurrency, addToInventory, openLootbox, activeShopDiscountPercent, activeProfileId } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item) return false

          const coinCost = item.cost[CURRENCY_IDS.COINS] ?? 0
          const gemCost = item.cost[CURRENCY_IDS.GEMS] ?? 0
          const effectiveCoinCost =
            activeShopDiscountPercent != null && coinCost > 0
              ? Math.ceil(coinCost * (1 - activeShopDiscountPercent / 100))
              : coinCost
          const effectiveCosts = { ...item.cost, [CURRENCY_IDS.COINS]: effectiveCoinCost }

          for (const [currencyId, cost] of Object.entries(effectiveCosts)) {
            if (get().getCurrency(currencyId as CurrencyId) < cost) return false
          }

          for (const [currencyId, cost] of Object.entries(effectiveCosts)) {
            deductCurrency(currencyId as CurrencyId, cost)
          }

          set((s) => ({ activeShopDiscountPercent: null }))

          if (activeProfileId) {
            set((s) => ({
              purchaseHistory: [
                ...s.purchaseHistory,
                { profileId: activeProfileId, itemId: item.id, itemName: item.name, timestamp: now() },
              ].slice(-500),
            }))
          }

          if (item.isLootBox) {
            const loot = openLootbox(itemId)
            return { loot }
          }
          addToInventory(itemId)
          return true
        },

        openLootbox: (itemId) => {
          const { shopItems, addToInventory, addCurrency } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item || !item.isLootBox || !item.lootTable) return null

          const totalWeight = item.lootTable.reduce((sum, entry) => sum + entry.weight, 0)
          const random = Math.random() * 100 // 0..100; оставшиеся (100 - totalWeight)% — шанс ничего не выпасть
          if (random >= totalWeight) return null

          let r = random
          for (const entry of item.lootTable) {
            r -= entry.weight
            if (r < 0) {
              const qty = entry.quantity ?? 1
              if (entry.id === CURRENCY_IDS.COINS || entry.id === CURRENCY_IDS.GEMS) {
                addCurrency(entry.id as CurrencyId, qty)
              } else {
                addToInventory(entry.id, qty)
              }
              const resultItem = get().shopItems.find((i) => i.id === entry.id)
              return { itemId: entry.id, name: resultItem?.name ?? 'Награда' }
            }
          }

          return null
        },

        purchaseGameTime: (itemId, packageId) => {
          const { shopItems, deductCurrency, updateShopItem } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item || !item.isVideoGame || !item.gameTimePackages) return false

          const pkg = item.gameTimePackages.find((p) => p.id === packageId)
          if (!pkg) return false

          const coinBalance = get().getCurrency(CURRENCY_IDS.COINS)
          if (coinBalance < pkg.cost) return false

          deductCurrency(CURRENCY_IDS.COINS, pkg.cost)
          const addMinutes = Math.round(pkg.hours * 60)
          updateShopItem(itemId, (prev) => ({
            ...prev,
            gameTimeTotalMinutes: (prev.gameTimeTotalMinutes ?? 0) + addMinutes,
          }))
          return true
        },

        purchaseEpisode: (itemId, seasonId, episodeId) => {
          const { shopItems, deductCurrency, updateShopItem } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item || !item.isTvSerial || !item.serialSeasons) return false

          const season = item.serialSeasons.find((s) => s.id === seasonId)
          if (!season) return false

          const episode = season.episodes.find((e) => e.id === episodeId)
          if (!episode || episode.purchased) return false

          const coinBalance = get().getCurrency(CURRENCY_IDS.COINS)
          if (coinBalance < episode.cost) return false

          deductCurrency(CURRENCY_IDS.COINS, episode.cost)
          updateShopItem(itemId, (prev) => ({
            ...prev,
            serialSeasons: prev.serialSeasons?.map((s) =>
              s.id === seasonId
                ? { ...s, episodes: s.episodes.map((e) => e.id === episodeId ? { ...e, purchased: true } : e) }
                : s
            ),
          }))
          return true
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
          const { shopItems, getActiveProfile, updateProfile, removeFromInventory } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item) return false

          if (item.isDiscountVoucher && (item.discountPercent ?? 0) > 0) {
            const percent = Math.min(85, Math.max(1, item.discountPercent ?? 0))
            set((s) => ({ activeShopDiscountPercent: percent }))
            return removeFromInventory(itemId, 1)
          }

          // Streak multiplier effect is applied by the habits system when checking streaks
          return removeFromInventory(itemId, 1)
        },

        // ─── Debug Mode ───────────────────────────────────────────────────
        getDebugNow: () => {
          const offset = get().debugDaysOffset
          return Date.now() + offset * 24 * 60 * 60 * 1000
        },

        incrementDebugDay: () => {
          set((s) => ({ debugDaysOffset: s.debugDaysOffset + 1 }))
          // Сразу проверяем задачи на сброс
          get().resetRecurringTasks()
        },

        resetDebugTime: () => {
          set({ debugDaysOffset: 0 })
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
            itemGroups: state.itemGroups,
            tasks: state.tasks,
            habits: state.habits,
            achievements: state.achievements,
            craftRecipes: state.craftRecipes,
            shopItems: state.shopItems,
            inventory: state.inventory,
            activeShopDiscountPercent: state.activeShopDiscountPercent,
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
              itemGroups: data.itemGroups ?? [],
              tasks: (data.tasks ?? []).map((t: TaskRpg) => ({ ...t, groupId: t.groupId ?? null, deadlineAt: t.deadlineAt ?? null })),
              habits: data.habits ?? [],
              achievements: data.achievements ?? [],
              craftRecipes: data.craftRecipes ?? [],
              shopItems: data.shopItems ?? [],
              inventory: data.inventory ?? [],
              activeShopDiscountPercent: data.activeShopDiscountPercent ?? null,
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
            activeShopDiscountPercent: null,
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
        itemGroups: s.itemGroups,
        tasks: s.tasks,
        habits: s.habits,
        achievements: s.achievements,
        craftRecipes: s.craftRecipes,
        shopItems: s.shopItems,
        inventory: s.inventory,
        purchaseHistory: s.purchaseHistory,
        activeShopDiscountPercent: s.activeShopDiscountPercent,
        settings: s.settings,
        stats: s.stats,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (state.activeShopDiscountPercent === undefined) useRpgStore.setState({ activeShopDiscountPercent: null })
        if (!state.purchaseHistory) useRpgStore.setState({ purchaseHistory: [] })
        if (!state.taskGroups) useRpgStore.setState({ taskGroups: [] })
        if (!state.itemGroups) useRpgStore.setState({ itemGroups: [] })
        if (!state.tasks) useRpgStore.setState({ tasks: [] })

        // Migrate settings to add taskDifficultyXp if missing
        if (state.settings && !state.settings.taskDifficultyXp) {
          useRpgStore.setState({
            settings: {
              ...state.settings,
              taskDifficultyXp: {
                easy: 10,
                medium: 30,
                hard: 100,
                veryHard: 300,
              },
            },
          })
        }
        if (state.tasks?.length) {
          const needsMigration = state.tasks.some((t: any) =>
            t.groupId === undefined ||
            t.deadlineAt === undefined ||
            !t.attributeIds ||
            t.gemReward === undefined ||
            (t.canceledAt && !t.archiveReason) ||
            (t.isCompleted && !t.canceledAt && (t.recurrence === 'once' || !t.recurrence))
          )
          if (needsMigration) {
            useRpgStore.setState({
              tasks: state.tasks.map((t: any) => {
                // Миграция archiveReason для уже архивированных задач
                let archiveReason = t.archiveReason
                let canceledAt = t.canceledAt
                if (canceledAt && !archiveReason) {
                  // Определяем причину: если задача выполнена — completed, иначе — manual
                  archiveReason = t.isCompleted ? 'completed' : 'manual'
                }
                // Миграция: once-задачи, которые выполнены но не имеют canceledAt — архивируем
                if (t.isCompleted && !canceledAt && (t.recurrence === 'once' || !t.recurrence)) {
                  canceledAt = t.completedAt ?? t.updatedAt
                  archiveReason = 'completed'
                }
                return {
                  ...t,
                  groupId: t.groupId ?? null,
                  deadlineAt: t.deadlineAt ?? null,
                  attributeIds: t.attributeIds ?? (t.attributeId ? [t.attributeId] : []),
                  gemReward: t.gemReward ?? 0,
                  canceledAt,
                  archiveReason,
                  // Мигрируем подзадачи
                  subtasks: t.kind === 'nested' && t.subtasks
                    ? t.subtasks.map((s: any) => ({ ...s, gemReward: s.gemReward ?? 0 }))
                    : t.subtasks,
                }
              }),
            })
          }
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

// Keep module-level _debugDaysOffset in sync with the store
useRpgStore.subscribe(
  (state) => { _debugDaysOffset = state.debugDaysOffset }
)
