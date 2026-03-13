import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Settings, User, Palette, Bell, Database, Gamepad2, MessageCircle,
  Plus, Pencil, Trash2, X, Save, Download, Upload, ImagePlus,
  Sun, Moon, Monitor, Check, AlertTriangle, Clock, FolderOpen, FlaskConical,
  Sparkles, Zap, Shield, Swords, ExternalLink,
  ChevronRight, BookOpen, Type,
  Coins, Gem, Minus, History,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import type { Attribute, ThemeMode, AccentColor, FontFamily, DeletionLogEntry } from '../types/domain'
import { ACCENT_COLORS, FONT_FAMILIES, CURRENCY_IDS, xpForLevelStandard, xpForLevelFast, xpForLevelCustom } from '../types/domain'
import ConfirmModal from '../components/ConfirmModal'
import { vaultStorage } from '../lib/vaultStorage'
import { generateSeedData } from '../lib/seedData'
import GuideSection from '../components/GuideSection'

// ─── Constants ──────────────────────────────────────────────────────────────

const AVATAR_OPTIONS = [
  '🧙', '🧙‍♂️', '🧝', '🧝‍♀️', '🧛', '🧜‍♀️',
  '🦹', '🦸', '🥷', '🏹', '⚔️', '🛡️',
  '🐉', '🦅', '🐺', '🦊', '🐱', '🦁',
  '👑', '💀', '🤖', '👾', '🎃', '🌟',
]

const ATTRIBUTE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
]

const ATTRIBUTE_ICONS = ['💪', '🧠', '❤️', '⚡', '🎯', '✨', '🔥', '🛡️', '⚔️', '📚', '🎨', '🎵', '💰', '🏃', '🧘', '💎']

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  easy: { label: 'Легко', color: '#10b981' },
  medium: { label: 'Средне', color: '#3b82f6' },
  hard: { label: 'Сложно', color: '#f97316' },
  veryHard: { label: 'Очень сложно', color: '#ef4444' },
}

type SettingsTab = 'profile' | 'attributes' | 'appearance' | 'gameplay' | 'notifications' | 'data' | 'feedback' | 'guide'

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode; gradient: string }[] = [
  { id: 'profile', label: 'Профиль', icon: <User className="h-4 w-4" />, gradient: 'from-indigo-500 to-purple-600' },
  { id: 'attributes', label: 'Атрибуты', icon: <Swords className="h-4 w-4" />, gradient: 'from-emerald-500 to-green-600' },
  { id: 'appearance', label: 'Оформление', icon: <Palette className="h-4 w-4" />, gradient: 'from-pink-500 to-rose-600' },
  { id: 'gameplay', label: 'Геймплей', icon: <Gamepad2 className="h-4 w-4" />, gradient: 'from-amber-500 to-orange-600' },
  { id: 'notifications', label: 'Уведомления', icon: <Bell className="h-4 w-4" />, gradient: 'from-cyan-500 to-blue-600' },
  { id: 'data', label: 'Данные', icon: <Database className="h-4 w-4" />, gradient: 'from-slate-500 to-slate-700' },
  { id: 'feedback', label: 'Обратная связь', icon: <MessageCircle className="h-4 w-4" />, gradient: 'from-violet-500 to-purple-700' },
  { id: 'guide', label: 'Энциклопедия', icon: <BookOpen className="h-4 w-4" />, gradient: 'from-amber-500 to-orange-600' },
]

// ─── Shared UI Components ───────────────────────────────────────────────────

function NeuToggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 rounded-full transition-all duration-300 shrink-0',
        checked
          ? 'bg-[var(--accent)] shadow-[0_0_12px_var(--accent-glow)]'
          : 'neu-inset bg-[var(--surface)]',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-6 w-6 rounded-full transition-all duration-300',
          'shadow-[2px_2px_6px_var(--neu-shadow-dark),-1px_-1px_4px_var(--neu-shadow-light)]',
          checked
            ? 'left-[calc(100%-1.625rem)] bg-white'
            : 'left-0.5 bg-[var(--fg-muted)]'
        )}
      />
    </button>
  )
}

function NeuSettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl p-4 neu-convex">
      <div className="min-w-0">
        <p className="font-medium text-sm text-[var(--fg)]">{label}</p>
        {desc && <p className="text-xs text-[var(--fg-muted)] mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

function SectionHeader({ icon, gradient, title, desc }: { icon: React.ReactNode; gradient: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg', gradient)}>
        <span className="text-white">{icon}</span>
      </div>
      <div>
        <h2 className="font-bold text-lg text-[var(--fg)]">{title}</h2>
        <p className="text-xs text-[var(--fg-muted)]">{desc}</p>
      </div>
    </div>
  )
}

// ─── Profile Section ────────────────────────────────────────────────────────

function ProfileSection() {
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const updateProfile = useRpgStore((s) => s.updateProfile)
  const settings = useRpgStore((s) => s.settings)
  const updateSettings = useRpgStore((s) => s.updateSettings)

  const profile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null
  const [name, setName] = useState(profile?.name ?? '')
  const [saved, setSaved] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (settings.avatarImage) {
      vaultStorage.readMedia(settings.avatarImage).then((url) => {
        if (url) setAvatarImageUrl(url)
      })
    } else {
      setAvatarImageUrl(null)
    }
  }, [settings.avatarImage])

  if (!profile) return null

  const avatar = settings.avatar || '🧙'

  const handleAvatarUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/webp'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      const canvas = document.createElement('canvas')
      const size = 256
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      img.onload = async () => {
        // center-crop to square
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        const base64 = canvas.toDataURL('image/webp', 0.85).split(',')[1]
        const path = await vaultStorage.saveMedia(base64, 'webp')
        updateSettings({ avatarImage: path })
      }
      img.src = URL.createObjectURL(file)
    }
    input.click()
  }

  const handleRemoveAvatar = () => {
    if (settings.avatarImage) {
      vaultStorage.deleteMedia(settings.avatarImage)
      updateSettings({ avatarImage: undefined })
    }
  }
  const coins = profile.currencies?.coins ?? 0
  const gems = profile.currencies?.gems ?? 0

  const handleSave = () => {
    if (!name.trim()) return
    updateProfile(profile.id, (p) => ({ ...p, name: name.trim() }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="neu-card p-6">
      <SectionHeader
        icon={<User className="h-5 w-5" />}
        gradient="from-indigo-500 to-purple-600"
        title="Профиль"
        desc="Настройки персонажа"
      />

      {/* Avatar + Name */}
      <div className="flex items-start gap-4 mb-6">
        <div className="relative group">
          <button
            type="button"
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            className="relative overflow-hidden h-20 w-20 rounded-2xl neu-convex flex items-center justify-center text-4xl transition-transform group-hover:scale-105"
          >
            {avatarImageUrl ? (
              <img src={avatarImageUrl} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              avatar
            )}
          </button>
          <button
            type="button"
            onClick={handleAvatarUpload}
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            title="Загрузить фото"
          >
            <ImagePlus className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя персонажа"
            className="settings-input"
          />
          <button
            type="button"
            onClick={handleSave}
            className={cn(
              'self-start px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300',
              saved
                ? 'bg-[var(--success)] text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-[0_2px_8px_var(--accent-glow)] hover:shadow-[0_4px_16px_var(--accent-glow)] hover:-translate-y-0.5'
            )}
          >
            <span className="flex items-center gap-1.5">
              {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {saved ? 'Сохранено' : 'Сохранить'}
            </span>
          </button>
        </div>
      </div>

      {/* Avatar Picker */}
      {showAvatarPicker && (
        <div className="mb-6 p-4 rounded-2xl neu-inset">
          {avatarImageUrl && (
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-[var(--fg-muted)]">Текущая аватарка</p>
              <button
                type="button"
                onClick={() => { handleRemoveAvatar(); setShowAvatarPicker(false) }}
                className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Удалить фото
              </button>
            </div>
          )}
          <p className="text-xs font-medium text-[var(--fg-muted)] mb-3">Или выберите эмодзи</p>
          <div className="flex flex-wrap gap-2">
            {AVATAR_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  handleRemoveAvatar()
                  updateSettings({ avatar: a })
                  setShowAvatarPicker(false)
                }}
                className={cn(
                  'h-10 w-10 rounded-xl text-xl flex items-center justify-center transition-all duration-200',
                  avatar === a
                    ? 'neu-convex scale-110 shadow-[0_0_12px_var(--accent-glow)] ring-2 ring-[var(--accent)]'
                    : 'hover:scale-105 bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)]'
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { value: profile.level, label: 'Уровень', color: 'var(--accent)', glow: 'var(--accent-glow)' },
          { value: profile.xp.toLocaleString('ru-RU'), label: 'XP', color: '#a855f7', glow: 'rgba(168,85,247,0.3)' },
          { value: coins.toLocaleString('ru-RU'), label: 'Монеты', color: 'var(--gold)', glow: 'rgba(251,191,36,0.3)' },
          { value: gems.toLocaleString('ru-RU'), label: 'Самоцветы', color: 'var(--gem)', glow: 'rgba(139,92,246,0.3)' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-3 text-center neu-inset">
            <p className="text-xl font-bold" style={{ color: stat.color, textShadow: `0 0 10px ${stat.glow}` }}>
              {stat.value}
            </p>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Attributes Section ─────────────────────────────────────────────────────

interface AttributeEditorProps {
  attribute?: Attribute
  onClose: () => void
}

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
      addAttribute({ name: name.trim(), key: key.trim(), icon, color, level: 1, current_xp: 0, order: Date.now() })
    }
    onClose()
  }

  return createPortal(
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
            className="settings-input"
            autoFocus
          />

          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Краткое имя (STR)"
            className="settings-input"
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
                    'h-10 w-10 rounded-xl text-xl transition-all flex items-center justify-center',
                    icon === i
                      ? 'neu-convex scale-110 ring-2 ring-[var(--accent)]'
                      : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
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
    </div>,
    document.body
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
    <div className="neu-card p-6">
      <div className="flex items-center justify-between mb-6">
        <SectionHeader
          icon={<Swords className="h-5 w-5" />}
          gradient="from-emerald-500 to-green-600"
          title="Атрибуты"
          desc={`${attributes.length} атрибутов`}
        />
        <button
          type="button"
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all neu-convex hover:shadow-[0_0_12px_var(--accent-glow)] text-[var(--accent)]"
        >
          <Plus className="h-4 w-4" />
          Добавить
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {attributes.map((attr) => (
          <div
            key={attr.id}
            className="group flex items-center gap-3 rounded-2xl p-3 neu-convex transition-all hover:shadow-lg"
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-xl neu-icon-well"
              style={{ background: `${attr.color}15` }}
            >
              {attr.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[var(--fg)] truncate">{attr.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1.5 rounded-full neu-progress-track">
                  <div
                    className="h-full rounded-full attr-bar-animate"
                    style={{
                      width: `${Math.min(100, (attr.current_xp / (attr.level * 100)) * 100)}%`,
                      background: attr.color,
                      boxShadow: `0 0 8px ${attr.color}40`,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-[var(--fg-muted)]">Ур. {attr.level}</span>
              </div>
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

      {attributes.length === 0 && (
        <div className="text-center py-8 text-[var(--fg-muted)]">
          <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Нет атрибутов. Создайте первый!</p>
        </div>
      )}

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

  const themes: { value: ThemeMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'light', label: 'Светлая', icon: <Sun className="h-5 w-5" />, desc: 'Дневной режим' },
    { value: 'dark', label: 'Тёмная', icon: <Moon className="h-5 w-5" />, desc: 'Ночной режим' },
    { value: 'system', label: 'Авто', icon: <Monitor className="h-5 w-5" />, desc: 'Как в системе' },
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
    <div className="neu-card p-6">
      <SectionHeader
        icon={<Palette className="h-5 w-5" />}
        gradient="from-pink-500 to-rose-600"
        title="Оформление"
        desc="Тема и персонализация"
      />

      {/* Theme Selector — neumorphic toggle group */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-3 uppercase tracking-wider">Тема</label>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => updateSettings({ theme: t.value })}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-2xl p-4 transition-all duration-300',
                settings.theme === t.value
                  ? 'neu-convex shadow-[0_0_16px_var(--accent-glow)] ring-1 ring-[var(--accent)]/30'
                  : 'neu-inset hover:shadow-md'
              )}
            >
              <span className={cn(
                'transition-colors duration-300',
                settings.theme === t.value ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]'
              )}>
                {t.icon}
              </span>
              <span className={cn(
                'text-sm font-medium transition-colors',
                settings.theme === t.value ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'
              )}>
                {t.label}
              </span>
              <span className="text-[10px] text-[var(--fg-muted)]">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-3 uppercase tracking-wider">Акцентный цвет</label>
        <div className="flex flex-wrap gap-3">
          {accentColors.map((c) => {
            const isActive = settings.accentColor === c.value
            const colorVal = ACCENT_COLORS[c.value]
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => updateSettings({ accentColor: c.value })}
                className={cn(
                  'relative h-11 w-11 rounded-2xl transition-all duration-300',
                  isActive
                    ? 'scale-110 ring-2 ring-white/50 ring-offset-2 ring-offset-[var(--surface)]'
                    : 'hover:scale-105'
                )}
                style={{
                  background: `linear-gradient(135deg, ${colorVal.light}, ${colorVal.dark})`,
                  boxShadow: isActive ? `0 0 20px ${colorVal.light}60` : `0 2px 8px ${colorVal.light}20`,
                }}
                title={c.label}
              >
                {isActive && (
                  <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                )}
              </button>
            )
          })}
        </div>
        {/* Accent preview */}
        <div className="mt-3 rounded-xl p-3 neu-inset flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg" style={{
            background: `linear-gradient(135deg, var(--accent), var(--accent-hover))`,
            boxShadow: '0 0 12px var(--accent-glow)',
          }} />
          <div>
            <p className="text-xs font-medium text-[var(--fg)]">
              {accentColors.find(c => c.value === settings.accentColor)?.label}
            </p>
            <p className="text-[10px] text-[var(--fg-muted)]">Текущий акцент</p>
          </div>
        </div>
      </div>

      {/* Font Family */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-3 uppercase tracking-wider">Шрифт</label>
        <div className="grid grid-cols-1 gap-2">
          {(Object.entries(FONT_FAMILIES) as [FontFamily, typeof FONT_FAMILIES[FontFamily]][]).map(([key, font]) => {
            const isActive = (settings.fontFamily ?? 'nunito') === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => updateSettings({ fontFamily: key })}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 text-left',
                  isActive
                    ? 'neu-convex shadow-[0_0_12px_var(--accent-glow)] ring-1 ring-[var(--accent)]/30'
                    : 'neu-inset hover:shadow-md'
                )}
              >
                <Type className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]'
                )} />
                <div className="min-w-0">
                  <span
                    className={cn(
                      'block text-sm font-semibold transition-colors',
                      isActive ? 'text-[var(--fg)]' : 'text-[var(--fg-secondary)]'
                    )}
                    style={{ fontFamily: `${font.css}, system-ui, sans-serif` }}
                  >
                    {font.name}
                  </span>
                  <span className="block text-[10px] text-[var(--fg-muted)]">{font.preview}</span>
                </div>
                {isActive && (
                  <Check className="h-4 w-4 ml-auto text-[var(--accent)] shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Scrollbars */}
      <div className="flex flex-col gap-3">
        <NeuSettingRow label="Полосы прокрутки" desc="Отображать скроллбары в интерфейсе">
          <NeuToggle
            checked={settings.showScrollbars ?? true}
            onChange={(v) => updateSettings({ showScrollbars: v })}
          />
        </NeuSettingRow>
      </div>
    </div>
  )
}

// ─── Gameplay Section ───────────────────────────────────────────────────────

function GameplaySection() {
  const settings = useRpgStore((s) => s.settings)
  const updateSettings = useRpgStore((s) => s.updateSettings)
  const profile = useRpgStore((s) => s.getActiveProfile())
  const adminRemoveCurrency = useRpgStore((s) => s.adminRemoveCurrency)
  const adminRemoveXp = useRpgStore((s) => s.adminRemoveXp)
  const deletionHistory = useRpgStore((s) => s.deletionHistory)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)

  const xp = settings.taskDifficultyXp ?? { easy: 10, medium: 30, hard: 100, veryHard: 300 }

  // Removal state
  const [coinRemoveAmt, setCoinRemoveAmt] = useState('')
  const [gemRemoveAmt, setGemRemoveAmt] = useState('')
  const [xpRemoveAmt, setXpRemoveAmt] = useState('')
  const [selectedAttrId, setSelectedAttrId] = useState('')
  const [confirmAction, setConfirmAction] = useState<null | { type: 'coins' | 'gems' | 'xp'; amount: number; attrId?: string }>(null)

  const handleXpChange = (key: string, value: string) => {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < 0) return
    updateSettings({
      taskDifficultyXp: { ...xp, [key]: num },
    })
  }

  const handleConfirmRemoval = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'coins') {
      adminRemoveCurrency(CURRENCY_IDS.COINS, confirmAction.amount)
      setCoinRemoveAmt('')
    } else if (confirmAction.type === 'gems') {
      adminRemoveCurrency(CURRENCY_IDS.GEMS, confirmAction.amount)
      setGemRemoveAmt('')
    } else if (confirmAction.type === 'xp' && confirmAction.attrId) {
      adminRemoveXp(confirmAction.attrId, confirmAction.amount)
      setXpRemoveAmt('')
    }
    setConfirmAction(null)
  }

  const currentCoins = profile?.currencies[CURRENCY_IDS.COINS] ?? 0
  const currentGems = profile?.currencies[CURRENCY_IDS.GEMS] ?? 0
  const attributes = profile?.attributes ?? []

  // Calculate total accumulated XP for an attribute (all levels + current)
  const getTotalAttrXp = (attr: Attribute) => {
    if (!profile) return 0
    const mode = profile.levelingMode ?? 'standard'
    let cumulativeXp = 0
    if (mode === 'standard') {
      cumulativeXp = xpForLevelStandard(attr.level)
    } else if (mode === 'fast') {
      cumulativeXp = xpForLevelFast(attr.level)
    } else {
      cumulativeXp = xpForLevelCustom(attr.level, profile.levelCurve ?? [])
    }
    return cumulativeXp + attr.current_xp
  }

  const selectedAttr = attributes.find((a) => a.id === selectedAttrId)
  const selectedAttrTotalXp = selectedAttr ? getTotalAttrXp(selectedAttr) : 0

  // History filtered by active profile, sorted newest first
  const profileHistory = deletionHistory
    .filter((e) => e.profileId === activeProfileId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20)

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) + ' ' +
      d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="neu-card p-6">
        <SectionHeader
          icon={<Gamepad2 className="h-5 w-5" />}
          gradient="from-amber-500 to-orange-600"
          title="Геймплей"
          desc="Награды и баланс"
        />

        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-3 uppercase tracking-wider">
          XP по сложности задач
        </label>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(DIFFICULTY_LABELS).map(([key, { label, color }]) => (
            <div key={key} className="rounded-2xl p-4 neu-inset">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-block h-4 w-4 rounded-full shrink-0"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${color}90, ${color})`,
                    boxShadow: `0 0 8px ${color}60, inset 0 1px 2px rgba(255,255,255,0.4)`,
                  }}
                />
                <span className="text-xs font-medium" style={{ color }}>{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={xp[key as keyof typeof xp]}
                  onChange={(e) => handleXpChange(key, e.target.value)}
                  className="settings-input text-center text-lg font-bold w-full no-spin"
                  style={{ color }}
                />
                <span className="text-xs text-[var(--fg-muted)] whitespace-nowrap">XP</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-[var(--fg-muted)] mt-3 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          Эти значения определяют сколько XP начисляется за выполнение задачи каждой сложности
        </p>
      </div>

      {/* ─── Remove Currency / XP ──────────────────────────────────────────── */}
      <div className="neu-card p-6">
        <SectionHeader
          icon={<Minus className="h-5 w-5" />}
          gradient="from-red-500 to-rose-600"
          title="Удаление ресурсов"
          desc="Ручное снятие валюты и опыта"
        />

        {/* Remove Coins */}
        <div className="rounded-2xl p-4 neu-inset mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <Coins className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-[var(--fg)]">Монеты</span>
            <span className="text-xs text-[var(--fg-muted)] ml-auto">Баланс: {currentCoins}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={currentCoins}
              placeholder="Количество"
              value={coinRemoveAmt}
              onChange={(e) => setCoinRemoveAmt(e.target.value)}
              className="settings-input text-center text-sm font-medium flex-1 no-spin"
            />
            <button
              disabled={!coinRemoveAmt || Number(coinRemoveAmt) <= 0 || Number(coinRemoveAmt) > currentCoins}
              onClick={() => setConfirmAction({ type: 'coins', amount: Number(coinRemoveAmt) })}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Удалить
            </button>
          </div>
        </div>

        {/* Remove Gems */}
        <div className="rounded-2xl p-4 neu-inset mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center shadow-sm">
              <Gem className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-[var(--fg)]">Кристаллы</span>
            <span className="text-xs text-[var(--fg-muted)] ml-auto">Баланс: {currentGems}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={currentGems}
              placeholder="Количество"
              value={gemRemoveAmt}
              onChange={(e) => setGemRemoveAmt(e.target.value)}
              className="settings-input text-center text-sm font-medium flex-1 no-spin"
            />
            <button
              disabled={!gemRemoveAmt || Number(gemRemoveAmt) <= 0 || Number(gemRemoveAmt) > currentGems}
              onClick={() => setConfirmAction({ type: 'gems', amount: Number(gemRemoveAmt) })}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Удалить
            </button>
          </div>
        </div>

        {/* Remove XP */}
        <div className="rounded-2xl p-4 neu-inset">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-[var(--fg)]">Опыт (XP)</span>
          </div>
          {attributes.length > 0 ? (
            <>
              <select
                value={selectedAttrId}
                onChange={(e) => setSelectedAttrId(e.target.value)}
                className="settings-input text-sm w-full mb-2"
              >
                <option value="">Выберите атрибут...</option>
                {attributes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.icon} {a.name} — ур. {a.level} (всего {getTotalAttrXp(a)} XP)
                  </option>
                ))}
              </select>
              {selectedAttr && (
                <p className="text-[11px] text-[var(--fg-muted)] mb-2">
                  {selectedAttr.icon} {selectedAttr.name}: ур. {selectedAttr.level}, текущий XP в уровне: {selectedAttr.current_xp}, всего накоплено: {selectedAttrTotalXp} XP
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={selectedAttrTotalXp || undefined}
                  placeholder="Количество XP"
                  value={xpRemoveAmt}
                  onChange={(e) => setXpRemoveAmt(e.target.value)}
                  className="settings-input text-center text-sm font-medium flex-1 no-spin"
                />
                <button
                  disabled={!selectedAttrId || !xpRemoveAmt || Number(xpRemoveAmt) <= 0 || Number(xpRemoveAmt) > selectedAttrTotalXp}
                  onClick={() => setConfirmAction({ type: 'xp', amount: Number(xpRemoveAmt), attrId: selectedAttrId })}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Удалить
                </button>
              </div>
              <p className="text-[11px] text-[var(--fg-muted)] mt-2">
                XP снимается с атрибута и с основной полоски опыта. Уровень может понизиться.
              </p>
            </>
          ) : (
            <p className="text-xs text-[var(--fg-muted)]">Нет атрибутов для удаления XP</p>
          )}
        </div>
      </div>

      {/* ─── Deletion History ──────────────────────────────────────────────── */}
      {profileHistory.length > 0 && (
        <div className="neu-card p-6">
          <SectionHeader
            icon={<History className="h-5 w-5" />}
            gradient="from-slate-500 to-gray-600"
            title="История удалений"
            desc="Последние операции"
          />

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {profileHistory.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-xl p-3 neu-inset text-xs">
                <div className={cn(
                  'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm',
                  entry.type === 'coins' && 'bg-gradient-to-br from-amber-400 to-orange-500',
                  entry.type === 'gems' && 'bg-gradient-to-br from-sky-400 to-cyan-500',
                  entry.type === 'xp' && 'bg-gradient-to-br from-violet-500 to-purple-600',
                )}>
                  {entry.type === 'coins' && <Coins className="h-3.5 w-3.5 text-white" />}
                  {entry.type === 'gems' && <Gem className="h-3.5 w-3.5 text-white" />}
                  {entry.type === 'xp' && <Zap className="h-3.5 w-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-[var(--fg)]">
                    −{entry.amount}{' '}
                    {entry.type === 'coins' ? 'монет' : entry.type === 'gems' ? 'кристаллов' : 'XP'}
                  </span>
                  {entry.attributeName && (
                    <span className="text-[var(--fg-muted)]"> ({entry.attributeName})</span>
                  )}
                </div>
                <span className="text-[var(--fg-muted)] whitespace-nowrap">{formatDate(entry.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <ConfirmModal
        isOpen={!!confirmAction}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmRemoval}
        title="Подтвердите удаление"
        message={
          confirmAction ? (
            <span>
              Вы уверены, что хотите удалить{' '}
              <strong>
                {confirmAction.amount}{' '}
                {confirmAction.type === 'coins' ? 'монет' : confirmAction.type === 'gems' ? 'кристаллов' : 'XP'}
              </strong>
              {confirmAction.type === 'xp' && confirmAction.attrId && (
                <> из атрибута <strong>{attributes.find((a) => a.id === confirmAction.attrId)?.name}</strong></>
              )}
              ? Это действие необратимо.
            </span>
          ) : ''
        }
        confirmText="Удалить"
        variant="danger"
      />
    </div>
  )
}

// ─── Notifications Section ──────────────────────────────────────────────────

function NotificationsSection() {
  const settings = useRpgStore((s) => s.settings)
  const updateSettings = useRpgStore((s) => s.updateSettings)

  const masterEnabled = settings.notificationsEnabled ?? true

  const notificationItems = [
    { key: 'notifyDailyReminder', label: 'Ежедневное напоминание', desc: 'Напоминание о задачах', icon: <Clock className="h-4 w-4" /> },
    { key: 'notifyDeadlines', label: 'Дедлайны задач', desc: 'За 2 часа до пропуска цикла', icon: <AlertTriangle className="h-4 w-4" /> },
    { key: 'notifyAchievements', label: 'Достижения', desc: 'При разблокировке достижений', icon: <Sparkles className="h-4 w-4" /> },
    { key: 'notifyLevelUp', label: 'Повышение уровня', desc: 'При получении нового уровня', icon: <Zap className="h-4 w-4" /> },
  ]

  return (
    <div className="neu-card p-6">
      <SectionHeader
        icon={<Bell className="h-5 w-5" />}
        gradient="from-cyan-500 to-blue-600"
        title="Уведомления"
        desc="Оповещения и напоминания"
      />

      {/* Master toggle */}
      <div className="mb-4 rounded-2xl p-4 neu-convex flex items-center justify-between"
        style={{
          boxShadow: masterEnabled ? '0 0 16px var(--accent-glow), 6px 6px 16px var(--neu-shadow-dark), -4px -4px 12px var(--neu-shadow-light)' : undefined
        }}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300',
            masterEnabled
              ? 'bg-[var(--accent)] shadow-[0_0_12px_var(--accent-glow)]'
              : 'bg-[var(--surface-elevated)]'
          )}>
            <Bell className={cn('h-4 w-4', masterEnabled ? 'text-white' : 'text-[var(--fg-muted)]')} />
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--fg)]">Все уведомления</p>
            <p className="text-xs text-[var(--fg-muted)]">{masterEnabled ? 'Включены' : 'Выключены'}</p>
          </div>
        </div>
        <NeuToggle
          checked={masterEnabled}
          onChange={(v) => updateSettings({ notificationsEnabled: v })}
        />
      </div>

      {/* Individual toggles */}
      <div className={cn('flex flex-col gap-3 transition-opacity duration-300', !masterEnabled && 'opacity-40 pointer-events-none')}>
        {notificationItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-2xl p-4 neu-convex">
            <div className="flex items-center gap-3">
              <span className="text-[var(--fg-muted)]">{item.icon}</span>
              <div>
                <p className="font-medium text-sm text-[var(--fg)]">{item.label}</p>
                <p className="text-xs text-[var(--fg-muted)]">{item.desc}</p>
              </div>
            </div>
            <NeuToggle
              checked={settings[item.key as keyof typeof settings] as boolean}
              onChange={(v) => updateSettings({ [item.key]: v })}
              disabled={!masterEnabled}
            />
          </div>
        ))}

        {/* Time picker */}
        {settings.notifyDailyReminder && (
          <div className="flex items-center justify-between rounded-2xl p-4 neu-inset">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-[var(--fg-muted)]" />
              <div>
                <p className="font-medium text-sm text-[var(--fg)]">Время напоминания</p>
                <p className="text-xs text-[var(--fg-muted)]">Ежедневное уведомление</p>
              </div>
            </div>
            <input
              type="time"
              value={settings.dailyReminderTime || '09:00'}
              onChange={(e) => updateSettings({ dailyReminderTime: e.target.value })}
              className="settings-input w-auto text-center"
            />
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <div className="mt-6">
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-3 uppercase tracking-wider">
          Всплывающие уведомления
        </label>
        <div className="flex flex-col gap-3">
          {[
            { key: 'toastTaskComplete', label: 'Выполнение задач', desc: 'Награда за выполненные задачи' },
            { key: 'toastTaskCreate', label: 'Создание задач', desc: 'Подтверждение создания задачи' },
            { key: 'toastTaskActions', label: 'Действия с задачами', desc: 'Удаление, пропуск, архивация, группы' },
            { key: 'toastPurchases', label: 'Покупки', desc: 'Покупка предметов в магазине' },
            { key: 'toastAchievements', label: 'Достижения', desc: 'Получение и выполнение достижений' },
            { key: 'toastCraft', label: 'Крафт', desc: 'Создание предметов и лут' },
            { key: 'toastErrors', label: 'Ошибки', desc: 'Сообщения об ошибках' },
            { key: 'toastFloatingRewards', label: 'Анимация наград', desc: 'Летающие монеты и самоцветы' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-2xl p-4 neu-convex">
              <div>
                <p className="font-medium text-sm text-[var(--fg)]">{item.label}</p>
                <p className="text-xs text-[var(--fg-muted)]">{item.desc}</p>
              </div>
              <NeuToggle
                checked={settings[item.key as keyof typeof settings] as boolean ?? true}
                onChange={(v) => updateSettings({ [item.key]: v })}
              />
            </div>
          ))}
        </div>
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
  const [showAdvanced, setShowAdvanced] = useState(false)
  const SEED_BACKUP_FILE = 'seed-backup.json'
  const [preSeedBackup, setPreSeedBackup] = useState<string | null>(null)

  useEffect(() => {
    vaultStorage.read<string>(SEED_BACKUP_FILE).then((data) => {
      if (data) setPreSeedBackup(typeof data === 'string' ? data : JSON.stringify(data))
    })
  }, [])

  const savePreSeedBackup = async (json: string) => {
    await vaultStorage.write(SEED_BACKUP_FILE, JSON.parse(json))
    setPreSeedBackup(json)
  }

  const clearPreSeedBackup = async () => {
    await vaultStorage.write(SEED_BACKUP_FILE, null)
    setPreSeedBackup(null)
  }

  const handleChoosePath = async () => {
    const newPath = await vaultStorage.choosePath()
    if (newPath) {
      window.location.reload()
    }
  }

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

  return (
    <div className="neu-card p-6">
      <SectionHeader
        icon={<Database className="h-5 w-5" />}
        gradient="from-slate-500 to-slate-700"
        title="Данные"
        desc="Хранение и резервные копии"
      />

      {/* Vault path */}
      {vaultStorage.isElectron() && (
        <button
          type="button"
          onClick={handleChoosePath}
          className="w-full flex items-center gap-3 rounded-2xl p-4 mb-4 neu-convex transition-all hover:shadow-lg group"
        >
          <FolderOpen className="h-5 w-5 text-[var(--fg-muted)] group-hover:text-[var(--accent)] transition-colors" />
          <div className="text-left flex-1">
            <p className="font-medium text-sm text-[var(--fg)]">Папка данных</p>
            <p className="text-xs text-[var(--fg-muted)]">Сменить расположение файлов</p>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
        </button>
      )}

      {/* Backup info */}
      <div className="rounded-2xl p-4 mb-4 neu-inset">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-[var(--fg-muted)] shrink-0 mt-0.5" />
          <div className="text-xs text-[var(--fg-muted)]">
            <p className="font-medium text-[var(--fg)] mb-1">Резервные копии</p>
            <p>
              <span className="text-[var(--accent)] font-medium">Экспорт</span> сохраняет все ваши данные (задачи, привычки, магазин, достижения, профиль и настройки) в один <span className="text-[var(--fg)] font-medium">JSON-файл</span> на компьютер. <span className="text-[var(--accent)] font-medium">Импорт</span> восстанавливает данные из ранее сохранённого файла, <span className="text-[var(--fg)] font-medium">полностью заменяя</span> текущие. Рекомендуем делать экспорт <span className="text-[var(--fg)] font-medium">регулярно</span> на случай переустановки или переноса на другой компьютер.
            </p>
          </div>
        </div>
      </div>

      {/* Export/Import */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center justify-center gap-2 rounded-2xl p-3 font-medium text-sm transition-all neu-convex hover:shadow-lg text-[var(--accent)]"
        >
          <Download className="h-4 w-4" />
          Экспорт
        </button>
        <button
          type="button"
          onClick={handleImport}
          className="flex items-center justify-center gap-2 rounded-2xl p-3 font-medium text-sm transition-all neu-convex hover:shadow-lg text-[var(--accent)]"
        >
          <Upload className="h-4 w-4" />
          Импорт
        </button>
      </div>

      {/* Advanced */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-between rounded-2xl p-3 text-sm text-[var(--fg-muted)] neu-inset hover:text-[var(--fg)] transition-colors"
      >
        <span className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Продвинутые
        </span>
        <ChevronRight className={cn('h-4 w-4 transition-transform duration-300', showAdvanced && 'rotate-90')} />
      </button>

      {showAdvanced && (
        <div className="mt-3 flex flex-col gap-3">
          {/* Seed data */}
          <button
            type="button"
            onClick={async () => {
              if (confirm('Загрузить тестовые данные? Ваши данные будут сохранены и вы сможете вернуть их обратно.')) {
                await savePreSeedBackup(exportData())
                const json = generateSeedData()
                if (importData(json)) {
                  setTimeout(() => window.location.reload(), 700)
                } else {
                  alert('Ошибка загрузки тестовых данных')
                }
              }
            }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium transition-all neu-convex text-purple-500 hover:shadow-[0_0_16px_rgba(139,92,246,0.3)]"
          >
            <FlaskConical className="h-4 w-4" />
            Загрузить тестовые данные
          </button>

          {/* Restore from pre-seed backup */}
          {preSeedBackup && (
            <button
              type="button"
              onClick={() => {
                if (importData(preSeedBackup)) {
                  clearPreSeedBackup()
                  setTimeout(() => window.location.reload(), 700)
                } else {
                  alert('Ошибка восстановления данных')
                }
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium transition-all neu-convex text-emerald-500 hover:shadow-[0_0_16px_rgba(16,185,129,0.3)]"
            >
              <Upload className="h-4 w-4" />
              Вернуть свои данные
            </button>
          )}

          {/* Reset */}
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium transition-all text-red-500 hover:shadow-[0_0_16px_rgba(239,68,68,0.3)]"
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}
          >
            <AlertTriangle className="h-4 w-4" />
            Сбросить весь прогресс
          </button>
        </div>
      )}

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

// ─── Feedback Section ───────────────────────────────────────────────────────

function FeedbackSection() {
  return (
    <div className="neu-card p-6">
      <SectionHeader
        icon={<MessageCircle className="h-5 w-5" />}
        gradient="from-violet-500 to-purple-700"
        title="Обратная связь"
        desc="Связаться с разработчиком"
      />

      <a
        href="https://t.me/btclovin"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 rounded-2xl p-4 neu-convex transition-all hover:shadow-lg hover:-translate-y-0.5 group cursor-pointer"
      >
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
          <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
            Telegram
          </p>
          <p className="text-xs text-[var(--fg-muted)]">@btclovin</p>
        </div>
        <ExternalLink className="h-4 w-4 text-[var(--fg-muted)] group-hover:text-[var(--accent)] transition-colors" />
      </a>
    </div>
  )
}

// ─── Main Settings Page ─────────────────────────────────────────────────────

const TAB_COMPONENTS: Record<SettingsTab, React.FC> = {
  profile: ProfileSection,
  attributes: AttributesSection,
  appearance: AppearanceSection,
  gameplay: GameplaySection,
  notifications: NotificationsSection,
  data: DataSection,
  feedback: FeedbackSection,
  guide: GuideSection,
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const ActiveComponent = TAB_COMPONENTS[activeTab]

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0 px-1">
        <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-lg">
          <Settings className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-[var(--fg)]">Настройки</h1>
          <p className="text-xs md:text-sm text-[var(--fg-muted)]">Управление приложением</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Sidebar tabs — desktop */}
        <nav className="hidden lg:flex flex-col gap-1.5 w-52 shrink-0 py-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300 text-left',
                activeTab === tab.id
                  ? 'neu-convex text-[var(--accent)] shadow-[0_0_12px_var(--accent-glow)]'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)]'
              )}
            >
              <span className={cn(
                'transition-colors duration-300',
                activeTab === tab.id ? 'text-[var(--accent)]' : ''
              )}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Horizontal tabs — mobile/tablet */}
        <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar shrink-0 pb-2 -mx-1 px-1 absolute top-[var(--settings-header-h,4.5rem)] left-0 right-0 z-10"
          style={{ display: 'none' }}
        />

        {/* Mobile tab bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 flex overflow-x-auto no-scrollbar gap-1 px-2 py-2 glass-titlebar border-t border-[var(--border)]"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 min-w-[3.5rem] px-2 py-1.5 rounded-xl text-[10px] font-medium transition-all shrink-0',
                activeTab === tab.id
                  ? 'text-[var(--accent)] bg-[var(--accent-subtle)]'
                  : 'text-[var(--fg-muted)]'
              )}
            >
              {tab.icon}
              <span className="truncate max-w-full">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-20 lg:pb-6 min-h-0 p-3">
          <ActiveComponent />
        </div>
      </div>
    </div>
  )
}
