import { useEffect, useRef } from 'react'
import { useRpgStore } from '../store/useRpgStore'
import { useNotifications } from '../hooks/useNotifications'

/**
 * Невидимый компонент-подписчик.
 * Следит за изменениями уровней атрибутов и отправляет системные уведомления.
 * Также управляет таймером ежедневных напоминаний.
 */
export default function NotificationWatcher() {
  const { notifyLevelUp, notifyDailyReminder } = useNotifications()
  const attributes = useRpgStore((s) => s.getAttributes())
  const settings = useRpgStore((s) => s.settings)
  const tasks = useRpgStore((s) => s.tasks)

  // Запомнить уровни при первом рендере (не уведомлять при загрузке)
  const prevLevelsRef = useRef<Record<string, number> | null>(null)

  useEffect(() => {
    const currentLevels: Record<string, number> = {}
    for (const attr of attributes) {
      currentLevels[attr.id] = attr.level
    }

    if (prevLevelsRef.current === null) {
      // Первая загрузка — просто запоминаем
      prevLevelsRef.current = currentLevels
      return
    }

    // Сравниваем с предыдущими уровнями
    for (const attr of attributes) {
      const prevLevel = prevLevelsRef.current[attr.id] ?? attr.level
      if (attr.level > prevLevel) {
        notifyLevelUp(attr.level, attr.name)
      }
    }

    prevLevelsRef.current = currentLevels
  }, [attributes, notifyLevelUp])

  // Таймер ежедневных напоминаний
  const lastReminderDateRef = useRef<string | null>(null)

  useEffect(() => {
    if (!settings.notificationsEnabled || !settings.notifyDailyReminder) return

    const checkReminder = () => {
      const now = new Date()
      const todayStr = now.toISOString().slice(0, 10)
      const [hours, minutes] = (settings.dailyReminderTime || '09:00').split(':').map(Number)

      // Уже напоминали сегодня
      if (lastReminderDateRef.current === todayStr) return

      if (now.getHours() === hours && now.getMinutes() === minutes) {
        const pendingCount = tasks.filter((t) => !t.completed && !t.archived).length
        if (pendingCount > 0) {
          notifyDailyReminder(pendingCount)
          lastReminderDateRef.current = todayStr
        }
      }
    }

    // Проверяем каждую минуту
    const interval = setInterval(checkReminder, 60_000)
    checkReminder()

    return () => clearInterval(interval)
  }, [settings.notificationsEnabled, settings.notifyDailyReminder, settings.dailyReminderTime, tasks, notifyDailyReminder])

  return null
}
