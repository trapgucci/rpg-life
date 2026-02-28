import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useRpgStore } from '../store/useRpgStore'
import { CURRENCY_IDS } from '../types/domain'
import type { ShopItem, TaskRpg } from '../types/domain'

// ─── Хелперы для создания тестовых данных ────────────────────────────────

function makeShopItem(overrides: Partial<ShopItem> = {}): ShopItem {
  return {
    id: overrides.id ?? `item-${crypto.randomUUID()}`,
    name: overrides.name ?? 'Тестовый товар',
    rarity: overrides.rarity ?? 'common',
    cost: overrides.cost ?? { [CURRENCY_IDS.COINS]: 100, [CURRENCY_IDS.GEMS]: 0 },
    isLootBox: overrides.isLootBox ?? false,
    ...overrides,
  }
}

function setupStore() {
  // Полный сброс стейта перед каждым тестом
  const state = useRpgStore.getState()
  state.resetProgress()

  // Создаём профиль
  const profile = useRpgStore.getState().addProfile('Тестовый профиль')
  useRpgStore.getState().setActiveProfile(profile.id)
  return { profileId: profile.id, profile }
}

function giveCoins(amount: number) {
  useRpgStore.getState().addCurrency(CURRENCY_IDS.COINS, amount)
}

function giveGems(amount: number) {
  useRpgStore.getState().addCurrency(CURRENCY_IDS.GEMS, amount)
}

function getCoins(): number {
  return useRpgStore.getState().getCurrency(CURRENCY_IDS.COINS)
}

function getGems(): number {
  return useRpgStore.getState().getCurrency(CURRENCY_IDS.GEMS)
}

// ─── ТЕСТЫ: ИНВЕНТАРЬ ───────────────────────────────────────────────────

describe('Инвентарь', () => {
  beforeEach(() => setupStore())

  it('addToInventory добавляет предмет', () => {
    const { addToInventory, getInventory } = useRpgStore.getState()
    addToInventory('item-1', 3)
    const inv = getInventory()
    expect(inv).toHaveLength(1)
    expect(inv[0].itemId).toBe('item-1')
    expect(inv[0].quantity).toBe(3)
  })

  it('addToInventory увеличивает количество при повторном добавлении', () => {
    const { addToInventory, getInventory } = useRpgStore.getState()
    addToInventory('item-1', 2)
    addToInventory('item-1', 3)
    const inv = getInventory()
    expect(inv).toHaveLength(1)
    expect(inv[0].quantity).toBe(5)
  })

  it('removeFromInventory уменьшает количество', () => {
    const { addToInventory, removeFromInventory, getInventory } = useRpgStore.getState()
    addToInventory('item-1', 5)
    const result = removeFromInventory('item-1', 2)
    expect(result).toBe(true)
    expect(getInventory()[0].quantity).toBe(3)
  })

  it('removeFromInventory удаляет запись при quantity = 0', () => {
    const { addToInventory, removeFromInventory, getInventory } = useRpgStore.getState()
    addToInventory('item-1', 3)
    removeFromInventory('item-1', 3)
    expect(getInventory()).toHaveLength(0)
  })

  it('removeFromInventory возвращает false если предмета нет', () => {
    const result = useRpgStore.getState().removeFromInventory('nonexistent')
    expect(result).toBe(false)
  })

  it('removeFromInventory возвращает false если количество недостаточно', () => {
    const { addToInventory, removeFromInventory } = useRpgStore.getState()
    addToInventory('item-1', 2)
    const result = removeFromInventory('item-1', 5)
    expect(result).toBe(false)
  })
})

// ─── ТЕСТЫ: ПОКУПКИ ─────────────────────────────────────────────────────

describe('Покупка товаров', () => {
  beforeEach(() => setupStore())

  it('успешная покупка списывает монеты и добавляет в инвентарь', () => {
    const item = makeShopItem({ cost: { [CURRENCY_IDS.COINS]: 50, [CURRENCY_IDS.GEMS]: 0 } })
    useRpgStore.setState({ shopItems: [item] })
    giveCoins(100)

    const result = useRpgStore.getState().purchaseItem(item.id)
    expect(result).toBe(true)
    expect(getCoins()).toBe(50)
    expect(useRpgStore.getState().getInventory()).toHaveLength(1)
  })

  it('покупка с недостатком монет возвращает false', () => {
    const item = makeShopItem({ cost: { [CURRENCY_IDS.COINS]: 200, [CURRENCY_IDS.GEMS]: 0 } })
    useRpgStore.setState({ shopItems: [item] })
    giveCoins(100)

    const result = useRpgStore.getState().purchaseItem(item.id)
    expect(result).toBe(false)
    expect(getCoins()).toBe(100) // деньги не списались
  })

  it('покупка несуществующего товара возвращает false', () => {
    const result = useRpgStore.getState().purchaseItem('nonexistent')
    expect(result).toBe(false)
  })
})

// ─── ТЕСТЫ: СКИДКА (только монеты, не кристаллы) ────────────────────────

describe('Скидка в магазине', () => {
  beforeEach(() => setupStore())

  it('скидка снижает цену в монетах', () => {
    const item = makeShopItem({ cost: { [CURRENCY_IDS.COINS]: 100, [CURRENCY_IDS.GEMS]: 0 } })
    useRpgStore.setState({ shopItems: [item], activeShopDiscountPercent: 30 })
    giveCoins(100)

    useRpgStore.getState().purchaseItem(item.id)
    // 100 - 30% = 70, значит осталось 100 - 70 = 30
    expect(getCoins()).toBe(30)
  })

  it('скидка НЕ применяется к кристаллам', () => {
    const item = makeShopItem({ cost: { [CURRENCY_IDS.COINS]: 100, [CURRENCY_IDS.GEMS]: 10 } })
    useRpgStore.setState({ shopItems: [item], activeShopDiscountPercent: 50 })
    giveCoins(100)
    giveGems(20)

    useRpgStore.getState().purchaseItem(item.id)
    // Монеты: 100 - 50% = 50 → осталось 100 - 50 = 50
    expect(getCoins()).toBe(50)
    // Кристаллы: полная цена 10 → осталось 20 - 10 = 10
    expect(getGems()).toBe(10)
  })

  it('скидка сбрасывается после покупки', () => {
    const item = makeShopItem({ cost: { [CURRENCY_IDS.COINS]: 10, [CURRENCY_IDS.GEMS]: 0 } })
    useRpgStore.setState({ shopItems: [item], activeShopDiscountPercent: 50 })
    giveCoins(1000)

    useRpgStore.getState().purchaseItem(item.id)
    expect(useRpgStore.getState().activeShopDiscountPercent).toBeNull()
  })
})

// ─── ТЕСТЫ: КУПОН СКИДКИ ────────────────────────────────────────────────

describe('Купон скидки (useItem)', () => {
  beforeEach(() => setupStore())

  it('активирует скидку и удаляет купон из инвентаря', () => {
    const coupon = makeShopItem({
      id: 'coupon-1',
      isDiscountVoucher: true,
      discountPercent: 25,
    })
    useRpgStore.setState({ shopItems: [coupon] })
    useRpgStore.getState().addToInventory('coupon-1', 1)

    const result = useRpgStore.getState().useItem('coupon-1')
    expect(result).toBe(true)
    expect(useRpgStore.getState().activeShopDiscountPercent).toBe(25)
    expect(useRpgStore.getState().getInventory()).toHaveLength(0)
  })

  it('НЕ активирует скидку если купона нет в инвентаре', () => {
    const coupon = makeShopItem({
      id: 'coupon-1',
      isDiscountVoucher: true,
      discountPercent: 25,
    })
    useRpgStore.setState({ shopItems: [coupon] })
    // НЕ добавляем в инвентарь

    const result = useRpgStore.getState().useItem('coupon-1')
    expect(result).toBe(false)
    expect(useRpgStore.getState().activeShopDiscountPercent).toBeNull()
  })
})

// ─── ТЕСТЫ: ЛУТБОКС ─────────────────────────────────────────────────────

describe('Лутбокс', () => {
  beforeEach(() => setupStore())

  it('лутбокс с нулевыми весами выдаёт компенсацию', () => {
    const lootbox = makeShopItem({
      id: 'lb-1',
      isLootBox: true,
      cost: { [CURRENCY_IDS.COINS]: 100, [CURRENCY_IDS.GEMS]: 0 },
      lootTable: [
        { id: 'reward-1', weight: 0 },
        { id: 'reward-2', weight: 0 },
      ],
    })
    useRpgStore.setState({ shopItems: [lootbox] })

    const result = useRpgStore.getState().openLootbox('lb-1')
    expect(result).not.toBeNull()
    expect(result!.compensated).toBe(true)
    // Компенсация 50% от 100 монет = 50
    expect(getCoins()).toBe(50)
  })

  it('лутбокс с нормальными весами выдаёт предмет', () => {
    const reward = makeShopItem({ id: 'reward-1', name: 'Награда' })
    const lootbox = makeShopItem({
      id: 'lb-1',
      isLootBox: true,
      lootTable: [{ id: 'reward-1', weight: 100 }], // 100% шанс
    })
    useRpgStore.setState({ shopItems: [lootbox, reward] })

    const result = useRpgStore.getState().openLootbox('lb-1')
    expect(result).not.toBeNull()
    expect(result!.itemId).toBe('reward-1')
  })

  it('лутбокс может выдать валюту (монеты)', () => {
    const lootbox = makeShopItem({
      id: 'lb-1',
      isLootBox: true,
      lootTable: [{ id: CURRENCY_IDS.COINS, weight: 100, quantity: 50 }],
    })
    useRpgStore.setState({ shopItems: [lootbox] })

    const result = useRpgStore.getState().openLootbox('lb-1')
    expect(result).not.toBeNull()
    expect(getCoins()).toBe(50)
  })
})

// ─── ТЕСТЫ: ЗАДАЧИ (counter) ────────────────────────────────────────────

describe('Счётчик задач (counter)', () => {
  beforeEach(() => setupStore())

  function addCounterTask(target: number): string {
    const task = useRpgStore.getState().addTask({
      kind: 'counter',
      current: 0,
      target,
      countUnit: 'раз',
      title: 'Тестовый счётчик',
      recurrence: 'daily',
      isCompleted: false,
      archived: false,
      difficulty: 'medium',
      attributeIds: [],
      subtasks: [],
    } as Omit<TaskRpg, 'id' | 'createdAt' | 'updatedAt' | 'profileId'>)
    return task.id
  }

  it('incrementCounter увеличивает счётчик', () => {
    const id = addCounterTask(5)
    useRpgStore.getState().incrementCounter(id)
    const task = useRpgStore.getState().tasks.find(t => t.id === id)!
    expect(task.kind === 'counter' && task.current).toBe(1)
  })

  it('incrementCounter не превышает target', () => {
    const id = addCounterTask(2)
    useRpgStore.getState().incrementCounter(id)
    useRpgStore.getState().incrementCounter(id)
    useRpgStore.getState().incrementCounter(id) // 3-й раз, но target = 2
    const task = useRpgStore.getState().tasks.find(t => t.id === id)!
    expect(task.kind === 'counter' && task.current).toBe(2)
  })

  it('decrementCounter уменьшает счётчик', () => {
    const id = addCounterTask(5)
    useRpgStore.getState().incrementCounter(id)
    useRpgStore.getState().incrementCounter(id)
    useRpgStore.getState().decrementCounter(id)
    const task = useRpgStore.getState().tasks.find(t => t.id === id)!
    expect(task.kind === 'counter' && task.current).toBe(1)
  })

  it('decrementCounter не уходит ниже 0', () => {
    const id = addCounterTask(5)
    useRpgStore.getState().decrementCounter(id)
    const task = useRpgStore.getState().tasks.find(t => t.id === id)!
    expect(task.kind === 'counter' && task.current).toBe(0)
  })

  it('decrementCounter корректно обновляет isCompleted (баг #2)', () => {
    const id = addCounterTask(3)
    // Набираем 3/3
    useRpgStore.getState().incrementCounter(id)
    useRpgStore.getState().incrementCounter(id)
    useRpgStore.getState().incrementCounter(id)

    // Уменьшаем до 2/3 — задача больше не выполнена
    useRpgStore.getState().decrementCounter(id)
    const task = useRpgStore.getState().tasks.find(t => t.id === id)!
    expect(task.isCompleted).toBe(false)
    expect(task.kind === 'counter' && task.current).toBe(2)
  })
})

// ─── ТЕСТЫ: ВАЛЮТА ──────────────────────────────────────────────────────

describe('Валюта', () => {
  beforeEach(() => setupStore())

  it('addCurrency увеличивает баланс', () => {
    giveCoins(100)
    expect(getCoins()).toBe(100)
  })

  it('deductCurrency уменьшает баланс', () => {
    giveCoins(100)
    const result = useRpgStore.getState().deductCurrency(CURRENCY_IDS.COINS, 30)
    expect(result).toBe(true)
    expect(getCoins()).toBe(70)
  })

  it('deductCurrency возвращает false при недостатке', () => {
    giveCoins(10)
    const result = useRpgStore.getState().deductCurrency(CURRENCY_IDS.COINS, 50)
    expect(result).toBe(false)
    expect(getCoins()).toBe(10) // баланс не изменился
  })

  it('монеты и кристаллы независимы', () => {
    giveCoins(100)
    giveGems(50)
    expect(getCoins()).toBe(100)
    expect(getGems()).toBe(50)
  })
})
