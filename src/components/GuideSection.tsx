import React, { useState, useMemo } from 'react'
import {
  BookOpen, Search, ChevronRight,
  CheckSquare, ShoppingBag, Package, Trophy, Brain, Activity,
  Gamepad2, Swords, Coins, Gem, Star, Flame, Target,
  Zap, Shield, Clock, Repeat, BarChart3, Layers,
  Gift, Sparkles, Puzzle, Palette, Settings, Heart,
  Info, Lightbulb, AlertTriangle, TrendingUp, Flag,
  Dumbbell, Scale, Calculator, PiggyBank, Timer,
  Award,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { HabitIcon } from './HabitIcon'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GuideArticle {
  id: string
  title: string
  icon: LucideIcon
  iconColor: string
  content: GuideBlock[]
}

interface GuideCategory {
  id: string
  title: string
  icon: LucideIcon
  iconGradient: string
  articles: GuideArticle[]
}

type GuideBlock =
  | { type: 'text'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'tip'; text: string }
  | { type: 'warning'; text: string }
  | { type: 'info'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'list'; items: string[] }
  | { type: 'steps'; items: string[] }
  | { type: 'divider' }
  | { type: 'link'; text: string; articleId: string }
  | { type: 'demo'; demoId: string }

// ─── UI Demo Components ─────────────────────────────────────────────────────

function DemoCurrencies() {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Как выглядят валюты в интерфейсе</p>
      <div className="flex items-center gap-4 flex-wrap">
        {/* Coins pill */}
        <div className="glass-neu-coin flex items-center gap-2 rounded-xl px-3.5 py-2">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">1,250</span>
        </div>
        {/* Gems pill */}
        <div className="glass-neu-gem flex items-center gap-2 rounded-xl px-3.5 py-2">
          <Gem className="h-4 w-4 text-cyan-500" strokeWidth={2.5} />
          <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">42</span>
        </div>
        {/* Combined reward badge */}
        <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-cyan-500/15 ring-1 ring-inset ring-amber-400/15 shadow-sm shadow-amber-500/5">
          <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-600 dark:text-amber-400">50</span>
          <span className="w-px h-3 bg-[var(--border)] rounded-full self-center" />
          <Gem className="h-4 w-4 text-cyan-600 dark:text-cyan-400" strokeWidth={2.5} />
          <span className="text-cyan-600 dark:text-cyan-400">5</span>
        </span>
      </div>
      <p className="text-[10px] text-[var(--fg-muted)] mt-2.5">Слева: отображение в хедере. Справа: бейдж награды на задаче.</p>
    </div>
  )
}

function DemoDifficultyBadges() {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Бейджи сложности и XP</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold ring-1 ring-inset shadow-sm bg-gradient-to-b from-emerald-500/20 to-emerald-500/8 text-emerald-500 ring-emerald-400/25 shadow-emerald-500/10">
          <Zap className="h-3.5 w-3.5" />
          10 XP
        </span>
        <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold ring-1 ring-inset shadow-sm bg-gradient-to-b from-blue-500/20 to-blue-500/8 text-blue-500 ring-blue-400/25 shadow-blue-500/10">
          <Zap className="h-3.5 w-3.5" />
          30 XP
        </span>
        <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold ring-1 ring-inset shadow-sm bg-gradient-to-b from-orange-500/20 to-orange-500/8 text-orange-500 ring-orange-400/25 shadow-orange-500/10">
          <Zap className="h-3.5 w-3.5" />
          100 XP
        </span>
        <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold ring-1 ring-inset shadow-sm bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-red-400/25 shadow-red-500/10">
          <Zap className="h-3.5 w-3.5" />
          300 XP
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap mt-3">
        <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold bg-gradient-to-b from-purple-500/20 to-purple-500/8 text-purple-500 ring-1 ring-inset ring-purple-400/25 shadow-sm shadow-purple-500/10">
          <Zap className="h-3.5 w-3.5" />
          75 XP
        </span>
        <span className="text-[10px] text-[var(--fg-muted)]">Фиолетовый — кастомный XP</span>
      </div>
    </div>
  )
}

function DemoXpBar() {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Полоска опыта (XP)</p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-lg shadow-md">
            🧙
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-[var(--fg)]">Герой</span>
              <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                Ур. 12
              </span>
            </div>
            <div className="mt-1 w-48 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: '65%',
                  background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              />
            </div>
            <p className="text-[10px] text-[var(--fg-muted)] mt-0.5">650 / 1,000 XP</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function DemoItemTypes() {
  const types = [
    { label: 'Обычный', color: '#9ca3af', icon: 'Package' },
    { label: 'Лутбокс', color: '#8b5cf6', icon: 'Gift' },
    { label: 'Видеоигра', color: '#06b6d4', icon: 'Gamepad2' },
    { label: 'Сериал', color: '#ec4899', icon: 'Clapperboard' },
    { label: 'Множитель', color: '#f59e0b', icon: 'TrendingUp' },
    { label: 'Скидка', color: '#ef4444', icon: 'Tag' },
  ]
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Типы предметов — стиль «эмалевый значок»</p>
      <div className="flex items-center gap-3 flex-wrap">
        {types.map(t => (
          <div key={t.label} className="flex flex-col items-center gap-1.5">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white transition-all shrink-0"
              style={{
                background: `linear-gradient(145deg, ${t.color}ee, ${t.color}99)`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.2)`,
              }}
            >
              <HabitIcon iconName={t.icon} size={22} />
            </div>
            <span className="text-[10px] text-[var(--fg-muted)] font-medium">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoTaskCard() {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Пример карточки задачи</p>
      {/* Mini task card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-3 hover:border-[var(--border-accent)] transition-all max-w-md">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 text-white"
            style={{ background: 'linear-gradient(145deg, var(--accent), var(--accent))' }}
          >
            <Dumbbell className="h-5 w-5" />
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-[var(--fg)] block truncate">Тренировка в зале</span>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Recurrence badge */}
              <span className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-500 ring-1 ring-inset ring-blue-400/20">
                <Repeat className="h-2.5 w-2.5" />
                Ежедневно
              </span>
              {/* Streak badge */}
              <span className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-500 ring-1 ring-inset ring-amber-400/20">
                <Flame className="h-2.5 w-2.5" />
                12
              </span>
              {/* Priority */}
              <span className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-500 ring-1 ring-inset ring-red-400/20">
                <Flag className="h-2.5 w-2.5" />
              </span>
              {/* Fragment drop */}
              <span className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/10 text-purple-500 ring-1 ring-inset ring-purple-400/20">
                <Puzzle className="h-2.5 w-2.5" />
              </span>
            </div>
          </div>
          {/* Reward */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-semibold bg-gradient-to-b from-orange-500/20 to-orange-500/8 text-orange-500 ring-1 ring-inset ring-orange-400/25 shadow-sm shadow-orange-500/10">
              <Zap className="h-3 w-3" />
              100
            </span>
            <span className="inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-semibold bg-gradient-to-b from-amber-500/15 to-amber-500/5 ring-1 ring-inset ring-amber-400/20 shadow-sm shadow-amber-500/10">
              <Coins className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-600 dark:text-amber-400">30</span>
            </span>
          </div>
        </div>
      </div>
      {/* Labels */}
      <div className="mt-2.5 flex items-center gap-3 flex-wrap text-[10px] text-[var(--fg-muted)]">
        <span className="flex items-center gap-1"><Repeat className="h-3 w-3 text-blue-500" /> Повторяемость</span>
        <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-amber-500" /> Стрик</span>
        <span className="flex items-center gap-1"><Flag className="h-3 w-3 text-red-500" /> Приоритет</span>
        <span className="flex items-center gap-1"><Puzzle className="h-3 w-3 text-purple-500" /> Фрагмент</span>
      </div>
    </div>
  )
}

function DemoStreaks() {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Стрики и множители</p>
      <div className="flex items-center gap-4 flex-wrap">
        {/* Streak examples */}
        {[3, 7, 14, 30].map(n => (
          <div key={n} className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 bg-gradient-to-b from-amber-500/15 to-orange-500/8 ring-1 ring-inset ring-amber-400/20">
            <Flame className="h-4 w-4 text-amber-500" style={{ filter: n >= 14 ? 'drop-shadow(0 0 4px rgba(245,158,11,0.5))' : undefined }} />
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{n}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 bg-gradient-to-b from-amber-500/15 to-amber-500/8 ring-1 ring-inset ring-amber-400/20">
          <TrendingUp className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">x2.0</span>
        </div>
        <span className="text-[10px] text-[var(--fg-muted)]">Множитель стрика — увеличивает награды</span>
      </div>
    </div>
  )
}

function DemoPriorities() {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Бейджи приоритета</p>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold ring-1 ring-inset shadow-sm bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-red-400/25 shadow-red-500/10">
          <Flag className="h-3.5 w-3.5" />
          Высокий
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold ring-1 ring-inset shadow-sm bg-gradient-to-b from-yellow-500/20 to-yellow-500/8 text-yellow-500 ring-yellow-400/25 shadow-yellow-500/10">
          <Flag className="h-3.5 w-3.5" />
          Средний
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold ring-1 ring-inset shadow-sm bg-gradient-to-b from-emerald-500/20 to-emerald-500/8 text-emerald-500 ring-emerald-400/25 shadow-emerald-500/10">
          <Flag className="h-3.5 w-3.5" />
          Низкий
        </span>
      </div>
    </div>
  )
}

function DemoRecurrence() {
  const types = ['Ежедневно', 'Еженедельно', 'Ежемесячно', 'Мгновенно']
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Бейджи повторяемости</p>
      <div className="flex items-center gap-2 flex-wrap">
        {types.map(t => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-500 ring-1 ring-inset ring-blue-400/20"
          >
            <Repeat className="h-3 w-3" />
            {t}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium bg-indigo-500/10 text-indigo-500 ring-1 ring-inset ring-indigo-400/20">
          <Clock className="h-3 w-3" />
          Каждые 3 дня
        </span>
      </div>
    </div>
  )
}

function DemoAttributes() {
  const attrs = [
    { name: 'Сила', key: 'СИЛ', emoji: '💪', color: '#ef4444', level: 8, pct: 45 },
    { name: 'Интеллект', key: 'ИНТ', emoji: '🧠', color: '#6366f1', level: 12, pct: 70 },
    { name: 'Ловкость', key: 'ЛОВ', emoji: '🏃', color: '#22c55e', level: 5, pct: 30 },
    { name: 'Креативность', key: 'КРЕ', emoji: '🎨', color: '#ec4899', level: 10, pct: 85 },
  ]
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Атрибуты персонажа</p>
      <div className="grid grid-cols-2 gap-2">
        {attrs.map(a => (
          <div key={a.key} className="flex items-center gap-2.5 rounded-xl p-2 bg-[var(--surface-card)] border border-[var(--border)]">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg shrink-0"
              style={{ background: `${a.color}18` }}
            >
              {a.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--fg)]">{a.name}</span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white"
                  style={{ background: a.color }}
                >
                  {a.key} {a.level}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${a.pct}%`,
                    background: `linear-gradient(90deg, ${a.color}, ${a.color}aa)`,
                    boxShadow: `0 0 6px ${a.color}40`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoRanks() {
  const ranks = [
    { emoji: '🌱', name: 'Новичок', level: '1+', color: '#94a3b8' },
    { emoji: '🔨', name: 'Подмастерье', level: '5+', color: '#a855f7' },
    { emoji: '🧭', name: 'Следопыт', level: '10+', color: '#06b6d4' },
    { emoji: '⚔️', name: 'Воин', level: '15+', color: '#ef4444' },
    { emoji: '🛡️', name: 'Ветеран', level: '20+', color: '#22c55e' },
    { emoji: '🎯', name: 'Эксперт', level: '25+', color: '#3b82f6' },
    { emoji: '👑', name: 'Мастер', level: '30+', color: '#6366f1' },
    { emoji: '🏆', name: 'Грандмастер', level: '40+', color: '#8b5cf6' },
    { emoji: '⭐', name: 'Легенда', level: '50+', color: '#f59e0b' },
  ]
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Ранги персонажа</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {ranks.map(r => (
          <div
            key={r.name}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border transition-all"
            style={{ borderColor: `${r.color}30`, background: `${r.color}08` }}
          >
            <span className="text-base">{r.emoji}</span>
            <div>
              <span className="text-[10px] font-bold block" style={{ color: r.color }}>{r.name}</span>
              <span className="text-[9px] text-[var(--fg-muted)]">Ур. {r.level}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoAchievementCard() {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Пример карточки достижения</p>
      <div className="flex gap-3">
        {/* Locked */}
        <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-3 opacity-60">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-[var(--fg)] block">Марафонец</span>
              <span className="text-[10px] text-[var(--fg-muted)]">Выполни 100 задач</span>
            </div>
            <Shield className="h-4 w-4 text-[var(--fg-muted)]" />
          </div>
          <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div className="h-full rounded-full bg-amber-500" style={{ width: '37%' }} />
          </div>
          <p className="text-[10px] text-[var(--fg-muted)] mt-1">37 / 100</p>
        </div>
        {/* Unlocked */}
        <div className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md">
              <Star className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-[var(--fg)] block">Первые шаги</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Разблокировано!</span>
            </div>
            <CheckSquare className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="h-1.5 rounded-full bg-emerald-500/20 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: '100%' }} />
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">10 / 10</p>
        </div>
      </div>
      <p className="text-[10px] text-[var(--fg-muted)] mt-2">Слева: заблокированное. Справа: разблокированное.</p>
    </div>
  )
}

function DemoCraftFragments() {
  const rarities = [
    { label: 'Обычный', from: '#9ca3af', to: '#6b7280' },
    { label: 'Необычный', from: '#22c55e', to: '#10b981' },
    { label: 'Редкий', from: '#3b82f6', to: '#6366f1' },
    { label: 'Эпический', from: '#a855f7', to: '#7c3aed' },
    { label: 'Легендарный', from: '#f59e0b', to: '#ea580c' },
  ]
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Фрагменты крафта — стиль «призматический кристалл»</p>
      <div className="flex items-center gap-3 flex-wrap">
        {rarities.map(r => (
          <div key={r.label} className="flex flex-col items-center gap-1.5">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${r.from} 0%, ${r.to} 50%, ${r.from} 100%)`,
                boxShadow: `0 0 12px ${r.from}40, inset 0 1px 0 rgba(255,255,255,0.4)`,
              }}
            >
              {/* Glare effect */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                }}
              />
              <Puzzle className="h-5 w-5 relative z-10" />
            </div>
            <span className="text-[10px] font-medium" style={{ color: r.from }}>{r.label}</span>
          </div>
        ))}
      </div>
      {/* Progress bar demo */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[var(--fg-muted)]">Прогресс сборки</span>
            <span className="text-[10px] font-bold text-blue-500">7 / 10</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: '70%',
                background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                boxShadow: '0 0 8px rgba(59,130,246,0.4)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function DemoShopCard() {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Пример карточки магазина</p>
      <div className="flex gap-3">
        {/* Normal item */}
        <div className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-3 group">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-white shrink-0"
              style={{
                background: 'linear-gradient(145deg, #9ca3afee, #9ca3af99)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              <HabitIcon iconName="Pizza" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-[var(--fg)] block truncate">Пицца вечером</span>
              <span className="inline-flex items-center gap-1 mt-1 rounded-xl px-2 py-0.5 text-[10px] font-semibold bg-gradient-to-b from-amber-500/15 to-amber-500/5 ring-1 ring-inset ring-amber-400/20">
                <Coins className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span className="text-amber-600 dark:text-amber-400">100</span>
              </span>
            </div>
          </div>
        </div>
        {/* Lootbox */}
        <div className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-3 relative">
          <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <Gift className="h-3 w-3" />
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-white shrink-0"
              style={{
                background: 'linear-gradient(145deg, #8b5cf6ee, #8b5cf699)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              <HabitIcon iconName="Gift" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-[var(--fg)] block truncate">Тайный ларец</span>
              <span className="inline-flex items-center gap-1.5 mt-1 rounded-xl px-2 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-cyan-500/15 ring-1 ring-inset ring-amber-400/15">
                <Coins className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span className="text-amber-600 dark:text-amber-400">200</span>
                <span className="w-px h-2.5 bg-[var(--border)]" />
                <Gem className="h-3 w-3 text-cyan-600 dark:text-cyan-400" strokeWidth={2.5} />
                <span className="text-cyan-600 dark:text-cyan-400">10</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DemoMoodTracker() {
  const moods = [
    { emoji: '😫', label: 'Ужасно', color: '#ef4444' },
    { emoji: '😔', label: 'Плохо', color: '#f97316' },
    { emoji: '😐', label: 'Нормально', color: '#eab308' },
    { emoji: '😊', label: 'Хорошо', color: '#22c55e' },
    { emoji: '🤩', label: 'Отлично', color: '#06b6d4' },
  ]
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Трекер настроения</p>
      <div className="flex items-center justify-center gap-2">
        {moods.map((m, i) => (
          <button
            key={m.label}
            type="button"
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all border',
              i === 3
                ? 'border-emerald-500/40 bg-emerald-500/10 scale-110 shadow-md'
                : 'border-transparent hover:bg-[var(--surface-card)]'
            )}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-[9px] font-medium" style={{ color: m.color }}>{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function DemoTaskStatuses() {
  const statuses = [
    { label: 'Выполнено', color: '#22c55e', icon: CheckSquare, desc: 'Стрик +1' },
    { label: 'Пропущено', color: '#3b82f6', icon: Clock, desc: 'Стрик сохр.' },
    { label: 'Просрочено', color: '#ef4444', icon: AlertTriangle, desc: 'Стрик = 0!' },
  ]
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Статусы цикла задачи</p>
      <div className="flex items-center gap-3">
        {statuses.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="flex-1 flex items-center gap-2.5 rounded-xl p-2.5 border" style={{ borderColor: `${s.color}30`, background: `${s.color}08` }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${s.color}20` }}>
                <Icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <div>
                <span className="text-xs font-bold block" style={{ color: s.color }}>{s.label}</span>
                <span className="text-[10px] text-[var(--fg-muted)]">{s.desc}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DemoArchiveBadges() {
  const reasons = [
    { label: 'Завершена', color: '#22c55e' },
    { label: 'Истекла', color: '#f97316' },
    { label: 'Провалена', color: '#ef4444' },
    { label: 'Вручную', color: '#94a3b8' },
  ]
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Бейджи причин архивации</p>
      <div className="flex items-center gap-2 flex-wrap">
        {reasons.map(r => (
          <span key={r.label} className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold ring-1 ring-inset" style={{ color: r.color, background: `${r.color}15`, borderColor: `${r.color}25`, boxShadow: `0 1px 2px ${r.color}10` }}>
            {r.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function DemoAccentColors() {
  const colors = [
    { name: 'Синий', value: '#3b82f6' },
    { name: 'Фиолетовый', value: '#8b5cf6' },
    { name: 'Розовый', value: '#ec4899' },
    { name: 'Красный', value: '#ef4444' },
    { name: 'Оранжевый', value: '#f97316' },
    { name: 'Жёлтый', value: '#eab308' },
    { name: 'Зелёный', value: '#22c55e' },
    { name: 'Бирюзовый', value: '#06b6d4' },
  ]
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Цвета акцента</p>
      <div className="flex items-center gap-2 flex-wrap">
        {colors.map(c => (
          <div key={c.name} className="flex flex-col items-center gap-1">
            <div
              className="h-8 w-8 rounded-xl shadow-md transition-transform hover:scale-110 cursor-pointer"
              style={{ background: c.value, boxShadow: `0 2px 8px ${c.value}40` }}
            />
            <span className="text-[9px] text-[var(--fg-muted)]">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoInventoryCard() {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Предметы в инвентаре</p>
      <div className="flex items-center gap-3">
        {[
          { icon: 'Pizza', name: 'Пицца', color: '#9ca3af', qty: 3 },
          { icon: 'Gamepad2', name: 'Ведьмак 3', color: '#06b6d4', qty: 1 },
          { icon: 'Gift', name: 'Тайный ларец', color: '#8b5cf6', qty: 2 },
        ].map(item => (
          <div key={item.name} className="flex flex-col items-center gap-1.5 rounded-2xl p-3 bg-[var(--surface-card)] border border-[var(--border)] relative w-20">
            {item.qty > 1 && (
              <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--surface)] text-[var(--fg-muted)] border border-[var(--border)]">
                x{item.qty}
              </span>
            )}
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-white shrink-0"
              style={{
                background: `linear-gradient(145deg, ${item.color}ee, ${item.color}99)`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              <HabitIcon iconName={item.icon} size={20} />
            </div>
            <span className="text-[10px] font-medium text-[var(--fg)] text-center line-clamp-2">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Economy Demo Components ────────────────────────────────────────────────

function DemoEconomyAnchor() {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Принцип: 1 монета = 1 минута усилий</p>
      <div className="flex items-center gap-4 flex-wrap">
        {/* Time → Coins visual */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 bg-blue-500/10 border border-blue-500/20">
            <Timer className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">30 мин</span>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
          <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 bg-amber-500/10 border border-amber-500/20">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">30–36</span>
          </div>
        </div>
        {/* Difficulty multiplier */}
        <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 bg-purple-500/10 border border-purple-500/20">
          <TrendingUp className="h-4 w-4 text-purple-500" />
          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">× множитель сложности</span>
        </div>
      </div>
      <p className="text-[10px] text-[var(--fg-muted)] mt-2.5">Монеты привязаны к реальному времени — чем сложнее задача, тем выше множитель.</p>
    </div>
  )
}

function DemoDifficultyPricing() {
  const tiers = [
    { label: 'Лёгкая', color: '#22c55e', time: '5–15 мин', coins: '5–15', mult: '×1.0', xp: '10' },
    { label: 'Средняя', color: '#3b82f6', time: '15–40 мин', coins: '18–48', mult: '×1.2', xp: '30' },
    { label: 'Сложная', color: '#f97316', time: '1–2 ч', coins: '90–180', mult: '×1.5', xp: '100' },
    { label: 'Очень сложная', color: '#ef4444', time: '3+ ч', coins: '270–540+', mult: '×1.8', xp: '300' },
  ]
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Рекомендуемые награды по сложности</p>
      <div className="space-y-2">
        {tiers.map(t => (
          <div key={t.label} className="flex items-center gap-2 rounded-xl p-2.5 bg-[var(--surface-card)] border border-[var(--border)]">
            {/* Difficulty badge */}
            <span
              className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-semibold ring-1 ring-inset shadow-sm shrink-0 w-28 justify-center"
              style={{
                background: `${t.color}18`,
                color: t.color,
                boxShadow: `inset 0 0 0 1px ${t.color}30`,
              }}
            >
              <Zap className="h-3 w-3" />
              {t.xp} XP
            </span>
            {/* Time */}
            <div className="flex items-center gap-1 text-[10px] text-[var(--fg-muted)] w-16 shrink-0">
              <Timer className="h-3 w-3" />
              {t.time}
            </div>
            {/* Multiplier */}
            <span className="text-[10px] font-bold w-8 shrink-0" style={{ color: t.color }}>{t.mult}</span>
            {/* Coins */}
            <div className="flex items-center gap-1 ml-auto">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{t.coins}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoDailyBalance() {
  const income = [
    { label: 'Зарядка', coins: 12, color: '#22c55e' },
    { label: 'Чтение 30 мин', coins: 36, color: '#3b82f6' },
    { label: 'Работа над проектом', coins: 90, color: '#f97316' },
    { label: 'Уборка', coins: 15, color: '#22c55e' },
  ]
  const totalIncome = income.reduce((s, i) => s + i.coins, 0)
  const spending = 120
  const savings = totalIncome - spending
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Пример дневного баланса</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Income */}
        <div className="rounded-xl p-3 bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Доход</span>
          </div>
          <div className="space-y-1.5">
            {income.map(i => (
              <div key={i.label} className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--fg-secondary)] truncate">{i.label}</span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                  <Coins className="h-2.5 w-2.5 text-amber-500" />{i.coins}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Итого</span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
              <Coins className="h-3 w-3 text-amber-500" />{totalIncome}
            </span>
          </div>
        </div>
        {/* Balance */}
        <div className="flex flex-col gap-2">
          <div className="rounded-xl p-3 bg-red-500/5 border border-red-500/20 flex-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-red-500" />
              <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Расход</span>
            </div>
            <div className="flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{spending}</span>
            </div>
            <span className="text-[10px] text-[var(--fg-muted)]">2ч игры + серия</span>
          </div>
          <div className="rounded-xl p-3 bg-blue-500/5 border border-blue-500/20 flex-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <PiggyBank className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Накопления</span>
            </div>
            <div className="flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{savings}</span>
            </div>
            <span className="text-[10px] text-[var(--fg-muted)]">на долгоср. цели</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DemoShopPricing() {
  const items = [
    { icon: 'Pizza', name: 'Перекус', time: '1 день', coins: 50, color: '#f97316' },
    { icon: 'Tv', name: 'Серия сериала', time: '1–2 дня', coins: 80, color: '#ec4899' },
    { icon: 'Gamepad2', name: 'Вечер игр (3ч)', time: '3–5 дней', coins: 300, color: '#06b6d4' },
    { icon: 'ShoppingBag', name: 'Новая игра', time: '1–2 нед', coins: 1200, color: '#8b5cf6' },
    { icon: 'Gift', name: 'Большая награда', time: '1+ мес', coins: 5000, color: '#f59e0b' },
  ]
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Примеры ценообразования в магазине</p>
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item.name} className="flex items-center gap-2.5 rounded-xl p-2 bg-[var(--surface-card)] border border-[var(--border)]">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0"
              style={{
                background: `linear-gradient(145deg, ${item.color}ee, ${item.color}99)`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              <HabitIcon iconName={item.icon} size={16} />
            </div>
            <span className="text-xs font-medium text-[var(--fg)] flex-1 min-w-0 truncate">{item.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              <Clock className="h-3 w-3 text-[var(--fg-muted)]" />
              <span className="text-[10px] text-[var(--fg-muted)]">{item.time}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{item.coins.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[var(--fg-muted)] mt-2">Время — ориентировочный срок накопления при среднем заработке ~100 монет/день.</p>
    </div>
  )
}

function DemoGemEconomy() {
  const sources = [
    { label: 'Очень сложная задача', gems: '1–3', icon: Zap, color: '#ef4444' },
    { label: 'Стрик 7 дней', gems: '1', icon: Flame, color: '#f59e0b' },
    { label: 'Стрик 30 дней', gems: '5', icon: Flame, color: '#f97316' },
    { label: 'Достижение (среднее)', gems: '2–5', icon: Trophy, color: '#eab308' },
    { label: 'Достижение (сложное)', gems: '5–15', icon: Trophy, color: '#a855f7' },
  ]
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Когда и сколько давать кристаллов</p>
      <div className="flex items-center gap-2 mb-3">
        <div className="glass-neu-gem flex items-center gap-1.5 rounded-xl px-3 py-1.5">
          <Gem className="h-4 w-4 text-cyan-500" strokeWidth={2.5} />
          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">1 кристалл</span>
        </div>
        <span className="text-[10px] text-[var(--fg-muted)]">≈</span>
        <div className="glass-neu-coin flex items-center gap-1.5 rounded-xl px-3 py-1.5">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">50–100 монет</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {sources.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="flex items-center gap-2.5">
              <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: s.color }} />
              <span className="text-[10px] text-[var(--fg-secondary)] flex-1">{s.label}</span>
              <div className="flex items-center gap-1 shrink-0">
                <Gem className="h-3 w-3 text-cyan-500" strokeWidth={2.5} />
                <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">{s.gems}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 rounded-lg px-3 py-2 bg-amber-500/8 border border-amber-500/15">
        <p className="text-[10px] text-amber-700 dark:text-amber-400">Лёгкие и средние задачи никогда не дают кристаллы — это сохраняет их ценность.</p>
      </div>
    </div>
  )
}

function DemoAchievementEconomy() {
  const tiers = [
    { label: 'Лёгкое', example: '5 задач', coins: '30–50', gems: '0', xp: '50', days: '~1 дн', color: '#22c55e' },
    { label: 'Среднее', example: '50 задач', coins: '100–300', gems: '2–5', xp: '200', days: '~1 нед', color: '#3b82f6' },
    { label: 'Сложное', example: '30-дн стрик', coins: '500–1000', gems: '5–15', xp: '500', days: '~1 мес', color: '#a855f7' },
    { label: 'Легендарное', example: '100-дн стрик', coins: '2000–5000', gems: '15–30', xp: '1500', days: '~3 мес', color: '#f59e0b' },
  ]
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Рекомендуемые награды за достижения</p>
      <div className="space-y-2">
        {tiers.map(t => (
          <div key={t.label} className="rounded-xl p-2.5 border" style={{ borderColor: `${t.color}25`, background: `${t.color}06` }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Trophy className="h-3.5 w-3.5" style={{ color: t.color }} />
              <span className="text-xs font-bold" style={{ color: t.color }}>{t.label}</span>
              <span className="text-[10px] text-[var(--fg-muted)]">({t.example})</span>
              <span className="text-[9px] text-[var(--fg-muted)] ml-auto">{t.days}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold">
                <Zap className="h-3 w-3 text-indigo-500" />
                <span className="text-indigo-500">{t.xp} XP</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold">
                <Coins className="h-3 w-3 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">{t.coins}</span>
              </span>
              {t.gems !== '0' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold">
                  <Gem className="h-3 w-3 text-cyan-500" strokeWidth={2.5} />
                  <span className="text-cyan-600 dark:text-cyan-400">{t.gems}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoFormula() {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Формулы ценообразования</p>
      <div className="space-y-3">
        {/* Task formula */}
        <div className="rounded-xl px-3 py-2.5 bg-[var(--surface-card)] border border-[var(--border)]">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckSquare className="h-3 w-3 text-indigo-500" />
            <span className="text-[10px] font-bold text-[var(--fg)]">Задача</span>
          </div>
          <p className="text-xs font-mono text-[var(--accent)] leading-relaxed">
            монеты = минуты × множитель_сложности
          </p>
          <p className="text-[10px] text-[var(--fg-muted)] mt-1">Множители: Лёгкая ×1.0, Средняя ×1.2, Сложная ×1.5, Оч.сложная ×1.8</p>
        </div>
        {/* Shop formula */}
        <div className="rounded-xl px-3 py-2.5 bg-[var(--surface-card)] border border-[var(--border)]">
          <div className="flex items-center gap-1.5 mb-1">
            <ShoppingBag className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] font-bold text-[var(--fg)]">Предмет (время)</span>
          </div>
          <p className="text-xs font-mono text-[var(--accent)] leading-relaxed">
            цена = минуты_удовольствия × 0.5–1.0
          </p>
          <p className="text-[10px] text-[var(--fg-muted)] mt-1">40-мин серия → 20–40 монет, 2ч игры → 60–120 монет</p>
        </div>
        {/* Achievement formula */}
        <div className="rounded-xl px-3 py-2.5 bg-[var(--surface-card)] border border-[var(--border)]">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="h-3 w-3 text-yellow-500" />
            <span className="text-[10px] font-bold text-[var(--fg)]">Достижение</span>
          </div>
          <p className="text-xs font-mono text-[var(--accent)] leading-relaxed">
            монеты = дней_до_цели × дневной_доход × 0.15
          </p>
          <p className="text-[10px] text-[var(--fg-muted)] mt-1">30-дн стрик, доход 100/день → 30 × 100 × 0.15 = 450 монет</p>
        </div>
        {/* Lootbox formula */}
        <div className="rounded-xl px-3 py-2.5 bg-[var(--surface-card)] border border-[var(--border)]">
          <div className="flex items-center gap-1.5 mb-1">
            <Gift className="h-3 w-3 text-purple-500" />
            <span className="text-[10px] font-bold text-[var(--fg)]">Лутбокс</span>
          </div>
          <p className="text-xs font-mono text-[var(--accent)] leading-relaxed">
            цена = средняя_ценность_дропа × 1.3
          </p>
          <p className="text-[10px] text-[var(--fg-muted)] mt-1">Средний выигрыш ~60–80% от цены — элемент риска</p>
        </div>
      </div>
    </div>
  )
}

function DemoBalanceTarget() {
  const barMax = 150
  const income = 130
  const expense = 105
  const saving = income - expense
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3">Целевой дневной баланс</p>
      {/* Income bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Доход
          </span>
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{income} монет</span>
        </div>
        <div className="h-3 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${(income / barMax) * 100}%`,
              background: 'linear-gradient(90deg, #22c55e, #10b981)',
              boxShadow: '0 0 8px rgba(34,197,94,0.3)',
            }}
          />
        </div>
      </div>
      {/* Expense bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-red-500 flex items-center gap-1">
            <ShoppingBag className="h-3 w-3" /> Расход
          </span>
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{expense} монет</span>
        </div>
        <div className="h-3 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${(expense / barMax) * 100}%`,
              background: 'linear-gradient(90deg, #ef4444, #f97316)',
              boxShadow: '0 0 8px rgba(239,68,68,0.3)',
            }}
          />
        </div>
      </div>
      {/* Savings bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-blue-500 flex items-center gap-1">
            <PiggyBank className="h-3 w-3" /> Накопления
          </span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">+{saving} монет</span>
        </div>
        <div className="h-3 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${(saving / barMax) * 100}%`,
              background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
              boxShadow: '0 0 8px rgba(59,130,246,0.3)',
            }}
          />
        </div>
      </div>
      {/* Target metrics */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg p-2 bg-emerald-500/8 border border-emerald-500/15 text-center">
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">80–150</p>
          <p className="text-[9px] text-[var(--fg-muted)]">доход/день</p>
        </div>
        <div className="rounded-lg p-2 bg-red-500/8 border border-red-500/15 text-center">
          <p className="text-sm font-bold text-red-500">50–120</p>
          <p className="text-[9px] text-[var(--fg-muted)]">расход/день</p>
        </div>
        <div className="rounded-lg p-2 bg-blue-500/8 border border-blue-500/15 text-center">
          <p className="text-sm font-bold text-blue-500">10–30</p>
          <p className="text-[9px] text-[var(--fg-muted)]">копить/день</p>
        </div>
      </div>
    </div>
  )
}

// Map demo IDs to components
const DEMO_COMPONENTS: Record<string, () => React.ReactNode> = {
  'currencies': DemoCurrencies,
  'difficulty-badges': DemoDifficultyBadges,
  'xp-bar': DemoXpBar,
  'item-types': DemoItemTypes,
  'task-card': DemoTaskCard,
  'streaks': DemoStreaks,
  'priorities': DemoPriorities,
  'recurrence': DemoRecurrence,
  'attributes': DemoAttributes,
  'ranks': DemoRanks,
  'achievement-card': DemoAchievementCard,
  'craft-fragments': DemoCraftFragments,
  'shop-card': DemoShopCard,
  'mood-tracker': DemoMoodTracker,
  'task-statuses': DemoTaskStatuses,
  'archive-badges': DemoArchiveBadges,
  'accent-colors': DemoAccentColors,
  'inventory-card': DemoInventoryCard,
  'economy-anchor': DemoEconomyAnchor,
  'difficulty-pricing': DemoDifficultyPricing,
  'daily-balance': DemoDailyBalance,
  'shop-pricing': DemoShopPricing,
  'gem-economy': DemoGemEconomy,
  'achievement-economy': DemoAchievementEconomy,
  'formula': DemoFormula,
  'balance-target': DemoBalanceTarget,
}

// ─── Encyclopedia Data ───────────────────────────────────────────────────────

const GUIDE_DATA: GuideCategory[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // 1. ОСНОВЫ
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'basics',
    title: 'Основы',
    icon: BookOpen,
    iconGradient: 'from-indigo-500 to-purple-600',
    articles: [
      {
        id: 'what-is-rpglife',
        title: 'Что такое RPG Life?',
        icon: Gamepad2,
        iconColor: '#6366f1',
        content: [
          { type: 'text', text: 'RPG Life — геймифицированный планировщик задач в стиле RPG. Вы создаёте персонажа, выполняете реальные задачи и получаете за них опыт, монеты и кристаллы. Прокачивайте атрибуты, покупайте награды в магазине и разблокируйте достижения.' },
          { type: 'heading', text: 'Игровой цикл' },
          { type: 'steps', items: [
            'Создайте задачи — ваши реальные цели и привычки',
            'Выполняйте задачи — получайте XP, монеты и кристаллы',
            'Прокачивайте атрибуты — развивайте разные аспекты жизни',
            'Покупайте награды в магазине — мотивируйте себя',
            'Разблокируйте достижения — отслеживайте прогресс',
            'Крафтите уникальные предметы — собирайте фрагменты из задач',
          ] },
          { type: 'demo', demoId: 'task-card' },
          { type: 'tip', text: 'Начните с 3-5 простых ежедневных задач. Не перегружайте себя — постепенно добавляйте новые по мере привыкания.' },
        ],
      },
      {
        id: 'interface-overview',
        title: 'Обзор интерфейса',
        icon: Layers,
        iconColor: '#8b5cf6',
        content: [
          { type: 'text', text: 'Интерфейс RPG Life состоит из нескольких ключевых зон.' },
          { type: 'heading', text: 'Верхняя панель' },
          { type: 'text', text: 'Показывает аватар и имя персонажа, текущий уровень, полоску опыта (XP), а также баланс монет и кристаллов. Уровень отображается на бейдже аватара.' },
          { type: 'demo', demoId: 'xp-bar' },
          { type: 'heading', text: 'Боковое меню (Sidebar)' },
          { type: 'list', items: [
            'Задачи — основной раздел для управления делами',
            'Магазин — покупка наград и предметов',
            'Инвентарь — ваши купленные предметы',
            'Достижения — система ачивок',
            'Рефлексия — заметки и дневник',
            'Профиль — атрибуты и статистика персонажа',
            'Настройки — параметры приложения',
          ] },
          { type: 'tip', text: 'На узких экранах sidebar автоматически сворачивается в иконки. На десктопе его можно свернуть/развернуть кнопкой внизу.' },
        ],
      },
      {
        id: 'currencies',
        title: 'Валюты',
        icon: Coins,
        iconColor: '#f59e0b',
        content: [
          { type: 'text', text: 'В RPG Life две основные валюты, которые вы зарабатываете за выполнение задач.' },
          { type: 'demo', demoId: 'currencies' },
          { type: 'heading', text: 'На что тратить?' },
          { type: 'list', items: [
            'Покупка предметов в магазине',
            'Оплата крафта рецептов',
            'Покупка пакетов времени для видеоигр',
            'Покупка серий сериалов',
          ] },
          { type: 'info', text: 'Баланс валют всегда отображается в верхней панели. Монеты — золотая иконка, кристаллы — голубая.' },
          { type: 'tip', text: 'Кристаллы — более ценная валюта. Назначайте их как награду за действительно сложные и важные задачи.' },
        ],
      },
      {
        id: 'xp-levels',
        title: 'Опыт и уровни',
        icon: Star,
        iconColor: '#eab308',
        content: [
          { type: 'text', text: 'Каждая выполненная задача приносит очки опыта (XP). XP идёт как в общий уровень профиля, так и в выбранные атрибуты.' },
          { type: 'heading', text: 'Сколько XP за задачу?' },
          { type: 'demo', demoId: 'difficulty-badges' },
          { type: 'info', text: 'Значения XP за сложности можно изменить в Настройки → Геймплей → «Опыт за сложности».' },
          { type: 'heading', text: 'Режимы прогрессии' },
          { type: 'list', items: [
            'Стандартный — плавно растущая кривая. Каждый уровень требует больше XP',
            'Быстрый — ранние уровни даются легче, потом выравнивается',
            'Кастомный — задайте свои значения для любых диапазонов уровней',
          ] },
          { type: 'tip', text: 'Для задач можно задать кастомный XP, который перекрывает значение по умолчанию для данной сложности. Используйте это для особых задач.' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 2. ЭКОНОМИКА
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'economy',
    title: 'Экономика',
    icon: Scale,
    iconGradient: 'from-amber-500 to-yellow-600',
    articles: [
      {
        id: 'economy-overview',
        title: 'Основы экономики',
        icon: Scale,
        iconColor: '#f59e0b',
        content: [
          { type: 'text', text: 'Экономика RPG Life — это система баланса между заработком (задачи, достижения) и тратами (магазин, развлечения). Правильно настроенная экономика — ключ к долгосрочной мотивации.' },
          { type: 'heading', text: 'Якорь всей системы' },
          { type: 'text', text: 'Вся экономика привязана к одному простому принципу: 1 монета ≈ 1 минута реального усилия. Это «якорь», от которого рассчитываются все награды и цены.' },
          { type: 'demo', demoId: 'economy-anchor' },
          { type: 'heading', text: 'Три потока' },
          { type: 'list', items: [
            'Заработок — монеты и кристаллы за задачи, привычки, достижения',
            'Траты — покупки в магазине, игровое время, сериалы',
            'Накопления — разница между заработком и тратами, идёт на крупные цели',
          ] },
          { type: 'tip', text: 'Идеальный баланс: заработок чуть больше трат. Если монеты копятся слишком быстро — награды за задачи завышены. Если всегда не хватает — занижены или цены в магазине слишком высокие.' },
        ],
      },
      {
        id: 'task-pricing',
        title: 'Награды за задачи',
        icon: Calculator,
        iconColor: '#6366f1',
        content: [
          { type: 'text', text: 'Правильная награда за задачу зависит от двух факторов: сколько времени она занимает и насколько она сложна.' },
          { type: 'heading', text: 'Формула' },
          { type: 'text', text: 'Монеты за задачу = минуты реального усилия × множитель сложности. Множитель увеличивает награду за задачи, требующие больше концентрации и воли.' },
          { type: 'demo', demoId: 'difficulty-pricing' },
          { type: 'heading', text: 'Множители сложности' },
          { type: 'table', headers: ['Сложность', 'Множитель', 'Когда использовать'], rows: [
            ['Лёгкая', '×1.0', 'Бытовые дела, рутина — минимум когнитивной нагрузки'],
            ['Средняя', '×1.2', 'Задачи с концентрацией — чтение, учёба, планирование'],
            ['Сложная', '×1.5', 'Серьёзная работа — проект, тренировка, сложная учёба'],
            ['Очень сложная', '×1.8', 'Максимальные усилия — экзамен, дедлайн, марафон'],
          ] },
          { type: 'heading', text: 'Примеры' },
          { type: 'list', items: [
            'Зарядка 10 мин (лёгкая): 10 × 1.0 = 10 монет',
            'Чтение 30 мин (средняя): 30 × 1.2 = 36 монет',
            'Тренировка 60 мин (сложная): 60 × 1.5 = 90 монет',
            'Подготовка к экзамену 3ч (очень сложная): 180 × 1.8 = 324 монеты',
          ] },
          { type: 'warning', text: 'Не завышайте награды! Если за 5-минутное дело давать 50 монет, экономика быстро обесценится и мотивация пропадёт.' },
          { type: 'tip', text: 'Будьте честны с самой собой: реальное время усилия, а не время «от и до». 2 часа в библиотеке с перерывами = ~60–90 минут усилий.' },
        ],
      },
      {
        id: 'modifiers',
        title: 'Подзадачи-модификаторы',
        icon: Puzzle,
        iconColor: '#8b5cf6',
        content: [
          { type: 'text', text: 'Подзадачи вложенных (nested) задач можно использовать как модификаторы — опциональные условия, которые добавляют бонус к базовой награде задачи.' },
          { type: 'heading', text: 'Как это работает' },
          { type: 'text', text: 'Базовая задача имеет фиксированную стоимость в монетах. К ней добавляются подзадачи-модификаторы — дополнительные трудности или условия. Каждый модификатор имеет свою цену в монетах. Отмечайте только те, которые реально произошли.' },
          { type: 'heading', text: 'Категории модификаторов' },
          { type: 'table', headers: ['Категория', 'Примеры', 'Монеты'], rows: [
            ['Дорога', 'Пешком, на велосипеде, общественный транспорт', '5–15 за км'],
            ['Погода', 'Дождь, мороз, жара, ветер', '5–15'],
            ['Расписание', 'Раннее утро (до 7:00), поздний вечер', '5–10'],
            ['Доп. нагрузка', 'Тяжёлый рюкзак, доп. упражнения', '5–20'],
            ['Дискомфорт', 'Плохое самочувствие, усталость', '5–15'],
          ] },
          { type: 'heading', text: 'Пример' },
          { type: 'text', text: 'Задача «Бассейн» = 55 монет (база). Подзадачи: «Пешком туда 1.5 км» (+8), «Пешком обратно 1.5 км» (+8), «Плохая погода» (+10). Если все условия выполнены — итого 81 монета.' },
          { type: 'heading', text: 'Правила' },
          { type: 'list', items: [
            'Модификаторы дают только монеты — кристаллы зависят от базовой сложности задачи',
            'Сумма всех модификаторов не должна превышать ×2 от базовой стоимости',
            'Нельзя ставить взаимоисключающие модификаторы (дождь + жара, мороз + жара)',
            'Модификаторы опциональны — отмечайте только когда условие реально выполнено',
          ] },
          { type: 'tip', text: 'Модификаторы мотивируют выполнять задачи даже в неидеальных условиях. Плохая погода или далёкая дорога — теперь не помеха, а бонус!' },
        ],
      },
      {
        id: 'shop-pricing',
        title: 'Цены в магазине',
        icon: ShoppingBag,
        iconColor: '#f97316',
        content: [
          { type: 'text', text: 'Цена предмета в магазине определяется его реальной ценностью для вас и временем удовольствия, которое он даёт.' },
          { type: 'heading', text: 'Формула для «времени»' },
          { type: 'text', text: 'Цена = минуты удовольствия × коэффициент (0.5–1.0). Коэффициент — это «ставка», сколько монет стоит минута отдыха. Рекомендуем 0.5–0.7 для начала.' },
          { type: 'demo', demoId: 'shop-pricing' },
          { type: 'heading', text: 'Формула для «покупок»' },
          { type: 'text', text: 'Для реальных вещей (не время): Цена = реальная стоимость ÷ ваш «курс». Определите сколько стоит 1 монета в рублях для вас — например, 1 монета = 5₽. Тогда вещь за 3000₽ = 600 монет.' },
          { type: 'heading', text: 'Ориентиры по времени накопления' },
          { type: 'table', headers: ['Срок', 'Для чего', 'Примерная цена'], rows: [
            ['1 день', 'Мелкие радости', '50–150 монет'],
            ['3–5 дней', 'Средние награды', '200–500 монет'],
            ['1–2 недели', 'Крупные покупки', '500–1500 монет'],
            ['1 месяц', 'Большие награды', '1500–5000 монет'],
            ['2+ месяца', 'Грандиозные цели', '5000+ монет'],
          ] },
          { type: 'info', text: 'Ориентиры рассчитаны при среднем заработке ~80–120 монет в день (5–8 задач разной сложности).' },
          { type: 'heading', text: 'Видеоигры — цена за час' },
          { type: 'text', text: 'Формула: цена 1 часа = дневной заработок ÷ максимум часов игры. Пример: зарабатываете ~100 монет/день, играете макс 3 часа → 1 час = ~33 монеты.' },
          { type: 'heading', text: 'Сериалы — цена за серию' },
          { type: 'text', text: 'Формула: цена серии = длительность в минутах × 0.5. Серия 40 минут → ~20 монет. Идея: вы «отрабатываете» половину времени просмотра.' },
          { type: 'tip', text: 'Если предмет стоит 1 день накоплений — это ежедневная награда. Если 2 недели — это цель, к которой нужно стремиться. Именно долгосрочные цели лучше всего мотивируют!' },
        ],
      },
      {
        id: 'gem-economy',
        title: 'Экономика кристаллов',
        icon: Gem,
        iconColor: '#06b6d4',
        content: [
          { type: 'text', text: 'Кристаллы — премиальная валюта. Они должны быть редкими и ценными, иначе теряют смысл.' },
          { type: 'demo', demoId: 'gem-economy' },
          { type: 'heading', text: 'Правила' },
          { type: 'list', items: [
            'Лёгкие и средние задачи НИКОГДА не дают кристаллы',
            'Сложные задачи — опционально, 1 кристалл за очень сложные',
            'Достижения — основной источник кристаллов',
            'Стрики — бонус за длительные серии (7+ дней)',
          ] },
          { type: 'heading', text: 'Покупательная способность' },
          { type: 'text', text: '1 кристалл ≈ 50–100 монет. Используйте кристаллы в ценах предметов только для самых ценных наград. Это создаёт ощущение эксклюзивности и дополнительную мотивацию для сложных задач.' },
          { type: 'heading', text: 'Примеры цен с кристаллами' },
          { type: 'table', headers: ['Предмет', 'Монеты', 'Кристаллы'], rows: [
            ['Обычная награда', '50–300', '0'],
            ['Хорошая награда', '300–800', '3–5'],
            ['Отличная награда', '800–2000', '5–15'],
            ['Премиальная награда', '2000+', '15–50'],
          ] },
          { type: 'tip', text: 'Если кристаллы копятся быстро — вы даёте их слишком много. В месяц игрок должен зарабатывать ~15–30 кристаллов.' },
        ],
      },
      {
        id: 'achievement-economy',
        title: 'Награды за достижения',
        icon: Award,
        iconColor: '#eab308',
        content: [
          { type: 'text', text: 'Достижения — важная часть экономики. Они создают «бонусные инъекции» валюты за долгосрочный прогресс.' },
          { type: 'heading', text: 'Формулы' },
          { type: 'list', items: [
            'Монеты = дней до выполнения × дневной доход × 0.15',
            'Кристаллы = округление вверх (дней до выполнения ÷ 10)',
            'XP = дней до выполнения × 15',
          ] },
          { type: 'demo', demoId: 'achievement-economy' },
          { type: 'heading', text: 'Почему ×0.15?' },
          { type: 'text', text: 'Награда за достижение должна быть приятным бонусом (~15% от заработка за этот период), а не основным доходом. Если достижения дают слишком много — задачи становятся менее значимыми.' },
          { type: 'heading', text: 'Повторяемые достижения' },
          { type: 'text', text: 'Для повторяемых достижений (например, «выполнить 10 задач» — можно бесконечно) уменьшайте награду на 30–50% от базовой, чтобы не создать бесконечный источник валюты.' },
          { type: 'tip', text: 'Создайте несколько легендарных достижений с большими наградами (100-дневный стрик, 1000 задач) — они станут долгосрочными целями и мощным мотиватором.' },
        ],
      },
      {
        id: 'economy-balance',
        title: 'Баланс и золотое правило',
        icon: Scale,
        iconColor: '#10b981',
        content: [
          { type: 'text', text: 'Здоровая экономика — это когда игрок стабильно зарабатывает чуть больше, чем тратит. Это создаёт чувство прогресса и позволяет копить на большие цели.' },
          { type: 'heading', text: 'Золотое правило' },
          { type: 'info', text: 'Дневной заработок > Дневные траты × 1.1. Профицит ~10% идёт на накопления для долгосрочных целей.' },
          { type: 'demo', demoId: 'balance-target' },
          { type: 'heading', text: 'Все формулы' },
          { type: 'demo', demoId: 'formula' },
          { type: 'heading', text: 'Множители и скидки' },
          { type: 'text', text: 'Множители и скидки — «ускорители» экономики. Их цена должна окупаться, но с запасом:' },
          { type: 'list', items: [
            'Множитель стрика: цена = (значение - 1) × интервал × средняя награда × использований × 0.7',
            'Скидочный талон: цена = средняя покупка × (скидка% / 100) × 0.6',
            'Выгода для игрока ~30–40% — мотивирует покупать, но не ломает экономику',
          ] },
          { type: 'heading', text: 'Лутбоксы' },
          { type: 'text', text: 'Средняя ценность содержимого лутбокса = 60–80% от его цены. Игрок в среднем «проигрывает», но шанс на редкий дроп создаёт азарт.' },
          { type: 'heading', text: 'Крафт — фрагменты' },
          { type: 'text', text: 'Шанс дропа фрагмента = 100 ÷ (нужно фрагментов × задач/день × дней крафта). Пример: 10 фрагментов, 6 задач/день, цель 2 недели → ~12% шанс.' },
          { type: 'heading', text: 'Признаки дисбаланса' },
          { type: 'table', headers: ['Проблема', 'Причина', 'Решение'], rows: [
            ['Монеты копятся, нечего купить', 'Мало товаров или цены низкие', 'Добавьте дорогие награды или поднимите цены'],
            ['Вечно не хватает', 'Награды занижены или цены завышены', 'Пересмотрите множители или снизьте цены'],
            ['Кристаллы бесполезны', 'Нет товаров за кристаллы', 'Добавьте эксклюзивные предметы за кристаллы'],
            ['Нет мотивации', 'Нет долгосрочных целей', 'Создайте дорогие «мечты» — 1-3 месяца копить'],
            ['Легко получить всё', 'Экономика слишком щедрая', 'Уменьшите награды на 20–30%'],
          ] },
          { type: 'demo', demoId: 'daily-balance' },
          { type: 'warning', text: 'Не меняйте экономику резко! Если нужна корректировка, делайте её постепенно — по 10–15% за раз. Иначе потеряете ощущение прогресса.' },
          { type: 'tip', text: 'Время до первой «большой» покупки — 1–2 недели. Это оптимальный срок: достаточно быстро, чтобы не потерять мотивацию, и достаточно долго, чтобы чувствовалась ценность.' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 3. ЗАДАЧИ
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'tasks',
    title: 'Задачи',
    icon: CheckSquare,
    iconGradient: 'from-indigo-500 to-blue-600',
    articles: [
      {
        id: 'task-types',
        title: 'Типы задач',
        icon: CheckSquare,
        iconColor: '#6366f1',
        content: [
          { type: 'text', text: 'В RPG Life три типа задач, каждый подходит для разных целей.' },
          { type: 'heading', text: 'Чекбокс (Checkbox)' },
          { type: 'text', text: 'Простейший тип — задача выполнена или нет. Идеален для одноразовых дел и привычек.' },
          { type: 'text', text: 'Пример: «Прочитать 30 минут», «Сделать зарядку», «Написать отчёт».' },
          { type: 'heading', text: 'Счётчик (Counter)' },
          { type: 'text', text: 'Задача с числовым прогрессом — нужно набрать N единиц. Каждое нажатие прибавляет к счётчику. Награда выдаётся при достижении цели.' },
          { type: 'text', text: 'Пример: «Пробежать 10 км» (каждый день добавляете по 1-3 км), «Выпить 8 стаканов воды».' },
          { type: 'heading', text: 'Вложенные подзадачи (Nested)' },
          { type: 'text', text: 'Задача со списком подзадач. Каждая подзадача может иметь свою сложность и награды. Основная задача считается выполненной, когда все подзадачи завершены.' },
          { type: 'text', text: 'Пример: «Генеральная уборка» → Кухня, Ванная, Спальня, Гостиная.' },
          { type: 'demo', demoId: 'task-card' },
          { type: 'tip', text: 'Используйте вложенные задачи для сложных проектов — разбейте их на мелкие шаги и получайте награду за каждый.' },
        ],
      },
      {
        id: 'task-difficulty',
        title: 'Сложность и приоритет',
        icon: Target,
        iconColor: '#f97316',
        content: [
          { type: 'heading', text: 'Сложность' },
          { type: 'text', text: 'Определяет базовый XP за выполнение. Выбирайте честно — от этого зависит баланс прогрессии.' },
          { type: 'demo', demoId: 'difficulty-badges' },
          { type: 'heading', text: 'Приоритет' },
          { type: 'text', text: 'Помогает организовать задачи по важности. Не влияет на награды — только на сортировку.' },
          { type: 'demo', demoId: 'priorities' },
        ],
      },
      {
        id: 'task-recurrence',
        title: 'Повторяемость',
        icon: Repeat,
        iconColor: '#14b8a6',
        content: [
          { type: 'text', text: 'Задачи могут повторяться по расписанию. После выполнения цикла задача автоматически сбрасывается для следующего периода.' },
          { type: 'demo', demoId: 'recurrence' },
          { type: 'heading', text: 'Еженедельные опции' },
          { type: 'list', items: [
            'По дням — выбрать конкретные дни (Пн, Ср, Пт)',
            'N раз в неделю — выполнить 3 раза за неделю в любые дни',
          ] },
          { type: 'heading', text: 'Окончание повторений' },
          { type: 'list', items: [
            'Никогда — повторяется бесконечно',
            'По дате — до определённой даты',
            'По количеству — определённое число циклов',
          ] },
          { type: 'tip', text: 'Для формирования привычек используйте ежедневные задачи. Стрик (серия выполнений) — мощный мотиватор.' },
        ],
      },
      {
        id: 'task-streaks',
        title: 'Стрики (серии)',
        icon: Flame,
        iconColor: '#ef4444',
        content: [
          { type: 'text', text: 'Стрик — это серия последовательных выполнений повторяющейся задачи. Каждое выполнение увеличивает стрик на 1.' },
          { type: 'demo', demoId: 'streaks' },
          { type: 'heading', text: 'Как работает стрик?' },
          { type: 'steps', items: [
            'Выполните задачу → стрик +1',
            'Пропустите (кнопка «Пропустить») → стрик сохраняется',
            'Просрочите или мисс → стрик обнуляется!',
          ] },
          { type: 'warning', text: 'Если вы не выполнили и не пропустили повторяющуюся задачу до сброса — это «мисс», и стрик обнуляется.' },
          { type: 'heading', text: 'Множители за стрик' },
          { type: 'text', text: 'Специальные предметы из магазина, которые увеличивают награды при достижении определённой серии. Например: множитель x2 каждые 5 выполнений.' },
          { type: 'list', items: [
            'Режим «Стрик» — работает пока стрик активен, сбрасывается с ним',
            'Режим «Мгновенный» — ограничен N использованиями, не зависит от стрика',
          ] },
          { type: 'info', text: 'Лучший стрик (рекорд) всегда сохраняется и отображается в деталях задачи.' },
        ],
      },
      {
        id: 'task-rewards',
        title: 'Награды за задачи',
        icon: Gift,
        iconColor: '#eab308',
        content: [
          { type: 'text', text: 'При создании задачи вы задаёте её награды. Награды выдаются автоматически при выполнении.' },
          { type: 'heading', text: 'Что можно получить' },
          { type: 'demo', demoId: 'currencies' },
          { type: 'list', items: [
            'XP — опыт (по сложности или кастомный)',
            'Монеты — основная валюта',
            'Кристаллы — редкая валюта',
            'XP атрибутов — опыт идёт в выбранные атрибуты',
          ] },
          { type: 'heading', text: 'Распределение XP по атрибутам' },
          { type: 'text', text: 'При создании задачи выберите атрибуты, которым она соответствует. XP делится поровну между ними. Например: задача «Тренировка» с XP 100, привязана к Силе и Выносливости → каждый получит по 50 XP.' },
          { type: 'heading', text: 'Для вложенных задач' },
          { type: 'text', text: 'Каждая подзадача может иметь свои награды. Общая награда — сумма всех подзадач.' },
          { type: 'tip', text: 'Привязывайте задачи к атрибутам осмысленно: тренировка → Сила, чтение → Интеллект, рисование → Креативность.' },
        ],
      },
      {
        id: 'task-groups-filters',
        title: 'Группы и фильтры',
        icon: Layers,
        iconColor: '#3b82f6',
        content: [
          { type: 'heading', text: 'Группы задач' },
          { type: 'text', text: 'Организуйте задачи по группам: «Работа», «Здоровье», «Учёба», «Дом» и т.д. Группы можно переименовывать, удалять и менять порядок.' },
          { type: 'heading', text: 'Фильтры (вкладки)' },
          { type: 'table', headers: ['Вкладка', 'Что показывает'], rows: [
            ['Все', 'Все активные и выполненные задачи'],
            ['Активные', 'Только невыполненные задачи'],
            ['Выполнено', 'Завершённые задачи'],
            ['Архив', 'Архивированные и просроченные'],
          ] },
          { type: 'heading', text: 'Сортировка' },
          { type: 'list', items: [
            'По дате создания',
            'По приоритету (высокий → низкий)',
            'По награде (монеты + кристаллы)',
            'По сложности (от лёгкой к сложной)',
          ] },
          { type: 'info', text: 'Доступен поиск по названию задачи — удобно при большом количестве задач.' },
        ],
      },
      {
        id: 'task-lifecycle',
        title: 'Жизненный цикл задачи',
        icon: Clock,
        iconColor: '#64748b',
        content: [
          { type: 'text', text: 'Каждая задача проходит через определённые стадии.' },
          { type: 'demo', demoId: 'task-statuses' },
          { type: 'heading', text: 'Архивация' },
          { type: 'text', text: 'Задача попадает в архив по одной из причин:' },
          { type: 'demo', demoId: 'archive-badges' },
          { type: 'list', items: [
            'Завершена — все циклы выполнены (одноразовая или по количеству)',
            'Истекла — срок закончился, часть циклов выполнена',
            'Провалена — ни один цикл не был выполнен',
            'Вручную — вы сами отправили задачу в архив',
          ] },
          { type: 'tip', text: 'Архивированные задачи не удаляются — их можно просмотреть во вкладке «Архив».' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 3. ПЕРСОНАЖ
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'character',
    title: 'Персонаж',
    icon: Activity,
    iconGradient: 'from-blue-500 to-cyan-600',
    articles: [
      {
        id: 'attributes',
        title: 'Атрибуты',
        icon: Swords,
        iconColor: '#22c55e',
        content: [
          { type: 'text', text: 'Атрибуты — это ключевые характеристики вашего персонажа. Каждый атрибут развивается независимо от других.' },
          { type: 'demo', demoId: 'attributes' },
          { type: 'info', text: 'Атрибуты полностью кастомизируемы! Можно добавить свои, удалить ненужные, изменить иконки и цвета в Настройки → Атрибуты.' },
          { type: 'heading', text: 'Как качать атрибуты' },
          { type: 'text', text: 'Создавая задачу, привяжите её к атрибутам. При выполнении XP распределится между ними поровну. Например: 100 XP, два атрибута → каждый получит 50.' },
          { type: 'tip', text: 'Радар-чарт на странице «Профиль» наглядно показывает баланс ваших атрибутов. Стремитесь к гармоничному развитию!' },
        ],
      },
      {
        id: 'ranks',
        title: 'Ранги',
        icon: Shield,
        iconColor: '#8b5cf6',
        content: [
          { type: 'text', text: 'По мере повышения уровня вы получаете новые ранги — это показатель вашего общего прогресса.' },
          { type: 'demo', demoId: 'ranks' },
          { type: 'text', text: 'Ранг отображается на странице «Профиль» и является чисто визуальной наградой за ваш прогресс.' },
        ],
      },
      {
        id: 'profile-page',
        title: 'Страница Профиля',
        icon: Activity,
        iconColor: '#3b82f6',
        content: [
          { type: 'text', text: 'Страница «Профиль» (раздел в меню) показывает полную информацию о вашем персонаже.' },
          { type: 'demo', demoId: 'xp-bar' },
          { type: 'heading', text: 'Что здесь есть' },
          { type: 'list', items: [
            'Уровень и XP профиля — общий прогресс',
            'Текущий ранг с визуальным оформлением',
            'Радар-чарт атрибутов — баланс развития',
            'Список всех атрибутов с их уровнями',
            'Активные стрики — ваши текущие серии',
          ] },
          { type: 'tip', text: 'Радар-чарт — отличный инструмент для визуализации прогресса. Если один атрибут сильно отстаёт, подумайте о задачах для его прокачки.' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 4. МАГАЗИН
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'shop',
    title: 'Магазин',
    icon: ShoppingBag,
    iconGradient: 'from-amber-500 to-orange-600',
    articles: [
      {
        id: 'shop-overview',
        title: 'Как работает магазин',
        icon: ShoppingBag,
        iconColor: '#f59e0b',
        content: [
          { type: 'text', text: 'Магазин — ваша система наград. Вы сами создаёте предметы, которые хотите «купить» за заработанную валюту. Это главный мотиватор!' },
          { type: 'demo', demoId: 'shop-card' },
          { type: 'heading', text: 'Покупка' },
          { type: 'steps', items: [
            'Нажмите на предмет в магазине',
            'Нажмите «Купить» или добавьте в корзину',
            'Монеты/кристаллы спишутся, предмет появится в Инвентаре',
          ] },
          { type: 'heading', text: 'Корзина' },
          { type: 'text', text: 'Можно добавить несколько предметов в корзину и купить всё разом. Если активен скидочный талон, скидка применится ко всей корзине.' },
          { type: 'heading', text: 'Группы товаров' },
          { type: 'text', text: 'Организуйте товары по категориям (как группы задач). Можно сортировать и фильтровать по группам.' },
          { type: 'tip', text: 'Придумывайте награды, которые вас действительно мотивируют: «1 час игры», «Сериал вечером», «Заказать пиццу», «Новая книга».' },
        ],
      },
      {
        id: 'item-types',
        title: 'Типы предметов',
        icon: Package,
        iconColor: '#8b5cf6',
        content: [
          { type: 'text', text: 'Помимо обычных предметов, в магазине есть несколько специальных типов с уникальными механиками.' },
          { type: 'demo', demoId: 'item-types' },
          { type: 'heading', text: 'Обычный предмет' },
          { type: 'text', text: 'Базовый предмет без специальных механик. Просто награда за прогресс. Примеры: «Пицца», «Прогулка в парке», «Новая книга».' },
          { type: 'heading', text: 'Лутбокс' },
          { type: 'text', text: 'Коробка с случайным содержимым. При открытии выпадает один из предметов по заданной таблице весов. Может дать другой предмет, монеты или кристаллы.' },
          { type: 'heading', text: 'Видеоигра' },
          { type: 'text', text: 'Позволяет управлять временем на игры. Сначала покупаете «базу» (саму игру), потом докупаете пакеты часов. Отслеживает наигранное время.' },
          { type: 'heading', text: 'Сериал' },
          { type: 'text', text: 'Управляет просмотром сериалов по сериям. Покупаете сериал, затем покупаете отдельные серии за валюту. Отслеживает, какие серии просмотрены.' },
          { type: 'heading', text: 'Множитель стрика' },
          { type: 'text', text: 'Привязывается к задаче и увеличивает награды при определённой серии выполнений. Например: x2 каждые 5 выполнений подряд.' },
          { type: 'heading', text: 'Скидочный талон' },
          { type: 'text', text: 'Активирует скидку (1-85%) на следующую покупку. Автоматически применяется при следующем чекауте.' },
        ],
      },
      {
        id: 'lootbox-details',
        title: 'Лутбоксы: подробно',
        icon: Gift,
        iconColor: '#8b5cf6',
        content: [
          { type: 'text', text: 'Лутбокс — это специальный предмет, при открытии которого выпадает случайная награда из заданной таблицы.' },
          { type: 'heading', text: 'Создание лутбокса' },
          { type: 'steps', items: [
            'Создайте предмет в магазине',
            'Включите переключатель «Лутбокс»',
            'Добавьте элементы в таблицу дропа',
            'Задайте вес (вероятность) каждому элементу',
          ] },
          { type: 'heading', text: 'Таблица весов' },
          { type: 'text', text: 'Каждый элемент дропа имеет вес. Вероятность = вес элемента / суммарный вес. Например: предмет A (вес 70), предмет B (вес 20), предмет C (вес 10) — шанс A = 70%.' },
          { type: 'heading', text: 'Использование' },
          { type: 'text', text: 'Откройте лутбокс из Инвентаря. Выпавший предмет добавится в инвентарь (или начислится валюта). Результат записывается в историю.' },
          { type: 'tip', text: 'Добавьте редкие ценные предметы с низким весом — это создаёт азарт и дополнительную мотивацию!' },
        ],
      },
      {
        id: 'videogame-details',
        title: 'Видеоигры: подробно',
        icon: Gamepad2,
        iconColor: '#06b6d4',
        content: [
          { type: 'text', text: 'Тип «Видеоигра» помогает контролировать время на игры, превращая его в награду за продуктивность.' },
          { type: 'heading', text: 'Как это работает' },
          { type: 'steps', items: [
            'Создайте предмет-видеоигру с ценой «базы»',
            'Купите базу — разблокируются пакеты часов',
            'Покупайте пакеты (например: 2 часа за 50 монет)',
            'Нажмите «Поиграть» → выберите количество часов → время спишется',
          ] },
          { type: 'heading', text: 'Отслеживание' },
          { type: 'list', items: [
            'Остаток часов — сколько можно ещё играть',
            'Всего наиграно — общая статистика',
            'История — когда и сколько играли',
          ] },
          { type: 'tip', text: 'Это отличный способ ограничить время на игры. Вы «зарабатываете» игровое время реальными делами!' },
        ],
      },
      {
        id: 'serial-details',
        title: 'Сериалы: подробно',
        icon: Heart,
        iconColor: '#ec4899',
        content: [
          { type: 'text', text: 'Тип «Сериал» позволяет покупать просмотр серий за валюту — мотивация смотреть сериал только после выполнения задач.' },
          { type: 'heading', text: 'Структура' },
          { type: 'text', text: 'Сериал содержит сезоны, а в каждом сезоне — серии. Каждая серия имеет свою стоимость.' },
          { type: 'heading', text: 'Как пользоваться' },
          { type: 'steps', items: [
            'Создайте предмет-сериал',
            'Добавьте сезоны и серии',
            'Купите базу (сам сериал)',
            'Покупайте отдельные серии за монеты',
            'Нажмите «Посмотреть» — серия отмечается как просмотренная',
          ] },
          { type: 'tip', text: 'Ставьте цену серии как награду за дневной план задач. «Хочешь посмотреть серию? Выполни все дела!»' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 5. ИНВЕНТАРЬ
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'inventory',
    title: 'Инвентарь',
    icon: Package,
    iconGradient: 'from-violet-500 to-purple-600',
    articles: [
      {
        id: 'inventory-overview',
        title: 'Как работает инвентарь',
        icon: Package,
        iconColor: '#8b5cf6',
        content: [
          { type: 'text', text: 'Инвентарь — это ваш рюкзак приключенца. Все купленные и скрафченные предметы попадают сюда.' },
          { type: 'demo', demoId: 'inventory-card' },
          { type: 'heading', text: 'Действия с предметами' },
          { type: 'table', headers: ['Тип', 'Действие в инвентаре'], rows: [
            ['Обычный', 'Просмотр, удаление'],
            ['Лутбокс', 'Открыть → получить случайный дроп'],
            ['Видеоигра', 'Поиграть → списать часы'],
            ['Сериал', 'Посмотреть серию'],
            ['Множитель', 'Привязать к задаче'],
            ['Скидка', 'Активировать → скидка на след. покупку'],
          ] },
          { type: 'heading', text: 'Количество' },
          { type: 'text', text: 'Один предмет можно купить несколько раз (если не ограничен стоком в магазине). В инвентаре отображается количество.' },
          { type: 'heading', text: 'История' },
          { type: 'text', text: 'Вся история покупок и использования записывается. Можно посмотреть, когда и что было куплено/использовано.' },
          { type: 'info', text: 'Предметы в инвентаре можно искать по названию и группировать по категориям.' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 6. ДОСТИЖЕНИЯ
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'achievements',
    title: 'Достижения',
    icon: Trophy,
    iconGradient: 'from-yellow-500 to-amber-600',
    articles: [
      {
        id: 'achievements-overview',
        title: 'Система достижений',
        icon: Trophy,
        iconColor: '#eab308',
        content: [
          { type: 'text', text: 'Достижения — это награды за определённые милестоуны. Они проверяются автоматически и дают дополнительные бонусы.' },
          { type: 'demo', demoId: 'achievement-card' },
          { type: 'heading', text: 'Создание достижения' },
          { type: 'steps', items: [
            'Перейдите на страницу «Достижения»',
            'Нажмите «Создать»',
            'Задайте название, иконку и описание',
            'Выберите условие разблокировки',
            'Укажите награды (XP, монеты, кристаллы, предметы)',
          ] },
          { type: 'heading', text: 'Автоматическая проверка' },
          { type: 'text', text: 'Условия проверяются при каждом выполнении задачи, покупке, использовании предмета и повышении уровня атрибута.' },
          { type: 'info', text: 'Когда достижение готово к разблокировке, рядом появится жёлтый бейдж. Нажмите, чтобы забрать награду!' },
        ],
      },
      {
        id: 'achievement-conditions',
        title: 'Условия достижений',
        icon: Target,
        iconColor: '#f97316',
        content: [
          { type: 'text', text: 'Каждое достижение имеет условие, которое определяет, когда оно разблокируется.' },
          { type: 'table', headers: ['Условие', 'Описание', 'Пример'], rows: [
            ['Задач выполнено', 'Общее кол-во выполненных задач', '100 задач всего'],
            ['Задача за день', 'Конкретная задача X раз за сегодня', '5 тренировок за день'],
            ['Задача всего', 'Конкретная задача X раз за всё время', '30 дней чтения'],
            ['Стрик задачи', 'Достичь серии N для задачи', '7 дней подряд'],
            ['Предмет использован', 'Предмет использован N раз', '10 лутбоксов открыто'],
            ['Уровень атрибута', 'Атрибут достиг уровня', 'Сила 10 уровня'],
            ['Монет заработано', 'Заработано/потрачено монет', '1000 монет потрачено'],
            ['Кристаллов заработано', 'Заработано/потрачено кристаллов', '50 кристаллов'],
            ['Условие дневника', 'Ежедневное условие выполнено', '30 дней медитации'],
            ['Вручную', 'Разблокировать кнопкой', 'Любое'],
          ] },
          { type: 'heading', text: 'Повторяемые достижения' },
          { type: 'text', text: 'Если включён флаг «Повторяемое», достижение можно разблокировать несколько раз, получая награду каждый раз.' },
        ],
      },
      {
        id: 'achievement-rewards',
        title: 'Награды за достижения',
        icon: Sparkles,
        iconColor: '#a855f7',
        content: [
          { type: 'text', text: 'За разблокировку достижения можно получить:' },
          { type: 'list', items: [
            'XP — опыт в профиль и/или выбранный атрибут',
            'Монеты — указанное количество',
            'Кристаллы — указанное количество',
            'Предметы — конкретные предметы из магазина с указанным количеством',
          ] },
          { type: 'demo', demoId: 'currencies' },
          { type: 'tip', text: 'Создавайте достижения с крупными наградами за долгосрочные цели — это мощнейший мотиватор для формирования привычек.' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 7. КРАФТ
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'crafting',
    title: 'Крафт',
    icon: Puzzle,
    iconGradient: 'from-emerald-500 to-teal-600',
    articles: [
      {
        id: 'crafting-overview',
        title: 'Система крафта',
        icon: Puzzle,
        iconColor: '#14b8a6',
        content: [
          { type: 'text', text: 'Крафт — это создание уникальных предметов из фрагментов. Фрагменты выпадают при выполнении задач.' },
          { type: 'heading', text: 'Как это работает' },
          { type: 'steps', items: [
            'Создайте рецепт крафта в разделе Магазин → вкладка «Рецепты»',
            'Укажите фрагмент: название, иконку, цвет, количество',
            'Выберите источник фрагментов (привязка к задаче, стрику и т.д.)',
            'Укажите результат: какой предмет будет скрафчен',
            'Выполняйте задачи → собирайте фрагменты',
            'Когда все фрагменты собраны → кнопка «Скрафтить»',
            'Предмет появится в Инвентаре!',
          ] },
          { type: 'heading', text: 'Источники фрагментов' },
          { type: 'table', headers: ['Источник', 'Описание'], rows: [
            ['Привязка к задаче', 'Фрагмент выпадает с шансом при выполнении задачи'],
            ['Привязка к привычке', 'Фрагмент выпадает при выполнении привычки'],
            ['Награда за стрик', 'Выпадает при достижении определённой серии'],
            ['Случайный дроп', 'Случайно выпадает (из лутбокса и т.д.)'],
          ] },
          { type: 'heading', text: 'Стоимость крафта' },
          { type: 'text', text: 'Помимо фрагментов, крафт может стоить монеты или кристаллы. Это задаётся при создании рецепта.' },
          { type: 'tip', text: 'Используйте крафт для создания особых наград за долгосрочные серии — например, «Собери 30 фрагментов тренировок → Месячный абонемент в зал».' },
        ],
      },
      {
        id: 'fragment-visuals',
        title: 'Фрагменты и визуальный стиль',
        icon: Sparkles,
        iconColor: '#8b5cf6',
        content: [
          { type: 'text', text: 'Фрагменты имеют уникальный визуальный стиль «призматический кристалл» — многослойный градиент с бликом и свечением.' },
          { type: 'demo', demoId: 'craft-fragments' },
          { type: 'heading', text: 'Настройка фрагмента' },
          { type: 'list', items: [
            'Название — как называется фрагмент',
            'Иконка — выбрать из набора Lucide или загрузить фото',
            'Цвет — основной цвет кристалла (по редкости результата)',
          ] },
          { type: 'heading', text: 'Прогресс' },
          { type: 'text', text: 'На карточке рецепта видна полоса прогресса: сколько фрагментов собрано из требуемого количества. Когда все собраны, кнопка крафта становится активной.' },
          { type: 'info', text: 'Иконки фрагментов (кристаллы) намеренно отличаются от иконок предметов (эмалевые значки) — это разные визуальные системы.' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 8. РЕФЛЕКСИЯ
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'reflection',
    title: 'Рефлексия',
    icon: Brain,
    iconGradient: 'from-teal-500 to-emerald-600',
    articles: [
      {
        id: 'notes',
        title: 'Заметки',
        icon: Brain,
        iconColor: '#14b8a6',
        content: [
          { type: 'text', text: 'Заметки — это встроенный мини-Notion. Полноценный WYSIWYG редактор с папками, тегами и вставкой изображений.' },
          { type: 'heading', text: 'Возможности редактора' },
          { type: 'list', items: [
            'Жирный, курсив, подчёркнутый текст',
            'Ссылки',
            'Вставка изображений',
            'Списки',
          ] },
          { type: 'heading', text: 'Организация' },
          { type: 'list', items: [
            'Папки — группировка заметок',
            'Теги — для быстрого поиска',
            'Пины — закреплённые заметки сверху',
            'Привязка к задачам и предметам',
          ] },
          { type: 'heading', text: 'Массовые действия' },
          { type: 'text', text: 'Можно выбрать несколько заметок и удалить их разом. Удалённые заметки попадают в корзину и могут быть восстановлены.' },
          { type: 'tip', text: 'Используйте заметки для планирования, журналирования мыслей и хранения полезной информации. Привяжите заметку к задаче для контекста.' },
        ],
      },
      {
        id: 'diary',
        title: 'Дневник',
        icon: Heart,
        iconColor: '#ec4899',
        content: [
          { type: 'text', text: 'Дневник — это ежедневный журнал с автоматическим отчётом о прогрессе и трекером настроения.' },
          { type: 'heading', text: 'Что включает дневник' },
          { type: 'list', items: [
            'Автоотчёт дня — какие задачи выполнены, предметы куплены, достижения разблокированы',
            'Трекер настроения — 5 уровней от «Ужасно» до «Отлично»',
            'Мысли дня — свободный текст',
            'Фото дня — можно прикрепить фотографии',
          ] },
          { type: 'heading', text: 'Трекер настроения' },
          { type: 'demo', demoId: 'mood-tracker' },
          { type: 'heading', text: 'Календарь и график' },
          { type: 'text', text: 'Календарь дневника показывает дни с записями. График настроения визуализирует ваше эмоциональное состояние за период.' },
          { type: 'tip', text: 'Заполняйте дневник каждый вечер — даже короткий отчёт помогает отслеживать прогресс и замечать паттерны настроения.' },
        ],
      },
      {
        id: 'daily-conditions',
        title: 'Ежедневные условия',
        icon: CheckSquare,
        iconColor: '#22c55e',
        content: [
          { type: 'text', text: 'Ежедневные условия — это простые чекбоксы для отслеживания повседневных привычек прямо в дневнике.' },
          { type: 'heading', text: 'Примеры условий' },
          { type: 'list', items: [
            'Медитация',
            'Фото тела (прогресс)',
            'Пить воду',
            'Ложиться вовремя',
          ] },
          { type: 'heading', text: 'Использование' },
          { type: 'text', text: 'Условия появляются в дневнике за каждый день. Отмечайте выполненные. Стрики условий отслеживаются автоматически и могут быть условиями для достижений.' },
          { type: 'info', text: 'Каждое условие имеет даты активности — от и до. Это позволяет создавать временные челленджи.' },
        ],
      },
      {
        id: 'auto-report',
        title: 'Автоотчёт дня',
        icon: BarChart3,
        iconColor: '#6366f1',
        content: [
          { type: 'text', text: 'Автоотчёт — это снимок вашего дня, который генерируется автоматически.' },
          { type: 'heading', text: 'Что фиксируется' },
          { type: 'list', items: [
            'Выполненные задачи (по группам)',
            'XP, монеты и кристаллы за день',
            'Купленные предметы',
            'Использованные предметы',
            'Разблокированные достижения',
            'Активные стрики',
          ] },
          { type: 'text', text: 'Отчёт обновляется при каждом открытии дневника за текущий день. Для прошлых дней он зафиксирован.' },
          { type: 'tip', text: 'Автоотчёт — отличный способ увидеть, сколько всего вы сделали за день. Часто мы недооцениваем свой прогресс!' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 9. НАСТРОЙКИ
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'settings',
    title: 'Настройки',
    icon: Settings,
    iconGradient: 'from-slate-500 to-slate-700',
    articles: [
      {
        id: 'settings-profile',
        title: 'Профиль',
        icon: Activity,
        iconColor: '#6366f1',
        content: [
          { type: 'text', text: 'Настройки профиля вашего персонажа.' },
          { type: 'list', items: [
            'Имя — как вас зовут в приложении',
            'Аватар — эмодзи или загрузить фото',
            'Профиль — можно создать несколько персонажей',
          ] },
          { type: 'info', text: 'Аватар и имя отображаются в верхней панели приложения.' },
        ],
      },
      {
        id: 'settings-appearance',
        title: 'Оформление',
        icon: Palette,
        iconColor: '#ec4899',
        content: [
          { type: 'heading', text: 'Тема' },
          { type: 'list', items: [
            'Светлая — классический светлый фон',
            'Тёмная — тёмный фон для комфорта глаз',
            'Системная — следует за настройками ОС',
          ] },
          { type: 'heading', text: 'Цвет акцента' },
          { type: 'demo', demoId: 'accent-colors' },
          { type: 'text', text: 'Цвет акцента используется для кнопок, ссылок и выделений по всему приложению.' },
          { type: 'heading', text: 'Прочее' },
          { type: 'list', items: [
            'Показать скроллбары — вкл/выкл видимость скроллбаров',
          ] },
        ],
      },
      {
        id: 'settings-gameplay',
        title: 'Геймплей',
        icon: Gamepad2,
        iconColor: '#f59e0b',
        content: [
          { type: 'heading', text: 'Опыт за сложности' },
          { type: 'text', text: 'Здесь можно изменить базовые значения XP для каждого уровня сложности задач. По умолчанию: 10/30/100/300.' },
          { type: 'demo', demoId: 'difficulty-badges' },
          { type: 'heading', text: 'Режим прогрессии' },
          { type: 'text', text: 'Выбор кривой опыта: стандартная, быстрая или кастомная. Влияет на то, сколько XP нужно для каждого уровня.' },
          { type: 'heading', text: 'Тост-уведомления' },
          { type: 'text', text: 'Управление всплывающими уведомлениями: выполнение задач, покупки, достижения, крафт, летающие монеты и т.д. Каждый тип можно вкл/выкл отдельно.' },
        ],
      },
      {
        id: 'settings-data',
        title: 'Данные',
        icon: Shield,
        iconColor: '#64748b',
        content: [
          { type: 'heading', text: 'Папка данных' },
          { type: 'text', text: 'В десктопной версии можно выбрать папку для хранения данных. По умолчанию: ~/Documents/RPGLife/.' },
          { type: 'heading', text: 'Экспорт / Импорт' },
          { type: 'text', text: 'Экспорт сохраняет все данные в JSON-файл. Импорт восстанавливает из ранее сохранённого файла, полностью заменяя текущие данные.' },
          { type: 'warning', text: 'Импорт полностью заменяет все текущие данные! Делайте экспорт перед импортом на всякий случай.' },
          { type: 'heading', text: 'Тестовые данные' },
          { type: 'text', text: 'Можно загрузить тестовые данные для знакомства с приложением. Ваши данные сохраняются, и их можно вернуть обратно.' },
          { type: 'heading', text: 'Сброс прогресса' },
          { type: 'text', text: 'Удаляет ВСЕ данные безвозвратно. Требует двойного подтверждения.' },
          { type: 'warning', text: 'Сброс прогресса — необратимое действие! Перед этим обязательно сделайте экспорт.' },
        ],
      },
    ],
  },
]

// ─── Block Renderers ─────────────────────────────────────────────────────────

function BlockText({ text }: { text: string }) {
  return <p className="text-sm text-[var(--fg-secondary)] leading-relaxed">{text}</p>
}

function BlockHeading({ text }: { text: string }) {
  return <h3 className="text-sm font-bold text-[var(--fg)] mt-5 mb-2">{text}</h3>
}

function BlockTip({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl p-3.5 mt-3 bg-emerald-500/10 border border-emerald-500/20">
      <Lightbulb className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
      <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">{text}</p>
    </div>
  )
}

function BlockWarning({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl p-3.5 mt-3 bg-red-500/10 border border-red-500/20">
      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
      <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">{text}</p>
    </div>
  )
}

function BlockInfo({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl p-3.5 mt-3 bg-blue-500/10 border border-blue-500/20">
      <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
      <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">{text}</p>
    </div>
  )
}

function BlockTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mt-3 rounded-xl border border-[var(--border)]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[var(--surface)]">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold text-[var(--fg-muted)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-[var(--border)]">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-[var(--fg-secondary)]">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BlockList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-[var(--fg-secondary)]">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function BlockSteps({ items }: { items: string[] }) {
  return (
    <ol className="mt-2 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-[var(--fg-secondary)]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white text-xs font-bold shadow-sm">
            {i + 1}
          </span>
          <span className="leading-relaxed pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  )
}

function BlockDemo({ demoId }: { demoId: string }) {
  const Component = DEMO_COMPONENTS[demoId]
  if (!Component) return null
  return <Component />
}

function RenderBlock({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case 'text': return <BlockText text={block.text} />
    case 'heading': return <BlockHeading text={block.text} />
    case 'tip': return <BlockTip text={block.text} />
    case 'warning': return <BlockWarning text={block.text} />
    case 'info': return <BlockInfo text={block.text} />
    case 'table': return <BlockTable headers={block.headers} rows={block.rows} />
    case 'list': return <BlockList items={block.items} />
    case 'steps': return <BlockSteps items={block.items} />
    case 'divider': return <hr className="my-4 border-[var(--border)]" />
    case 'demo': return <BlockDemo demoId={block.demoId} />
    default: return null
  }
}

// ─── Article View ────────────────────────────────────────────────────────────

function ArticleView({ article }: { article: GuideArticle }) {
  const Icon = article.icon
  return (
    <div className="animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg"
          style={{ background: article.iconColor, boxShadow: `0 4px 16px ${article.iconColor}40` }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-lg font-bold text-[var(--fg)]">{article.title}</h2>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {article.content.map((block, i) => (
          <RenderBlock key={i} block={block} />
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GuideSection() {
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const allArticles = useMemo(() => {
    return GUIDE_DATA.flatMap(cat => cat.articles.map(art => ({ ...art, categoryId: cat.id, categoryTitle: cat.title })))
  }, [])

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase()
    return allArticles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.content.some(b => {
        if ('text' in b) return (b as { text: string }).text.toLowerCase().includes(q)
        if ('items' in b) return (b as { items: string[] }).items.some(item => item.toLowerCase().includes(q))
        return false
      })
    )
  }, [searchQuery, allArticles])

  const selectedArticle = useMemo(() => {
    if (!selectedArticleId) return null
    return allArticles.find(a => a.id === selectedArticleId) ?? null
  }, [selectedArticleId, allArticles])

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  return (
    <div className="p-6">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-[var(--fg)]">Энциклопедия</h2>
          <p className="text-xs text-[var(--fg-muted)]">Полное руководство по RPG Life</p>
        </div>
      </div>

      <div className="flex gap-4 min-h-[500px]">
        {/* Left sidebar — categories & articles */}
        <div className="w-56 shrink-0 flex flex-col gap-2">
          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl pl-9 pr-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-50"
            />
          </div>

          {/* Search results */}
          {filteredArticles ? (
            <div className="flex flex-col gap-0.5 overflow-y-auto flex-1">
              {filteredArticles.length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)] text-center py-4">Ничего не найдено</p>
              ) : (
                filteredArticles.map(article => {
                  const Icon = article.icon
                  return (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => { setSelectedArticleId(article.id); setSearchQuery('') }}
                      className={cn(
                        'flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-left transition-all',
                        'text-[var(--fg-secondary)] hover:bg-[var(--surface)] hover:text-[var(--fg)]'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: article.iconColor }} />
                      <div className="min-w-0">
                        <span className="block truncate">{article.title}</span>
                        <span className="text-[10px] text-[var(--fg-muted)]">{article.categoryTitle}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          ) : (
            /* Normal category tree */
            <div className="flex flex-col gap-0.5 overflow-y-auto flex-1">
              {GUIDE_DATA.map(cat => {
                const CatIcon = cat.icon
                const isExpanded = expandedCategories.has(cat.id)
                return (
                  <div key={cat.id}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--surface)] transition-all"
                    >
                      <div className={cn('flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br text-white shrink-0', cat.iconGradient)}>
                        <CatIcon className="h-3 w-3" />
                      </div>
                      <span className="flex-1 text-left">{cat.title}</span>
                      <ChevronRight className={cn('h-3.5 w-3.5 text-[var(--fg-muted)] transition-transform duration-200', isExpanded && 'rotate-90')} />
                    </button>

                    {isExpanded && (
                      <div className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--border)] pl-3">
                        {cat.articles.map(article => {
                          const ArtIcon = article.icon
                          const isActive = selectedArticleId === article.id
                          return (
                            <button
                              key={article.id}
                              type="button"
                              onClick={() => setSelectedArticleId(article.id)}
                              className={cn(
                                'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-all',
                                isActive
                                  ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)]'
                              )}
                            >
                              <ArtIcon className="h-3 w-3 shrink-0" style={{ color: isActive ? 'var(--accent)' : article.iconColor }} />
                              <span className="truncate">{article.title}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px bg-[var(--border)] shrink-0" />

        {/* Right content — article */}
        <div className="flex-1 overflow-y-auto min-w-0 px-2">
          {selectedArticle ? (
            <ArticleView article={selectedArticle} />
          ) : (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl mb-4">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-[var(--fg)] mb-2">Энциклопедия RPG Life</h3>
              <p className="text-sm text-[var(--fg-muted)] max-w-sm mb-6">
                Полное руководство по всем функциям приложения. Выберите статью слева или воспользуйтесь поиском.
              </p>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                {GUIDE_DATA.slice(0, 9).map(cat => {
                  const CatIcon = cat.icon
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setExpandedCategories(prev => new Set(prev).add(cat.id))
                        if (cat.articles[0]) setSelectedArticleId(cat.articles[0].id)
                      }}
                      className="flex flex-col items-center gap-2 rounded-2xl p-3 neu-convex hover:shadow-lg transition-all group"
                    >
                      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform group-hover:scale-110', cat.iconGradient)}>
                        <CatIcon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-medium text-[var(--fg-muted)] group-hover:text-[var(--fg)] transition-colors">{cat.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
