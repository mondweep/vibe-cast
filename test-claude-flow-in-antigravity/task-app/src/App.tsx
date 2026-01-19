import { useState, useEffect } from 'react';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import type { Task } from './types';
import { LayoutList, Sparkles } from 'lucide-react';

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('claude-flow-tasks');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('claude-flow-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (text: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now()
    };
    setTasks([newTask, ...tasks]);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const editTask = (id: string, newText: string) => {
    setTasks(tasks.map(t =>
      t.id === id ? { ...t, text: newText } : t
    ));
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length
  };

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
          background: 'rgba(255,255,255,0.05)',
          padding: '1rem 2rem',
          borderRadius: '2rem',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <LayoutList size={40} color="#a5b4fc" />
          <h1>Flow Tasks</h1>
        </div>
        <p className="subtitle">
          Orchestrated by Claude Flow & Antigravity
        </p>

        <div style={{
          display: 'flex',
          gap: '2rem',
          justifyContent: 'center',
          marginTop: '1rem',
          fontSize: '0.9rem',
          color: 'rgba(255,255,255,0.5)'
        }}>
          <span>Total: <strong style={{ color: 'white' }}>{stats.total}</strong></span>
          <span>Completed: <strong style={{ color: '#a5b4fc' }}>{stats.completed}</strong></span>
        </div>
      </header>

      <main>
        <TaskInput onAdd={addTask} />

        <div className="task-list">
          {tasks.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
              <Sparkles size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>Your flow is empty. Start by adding a task!</p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onEdit={editTask}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
