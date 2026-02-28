import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { vaultStorage, VAULT_READ_FILES } from '../lib/vaultStorage'
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
  UsageHistoryEntry,
  AppSettings,
  CurrencyId,
  TaskCompletionRecord,
  CompletedSubtaskRecord,
  TaskArchiveReason,
  RecurrenceSettings,
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
  /** История использования предметов из инвентаря (по профилям) */
  usageHistory: UsageHistoryEntry[]
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
  getTaskRewardPreview: (task: TaskRpg) => { xp: number; coins: number; gems: number; multiplierActive?: boolean }
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
  craftItem: (recipeId: CraftRecipeId) => boolean | { compensated: true; outOfStock?: boolean; coins: number; gems: number }
  tryRandomFragmentDrop: (taskId?: TaskId, isSubtask?: boolean) => void

  // Shop actions
  getShopItems: () => ShopItem[]
  addShopItem: (item: Omit<ShopItem, 'id'>) => ShopItem
  updateShopItem: (id: ItemId, updater: (i: ShopItem) => ShopItem) => void
  deleteShopItem: (id: ItemId) => void
  purchaseItem: (itemId: ItemId) => boolean | { loot: { itemId: string; name: string; compensated?: boolean; compensationLabel?: string } | null }
  openLootbox: (itemId: ItemId) => { itemId: string; name: string; compensated?: boolean; compensationLabel?: string } | null
  purchaseGameTime: (itemId: ItemId, packageId: string) => boolean
  useGameTime: (itemId: ItemId, minutes: number) => boolean
  purchaseEpisode: (itemId: ItemId, seasonId: string, episodeId: string) => boolean
  useEpisode: (itemId: ItemId, seasonId: string, episodeId: string) => boolean

  // Inventory actions
  getInventory: () => InventoryEntry[]
  addToInventory: (itemId: ItemId, quantity?: number) => void
  removeFromInventory: (itemId: ItemId, quantity?: number) => boolean
  useItem: (itemId: ItemId) => boolean | { loot: { itemId: string; name: string; compensated?: boolean; compensationLabel?: string } | null } | { multiplier: true; itemId: ItemId } | { serial: true; itemId: ItemId } | { videogame: true; itemId: ItemId }

  // Streak multiplier
  applyStreakMultiplier: (taskId: TaskId, itemId: ItemId) => boolean

  // Export/Import
  exportData: () => string
  importData: (json: string) => boolean
  resetProgress: () => void
}

// ─── Vault Persist Storage Adapter ──────────────────────────────────────────
// Zustand 5 persist expects StorageValue<S> = { state: S; version?: number }

import type { PersistStorage, StorageValue } from 'zustand/middleware'

let _writeTimer: ReturnType<typeof setTimeout> | null = null
const WRITE_DEBOUNCE_MS = 500

function createVaultStorage(): PersistStorage<Partial<RpgStoreState>> {
  return {
    getItem: async (): Promise<StorageValue<Partial<RpgStoreState>> | null> => {
      const results = await Promise.all(
        VAULT_READ_FILES.map((f) => vaultStorage.read(f))
      )

      const [
        profileData, settingsData, tasks, taskGroups,
        habits, shopItems, itemGroups, inventory,
        achievements, craftRecipes, purchaseHistory,
        usageHistory, stats,
      ] = results as [
        { profiles: unknown[]; activeProfileId: string | null } | null,
        { settings: unknown; activeShopDiscountPercent: number | null } | null,
        unknown[] | null,
        unknown[] | null,
        unknown[] | null,
        unknown[] | null,
        unknown[] | null,
        unknown[] | null,
        unknown[] | null,
        unknown[] | null,
        unknown[] | null,
        unknown[] | null,
        unknown | null,
      ]

      // If all files are null, there's no persisted state
      const allNull = results.every((r) => r === null)
      if (allNull) return null

      return {
        state: {
          profiles: profileData?.profiles as Profile[] ?? [],
          activeProfileId: (profileData?.activeProfileId as ProfileId) ?? null,
          settings: settingsData?.settings as AppSettings ?? undefined,
          activeShopDiscountPercent: settingsData?.activeShopDiscountPercent ?? null,
          tasks: tasks as TaskRpg[] ?? [],
          taskGroups: taskGroups as TaskGroup[] ?? [],
          habits: habits as Habit[] ?? [],
          shopItems: shopItems as ShopItem[] ?? [],
          itemGroups: itemGroups as ItemGroup[] ?? [],
          inventory: inventory as InventoryEntry[] ?? [],
          achievements: achievements as Achievement[] ?? [],
          craftRecipes: craftRecipes as CraftRecipe[] ?? [],
          purchaseHistory: purchaseHistory as PurchaseHistoryEntry[] ?? [],
          usageHistory: usageHistory as UsageHistoryEntry[] ?? [],
          stats: stats as RpgStoreState['stats'] ?? undefined,
        } as Partial<RpgStoreState>,
      }
    },

    setItem: async (_name: string, value: StorageValue<Partial<RpgStoreState>>): Promise<void> => {
      // Debounce writes to avoid excessive disk I/O
      if (_writeTimer) clearTimeout(_writeTimer)
      _writeTimer = setTimeout(async () => {
        try {
          const state = value.state
          await Promise.all([
            vaultStorage.write('profile.json', {
              profiles: state.profiles,
              activeProfileId: state.activeProfileId,
            }),
            vaultStorage.write('settings.json', {
              settings: state.settings,
              activeShopDiscountPercent: state.activeShopDiscountPercent,
            }),
            vaultStorage.write('tasks.json', state.tasks),
            vaultStorage.write('task-groups.json', state.taskGroups),
            vaultStorage.write('habits.json', state.habits),
            vaultStorage.write('shop-items.json', state.shopItems),
            vaultStorage.write('item-groups.json', state.itemGroups),
            vaultStorage.write('inventory.json', state.inventory),
            vaultStorage.write('achievements.json', state.achievements),
            vaultStorage.write('craft-recipes.json', state.craftRecipes),
            vaultStorage.write('purchase-history.json', state.purchaseHistory),
            vaultStorage.write('usage-history.json', state.usageHistory),
            vaultStorage.write('stats.json', state.stats),
          ])
        } catch (err) {
          console.error('[vault] Failed to write state:', err)
        }
      }, WRITE_DEBOUNCE_MS)
    },

    removeItem: async (): Promise<void> => {
      // No-op: we don't delete vault files
    },
  }
}

// Initialize store with default profile if needed (called once after rehydration)
let storeInitialized = false

// Защита от двойной покупки при быстром нажатии
const _purchasingLock = new Set<string>()

export const useRpgStore = create<RpgStoreState>()(
  persist(
    (set, get) => {
      const updateStats = (updater: (s: typeof get extends () => infer S ? S['stats'] : never) => Partial<typeof get extends () => infer S ? S['stats'] : never>) => {
        set((s) => ({ stats: { ...s.stats, ...updater(s.stats) } }))
      }

      /** Add a usage history entry */
      const addUsageEntry = (entry: Omit<import('../types/domain').UsageHistoryEntry, 'timestamp'> & { timestamp?: number }) => {
        set((s) => {
          const newEntry = { ...entry, timestamp: entry.timestamp ?? now() } as import('../types/domain').UsageHistoryEntry
          const history = [...s.usageHistory, newEntry]
          return { usageHistory: history.slice(-500) }
        })
      }

      /** Log a 'deactivated_multiplier' usage history entry when a multiplier is removed from a task */
      const logMultiplierDeactivation = (
        task: { id: string; title: string; streakMultiplier?: { value: number; interval: number; mode: string } },
        reason: 'streak_break' | 'uses_exhausted' | 'task_expired' | 'task_missed',
      ) => {
        const { activeProfileId } = get()
        if (!activeProfileId || !task.streakMultiplier) return

        // Find the activation entry to get itemId/itemName
        const activationEntry = get().usageHistory
          .filter((e) => e.action === 'activated_multiplier' && e.taskId === task.id)
          .sort((a, b) => b.timestamp - a.timestamp)[0]

        const itemId = activationEntry?.itemId ?? ''
        const itemName = activationEntry?.itemName ?? 'Множитель'

        addUsageEntry({
          profileId: activeProfileId,
          itemId,
          itemName,
          action: 'deactivated_multiplier' as const,
          taskId: task.id,
          taskName: task.title,
          multiplierValue: task.streakMultiplier!.value,
          deactivationReason: reason,
        })
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
        usageHistory: [],
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
          const baseXp = attrIds.length > 0
            ? (task.customXp ?? settings.taskDifficultyXp?.[task.difficulty] ?? TASK_XP_BY_DIFFICULTY[task.difficulty])
            : 0
          const baseCoins = task.coinReward
          const baseGems = task.gemReward ?? 0

          // Apply streak multiplier preview
          const sm = task.streakMultiplier
          let factor = 1
          if (sm) {
            if (sm.mode === 'instant') {
              // Instant mode always applies
              factor = sm.value
            } else if (sm.mode === 'streak') {
              // Streak mode: show multiplied reward when next completion hits interval
              const nextStreak = (task.currentStreak ?? 0) + 1
              if (nextStreak > 0 && nextStreak % sm.interval === 0) {
                factor = sm.value
              }
            }
          }

          return {
            xp: Math.round(baseXp * factor),
            coins: Math.round(baseCoins * factor),
            gems: Math.round(baseGems * factor),
            multiplierActive: factor > 1,
          }
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

          // ─── Streak multiplier factor ─────────────────────────────────────
          const sm = task.streakMultiplier
          const newStreakForMultiplier = (task.currentStreak ?? 0) + 1
          let multiplierFactor = 1
          if (sm) {
            if (sm.mode === 'streak' && newStreakForMultiplier > 0 && newStreakForMultiplier % sm.interval === 0) {
              multiplierFactor = sm.value
            } else if (sm.mode === 'instant') {
              multiplierFactor = sm.value
            }
          }

          // XP начисляется только если есть атрибуты
          const baseXp = attrIds.length > 0
            ? (task.customXp ?? settings.taskDifficultyXp?.[task.difficulty] ?? TASK_XP_BY_DIFFICULTY[task.difficulty])
            : 0
          const xpGain = Math.round(baseXp * multiplierFactor)
          const coinGain = Math.round(task.coinReward * multiplierFactor)
          const gemGain = Math.round((task.gemReward ?? 0) * multiplierFactor)

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

          // ─── Streak multiplier: compute updated state after this completion ──
          const smUpdate: { streakMultiplier?: typeof task.streakMultiplier } = {}
          if (sm) {
            if (sm.mode === 'instant' && sm.remainingUses != null) {
              const left = sm.remainingUses - 1
              smUpdate.streakMultiplier = left <= 0 ? undefined : { ...sm, remainingUses: left }
              if (left <= 0) {
                logMultiplierDeactivation(task, 'uses_exhausted')
              }
            }
            // streak mode: multiplier persists (removed only on streak break)
          }

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
              updateTask(id, (t) => ({ ...t, isCompleted: true, completedAt: now(), canceledAt: now(), archiveReason: 'completed' as TaskArchiveReason, recurrenceSettings: updatedSettings, ...historyFields, ...smUpdate }))
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
                  ...historyFields,
                  ...smUpdate,
                }
              })
            } else {
              // Для checkbox и counter задач
              updateTask(id, (t) => {
                const base = { recurrenceSettings: updatedSettings, currentCycleStart: now(), ...historyFields, ...smUpdate }
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
              updateTask(id, (t) => ({ ...t, isCompleted: true, completedAt: now(), canceledAt: now(), archiveReason: 'completed' as TaskArchiveReason, lastCompletedAt: now(), recurrenceSettings: updatedSettings, ...historyFields, ...smUpdate }))
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
                ...smUpdate,
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
              ...smUpdate,
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
          // Log multiplier deactivation when streak breaks
          if (task.streakMultiplier?.mode === 'streak') {
            logMultiplierDeactivation(task, 'streak_break')
          }

          const skipHistoryFields = {
            completionHistory: [...(task.completionHistory ?? []), skipRecord].slice(-365),
            currentStreak: 0,
            totalSkipped: (task.totalSkipped ?? 0) + 1,
            // При сбросе стрика снимаем множитель за стрик (streak mode)
            ...(task.streakMultiplier?.mode === 'streak' ? { streakMultiplier: undefined } : {}),
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

          // Для timesPerWeek — пропуск считается использованным действием, но не завершает цикл до исчерпания лимита
          const rs = task.recurrenceSettings
          const isTimesPerWeek = rs?.weeklyMode === 'timesPerWeek' && rs.weeklyTimesPerWeek

          get().updateTask(id, (t) => {
            if (isOnce) {
              // Once-задача провалена — НЕ помечаем как выполненную
              if (t.kind === 'checkbox') return { ...t, ...skipHistoryFields, ...archiveFields }
              if (t.kind === 'counter') return { ...t, ...skipHistoryFields, ...archiveFields }
              if (t.kind === 'nested') return { ...t, ...skipHistoryFields, ...archiveFields }
              return t
            }

            // Режим «N раз в неделю»: пропуск расходует одно действие, но задача остаётся активной пока не исчерпан лимит
            if (isTimesPerWeek && t.recurrenceSettings) {
              const currentWeekStart = getStartOfWeek(now())
              const prevDone = t.recurrenceSettings.weeklyCompletedThisWeek ?? 0
              const newDone = (t.recurrenceSettings.weeklyWeekStart === currentWeekStart)
                ? prevDone + 1
                : 1
              const updatedSettings: RecurrenceSettings = {
                ...t.recurrenceSettings,
                weeklyCompletedThisWeek: newDone,
                weeklyWeekStart: currentWeekStart,
              }
              const allDone = newDone >= (updatedSettings.weeklyTimesPerWeek ?? 0)
              const base = {
                ...skipHistoryFields,
                recurrenceSettings: updatedSettings,
                isCompleted: allDone,
                completedAt: allDone ? now() : undefined,
              }
              if (t.kind === 'checkbox') return { ...t, ...base }
              if (t.kind === 'counter') return { ...t, ...base, ...(allDone ? { current: t.target } : { current: 0 }) }
              if (t.kind === 'nested') return { ...t, ...base }
              return t
            }

            // Recurring-задача (обычная) — помечаем isCompleted для сброса цикла
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
              if (task.streakMultiplier?.mode === 'streak') {
                logMultiplierDeactivation(task, 'task_expired')
              }
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
                ...(t.streakMultiplier?.mode === 'streak' ? { streakMultiplier: undefined } : {}),
              }))
              return
            }

            // Recurring (daily/weekly/monthly/yearly/custom) с endDate: если endDate прошла — архивируем
            if (task.recurrence !== 'once' && task.recurrence !== 'instant' && endDate && nowTime >= endDate && !task.canceledAt) {
              if (!task.isCompleted && task.streakMultiplier?.mode === 'streak') {
                logMultiplierDeactivation(task, 'task_expired')
              }
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
                ...(task.streakMultiplier?.mode === 'streak' ? { streakMultiplier: undefined } : {}),
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
                // Log multiplier deactivation before removing it
                if (task.streakMultiplier?.mode === 'streak') {
                  logMultiplierDeactivation(task, 'task_missed')
                }
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
                  ...(t.streakMultiplier?.mode === 'streak' ? { streakMultiplier: undefined } : {}),
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

            // Для timesPerWeek: если неделя сменилась и задача ещё не полностью выполнена (isCompleted = false),
            // нужно сбросить weeklyCompletedThisWeek, чтобы в новой неделе счёт начинался с 0
            if (task.recurrence === 'weekly' && !task.isCompleted && !task.canceledAt) {
              const rsw = task.recurrenceSettings
              if (rsw?.weeklyMode === 'timesPerWeek' && rsw.weeklyWeekStart != null) {
                const currentWeek = getStartOfWeek(nowTime)
                if (rsw.weeklyWeekStart !== currentWeek) {
                  updateTask(task.id, t => ({
                    ...t,
                    currentCycleStart: nowTime,
                    lastCompletedAt: undefined,
                    ...(t.kind === 'counter' ? { current: 0 } : {}),
                    ...(t.kind === 'nested' ? {
                      subtasks: t.subtasks.map(s => ({ ...s, isCompleted: false, completedAt: undefined }))
                    } : {}),
                    recurrenceSettings: {
                      ...t.recurrenceSettings,
                      weeklyCompletedThisWeek: 0,
                      weeklyWeekStart: currentWeek,
                    },
                  }))
                  return
                }
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
          get().updateTask(id, (t) => t.kind === 'counter' ? { ...t, current: newCurrent, isCompleted: newCurrent >= t.target } : t)
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

          // Дроп фрагментов при выполнении подзадачи
          if (isNowCompleted) {
            get().tryRandomFragmentDrop(subtaskId, true)
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
          const { craftRecipes, addToInventory, deductCurrency, getCurrency, checkAchievements, addCurrency, inventory, shopItems, updateShopItem } = get()
          const recipe = craftRecipes.find((r) => r.id === recipeId)
          if (!recipe || recipe.crafted || recipe.fragmentsCollected < recipe.fragmentsRequired) return false

          // Deduct craft cost if any
          const craftCost = recipe.craftCost
          if (craftCost) {
            for (const [currId, amount] of Object.entries(craftCost)) {
              if (amount > 0 && getCurrency(currId) < amount) return false
            }
            for (const [currId, amount] of Object.entries(craftCost)) {
              if (amount > 0) deductCurrency(currId, amount)
            }
          }

          const newCraftCount = (recipe.craftCount ?? 0) + 1
          const maxCrafts = recipe.maxCrafts ?? 1
          const isFullyDone = newCraftCount >= maxCrafts

          // Add item to inventory (only if resultItemId is set)
          if (recipe.resultItemId) {
            const resultItem = shopItems.find((i) => i.id === recipe.resultItemId)
            const isMediaItem = resultItem?.isVideoGame || resultItem?.isTvSerial
            const alreadyOwned = isMediaItem && inventory.some((e) => e.itemId === recipe.resultItemId)
            const outOfStock = resultItem && resultItem.stock !== undefined && resultItem.stock === 0

            if (outOfStock) {
              // Item is out of stock in shop — give 70% of item cost as compensation
              const coinCost = resultItem.cost[CURRENCY_IDS.COINS] ?? 0
              const gemCost = resultItem.cost[CURRENCY_IDS.GEMS] ?? 0
              if (coinCost > 0) addCurrency(CURRENCY_IDS.COINS, Math.floor(coinCost * 0.7))
              if (gemCost > 0) addCurrency(CURRENCY_IDS.GEMS, Math.floor(gemCost * 0.7))
              get().updateCraftRecipe(recipeId, (r) => ({
                ...r,
                craftCount: newCraftCount,
                crafted: isFullyDone,
                craftedAt: now(),
                ...(isFullyDone ? {} : { fragmentsCollected: 0 }),
              }))
              updateStats((s) => ({ totalItemsCrafted: s.totalItemsCrafted + 1 }))
              checkAchievements()
              return { compensated: true, outOfStock: true, coins: Math.floor(coinCost * 0.7), gems: Math.floor(gemCost * 0.7) }
            }

            if (isMediaItem && alreadyOwned) {
              // Item already in inventory — give 80% of item cost as compensation
              const coinCost = resultItem?.cost[CURRENCY_IDS.COINS] ?? 0
              const gemCost = resultItem?.cost[CURRENCY_IDS.GEMS] ?? 0
              if (coinCost > 0) addCurrency(CURRENCY_IDS.COINS, Math.floor(coinCost * 0.8))
              if (gemCost > 0) addCurrency(CURRENCY_IDS.GEMS, Math.floor(gemCost * 0.8))
              // Mark recipe as crafted (compensation issued)
              get().updateCraftRecipe(recipeId, (r) => ({
                ...r,
                craftCount: newCraftCount,
                crafted: isFullyDone,
                craftedAt: now(),
                ...(isFullyDone ? {} : { fragmentsCollected: 0 }),
              }))
              updateStats((s) => ({ totalItemsCrafted: s.totalItemsCrafted + 1 }))
              checkAchievements()
              return { compensated: true, coins: Math.floor(coinCost * 0.8), gems: Math.floor(gemCost * 0.8) }
            }

            addToInventory(recipe.resultItemId)

            // Decrement stock in shop if item has limited stock
            if (resultItem && resultItem.stock !== undefined && resultItem.stock > 0) {
              updateShopItem(recipe.resultItemId, (prev) => ({
                ...prev,
                stock: (prev.stock ?? 1) - 1,
              }))
            }

            // If media item — mark as basePurchased in shop so user can buy episodes/time
            if (isMediaItem && resultItem) {
              updateShopItem(recipe.resultItemId, (prev) => ({ ...prev, basePurchased: true }))
            }
          }

          // Update recipe: increment craftCount, reset fragments if more crafts remain
          get().updateCraftRecipe(recipeId, (r) => ({
            ...r,
            craftCount: newCraftCount,
            crafted: isFullyDone,
            craftedAt: now(),
            ...(isFullyDone ? {} : { fragmentsCollected: 0 }),
          }))

          // Update stats
          updateStats((s) => ({ totalItemsCrafted: s.totalItemsCrafted + 1 }))

          checkAchievements()
          return true
        },

        tryRandomFragmentDrop: (taskId?: string, isSubtask = false) => {
          const recipes = get().getCraftRecipes().filter((r) => !r.crafted)

          recipes.forEach((recipe) => {
            const fs = recipe.fragmentSource
            if (!fs || !fs.type) return

            // If this is a subtask completion, only drop if allowSubtaskDrop is enabled
            if (isSubtask && !fs.allowSubtaskDrop) return

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

        deleteShopItem: (id) => set((s) => {
          const hasInventory = s.inventory.some((e) => e.itemId === id)
          if (hasInventory) {
            // Soft-delete: предмет остаётся для инвентаря, но скрыт из магазина
            return { shopItems: s.shopItems.map((i) => i.id === id ? { ...i, deletedFromShop: true } : i) }
          }
          return { shopItems: s.shopItems.filter((i) => i.id !== id) }
        }),

        purchaseItem: (itemId) => {
          // Защита от двойной покупки при быстром нажатии
          if (_purchasingLock.has(itemId)) return false
          _purchasingLock.add(itemId)

          try {
          const { shopItems, deductCurrency, addToInventory, openLootbox, activeShopDiscountPercent, activeProfileId } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item) return false

          const coinCost = item.cost[CURRENCY_IDS.COINS] ?? 0
          const gemCost = item.cost[CURRENCY_IDS.GEMS] ?? 0
          const effectiveCoinCost =
            activeShopDiscountPercent != null && coinCost > 0
              ? Math.round(coinCost * (1 - activeShopDiscountPercent / 100))
              : coinCost
          const effectiveGemCost = gemCost // скидка не применяется к кристаллам
          const effectiveCosts = { ...item.cost, [CURRENCY_IDS.COINS]: effectiveCoinCost, [CURRENCY_IDS.GEMS]: effectiveGemCost }

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
            // Decrement stock for limited lootboxes
            if (item.stock !== undefined && item.stock > 0) {
              const { updateShopItem } = get()
              updateShopItem(itemId, (prev) => ({
                ...prev,
                stock: (prev.stock ?? 1) - 1,
              }))
            }
            addToInventory(itemId)
            return true
          }

          // Videogame: mark as base-purchased, keep in shop, add to inventory
          if (item.isVideoGame) {
            const { updateShopItem, addToInventory: addInv } = get()
            updateShopItem(itemId, (prev) => ({
              ...prev,
              basePurchased: true,
            }))
            addInv(itemId)
            return true
          }

          // Serial: mark as base-purchased, add to inventory, keep in shop for episode purchases
          if (item.isTvSerial) {
            const { updateShopItem, addToInventory: addInv } = get()
            updateShopItem(itemId, (prev) => ({
              ...prev,
              basePurchased: true,
            }))
            addInv(itemId)
            return true
          }

          // Decrement stock for limited items
          if (item.stock !== undefined && item.stock > 0) {
            const { updateShopItem } = get()
            updateShopItem(itemId, (prev) => ({
              ...prev,
              stock: (prev.stock ?? 1) - 1,
            }))
          }

          addToInventory(itemId)
          return true
          } finally {
            _purchasingLock.delete(itemId)
          }
        },

        openLootbox: (itemId) => {
          const { shopItems, addToInventory, addCurrency, inventory, updateShopItem } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item || !item.isLootBox || !item.lootTable) return null

          const totalWeight = item.lootTable.reduce((sum, entry) => sum + entry.weight, 0)
          if (totalWeight <= 0) {
            // Все веса нулевые — компенсация 50% стоимости лутбокса монетами
            const lbCoinCost = item.cost[CURRENCY_IDS.COINS] ?? 0
            const comp = Math.floor(lbCoinCost * 0.5)
            if (comp > 0) addCurrency(CURRENCY_IDS.COINS, comp)
            return { itemId: 'empty', name: `Пусто (компенсация 🪙 ${comp})`, compensated: true, compensationLabel: `🪙 ${comp}` }
          }
          const random = Math.random() * 100 // 0..100; оставшиеся (100 - totalWeight)% — шанс ничего не выпасть
          if (random >= totalWeight) return null

          let r = random
          for (const entry of item.lootTable) {
            r -= entry.weight
            if (r < 0) {
              const qty = entry.quantity ?? 1
              if (entry.id === CURRENCY_IDS.COINS || entry.id === CURRENCY_IDS.GEMS) {
                addCurrency(entry.id as CurrencyId, qty)
                const name = entry.id === CURRENCY_IDS.COINS ? `Монеты x${qty}` : `Кристаллы x${qty}`
                return { itemId: entry.id, name }
              } else {
                const resultItem = get().shopItems.find((i) => i.id === entry.id)
                const isMediaItem = resultItem?.isVideoGame || resultItem?.isTvSerial
                const alreadyOwned = isMediaItem && inventory.some((e) => e.itemId === entry.id)

                if (isMediaItem && alreadyOwned) {
                  // Already owned media item — give 80% compensation
                  const coinCost = resultItem?.cost[CURRENCY_IDS.COINS] ?? 0
                  const gemCost = resultItem?.cost[CURRENCY_IDS.GEMS] ?? 0
                  const compCoins = Math.floor(coinCost * 0.8)
                  const compGems = Math.floor(gemCost * 0.8)
                  if (compCoins > 0) addCurrency(CURRENCY_IDS.COINS, compCoins)
                  if (compGems > 0) addCurrency(CURRENCY_IDS.GEMS, compGems)
                  const name = resultItem?.name ?? 'Награда'
                  const compParts: string[] = []
                  if (compCoins > 0) compParts.push(`🪙 ${compCoins}`)
                  if (compGems > 0) compParts.push(`💎 ${compGems}`)
                  return { itemId: entry.id, name, compensated: true, compensationLabel: compParts.join(' + ') || '—' }
                }

                addToInventory(entry.id, qty)

                // If media item — mark basePurchased so user can buy episodes/time in shop
                if (isMediaItem && resultItem) {
                  updateShopItem(entry.id, (prev) => ({ ...prev, basePurchased: true }))
                }

                const name = resultItem?.name ?? 'Награда'
                return { itemId: entry.id, name: qty > 1 ? `${name} x${qty}` : name }
              }
            }
          }

          return null
        },

        purchaseGameTime: (itemId, packageId) => {
          const { shopItems, deductCurrency, updateShopItem, activeProfileId } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item || !item.isVideoGame || !item.gameTimePackages) return false
          if (!item.basePurchased) return false

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

          // Add to purchase history
          if (activeProfileId) {
            const pkgLabel = pkg.hours % 1 === 0 ? `${pkg.hours} ч` : `${pkg.hours} ч`
            set((s) => ({
              purchaseHistory: [
                ...s.purchaseHistory,
                {
                  profileId: activeProfileId,
                  itemId: item.id,
                  itemName: item.name,
                  timestamp: now(),
                  packageName: pkgLabel,
                },
              ].slice(-500),
            }))
          }

          return true
        },

        useGameTime: (itemId, minutes) => {
          const { shopItems, updateShopItem, activeProfileId } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item || !item.isVideoGame) return false

          const available = item.gameTimeTotalMinutes ?? 0
          if (minutes <= 0 || minutes > available) return false

          updateShopItem(itemId, (prev) => ({
            ...prev,
            gameTimeTotalMinutes: (prev.gameTimeTotalMinutes ?? 0) - minutes,
            gameTimePlayedMinutes: (prev.gameTimePlayedMinutes ?? 0) + minutes,
          }))

          if (activeProfileId) {
            addUsageEntry({
              profileId: activeProfileId,
              itemId,
              itemName: item.name,
              action: 'used' as const,
              gameHoursUsed: Math.round(minutes / 60 * 10) / 10,
            })
          }

          return true
        },

        purchaseEpisode: (itemId, seasonId, episodeId) => {
          const { shopItems, deductCurrency, updateShopItem, activeProfileId } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item || !item.isTvSerial || !item.serialSeasons) return false
          if (!item.basePurchased) return false

          const season = item.serialSeasons.find((s) => s.id === seasonId)
          if (!season) return false

          const episode = season.episodes.find((e) => e.id === episodeId)
          if (!episode || episode.purchased) return false

          const coinBalance = get().getCurrency(CURRENCY_IDS.COINS)
          if (coinBalance < episode.cost) return false

          deductCurrency(CURRENCY_IDS.COINS, episode.cost)

          // Add to purchase history
          if (activeProfileId) {
            set((s) => ({
              purchaseHistory: [
                ...s.purchaseHistory,
                {
                  profileId: activeProfileId,
                  itemId: item.id,
                  itemName: item.name,
                  timestamp: now(),
                  seasonNumber: season.number,
                  episodeNumber: episode.number,
                },
              ].slice(-500),
            }))
          }

          // Mark episode as purchased
          const updatedSeasons = item.serialSeasons.map((s) =>
            s.id === seasonId
              ? { ...s, episodes: s.episodes.map((e) => e.id === episodeId ? { ...e, purchased: true } : e) }
              : s
          )

          // Check if all episodes are now purchased
          const allEpisodesPurchased = updatedSeasons.every((s) =>
            s.episodes.every((e) => e.purchased)
          )

          updateShopItem(itemId, (prev) => ({
            ...prev,
            serialSeasons: updatedSeasons,
            ...(allEpisodesPurchased ? { stock: 0 } : {}),
          }))
          return true
        },

        useEpisode: (itemId, seasonId, episodeId) => {
          const { shopItems, updateShopItem, activeProfileId } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item || !item.isTvSerial || !item.serialSeasons) return false

          const season = item.serialSeasons.find((s) => s.id === seasonId)
          if (!season) return false

          const episode = season.episodes.find((e) => e.id === episodeId)
          if (!episode || !episode.purchased || episode.used) return false

          updateShopItem(itemId, (prev) => ({
            ...prev,
            serialSeasons: (prev.serialSeasons ?? []).map((s) =>
              s.id === seasonId
                ? { ...s, episodes: s.episodes.map((e) => e.id === episodeId ? { ...e, used: true } : e) }
                : s
            ),
          }))

          // Log usage
          if (activeProfileId) {
            addUsageEntry({
              profileId: activeProfileId,
              itemId,
              itemName: item.name,
              action: 'used' as const,
              seasonNumber: season.number,
              episodeNumber: episode.number,
            })
          }

          return true
        },

        // ─── Inventory ────────────────────────────────────────────────────
        getInventory: () => {
          return get().inventory
        },

        addToInventory: (itemId, quantity = 1) => {
          if (quantity <= 0 || !Number.isFinite(quantity)) return
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
          if (quantity <= 0 || !Number.isFinite(quantity)) return false
          const { inventory, shopItems } = get()
          const existing = inventory.find((e) => e.itemId === itemId)
          if (!existing || existing.quantity < quantity) return false

          const fullyRemoved = existing.quantity === quantity
          set((s) => {
            const nextInventory = fullyRemoved
              ? s.inventory.filter((e) => e.itemId !== itemId)
              : s.inventory.map((e) =>
                  e.itemId === itemId ? { ...e, quantity: e.quantity - quantity } : e
                )
            // Если предмет полностью убран из инвентаря и был soft-deleted из магазина — удаляем окончательно
            const nextShopItems = fullyRemoved && shopItems.find((i) => i.id === itemId)?.deletedFromShop
              ? s.shopItems.filter((i) => i.id !== itemId)
              : s.shopItems
            return { inventory: nextInventory, shopItems: nextShopItems }
          })
          return true
        },

        useItem: (itemId) => {
          const { shopItems, inventory, getActiveProfile, updateProfile, removeFromInventory, openLootbox, activeProfileId } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item) return false
          const invEntry = inventory.find((e) => e.itemId === itemId)
          if (!invEntry || invEntry.quantity <= 0) return false

          // Serial: don't consume, don't log — return signal to show episode list in inventory modal
          if (item.isTvSerial) {
            return { serial: true as const, itemId }
          }

          // Video game: don't consume — return signal to show game time usage in inventory modal
          if (item.isVideoGame) {
            return { videogame: true as const, itemId }
          }

          // Lootbox: open, log result, and return
          if (item.isLootBox) {
            if (!removeFromInventory(itemId, 1)) return false
            const loot = openLootbox(itemId)
            if (activeProfileId) {
              addUsageEntry({
                profileId: activeProfileId,
                itemId,
                itemName: item.name,
                action: 'opened_lootbox' as const,
                lootResultName: loot?.name ?? null,
              })
            }
            return { loot }
          }

          // Discount voucher: remove from inventory first, then activate
          if (item.isDiscountVoucher && (item.discountPercent ?? 0) > 0) {
            const percent = Math.min(85, Math.max(1, item.discountPercent ?? 0))
            const removed = removeFromInventory(itemId, 1)
            if (!removed) return false
            if (activeProfileId) {
              addUsageEntry({
                profileId: activeProfileId,
                itemId,
                itemName: item.name,
                action: 'activated_discount' as const,
                discountPercent: percent,
              })
            }
            set(() => ({ activeShopDiscountPercent: percent }))
            return true
          }

          // Generic usage (non-lootbox, non-discount, non-multiplier)
          // Note: multiplier logging happens in applyStreakMultiplier where taskId is known
          if (activeProfileId && !item.streakMultiplierEnabled) {
            addUsageEntry({
              profileId: activeProfileId,
              itemId,
              itemName: item.name,
              action: 'used' as const,
            })
          }

          // Streak multiplier: don't consume yet — return signal to open task selection modal
          if (item.streakMultiplierEnabled) {
            return { multiplier: true as const, itemId }
          }

          return removeFromInventory(itemId, 1)
        },

        applyStreakMultiplier: (taskId, itemId) => {
          const { tasks, shopItems, updateTask, removeFromInventory, activeProfileId } = get()
          const task = tasks.find((t) => t.id === taskId)
          const item = shopItems.find((i) => i.id === itemId)
          if (!task || !item || !item.streakMultiplierEnabled) return false

          // Validate mode compatibility
          const mode = item.streakMultiplierMode ?? 'streak'
          if (mode === 'streak' && (task.recurrence === 'once' || task.recurrence === 'instant')) return false
          if (mode === 'instant' && task.recurrence !== 'instant') return false

          // Don't apply if task already has active multiplier
          if (task.streakMultiplier) return false

          const multiplierValue = item.streakMultiplierValue ?? 1.5
          const interval = item.streakMultiplierInterval ?? 3

          // Attach multiplier to task
          updateTask(taskId, (t) => ({
            ...t,
            streakMultiplier: {
              value: multiplierValue,
              interval,
              mode,
              ...(mode === 'instant' ? { remainingUses: interval } : {}),
              appliedAt: now(),
            },
          }))

          // Log usage
          if (activeProfileId) {
            addUsageEntry({
              profileId: activeProfileId,
              itemId,
              itemName: item.name,
              action: 'activated_multiplier' as const,
              taskId: taskId,
              taskName: task.title,
              multiplierValue,
            })
          }

          // Remove item from inventory
          removeFromInventory(itemId, 1)
          return true
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
            purchaseHistory: state.purchaseHistory,
            usageHistory: state.usageHistory,
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
              purchaseHistory: data.purchaseHistory ?? [],
              usageHistory: data.usageHistory ?? [],
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
      name: 'rpg-life-vault',
      storage: createVaultStorage(),
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
        usageHistory: s.usageHistory,
        activeShopDiscountPercent: s.activeShopDiscountPercent,
        settings: s.settings,
        stats: s.stats,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (state.activeShopDiscountPercent === undefined) useRpgStore.setState({ activeShopDiscountPercent: null })
        if (!state.purchaseHistory) useRpgStore.setState({ purchaseHistory: [] })
        if (!state.usageHistory) useRpgStore.setState({ usageHistory: [] })

        // Migrate settings: historyRetentionDays -> historyDisplayLimit
        if (state.settings) {
          const s = state.settings as any
          if (s.historyDisplayLimit === undefined) {
            const { historyRetentionDays: _, ...rest } = s
            useRpgStore.setState({
              settings: { ...rest, historyDisplayLimit: 50 },
            })
          }
        }

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
