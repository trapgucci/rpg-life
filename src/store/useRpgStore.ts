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
  Achievement,
  AchievementId,
  AchievementGroup,
  AchievementGroupId,
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
  NoteFolder,
  NoteFolderId,
  Note,
  NoteId,
  DailyReport,
  MoodLevel,
  DailySnapshot,
  DailyCondition,
  DailyConditionId,
  DailyConditionEntry,
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
import { rpgToast } from '../components/RpgToast'

// Removed DEFAULT_PENALTY_FACTOR - penalty system removed
const EMPTY_ATTRIBUTES: Attribute[] = []

function now() {
  return Date.now()
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

/** Add XP to the profile-level bar (profile.xp / profile.level), handling level-ups */
function addXpToProfile(profile: Profile, xpGain: number): Pick<Profile, 'xp' | 'level'> {
  let { level, xp } = profile
  xp += xpGain
  let required = xpRequiredForNextLevel(profile, level)
  while (required > 0 && xp >= required) {
    xp -= required
    level += 1
    required = xpRequiredForNextLevel({ ...profile, level }, level)
  }
  return { xp, level }
}

// ─── Store State Interface ──────────────────────────────────────────────────

interface RpgStoreState {
  // Data
  profiles: Profile[]
  activeProfileId: ProfileId | null
  taskGroups: TaskGroup[]
  itemGroups: ItemGroup[]
  achievementGroups: AchievementGroup[]
  tasks: TaskRpg[]
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

  // Stats
  stats: {
    totalTasksCompleted: number
    totalCoinsEarned: number
    totalCoinsSpent: number
    totalGemsEarned: number
    totalGemsSpent: number
    totalItemsCrafted: number
    currentStreak: number
    bestStreak: number
    lastActiveDate: number
  }

  // Hydration flag
  _hasHydrated: boolean
  setHasHydrated: (v: boolean) => void

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

  decrementCounter: (id: TaskId) => void
  toggleSubtask: (taskId: TaskId, subtaskId: string) => void
  getTaskRewardPreview: (task: TaskRpg) => { xp: number; coins: number; gems: number; multiplierActive?: boolean }
  getTaskPenaltyPreview: (task: TaskRpg) => { xp: number; coins: number }

  // Achievement group actions
  getAchievementGroups: () => AchievementGroup[]
  addAchievementGroup: (name: string, color?: string) => AchievementGroup
  updateAchievementGroup: (id: AchievementGroupId, updater: (g: AchievementGroup) => AchievementGroup) => void
  deleteAchievementGroup: (id: AchievementGroupId) => void
  reorderAchievementGroups: (orderedIds: AchievementGroupId[]) => void

  // Achievement actions
  getAchievements: () => Achievement[]
  addAchievement: (achievement: Omit<Achievement, 'id' | 'createdAt' | 'updatedAt' | 'profileId' | 'unlocked' | 'unlockedAt' | 'currentProgress' | 'sortOrder'>) => Achievement
  updateAchievement: (id: AchievementId, updater: (a: Achievement) => Achievement) => void
  deleteAchievement: (id: AchievementId) => void
  reorderAchievements: (orderedIds: AchievementId[]) => void
  checkAchievements: () => void
  unlockAchievement: (id: AchievementId) => { givenItems: { name: string; emoji?: string; quantity: number }[]; compensations: { name: string; coins: number; gems: number; reason: 'out_of_stock' | 'duplicate' }[] } | void
  markAchievementReady: (id: AchievementId) => void

  // Craft actions
  getCraftRecipes: () => CraftRecipe[]
  addCraftRecipe: (recipe: Omit<CraftRecipe, 'id' | 'createdAt' | 'updatedAt' | 'profileId' | 'fragmentsCollected' | 'crafted' | 'craftedAt' | 'fragmentColor' | 'resultItemId' | 'resultIcon'> & { fragmentColor?: string; resultItemId?: ItemId; resultIcon?: string }) => CraftRecipe
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
  purchaseItem: (itemId: ItemId) => boolean | { loot: { itemId: string; name: string; compensated?: boolean; compensationLabel?: string; compensationReason?: 'duplicate' | 'out_of_stock'; lootCoins?: number; lootGems?: number } | null }
  openLootbox: (itemId: ItemId) => { itemId: string; name: string; compensated?: boolean; compensationLabel?: string; compensationReason?: 'duplicate' | 'out_of_stock'; lootCoins?: number; lootGems?: number } | null
  purchaseGameTime: (itemId: ItemId, packageId: string) => boolean
  useGameTime: (itemId: ItemId, minutes: number) => boolean
  purchaseEpisode: (itemId: ItemId, seasonId: string, episodeId: string) => boolean
  useEpisode: (itemId: ItemId, seasonId: string, episodeId: string) => boolean

  // Inventory actions
  getInventory: () => InventoryEntry[]
  addToInventory: (itemId: ItemId, quantity?: number) => void
  removeFromInventory: (itemId: ItemId, quantity?: number) => boolean
  useItem: (itemId: ItemId, quantity?: number) => boolean | { loot: { itemId: string; name: string; compensated?: boolean; compensationLabel?: string; compensationReason?: 'duplicate' | 'out_of_stock' } | null } | { multiplier: true; itemId: ItemId } | { serial: true; itemId: ItemId } | { videogame: true; itemId: ItemId }

  // Streak multiplier
  applyStreakMultiplier: (taskId: TaskId, itemId: ItemId) => boolean

  // ─── Reflection (Notes + Daily Reports) ────────────────────────────────
  noteFolders: NoteFolder[]
  notes: Note[]
  dailyReports: DailyReport[]

  // Note folder actions
  getNoteFolders: () => NoteFolder[]
  addNoteFolder: (name: string, icon?: string, color?: string) => NoteFolder
  updateNoteFolder: (id: NoteFolderId, updater: (f: NoteFolder) => NoteFolder) => void
  deleteNoteFolder: (id: NoteFolderId) => void
  reorderNoteFolders: (orderedIds: NoteFolderId[]) => void

  // Note actions
  getNotes: () => Note[]
  addNote: (partial: { title: string; folderId?: NoteFolderId | null; content?: string; linkedTaskIds?: TaskId[]; linkedItemIds?: ItemId[] }) => Note
  updateNote: (id: NoteId, updater: (n: Note) => Note) => void
  deleteNote: (id: NoteId) => void
  restoreNote: (id: NoteId) => void
  permanentDeleteNote: (id: NoteId) => void
  emptyTrash: () => void
  reorderNotes: (orderedIds: NoteId[]) => void

  // Daily conditions
  dailyConditions: DailyCondition[]
  dailyConditionEntries: DailyConditionEntry[]

  // Daily condition actions
  getDailyConditions: () => DailyCondition[]
  getConditionsForDate: (dateKey: string) => DailyCondition[]
  addDailyCondition: (name: string, icon?: string) => DailyCondition
  deleteDailyCondition: (id: DailyConditionId) => void
  toggleConditionEntry: (conditionId: DailyConditionId, dateKey: string) => void
  getConditionEntries: (dateKey: string) => DailyConditionEntry[]
  getConditionTotalChecked: (conditionId: DailyConditionId) => number
  getConditionStats: (conditionId: DailyConditionId) => {
    totalDays: number
    checkedDays: number
    missedDays: number
    currentStreak: number
    bestStreak: number
    /** Map dateKey → checked */
    history: Record<string, boolean>
  }

  // Daily report actions
  getDailyReports: () => DailyReport[]
  getDailyReport: (dateKey: string) => DailyReport | null
  setDailyMood: (dateKey: string, mood: MoodLevel) => void
  setDailyThoughts: (dateKey: string, thoughts: string) => void
  addDailyPhoto: (dateKey: string, mediaPath: string) => void
  removeDailyPhoto: (dateKey: string, mediaPath: string) => void
  generateDailySnapshot: (dateKey: string) => DailySnapshot
  saveDailySnapshot: (dateKey: string) => void

  // Export/Import
  exportData: () => string
  importData: (json: string) => boolean
  resetProgress: () => void
}

// ─── Vault Persist Storage Adapter ──────────────────────────────────────────
// Zustand 5 persist expects StorageValue<S> = { state: S; version?: number }

import type { PersistStorage, StorageValue } from 'zustand/middleware'

let _writeTimer: ReturnType<typeof setTimeout> | null = null
let _pendingWrite: (() => Promise<void>) | null = null
const WRITE_DEBOUNCE_MS = 500
const WRITE_MAX_WAIT_MS = 3000
let _firstChangeAt: number | null = null
let _hydrationComplete = false
let _lastWrittenState: Partial<RpgStoreState> | null = null

type SliceWriter = {
  file: string
  getData: (state: Partial<RpgStoreState>) => unknown
  getKeys: (state: Partial<RpgStoreState>) => unknown[]
}

const VAULT_SLICES: SliceWriter[] = [
  {
    file: 'profile.json',
    getData: (s) => ({ profiles: s.profiles, activeProfileId: s.activeProfileId }),
    getKeys: (s) => [s.profiles, s.activeProfileId],
  },
  {
    file: 'settings.json',
    getData: (s) => ({ settings: s.settings, activeShopDiscountPercent: s.activeShopDiscountPercent }),
    getKeys: (s) => [s.settings, s.activeShopDiscountPercent],
  },
  { file: 'tasks.json', getData: (s) => s.tasks, getKeys: (s) => [s.tasks] },
  { file: 'task-groups.json', getData: (s) => s.taskGroups, getKeys: (s) => [s.taskGroups] },
  { file: 'shop-items.json', getData: (s) => s.shopItems, getKeys: (s) => [s.shopItems] },
  { file: 'item-groups.json', getData: (s) => s.itemGroups, getKeys: (s) => [s.itemGroups] },
  { file: 'achievement-groups.json', getData: (s) => s.achievementGroups, getKeys: (s) => [s.achievementGroups] },
  { file: 'inventory.json', getData: (s) => s.inventory, getKeys: (s) => [s.inventory] },
  { file: 'achievements.json', getData: (s) => s.achievements, getKeys: (s) => [s.achievements] },
  { file: 'craft-recipes.json', getData: (s) => s.craftRecipes, getKeys: (s) => [s.craftRecipes] },
  { file: 'purchase-history.json', getData: (s) => s.purchaseHistory, getKeys: (s) => [s.purchaseHistory] },
  { file: 'usage-history.json', getData: (s) => s.usageHistory, getKeys: (s) => [s.usageHistory] },
  { file: 'stats.json', getData: (s) => s.stats, getKeys: (s) => [s.stats] },
  { file: 'note-folders.json', getData: (s) => s.noteFolders, getKeys: (s) => [s.noteFolders] },
  { file: 'notes.json', getData: (s) => (s.notes ?? []).map((n) => ({ ...n, content: '' })), getKeys: (s) => [s.notes] },
  { file: 'daily-reports.json', getData: (s) => s.dailyReports, getKeys: (s) => [s.dailyReports] },
  { file: 'daily-conditions.json', getData: (s) => s.dailyConditions ?? [], getKeys: (s) => [s.dailyConditions] },
  { file: 'daily-condition-entries.json', getData: (s) => s.dailyConditionEntries ?? [], getKeys: (s) => [s.dailyConditionEntries] },
]

function createVaultStorage(): PersistStorage<Partial<RpgStoreState>> {
  // Migrate from old zustand localStorage format (rpg-life-store-v2) to vault files
  const migrateFromLegacy = async (): Promise<StorageValue<Partial<RpgStoreState>> | null> => {
    if (vaultStorage.isElectron()) return null
    try {
      const raw = localStorage.getItem('rpg-life-store-v2')
      if (!raw) return null
      const parsed = JSON.parse(raw) as StorageValue<Partial<RpgStoreState>>
      if (!parsed?.state) return null
      console.info('[vault] Migrating data from rpg-life-store-v2 to vault files...')
      // Write all slices to vault format so next load uses vault
      const s = parsed.state
      await Promise.all([
        vaultStorage.write('profile.json', { profiles: s.profiles, activeProfileId: s.activeProfileId }),
        vaultStorage.write('settings.json', { settings: s.settings, activeShopDiscountPercent: s.activeShopDiscountPercent }),
        vaultStorage.write('tasks.json', s.tasks ?? []),
        vaultStorage.write('task-groups.json', s.taskGroups ?? []),
        vaultStorage.write('shop-items.json', s.shopItems ?? []),
        vaultStorage.write('item-groups.json', s.itemGroups ?? []),
        vaultStorage.write('achievement-groups.json', s.achievementGroups ?? []),
        vaultStorage.write('inventory.json', s.inventory ?? []),
        vaultStorage.write('achievements.json', s.achievements ?? []),
        vaultStorage.write('craft-recipes.json', s.craftRecipes ?? []),
        vaultStorage.write('purchase-history.json', s.purchaseHistory ?? []),
        vaultStorage.write('usage-history.json', s.usageHistory ?? []),
        vaultStorage.write('stats.json', s.stats ?? undefined),
        vaultStorage.write('note-folders.json', s.noteFolders ?? []),
        vaultStorage.write('notes.json', s.notes ?? []),
        vaultStorage.write('daily-reports.json', s.dailyReports ?? []),
        vaultStorage.write('daily-conditions.json', s.dailyConditions ?? []),
        vaultStorage.write('daily-condition-entries.json', s.dailyConditionEntries ?? []),
      ])
      localStorage.removeItem('rpg-life-store-v2')
      console.info('[vault] Migration complete, old key removed.')
      return parsed
    } catch (err) {
      console.error('[vault] Legacy migration failed:', err)
      return null
    }
  }

  return {
    getItem: async (): Promise<StorageValue<Partial<RpgStoreState>> | null> => {
      const results = await Promise.all(
        VAULT_READ_FILES.map((f) => vaultStorage.read(f))
      )

      const [
        profileData, settingsData, tasks, taskGroups,
        shopItems, itemGroups, achievementGroups, inventory,
        achievements, craftRecipes, purchaseHistory,
        usageHistory, stats,
        noteFolders, notes, dailyReports,
        dailyConditions, dailyConditionEntries,
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
        unknown[] | null,
        unknown[] | null,
        unknown[] | null,
        unknown[] | null,
        unknown[] | null,
      ]

      // If all files are null, try migrating from legacy localStorage format
      const allNull = results.every((r) => r === null)
      if (allNull) {
        const legacy = await migrateFromLegacy()
        if (legacy) return legacy
        return null
      }

      const state: Partial<RpgStoreState> = {
        profiles: profileData?.profiles as Profile[] ?? [],
        activeProfileId: (profileData?.activeProfileId as ProfileId) ?? null,
        settings: settingsData?.settings as AppSettings ?? undefined,
        activeShopDiscountPercent: settingsData?.activeShopDiscountPercent ?? null,
        tasks: tasks as TaskRpg[] ?? [],
        taskGroups: taskGroups as TaskGroup[] ?? [],
        shopItems: shopItems as ShopItem[] ?? [],
        itemGroups: itemGroups as ItemGroup[] ?? [],
        achievementGroups: achievementGroups as AchievementGroup[] ?? [],
        inventory: inventory as InventoryEntry[] ?? [],
        achievements: achievements as Achievement[] ?? [],
        craftRecipes: craftRecipes as CraftRecipe[] ?? [],
        purchaseHistory: purchaseHistory as PurchaseHistoryEntry[] ?? [],
        usageHistory: usageHistory as UsageHistoryEntry[] ?? [],
        stats: stats as RpgStoreState['stats'] ?? undefined,
        noteFolders: noteFolders as NoteFolder[] ?? [],
        notes: notes as Note[] ?? [],
        dailyReports: dailyReports as DailyReport[] ?? [],
        dailyConditions: dailyConditions as DailyCondition[] ?? [],
        dailyConditionEntries: dailyConditionEntries as DailyConditionEntry[] ?? [],
      }

      // Migrate: move note content from notes.json to separate files
      if (state.notes && Array.isArray(state.notes)) {
        const notesWithContent = (state.notes as Note[]).filter(
          (n) => n.content && n.content.length > 0
        )
        if (notesWithContent.length > 0) {
          await Promise.all(
            notesWithContent.map((n) => vaultStorage.writeNoteContent(n.id, n.content))
          )
          state.notes = (state.notes as Note[]).map((n) => ({ ...n, content: '' }))
          await vaultStorage.write('notes.json', (state.notes as Note[]).map((n) => ({ ...n, content: '' })))
          console.info(`[vault] Migrated ${notesWithContent.length} note(s) content to separate files`)
        }
      }

      return { state }
    },

    setItem: async (_name: string, value: StorageValue<Partial<RpgStoreState>>): Promise<void> => {
      // Block writes until hydration is complete to prevent overwriting data with empty defaults
      if (!_hydrationComplete) return

      const doWrite = async () => {
        try {
          const state = value.state
          const prev = _lastWrittenState

          // Определяем какие слайсы изменились (сравнение по ссылке)
          const writes: Promise<void>[] = []
          for (const slice of VAULT_SLICES) {
            // Если нет предыдущего состояния — пишем всё (первая запись)
            if (!prev) {
              writes.push(vaultStorage.write(slice.file, slice.getData(state)))
              continue
            }
            // Сравниваем ключи по ссылке
            const newKeys = slice.getKeys(state)
            const oldKeys = slice.getKeys(prev)
            let changed = false
            for (let i = 0; i < newKeys.length; i++) {
              if (newKeys[i] !== oldKeys[i]) {
                changed = true
                break
              }
            }
            if (changed) {
              writes.push(vaultStorage.write(slice.file, slice.getData(state)))
            }
          }

          if (writes.length > 0) {
            await Promise.all(writes)
          }

          _lastWrittenState = state
          _pendingWrite = null
          _firstChangeAt = null
        } catch (err) {
          console.error('[vault] Failed to write state:', err)
        }
      }

      // Debounce writes to avoid excessive disk I/O, but enforce maxWait
      _pendingWrite = doWrite
      if (_writeTimer) clearTimeout(_writeTimer)

      const now = Date.now()
      if (_firstChangeAt === null) _firstChangeAt = now

      const elapsed = now - _firstChangeAt
      if (elapsed >= WRITE_MAX_WAIT_MS) {
        // Превышен maxWait — записать немедленно
        _firstChangeAt = null
        _writeTimer = null
        doWrite()
      } else {
        // Обычный дебаунс, но не дольше оставшегося maxWait
        const delay = Math.min(WRITE_DEBOUNCE_MS, WRITE_MAX_WAIT_MS - elapsed)
        _writeTimer = setTimeout(() => {
          _firstChangeAt = null
          doWrite()
        }, delay)
      }
    },

    removeItem: async (): Promise<void> => {
      // No-op: we don't delete vault files
    },
  }
}

/** Flush any pending debounced vault write immediately */
export function flushVaultWrites() {
  if (_writeTimer) {
    clearTimeout(_writeTimer)
    _writeTimer = null
  }
  _firstChangeAt = null
  if (_pendingWrite) {
    _pendingWrite()
  }
}

// Expose flush for Electron close handler & browser beforeunload
if (typeof window !== 'undefined') {
  (window as any).__flushAndClose = async () => {
    await new Promise<void>((resolve) => {
      if (!_pendingWrite) { resolve(); return }
      if (_writeTimer) {
        clearTimeout(_writeTimer)
        _writeTimer = null
      }
      _firstChangeAt = null
      _pendingWrite().then(resolve).catch(resolve)
    })
    window.close()
  }

  // Для браузера (dev mode) — обычный beforeunload
  window.addEventListener('beforeunload', flushVaultWrites)
}

// Initialize store with default profile if needed (called once after rehydration)
let storeInitialized = false

// Защита от двойной покупки при быстром нажатии
const _purchasingLock = new Set<string>()

export const useRpgStore = create<RpgStoreState>()(
  persist(
    (set, get) => {
      const updateStats = (updater: (s: RpgStoreState['stats']) => Partial<RpgStoreState['stats']>) => {
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
        achievementGroups: [],
        tasks: [],
        achievements: [],
        craftRecipes: [],
        shopItems: [],
        inventory: [],
        purchaseHistory: [],
        usageHistory: [],
        activeShopDiscountPercent: null,
        settings: { ...DEFAULT_SETTINGS },
        _hasHydrated: false,
        stats: {
          totalTasksCompleted: 0,
          totalCoinsEarned: 0,
          totalCoinsSpent: 0,
          totalGemsEarned: 0,
          totalGemsSpent: 0,
          totalItemsCrafted: 0,
          currentStreak: 0,
          bestStreak: 0,
          lastActiveDate: 0,
        },

        setHasHydrated: (v) => set({ _hasHydrated: v }),

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
          get().updateProfile(profile.id, (p) => ({
            ...p,
            currencies: { ...p.currencies, [currencyId]: (p.currencies[currencyId] ?? 0) + amount },
          }))
          if (currencyId === CURRENCY_IDS.COINS) {
            updateStats((s) => ({ totalCoinsEarned: s.totalCoinsEarned + amount }))
          }
          if (currencyId === CURRENCY_IDS.GEMS) {
            updateStats((s) => ({ totalGemsEarned: (s.totalGemsEarned ?? 0) + amount }))
          }
          // Pulse animation on currency icon in header
          if (typeof window !== 'undefined' && amount > 0 && get().settings.toastFloatingRewards !== false) {
            const type = currencyId === CURRENCY_IDS.COINS ? 'coins' : currencyId === CURRENCY_IDS.GEMS ? 'gems' : null
            if (type) {
              const el = document.querySelector(`[data-currency="${type}"]`) as HTMLElement | null
              if (el) {
                el.classList.remove('currency-reward-pulse')
                void el.offsetWidth // force reflow to restart animation
                el.classList.add('currency-reward-pulse')
              }
            }
          }
        },

        deductCurrency: (currencyId, amount) => {
          const profile = get().getActiveProfile()
          if (!profile) return false
          const current = profile.currencies[currencyId] ?? 0
          if (current < amount) return false
          get().updateProfile(profile.id, (p) => {
            const actual = p.currencies[currencyId] ?? 0
            if (actual < amount) return p
            return {
              ...p,
              currencies: { ...p.currencies, [currencyId]: actual - amount },
            }
          })
          if (currencyId === CURRENCY_IDS.COINS) {
            updateStats((s) => ({ totalCoinsSpent: (s.totalCoinsSpent ?? 0) + amount }))
            get().checkAchievements()
          }
          if (currencyId === CURRENCY_IDS.GEMS) {
            updateStats((s) => ({ totalGemsSpent: (s.totalGemsSpent ?? 0) + amount }))
            get().checkAchievements()
          }
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
          // XP всегда начисляется в профиль (и в атрибуты если выбраны)
          const baseXp = task.customXp ?? settings.taskDifficultyXp?.[task.difficulty] ?? TASK_XP_BY_DIFFICULTY[task.difficulty]
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

        getTaskPenaltyPreview: (_task) => {
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

          // XP всегда начисляется в профиль; в атрибуты — только если они выбраны
          const baseXp = task.customXp ?? settings.taskDifficultyXp?.[task.difficulty] ?? TASK_XP_BY_DIFFICULTY[task.difficulty]
          const xpGain = Math.round(baseXp * multiplierFactor)
          const coinGain = Math.round(task.coinReward * multiplierFactor)
          const gemGain = Math.round((task.gemReward ?? 0) * multiplierFactor)

          {
            let currentAttrs = profile.attributes
            if (attrIds.length > 0 && xpGain > 0) {
              for (const attrId of attrIds) {
                const tempProfile = { ...profile, attributes: currentAttrs }
                currentAttrs = addXpToAttribute(tempProfile, attrId, xpGain)
              }
            }
            const profileXp = xpGain > 0 ? addXpToProfile(profile, xpGain) : {}
            updateProfile(profile.id, (p) => ({ ...p, attributes: currentAttrs, ...profileXp }))
          }

          // Add coins
          get().addCurrency(CURRENCY_IDS.COINS, coinGain)

          // Add gems
          if (gemGain > 0) {
            get().addCurrency(CURRENCY_IDS.GEMS, gemGain)
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
            // Instant-задачи НЕ считаются в totalTasksCompleted (для достижений)
            tryRandomFragmentDrop(task.id)

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
              checkAchievements()
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
            checkAchievements()
            return
          }

          // Recurring tasks (daily/weekly/monthly/yearly): сохраняем lastCompletedAt, сбрасываем подзадачи
          if (task.recurrence === 'daily' || task.recurrence === 'weekly' ||
              task.recurrence === 'monthly' || task.recurrence === 'yearly' || task.recurrence === 'custom') {
            updateStats((s) => ({ totalTasksCompleted: s.totalTasksCompleted + 1 }))
            tryRandomFragmentDrop(task.id)

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
              checkAchievements()
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
              checkAchievements()
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
            checkAchievements()
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
          if (task.streakMultiplier) {
            logMultiplierDeactivation(task, 'streak_break')
          }

          const skipHistoryFields = {
            completionHistory: [...(task.completionHistory ?? []), skipRecord].slice(-365),
            currentStreak: 0,
            totalSkipped: (task.totalSkipped ?? 0) + 1,
            // При сбросе стрика снимаем множитель (streak mode или instant mode)
            ...(task.streakMultiplier ? { streakMultiplier: undefined } : {}),
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
              if (rsw?.weeklyMode === 'timesPerWeek') {
                const currentWeek = getStartOfWeek(nowTime)
                if ((rsw.weeklyWeekStart ?? 0) !== currentWeek) {
                  updateTask(task.id, t => ({
                    ...t,
                    currentCycleStart: nowTime,
                    lastCompletedAt: undefined,
                    ...(t.kind === 'counter' ? { current: 0 } : {}),
                    ...(t.kind === 'nested' ? {
                      subtasks: t.subtasks.map(s => ({ ...s, isCompleted: false, completedAt: undefined }))
                    } : {}),
                    recurrenceSettings: {
                      ...t.recurrenceSettings!,
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
              if (xpRwd > 0) {
                let currentAttrs = profile.attributes
                if (attrIds.length > 0) {
                  for (const attrId of attrIds) {
                    const tempProfile = { ...profile, attributes: currentAttrs }
                    currentAttrs = addXpToAttribute(tempProfile, attrId, xpRwd)
                  }
                }
                const profileXp = addXpToProfile(profile, xpRwd)
                updateProfile(profile.id, (p) => ({ ...p, attributes: currentAttrs, ...profileXp }))
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

        // ─── Achievement Groups ──────────────────────────────────────────
        getAchievementGroups: () => {
          const { achievementGroups, activeProfileId } = get()
          return activeProfileId
            ? achievementGroups
                .filter((g) => g.profileId === activeProfileId)
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
            : []
        },

        addAchievementGroup: (name, color) => {
          let profile = get().getActiveProfile()
          if (!profile) {
            const defaultProfile = createDefaultProfile('Моя жизнь')
            set((s) => ({ profiles: [...s.profiles, defaultProfile], activeProfileId: defaultProfile.id }))
            profile = defaultProfile
          }
          const groups = get().getAchievementGroups()
          const sortOrder =
            groups.length === 0 ? 0 : Math.max(...groups.map((g) => g.sortOrder), 0) + 1
          const newGroup: AchievementGroup = {
            id: crypto.randomUUID(),
            profileId: profile.id,
            name: name.trim(),
            icon: '📁',
            color: color ?? '#6b7280',
            sortOrder,
            createdAt: now(),
            updatedAt: now(),
          }
          set((s) => ({ achievementGroups: [...s.achievementGroups, newGroup] }))
          return newGroup
        },

        updateAchievementGroup: (id, updater) => {
          set((s) => ({
            achievementGroups: s.achievementGroups.map((g) =>
              g.id === id ? { ...updater(g), updatedAt: now() } : g
            ),
          }))
        },

        deleteAchievementGroup: (id) => {
          set((s) => ({
            achievementGroups: s.achievementGroups.filter((g) => g.id !== id),
            achievements: s.achievements.map((a) =>
              a.groupId === id ? { ...a, groupId: null } : a
            ),
          }))
        },

        reorderAchievementGroups: (orderedIds) => {
          const { achievementGroups, activeProfileId } = get()
          if (!activeProfileId) return
          const idSet = new Set(orderedIds)
          const reordered = orderedIds
            .map((id, index) => {
              const g = achievementGroups.find((g) => g.id === id && g.profileId === activeProfileId)
              return g ? { ...g, sortOrder: index, updatedAt: now() } : null
            })
            .filter((g): g is AchievementGroup => g != null)
          const rest = achievementGroups.filter((g) => g.profileId === activeProfileId && !idSet.has(g.id))
          const maxSo = reordered.length - 1
          rest.forEach((g, i) => reordered.push({ ...g, sortOrder: maxSo + 1 + i, updatedAt: now() }))
          set((s) => ({
            achievementGroups: s.achievementGroups.filter((g) => g.profileId !== activeProfileId).concat(reordered),
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
          const groupId = achievement.groupId ?? null
          const maxSortOrder = get().achievements
            .filter((a) => a.profileId === profile.id && (a.groupId ?? null) === groupId)
            .reduce((max, a) => Math.max(max, a.sortOrder ?? 0), -1)
          const newAchievement: Achievement = {
            ...achievement,
            id: crypto.randomUUID(),
            profileId: profile.id,
            unlocked: false,
            currentProgress: 0,
            sortOrder: maxSortOrder + 1,
            createdAt: now(),
            updatedAt: now(),
          }
          set((s) => ({ achievements: [...s.achievements, newAchievement] }))
          get().checkAchievements()
          return newAchievement
        },

        updateAchievement: (id, updater) => {
          set((s) => ({
            achievements: s.achievements.map((a) => (a.id === id ? { ...updater(a), updatedAt: now() } : a)),
          }))
        },

        deleteAchievement: (id) => set((s) => ({ achievements: s.achievements.filter((a) => a.id !== id) })),

        reorderAchievements: (orderedIds) => {
          set((s) => ({
            achievements: s.achievements.map((a) => {
              const idx = orderedIds.indexOf(a.id)
              if (idx === -1) return a
              return { ...a, sortOrder: idx, updatedAt: now() }
            }),
          }))
        },

        markAchievementReady: (id) => {
          get().updateAchievement(id, (a) => ({ ...a, readyToUnlock: true }))
        },

        checkAchievements: () => {
          const { achievements, stats, getAttributes, tasks, usageHistory } = get()
          const attributes = getAttributes()
          const todayStart = getTodayStart()

          achievements.forEach((ach) => {
            if (ach.unlocked && !ach.repeatable) return

            let progress = 0
            const target = ach.condition.targetValue ?? 0

            switch (ach.condition.type) {
              case 'tasks_completed':
                progress = stats.totalTasksCompleted
                break
              case 'attribute_level': {
                const attr = attributes.find((a) => a.id === ach.condition.attributeId)
                progress = attr?.level ?? 0
                break
              }
              case 'coins_earned_spent':
                progress = ach.condition.coinMode === 'spent'
                  ? (stats.totalCoinsSpent ?? 0)
                  : stats.totalCoinsEarned
                break
              case 'gems_earned_spent':
                progress = ach.condition.coinMode === 'spent'
                  ? (stats.totalGemsSpent ?? 0)
                  : (stats.totalGemsEarned ?? 0)
                break
              case 'task_completed_today': {
                const task = tasks.find((t) => t.id === ach.condition.taskId)
                if (!task) return
                progress = (task.completionHistory ?? []).filter(
                  (r) => r.status === 'completed' && r.completedAt && r.completedAt >= todayStart
                ).length
                break
              }
              case 'task_completed_total': {
                const taskTotal = tasks.find((t) => t.id === ach.condition.taskId)
                if (!taskTotal) return
                progress = (taskTotal.completionHistory ?? []).filter(
                  (r) => r.status === 'completed'
                ).length
                break
              }
              case 'task_streak': {
                const taskStreak = tasks.find((t) => t.id === ach.condition.taskId)
                if (!taskStreak) return
                progress = taskStreak.currentStreak ?? 0
                break
              }
              case 'item_used': {
                const itemId = ach.condition.itemId
                if (!itemId) return
                const USAGE_ACTIONS = new Set(['used', 'opened_lootbox', 'activated_discount', 'activated_multiplier'])
                progress = usageHistory.filter(
                  (e) => e.itemId === itemId && USAGE_ACTIONS.has(e.action)
                ).length
                break
              }
              case 'condition_checked': {
                const cId = ach.condition.conditionId
                if (!cId) return
                progress = get().getConditionTotalChecked(cId)
                break
              }
              case 'custom':
                // Manual unlock only
                return
            }

            // Update progress (ensure valid number)
            const safeProgress = Number.isFinite(progress) ? progress : 0
            const ready = target > 0 && safeProgress >= target
            const wasReady = ach.readyToUnlock
            get().updateAchievement(ach.id, (a) => ({ ...a, currentProgress: safeProgress, readyToUnlock: ready }))

            // Fire toast when achievement just became ready
            if (ready && !wasReady) {
              const { shopItems: items } = get()
              const rewardItems = ach.rewardItems?.length
                ? ach.rewardItems
                : ach.rewardItemId
                  ? [{ itemId: ach.rewardItemId, quantity: ach.rewardItemQuantity ?? 1 }]
                  : []
              const toastItems = rewardItems
                .map((ri) => {
                  const item = items.find((i) => i.id === ri.itemId)
                  return item ? { name: item.name, emoji: item.icon, quantity: ri.quantity } : null
                })
                .filter(Boolean) as { name: string; emoji?: string; quantity: number }[]

              rpgToast({
                title: ach.title,
                description: 'Можно забрать награду!',
                type: 'achievement_complete',
                coins: ach.rewardCoins,
                xp: ach.rewardXp,
                gems: ach.rewardGems,
                items: toastItems.length > 0 ? toastItems : undefined,
                duration: 6000,
              })
            }
          })
        },

        unlockAchievement: (id) => {
          const { achievements, addCurrency, addToInventory, shopItems, updateShopItem } = get()
          const ach = achievements.find((a) => a.id === id)
          if (!ach) return
          // Для неповторяемых — не разблокировать повторно
          if (!ach.repeatable && ach.unlocked) return

          // Give coins & gems
          if (ach.rewardCoins > 0) addCurrency(CURRENCY_IDS.COINS, ach.rewardCoins)
          if (ach.rewardGems > 0) addCurrency(CURRENCY_IDS.GEMS, ach.rewardGems)

          // Give XP to attribute + profile
          if (ach.rewardXp > 0) {
            const profile = get().getActiveProfile()
            if (profile) {
              const nextAttrs = ach.rewardAttributeId
                ? addXpToAttribute(profile, ach.rewardAttributeId, ach.rewardXp)
                : profile.attributes
              const profileXp = addXpToProfile(profile, ach.rewardXp)
              set((s) => ({
                profiles: s.profiles.map((p) =>
                  p.id === profile.id ? { ...p, attributes: nextAttrs, ...profileXp } : p
                ),
              }))
            }
          }

          // Give item rewards (with stock/compensation logic)
          // Support both new rewardItems[] and legacy rewardItemId
          const itemsToGive: { itemId: string; quantity: number }[] = ach.rewardItems?.length
            ? ach.rewardItems
            : ach.rewardItemId
              ? [{ itemId: ach.rewardItemId, quantity: ach.rewardItemQuantity ?? 1 }]
              : []

          const givenItems: { name: string; emoji?: string; quantity: number }[] = []
          const compensations: { name: string; coins: number; gems: number; reason: 'out_of_stock' | 'duplicate' }[] = []

          for (const ri of itemsToGive) {
            const item = shopItems.find((i) => i.id === ri.itemId)
            if (!item) continue
            const qty = ri.quantity

            // Медиа-предмет уже в инвентаре — компенсация 80% (только если для продажи)
            const isMediaItem = item.isVideoGame || item.isTvSerial
            const alreadyOwned = isMediaItem && get().inventory.some((e) => e.itemId === ri.itemId)
            if (isMediaItem && alreadyOwned) {
              let compCoins = 0, compGems = 0
              if (item.availableForPurchase !== false) {
                const coinCost = item.cost?.[CURRENCY_IDS.COINS] ?? 0
                const gemCost = item.cost?.[CURRENCY_IDS.GEMS] ?? 0
                compCoins = Math.floor(coinCost * 0.8)
                compGems = Math.floor(gemCost * 0.8)
                if (compCoins > 0) addCurrency(CURRENCY_IDS.COINS, compCoins)
                if (compGems > 0) addCurrency(CURRENCY_IDS.GEMS, compGems)
              }
              compensations.push({ name: item.name, coins: compCoins, gems: compGems, reason: 'duplicate' })
              continue
            }

            // Проверка запаса: недостаточно — выдать доступное + компенсация 80% за дефицит (только если для продажи)
            if (item.stock !== undefined && item.stock < qty) {
              const available = Math.max(0, item.stock)
              if (available > 0) {
                addToInventory(ri.itemId, available)
                updateShopItem(ri.itemId, (prev) => ({ ...prev, stock: Math.max(0, (prev.stock ?? 0) - available) }))
                givenItems.push({ name: item.name, emoji: item.icon, quantity: available })
              }
              const deficit = qty - available
              let compCoins = 0, compGems = 0
              if (item.availableForPurchase !== false) {
                const coinCost = item.cost?.[CURRENCY_IDS.COINS] ?? 0
                const gemCost = item.cost?.[CURRENCY_IDS.GEMS] ?? 0
                compCoins = Math.floor(coinCost * 0.8) * deficit
                compGems = Math.floor(gemCost * 0.8) * deficit
                if (compCoins > 0) addCurrency(CURRENCY_IDS.COINS, compCoins)
                if (compGems > 0) addCurrency(CURRENCY_IDS.GEMS, compGems)
              }
              compensations.push({ name: item.name, coins: compCoins, gems: compGems, reason: 'out_of_stock' })
            } else {
              addToInventory(ri.itemId, qty)
              givenItems.push({ name: item.name, emoji: item.icon, quantity: qty })
              // Вычесть из запаса магазина
              if (item.stock !== undefined) {
                updateShopItem(ri.itemId, (prev) => ({ ...prev, stock: Math.max(0, (prev.stock ?? 0) - qty) }))
              }
            }
          }

          // Mark as unlocked (or reset for repeatable)
          if (ach.repeatable) {
            get().updateAchievement(id, (a) => ({
              ...a,
              unlocked: false,
              readyToUnlock: false,
              currentProgress: 0,
              completionCount: (a.completionCount ?? 0) + 1,
              unlockedAt: now(),
            }))
          } else {
            get().updateAchievement(id, (a) => ({ ...a, unlocked: true, readyToUnlock: false, unlockedAt: now() }))
          }

          return { givenItems, compensations }
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
            fragmentColor: '#9ca3af',
            resultIcon: recipe.fragmentIcon,
            resultItemId: '' as ItemId,
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
          const { craftRecipes, addToInventory, deductCurrency, getCurrency, checkAchievements, addCurrency, inventory, shopItems, updateShopItem, activeProfileId } = get()
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

          // Log craft to usage history
          if (activeProfileId && recipe.resultItemId) {
            const resultItem = shopItems.find((i) => i.id === recipe.resultItemId)
            addUsageEntry({
              profileId: activeProfileId,
              itemId: recipe.resultItemId,
              itemName: resultItem?.name ?? recipe.fragmentName,
              action: 'crafted' as const,
              recipeName: recipe.fragmentName,
            })
          }

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
          const { shopItems, deductCurrency, addCurrency, addToInventory, activeShopDiscountPercent, activeProfileId, updateShopItem, getCurrency } = get()
          const item = shopItems.find((i) => i.id === itemId)
          if (!item) return false
          if (item.availableForPurchase === false) return false
          if (item.stock !== undefined && item.stock <= 0) return false

          const coinCost = item.cost?.[CURRENCY_IDS.COINS] ?? 0
          const gemCost = item.cost?.[CURRENCY_IDS.GEMS] ?? 0
          const effectiveCoinCost =
            activeShopDiscountPercent != null && coinCost > 0
              ? Math.round(coinCost * (1 - activeShopDiscountPercent / 100))
              : coinCost
          const effectiveGemCost = gemCost // скидка не применяется к кристаллам
          const effectiveCosts = { ...item.cost, [CURRENCY_IDS.COINS]: effectiveCoinCost, [CURRENCY_IDS.GEMS]: effectiveGemCost }

          for (const [currencyId, cost] of Object.entries(effectiveCosts)) {
            if (getCurrency(currencyId as CurrencyId) < cost) return false
          }

          for (const [currencyId, cost] of Object.entries(effectiveCosts)) {
            deductCurrency(currencyId as CurrencyId, cost)
          }

          set(() => ({ activeShopDiscountPercent: null }))

          if (activeProfileId) {
            set((s) => ({
              purchaseHistory: [
                ...s.purchaseHistory,
                { profileId: activeProfileId, itemId: item.id, itemName: item.name, timestamp: now() },
              ].slice(-500),
            }))
          }

          if (item.isLootBox) {
            if (item.stock !== undefined && item.stock > 0) {
              updateShopItem(itemId, (prev) => ({
                ...prev,
                stock: (prev.stock ?? 1) - 1,
              }))
            }
            addToInventory(itemId)
            return true
          }

          if (item.isVideoGame || item.isTvSerial) {
            const alreadyOwned = get().inventory.some((e) => e.itemId === itemId)
            if (alreadyOwned) {
              // Уже есть в инвентаре — компенсация 80%
              const coinCost = item.cost?.[CURRENCY_IDS.COINS] ?? 0
              const gemCost = item.cost?.[CURRENCY_IDS.GEMS] ?? 0
              const compCoins = Math.floor(coinCost * 0.8)
              const compGems = Math.floor(gemCost * 0.8)
              if (compCoins > 0) addCurrency(CURRENCY_IDS.COINS, compCoins)
              if (compGems > 0) addCurrency(CURRENCY_IDS.GEMS, compGems)
              return true
            }
            updateShopItem(itemId, (prev) => ({ ...prev, basePurchased: true }))
            addToInventory(itemId)
            return true
          }

          // Decrement stock for limited items
          if (item.stock !== undefined && item.stock > 0) {
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
            return { itemId: 'empty', name: `Пусто (компенсация 🪙 ${comp})`, compensated: true, compensationLabel: `🪙 ${comp}`, lootCoins: comp }
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
                return {
                  itemId: entry.id, name,
                  lootCoins: entry.id === CURRENCY_IDS.COINS ? qty : undefined,
                  lootGems: entry.id === CURRENCY_IDS.GEMS ? qty : undefined,
                }
              } else {
                const resultItem = get().shopItems.find((i) => i.id === entry.id)
                const isMediaItem = resultItem?.isVideoGame || resultItem?.isTvSerial
                const alreadyOwned = isMediaItem && inventory.some((e) => e.itemId === entry.id)

                if (isMediaItem && alreadyOwned) {
                  // Already owned media item — give 80% compensation (only if purchasable)
                  const name = resultItem?.name ?? 'Награда'
                  if (resultItem?.availableForPurchase === false) {
                    return { itemId: entry.id, name, compensated: true, compensationLabel: '—', compensationReason: 'duplicate' as const }
                  }
                  const coinCost = resultItem?.cost[CURRENCY_IDS.COINS] ?? 0
                  const gemCost = resultItem?.cost[CURRENCY_IDS.GEMS] ?? 0
                  const compCoins = Math.floor(coinCost * 0.8)
                  const compGems = Math.floor(gemCost * 0.8)
                  if (compCoins > 0) addCurrency(CURRENCY_IDS.COINS, compCoins)
                  if (compGems > 0) addCurrency(CURRENCY_IDS.GEMS, compGems)
                  const compParts: string[] = []
                  if (compCoins > 0) compParts.push(`🪙 ${compCoins}`)
                  if (compGems > 0) compParts.push(`💎 ${compGems}`)
                  return { itemId: entry.id, name, compensated: true, compensationLabel: compParts.join(' + ') || '—', compensationReason: 'duplicate' as const, lootCoins: compCoins || undefined, lootGems: compGems || undefined }
                }

                // Stock check — if item has stock and it's insufficient, compensate 80% (only if purchasable)
                if (resultItem && resultItem.stock !== undefined && resultItem.stock < qty) {
                  const available = Math.max(0, resultItem.stock)
                  if (available > 0) {
                    addToInventory(entry.id, available)
                    updateShopItem(entry.id, (prev) => ({ ...prev, stock: Math.max(0, (prev.stock ?? 0) - available) }))
                  }
                  const name = resultItem.name
                  // Предмет не для продажи — никакой компенсации
                  if (resultItem.availableForPurchase === false) {
                    if (available === 0) {
                      return { itemId: entry.id, name, compensated: true, compensationLabel: '—', compensationReason: 'out_of_stock' as const }
                    }
                    return { itemId: entry.id, name: `${name} x${available}`, compensated: true, compensationLabel: `${name} x${available}`, compensationReason: 'out_of_stock' as const }
                  }
                  const deficit = qty - available
                  const coinCost = resultItem.cost[CURRENCY_IDS.COINS] ?? 0
                  const gemCost = resultItem.cost[CURRENCY_IDS.GEMS] ?? 0
                  const compCoins = Math.floor(coinCost * 0.8) * deficit
                  const compGems = Math.floor(gemCost * 0.8) * deficit
                  if (compCoins > 0) addCurrency(CURRENCY_IDS.COINS, compCoins)
                  if (compGems > 0) addCurrency(CURRENCY_IDS.GEMS, compGems)
                  if (available === 0) {
                    const compParts: string[] = []
                    if (compCoins > 0) compParts.push(`🪙 ${compCoins}`)
                    if (compGems > 0) compParts.push(`💎 ${compGems}`)
                    return { itemId: entry.id, name, compensated: true, compensationLabel: compParts.join(' + ') || '—', compensationReason: 'out_of_stock' as const, lootCoins: compCoins || undefined, lootGems: compGems || undefined }
                  }
                  const partialCompParts: string[] = [`${name} x${available}`]
                  if (compCoins > 0) partialCompParts.push(`🪙 ${compCoins}`)
                  if (compGems > 0) partialCompParts.push(`💎 ${compGems}`)
                  return { itemId: entry.id, name, compensated: true, compensationLabel: partialCompParts.join(' + '), compensationReason: 'out_of_stock' as const, lootCoins: compCoins || undefined, lootGems: compGems || undefined }
                }

                addToInventory(entry.id, qty)

                // Decrease stock if item has stock tracking
                if (resultItem && resultItem.stock !== undefined) {
                  updateShopItem(entry.id, (prev) => ({ ...prev, stock: Math.max(0, (prev.stock ?? 0) - qty) }))
                }

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

        useItem: (itemId, quantity = 1) => {
          const { shopItems, inventory, removeFromInventory, openLootbox, activeProfileId, checkAchievements } = get()
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
                lootCoins: loot?.lootCoins,
                lootGems: loot?.lootGems,
              })
            }
            checkAchievements()
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
            checkAchievements()
            return true
          }

          // Streak multiplier: don't consume yet — return signal to open task selection modal
          if (item.streakMultiplierEnabled) {
            return { multiplier: true as const, itemId }
          }

          // Generic usage (non-lootbox, non-discount, non-multiplier)
          const useQty = Math.min(quantity, invEntry.quantity)
          if (activeProfileId) {
            addUsageEntry({
              profileId: activeProfileId,
              itemId,
              itemName: item.name,
              action: 'used' as const,
              ...(useQty > 1 ? { quantity: useQty } : {}),
            })
          }

          const result = removeFromInventory(itemId, useQty)
          checkAchievements()
          return result
        },

        applyStreakMultiplier: (taskId, itemId) => {
          const { tasks, shopItems, updateTask, removeFromInventory, activeProfileId, checkAchievements } = get()
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
          checkAchievements()
          return true
        },

        // ─── Daily Conditions ────────────────────────────────────────────

        dailyConditions: [],
        dailyConditionEntries: [],

        getDailyConditions: () => {
          const { dailyConditions, activeProfileId } = get()
          return (dailyConditions ?? []).filter((c) => c.profileId === activeProfileId)
        },

        getConditionsForDate: (dateKey) => {
          const { dailyConditions, activeProfileId } = get()
          return (dailyConditions ?? []).filter((c) =>
            c.profileId === activeProfileId &&
            c.activeFrom <= dateKey &&
            (c.activeUntil === null || c.activeUntil >= dateKey)
          )
        },

        addDailyCondition: (name, icon) => {
          const today = new Date()
          const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          const condition: DailyCondition = {
            id: crypto.randomUUID(),
            profileId: get().activeProfileId!,
            name,
            icon: icon ?? '✅',
            activeFrom: dateKey,
            activeUntil: null,
            createdAt: now(),
            updatedAt: now(),
          }
          set((s) => ({ dailyConditions: [...(s.dailyConditions ?? []), condition] }))
          return condition
        },

        deleteDailyCondition: (id) => {
          const today = new Date()
          const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          set((s) => ({
            dailyConditions: (s.dailyConditions ?? []).map((c) =>
              c.id === id ? { ...c, activeUntil: dateKey, updatedAt: now() } : c
            ),
          }))
        },

        toggleConditionEntry: (conditionId, dateKey) => {
          set((s) => {
            const entries = s.dailyConditionEntries ?? []
            const existing = entries.find(
              (e) => e.conditionId === conditionId && e.dateKey === dateKey
            )
            if (existing) {
              return {
                dailyConditionEntries: entries.map((e) =>
                  e.conditionId === conditionId && e.dateKey === dateKey
                    ? { ...e, checked: !e.checked }
                    : e
                ),
              }
            }
            return {
              dailyConditionEntries: [...entries, {
                conditionId,
                dateKey,
                checked: true,
              }],
            }
          })
          get().checkAchievements()
        },

        getConditionEntries: (dateKey) => {
          return (get().dailyConditionEntries ?? []).filter((e) => e.dateKey === dateKey)
        },

        getConditionTotalChecked: (conditionId) => {
          return (get().dailyConditionEntries ?? []).filter(
            (e) => e.conditionId === conditionId && e.checked
          ).length
        },

        getConditionStats: (conditionId) => {
          const condition = (get().dailyConditions ?? []).find((c) => c.id === conditionId)
          if (!condition) return { totalDays: 0, checkedDays: 0, missedDays: 0, currentStreak: 0, bestStreak: 0, history: {} }

          const entries = (get().dailyConditionEntries ?? []).filter((e) => e.conditionId === conditionId)
          const checkedSet = new Set(entries.filter((e) => e.checked).map((e) => e.dateKey))

          // Build date range from activeFrom to today (or activeUntil)
          const today = new Date()
          const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          const endDate = condition.activeUntil && condition.activeUntil < todayKey ? condition.activeUntil : todayKey

          const history: Record<string, boolean> = {}
          let totalDays = 0
          let checkedDays = 0
          let currentStreak = 0
          let bestStreak = 0
          let streak = 0

          // Iterate day by day (today is shown but not counted as missed — day isn't over yet)
          const cur = new Date(condition.activeFrom + 'T00:00:00')
          const end = new Date(endDate + 'T00:00:00')
          while (cur <= end) {
            const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
            const checked = checkedSet.has(key)
            const isToday = key === todayKey
            history[key] = checked
            if (!isToday) {
              // Only count completed past days toward stats
              totalDays++
              if (checked) {
                checkedDays++
                streak++
                if (streak > bestStreak) bestStreak = streak
              } else {
                streak = 0
              }
            } else {
              // Today: count toward streak if checked, but don't break streak if not
              if (checked) {
                streak++
                if (streak > bestStreak) bestStreak = streak
              }
            }
            cur.setDate(cur.getDate() + 1)
          }
          currentStreak = streak

          return { totalDays, checkedDays, missedDays: totalDays - checkedDays, currentStreak, bestStreak, history }
        },

        // ─── Reflection (Notes + Daily Reports) ──────────────────────────

        noteFolders: [],
        notes: [],
        dailyReports: [],

        getNoteFolders: () => {
          const { noteFolders, activeProfileId } = get()
          return noteFolders
            .filter((f) => f.profileId === activeProfileId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        },

        addNoteFolder: (name, icon = '📁', color = '#14b8a6') => {
          const { activeProfileId, noteFolders } = get()
          const folder: NoteFolder = {
            id: crypto.randomUUID(),
            profileId: activeProfileId!,
            name,
            icon,
            color,
            sortOrder: noteFolders.filter((f) => f.profileId === activeProfileId).length,
            createdAt: now(),
            updatedAt: now(),
          }
          set({ noteFolders: [...noteFolders, folder] })
          return folder
        },

        updateNoteFolder: (id, updater) => {
          set((s) => ({
            noteFolders: s.noteFolders.map((f) =>
              f.id === id ? { ...updater(f), updatedAt: now() } : f
            ),
          }))
        },

        deleteNoteFolder: (id) => {
          set((s) => ({
            noteFolders: s.noteFolders.filter((f) => f.id !== id),
            // Перемещаем заметки в «без папки»
            notes: s.notes.map((n) => (n.folderId === id ? { ...n, folderId: null } : n)),
          }))
        },

        reorderNoteFolders: (orderedIds) => {
          set((s) => ({
            noteFolders: s.noteFolders.map((f) => {
              const idx = orderedIds.indexOf(f.id)
              return idx >= 0 ? { ...f, sortOrder: idx } : f
            }),
          }))
        },

        getNotes: () => {
          const { notes, activeProfileId } = get()
          return notes
            .filter((n) => n.profileId === activeProfileId)
            .sort((a, b) => {
              // Pinned first, then by updatedAt desc
              if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
              return b.updatedAt - a.updatedAt
            })
        },

        addNote: (partial) => {
          const { activeProfileId, notes } = get()
          const folderId = partial.folderId ?? null
          const content = partial.content ?? ''
          // sortOrder: поставить в начало (минимальный sortOrder - 1)
          const sameFolderNotes = notes.filter((n) => n.profileId === activeProfileId && n.folderId === folderId && !n.deletedAt)
          const minOrder = sameFolderNotes.length > 0 ? Math.min(...sameFolderNotes.map((n) => n.sortOrder ?? 0)) : 0
          const note: Note = {
            id: crypto.randomUUID(),
            profileId: activeProfileId!,
            folderId,
            title: partial.title,
            content,
            excerpt: '',
            tags: [],
            mediaFiles: [],
            linkedTaskIds: partial.linkedTaskIds ?? [],
            linkedItemIds: partial.linkedItemIds ?? [],
            pinned: false,
            sortOrder: minOrder - 1,
            deletedAt: null,
            createdAt: now(),
            updatedAt: now(),
          }
          set({ notes: [...notes, note] })
          return note
        },

        updateNote: (id, updater) => {
          const oldNote = get().notes.find((n) => n.id === id)
          if (!oldNote) return

          const updated = { ...updater(oldNote), updatedAt: now() }

          // Write content to separate file (fire-and-forget)
          if (updated.content !== undefined && updated.content.length > 0) {
            vaultStorage.writeNoteContent(id, updated.content).catch((err) =>
              console.error('[vault] Failed to write note content:', err)
            )
          }

          // Store only metadata — content stays in separate file
          set((s) => ({
            notes: s.notes.map((n) =>
              n.id === id ? { ...updated, content: '' } : n
            ),
          }))
        },

        deleteNote: (id) => {
          // Soft delete — переместить в корзину
          set((s) => ({
            notes: s.notes.map((n) =>
              n.id === id ? { ...n, deletedAt: now(), updatedAt: now() } : n
            ),
          }))
        },

        restoreNote: (id) => {
          set((s) => ({
            notes: s.notes.map((n) =>
              n.id === id ? { ...n, deletedAt: null, updatedAt: now() } : n
            ),
          }))
        },

        permanentDeleteNote: (id) => {
          const note = get().notes.find((n) => n.id === id)
          if (note) {
            // Clean up media files from disk
            for (const mediaPath of note.mediaFiles) {
              vaultStorage.deleteMedia(mediaPath).catch(() => {})
            }
            // Clean up content file
            vaultStorage.deleteNoteContent(id).catch(() => {})
          }
          set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
        },

        emptyTrash: () => {
          const { activeProfileId, notes } = get()
          // Clean up media and content files for all trashed notes
          for (const note of notes) {
            if (note.profileId === activeProfileId && note.deletedAt) {
              for (const mediaPath of note.mediaFiles) {
                vaultStorage.deleteMedia(mediaPath).catch(() => {})
              }
              vaultStorage.deleteNoteContent(note.id).catch(() => {})
            }
          }
          set((s) => ({
            notes: s.notes.filter((n) => !(n.profileId === activeProfileId && n.deletedAt)),
          }))
        },

        reorderNotes: (orderedIds) => {
          set((s) => ({
            notes: s.notes.map((n) => {
              const idx = orderedIds.indexOf(n.id)
              return idx >= 0 ? { ...n, sortOrder: idx } : n
            }),
          }))
        },

        getDailyReports: () => {
          const { dailyReports, activeProfileId } = get()
          return dailyReports
            .filter((r) => r.profileId === activeProfileId)
            .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
        },

        getDailyReport: (dateKey) => {
          const { dailyReports, activeProfileId } = get()
          return dailyReports.find((r) => r.profileId === activeProfileId && r.dateKey === dateKey) ?? null
        },

        setDailyMood: (dateKey, mood) => {
          set((s) => {
            const existing = s.dailyReports.find((r) => r.profileId === s.activeProfileId && r.dateKey === dateKey)
            if (existing) {
              return {
                dailyReports: s.dailyReports.map((r) =>
                  r.id === existing.id ? { ...r, mood, updatedAt: now() } : r
                ),
              }
            }
            const snapshot = get().generateDailySnapshot(dateKey)
            return {
              dailyReports: [...s.dailyReports, {
                id: crypto.randomUUID(),
                profileId: s.activeProfileId!,
                dateKey,
                mood,
                thoughts: '',
                photos: [],
                snapshot,
                createdAt: now(),
                updatedAt: now(),
              }],
            }
          })
        },

        setDailyThoughts: (dateKey, thoughts) => {
          set((s) => {
            const existing = s.dailyReports.find((r) => r.profileId === s.activeProfileId && r.dateKey === dateKey)
            if (existing) {
              return {
                dailyReports: s.dailyReports.map((r) =>
                  r.id === existing.id ? { ...r, thoughts, updatedAt: now() } : r
                ),
              }
            }
            const snapshot = get().generateDailySnapshot(dateKey)
            return {
              dailyReports: [...s.dailyReports, {
                id: crypto.randomUUID(),
                profileId: s.activeProfileId!,
                dateKey,
                mood: null,
                thoughts,
                photos: [],
                snapshot,
                createdAt: now(),
                updatedAt: now(),
              }],
            }
          })
        },

        addDailyPhoto: (dateKey, mediaPath) => {
          set((s) => {
            const existing = s.dailyReports.find((r) => r.profileId === s.activeProfileId && r.dateKey === dateKey)
            if (existing) {
              return {
                dailyReports: s.dailyReports.map((r) =>
                  r.id === existing.id ? { ...r, photos: [...(r.photos ?? []), mediaPath], updatedAt: now() } : r
                ),
              }
            }
            const snapshot = get().generateDailySnapshot(dateKey)
            return {
              dailyReports: [...s.dailyReports, {
                id: crypto.randomUUID(),
                profileId: s.activeProfileId!,
                dateKey,
                mood: null,
                thoughts: '',
                photos: [mediaPath],
                snapshot,
                createdAt: now(),
                updatedAt: now(),
              }],
            }
          })
        },

        removeDailyPhoto: (dateKey, mediaPath) => {
          set((s) => {
            const existing = s.dailyReports.find((r) => r.profileId === s.activeProfileId && r.dateKey === dateKey)
            if (!existing) return s
            return {
              dailyReports: s.dailyReports.map((r) =>
                r.id === existing.id ? { ...r, photos: (r.photos ?? []).filter((p) => p !== mediaPath), updatedAt: now() } : r
              ),
            }
          })
        },

        generateDailySnapshot: (dateKey) => {
          const state = get()
          const pid = state.activeProfileId
          // Parse day boundaries
          const [y, m, d] = dateKey.split('-').map(Number)
          const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
          const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999).getTime()

          // Tasks completed that day
          const profileTasks = state.tasks.filter((t) => t.profileId === pid)
          type TaskEntry = {
            taskId: string; title: string; count: number; groupId: string | null
            xpEarned: number; coinsEarned: number; gemsEarned: number
            subtasks?: { title: string; xpEarned?: number; coinReward?: number; gemReward?: number }[]
          }
          const taskMap = new Map<string, TaskEntry>()
          for (const task of profileTasks) {
            const records = (task.completionHistory ?? []).filter(
              (r) => r.status === 'completed' && r.completedAt && r.completedAt >= dayStart && r.completedAt <= dayEnd
            )
            if (records.length > 0) {
              let taskXp = 0, taskCoins = 0, taskGems = 0
              const allSubtasks: TaskEntry['subtasks'] = []
              for (const r of records) {
                taskXp += r.xpEarned ?? 0
                taskCoins += r.coinsEarned ?? 0
                taskGems += r.gemsEarned ?? 0
                if (r.completedSubtasks) {
                  for (const s of r.completedSubtasks) {
                    if (s.isCompleted) {
                      allSubtasks.push({ title: s.title, xpEarned: s.xpEarned, coinReward: s.coinReward, gemReward: s.gemReward })
                      // Include subtask rewards in parent totals
                      taskXp += s.xpEarned ?? 0
                      taskCoins += s.coinReward ?? 0
                      taskGems += s.gemReward ?? 0
                    }
                  }
                }
              }
              taskMap.set(task.id, {
                taskId: task.id,
                title: task.title,
                count: records.length,
                groupId: task.groupId ?? null,
                xpEarned: taskXp,
                coinsEarned: taskCoins,
                gemsEarned: taskGems,
                subtasks: allSubtasks.length > 0 ? allSubtasks : undefined,
              })
            }
          }

          // Group tasks by groupId
          const groupMap = new Map<string | null, TaskEntry[]>()
          for (const t of taskMap.values()) {
            const arr = groupMap.get(t.groupId) ?? []
            arr.push(t)
            groupMap.set(t.groupId, arr)
          }

          const tasksCompleted = Array.from(groupMap.entries()).map(([groupId, tasks]) => {
            const group = groupId ? state.taskGroups.find((g) => g.id === groupId) : null
            return {
              groupId,
              groupName: group?.name ?? 'Без группы',
              tasks: tasks.map(({ taskId, title, count, xpEarned: txp, coinsEarned: tc, gemsEarned: tg, subtasks: sub }) => ({
                taskId, title, count, xpEarned: txp, coinsEarned: tc, gemsEarned: tg, subtasks: sub,
              })),
            }
          })

          let totalTasksCompleted = 0
          for (const g of tasksCompleted) {
            for (const t of g.tasks) totalTasksCompleted += t.count
          }

          // Purchases — with cost and detail info
          type PurchaseEntry = { itemId: string; name: string; count: number; totalCost: number; details?: string }
          const purchaseMap = new Map<string, PurchaseEntry>()
          for (const p of state.purchaseHistory) {
            if (p.profileId === pid && p.timestamp >= dayStart && p.timestamp <= dayEnd) {
              const item = state.shopItems.find((si) => si.id === p.itemId)
              let cost = 0
              let detail: string | undefined

              if (p.packageName) {
                // Game time package purchase
                const pkg = item?.gameTimePackages?.find((pk) => `${pk.hours} ч` === p.packageName || pk.id === p.packageName)
                cost = pkg?.cost ?? item?.cost?.coins ?? 0
                detail = 'покупка часов'
              } else if (p.seasonNumber != null && p.episodeNumber != null) {
                // Serial episode purchase
                const season = item?.serialSeasons?.find((s) => s.number === p.seasonNumber)
                const episode = season?.episodes.find((e) => e.number === p.episodeNumber)
                cost = episode?.cost ?? item?.cost?.coins ?? 0
                detail = 'покупка серии'
              } else {
                cost = item?.cost?.coins ?? 0
              }

              const key = `${p.itemId}:${detail ?? 'base'}`
              const existing = purchaseMap.get(key)
              if (existing) {
                existing.count++
                existing.totalCost += cost
              } else {
                purchaseMap.set(key, { itemId: p.itemId, name: p.itemName, count: 1, totalCost: cost, details: detail })
              }
            }
          }

          // Usage
          const usageMap = new Map<string, { itemId: string; name: string; count: number }>()
          for (const u of state.usageHistory) {
            if (u.profileId === pid && u.timestamp >= dayStart && u.timestamp <= dayEnd && u.action === 'used') {
              const existing = usageMap.get(u.itemId)
              if (existing) existing.count++
              else usageMap.set(u.itemId, { itemId: u.itemId, name: u.itemName, count: 1 })
            }
          }

          // Achievements unlocked — with rewards
          const achievementsUnlocked = state.achievements
            .filter((a) => a.profileId === pid && a.unlockedAt && a.unlockedAt >= dayStart && a.unlockedAt <= dayEnd)
            .map((a) => ({
              achievementId: a.id, title: a.title, icon: a.icon,
              repeatable: a.repeatable, completionCount: a.completionCount,
              rewardXp: a.rewardXp ?? 0, rewardCoins: a.rewardCoins ?? 0, rewardGems: a.rewardGems ?? 0,
            }))

          // XP, coins & gems from all sources
          let xpEarned = 0
          let coinsEarned = 0
          let gemsEarned = 0
          let coinsSpent = 0
          let gemsSpent = 0
          // Tasks + subtasks
          for (const task of profileTasks) {
            for (const r of task.completionHistory ?? []) {
              if (r.status === 'completed' && r.completedAt && r.completedAt >= dayStart && r.completedAt <= dayEnd) {
                xpEarned += r.xpEarned ?? 0
                coinsEarned += r.coinsEarned ?? 0
                gemsEarned += r.gemsEarned ?? 0
                if (r.completedSubtasks) {
                  for (const s of r.completedSubtasks) {
                    if (s.isCompleted) {
                      xpEarned += s.xpEarned ?? 0
                      coinsEarned += s.coinReward ?? 0
                      gemsEarned += s.gemReward ?? 0
                    }
                  }
                }
              }
            }
          }
          // Achievement rewards
          for (const a of achievementsUnlocked) {
            coinsEarned += a.rewardCoins
            gemsEarned += a.rewardGems
          }
          // Lootbox drops (coins/gems from usage history)
          for (const u of state.usageHistory) {
            if (u.profileId === pid && u.action === 'opened_lootbox' && u.timestamp >= dayStart && u.timestamp <= dayEnd) {
              coinsEarned += u.lootCoins ?? 0
              gemsEarned += u.lootGems ?? 0
            }
          }
          // Spending
          for (const entry of purchaseMap.values()) {
            coinsSpent += entry.totalCost
          }
          for (const p of state.purchaseHistory) {
            if (p.profileId === pid && p.timestamp >= dayStart && p.timestamp <= dayEnd) {
              const item = state.shopItems.find((si) => si.id === p.itemId)
              gemsSpent += item?.cost?.gems ?? 0
            }
          }

          // Active streaks (only meaningful for today, 3+ days only)
          const activeStreaks: DailySnapshot['activeStreaks'] = []
          const todayKey = getDateKey(now())
          if (dateKey === todayKey) {
            for (const task of profileTasks) {
              if ((task.currentStreak ?? 0) >= 3) {
                activeStreaks.push({ taskId: task.id, title: task.title, streak: task.currentStreak! })
              }
            }
            activeStreaks.sort((a, b) => b.streak - a.streak)
          }

          return {
            tasksCompleted,
            totalTasksCompleted,
            habitsPositive: [],
            habitsNegative: [],
            itemsPurchased: Array.from(purchaseMap.values()),
            itemsUsed: Array.from(usageMap.values()),
            achievementsUnlocked,
            xpEarned,
            coinsEarned,
            gemsEarned,
            coinsSpent,
            gemsSpent,
            activeStreaks,
          }
        },

        saveDailySnapshot: (dateKey) => {
          const snapshot = get().generateDailySnapshot(dateKey)
          set((s) => {
            const existing = s.dailyReports.find((r) => r.profileId === s.activeProfileId && r.dateKey === dateKey)
            if (existing) {
              return {
                dailyReports: s.dailyReports.map((r) =>
                  r.id === existing.id ? { ...r, snapshot, updatedAt: now() } : r
                ),
              }
            }
            return {
              dailyReports: [...s.dailyReports, {
                id: crypto.randomUUID(),
                profileId: s.activeProfileId!,
                dateKey,
                mood: null,
                thoughts: '',
                photos: [],
                snapshot,
                createdAt: now(),
                updatedAt: now(),
              }],
            }
          })
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
            achievementGroups: state.achievementGroups,
            tasks: state.tasks,
            achievements: state.achievements,
            craftRecipes: state.craftRecipes,
            shopItems: state.shopItems,
            inventory: state.inventory,
            purchaseHistory: state.purchaseHistory,
            usageHistory: state.usageHistory,
            activeShopDiscountPercent: state.activeShopDiscountPercent,
            settings: state.settings,
            stats: state.stats,
            noteFolders: state.noteFolders,
            notes: state.notes,
            dailyReports: state.dailyReports,
            dailyConditions: state.dailyConditions,
            dailyConditionEntries: state.dailyConditionEntries,
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
              achievementGroups: data.achievementGroups ?? [],
              tasks: (data.tasks ?? []).map((t: TaskRpg) => ({ ...t, groupId: t.groupId ?? null, deadlineAt: t.deadlineAt ?? null })),
              achievements: data.achievements ?? [],
              craftRecipes: data.craftRecipes ?? [],
              shopItems: data.shopItems ?? [],
              inventory: data.inventory ?? [],
              purchaseHistory: data.purchaseHistory ?? [],
              usageHistory: data.usageHistory ?? [],
              activeShopDiscountPercent: data.activeShopDiscountPercent ?? null,
              settings: { ...DEFAULT_SETTINGS, ...data.settings },
              stats: data.stats ?? get().stats,
              noteFolders: data.noteFolders ?? [],
              notes: data.notes ?? [],
              dailyReports: data.dailyReports ?? [],
              dailyConditions: data.dailyConditions ?? [],
              dailyConditionEntries: data.dailyConditionEntries ?? [],
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
            itemGroups: [],
            achievementGroups: [],
            tasks: [],
            achievements: [],
            craftRecipes: [],
            shopItems: [],
            inventory: [],
            purchaseHistory: [],
            usageHistory: [],
            activeShopDiscountPercent: null,
            noteFolders: [],
            notes: [],
            dailyReports: [],
            dailyConditions: [],
            dailyConditionEntries: [],
            stats: {
              totalTasksCompleted: 0,
              totalCoinsEarned: 0,
              totalCoinsSpent: 0,
              totalGemsEarned: 0,
              totalGemsSpent: 0,
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
        achievementGroups: s.achievementGroups,
        tasks: s.tasks,
        achievements: s.achievements,
        craftRecipes: s.craftRecipes,
        shopItems: s.shopItems,
        inventory: s.inventory,
        purchaseHistory: s.purchaseHistory,
        usageHistory: s.usageHistory,
        activeShopDiscountPercent: s.activeShopDiscountPercent,
        settings: s.settings,
        stats: s.stats,
        noteFolders: s.noteFolders,
        notes: s.notes,
        dailyReports: s.dailyReports,
        dailyConditions: s.dailyConditions,
        dailyConditionEntries: s.dailyConditionEntries,
      }),
      onRehydrateStorage: () => (state) => {
        _hydrationComplete = true
        // Инициализируем снапшот чтобы первая запись не писала всё
        if (state) {
          _lastWrittenState = {
            profiles: state.profiles,
            activeProfileId: state.activeProfileId,
            settings: state.settings,
            activeShopDiscountPercent: state.activeShopDiscountPercent,
            tasks: state.tasks,
            taskGroups: state.taskGroups,
            shopItems: state.shopItems,
            itemGroups: state.itemGroups,
            achievementGroups: state.achievementGroups,
            inventory: state.inventory,
            achievements: state.achievements,
            craftRecipes: state.craftRecipes,
            purchaseHistory: state.purchaseHistory,
            usageHistory: state.usageHistory,
            stats: state.stats,
            noteFolders: state.noteFolders,
            notes: state.notes,
            dailyReports: state.dailyReports,
            dailyConditions: state.dailyConditions,
            dailyConditionEntries: state.dailyConditionEntries,
          }
        }
        if (!state) {
          useRpgStore.getState().setHasHydrated(true)
          return
        }
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
        if (!state.achievementGroups) useRpgStore.setState({ achievementGroups: [] })
        if (!state.tasks) useRpgStore.setState({ tasks: [] })
        if (!state.noteFolders) useRpgStore.setState({ noteFolders: [] })
        if (!state.notes) useRpgStore.setState({ notes: [] })
        if (!state.dailyReports) useRpgStore.setState({ dailyReports: [] })
        if (!state.dailyConditions) useRpgStore.setState({ dailyConditions: [] })
        if (!state.dailyConditionEntries) useRpgStore.setState({ dailyConditionEntries: [] })

        // Migrate notes: TiptapContent → plain text string, add tags
        if (state.notes && state.notes.length > 0) {
          let migrated = false
          const migratedNotes = state.notes.map((n: any) => {
            const updates: Record<string, unknown> = {}
            // Migrate content from Tiptap JSON to plain text
            if (n.content && typeof n.content === 'object' && n.content.type === 'doc') {
              const extractText = (nodes: unknown[]): string => {
                const parts: string[] = []
                for (const node of nodes) {
                  if (typeof node !== 'object' || node === null) continue
                  const nd = node as Record<string, unknown>
                  if (nd.type === 'text' && typeof nd.text === 'string') parts.push(nd.text)
                  if (Array.isArray(nd.content)) parts.push(extractText(nd.content))
                }
                return parts.join(' ')
              }
              updates.content = extractText(n.content.content as unknown[] ?? []).replace(/\s+/g, ' ').trim()
              updates.excerpt = (updates.content as string).slice(0, 200)
              migrated = true
            }
            // Add tags if missing
            if (!n.tags) {
              updates.tags = []
              migrated = true
            }
            return Object.keys(updates).length > 0 ? { ...n, ...updates } : n
          })
          if (migrated) useRpgStore.setState({ notes: migratedNotes })
        }

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

        // Auto-cleanup trash: permanently delete notes trashed more than 30 days ago
        {
          const TRASH_TTL = 30 * 24 * 60 * 60 * 1000
          const now = Date.now()
          const currentNotes = useRpgStore.getState().notes
          const expired = currentNotes.filter((n) => n.deletedAt != null && now - n.deletedAt > TRASH_TTL)
          if (expired.length > 0) {
            for (const note of expired) {
              for (const mediaPath of note.mediaFiles) {
                vaultStorage.deleteMedia(mediaPath).catch(() => {})
              }
            }
            const expiredIds = new Set(expired.map((n) => n.id))
            useRpgStore.setState({ notes: currentNotes.filter((n) => !expiredIds.has(n.id)) })
          }
        }

        // Пересчитать прогресс достижений при загрузке (attribute_level, tasks_completed и т.д.)
        setTimeout(() => useRpgStore.getState().checkAchievements(), 0)

        useRpgStore.getState().setHasHydrated(true)
      },
    }
  )
)
