// ─── Seed Data Generator ─────────────────────────────────────────────────────
// Генерирует тестовые данные для всех разделов приложения.
// Используется через кнопку в Настройках → Данные.

import type {
  Profile,
  TaskRpg,
  CheckboxTask,
  CounterTask,
  NestedTask,
  TaskGroup,
  ItemGroup,
  AchievementGroup,
  ShopItem,
  Achievement,
  CraftRecipe,
  InventoryEntry,
  Attribute,
} from '../types/domain'
import { DEFAULT_ATTRIBUTES, DEFAULT_SETTINGS, CURRENCY_IDS } from '../types/domain'

export function generateSeedData(): string {
  let _idCounter = 0
  const uid = () => `seed-${++_idCounter}-${Math.random().toString(36).slice(2, 8)}`
  const ts = Date.now()
  const DAY = 86400000

  // ─── Profile ───────────────────────────────────────────────────────────────

  const profileId = uid()
  const attrIds = DEFAULT_ATTRIBUTES.map((_, i) => `attr-${profileId}-${i}`)
  const [STR, INT, DEX, END, CRE, CHA] = attrIds

  const profile: Profile = {
    id: profileId,
    name: 'Crypto Creator',
    level: 7,
    xp: 2800,
    levelingMode: 'standard',
    levelCurve: [],
    attributes: DEFAULT_ATTRIBUTES.map((a, i): Attribute => ({
      ...a,
      id: attrIds[i],
      level: 2 + Math.floor(Math.random() * 4),
      current_xp: Math.floor(Math.random() * 200),
    })),
    currencies: {
      [CURRENCY_IDS.COINS]: 5500,
      [CURRENCY_IDS.GEMS]: 85,
    },
    createdAt: ts - 30 * DAY,
    updatedAt: ts,
  }

  // ─── Task Groups ───────────────────────────────────────────────────────────

  const taskGroups: TaskGroup[] = [
    { id: uid(), profileId, name: 'Крипто', sortOrder: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Контент', sortOrder: 1, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Спорт', sortOrder: 2, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Бизнес', sortOrder: 3, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Жизнь', sortOrder: 4, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Саморазвитие', sortOrder: 5, createdAt: ts, updatedAt: ts },
  ]
  const [gCrypto, gContent, gSport, gBusiness, gLife, gSelfDev] = taskGroups.map(g => g.id)

  // ─── Helper: create task ───────────────────────────────────────────────────

  function mkCheckbox(p: Partial<CheckboxTask> & Pick<CheckboxTask, 'title'>): CheckboxTask {
    return {
      id: uid(), profileId, kind: 'checkbox', difficulty: 'medium', attributeIds: [],
      coinReward: 10, gemReward: 0, dueAt: null, deadlineAt: null, recurrence: 'once',
      isCompleted: false, createdAt: ts - Math.floor(Math.random() * 15 * DAY), updatedAt: ts, groupId: null,
      ...p,
    }
  }

  function mkCounter(p: Partial<CounterTask> & Pick<CounterTask, 'title' | 'target'>): CounterTask {
    return {
      id: uid(), profileId, kind: 'counter', difficulty: 'medium', attributeIds: [],
      coinReward: 15, gemReward: 0, dueAt: null, deadlineAt: null, recurrence: 'once',
      current: 0, isCompleted: false,
      createdAt: ts - Math.floor(Math.random() * 15 * DAY), updatedAt: ts, groupId: null,
      ...p,
    }
  }

  function mkNested(p: Partial<NestedTask> & Pick<NestedTask, 'title' | 'subtasks'>): NestedTask {
    return {
      id: uid(), profileId, kind: 'nested', difficulty: 'hard', attributeIds: [],
      coinReward: 20, gemReward: 1, dueAt: null, deadlineAt: null, recurrence: 'once',
      isCompleted: false,
      createdAt: ts - Math.floor(Math.random() * 15 * DAY), updatedAt: ts, groupId: null,
      ...p,
    }
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────────

  const tasks: TaskRpg[] = [
    // === КРИПТО ===
    mkCheckbox({ title: 'Проверить портфель на DEX', groupId: gCrypto, difficulty: 'easy', attributeIds: [INT], coinReward: 10, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Прочитать крипто-новости', groupId: gCrypto, difficulty: 'easy', attributeIds: [INT], coinReward: 10, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' }, currentStreak: 12, bestStreak: 18 }),
    mkCounter({ title: 'Проанализировать 5 альткоинов', groupId: gCrypto, target: 5, difficulty: 'hard', attributeIds: [INT, DEX], coinReward: 50, gemReward: 2, countUnit: 'монет', recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 5, endMode: 'never' } }),
    mkNested({ title: 'Запустить DeFi-стратегию', groupId: gCrypto, difficulty: 'veryHard', attributeIds: [INT, DEX], coinReward: 150, gemReward: 5, subtasks: [
      { id: uid(), title: 'Исследовать протоколы', isCompleted: true, completedAt: ts - 5 * DAY },
      { id: uid(), title: 'Сравнить APY на фермах', isCompleted: true, completedAt: ts - 3 * DAY },
      { id: uid(), title: 'Проверить аудиты смарт-контрактов', isCompleted: false },
      { id: uid(), title: 'Разместить ликвидность', isCompleted: false },
      { id: uid(), title: 'Настроить алерты на цену', isCompleted: false },
    ] }),
    mkCheckbox({ title: 'Записать сделки в трекер', groupId: gCrypto, difficulty: 'easy', attributeIds: [INT], coinReward: 10, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Проверить gas fees и сеть', groupId: gCrypto, difficulty: 'easy', attributeIds: [INT], coinReward: 5, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkNested({ title: 'Запустить ноду валидатора', groupId: gCrypto, difficulty: 'veryHard', attributeIds: [INT, DEX], coinReward: 200, gemReward: 10, subtasks: [
      { id: uid(), title: 'Выбрать сеть', isCompleted: true, completedAt: ts - 10 * DAY },
      { id: uid(), title: 'Арендовать VPS', isCompleted: true, completedAt: ts - 8 * DAY },
      { id: uid(), title: 'Установить и настроить ПО', isCompleted: false },
      { id: uid(), title: 'Синхронизировать блокчейн', isCompleted: false },
      { id: uid(), title: 'Застейкать токены', isCompleted: false },
    ] }),
    mkCheckbox({ title: 'Участвовать в airdrop', groupId: gCrypto, difficulty: 'medium', attributeIds: [INT, DEX], coinReward: 30, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 3, endMode: 'never' } }),
    mkCheckbox({ title: 'Изучить whitepaper проекта', groupId: gCrypto, difficulty: 'hard', attributeIds: [INT], coinReward: 40, gemReward: 1, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [0], endMode: 'never' } }),
    mkCounter({ title: 'Пройти 3 тестнета', groupId: gCrypto, target: 3, current: 1, difficulty: 'hard', attributeIds: [INT, DEX], coinReward: 60, gemReward: 3, countUnit: 'тестнет', recurrence: 'monthly', recurrenceSettings: { type: 'monthly', endMode: 'never' } }),

    // === КОНТЕНТ ===
    mkCheckbox({ title: 'Снять Reels/TikTok', groupId: gContent, difficulty: 'medium', attributeIds: [CRE, CHA], coinReward: 25, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' }, currentStreak: 5, bestStreak: 21 }),
    mkCheckbox({ title: 'Написать пост в Twitter/X', groupId: gContent, difficulty: 'easy', attributeIds: [CRE, CHA], coinReward: 15, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Опубликовать Stories', groupId: gContent, difficulty: 'easy', attributeIds: [CRE], coinReward: 10, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkNested({ title: 'Снять YouTube-видео', groupId: gContent, difficulty: 'veryHard', attributeIds: [CRE, CHA, INT], coinReward: 100, gemReward: 5, subtasks: [
      { id: uid(), title: 'Написать сценарий', isCompleted: true, completedAt: ts - 3 * DAY },
      { id: uid(), title: 'Подготовить оборудование', isCompleted: true, completedAt: ts - 2 * DAY },
      { id: uid(), title: 'Съёмка', isCompleted: false },
      { id: uid(), title: 'Монтаж', isCompleted: false },
      { id: uid(), title: 'Обложка и SEO', isCompleted: false },
      { id: uid(), title: 'Публикация и промо', isCompleted: false },
    ] }),
    mkCounter({ title: 'Ответить на 20 комментов', groupId: gContent, target: 20, current: 7, difficulty: 'medium', attributeIds: [CHA], coinReward: 20, countUnit: 'коммент', recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Сделать коллаб с другим креатором', groupId: gContent, difficulty: 'hard', attributeIds: [CHA, CRE], coinReward: 60, gemReward: 3, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 1, endMode: 'never' } }),
    mkCheckbox({ title: 'Обновить медиакит', groupId: gContent, difficulty: 'medium', attributeIds: [CRE, INT], coinReward: 30, recurrence: 'monthly', recurrenceSettings: { type: 'monthly', endMode: 'never' } }),
    mkCheckbox({ title: 'Запланировать контент на неделю', groupId: gContent, difficulty: 'medium', attributeIds: [CRE, INT], coinReward: 25, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [0], endMode: 'never' } }),
    mkCounter({ title: 'Набрать 500 новых подписчиков', groupId: gContent, target: 500, current: 120, difficulty: 'veryHard', attributeIds: [CHA, CRE], coinReward: 100, gemReward: 5, countUnit: 'подп.' }),
    mkCheckbox({ title: 'Написать Telegram-пост', groupId: gContent, difficulty: 'medium', attributeIds: [CRE, INT], coinReward: 20, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),

    // === СПОРТ ===
    mkCheckbox({ title: 'Утренняя тренировка 30 мин', groupId: gSport, difficulty: 'medium', attributeIds: [STR, END], coinReward: 20, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' }, currentStreak: 9, bestStreak: 30 }),
    mkCounter({ title: 'Выпить 3 литра воды', groupId: gSport, target: 3, current: 1, difficulty: 'easy', attributeIds: [END], coinReward: 5, countUnit: 'л', recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Тренировка в зале (силовая)', groupId: gSport, difficulty: 'hard', attributeIds: [STR, END], coinReward: 40, gemReward: 1, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 4, endMode: 'never' } }),
    mkCounter({ title: 'Пробежать 5 км', groupId: gSport, target: 5, difficulty: 'hard', attributeIds: [END, DEX], coinReward: 50, gemReward: 2, countUnit: 'км', recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [1, 4, 6], endMode: 'never' } }),
    mkCheckbox({ title: 'Растяжка / йога', groupId: gSport, difficulty: 'easy', attributeIds: [DEX, END], coinReward: 10, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCounter({ title: 'Набрать 10000 шагов', groupId: gSport, target: 10000, current: 4520, difficulty: 'medium', attributeIds: [END], coinReward: 20, countUnit: 'шагов', recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Холодный душ', groupId: gSport, difficulty: 'medium', attributeIds: [END, STR], coinReward: 15, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' }, currentStreak: 3, bestStreak: 14 }),
    mkNested({ title: 'Пробежать полумарафон', groupId: gSport, difficulty: 'veryHard', attributeIds: [END, STR, DEX], coinReward: 200, gemReward: 10, subtasks: [
      { id: uid(), title: 'Составить план тренировок на 12 недель', isCompleted: true, completedAt: ts - 20 * DAY },
      { id: uid(), title: 'Пробежать 10 км', isCompleted: true, completedAt: ts - 7 * DAY },
      { id: uid(), title: 'Пробежать 15 км', isCompleted: false },
      { id: uid(), title: 'Финишировать 21.1 км', isCompleted: false },
    ] }),
    mkCheckbox({ title: 'Принять витамины / добавки', groupId: gSport, difficulty: 'easy', attributeIds: [END], coinReward: 5, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Тренировка по боксу', groupId: gSport, difficulty: 'hard', attributeIds: [STR, DEX, END], coinReward: 45, gemReward: 1, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 2, endMode: 'never' } }),

    // === БИЗНЕС ===
    mkCheckbox({ title: 'Провести созвон с командой', groupId: gBusiness, difficulty: 'easy', attributeIds: [CHA], coinReward: 15, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Ответить на все DM и email', groupId: gBusiness, difficulty: 'easy', attributeIds: [CHA], coinReward: 10, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkNested({ title: 'Запустить рекламную кампанию', groupId: gBusiness, difficulty: 'veryHard', attributeIds: [INT, CRE, CHA], coinReward: 120, gemReward: 5, subtasks: [
      { id: uid(), title: 'Определить целевую аудиторию', isCompleted: true, completedAt: ts - 4 * DAY },
      { id: uid(), title: 'Сделать креативы', isCompleted: false },
      { id: uid(), title: 'Настроить таргетинг', isCompleted: false },
      { id: uid(), title: 'Запустить A/B тест', isCompleted: false },
      { id: uid(), title: 'Проанализировать результаты', isCompleted: false },
    ] }),
    mkCheckbox({ title: 'Обновить CRM / трекер лидов', groupId: gBusiness, difficulty: 'easy', attributeIds: [INT], coinReward: 10, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCounter({ title: 'Закрыть 3 сделки с рекламодателями', groupId: gBusiness, target: 3, current: 1, difficulty: 'veryHard', attributeIds: [CHA, INT], coinReward: 100, gemReward: 5, countUnit: 'сделки', recurrence: 'monthly', recurrenceSettings: { type: 'monthly', endMode: 'never' } }),
    mkCheckbox({ title: 'Проверить аналитику каналов', groupId: gBusiness, difficulty: 'easy', attributeIds: [INT], coinReward: 10, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [1], endMode: 'never' } }),
    mkCheckbox({ title: 'Выставить счёт за интеграцию', groupId: gBusiness, difficulty: 'medium', attributeIds: [INT], coinReward: 25, recurrence: 'monthly', recurrenceSettings: { type: 'monthly', endMode: 'never' } }),

    // === ЖИЗНЬ ===
    mkCheckbox({ title: 'Прибраться в квартире', groupId: gLife, difficulty: 'medium', attributeIds: [END], coinReward: 15, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [6], endMode: 'never' } }),
    mkCheckbox({ title: 'Приготовить meal prep', groupId: gLife, difficulty: 'medium', attributeIds: [CRE, END], coinReward: 20, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [0], endMode: 'never' } }),
    mkCheckbox({ title: 'Позвонить родителям', groupId: gLife, difficulty: 'easy', attributeIds: [CHA], coinReward: 10, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 2, endMode: 'never' } }),
    mkCheckbox({ title: 'Лечь спать до 23:00', groupId: gLife, difficulty: 'medium', attributeIds: [END], coinReward: 15, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Digital detox 1 час', groupId: gLife, difficulty: 'medium', attributeIds: [END, CRE], coinReward: 15, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Погулять на свежем воздухе', groupId: gLife, difficulty: 'easy', attributeIds: [END], coinReward: 10, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkNested({ title: 'Организовать поездку с друзьями', groupId: gLife, difficulty: 'hard', attributeIds: [CHA, CRE], coinReward: 80, gemReward: 3, subtasks: [
      { id: uid(), title: 'Выбрать место', isCompleted: true, completedAt: ts - 5 * DAY },
      { id: uid(), title: 'Забронировать жильё', isCompleted: false },
      { id: uid(), title: 'Составить маршрут', isCompleted: false },
      { id: uid(), title: 'Собрать вещи', isCompleted: false },
    ] }),

    // === САМОРАЗВИТИЕ ===
    mkCounter({ title: 'Прочитать 30 страниц книги', groupId: gSelfDev, target: 30, current: 12, difficulty: 'medium', attributeIds: [INT], coinReward: 20, countUnit: 'стр', recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Медитация 15 минут', groupId: gSelfDev, difficulty: 'easy', attributeIds: [END, CRE], coinReward: 10, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' }, currentStreak: 14, bestStreak: 30 }),
    mkCheckbox({ title: 'Написать в дневник', groupId: gSelfDev, difficulty: 'easy', attributeIds: [CRE, INT], coinReward: 5, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Послушать подкаст по бизнесу', groupId: gSelfDev, difficulty: 'easy', attributeIds: [INT, CHA], coinReward: 10, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Урок английского', groupId: gSelfDev, difficulty: 'medium', attributeIds: [INT, CHA], coinReward: 25, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 3, endMode: 'never' } }),
    mkNested({ title: 'Пройти курс по Web3-разработке', groupId: gSelfDev, difficulty: 'veryHard', attributeIds: [INT, CRE], coinReward: 200, gemReward: 10, subtasks: [
      { id: uid(), title: 'Модуль 1: Solidity основы', isCompleted: true, completedAt: ts - 10 * DAY },
      { id: uid(), title: 'Модуль 2: Smart Contracts', isCompleted: true, completedAt: ts - 7 * DAY },
      { id: uid(), title: 'Модуль 3: DeFi протоколы', isCompleted: false },
      { id: uid(), title: 'Модуль 4: NFT и токенизация', isCompleted: false },
      { id: uid(), title: 'Модуль 5: Аудит безопасности', isCompleted: false },
      { id: uid(), title: 'Финальный проект: свой dApp', isCompleted: false },
    ] }),
    mkCounter({ title: 'Прочитать 24 книги за год', target: 24, current: 7, difficulty: 'veryHard', attributeIds: [INT], coinReward: 150, gemReward: 10, countUnit: 'книг', recurrence: 'yearly', recurrenceSettings: { type: 'yearly', endMode: 'never' } }),
    mkCheckbox({ title: 'Посмотреть доклад / лекцию', groupId: gSelfDev, difficulty: 'easy', attributeIds: [INT], coinReward: 10, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [0], endMode: 'never' } }),
  ]

  // ─── Item Groups ───────────────────────────────────────────────────────────

  const itemGroups: ItemGroup[] = [
    { id: uid(), profileId, name: 'Шопинг и стиль', sortOrder: 0, createdAt: ts, updatedAt: ts, color: '#f59e0b' },
    { id: uid(), profileId, name: 'Еда и напитки', sortOrder: 1, createdAt: ts, updatedAt: ts, color: '#10b981' },
    { id: uid(), profileId, name: 'Отдых и SPA', sortOrder: 2, createdAt: ts, updatedAt: ts, color: '#06b6d4' },
    { id: uid(), profileId, name: 'Гаджеты и техника', sortOrder: 3, createdAt: ts, updatedAt: ts, color: '#3b82f6' },
    { id: uid(), profileId, name: 'Бонусы', sortOrder: 4, createdAt: ts, updatedAt: ts, color: '#ef4444' },
    { id: uid(), profileId, name: 'Развлечения', sortOrder: 5, createdAt: ts, updatedAt: ts, color: '#8b5cf6' },
    { id: uid(), profileId, name: 'Опыт и впечатления', sortOrder: 6, createdAt: ts, updatedAt: ts, color: '#ec4899' },
    { id: uid(), profileId, name: 'Сериалы', sortOrder: 7, createdAt: ts, updatedAt: ts, color: '#f97316' },
    { id: uid(), profileId, name: 'Игры', sortOrder: 8, createdAt: ts, updatedAt: ts, color: '#6366f1' },
  ]
  const [igStyle, igFood, igRelax, igGadget, igBonus, igFun, igExperience, igSerials, igGames] = itemGroups.map(g => g.id)

  // ─── Shop Items ────────────────────────────────────────────────────────────

  const shopItems: ShopItem[] = [
    // --- Шопинг и стиль ---
    { id: uid(), profileId, name: 'Новая футболка', description: 'Стильная обновка', icon: '👕', rarity: 'common', cost: { coins: 80, gems: 0 }, isLootBox: false, groupId: igStyle },
    { id: uid(), profileId, name: 'Кроссовки', description: 'Новая пара для бега или стиля', icon: '👟', rarity: 'rare', cost: { coins: 500, gems: 5 }, isLootBox: false, groupId: igStyle },
    { id: uid(), profileId, name: 'Худи оверсайз', description: 'Комфорт и стиль', icon: '🧥', rarity: 'uncommon', cost: { coins: 200, gems: 2 }, isLootBox: false, groupId: igStyle },
    { id: uid(), profileId, name: 'Солнцезащитные очки', description: 'Для контента и жизни', icon: '🕶️', rarity: 'uncommon', cost: { coins: 150, gems: 1 }, isLootBox: false, groupId: igStyle },
    { id: uid(), profileId, name: 'Парфюм', description: 'Любимый аромат', icon: '🧴', rarity: 'rare', cost: { coins: 400, gems: 4 }, isLootBox: false, groupId: igStyle },
    { id: uid(), profileId, name: 'Стрижка у барбера', description: 'Свежий образ', icon: '💈', rarity: 'common', cost: { coins: 100, gems: 0 }, isLootBox: false, groupId: igStyle },
    { id: uid(), profileId, name: 'Рюкзак', description: 'Стильный городской рюкзак', icon: '🎒', rarity: 'uncommon', cost: { coins: 250, gems: 2 }, isLootBox: false, groupId: igStyle },
    { id: uid(), profileId, name: 'Часы', description: 'Награда за большой прогресс', icon: '⌚', rarity: 'legendary', cost: { coins: 2000, gems: 20 }, isLootBox: false, groupId: igStyle },

    // --- Еда и напитки ---
    { id: uid(), profileId, name: 'Кофе из кофейни', description: 'Капучино или латте', icon: '☕', rarity: 'common', cost: { coins: 30, gems: 0 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Протеиновый коктейль', description: 'После тренировки', icon: '🥤', rarity: 'common', cost: { coins: 25, gems: 0 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Доставка здоровой еды', description: 'Правильное питание на день', icon: '🥗', rarity: 'uncommon', cost: { coins: 100, gems: 0 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Стейк в ресторане', description: 'Рибай medium rare', icon: '🥩', rarity: 'rare', cost: { coins: 400, gems: 3 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Суши-сет', description: 'Набор из 24 штук', icon: '🍣', rarity: 'uncommon', cost: { coins: 120, gems: 0 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Пицца', description: 'Целая пицца с доставкой', icon: '🍕', rarity: 'common', cost: { coins: 60, gems: 0 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Ужин в ресторане', description: 'На выбор', icon: '🍽️', rarity: 'rare', cost: { coins: 400, gems: 3 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Бургер крафтовый', description: 'Из авторской бургерной', icon: '🍔', rarity: 'common', cost: { coins: 80, gems: 0 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Смузи детокс', description: 'Зелёный микс', icon: '🥬', rarity: 'common', cost: { coins: 35, gems: 0 }, isLootBox: false, groupId: igFood },

    // --- Отдых и SPA ---
    { id: uid(), profileId, name: 'Массаж 60 мин', description: 'Спортивный массаж', icon: '💆', rarity: 'rare', cost: { coins: 350, gems: 3 }, isLootBox: false, groupId: igRelax },
    { id: uid(), profileId, name: 'Spa-день', description: 'Полный день релакса', icon: '🧖', rarity: 'epic', cost: { coins: 800, gems: 8 }, isLootBox: false, groupId: igRelax },
    { id: uid(), profileId, name: 'Баня / сауна', description: 'Парение + бассейн', icon: '🧊', rarity: 'uncommon', cost: { coins: 200, gems: 1 }, isLootBox: false, groupId: igRelax },
    { id: uid(), profileId, name: 'Дневной сон 30 мин', description: 'Сиеста без стыда', icon: '😴', rarity: 'common', cost: { coins: 15, gems: 0 }, isLootBox: false, groupId: igRelax },
    { id: uid(), profileId, name: 'Флоат-камера', description: 'Час в сенсорной депривации', icon: '🌊', rarity: 'rare', cost: { coins: 300, gems: 2 }, isLootBox: false, groupId: igRelax },
    { id: uid(), profileId, name: 'Криокамера', description: 'Восстановление после тренировки', icon: '❄️', rarity: 'uncommon', cost: { coins: 180, gems: 1 }, isLootBox: false, groupId: igRelax },

    // --- Гаджеты и техника ---
    { id: uid(), profileId, name: 'Кольцевая лампа', description: 'Для съёмки контента', icon: '💡', rarity: 'uncommon', cost: { coins: 150, gems: 1 }, isLootBox: false, groupId: igGadget },
    { id: uid(), profileId, name: 'Беспроводные наушники', description: 'AirPods Pro', icon: '🎧', rarity: 'rare', cost: { coins: 600, gems: 5 }, isLootBox: false, groupId: igGadget },
    { id: uid(), profileId, name: 'Микрофон для подкаста', description: 'Качественный звук', icon: '🎙️', rarity: 'rare', cost: { coins: 500, gems: 4 }, isLootBox: false, groupId: igGadget },
    { id: uid(), profileId, name: 'Экшн-камера', description: 'GoPro для влогов', icon: '📸', rarity: 'epic', cost: { coins: 1200, gems: 12 }, isLootBox: false, groupId: igGadget },
    { id: uid(), profileId, name: 'Второй монитор', description: 'Для продуктивности', icon: '🖥️', rarity: 'epic', cost: { coins: 1500, gems: 15 }, isLootBox: false, groupId: igGadget },
    { id: uid(), profileId, name: 'Фитнес-браслет', description: 'Отслеживание тренировок', icon: '⌚', rarity: 'rare', cost: { coins: 700, gems: 7 }, isLootBox: false, groupId: igGadget },
    { id: uid(), profileId, name: 'Механическая клавиатура', description: 'Для комфортной работы', icon: '⌨️', rarity: 'rare', cost: { coins: 600, gems: 5 }, isLootBox: false, groupId: igGadget },
    { id: uid(), profileId, name: 'Стабилизатор для телефона', description: 'Gimbal для видео', icon: '📱', rarity: 'uncommon', cost: { coins: 250, gems: 2 }, isLootBox: false, groupId: igGadget },

    // --- Бонусы ---
    { id: uid(), profileId, name: 'Скидка 10%', description: 'На следующую покупку', icon: '🏷️', rarity: 'common', cost: { coins: 50, gems: 0 }, isLootBox: false, groupId: igBonus, isDiscountVoucher: true, discountPercent: 10 },
    { id: uid(), profileId, name: 'Скидка 25%', description: 'На следующую покупку', icon: '🏷️', rarity: 'uncommon', cost: { coins: 120, gems: 1 }, isLootBox: false, groupId: igBonus, isDiscountVoucher: true, discountPercent: 25 },
    { id: uid(), profileId, name: 'Скидка 50%', description: 'На следующую покупку', icon: '🏷️', rarity: 'rare', cost: { coins: 250, gems: 3 }, isLootBox: false, groupId: igBonus, isDiscountVoucher: true, discountPercent: 50 },
    { id: uid(), profileId, name: 'Множитель x1.5', description: 'Награды задач x1.5 каждые 3 выполнения', icon: '⚡', rarity: 'uncommon', cost: { coins: 200, gems: 2 }, isLootBox: false, groupId: igBonus, streakMultiplierEnabled: true, streakMultiplierMode: 'streak', streakMultiplierValue: 1.5, streakMultiplierInterval: 3 },
    { id: uid(), profileId, name: 'Множитель x2', description: 'Награды задач x2 каждые 5 выполнений', icon: '⚡', rarity: 'rare', cost: { coins: 400, gems: 5 }, isLootBox: false, groupId: igBonus, streakMultiplierEnabled: true, streakMultiplierMode: 'streak', streakMultiplierValue: 2, streakMultiplierInterval: 5 },
    { id: uid(), profileId, name: 'Множитель x2.5 инстант', description: 'Награды x2.5 для 10 выполнений', icon: '💥', rarity: 'epic', cost: { coins: 600, gems: 8 }, isLootBox: false, groupId: igBonus, streakMultiplierEnabled: true, streakMultiplierMode: 'instant', streakMultiplierValue: 2.5, streakMultiplierInterval: 1 },
    { id: uid(), profileId, name: 'Заморозка стрика', description: 'Защита стрика на 3 дня', icon: '🧊', rarity: 'uncommon', cost: { coins: 150, gems: 1 }, isLootBox: false, groupId: igBonus },

    // --- Лутбоксы ---
    { id: uid(), profileId, name: 'Крипто-кейс', description: 'Рандомная крипто-награда!', icon: '📦', rarity: 'uncommon', cost: { coins: 75, gems: 0 }, isLootBox: true, groupId: igBonus, lootTable: [
      { id: CURRENCY_IDS.COINS, weight: 40, quantity: 20 },
      { id: CURRENCY_IDS.COINS, weight: 15, quantity: 50 },
      { id: CURRENCY_IDS.GEMS, weight: 15, quantity: 1 },
      { id: CURRENCY_IDS.GEMS, weight: 5, quantity: 3 },
    ] },
    { id: uid(), profileId, name: 'Whale-сундук', description: 'Китовый лут гарантирован!', icon: '🐋', rarity: 'epic', cost: { coins: 300, gems: 3 }, isLootBox: true, groupId: igBonus, lootTable: [
      { id: CURRENCY_IDS.COINS, weight: 30, quantity: 200 },
      { id: CURRENCY_IDS.GEMS, weight: 20, quantity: 5 },
      { id: CURRENCY_IDS.GEMS, weight: 10, quantity: 10 },
      { id: CURRENCY_IDS.COINS, weight: 5, quantity: 500 },
    ] },

    // --- Развлечения ---
    { id: uid(), profileId, name: 'Поход в кино', description: 'Билет на фильм', icon: '🎬', rarity: 'common', cost: { coins: 100, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Билет на концерт', description: 'Живая музыка', icon: '🎵', rarity: 'rare', cost: { coins: 500, gems: 5 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Картинг', description: 'Гонки на картах', icon: '🏎️', rarity: 'uncommon', cost: { coins: 200, gems: 1 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Квест-комната', description: 'Загадки и приключения', icon: '🔐', rarity: 'uncommon', cost: { coins: 250, gems: 2 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Скалодром', description: 'Час лазания', icon: '🧗', rarity: 'uncommon', cost: { coins: 180, gems: 1 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Фильм: Интерстеллар', description: 'Космос, время, любовь', icon: '🌌', rarity: 'uncommon', cost: { coins: 80, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Фильм: Волк с Уолл-стрит', description: 'Мотивация и безумие', icon: '💵', rarity: 'uncommon', cost: { coins: 80, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Фильм: Социальная сеть', description: 'История создания Facebook', icon: '👤', rarity: 'uncommon', cost: { coins: 80, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Фильм: Начало', description: 'Сны внутри снов', icon: '🌀', rarity: 'uncommon', cost: { coins: 80, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Фильм: Бойцовский клуб', description: 'Первое правило...', icon: '🥊', rarity: 'uncommon', cost: { coins: 80, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Фильм: Джентльмены', description: 'Стиль, юмор, Гай Ричи', icon: '🎩', rarity: 'uncommon', cost: { coins: 80, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Фильм: Тёмный рыцарь', description: 'Лучший Джокер', icon: '🦇', rarity: 'uncommon', cost: { coins: 80, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Фильм: Матрица', description: 'Красная или синяя?', icon: '💊', rarity: 'uncommon', cost: { coins: 80, gems: 0 }, isLootBox: false, groupId: igFun },

    // --- Опыт и впечатления ---
    { id: uid(), profileId, name: 'Прыжок с парашютом', description: 'Адреналин!', icon: '🪂', rarity: 'legendary', cost: { coins: 2500, gems: 25 }, isLootBox: false, groupId: igExperience },
    { id: uid(), profileId, name: 'Поездка на выходные', description: 'Мини-путешествие', icon: '🚗', rarity: 'epic', cost: { coins: 1500, gems: 15 }, isLootBox: false, groupId: igExperience },
    { id: uid(), profileId, name: 'Крипто-конференция', description: 'Билет + нетворкинг', icon: '🎤', rarity: 'epic', cost: { coins: 1000, gems: 10 }, isLootBox: false, groupId: igExperience },
    { id: uid(), profileId, name: 'Мастер-класс по фото/видео', description: 'Улучшение скиллов', icon: '📷', rarity: 'rare', cost: { coins: 400, gems: 4 }, isLootBox: false, groupId: igExperience },
    { id: uid(), profileId, name: 'Дайвинг', description: 'Погружение с инструктором', icon: '🤿', rarity: 'rare', cost: { coins: 500, gems: 5 }, isLootBox: false, groupId: igExperience },

    // --- Сериалы (isTvSerial) ---
    { id: uid(), profileId, name: 'Кремниевая долина', description: 'IT-стартап комедия', icon: '💻', rarity: 'epic', cost: { coins: 300, gems: 3 }, isLootBox: false, groupId: igSerials, isTvSerial: true, serialSeasons: [
      { id: uid(), number: 1, episodes: Array.from({ length: 8 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 2, episodes: Array.from({ length: 10 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 3, episodes: Array.from({ length: 10 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 4, episodes: Array.from({ length: 10 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 5, episodes: Array.from({ length: 8 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 6, episodes: Array.from({ length: 7 }, (_, i) => ({ id: uid(), number: i + 1, cost: 35 })) },
    ] },
    { id: uid(), profileId, name: 'Во все тяжкие', description: 'Классика сериалов', icon: '🧪', rarity: 'legendary', cost: { coins: 400, gems: 4 }, isLootBox: false, groupId: igSerials, isTvSerial: true, serialSeasons: [
      { id: uid(), number: 1, episodes: Array.from({ length: 7 }, (_, i) => ({ id: uid(), number: i + 1, cost: 25 })) },
      { id: uid(), number: 2, episodes: Array.from({ length: 13 }, (_, i) => ({ id: uid(), number: i + 1, cost: 25 })) },
      { id: uid(), number: 3, episodes: Array.from({ length: 13 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 4, episodes: Array.from({ length: 13 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 5, episodes: Array.from({ length: 16 }, (_, i) => ({ id: uid(), number: i + 1, cost: 35 })) },
    ] },
    { id: uid(), profileId, name: 'Пацаны (The Boys)', description: 'Супергерои наизнанку', icon: '🦸', rarity: 'epic', cost: { coins: 300, gems: 3 }, isLootBox: false, groupId: igSerials, isTvSerial: true, serialSeasons: [
      { id: uid(), number: 1, episodes: Array.from({ length: 8 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 2, episodes: Array.from({ length: 8 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 3, episodes: Array.from({ length: 8 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 4, episodes: Array.from({ length: 8 }, (_, i) => ({ id: uid(), number: i + 1, cost: 35 })) },
    ] },

    // --- Игры (isVideoGame) ---
    { id: uid(), profileId, name: 'Baldur\'s Gate 3', description: 'RPG мечты', icon: '⚔️', rarity: 'legendary', cost: { coins: 500, gems: 5 }, isLootBox: false, groupId: igGames, isVideoGame: true, gameTimePackages: [
      { id: uid(), hours: 1, cost: 50 },
      { id: uid(), hours: 2, cost: 90 },
      { id: uid(), hours: 4, cost: 160 },
    ], gameTimeTotalMinutes: 0, gameTimePlayedMinutes: 0 },
    { id: uid(), profileId, name: 'Elden Ring', description: 'Открытый мир хардкор', icon: '🗡️', rarity: 'legendary', cost: { coins: 500, gems: 5 }, isLootBox: false, groupId: igGames, isVideoGame: true, gameTimePackages: [
      { id: uid(), hours: 1, cost: 50 },
      { id: uid(), hours: 3, cost: 130 },
    ], gameTimeTotalMinutes: 0, gameTimePlayedMinutes: 0 },
    { id: uid(), profileId, name: 'Hades II', description: 'Roguelike шедевр', icon: '🔥', rarity: 'rare', cost: { coins: 300, gems: 3 }, isLootBox: false, groupId: igGames, isVideoGame: true, gameTimePackages: [
      { id: uid(), hours: 1, cost: 40 },
      { id: uid(), hours: 2, cost: 70 },
    ], gameTimeTotalMinutes: 0, gameTimePlayedMinutes: 0 },
    { id: uid(), profileId, name: 'GTA VI', description: 'Когда выйдет...', icon: '🌴', rarity: 'legendary', cost: { coins: 600, gems: 6 }, isLootBox: false, groupId: igGames, isVideoGame: true, gameTimePackages: [
      { id: uid(), hours: 1, cost: 60 },
      { id: uid(), hours: 2, cost: 100 },
      { id: uid(), hours: 5, cost: 220 },
    ], gameTimeTotalMinutes: 0, gameTimePlayedMinutes: 0 },
  ]

  // ─── Achievement Groups ────────────────────────────────────────────────────

  const achievementGroups: AchievementGroup[] = [
    { id: uid(), profileId, name: 'Новичок', icon: '🌱', color: '#22c55e', sortOrder: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Крипто-кит', icon: '🐋', color: '#f59e0b', sortOrder: 1, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Контент-мастер', icon: '🎬', color: '#ec4899', sortOrder: 2, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Атлет', icon: '🏋️', color: '#ef4444', sortOrder: 3, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Бизнес-акула', icon: '🦈', color: '#3b82f6', sortOrder: 4, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Учёный', icon: '🧠', color: '#8b5cf6', sortOrder: 5, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Секретные', icon: '🔮', color: '#6366f1', sortOrder: 6, createdAt: ts, updatedAt: ts },
  ]
  const [agBeginner, agCrypto, agContent, agAthlete, agBusiness, agScholar, agSecret] = achievementGroups.map(g => g.id)

  // ─── Achievements ──────────────────────────────────────────────────────────

  const achievements: Achievement[] = [
    // Новичок
    { id: uid(), profileId, groupId: agBeginner, title: 'Первый шаг', description: 'Выполни 1 задачу', icon: '👣', condition: { type: 'tasks_completed', targetValue: 1 }, rewardCoins: 10, rewardGems: 0, rewardXp: 10, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agBeginner, title: 'Начало пути', description: 'Выполни 5 задач', icon: '🚶', condition: { type: 'tasks_completed', targetValue: 5 }, rewardCoins: 25, rewardGems: 1, rewardXp: 30, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agBeginner, title: 'Разгон', description: 'Выполни 25 задач', icon: '🔥', condition: { type: 'tasks_completed', targetValue: 25 }, rewardCoins: 100, rewardGems: 3, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agBeginner, title: 'Полусотня', description: 'Выполни 50 задач', icon: '🌟', condition: { type: 'tasks_completed', targetValue: 50 }, rewardCoins: 200, rewardGems: 5, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agBeginner, title: 'Сотня', description: 'Выполни 100 задач', icon: '💯', condition: { type: 'tasks_completed', targetValue: 100 }, rewardCoins: 500, rewardGems: 10, rewardXp: 500, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },

    // Крипто-кит
    { id: uid(), profileId, groupId: agCrypto, title: 'Первая транзакция', description: 'Проверь портфель 7 дней подряд', icon: '📈', condition: { type: 'task_streak', targetValue: 7, taskId: tasks[0].id }, rewardCoins: 50, rewardGems: 2, rewardXp: 50, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agCrypto, title: 'Diamond Hands', description: 'Стрик новостей 30 дней', icon: '💎', condition: { type: 'task_streak', targetValue: 30, taskId: tasks[1].id }, rewardCoins: 300, rewardGems: 10, rewardXp: 300, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agCrypto, title: 'Нода-мастер', description: 'Запусти ноду валидатора', icon: '🖥️', condition: { type: 'task_completed_total', targetValue: 1, taskId: tasks.find(t => t.title === 'Запустить ноду валидатора')?.id }, rewardCoins: 200, rewardGems: 10, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agCrypto, title: 'DeFi-дегенерат', description: 'Запусти DeFi-стратегию', icon: '🐸', condition: { type: 'task_completed_total', targetValue: 1, taskId: tasks.find(t => t.title === 'Запустить DeFi-стратегию')?.id }, rewardCoins: 150, rewardGems: 5, rewardXp: 150, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agCrypto, title: 'Тестнет-гриндер', description: 'Пройди 10 тестнетов', icon: '🧪', condition: { type: 'task_completed_total', targetValue: 10, taskId: tasks.find(t => t.title === 'Пройти 3 тестнета')?.id }, rewardCoins: 500, rewardGems: 15, rewardXp: 500, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },

    // Контент-мастер
    { id: uid(), profileId, groupId: agContent, title: 'Первый рилс', description: 'Сними 1 Reels/TikTok', icon: '🎥', condition: { type: 'task_completed_total', targetValue: 1, taskId: tasks.find(t => t.title === 'Снять Reels/TikTok')?.id }, rewardCoins: 20, rewardGems: 1, rewardXp: 20, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agContent, title: 'Контент-машина', description: 'Стрик рилсов 21 день', icon: '🤖', condition: { type: 'task_streak', targetValue: 21, taskId: tasks.find(t => t.title === 'Снять Reels/TikTok')?.id }, rewardCoins: 200, rewardGems: 8, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agContent, title: 'YouTube-дебют', description: 'Выложи первое YouTube-видео', icon: '▶️', condition: { type: 'task_completed_total', targetValue: 1, taskId: tasks.find(t => t.title === 'Снять YouTube-видео')?.id }, rewardCoins: 100, rewardGems: 5, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agContent, title: 'Коллаб-кинг', description: 'Сделай 10 коллабов', icon: '🤝', condition: { type: 'task_completed_total', targetValue: 10, taskId: tasks.find(t => t.title === 'Сделать коллаб с другим креатором')?.id }, rewardCoins: 300, rewardGems: 10, rewardXp: 300, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agContent, title: 'Инфлюенсер', description: 'Набери 500 подписчиков', icon: '👑', condition: { type: 'task_completed_total', targetValue: 1, taskId: tasks.find(t => t.title === 'Набрать 500 новых подписчиков')?.id }, rewardCoins: 500, rewardGems: 20, rewardXp: 500, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },

    // Атлет
    { id: uid(), profileId, groupId: agAthlete, title: 'Качок', description: 'Сила достигла 5 уровня', icon: '💪', condition: { type: 'attribute_level', targetValue: 5, attributeId: STR }, rewardCoins: 100, rewardGems: 3, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agAthlete, title: 'Стальная воля', description: 'Выносливость достигла 5 уровня', icon: '🛡️', condition: { type: 'attribute_level', targetValue: 5, attributeId: END }, rewardCoins: 100, rewardGems: 3, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agAthlete, title: 'Марафонец', description: 'Пробеги 5 км 10 раз', icon: '🏅', condition: { type: 'task_completed_total', targetValue: 10, taskId: tasks.find(t => t.title === 'Пробежать 5 км')?.id }, rewardCoins: 200, rewardGems: 5, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agAthlete, title: 'Железный человек', description: 'Тренировка в зале 30 раз', icon: '🏋️', condition: { type: 'task_completed_total', targetValue: 30, taskId: tasks.find(t => t.title === 'Тренировка в зале (силовая)')?.id }, rewardCoins: 300, rewardGems: 8, rewardXp: 300, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agAthlete, title: 'Полумарафонец', description: 'Пробеги полумарафон', icon: '🏃', condition: { type: 'task_completed_total', targetValue: 1, taskId: tasks.find(t => t.title === 'Пробежать полумарафон')?.id }, rewardCoins: 500, rewardGems: 15, rewardXp: 500, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agAthlete, title: 'Боксёр', description: '20 тренировок по боксу', icon: '🥊', condition: { type: 'task_completed_total', targetValue: 20, taskId: tasks.find(t => t.title === 'Тренировка по боксу')?.id }, rewardCoins: 250, rewardGems: 8, rewardXp: 250, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agAthlete, title: 'Ледяной воин', description: 'Холодный душ 30 дней подряд', icon: '🥶', condition: { type: 'task_streak', targetValue: 30, taskId: tasks.find(t => t.title === 'Холодный душ')?.id }, rewardCoins: 200, rewardGems: 8, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },

    // Бизнес-акула
    { id: uid(), profileId, groupId: agBusiness, title: 'Первая сделка', description: 'Закрой первую сделку с рекламодателем', icon: '🤝', condition: { type: 'task_completed_total', targetValue: 1, taskId: tasks.find(t => t.title === 'Закрыть 3 сделки с рекламодателями')?.id }, rewardCoins: 100, rewardGems: 5, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agBusiness, title: 'Шопоголик', description: 'Потрать 1000 монет в магазине', icon: '🛒', condition: { type: 'coins_earned_spent', targetValue: 1000, coinMode: 'spent' }, rewardCoins: 100, rewardGems: 3, rewardXp: 50, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agBusiness, title: 'Магнат', description: 'Заработай 5000 монет', icon: '💰', condition: { type: 'coins_earned_spent', targetValue: 5000, coinMode: 'earned' }, rewardCoins: 300, rewardGems: 10, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agBusiness, title: 'Миллионер', description: 'Заработай 10000 монет', icon: '🤑', condition: { type: 'coins_earned_spent', targetValue: 10000, coinMode: 'earned' }, rewardCoins: 1000, rewardGems: 25, rewardXp: 500, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },

    // Учёный
    { id: uid(), profileId, groupId: agScholar, title: 'Книжный червь', description: 'Интеллект достиг 3 уровня', icon: '📚', condition: { type: 'attribute_level', targetValue: 3, attributeId: INT }, rewardCoins: 50, rewardGems: 1, rewardXp: 50, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agScholar, title: 'Мудрец', description: 'Интеллект достиг 7 уровня', icon: '🧙', condition: { type: 'attribute_level', targetValue: 7, attributeId: INT }, rewardCoins: 200, rewardGems: 5, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agScholar, title: 'Полиглот', description: 'Урок английского 15 раз', icon: '🌍', condition: { type: 'task_completed_total', targetValue: 15, taskId: tasks.find(t => t.title === 'Урок английского')?.id }, rewardCoins: 150, rewardGems: 5, rewardXp: 150, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agScholar, title: 'Web3-разработчик', description: 'Пройди курс по Web3', icon: '💻', condition: { type: 'task_completed_total', targetValue: 1, taskId: tasks.find(t => t.title === 'Пройти курс по Web3-разработке')?.id }, rewardCoins: 300, rewardGems: 10, rewardXp: 300, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agScholar, title: 'Креатив', description: 'Креативность достигла 5 уровня', icon: '🎨', condition: { type: 'attribute_level', targetValue: 5, attributeId: CRE }, rewardCoins: 100, rewardGems: 3, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },

    // Секретные
    { id: uid(), profileId, groupId: agSecret, title: 'Ранняя пташка', description: 'Выполни задачу до 7:00 утра', icon: '🐓', condition: { type: 'custom', targetValue: 1 }, rewardCoins: 50, rewardGems: 2, rewardXp: 50, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agSecret, title: 'Ночной волк', description: 'Выполни задачу после полуночи', icon: '🐺', condition: { type: 'custom', targetValue: 1 }, rewardCoins: 50, rewardGems: 2, rewardXp: 50, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agSecret, title: 'To the Moon', description: 'Заработай 1000 монет за день', icon: '🚀', condition: { type: 'custom', targetValue: 1 }, rewardCoins: 200, rewardGems: 10, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agSecret, title: 'WAGMI', description: 'Все атрибуты на 3+ уровне', icon: '🌈', condition: { type: 'custom', targetValue: 1 }, rewardCoins: 200, rewardGems: 10, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agSecret, title: 'Перфекционист', description: 'Выполни все подзадачи за один день', icon: '✨', condition: { type: 'custom', targetValue: 1 }, rewardCoins: 100, rewardGems: 5, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },

    // Повторяемые
    { id: uid(), profileId, groupId: agBeginner, title: 'Ежедневный герой', description: 'Выполни 5 задач за день', icon: '⭐', condition: { type: 'tasks_completed', targetValue: 5 }, rewardCoins: 25, rewardGems: 1, rewardXp: 25, unlocked: false, currentProgress: 0, repeatable: true, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agBusiness, title: 'Копилка', description: 'Заработай 100 монет', icon: '🐷', condition: { type: 'coins_earned_spent', targetValue: 100, coinMode: 'earned' }, rewardCoins: 10, rewardGems: 0, rewardXp: 10, unlocked: false, currentProgress: 0, repeatable: true, createdAt: ts, updatedAt: ts },
  ]

  // ─── Craft Recipes ─────────────────────────────────────────────────────────

  const findTask = (title: string) => tasks.find(t => t.title === title)?.id ?? ''
  const findItem = (name: string) => shopItems.find(i => i.name === name)?.id ?? ''

  const craftRecipes: CraftRecipe[] = [
    {
      id: uid(), profileId,
      fragmentName: 'Фрагмент кроссовка', fragmentIcon: 'Footprints', fragmentColor: '#f59e0b',
      fragmentsRequired: 15, fragmentsCollected: 6,
      resultItemId: findItem('Кроссовки'), resultName: 'Кроссовки',
      resultDescription: 'Собери 15 фрагментов за крипто-задачи!', resultRarity: 'rare', resultIcon: '👟',
      craftCost: { coins: 0, gems: 0 },
      fragmentSource: { type: 'task_linked', linkedTaskIds: [findTask('Прочитать крипто-новости'), findTask('Проверить портфель на DEX')], dropChance: 20 },
      crafted: false, createdAt: ts - 15 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId,
      fragmentName: 'Фрагмент камеры', fragmentIcon: 'Camera', fragmentColor: '#ec4899',
      fragmentsRequired: 10, fragmentsCollected: 4,
      resultItemId: findItem('Экшн-камера'), resultName: 'Экшн-камера',
      resultDescription: 'Собери 10 фрагментов за контент!', resultRarity: 'epic', resultIcon: '📸',
      craftCost: { coins: 200, gems: 2 },
      fragmentSource: { type: 'task_linked', linkedTaskIds: [findTask('Снять Reels/TikTok'), findTask('Снять YouTube-видео')], dropChance: 20 },
      crafted: false, createdAt: ts - 12 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId,
      fragmentName: 'Фрагмент книги', fragmentIcon: 'BookOpen', fragmentColor: '#3b82f6',
      fragmentsRequired: 5, fragmentsCollected: 3,
      resultItemId: '', resultName: 'Новая книга',
      resultDescription: 'Собери 5 фрагментов — выбери любую книгу', resultRarity: 'rare', resultIcon: '📕',
      craftCost: { coins: 50, gems: 0 },
      fragmentSource: { type: 'task_linked', linkedTaskIds: [findTask('Прочитать 30 страниц книги')], dropChance: 40 },
      crafted: false, createdAt: ts - 8 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId,
      fragmentName: 'Фрагмент здоровья', fragmentIcon: 'Heart', fragmentColor: '#ef4444',
      fragmentsRequired: 15, fragmentsCollected: 7,
      resultItemId: findItem('Spa-день'), resultName: 'Spa-день',
      resultDescription: 'Забота о теле = spa!', resultRarity: 'epic', resultIcon: '🧖',
      craftCost: { coins: 0, gems: 0 },
      fragmentSource: { type: 'task_linked', linkedTaskIds: [findTask('Утренняя тренировка 30 мин'), findTask('Тренировка в зале (силовая)')], dropChance: 20 },
      crafted: false, createdAt: ts - 15 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId,
      fragmentName: 'Кристалл стрика', fragmentIcon: 'Zap', fragmentColor: '#f59e0b',
      fragmentsRequired: 7, fragmentsCollected: 3,
      resultItemId: findItem('Множитель x2'), resultName: 'Множитель x2',
      resultDescription: 'Награда за стрик 7 дней', resultRarity: 'rare', resultIcon: '⚡',
      craftCost: { coins: 0, gems: 0 },
      fragmentSource: { type: 'streak_reward', streakRequired: 7 },
      crafted: false, createdAt: ts - 12 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId,
      fragmentName: 'Фрагмент микрофона', fragmentIcon: 'Mic', fragmentColor: '#6366f1',
      fragmentsRequired: 12, fragmentsCollected: 5,
      resultItemId: findItem('Микрофон для подкаста'), resultName: 'Микрофон для подкаста',
      resultDescription: 'Собери 12 фрагментов за контент и коллабы', resultRarity: 'rare', resultIcon: '🎙️',
      craftCost: { coins: 100, gems: 1 },
      fragmentSource: { type: 'task_linked', linkedTaskIds: [findTask('Написать пост в Twitter/X'), findTask('Сделать коллаб с другим креатором'), findTask('Написать Telegram-пост')], dropChance: 15 },
      crafted: false, createdAt: ts - 20 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId,
      fragmentName: 'Фрагмент суши', fragmentIcon: 'Fish', fragmentColor: '#f97316',
      fragmentsRequired: 5, fragmentsCollected: 5,
      resultItemId: findItem('Суши-сет'), resultName: 'Суши-сет',
      resultDescription: 'Готово к крафту!', resultRarity: 'uncommon', resultIcon: '🍣',
      craftCost: { coins: 30, gems: 0 },
      fragmentSource: { type: 'task_linked', linkedTaskIds: [findTask('Приготовить meal prep')], dropChance: 35 },
      crafted: false, createdAt: ts - 14 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId,
      fragmentName: 'Фрагмент билета', fragmentIcon: 'Ticket', fragmentColor: '#8b5cf6',
      fragmentsRequired: 8, fragmentsCollected: 2,
      resultItemId: findItem('Крипто-конференция'), resultName: 'Крипто-конференция',
      resultDescription: 'Собери 8 фрагментов за бизнес-задачи', resultRarity: 'epic', resultIcon: '🎤',
      craftCost: { coins: 200, gems: 3 },
      fragmentSource: { type: 'task_linked', linkedTaskIds: [findTask('Закрыть 3 сделки с рекламодателями'), findTask('Проверить аналитику каналов')], dropChance: 25 },
      crafted: false, createdAt: ts - 10 * DAY, updatedAt: ts,
    },
  ]

  // ─── Inventory (some pre-bought items) ─────────────────────────────────────

  const inventory: InventoryEntry[] = [
    { itemId: findItem('Кофе из кофейни'), quantity: 3, acquiredAt: ts - 2 * DAY },
    { itemId: findItem('Протеиновый коктейль'), quantity: 4, acquiredAt: ts - DAY },
    { itemId: findItem('Скидка 10%'), quantity: 1, acquiredAt: ts - 3 * DAY },
    { itemId: findItem('Крипто-кейс'), quantity: 2, acquiredAt: ts - DAY },
    { itemId: findItem('Дневной сон 30 мин'), quantity: 3, acquiredAt: ts - 5 * DAY },
    { itemId: findItem('Новая футболка'), quantity: 1, acquiredAt: ts - 4 * DAY },
  ]

  // ─── Return import-compatible JSON ─────────────────────────────────────────

  return JSON.stringify({
    version: 1,
    exportedAt: ts,
    profiles: [profile],
    activeProfileId: profileId,
    taskGroups,
    itemGroups,
    achievementGroups,
    tasks,
    achievements,
    craftRecipes,
    shopItems,
    inventory,
    purchaseHistory: [],
    usageHistory: [],
    activeShopDiscountPercent: null,
    settings: { ...DEFAULT_SETTINGS },
    stats: {
      totalTasksCompleted: 0,
      totalCoinsEarned: 0,
      totalCoinsSpent: 0,
      totalItemsCrafted: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastActiveDate: 0,
    },
    noteFolders: [],
    notes: [],
    dailyReports: [],
  }, null, 2)
}
