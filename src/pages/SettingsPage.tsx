import { useState } from 'react'
import {
  Settings, User, Palette, Bell, Database,
  Plus, Pencil, Trash2, X, Save, Download, Upload,
  Sun, Moon, Monitor, Check, AlertTriangle
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import type { Attribute, ThemeMode, AccentColor } from '../types/domain'
import { ACCENT_COLORS } from '../types/domain'
import ConfirmModal from '../components/ConfirmModal'

// ─── Profile Section ────────────────────────────────────────────────────────

function ProfileSection() {
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const updateProfile = useRpgStore((s) => s.updateProfile)
  
  const profile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null
  const [name, setName] = useState(profile?.name ?? '')
  const [saved, setSaved] = useState(false)

  if (!profile) return null

  const handleSave = () => {
    if (!name.trim()) return
    updateProfile(profile.id, (p) => ({ ...p, name: name.trim() }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
          <User className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-[var(--fg)]">Профиль</h2>
          <p className="text-xs text-[var(--fg-muted)]">Настройки вашего персонажа</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя персонажа"
          className="input flex-1"
        />
        <button
          type="button"
          onClick={handleSave}
          className={cn(
            'btn-primary flex items-center gap-2',
            saved && 'bg-emerald-500'
          )}
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Сохранено' : 'Сохранить'}
        </button>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-[var(--surface)] p-3 text-center">
          <p className="text-xl font-bold text-[var(--fg)]">{profile.level}</p>
          <p className="text-xs text-[var(--fg-muted)]">Уровень</p>
        </div>
        <div className="rounded-xl bg-[var(--surface)] p-3 text-center">
          <p className="text-xl font-bold text-[var(--fg)]">{profile.xp.toLocaleString('ru-RU')}</p>
          <p className="text-xs text-[var(--fg-muted)]">XP</p>
        </div>
        <div className="rounded-xl bg-[var(--surface)] p-3 text-center">
          <p className="text-xl font-bold text-[var(--fg)]">{profile.attributes.length}</p>
          <p className="text-xs text-[var(--fg-muted)]">Атрибутов</p>
        </div>
      </div>
    </div>
  )
}

// ─── Attributes Section ─────────────────────────────────────────────────────

interface AttributeEditorProps {
  attribute?: Attribute
  onClose: () => void
}

const ATTRIBUTE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
]

const ATTRIBUTE_ICONS = ['💪', '🧠', '❤️', '⚡', '🎯', '✨', '🔥', '🛡️', '⚔️', '📚', '🎨', '🎵', '💰', '🏃', '🧘', '💎']

function AttributeEditor({ attribute, onClose }: AttributeEditorProps) {
  const addAttribute = useRpgStore((s) => s.addAttribute)
  const updateAttribute = useRpgStore((s) => s.updateAttribute)

  const [name, setName] = useState(attribute?.name ?? '')
  const [key, setKey] = useState(attribute?.key ?? '')
  const [icon, setIcon] = useState(attribute?.icon ?? '💪')
  const [color, setColor] = useState(attribute?.color ?? '#6366f1')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !key.trim()) return

    if (attribute) {
      updateAttribute(attribute.id, (a) => ({ ...a, name: name.trim(), key: key.trim(), icon, color }))
    } else {
      addAttribute({ name: name.trim(), key: key.trim(), icon, color, level: 1, current_xp: 0 })
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--fg)]">
            {attribute ? 'Редактировать атрибут' : 'Новый атрибут'}
          </h2>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название (например, Сила)"
            className="input"
            autoFocus
          />

          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Краткое имя (STR)"
            className="input"
          />

          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Иконка</label>
            <div className="flex flex-wrap gap-2">
              {ATTRIBUTE_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn(
                    'h-10 w-10 rounded-xl text-xl transition-all',
                    icon === i ? 'bg-[var(--accent)] scale-110' : 'bg-[var(--surface)]'
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Цвет</label>
            <div className="flex flex-wrap gap-2">
              {ATTRIBUTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-8 w-8 rounded-lg transition-all',
                    color === c && 'ring-2 ring-white ring-offset-2 ring-offset-[var(--surface-overlay)] scale-110'
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" className="btn-primary flex-1">
              {attribute ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AttributesSection() {
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const deleteAttribute = useRpgStore((s) => s.deleteAttribute)
  
  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []

  const [showEditor, setShowEditor] = useState(false)
  const [editingAttribute, setEditingAttribute] = useState<Attribute | undefined>()
  const [deletingAttrId, setDeletingAttrId] = useState<string | null>(null)

  const handleEdit = (attr: Attribute) => {
    setEditingAttribute(attr)
    setShowEditor(true)
  }

  const handleClose = () => {
    setShowEditor(false)
    setEditingAttribute(undefined)
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600">
            <span className="text-xl">⚔️</span>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--fg)]">Атрибуты</h2>
            <p className="text-xs text-[var(--fg-muted)]">{attributes.length} атрибутов</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowEditor(true)}
          className="btn-secondary text-sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {attributes.map((attr) => (
          <div
            key={attr.id}
            className="group flex items-center gap-3 rounded-xl bg-[var(--surface)] p-3 transition-all hover:bg-[var(--surface-elevated)]"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
              style={{ background: `${attr.color}20` }}
            >
              {attr.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--fg)] truncate">{attr.name}</p>
              <p className="text-xs text-[var(--fg-muted)]">Ур. {attr.level}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => handleEdit(attr)}
                className="icon-btn h-8 w-8 p-0"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeletingAttrId(attr.id)}
                className="icon-btn icon-btn-danger h-8 w-8 p-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showEditor && <AttributeEditor attribute={editingAttribute} onClose={handleClose} />}

      <ConfirmModal
        isOpen={deletingAttrId !== null}
        onConfirm={() => {
          if (deletingAttrId) deleteAttribute(deletingAttrId)
          setDeletingAttrId(null)
        }}
        onCancel={() => setDeletingAttrId(null)}
        title="Удалить атрибут?"
        message="Атрибут будет удалён безвозвратно."
        variant="danger"
        confirmText="Удалить"
        cancelText="Отмена"
      />
    </div>
  )
}

// ─── Appearance Section ─────────────────────────────────────────────────────

function AppearanceSection() {
  const settings = useRpgStore((s) => s.settings)
  const updateSettings = useRpgStore((s) => s.updateSettings)

  const themes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Светлая', icon: <Sun className="h-5 w-5" /> },
    { value: 'dark', label: 'Тёмная', icon: <Moon className="h-5 w-5" /> },
    { value: 'system', label: 'Системная', icon: <Monitor className="h-5 w-5" /> },
  ]

  const accentColors: { value: AccentColor; label: string }[] = [
    { value: 'blue', label: 'Синий' },
    { value: 'purple', label: 'Фиолетовый' },
    { value: 'pink', label: 'Розовый' },
    { value: 'red', label: 'Красный' },
    { value: 'orange', label: 'Оранжевый' },
    { value: 'green', label: 'Зелёный' },
    { value: 'teal', label: 'Бирюзовый' },
  ]

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600">
          <Palette className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-[var(--fg)]">Внешний вид</h2>
          <p className="text-xs text-[var(--fg-muted)]">Тема и акцентный цвет</p>
        </div>
      </div>

      {/* Theme */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[var(--fg-muted)] mb-3">Тема</label>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => updateSettings({ theme: t.value })}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl p-4 transition-all',
                settings.theme === t.value
                  ? 'bg-[var(--accent-subtle)] border-2 border-[var(--accent)]'
                  : 'bg-[var(--surface)] border-2 border-transparent hover:bg-[var(--surface-elevated)]'
              )}
            >
              {t.icon}
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div>
        <label className="block text-sm font-medium text-[var(--fg-muted)] mb-3">Акцентный цвет</label>
        <div className="flex flex-wrap gap-3">
          {accentColors.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => updateSettings({ accentColor: c.value })}
              className={cn(
                'h-10 w-10 rounded-xl transition-all',
                settings.accentColor === c.value && 'ring-2 ring-white ring-offset-2 ring-offset-[var(--surface-card)] scale-110'
              )}
              style={{ background: ACCENT_COLORS[c.value].light }}
              title={c.label}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Notifications Section ──────────────────────────────────────────────────

function NotificationsSection() {
  const settings = useRpgStore((s) => s.settings)
  const updateSettings = useRpgStore((s) => s.updateSettings)

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
          <Bell className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-[var(--fg)]">Уведомления</h2>
          <p className="text-xs text-[var(--fg-muted)]">Настройки оповещений</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {[
          { key: 'notifyDailyReminder', label: 'Ежедневные напоминания', desc: 'Напоминание о задачах' },
          { key: 'notifyAchievements', label: 'Достижения', desc: 'При разблокировке достижений' },
          { key: 'notifyLevelUp', label: 'Повышение уровня', desc: 'При получении нового уровня' },
        ].map((item) => (
          <label
            key={item.key}
            className="flex items-center justify-between rounded-xl bg-[var(--surface)] p-4 cursor-pointer hover:bg-[var(--surface-elevated)] transition-colors"
          >
            <div>
              <p className="font-medium text-[var(--fg)]">{item.label}</p>
              <p className="text-xs text-[var(--fg-muted)]">{item.desc}</p>
            </div>
            <input
              type="checkbox"
              checked={settings[item.key as keyof typeof settings] as boolean}
              onChange={(e) => updateSettings({ [item.key]: e.target.checked })}
              className="h-5 w-5 rounded accent-[var(--accent)]"
            />
          </label>
        ))}
      </div>
    </div>
  )
}

// ─── Data Section ───────────────────────────────────────────────────────────

function DataSection() {
  const exportData = useRpgStore((s) => s.exportData)
  const importData = useRpgStore((s) => s.importData)
  const resetProgress = useRpgStore((s) => s.resetProgress)

  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showResetFinalConfirm, setShowResetFinalConfirm] = useState(false)

  const handleExport = () => {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rpg-life-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const json = reader.result as string
        if (importData(json)) {
          alert('Данные успешно импортированы!')
        } else {
          alert('Ошибка импорта данных')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleReset = () => {
    setShowResetConfirm(true)
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600">
          <Database className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-[var(--fg)]">Данные</h2>
          <p className="text-xs text-[var(--fg-muted)]">Экспорт, импорт и сброс</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          type="button"
          onClick={handleExport}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <Download className="h-4 w-4" />
          Экспорт
        </button>
        <button
          type="button"
          onClick={handleImport}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Импорт
        </button>
      </div>

      <button
        type="button"
        onClick={handleReset}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 text-red-500 font-medium transition-all hover:bg-red-500/20"
      >
        <AlertTriangle className="h-4 w-4" />
        Сбросить весь прогресс
      </button>

      <ConfirmModal
        isOpen={showResetConfirm}
        onConfirm={() => {
          setShowResetConfirm(false)
          setShowResetFinalConfirm(true)
        }}
        onCancel={() => setShowResetConfirm(false)}
        title="Сбросить прогресс?"
        message="Все данные будут удалены!"
        variant="danger"
        confirmText="Продолжить"
        cancelText="Отмена"
      />

      <ConfirmModal
        isOpen={showResetFinalConfirm}
        onConfirm={() => {
          resetProgress()
          setShowResetFinalConfirm(false)
        }}
        onCancel={() => setShowResetFinalConfirm(false)}
        title="Точно удалить ВСЕ данные?"
        message="Это действие необратимо."
        variant="danger"
        confirmText="Удалить всё"
        cancelText="Отмена"
      />
    </div>
  )
}

// ─── Main Settings Page ─────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-lg">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--fg)]">Настройки</h1>
          <p className="text-sm text-[var(--fg-muted)]">Управление приложением</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <ProfileSection />
          <AttributesSection />
        </div>
        <div className="flex flex-col gap-6">
          <AppearanceSection />
          <NotificationsSection />
          <DataSection />
        </div>
      </div>
    </div>
  )
}
