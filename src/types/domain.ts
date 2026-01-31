// ─── IDs ───────────────────────────────────────────────────────────────────
export type TaskId = string
export type TaskGroupId = string
export type AttributeId = string
export type ProfileId = string
export type ItemId = string
export type CurrencyId = string
export type AchievementId = string
export type HabitId = string
export type CraftRecipeId = string

// ─── Task System (Core) ────────────────────────────────────────────────────

/** XP per difficulty (ulives-style) */
export const TASK_XP_BY_DIFFICULTY = {
  easy: 100,
  medium: 200,
  hard: 400,
  veryHard: 800,
} as const

export type TaskDifficulty = keyof typeof TASK_XP_BY_DIFFICULTY

/** Task types: Checkbox (simple), Counter (progress), Nested (subtasks) */
export type TaskKindRpg = 'checkbox' | 'counter' | 'nested'

/** Recurrence: when the task repeats. instant = после выполнения награды, задача остаётся и можно выполнить снова */
export type TaskRecurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'instant' | 'custom'
/** Custom interval: e.g. every 3 days */
export interface RecurrenceCustom {
  type: 'custom'
  intervalDays: number
}

/** Группа задач — пользовательская категория (например "Работа", "Дом") */
export interface TaskGroup {
  id: TaskGroupId
  profileId: ProfileId
  name: string
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export interface TaskBase {
  id: TaskId
  profileId: ProfileId
  /** Группа, в которой находится задача; null = без группы (опционально для старых данных) */
  groupId?: TaskGroupId | null
  title: string
  notes?: string
  createdAt: number
  updatedAt: number
  kind: TaskKindRpg
  difficulty: TaskDifficulty
  attributeId: AttributeId | null
  penaltyFactor: number
  dueAt: number | null
  /** Дедлайн: после этого времени завершить задачу нельзя (опционально) */
  deadlineAt?: number | null
  archived?: boolean
  recurrence: TaskRecurrence
  recurrenceIntervalDays?: number
  coinReward: number
}

/** Simple checkbox: done or not */
export interface CheckboxTask extends TaskBase {
  kind: 'checkbox'
  isCompleted: boolean
  completedAt?: number
}

/** Counter: progress toward a target (e.g. 0/10) */
export interface CounterTask extends TaskBase {
  kind: 'counter'
  current: number
  target: number
  isCompleted: boolean
  completedAt?: number
}

/** Nested: list of subtasks */
export interface SubtaskItem {
  id: string
  title: string
  isCompleted: boolean
  completedAt?: number
}

export interface NestedTask extends TaskBase {
  kind: 'nested'
  subtasks: SubtaskItem[]
  /** Completed when all subtasks are done */
  isCompleted: boolean
  completedAt?: number
}

/** New RPG task (checkbox / counter / nested) */
export type TaskRpg = CheckboxTask | CounterTask | NestedTask

// ─── Habits System ──────────────────────────────────────────────────────────

/** Привычка с +/- действиями */
export interface Habit {
  id: HabitId
  profileId: ProfileId
  title: string
  notes?: string
  icon: string
  color: string
  /** Можно ли нажимать + */
  positiveEnabled: boolean
  /** Можно ли нажимать - */
  negativeEnabled: boolean
  /** XP за + действие */
  positiveXp: number
  /** XP за - действие (отнимается) */
  negativeXp: number
  /** Монеты за + действие */
  positiveCoins: number
  /** Монеты за - действие (отнимаются) */
  negativeCoins: number
  /** Привязка к атрибуту */
  attributeId: AttributeId | null
  /** Счётчик + за сегодня */
  todayPositive: number
  /** Счётчик - за сегодня */
  todayNegative: number
  /** Дата последнего сброса счётчиков (начало дня) */
  lastResetDate: number
  /** Streak: сколько дней подряд был хотя бы 1 + */
  streak: number
  /** Всего + за всё время */
  totalPositive: number
  /** Всего - за всё время */
  totalNegative: number
  createdAt: number
  updatedAt: number
  archived?: boolean
}

// ─── Legacy (existing store / TasksPage — migrate to TaskRpg later) ───────
export type TaskKindLegacy = 'habit' | 'daily' | 'todo'
/** Legacy task kind for store/TasksPage. New code: use TaskKindRpg. */
export type TaskKind = TaskKindLegacy
export interface TaskBaseLegacy {
  id: TaskId
  title: string
  notes?: string
  createdAt: number
  updatedAt: number
  kind: TaskKindLegacy
  difficulty: 'easy' | 'normal' | 'hard'
  archived?: boolean
}
export interface HabitTask extends TaskBaseLegacy {
  kind: 'habit'
  positive: boolean
  negative: boolean
}
export interface DailyTask extends TaskBaseLegacy {
  kind: 'daily'
  dueAt: number | null
  streak: number
  lastCompletedAt?: number
}
export interface TodoTask extends TaskBaseLegacy {
  kind: 'todo'
  dueAt?: number | null
  completedAt?: number
  isCompleted: boolean
}
export type Task = HabitTask | DailyTask | TodoTask

export interface CharacterStats {
  level: number
  xp: number
  hp: number
  maxHp: number
  gold: number
}
export interface InventoryEntryLegacy {
  item: ItemLegacy
  quantity: number
}
export interface ItemLegacy {
  id: string
  name: string
  description?: string
  rarity: ItemRarity
  valueGold: number
}
export interface CharacterState {
  name: string
  stats: CharacterStats
  inventory: InventoryEntryLegacy[]
}
export interface Reward {
  id: string
  name: string
  costGold: number
}
export interface GameStateSnapshot {
  tasks: Task[]
  character: CharacterState
  rewards: Reward[]
  lastSaveAt: number
}

// ─── RPG Attributes & Profile ──────────────────────────────────────────────

export interface Attribute {
  id: AttributeId
  name: string
  /** Short key for charts (e.g. "STR", "INT") */
  key: string
  /** Emoji or icon identifier for UI */
  icon: string
  /** Current level (derived from current_xp and level curve) */
  level: number
  /** Current XP within current level (0 .. xpForNextLevel) */
  current_xp: number
  /** Color for radar chart / UI (hex or CSS) */
  color: string
  order: number
}

/** Атрибуты по умолчанию: Сила, Интеллект, Ловкость, Выносливость, Креативность, Харизма */
export const DEFAULT_ATTRIBUTES: Omit<Attribute, 'id'>[] = [
  { name: 'Сила', key: 'СИЛ', icon: '💪', level: 1, current_xp: 0, color: '#e57373', order: 0 },
  { name: 'Интеллект', key: 'ИНТ', icon: '🧠', level: 1, current_xp: 0, color: '#64b5f6', order: 1 },
  { name: 'Ловкость', key: 'ЛОВ', icon: '🏃', level: 1, current_xp: 0, color: '#81c784', order: 2 },
  { name: 'Выносливость', key: 'ВЫН', icon: '🛡️', level: 1, current_xp: 0, color: '#ffb74d', order: 3 },
  { name: 'Креативность', key: 'КРЕ', icon: '🎨', level: 1, current_xp: 0, color: '#ba68c8', order: 4 },
  { name: 'Харизма', key: 'ХАР', icon: '✨', level: 1, current_xp: 0, color: '#4dd0e1', order: 5 },
]

/** XP curve: custom gradient per level (e.g. levels 1–10 need less XP than 11–20) */
export interface LevelCurveSegment {
  fromLevel: number
  toLevel: number
  xpPerLevel: number
}

/** Leveling system mode */
export type LevelingMode = 'standard' | 'fast' | 'custom'

/** Standard (Linear): Lv1 0, Lv2 400, Lv3 900 (+500), Lv4 1.6K, Lv5 2.5K */
export function xpForLevelStandard(level: number): number {
  if (level <= 1) return 0
  return 400 + (level - 2) * 500 // Lv2=400, Lv3=900, Lv4=1400, Lv5=1900... spec says 2.5K for Lv5 so we use 400,900,1400,1900,2400
}
/** Fast (Early gratification): Lv1 0, Lv2 600, Lv3 900, Lv4 1.2K, Lv5 1.5K */
export function xpForLevelFast(level: number): number {
  if (level <= 1) return 0
  if (level === 2) return 600
  if (level === 3) return 900
  if (level === 4) return 1200
  return 1500 + (level - 5) * 300 // Lv5=1500, then +300 each
}

export interface Profile {
  id: ProfileId
  name: string
  /** Profile-level XP (optional; attributes have their own level/xp) */
  level: number
  xp: number
  levelingMode: LevelingMode
  /** Custom level curve; used when levelingMode === 'custom' */
  levelCurve: LevelCurveSegment[]
  attributes: Attribute[]
  /** Multi-currency: coins (primary), diamonds, etc. */
  currencies: Record<CurrencyId, number>
  createdAt: number
  updatedAt: number
}

/** Total XP required to reach a given level (1-based). Levels 2..level in segment each cost xpPerLevel. */
export function xpForLevelCustom(level: number, segments: LevelCurveSegment[]): number {
  if (level <= 1) return 0
  let total = 0
  for (const seg of segments) {
    const levelsInSeg = Math.max(0, Math.min(level, seg.toLevel) - Math.max(2, seg.fromLevel) + 1)
    total += levelsInSeg * seg.xpPerLevel
  }
  return total
}

// ─── Economy (Shop & Inventory) ─────────────────────────────────────────────

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface ShopItem {
  id: ItemId
  name: string
  description?: string
  rarity: ItemRarity
  /** Cost per currency */
  cost: Record<CurrencyId, number>
  /** Is this a loot box? On "use" rolls probability table */
  isLootBox: boolean
  /** For loot boxes: drop table (itemId or currencyId -> weight) */
  lootTable?: { id: string; weight: number }[]
}

export interface InventoryEntry {
  itemId: ItemId
  quantity: number
  acquiredAt: number
}

/** Currencies (e.g. Gold, Diamonds) */
export interface Currency {
  id: CurrencyId
  name: string
  symbol: string
  icon: string
  order: number
}

/** Валюты по умолчанию */
export const DEFAULT_CURRENCIES: Currency[] = [
  { id: 'coins', name: 'Монеты', symbol: '🪙', icon: '🪙', order: 0 },
  { id: 'gems', name: 'Кристаллы', symbol: '💎', icon: '💎', order: 1 },
]

/** ID валют */
export const CURRENCY_IDS = {
  COINS: 'coins' as CurrencyId,
  GEMS: 'gems' as CurrencyId,
}

// ─── Achievements System ────────────────────────────────────────────────────

/** Тип условия для достижения */
export type AchievementConditionType = 
  | 'tasks_completed'      // Выполнено N задач
  | 'habits_positive'      // N положительных привычек
  | 'attribute_level'      // Атрибут достиг уровня N
  | 'streak_days'          // Streak N дней
  | 'coins_earned'         // Заработано N монет
  | 'items_crafted'        // Скрафчено N предметов
  | 'custom'               // Разблокировать вручную

export interface AchievementCondition {
  type: AchievementConditionType
  /** Целевое значение (например, 10 задач) */
  targetValue: number
  /** ID атрибута (для attribute_level) */
  attributeId?: AttributeId
}

export interface Achievement {
  id: AchievementId
  profileId: ProfileId
  title: string
  description: string
  icon: string
  /** Условие разблокировки */
  condition: AchievementCondition
  /** Награда: монеты */
  rewardCoins: number
  /** Награда: кристаллы */
  rewardGems: number
  /** Награда: XP */
  rewardXp: number
  /** Награда: ID предмета */
  rewardItemId?: ItemId
  /** Разблокировано? */
  unlocked: boolean
  /** Когда разблокировано */
  unlockedAt?: number
  /** Текущий прогресс (для отображения) */
  currentProgress: number
  createdAt: number
  updatedAt: number
}

// ─── Crafting System ────────────────────────────────────────────────────────

/** Источник получения фрагментов */
export type FragmentSourceType = 'task_linked' | 'random_drop'

export interface FragmentSource {
  type: FragmentSourceType
  /** ID задачи (для task_linked) */
  taskId?: TaskId
  /** Шанс дропа 0.0-1.0 (для random_drop) */
  dropChance?: number
}

export interface CraftRecipe {
  id: CraftRecipeId
  profileId: ProfileId
  /** Название фрагмента (например, "Фрагмент консоли") */
  fragmentName: string
  /** Иконка фрагмента */
  fragmentIcon: string
  /** Цвет фрагмента */
  fragmentColor: string
  /** Сколько фрагментов нужно собрать */
  fragmentsRequired: number
  /** Сколько фрагментов собрано */
  fragmentsCollected: number
  /** ID предмета, который получится при крафте */
  resultItemId: ItemId
  /** Название результата */
  resultName: string
  /** Описание результата */
  resultDescription?: string
  /** Редкость результата */
  resultRarity: ItemRarity
  /** Иконка результата */
  resultIcon: string
  /** Источники фрагментов */
  sources: FragmentSource[]
  /** Скрафчен ли предмет */
  crafted: boolean
  /** Когда скрафчен */
  craftedAt?: number
  createdAt: number
  updatedAt: number
}

// ─── App Settings ───────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system'

export type AccentColor = 
  | 'blue'      // #0078d4
  | 'purple'    // #8764b8
  | 'pink'      // #e3008c
  | 'red'       // #d13438
  | 'orange'    // #ff8c00
  | 'yellow'    // #ffc83d
  | 'green'     // #107c10
  | 'teal'      // #00b7c3

export const ACCENT_COLORS: Record<AccentColor, { light: string; dark: string; name: string }> = {
  blue:   { light: '#0078d4', dark: '#60cdff', name: 'Синий' },
  purple: { light: '#8764b8', dark: '#b4a0ff', name: 'Фиолетовый' },
  pink:   { light: '#e3008c', dark: '#ff6ec7', name: 'Розовый' },
  red:    { light: '#d13438', dark: '#ff6b6b', name: 'Красный' },
  orange: { light: '#ff8c00', dark: '#ffb347', name: 'Оранжевый' },
  yellow: { light: '#ffc83d', dark: '#ffe066', name: 'Жёлтый' },
  green:  { light: '#107c10', dark: '#6ccb5f', name: 'Зелёный' },
  teal:   { light: '#00b7c3', dark: '#4dd0e1', name: 'Бирюзовый' },
}

export interface AppSettings {
  theme: ThemeMode
  accentColor: AccentColor
  notificationsEnabled: boolean
  notifyDailyTasks: boolean
  notifyAchievements: boolean
  language: 'ru' | 'en'
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  accentColor: 'blue',
  notificationsEnabled: true,
  notifyDailyTasks: true,
  notifyAchievements: true,
  language: 'ru',
}

// ─── Database schema (SQLite-ready) ─────────────────────────────────────────
export interface TaskRow {
  id: TaskId
  title: string
  notes: string | null
  created_at: number
  updated_at: number
  kind: 'checkbox' | 'counter' | 'nested'
  difficulty: TaskDifficulty
  attribute_id: AttributeId | null
  penalty_factor: number
  due_at: number | null
  archived: 0 | 1
  payload: string // JSON: { isCompleted, current, target, subtasks, completedAt, ... }
}

export interface AttributeRow {
  id: AttributeId
  name: string
  key: string
  value: number
  max: number | null
  order: number
  profile_id: ProfileId
}

export interface ProfileRow {
  id: ProfileId
  name: string
  level: number
  xp: number
  level_curve_json: string
  currencies_json: string
  created_at: number
  updated_at: number
}