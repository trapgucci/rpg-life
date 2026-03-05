import { CheckSquare, Hash, ClipboardList } from 'lucide-react'
import type { TaskRecurrence } from '../types/domain'

export const RECURRENCE_LABELS: Record<TaskRecurrence, { label: string; color: string }> = {
  once: { label: 'Один раз', color: '#6b7280' },
  daily: { label: 'Ежедневно', color: '#3b82f6' },
  weekly: { label: 'Еженедельно', color: '#8b5cf6' },
  monthly: { label: 'Ежемесячно', color: '#ec4899' },
  yearly: { label: 'Ежегодно', color: '#f59e0b' },
  instant: { label: 'Инстант', color: '#22c55e' },
  custom: { label: 'Кастомный', color: '#6366f1' },
}

export const TASK_KIND_ICONS: Record<string, typeof CheckSquare> = {
  checkbox: CheckSquare,
  counter: Hash,
  nested: ClipboardList,
}
