import { useState, useEffect } from 'react'
import { X, Calendar, Clock, Trash2, Check } from 'lucide-react'

interface DateTimePickerModalProps {
  isOpen: boolean
  value: string // datetime-local format: "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void
  onClose: () => void
  title?: string
  description?: string
}

export default function DateTimePickerModal({
  isOpen,
  value,
  onChange,
  onClose,
  title = 'Выбрать дедлайн',
  description = 'После дедлайна завершить задачу будет нельзя',
}: DateTimePickerModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('23:59')

  useEffect(() => {
    if (isOpen) {
      if (value) {
        const [date, time] = value.split('T')
        setSelectedDate(date || '')
        setSelectedTime(time || '23:59')
      } else {
        // Default to tomorrow
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setSelectedDate(tomorrow.toISOString().split('T')[0])
        setSelectedTime('23:59')
      }
    }
  }, [isOpen, value])

  if (!isOpen) return null

  const handleSave = () => {
    if (selectedDate) {
      const selectedDateTime = new Date(`${selectedDate}T${selectedTime}`)
      const now = new Date()

      // Проверяем, что выбранная дата не в прошлом
      if (selectedDateTime < now) {
        alert('Нельзя установить дедлайн в прошлом')
        return
      }

      onChange(`${selectedDate}T${selectedTime}`)
    }
    onClose()
  }

  const handleClear = () => {
    onChange('')
    onClose()
  }

  const getFormattedDate = () => {
    if (!selectedDate) return 'Не выбрана'

    const date = new Date(`${selectedDate}T${selectedTime}`)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    let relative = ''
    if (diffDays === 0) relative = 'Сегодня'
    else if (diffDays === 1) relative = 'Завтра'
    else if (diffDays === -1) relative = 'Вчера'
    else if (diffDays > 1 && diffDays <= 7) relative = `Через ${diffDays} дн.`
    else if (diffDays < -1) relative = `${Math.abs(diffDays)} дн. назад`

    const formatted = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    return relative ? `${formatted} (${relative})` : formatted
  }

  const quickOptions = [
    { label: 'Сегодня', getDays: () => 0 },
    { label: 'Завтра', getDays: () => 1 },
    { label: 'Через неделю', getDays: () => 7 },
    { label: 'Через месяц', getDays: () => 30 },
  ]

  const handleQuickSelect = (getDays: () => number) => {
    const date = new Date()
    date.setDate(date.getDate() + getDays())
    setSelectedDate(date.toISOString().split('T')[0])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white dark:bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-subtle)]">
                <Calendar className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--fg)]">{title}</h2>
                <p className="text-xs text-[var(--fg-muted)] mt-0.5">{description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="icon-btn h-8 w-8 p-0 shrink-0"
              title="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Quick Select */}
            <div>
              <label className="block text-sm font-semibold text-[var(--fg)] mb-3">
                Быстрый выбор
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {quickOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleQuickSelect(option.getDays)}
                    className="group relative flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--border)] bg-gradient-to-br from-white to-gray-50 dark:from-[var(--surface-elevated)] dark:to-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--fg)] transition-all hover:border-[var(--accent)] hover:shadow-lg hover:shadow-[var(--accent)]/20 hover:-translate-y-0.5"
                  >
                    <Calendar className="h-4 w-4 text-[var(--fg-muted)] group-hover:text-[var(--accent)] transition-colors" />
                    <span className="group-hover:text-[var(--accent)] transition-colors">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-sm font-semibold text-[var(--fg)] mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                Дата
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-600/10 pointer-events-none group-focus-within:from-blue-500/20 group-focus-within:to-indigo-600/20 transition-colors">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input w-full pl-14 pr-4 h-14 text-base font-medium shadow-sm hover:shadow-md focus:shadow-lg transition-shadow"
                />
              </div>
            </div>

            {/* Time Picker */}
            <div>
              <label className="block text-sm font-semibold text-[var(--fg)] mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                Время
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-600/10 pointer-events-none group-focus-within:from-purple-500/20 group-focus-within:to-pink-600/20 transition-colors">
                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="input w-full pl-14 pr-4 h-14 text-base font-medium shadow-sm hover:shadow-md focus:shadow-lg transition-shadow"
                />
              </div>
            </div>

            {/* Preview */}
            {selectedDate && (
              <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent)]/5 via-[var(--accent)]/10 to-[var(--accent)]/5 p-4 shadow-lg">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--accent)]/20 to-transparent rounded-full blur-2xl -translate-y-8 translate-x-8" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-lg shadow-[var(--accent)]/30">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-1.5">
                      Выбранный дедлайн
                    </p>
                    <p className="text-base font-bold text-[var(--fg)]">
                      {getFormattedDate()}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Clock className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
                      <p className="text-sm font-medium text-[var(--fg-muted)]">
                        {selectedTime}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-elevated)]">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedDate}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
