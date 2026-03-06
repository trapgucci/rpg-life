/** Форматировать дату для отображения: "2 марта 2026" */
export function formatDateRu(ts: number): string {
  const d = new Date(ts)
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ]
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

/** Форматировать время: "14:05" */
export function formatTimeRu(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Относительная дата: "Сегодня", "Вчера", "2 марта" */
export function relativeDateRu(ts: number): string {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000

  if (ts >= todayStart) return 'Сегодня'
  if (ts >= yesterdayStart) return 'Вчера'
  return formatDateRu(ts)
}

/** Получить dateKey (YYYY-MM-DD) из timestamp */
export function getDateKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Получить dateKey для сегодня */
export function getTodayKey(): string {
  return getDateKey(Date.now())
}
