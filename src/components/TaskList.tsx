import { useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import type { Task } from '../types/domain'

function TaskRow({ task }: { task: Task }) {
  const completeTask = useGameStore(s => s.completeTask)
  const failTask = useGameStore(s => s.failTask)
  const deleteTask = useGameStore(s => s.deleteTask)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, opacity: task.archived ? 0.6 : 1 }}>
          {task.title}
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {task.kind === 'todo' ? 'Обычная' : task.kind === 'daily' ? 'Ежедневная' : 'Привычка'} · {task.difficulty}
        </div>
      </div>
      {task.kind === 'todo' && 'isCompleted' in task && task.isCompleted ? (
        <span style={{ fontSize: 12, color: '#7fd87f' }}>Сделано</span>
      ) : (
        <>
          <button onClick={() => completeTask(task.id)}>Сделать</button>
          <button onClick={() => failTask(task.id)}>Провал</button>
        </>
      )}
      <button onClick={() => deleteTask(task.id)} style={{ opacity: 0.7 }}>Удалить</button>
    </div>
  )
}

function TaskList() {
  const tasks = useGameStore(s => s.tasks)

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => b.updatedAt - a.updatedAt)
  }, [tasks])

  return (
    <div>
      {sorted.length === 0 ? (
        <p style={{ opacity: 0.8 }}>Пока нет задач. Добавь первую выше.</p>
      ) : (
        sorted.map(t => <TaskRow key={t.id} task={t} />)
      )}
    </div>
  )
}

export default TaskList

