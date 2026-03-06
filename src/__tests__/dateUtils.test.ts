import { describe, it, expect } from 'vitest'
import { isSameDay, getStartOfDay, getStartOfWeek, getStartOfMonth, getStartOfYear } from '../lib/dateUtils'

describe('isSameDay', () => {
  it('одинаковые даты → true', () => {
    const a = new Date(2025, 5, 15, 10, 30).getTime()
    const b = new Date(2025, 5, 15, 23, 59).getTime()
    expect(isSameDay(a, b)).toBe(true)
  })

  it('разные дни → false', () => {
    const a = new Date(2025, 5, 15, 23, 59).getTime()
    const b = new Date(2025, 5, 16, 0, 0).getTime()
    expect(isSameDay(a, b)).toBe(false)
  })

  it('одинаковый день разных месяцев → false', () => {
    const a = new Date(2025, 5, 15).getTime()
    const b = new Date(2025, 6, 15).getTime()
    expect(isSameDay(a, b)).toBe(false)
  })
})

describe('getStartOfDay', () => {
  it('обнуляет часы, минуты, секунды', () => {
    const ts = new Date(2025, 5, 15, 14, 30, 45, 123).getTime()
    const result = getStartOfDay(ts)
    const d = new Date(result)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
    expect(d.getMilliseconds()).toBe(0)
    expect(d.getDate()).toBe(15)
  })
})

describe('getStartOfWeek', () => {
  it('среда → возвращает понедельник той же недели', () => {
    // 18 июня 2025 — среда
    const wed = new Date(2025, 5, 18, 12, 0).getTime()
    const result = getStartOfWeek(wed)
    const d = new Date(result)
    expect(d.getDay()).toBe(1) // понедельник
    expect(d.getDate()).toBe(16)
    expect(d.getHours()).toBe(0)
  })

  it('понедельник → возвращает тот же понедельник', () => {
    const mon = new Date(2025, 5, 16, 15, 0).getTime()
    const result = getStartOfWeek(mon)
    const d = new Date(result)
    expect(d.getDay()).toBe(1)
    expect(d.getDate()).toBe(16)
  })

  it('воскресенье → возвращает понедельник прошлой недели', () => {
    // 22 июня 2025 — воскресенье
    const sun = new Date(2025, 5, 22, 12, 0).getTime()
    const result = getStartOfWeek(sun)
    const d = new Date(result)
    expect(d.getDay()).toBe(1) // понедельник
    expect(d.getDate()).toBe(16)
  })
})

describe('getStartOfMonth', () => {
  it('середина месяца → 1 число того же месяца', () => {
    const ts = new Date(2025, 5, 15, 14, 30).getTime()
    const result = getStartOfMonth(ts)
    const d = new Date(result)
    expect(d.getDate()).toBe(1)
    expect(d.getMonth()).toBe(5)
    expect(d.getHours()).toBe(0)
  })
})

describe('getStartOfYear', () => {
  it('любой день → 1 января того же года', () => {
    const ts = new Date(2025, 8, 20).getTime()
    const result = getStartOfYear(ts)
    const d = new Date(result)
    expect(d.getDate()).toBe(1)
    expect(d.getMonth()).toBe(0)
    expect(d.getFullYear()).toBe(2025)
    expect(d.getHours()).toBe(0)
  })
})
