// ─── IDs ───────────────────────────────────────────────────────────────────
export type TaskId = string
export type TaskGroupId = string
export type AttributeId = string
export type ProfileId = string
export type ItemGroupId = string
export type ItemId = string
export type CurrencyId = string
export type AchievementId = string
export type AchievementGroupId = string
export type HabitId = string
export type CraftRecipeId = string

// ─── Task System (Core) ────────────────────────────────────────────────────

/** XP per difficulty (ulives-style) - now configurable via settings */
export const TASK_XP_BY_DIFFICULTY = {
  easy: 10,
  medium: 30,
  hard: 100,
  veryHard: 300,
} as const

export type TaskDifficulty = keyof typeof TASK_XP_BY_DIFFICULTY

/** Task priority levels (independent from difficulty) */
export type TaskPriority = 'none' | 'low' | 'medium' | 'high'

/** Причина архивации задачи */
export type TaskArchiveReason =
  | 'completed'   // Все циклы выполнены — задача завершена окончательно
  | 'expired'     // Срок истёк, но часть циклов была выполнена (не все)
  | 'failed'      // Автоархивация без единого выполненного цикла — провалена
  | 'manual'      // Архивирована вручную пользователем

/** Task types: Checkbox (simple), Counter (progress), Nested (subtasks) */
export type TaskKindRpg = 'checkbox' | 'counter' | 'nested'

/** Recurrence: when the task repeats. instant = после выполнения награды, задача остаётся и можно выполнить снова */
export type TaskRecurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'instant' | 'custom'

/** Режим окончания повторяющейся задачи */
export type RecurrenceEndMode = 'never' | 'byDate' | 'byCount'

/** Режим еженедельного повтора */
export type WeeklyMode = 'days' | 'timesPerWeek'

/** Расширенные настройки повтора задачи */
export interface RecurrenceSettings {
  /** Базовый тип повтора */
  type: TaskRecurrence
  /** Режим еженедельного повтора: по дням недели или N раз в неделю */
  weeklyMode?: WeeklyMode
  /** Дни недели (для weekly, weeklyMode='days') — 0 = воскресенье, 6 = суббота */
  weeklyDays?: number[]
  /** Сколько раз за неделю можно выполнить (для weekly, weeklyMode='timesPerWeek') */
  weeklyTimesPerWeek?: number
  /** Сколько раз выполнено на текущей неделе (для timesPerWeek) */
  weeklyCompletedThisWeek?: number
  /** Timestamp начала текущей недели (для timesPerWeek, отслеживание сброса) */
  weeklyWeekStart?: number
  /** Кастомный интервал в днях (для custom) */
  customIntervalDays?: number
  /** Режим окончания */
  endMode: RecurrenceEndMode
  /** Дата окончания (timestamp, для endMode = 'byDate') */
  endDate?: number | null
  /** Количество циклов (для endMode = 'byCount') */
  endCount?: number
  /** Сколько циклов уже выполнено (счетчик для byCount) */
  completedCount?: number
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

/** Группа предметов магазина — пользовательская категория (например "Базовые", "Премиум") */
export interface ItemGroup {
  id: ItemGroupId
  profileId: ProfileId
  name: string
  /** Цвет группы (hex) — используется как фон иконки на карточках товаров */
  color?: string
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
  /** Приоритет задачи (независимо от сложности) */
  priority?: TaskPriority
  /** @deprecated Use attributeIds instead */
  attributeId?: AttributeId | null
  /** Multiple attributes that receive XP on task completion */
  attributeIds: AttributeId[]
  /** Custom XP override for this task (if set, overrides difficulty-based XP) */
  customXp?: number | null
  dueAt: number | null
  /** Дедлайн: после этого времени завершить задачу нельзя (опционально) */
  deadlineAt?: number | null
  archived?: boolean
  /** Timestamp архивации задачи (перемещена в "Отмененные") */
  canceledAt?: number
  /** Причина архивации: completed (все циклы), failed (0 циклов), manual (вручную) */
  archiveReason?: TaskArchiveReason
  recurrence: TaskRecurrence
  recurrenceIntervalDays?: number
  /** Расширенные настройки повтора (новая система) */
  recurrenceSettings?: RecurrenceSettings
  /** Timestamp последнего завершения (для recurring задач) */
  lastCompletedAt?: number
  /** История завершений циклов (для recurring задач) */
  completionHistory?: TaskCompletionRecord[]
  /** Timestamp начала текущего цикла */
  currentCycleStart?: number
  /** Текущая серия (подряд выполненных циклов) */
  currentStreak?: number
  /** Лучшая серия (максимум подряд выполненных циклов) */
  bestStreak?: number
  /** Всего пропущено/пропущено циклов */
  totalSkipped?: number
  coinReward: number
  gemReward: number
  /** Активный множитель за стрик (привязан к задаче через предмет из инвентаря) */
  streakMultiplier?: {
    /** Значение множителя (1.5, 2, 2.5) */
    value: number
    /** Каждые N выполнений срабатывает множитель */
    interval: number
    /** Режим: streak (для циклических) | instant (для инстант задач) */
    mode: 'streak' | 'instant'
    /** Оставшееся количество выполнений (для instant режима) */
    remainingUses?: number
    /** Timestamp привязки */
    appliedAt: number
  }
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
  /** Единица измерения (раз, км, стр и т.д.) */
  countUnit?: string
  isCompleted: boolean
  completedAt?: number
}

/** Nested: list of subtasks */
export interface SubtaskItem {
  id: string
  title: string
  description?: string
  isCompleted: boolean
  completedAt?: number
  coinReward?: number
  gemReward?: number
  /** @deprecated Prefer difficulty + customXp. XP за подзадачу, если не заданы difficulty/customXp */
  xpReward?: number
  /** Сложность подзадачи (Легко / Средне / Сложно / Импосибл) */
  difficulty?: TaskDifficulty
  /** Свой XP — переопределяет XP по сложности */
  customXp?: number | null
}

/** Запись о подзадаче (сохраняется в истории цикла) */
export interface CompletedSubtaskRecord {
  id: string
  title: string
  isCompleted: boolean
  coinReward?: number
  gemReward?: number
  xpEarned?: number
}

/** Запись о завершённом цикле повторяющейся задачи */
export interface TaskCompletionRecord {
  id: string
  /** Начало цикла (timestamp) */
  cycleStart: number
  /** Конец цикла (timestamp, расчётный) */
  cycleEnd: number
  /** Когда завершена (undefined если пропущена/пропала) */
  completedAt?: number
  /** Статус цикла */
  status: 'completed' | 'skipped' | 'missed'
  /** Награды, выданные за этот цикл */
  xpEarned?: number
  coinsEarned?: number
  gemsEarned?: number
  /** Выполненные подзадачи (для nested задач) */
  completedSubtasks?: CompletedSubtaskRecord[]
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
  /** Включены ли гемы за + действие */
  positiveGemsEnabled?: boolean
  /** Гемы за + действие */
  positiveGems?: number
  /** Включены ли гемы за − действие (отнимаются) */
  negativeGemsEnabled?: boolean
  /** Гемы за − действие (отнимаются) */
  negativeGems?: number
  /** Привязка к атрибуту */
  attributeId: AttributeId | null
  /** Включён множитель сложности (награда увеличивается через N дней) */
  difficultyMultiplierEnabled?: boolean
  /** Уровень сложности: easy 1.25, medium 1.75, hard 2.5, custom — своё значение */
  difficultyMultiplierLevel?: 'easy' | 'medium' | 'hard' | 'custom'
  /** Кастомный множитель (когда level === 'custom') */
  difficultyMultiplierCustom?: number
  /** Множитель срабатывает раз в N дней */
  multiplierIntervalDays?: number
  /** Множитель применяется к XP */
  multiplierAppliesToXp?: boolean
  /** Множитель применяется к монетам */
  multiplierAppliesToCoins?: boolean
  /** Множитель применяется к гемам */
  multiplierAppliesToGems?: boolean
  /** История по дням: ключ YYYY-MM-DD, значение positive | negative | frozen (защищён заморозкой) */
  dailyCompletion?: Record<string, 'positive' | 'negative' | 'frozen'>
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
  /** Начало периода заморозки стрика (timestamp, start of first protected day). null = не активна */
  streakFreezeFrom?: number | null
  /** Конец периода заморозки стрика (timestamp, end of last protected day). null = не активна */
  streakFreezeUntil?: number | null
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
  profileId?: ProfileId
  name: string
  description?: string
  /** Эмодзи/иконка товара (по умолчанию по типу: лутбокс, талон, меч) */
  icon?: string
  /** Своё фото (data URL или base64) — показывается вместо icon при наличии */
  iconImage?: string
  rarity: ItemRarity
  /** Cost per currency */
  cost: Record<CurrencyId, number>
  /** Is this a loot box? On "use" rolls probability table */
  isLootBox: boolean
  /** For loot boxes: drop table. weight = chance weight, quantity = amount to grant (default 1) */
  lootTable?: { id: string; weight: number; quantity?: number }[]
  /** Группа предмета (для пользовательской сортировки в магазине) */
  groupId?: ItemGroupId | null
  /** Shown in shop and can be bought (default true) */
  availableForPurchase?: boolean
  /** When true, item costs nothing in shop (default false) */
  canGetForFree?: boolean
  /** Множитель за стрик: при использовании предмета увеличивает награды */
  streakMultiplierEnabled?: boolean
  /** Режим множителя: 'streak' (классический стрик) | 'instant' (для мгновенных задач, ограничен N выполнениями) */
  streakMultiplierMode?: 'streak' | 'instant'
  /** Значение множителя: 1.5 (простой), 2 (средний), 2.5 (сложный) */
  streakMultiplierValue?: number
  /** Промежуток срабатывания множителя: каждые N выполнений (3, 5, 7) */
  streakMultiplierInterval?: number
  /** Скидочный талон: при использовании в инвентаре даёт скидку на следующую покупку (только монеты) */
  isDiscountVoucher?: boolean
  /** Размер скидки в % (1–85) при isDiscountVoucher */
  discountPercent?: number
  /** Видеоигра: после покупки можно докупать часы для этой игры */
  isVideoGame?: boolean
  /** Пакеты времени для видеоигры: [{ hours, cost }] */
  gameTimePackages?: GameTimePackage[]
  /** Суммарное накопленное время (в минутах) — текущий запас */
  gameTimeTotalMinutes?: number
  /** Всего наигранных минут (увеличивается при использовании часов) */
  gameTimePlayedMinutes?: number
  /** Сериал: серии разбиты по сезонам с индивидуальной ценой за серию */
  isTvSerial?: boolean
  /** Настройки сезонов сериала */
  serialSeasons?: SerialSeason[]
  /** Запас: undefined = бесконечный, 0 = кнопка покупки скрыта, >0 = ограничено */
  stock?: number
  /** Базовая покупка сделана (для isVideoGame / isTvSerial — после покупки открываются сессии/серии) */
  basePurchased?: boolean
  /** Предмет удалён из магазина, но остаётся в инвентаре */
  deletedFromShop?: boolean
}

/** Сезон сериала */
export interface SerialSeason {
  id: string
  /** Номер сезона (1-based) */
  number: number
  /** Серии в сезоне */
  episodes: SerialEpisode[]
}

/** Серия внутри сезона */
export interface SerialEpisode {
  id: string
  /** Номер серии (1-based) */
  number: number
  /** Стоимость серии в монетах */
  cost: number
  /** Куплена ли серия */
  purchased?: boolean
  /** Использована ли серия (просмотрена) */
  used?: boolean
}

/** Пакет времени для видеоигры */
export interface GameTimePackage {
  id: string
  /** Количество часов в пакете */
  hours: number
  /** Стоимость пакета в монетах */
  cost: number
}

export interface InventoryEntry {
  itemId: ItemId
  quantity: number
  acquiredAt: number
}

/** Запись в истории покупок магазина */
export interface PurchaseHistoryEntry {
  profileId: ProfileId
  itemId: ItemId
  itemName: string
  timestamp: number
  /** Номер сезона (для покупки серии сериала) */
  seasonNumber?: number
  /** Номер серии (для покупки серии сериала) */
  episodeNumber?: number
  /** Название купленного пакета времени (для видеоигр) */
  packageName?: string
}

/** Запись в истории использования предмета из инвентаря */
export interface UsageHistoryEntry {
  profileId: ProfileId
  itemId: ItemId
  itemName: string
  timestamp: number
  action: 'used' | 'opened_lootbox' | 'activated_discount' | 'activated_multiplier' | 'deactivated_multiplier' | 'deleted' | 'crafted'
  /** Для игр: сколько часов использовано */
  gameHoursUsed?: number
  /** Для сериалов: номер сезона */
  seasonNumber?: number
  /** Для сериалов: номер серии */
  episodeNumber?: number
  /** Для множителей: ID задачи */
  taskId?: string
  /** Для множителей: название задачи (снимок) */
  taskName?: string
  /** Для множителей: значение (1.5, 2, 2.5) */
  multiplierValue?: number
  /** Для деактивации: причина */
  deactivationReason?: 'streak_break' | 'uses_exhausted' | 'task_expired' | 'task_missed'
  /** Для лутбокса: что выпало (имя предмета/валюты, или null = ничего) */
  lootResultName?: string | null
  /** Для скидки: процент скидки */
  discountPercent?: number
  /** Для удаления: количество удалённых */
  deletedQuantity?: number
  /** Для использования/удаления: количество (если > 1) */
  quantity?: number
  /** Для крафта: название рецепта/фрагмента */
  recipeName?: string
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

// ─── Achievement Groups ─────────────────────────────────────────────────────

export interface AchievementGroup {
  id: AchievementGroupId
  profileId: ProfileId
  name: string
  icon: string
  /** Цвет папки (hex) — используется как акцент иконок ачивок внутри */
  color?: string
  sortOrder: number
  createdAt: number
  updatedAt: number
}

// ─── Achievements System ────────────────────────────────────────────────────

/** Тип условия для достижения */
export type AchievementConditionType =
  | 'tasks_completed'        // Выполнено N задач (всего)
  | 'task_completed_today'   // Задача N выполнена X раз сегодня
  | 'task_completed_total'   // Задача N выполнена X раз за всё время
  | 'task_streak'            // Серия для конкретной задачи N
  | 'item_used'              // Предмет N использован X раз
  | 'attribute_level'        // Атрибут достиг уровня N
  | 'coins_earned_spent'     // Монет заработано / потрачено
  | 'custom'                 // Разблокировать вручную

export interface AchievementCondition {
  type: AchievementConditionType
  /** Целевое значение (например, 10 задач) */
  targetValue: number
  /** ID атрибута (для attribute_level) */
  attributeId?: AttributeId
  /** ID задачи (для task_completed_today, task_completed_total, task_streak) */
  taskId?: TaskId
  /** ID предмета (для item_used) */
  itemId?: ItemId
  /** Режим для coins_earned_spent: заработано или потрачено */
  coinMode?: 'earned' | 'spent'
}

export interface Achievement {
  id: AchievementId
  profileId: ProfileId
  /** Группа достижения; null = без группы */
  groupId?: AchievementGroupId | null
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
  /** Награда: ID атрибута для XP (только один) */
  rewardAttributeId?: AttributeId
  /** Награда: сложность (определяет XP) */
  rewardDifficulty?: TaskDifficulty
  /** Награда: кастомный XP (переопределяет сложность) */
  rewardCustomXp?: number
  /** Награда: ID предмета (deprecated, используй rewardItems) */
  rewardItemId?: ItemId
  /** Награда: количество предметов (deprecated, используй rewardItems) */
  rewardItemQuantity?: number
  /** Награда: массив предметов [{itemId, quantity}] */
  rewardItems?: { itemId: ItemId; quantity: number }[]
  /** Условия (тумблеры) */
  conditions?: AchievementToggleConditions
  /** Повторяемое достижение (сбрасывается после выполнения) */
  repeatable?: boolean
  /** Готово к разблокировке (условия выполнены, ждёт ручного забора) */
  readyToUnlock?: boolean
  /** Разблокировано? */
  unlocked: boolean
  /** Когда разблокировано */
  unlockedAt?: number
  /** Текущий прогресс (для отображения) */
  currentProgress: number
  createdAt: number
  updatedAt: number
}

/** Тумблер-условия для достижений (пока без логики, только UI) */
export interface AchievementToggleConditions {
  /** Без подсказок */
  noHints?: boolean
  /** Без пропусков */
  noSkips?: boolean
  /** Подряд без перерыва */
  consecutive?: boolean
  /** Только в определённый день недели */
  specificDay?: boolean
  /** За один сеанс */
  singleSession?: boolean
  /** Без ошибок */
  noMistakes?: boolean
  /** В ограниченное время */
  timeLimited?: boolean
  /** Соло (без помощи) */
  solo?: boolean
}

// ─── Crafting System ────────────────────────────────────────────────────────

/** Источник получения фрагментов */
export type FragmentSourceType = 'task_linked' | 'streak_reward' | 'random_drop'

export interface FragmentSource {
  type: FragmentSourceType
  /** ID задачи (для task_linked) — @deprecated используй linkedTaskIds */
  taskId?: TaskId
  /** Массив привязанных задач (для task_linked) */
  linkedTaskIds?: TaskId[]
  /** Шанс дропа в процентах 0-100 (для random_drop и task_linked) */
  dropChance?: number
  /** Разрешить дроп при выполнении подзадачи */
  allowSubtaskDrop?: boolean
  /** Необходимая длина стрика для получения фрагмента (для streak_reward) */
  streakRequired?: number
}

export interface CraftRecipe {
  id: CraftRecipeId
  profileId: ProfileId
  /** Название фрагмента (например, "Фрагмент консоли") */
  fragmentName: string
  /** Иконка фрагмента (Lucide icon name) */
  fragmentIcon: string
  /** Кастомное изображение фрагмента (data URL) */
  fragmentIconImage?: string
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
  /** Стоимость крафта (по валютам). Если не задано или всё 0 — крафт бесплатный */
  craftCost?: Record<CurrencyId, number>
  /** Источник фрагментов */
  fragmentSource?: FragmentSource
  /** Максимальное количество крафтов (undefined/1 = одноразовый) */
  maxCrafts?: number
  /** Сколько раз уже скрафчено */
  craftCount?: number
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
  /** Настройки XP для сложностей задач */
  taskDifficultyXp: {
    easy: number
    medium: number
    hard: number
    veryHard: number
  }
  /** Сколько записей отображать в истории инвентаря */
  historyDisplayLimit: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  accentColor: 'blue',
  notificationsEnabled: true,
  notifyDailyTasks: true,
  notifyAchievements: true,
  language: 'ru',
  taskDifficultyXp: {
    easy: 10,
    medium: 30,
    hard: 100,
    veryHard: 300,
  },
  historyDisplayLimit: 50,
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