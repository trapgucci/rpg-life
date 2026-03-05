import { useState } from 'react'
import type { TaskDifficulty, TaskKind } from '../types/domain'

interface Props {
  onSubmit: (data: { title: string; kind: TaskKind; difficulty: 'easy' | 'normal' | 'hard' }) => void
}

function TaskForm({ onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<TaskKind>('todo')
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        onSubmit({ title: title.trim(), kind, difficulty })
        setTitle('')
        setKind('todo')
        setDifficulty('normal')
      }}
      style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}
    >
      <input
        placeholder="Название задачи"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ flex: 1, minWidth: 220 }}
      />
      <select value={kind} onChange={(e) => setKind(e.target.value as TaskKind)}>
        <option value="todo">Обычная</option>
        <option value="daily">Ежедневная</option>
      </select>
      <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as TaskDifficulty)}>
        <option value="easy">Лёгкая</option>
        <option value="medium">Нормальная</option>
        <option value="hard">Сложная</option>
      </select>
      <button type="submit">Добавить</button>
    </form>
  )
}

export default TaskForm

