import { useCallback } from 'react'
import { useRpgStore } from '../store/useRpgStore'

// Extend window with electron API
declare global {
  interface Window {
    electronAPI?: {
      platform: string
      showNotification: (title: string, body: string, options?: {
        icon?: string
        silent?: boolean
      }) => Promise<boolean>
      getAppVersion: () => Promise<string>
    }
  }
}

export function useNotifications() {
  const settings = useRpgStore((s) => s.settings)

  const showNotification = useCallback(async (
    title: string,
    body: string,
    type: 'achievement' | 'reminder' | 'general' = 'general'
  ) => {
    // Check if notifications are enabled
    if (!settings.notificationsEnabled) return false
    
    // Check specific notification types
    if (type === 'achievement' && !settings.notifyAchievements) return false
    if (type === 'reminder' && !settings.notifyDailyTasks) return false

    // Use Electron notification if available
    if (window.electronAPI?.showNotification) {
      return window.electronAPI.showNotification(title, body)
    }

    // Fallback to browser notification
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body })
        return true
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          new Notification(title, { body })
          return true
        }
      }
    }

    return false
  }, [settings.notificationsEnabled, settings.notifyAchievements, settings.notifyDailyTasks])

  const notifyAchievement = useCallback((achievementTitle: string) => {
    return showNotification(
      '🏆 Достижение разблокировано!',
      achievementTitle,
      'achievement'
    )
  }, [showNotification])

  const notifyDailyReminder = useCallback((taskCount: number) => {
    return showNotification(
      '📋 Напоминание',
      `У вас ${taskCount} невыполненных ежедневных задач`,
      'reminder'
    )
  }, [showNotification])

  const notifyTaskComplete = useCallback((taskTitle: string, xp: number, coins: number) => {
    return showNotification(
      '✅ Задача выполнена!',
      `${taskTitle} — +${xp} XP, +${coins} монет`,
      'general'
    )
  }, [showNotification])

  const notifyLevelUp = useCallback((level: number, attributeName?: string) => {
    const title = attributeName
      ? `⬆️ ${attributeName} повышен!`
      : '⬆️ Уровень повышен!'
    const body = attributeName
      ? `${attributeName} теперь уровня ${level}`
      : `Вы достигли уровня ${level}!`
    return showNotification(title, body, 'general')
  }, [showNotification])

  return {
    showNotification,
    notifyAchievement,
    notifyDailyReminder,
    notifyTaskComplete,
    notifyLevelUp,
  }
}
