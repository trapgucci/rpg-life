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
  Habit,
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
    name: 'Тестовый герой',
    level: 5,
    xp: 1200,
    levelingMode: 'standard',
    levelCurve: [],
    attributes: DEFAULT_ATTRIBUTES.map((a, i): Attribute => ({
      ...a,
      id: attrIds[i],
      level: 2 + Math.floor(Math.random() * 4),
      current_xp: Math.floor(Math.random() * 200),
    })),
    currencies: {
      [CURRENCY_IDS.COINS]: 2500,
      [CURRENCY_IDS.GEMS]: 45,
    },
    createdAt: ts - 30 * DAY,
    updatedAt: ts,
  }

  // ─── Task Groups ───────────────────────────────────────────────────────────

  const taskGroups: TaskGroup[] = [
    { id: uid(), profileId, name: 'Работа', sortOrder: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Здоровье', sortOrder: 1, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Учёба', sortOrder: 2, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Дом', sortOrder: 3, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Хобби', sortOrder: 4, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Финансы', sortOrder: 5, createdAt: ts, updatedAt: ts },
  ]
  const [gWork, gHealth, gStudy, gHome, gHobby, gFinance] = taskGroups.map(g => g.id)

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
      current: 0, target: 10, isCompleted: false,
      createdAt: ts - Math.floor(Math.random() * 15 * DAY), updatedAt: ts, groupId: null,
      ...p,
    }
  }

  function mkNested(p: Partial<NestedTask> & Pick<NestedTask, 'title' | 'subtasks'>): NestedTask {
    return {
      id: uid(), profileId, kind: 'nested', difficulty: 'hard', attributeIds: [],
      coinReward: 20, gemReward: 1, dueAt: null, deadlineAt: null, recurrence: 'once',
      subtasks: [], isCompleted: false,
      createdAt: ts - Math.floor(Math.random() * 15 * DAY), updatedAt: ts, groupId: null,
      ...p,
    }
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────────

  const tasks: TaskRpg[] = [
    // === РАБОТА ===
    mkCheckbox({ title: 'Отправить отчёт за неделю', groupId: gWork, difficulty: 'easy', attributeIds: [INT], coinReward: 15, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [5], endMode: 'never' } }),
    mkCheckbox({ title: 'Код-ревью PR коллег', groupId: gWork, difficulty: 'medium', attributeIds: [INT], coinReward: 20, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCounter({ title: 'Закрыть тикеты в Jira', groupId: gWork, target: 5, difficulty: 'hard', attributeIds: [INT, DEX], coinReward: 50, gemReward: 2, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 5, endMode: 'never' } }),
    mkNested({ title: 'Подготовить презентацию для стендапа', groupId: gWork, difficulty: 'medium', attributeIds: [CHA, INT], coinReward: 30, subtasks: [
      { id: uid(), title: 'Собрать данные за спринт', isCompleted: false },
      { id: uid(), title: 'Сделать слайды', isCompleted: false },
      { id: uid(), title: 'Отрепетировать', isCompleted: false },
    ] }),
    mkCheckbox({ title: 'Обновить документацию API', groupId: gWork, difficulty: 'hard', attributeIds: [INT], coinReward: 40, gemReward: 1 }),
    mkCheckbox({ title: 'Написать unit-тесты', groupId: gWork, difficulty: 'medium', attributeIds: [INT], coinReward: 25, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Провести 1-on-1 с менеджером', groupId: gWork, difficulty: 'easy', attributeIds: [CHA], coinReward: 10, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [3], endMode: 'never' } }),

    // === ЗДОРОВЬЕ ===
    mkCheckbox({ title: 'Утренняя зарядка 15 мин', groupId: gHealth, difficulty: 'easy', attributeIds: [STR, END], coinReward: 10, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' }, currentStreak: 7, bestStreak: 12 }),
    mkCounter({ title: 'Выпить 8 стаканов воды', groupId: gHealth, target: 8, current: 3, difficulty: 'easy', attributeIds: [END], coinReward: 5, countUnit: 'стаканов', recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Тренировка в зале', groupId: gHealth, difficulty: 'hard', attributeIds: [STR, END], coinReward: 40, gemReward: 1, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 3, endMode: 'never' } }),
    mkCounter({ title: 'Пробежать 5 км', groupId: gHealth, target: 5, difficulty: 'hard', attributeIds: [END, DEX], coinReward: 50, gemReward: 2, countUnit: 'км', recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [1, 4, 6], endMode: 'never' } }),
    mkCheckbox({ title: 'Принять витамины', groupId: gHealth, difficulty: 'easy', attributeIds: [END], coinReward: 5, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkNested({ title: 'Чекап у врача', groupId: gHealth, difficulty: 'veryHard', attributeIds: [END], coinReward: 100, gemReward: 5, subtasks: [
      { id: uid(), title: 'Записаться на приём', isCompleted: true, completedAt: ts - 2 * DAY },
      { id: uid(), title: 'Сдать анализы', isCompleted: false },
      { id: uid(), title: 'Получить результаты', isCompleted: false },
      { id: uid(), title: 'Консультация врача', isCompleted: false },
    ] }),
    mkCheckbox({ title: 'Растяжка перед сном', groupId: gHealth, difficulty: 'easy', attributeIds: [DEX], coinReward: 5, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCounter({ title: 'Набрать 10000 шагов', groupId: gHealth, target: 10000, current: 4520, difficulty: 'medium', attributeIds: [END], coinReward: 20, countUnit: 'шагов', recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),

    // === УЧЁБА ===
    mkCounter({ title: 'Прочитать 30 страниц книги', groupId: gStudy, target: 30, current: 12, difficulty: 'medium', attributeIds: [INT], coinReward: 20, countUnit: 'стр', recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Урок английского', groupId: gStudy, difficulty: 'medium', attributeIds: [INT, CHA], coinReward: 25, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 3, endMode: 'never' } }),
    mkCheckbox({ title: 'Решить задачу на LeetCode', groupId: gStudy, difficulty: 'hard', attributeIds: [INT], coinReward: 35, gemReward: 1, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkNested({ title: 'Пройти курс по React', groupId: gStudy, difficulty: 'veryHard', attributeIds: [INT, CRE], coinReward: 200, gemReward: 10, subtasks: [
      { id: uid(), title: 'Модуль 1: Основы', isCompleted: true, completedAt: ts - 10 * DAY },
      { id: uid(), title: 'Модуль 2: Хуки', isCompleted: true, completedAt: ts - 7 * DAY },
      { id: uid(), title: 'Модуль 3: Состояние', isCompleted: false },
      { id: uid(), title: 'Модуль 4: Роутинг', isCompleted: false },
      { id: uid(), title: 'Модуль 5: API', isCompleted: false },
      { id: uid(), title: 'Финальный проект', isCompleted: false },
    ] }),
    mkCheckbox({ title: 'Посмотреть доклад с конференции', groupId: gStudy, difficulty: 'easy', attributeIds: [INT], coinReward: 10, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [0], endMode: 'never' } }),
    mkCounter({ title: 'Изучить 20 новых слов', groupId: gStudy, target: 20, difficulty: 'medium', attributeIds: [INT], coinReward: 15, countUnit: 'слов', recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Написать конспект лекции', groupId: gStudy, difficulty: 'medium', attributeIds: [INT, CRE], coinReward: 20, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [2, 4], endMode: 'never' } }),

    // === ДОМ ===
    mkCheckbox({ title: 'Помыть посуду', groupId: gHome, difficulty: 'easy', attributeIds: [END], coinReward: 5, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Влажная уборка', groupId: gHome, difficulty: 'medium', attributeIds: [STR, END], coinReward: 20, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [6], endMode: 'never' } }),
    mkCheckbox({ title: 'Вынести мусор', groupId: gHome, difficulty: 'easy', attributeIds: [END], coinReward: 5, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkNested({ title: 'Генеральная уборка', groupId: gHome, difficulty: 'veryHard', attributeIds: [STR, END], coinReward: 80, gemReward: 3, recurrence: 'monthly', recurrenceSettings: { type: 'monthly', endMode: 'never' }, subtasks: [
      { id: uid(), title: 'Пропылесосить все комнаты', isCompleted: false },
      { id: uid(), title: 'Помыть окна', isCompleted: false },
      { id: uid(), title: 'Протереть пыль', isCompleted: false },
      { id: uid(), title: 'Помыть полы', isCompleted: false },
      { id: uid(), title: 'Разобрать шкафы', isCompleted: false },
    ] }),
    mkCheckbox({ title: 'Полить цветы', groupId: gHome, difficulty: 'easy', attributeIds: [CRE], coinReward: 5, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 2, endMode: 'never' } }),
    mkCheckbox({ title: 'Приготовить ужин', groupId: gHome, difficulty: 'medium', attributeIds: [CRE, DEX], coinReward: 15, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Постирать бельё', groupId: gHome, difficulty: 'easy', attributeIds: [END], coinReward: 10, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 2, endMode: 'never' } }),

    // === ХОББИ ===
    mkCheckbox({ title: 'Нарисовать скетч', groupId: gHobby, difficulty: 'medium', attributeIds: [CRE], coinReward: 20, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCounter({ title: 'Практика на гитаре', groupId: gHobby, target: 30, difficulty: 'medium', attributeIds: [CRE, DEX], coinReward: 15, countUnit: 'мин', recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkNested({ title: 'Собрать LEGO набор', groupId: gHobby, difficulty: 'hard', attributeIds: [CRE, DEX], coinReward: 60, gemReward: 3, subtasks: [
      { id: uid(), title: 'Пакет 1', isCompleted: true, completedAt: ts - 3 * DAY },
      { id: uid(), title: 'Пакет 2', isCompleted: true, completedAt: ts - 2 * DAY },
      { id: uid(), title: 'Пакет 3', isCompleted: false },
      { id: uid(), title: 'Пакет 4', isCompleted: false },
    ] }),
    mkCheckbox({ title: 'Сделать фото для Instagram', groupId: gHobby, difficulty: 'easy', attributeIds: [CRE], coinReward: 10, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [0, 3], endMode: 'never' } }),
    mkCheckbox({ title: 'Посмотреть фильм', groupId: gHobby, difficulty: 'easy', attributeIds: [CRE], coinReward: 5, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 2, endMode: 'never' } }),
    mkCounter({ title: 'Написать 1000 слов рассказа', groupId: gHobby, target: 1000, current: 340, difficulty: 'hard', attributeIds: [CRE, INT], coinReward: 40, gemReward: 1, countUnit: 'слов' }),

    // === ФИНАНСЫ ===
    mkCheckbox({ title: 'Записать расходы за день', groupId: gFinance, difficulty: 'easy', attributeIds: [INT], coinReward: 5, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Проверить баланс счетов', groupId: gFinance, difficulty: 'easy', attributeIds: [INT], coinReward: 10, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'days', weeklyDays: [1], endMode: 'never' } }),
    mkNested({ title: 'Составить бюджет на месяц', groupId: gFinance, difficulty: 'hard', attributeIds: [INT], coinReward: 50, gemReward: 2, recurrence: 'monthly', recurrenceSettings: { type: 'monthly', endMode: 'never' }, subtasks: [
      { id: uid(), title: 'Проанализировать прошлый месяц', isCompleted: false },
      { id: uid(), title: 'Запланировать доходы', isCompleted: false },
      { id: uid(), title: 'Распределить по категориям', isCompleted: false },
    ] }),
    mkCheckbox({ title: 'Оплатить счета за ЖКХ', groupId: gFinance, difficulty: 'easy', attributeIds: [INT], coinReward: 15, recurrence: 'monthly', recurrenceSettings: { type: 'monthly', endMode: 'never' } }),

    // === БЕЗ ГРУППЫ ===
    mkCheckbox({ title: 'Позвонить родителям', difficulty: 'easy', attributeIds: [CHA], coinReward: 10, recurrence: 'weekly', recurrenceSettings: { type: 'weekly', weeklyMode: 'timesPerWeek', weeklyTimesPerWeek: 2, endMode: 'never' } }),
    mkCheckbox({ title: 'Медитация 10 минут', difficulty: 'easy', attributeIds: [END, CRE], coinReward: 10, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' }, currentStreak: 14, bestStreak: 14 }),
    mkCheckbox({ title: 'Написать в дневник', difficulty: 'easy', attributeIds: [CRE, INT], coinReward: 5, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Лечь спать до 23:00', difficulty: 'medium', attributeIds: [END], coinReward: 15, recurrence: 'daily', recurrenceSettings: { type: 'daily', endMode: 'never' } }),
    mkCheckbox({ title: 'Без телефона за едой', difficulty: 'medium', attributeIds: [END, CHA], coinReward: 10, recurrence: 'instant' }),
    mkCounter({ title: 'Прочитать 12 книг за год', target: 12, current: 4, difficulty: 'veryHard', attributeIds: [INT], coinReward: 100, gemReward: 5, countUnit: 'книг', recurrence: 'yearly', recurrenceSettings: { type: 'yearly', endMode: 'never' } }),
  ]

  // ─── Item Groups ───────────────────────────────────────────────────────────

  const itemGroups: ItemGroup[] = [
    { id: uid(), profileId, name: 'Развлечения', sortOrder: 0, createdAt: ts, updatedAt: ts, color: '#8b5cf6' },
    { id: uid(), profileId, name: 'Еда и напитки', sortOrder: 1, createdAt: ts, updatedAt: ts, color: '#f59e0b' },
    { id: uid(), profileId, name: 'Здоровье и отдых', sortOrder: 2, createdAt: ts, updatedAt: ts, color: '#10b981' },
    { id: uid(), profileId, name: 'Гаджеты', sortOrder: 3, createdAt: ts, updatedAt: ts, color: '#3b82f6' },
    { id: uid(), profileId, name: 'Бонусы', sortOrder: 4, createdAt: ts, updatedAt: ts, color: '#ef4444' },
    { id: uid(), profileId, name: 'Игры', sortOrder: 5, createdAt: ts, updatedAt: ts, color: '#06b6d4' },
    { id: uid(), profileId, name: 'Сериалы', sortOrder: 6, createdAt: ts, updatedAt: ts, color: '#ec4899' },
  ]
  const [igFun, igFood, igRelax, igGadget, igBonus, igGames, igSerials] = itemGroups.map(g => g.id)

  // ─── Shop Items (50+) ──────────────────────────────────────────────────────

  const shopItems: ShopItem[] = [
    // --- Развлечения ---
    { id: uid(), profileId, name: 'Поход в кино', description: 'Билет на любой фильм', icon: '🎬', rarity: 'common', cost: { coins: 100, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Настольная игра с друзьями', description: 'Вечер настолок', icon: '🎲', rarity: 'uncommon', cost: { coins: 150, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Билет на концерт', description: 'Живая музыка!', icon: '🎵', rarity: 'rare', cost: { coins: 500, gems: 5 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Поездка на выходные', description: 'Мини-путешествие', icon: '🚗', rarity: 'epic', cost: { coins: 1500, gems: 15 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Поход в парк развлечений', description: 'Аттракционы и сладкая вата', icon: '🎡', rarity: 'uncommon', cost: { coins: 300, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Вечер караоке', description: 'Пой любимые песни', icon: '🎤', rarity: 'common', cost: { coins: 120, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Боулинг', description: 'Партия с друзьями', icon: '🎳', rarity: 'common', cost: { coins: 100, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Квест-комната', description: 'Загадки и приключения', icon: '🔐', rarity: 'uncommon', cost: { coins: 250, gems: 2 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Пейнтбол', description: 'Командная игра', icon: '🎯', rarity: 'uncommon', cost: { coins: 200, gems: 1 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Планетарий', description: 'Звёзды и космос', icon: '🌌', rarity: 'common', cost: { coins: 80, gems: 0 }, isLootBox: false, groupId: igFun },
    { id: uid(), profileId, name: 'Скалодром', description: 'Час лазания', icon: '🧗', rarity: 'uncommon', cost: { coins: 180, gems: 1 }, isLootBox: false, groupId: igFun },

    // --- Еда и напитки ---
    { id: uid(), profileId, name: 'Кофе из кофейни', description: 'Любимый латте', icon: '☕', rarity: 'common', cost: { coins: 30, gems: 0 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Пицца', description: 'Целая пицца!', icon: '🍕', rarity: 'common', cost: { coins: 60, gems: 0 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Суши-сет', description: 'Набор из 24 штук', icon: '🍣', rarity: 'uncommon', cost: { coins: 120, gems: 0 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Бургер из крафтовой бургерной', description: 'Авторский бургер', icon: '🍔', rarity: 'common', cost: { coins: 80, gems: 0 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Торт', description: 'Шоколадный торт на праздник', icon: '🎂', rarity: 'uncommon', cost: { coins: 100, gems: 0 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Ужин в ресторане', description: 'Ресторан на выбор', icon: '🍽️', rarity: 'rare', cost: { coins: 400, gems: 3 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Мороженое', description: '2 шарика', icon: '🍦', rarity: 'common', cost: { coins: 20, gems: 0 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Чай с пирожным', description: 'Уютный перерыв', icon: '🍰', rarity: 'common', cost: { coins: 40, gems: 0 }, isLootBox: false, groupId: igFood },
    { id: uid(), profileId, name: 'Смузи', description: 'Фруктовый микс', icon: '🥤', rarity: 'common', cost: { coins: 35, gems: 0 }, isLootBox: false, groupId: igFood },

    // --- Здоровье и отдых ---
    { id: uid(), profileId, name: 'Массаж 60 мин', description: 'Расслабляющий массаж', icon: '💆', rarity: 'rare', cost: { coins: 350, gems: 3 }, isLootBox: false, groupId: igRelax },
    { id: uid(), profileId, name: 'Ванна с пеной', description: 'Расслабляющая ванна дома', icon: '🛁', rarity: 'common', cost: { coins: 30, gems: 0 }, isLootBox: false, groupId: igRelax },
    { id: uid(), profileId, name: 'Spa-день', description: 'Полный день в спа', icon: '🧖', rarity: 'epic', cost: { coins: 800, gems: 8 }, isLootBox: false, groupId: igRelax },
    { id: uid(), profileId, name: 'Йога-класс', description: 'Групповое занятие', icon: '🧘', rarity: 'common', cost: { coins: 50, gems: 0 }, isLootBox: false, groupId: igRelax },
    { id: uid(), profileId, name: 'Дневной сон 30 мин', description: 'Сиеста без стыда', icon: '😴', rarity: 'common', cost: { coins: 15, gems: 0 }, isLootBox: false, groupId: igRelax },
    { id: uid(), profileId, name: 'Прогулка в парке', description: 'Час на свежем воздухе', icon: '🌳', rarity: 'common', cost: { coins: 10, gems: 0 }, isLootBox: false, groupId: igRelax },
    { id: uid(), profileId, name: 'Бассейн', description: 'Плавание 1 час', icon: '🏊', rarity: 'uncommon', cost: { coins: 80, gems: 0 }, isLootBox: false, groupId: igRelax },

    // --- Гаджеты ---
    { id: uid(), profileId, name: 'Новые наушники', description: 'Беспроводные', icon: '🎧', rarity: 'rare', cost: { coins: 600, gems: 5 }, isLootBox: false, groupId: igGadget },
    { id: uid(), profileId, name: 'Чехол для телефона', description: 'Стильный чехол', icon: '📱', rarity: 'common', cost: { coins: 100, gems: 0 }, isLootBox: false, groupId: igGadget },
    { id: uid(), profileId, name: 'Мышка для ПК', description: 'Игровая мышь', icon: '🖱️', rarity: 'uncommon', cost: { coins: 200, gems: 2 }, isLootBox: false, groupId: igGadget },
    { id: uid(), profileId, name: 'Механическая клавиатура', description: 'Cherry MX Brown', icon: '⌨️', rarity: 'rare', cost: { coins: 700, gems: 7 }, isLootBox: false, groupId: igGadget },
    { id: uid(), profileId, name: 'Фитнес-браслет', description: 'Отслеживание активности', icon: '⌚', rarity: 'epic', cost: { coins: 1000, gems: 10 }, isLootBox: false, groupId: igGadget },
    { id: uid(), profileId, name: 'USB-хаб', description: '4 порта', icon: '🔌', rarity: 'common', cost: { coins: 50, gems: 0 }, isLootBox: false, groupId: igGadget },
    { id: uid(), profileId, name: 'Настольная лампа', description: 'С регулировкой яркости', icon: '💡', rarity: 'uncommon', cost: { coins: 150, gems: 0 }, isLootBox: false, groupId: igGadget },

    // --- Бонусы ---
    { id: uid(), profileId, name: 'Скидка 10%', description: 'На следующую покупку', icon: '🏷️', rarity: 'common', cost: { coins: 50, gems: 0 }, isLootBox: false, groupId: igBonus, isDiscountVoucher: true, discountPercent: 10 },
    { id: uid(), profileId, name: 'Скидка 25%', description: 'На следующую покупку', icon: '🏷️', rarity: 'uncommon', cost: { coins: 120, gems: 1 }, isLootBox: false, groupId: igBonus, isDiscountVoucher: true, discountPercent: 25 },
    { id: uid(), profileId, name: 'Скидка 50%', description: 'На следующую покупку', icon: '🏷️', rarity: 'rare', cost: { coins: 250, gems: 3 }, isLootBox: false, groupId: igBonus, isDiscountVoucher: true, discountPercent: 50 },
    { id: uid(), profileId, name: 'Множитель x1.5', description: 'Награды задач x1.5 каждые 3 выполнения', icon: '⚡', rarity: 'uncommon', cost: { coins: 200, gems: 2 }, isLootBox: false, groupId: igBonus, streakMultiplierEnabled: true, streakMultiplierMode: 'streak', streakMultiplierValue: 1.5, streakMultiplierInterval: 3 },
    { id: uid(), profileId, name: 'Множитель x2', description: 'Награды задач x2 каждые 5 выполнений', icon: '⚡', rarity: 'rare', cost: { coins: 400, gems: 5 }, isLootBox: false, groupId: igBonus, streakMultiplierEnabled: true, streakMultiplierMode: 'streak', streakMultiplierValue: 2, streakMultiplierInterval: 5 },
    { id: uid(), profileId, name: 'Множитель x2.5 инстант', description: 'Награды x2.5 для 10 выполнений', icon: '💥', rarity: 'epic', cost: { coins: 600, gems: 8 }, isLootBox: false, groupId: igBonus, streakMultiplierEnabled: true, streakMultiplierMode: 'instant', streakMultiplierValue: 2.5, streakMultiplierInterval: 1 },
    { id: uid(), profileId, name: 'Заморозка стрика', description: 'Защита стрика на 3 дня', icon: '🧊', rarity: 'uncommon', cost: { coins: 150, gems: 1 }, isLootBox: false, groupId: igBonus },
    { id: uid(), profileId, name: 'Бесплатный предмет', description: 'Получи один предмет бесплатно', icon: '🎁', rarity: 'common', cost: { coins: 0, gems: 0 }, isLootBox: false, groupId: igBonus, canGetForFree: true },

    // --- Лутбоксы ---
    { id: uid(), profileId, name: 'Коробка удачи', description: 'Что внутри? Случайная награда!', icon: '📦', rarity: 'uncommon', cost: { coins: 75, gems: 0 }, isLootBox: true, groupId: igBonus, lootTable: [
      { id: 'coins-small', weight: 40, quantity: 20 },
      { id: 'coins-big', weight: 20, quantity: 50 },
      { id: 'gems-1', weight: 15, quantity: 1 },
      { id: 'gems-3', weight: 5, quantity: 3 },
      { id: 'nothing', weight: 20 },
    ] },
    { id: uid(), profileId, name: 'Золотой сундук', description: 'Гарантированно хороший лут!', icon: '🗝️', rarity: 'epic', cost: { coins: 300, gems: 3 }, isLootBox: true, groupId: igBonus, lootTable: [
      { id: 'coins-mega', weight: 30, quantity: 200 },
      { id: 'gems-5', weight: 25, quantity: 5 },
      { id: 'gems-10', weight: 10, quantity: 10 },
      { id: 'jackpot', weight: 5, quantity: 500 },
      { id: 'nothing', weight: 30 },
    ] },

    // --- Игры (isVideoGame) ---
    { id: uid(), profileId, name: 'Baldur\'s Gate 3', description: 'RPG мечты', icon: '⚔️', rarity: 'legendary', cost: { coins: 500, gems: 5 }, isLootBox: false, groupId: igGames, isVideoGame: true, gameTimePackages: [
      { id: uid(), hours: 1, cost: 50 },
      { id: uid(), hours: 2, cost: 90 },
      { id: uid(), hours: 4, cost: 160 },
    ], gameTimeTotalMinutes: 0, gameTimePlayedMinutes: 0 },
    { id: uid(), profileId, name: 'Elden Ring', description: 'Открытый мир, хардкор', icon: '🗡️', rarity: 'legendary', cost: { coins: 500, gems: 5 }, isLootBox: false, groupId: igGames, isVideoGame: true, gameTimePackages: [
      { id: uid(), hours: 1, cost: 50 },
      { id: uid(), hours: 3, cost: 130 },
    ], gameTimeTotalMinutes: 0, gameTimePlayedMinutes: 0 },
    { id: uid(), profileId, name: 'Stardew Valley', description: 'Ферма и уют', icon: '🌾', rarity: 'rare', cost: { coins: 200, gems: 2 }, isLootBox: false, groupId: igGames, isVideoGame: true, gameTimePackages: [
      { id: uid(), hours: 1, cost: 30 },
      { id: uid(), hours: 2, cost: 55 },
    ], gameTimeTotalMinutes: 0, gameTimePlayedMinutes: 0 },
    { id: uid(), profileId, name: 'Minecraft', description: 'Строй что хочешь', icon: '🧱', rarity: 'uncommon', cost: { coins: 150, gems: 1 }, isLootBox: false, groupId: igGames, isVideoGame: true, gameTimePackages: [
      { id: uid(), hours: 1, cost: 25 },
      { id: uid(), hours: 2, cost: 45 },
      { id: uid(), hours: 5, cost: 100 },
    ], gameTimeTotalMinutes: 0, gameTimePlayedMinutes: 0 },
    { id: uid(), profileId, name: 'Hollow Knight', description: 'Метроидвания', icon: '🪲', rarity: 'rare', cost: { coins: 250, gems: 2 }, isLootBox: false, groupId: igGames, isVideoGame: true, gameTimePackages: [
      { id: uid(), hours: 1, cost: 40 },
      { id: uid(), hours: 2, cost: 70 },
    ], gameTimeTotalMinutes: 0, gameTimePlayedMinutes: 0 },

    // --- Сериалы (isTvSerial) ---
    { id: uid(), profileId, name: 'Аркейн', description: 'Анимация по League of Legends', icon: '🎭', rarity: 'epic', cost: { coins: 300, gems: 3 }, isLootBox: false, groupId: igSerials, isTvSerial: true, serialSeasons: [
      { id: uid(), number: 1, episodes: Array.from({ length: 9 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 2, episodes: Array.from({ length: 9 }, (_, i) => ({ id: uid(), number: i + 1, cost: 35 })) },
    ] },
    { id: uid(), profileId, name: 'Во все тяжкие', description: 'Классика', icon: '🧪', rarity: 'legendary', cost: { coins: 400, gems: 4 }, isLootBox: false, groupId: igSerials, isTvSerial: true, serialSeasons: [
      { id: uid(), number: 1, episodes: Array.from({ length: 7 }, (_, i) => ({ id: uid(), number: i + 1, cost: 25 })) },
      { id: uid(), number: 2, episodes: Array.from({ length: 13 }, (_, i) => ({ id: uid(), number: i + 1, cost: 25 })) },
      { id: uid(), number: 3, episodes: Array.from({ length: 13 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 4, episodes: Array.from({ length: 13 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 5, episodes: Array.from({ length: 16 }, (_, i) => ({ id: uid(), number: i + 1, cost: 35 })) },
    ] },
    { id: uid(), profileId, name: 'Мандалорец', description: 'Звёздные войны', icon: '🪐', rarity: 'rare', cost: { coins: 250, gems: 2 }, isLootBox: false, groupId: igSerials, isTvSerial: true, serialSeasons: [
      { id: uid(), number: 1, episodes: Array.from({ length: 8 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 2, episodes: Array.from({ length: 8 }, (_, i) => ({ id: uid(), number: i + 1, cost: 30 })) },
      { id: uid(), number: 3, episodes: Array.from({ length: 8 }, (_, i) => ({ id: uid(), number: i + 1, cost: 35 })) },
    ] },
  ]

  // ─── Achievement Groups ────────────────────────────────────────────────────

  const achievementGroups: AchievementGroup[] = [
    { id: uid(), profileId, name: 'Новичок', icon: '🌱', color: '#22c55e', sortOrder: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Мастер задач', icon: '⚔️', color: '#3b82f6', sortOrder: 1, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Коллекционер', icon: '🎒', color: '#f59e0b', sortOrder: 2, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Атлет', icon: '🏋️', color: '#ef4444', sortOrder: 3, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Учёный', icon: '🔬', color: '#8b5cf6', sortOrder: 4, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, name: 'Секретные', icon: '🔮', color: '#ec4899', sortOrder: 5, createdAt: ts, updatedAt: ts },
  ]
  const [agBeginner, agMaster, agCollector, agAthlete, agScholar, agSecret] = achievementGroups.map(g => g.id)

  // ─── Achievements ──────────────────────────────────────────────────────────

  const achievements: Achievement[] = [
    // Новичок
    { id: uid(), profileId, groupId: agBeginner, title: 'Первый шаг', description: 'Выполни 1 задачу', icon: '👣', condition: { type: 'tasks_completed', targetValue: 1 }, rewardCoins: 10, rewardGems: 0, rewardXp: 10, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agBeginner, title: 'Начало пути', description: 'Выполни 5 задач', icon: '🚶', condition: { type: 'tasks_completed', targetValue: 5 }, rewardCoins: 25, rewardGems: 1, rewardXp: 30, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agBeginner, title: 'Уверенный старт', description: 'Выполни 10 задач', icon: '🏃', condition: { type: 'tasks_completed', targetValue: 10 }, rewardCoins: 50, rewardGems: 2, rewardXp: 50, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agBeginner, title: 'Разгон', description: 'Выполни 25 задач', icon: '🔥', condition: { type: 'tasks_completed', targetValue: 25 }, rewardCoins: 100, rewardGems: 3, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agBeginner, title: 'Полусотня', description: 'Выполни 50 задач', icon: '🌟', condition: { type: 'tasks_completed', targetValue: 50 }, rewardCoins: 200, rewardGems: 5, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },

    // Мастер задач
    { id: uid(), profileId, groupId: agMaster, title: 'Стриковод', description: 'Набери стрик 7 дней на зарядке', icon: '🔗', condition: { type: 'task_streak', targetValue: 7, taskId: tasks[7].id }, rewardCoins: 50, rewardGems: 2, rewardXp: 50, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agMaster, title: 'Непрерывный', description: 'Стрик 14 дней', icon: '⛓️', condition: { type: 'task_streak', targetValue: 14, taskId: tasks[7].id }, rewardCoins: 100, rewardGems: 5, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agMaster, title: 'Месяц дисциплины', description: 'Стрик 30 дней', icon: '🏆', condition: { type: 'task_streak', targetValue: 30, taskId: tasks[7].id }, rewardCoins: 300, rewardGems: 10, rewardXp: 300, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agMaster, title: 'Сотня задач', description: 'Выполни 100 задач', icon: '💯', condition: { type: 'tasks_completed', targetValue: 100 }, rewardCoins: 500, rewardGems: 10, rewardXp: 500, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agMaster, title: 'Тысячник', description: 'Выполни 1000 задач', icon: '👑', condition: { type: 'tasks_completed', targetValue: 1000 }, rewardCoins: 2000, rewardGems: 50, rewardXp: 2000, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },

    // Коллекционер
    { id: uid(), profileId, groupId: agCollector, title: 'Шопоголик', description: 'Потрать 500 монет в магазине', icon: '🛒', condition: { type: 'coins_earned_spent', targetValue: 500, coinMode: 'spent' }, rewardCoins: 50, rewardGems: 1, rewardXp: 30, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agCollector, title: 'Транжира', description: 'Потрать 2000 монет', icon: '💸', condition: { type: 'coins_earned_spent', targetValue: 2000, coinMode: 'spent' }, rewardCoins: 150, rewardGems: 5, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agCollector, title: 'Магнат', description: 'Заработай 5000 монет', icon: '💰', condition: { type: 'coins_earned_spent', targetValue: 5000, coinMode: 'earned' }, rewardCoins: 300, rewardGems: 10, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agCollector, title: 'Миллионер', description: 'Заработай 10000 монет', icon: '🤑', condition: { type: 'coins_earned_spent', targetValue: 10000, coinMode: 'earned' }, rewardCoins: 1000, rewardGems: 25, rewardXp: 500, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },

    // Атлет
    { id: uid(), profileId, groupId: agAthlete, title: 'Качок', description: 'Сила достигла 5 уровня', icon: '💪', condition: { type: 'attribute_level', targetValue: 5, attributeId: STR }, rewardCoins: 100, rewardGems: 3, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agAthlete, title: 'Стальная воля', description: 'Выносливость достигла 5 уровня', icon: '🛡️', condition: { type: 'attribute_level', targetValue: 5, attributeId: END }, rewardCoins: 100, rewardGems: 3, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agAthlete, title: 'Марафонец', description: 'Пробежать 5 км 10 раз', icon: '🏅', condition: { type: 'task_completed_total', targetValue: 10, taskId: tasks.find(t => t.title === 'Пробежать 5 км')?.id }, rewardCoins: 200, rewardGems: 5, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agAthlete, title: 'Железный человек', description: 'Тренировка в зале 20 раз', icon: '🏋️', condition: { type: 'task_completed_total', targetValue: 20, taskId: tasks.find(t => t.title === 'Тренировка в зале')?.id }, rewardCoins: 300, rewardGems: 8, rewardXp: 300, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agAthlete, title: 'Непобедимый', description: 'Все физические атрибуты 10 уровня', icon: '⚡', condition: { type: 'attribute_level', targetValue: 10, attributeId: STR }, rewardCoins: 1000, rewardGems: 20, rewardXp: 1000, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },

    // Учёный
    { id: uid(), profileId, groupId: agScholar, title: 'Книжный червь', description: 'Интеллект достиг 3 уровня', icon: '📚', condition: { type: 'attribute_level', targetValue: 3, attributeId: INT }, rewardCoins: 50, rewardGems: 1, rewardXp: 50, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agScholar, title: 'Мудрец', description: 'Интеллект достиг 7 уровня', icon: '🧙', condition: { type: 'attribute_level', targetValue: 7, attributeId: INT }, rewardCoins: 200, rewardGems: 5, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agScholar, title: 'Полиглот', description: 'Урок английского 15 раз', icon: '🌍', condition: { type: 'task_completed_total', targetValue: 15, taskId: tasks.find(t => t.title === 'Урок английского')?.id }, rewardCoins: 150, rewardGems: 5, rewardXp: 150, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agScholar, title: 'Хакер', description: 'Решить 30 задач на LeetCode', icon: '💻', condition: { type: 'task_completed_total', targetValue: 30, taskId: tasks.find(t => t.title === 'Решить задачу на LeetCode')?.id }, rewardCoins: 300, rewardGems: 10, rewardXp: 300, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agScholar, title: 'Креатив', description: 'Креативность достигла 5 уровня', icon: '🎨', condition: { type: 'attribute_level', targetValue: 5, attributeId: CRE }, rewardCoins: 100, rewardGems: 3, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },

    // Секретные (custom — ручная разблокировка)
    { id: uid(), profileId, groupId: agSecret, title: 'Ранняя пташка', description: 'Выполни задачу до 7:00 утра', icon: '🐓', condition: { type: 'custom', targetValue: 1 }, rewardCoins: 50, rewardGems: 2, rewardXp: 50, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agSecret, title: 'Ночной волк', description: 'Выполни задачу после полуночи', icon: '🐺', condition: { type: 'custom', targetValue: 1 }, rewardCoins: 50, rewardGems: 2, rewardXp: 50, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agSecret, title: 'Перфекционист', description: 'Выполни все подзадачи за один день', icon: '✨', condition: { type: 'custom', targetValue: 1 }, rewardCoins: 100, rewardGems: 5, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agSecret, title: 'Аскет', description: 'Неделя без покупок в магазине', icon: '🧘', condition: { type: 'custom', targetValue: 1 }, rewardCoins: 100, rewardGems: 3, rewardXp: 100, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agSecret, title: 'Мультикласс', description: 'Все атрибуты на 3+ уровне', icon: '🌈', condition: { type: 'custom', targetValue: 1 }, rewardCoins: 200, rewardGems: 10, rewardXp: 200, unlocked: false, currentProgress: 0, createdAt: ts, updatedAt: ts },

    // Повторяемые
    { id: uid(), profileId, groupId: agMaster, title: 'Ежедневный герой', description: 'Выполни 5 задач за день', icon: '⭐', condition: { type: 'tasks_completed', targetValue: 5 }, rewardCoins: 25, rewardGems: 1, rewardXp: 25, unlocked: false, currentProgress: 0, repeatable: true, createdAt: ts, updatedAt: ts },
    { id: uid(), profileId, groupId: agCollector, title: 'Копилка', description: 'Заработай 100 монет', icon: '🐷', condition: { type: 'coins_earned_spent', targetValue: 100, coinMode: 'earned' }, rewardCoins: 10, rewardGems: 0, rewardXp: 10, unlocked: false, currentProgress: 0, repeatable: true, createdAt: ts, updatedAt: ts },
  ]

  // ─── Habits ────────────────────────────────────────────────────────────────

  const habits: Habit[] = [
    {
      id: uid(), profileId, title: 'Вода', notes: 'Пей воду каждый день', icon: '💧', color: '#3b82f6',
      positiveEnabled: true, negativeEnabled: false,
      positiveXp: 5, negativeXp: 0, positiveCoins: 3, negativeCoins: 0,
      attributeId: END, todayPositive: 0, todayNegative: 0,
      lastResetDate: ts, streak: 5, totalPositive: 35, totalNegative: 0,
      createdAt: ts - 7 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId, title: 'Сладкое', notes: 'Контролируй сладкое', icon: '🍬', color: '#ef4444',
      positiveEnabled: true, negativeEnabled: true,
      positiveXp: 10, negativeXp: 5, positiveCoins: 5, negativeCoins: 3,
      attributeId: END, todayPositive: 0, todayNegative: 0,
      lastResetDate: ts, streak: 3, totalPositive: 12, totalNegative: 8,
      createdAt: ts - 14 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId, title: 'Чтение', notes: 'Читай перед сном', icon: '📖', color: '#8b5cf6',
      positiveEnabled: true, negativeEnabled: false,
      positiveXp: 15, negativeXp: 0, positiveCoins: 5, negativeCoins: 0,
      attributeId: INT, todayPositive: 0, todayNegative: 0,
      lastResetDate: ts, streak: 10, totalPositive: 50, totalNegative: 0,
      difficultyMultiplierEnabled: true, difficultyMultiplierLevel: 'medium', multiplierIntervalDays: 5,
      multiplierAppliesToXp: true, multiplierAppliesToCoins: true,
      createdAt: ts - 20 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId, title: 'Курение', notes: 'Не кури!', icon: '🚭', color: '#f97316',
      positiveEnabled: false, negativeEnabled: true,
      positiveXp: 0, negativeXp: 15, positiveCoins: 0, negativeCoins: 10,
      attributeId: END, todayPositive: 0, todayNegative: 0,
      lastResetDate: ts, streak: 0, totalPositive: 0, totalNegative: 4,
      createdAt: ts - 10 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId, title: 'Соцсети < 1 часа', notes: 'Ограничь время в соцсетях', icon: '📵', color: '#06b6d4',
      positiveEnabled: true, negativeEnabled: true,
      positiveXp: 10, negativeXp: 5, positiveCoins: 5, negativeCoins: 3,
      attributeId: CRE, todayPositive: 0, todayNegative: 0,
      lastResetDate: ts, streak: 2, totalPositive: 15, totalNegative: 6,
      createdAt: ts - 12 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId, title: 'Осанка', notes: 'Следи за осанкой в течение дня', icon: '🧍', color: '#22c55e',
      positiveEnabled: true, negativeEnabled: true,
      positiveXp: 5, negativeXp: 3, positiveCoins: 3, negativeCoins: 2,
      attributeId: END, todayPositive: 0, todayNegative: 0,
      lastResetDate: ts, streak: 7, totalPositive: 28, totalNegative: 3,
      createdAt: ts - 15 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId, title: 'Благодарность', notes: 'Запиши 3 вещи, за которые благодарен', icon: '🙏', color: '#eab308',
      positiveEnabled: true, negativeEnabled: false,
      positiveXp: 10, negativeXp: 0, positiveCoins: 5, negativeCoins: 0,
      positiveGemsEnabled: true, positiveGems: 1,
      attributeId: CHA, todayPositive: 0, todayNegative: 0,
      lastResetDate: ts, streak: 4, totalPositive: 20, totalNegative: 0,
      createdAt: ts - 18 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId, title: 'Фастфуд', notes: 'Избегай фастфуда', icon: '🍟', color: '#dc2626',
      positiveEnabled: false, negativeEnabled: true,
      positiveXp: 0, negativeXp: 10, positiveCoins: 0, negativeCoins: 5,
      negativeGemsEnabled: true, negativeGems: 1,
      attributeId: END, todayPositive: 0, todayNegative: 0,
      lastResetDate: ts, streak: 0, totalPositive: 0, totalNegative: 3,
      createdAt: ts - 8 * DAY, updatedAt: ts,
    },
  ]

  // ─── Craft Recipes ─────────────────────────────────────────────────────────

  const findTask = (title: string) => tasks.find(t => t.title === title)?.id ?? ''
  const findItem = (name: string) => shopItems.find(i => i.name === name)?.id ?? ''

  const craftRecipes: CraftRecipe[] = [
    {
      id: uid(), profileId,
      fragmentName: 'Фрагмент геймпада', fragmentIcon: 'Gamepad2', fragmentColor: '#8b5cf6',
      fragmentsRequired: 10, fragmentsCollected: 4,
      resultItemId: findItem('Baldur\'s Gate 3'), resultName: 'Baldur\'s Gate 3 (бесплатно)',
      resultDescription: 'Собери 10 фрагментов и получи игру!', resultRarity: 'legendary', resultIcon: '⚔️',
      craftCost: { coins: 0, gems: 0 },
      fragmentSource: { type: 'task_linked', linkedTaskIds: [findTask('Решить задачу на LeetCode')], dropChance: 30 },
      crafted: false, createdAt: ts - 10 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId,
      fragmentName: 'Фрагмент книги', fragmentIcon: 'BookOpen', fragmentColor: '#3b82f6',
      fragmentsRequired: 5, fragmentsCollected: 2,
      resultItemId: '', resultName: 'Новая книга',
      resultDescription: 'Собери 5 фрагментов — выбери любую книгу', resultRarity: 'rare', resultIcon: '📕',
      craftCost: { coins: 50, gems: 0 },
      fragmentSource: { type: 'task_linked', linkedTaskIds: [findTask('Прочитать 30 страниц книги')], dropChance: 40 },
      crafted: false, createdAt: ts - 8 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId,
      fragmentName: 'Фрагмент билета', fragmentIcon: 'Ticket', fragmentColor: '#ec4899',
      fragmentsRequired: 8, fragmentsCollected: 1,
      resultItemId: findItem('Билет на концерт'), resultName: 'Билет на концерт',
      resultDescription: 'Собери 8 фрагментов!', resultRarity: 'rare', resultIcon: '🎵',
      craftCost: { coins: 100, gems: 1 },
      fragmentSource: { type: 'task_linked', linkedTaskIds: [findTask('Практика на гитаре')], dropChance: 25 },
      crafted: false, createdAt: ts - 5 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId,
      fragmentName: 'Фрагмент здоровья', fragmentIcon: 'Heart', fragmentColor: '#ef4444',
      fragmentsRequired: 15, fragmentsCollected: 6,
      resultItemId: findItem('Spa-день'), resultName: 'Spa-день',
      resultDescription: 'Забота о здоровье = spa!', resultRarity: 'epic', resultIcon: '🧖',
      craftCost: { coins: 0, gems: 0 },
      fragmentSource: { type: 'task_linked', linkedTaskIds: [findTask('Утренняя зарядка 15 мин'), findTask('Тренировка в зале')], dropChance: 20 },
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
      fragmentName: 'Осколок клавиатуры', fragmentIcon: 'Keyboard', fragmentColor: '#6366f1',
      fragmentsRequired: 20, fragmentsCollected: 8,
      resultItemId: findItem('Механическая клавиатура'), resultName: 'Механическая клавиатура',
      resultDescription: 'Собери 20 осколков за выполнение рабочих задач', resultRarity: 'rare', resultIcon: '⌨️',
      craftCost: { coins: 200, gems: 2 },
      fragmentSource: { type: 'task_linked', linkedTaskIds: [findTask('Код-ревью PR коллег'), findTask('Написать unit-тесты'), findTask('Закрыть тикеты в Jira')], dropChance: 15 },
      crafted: false, createdAt: ts - 20 * DAY, updatedAt: ts,
    },
    {
      id: uid(), profileId,
      fragmentName: 'Фрагмент суши', fragmentIcon: 'Fish', fragmentColor: '#f97316',
      fragmentsRequired: 5, fragmentsCollected: 5,
      resultItemId: findItem('Суши-сет'), resultName: 'Суши-сет',
      resultDescription: 'Готово к крафту!', resultRarity: 'uncommon', resultIcon: '🍣',
      craftCost: { coins: 30, gems: 0 },
      fragmentSource: { type: 'task_linked', linkedTaskIds: [findTask('Приготовить ужин')], dropChance: 35 },
      crafted: false, createdAt: ts - 14 * DAY, updatedAt: ts,
    },
  ]

  // ─── Inventory (some pre-bought items) ─────────────────────────────────────

  const inventory: InventoryEntry[] = [
    { itemId: findItem('Кофе из кофейни'), quantity: 3, acquiredAt: ts - 2 * DAY },
    { itemId: findItem('Мороженое'), quantity: 2, acquiredAt: ts - DAY },
    { itemId: findItem('Скидка 10%'), quantity: 1, acquiredAt: ts - 3 * DAY },
    { itemId: findItem('Коробка удачи'), quantity: 2, acquiredAt: ts - DAY },
    { itemId: findItem('Дневной сон 30 мин'), quantity: 5, acquiredAt: ts - 5 * DAY },
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
    habits,
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
      totalHabitsPositive: 0,
      totalHabitsNegative: 0,
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
