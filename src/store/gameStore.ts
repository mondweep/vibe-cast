import { create } from 'zustand'

export type GameLevel = 'vector-space' | 'rag-retrieval' | 'attention' | 'tool-orchestration' | 'context-window'

interface Achievement {
  id: string
  title: string
  description: string
  unlocked: boolean
  icon: string
}

interface GameState {
  // Player progress
  currentLevel: GameLevel
  score: number
  achievements: Achievement[]
  levelsCompleted: Set<GameLevel>

  // Actions
  setCurrentLevel: (level: GameLevel) => void
  addScore: (points: number) => void
  unlockAchievement: (achievementId: string) => void
  completeLevel: (level: GameLevel) => void
  resetGame: () => void
}

const initialAchievements: Achievement[] = [
  {
    id: 'first-vector',
    title: 'Vector Explorer',
    description: 'Understand how words become vectors',
    unlocked: false,
    icon: '🎯'
  },
  {
    id: 'rag-master',
    title: 'RAG Master',
    description: 'See why complexity wins in retrieval',
    unlocked: false,
    icon: '🔍'
  },
  {
    id: 'attention-guru',
    title: 'Attention Guru',
    description: 'Master the attention mechanism',
    unlocked: false,
    icon: '👁️'
  },
  {
    id: 'tool-optimizer',
    title: 'Tool Optimizer',
    description: 'Optimize tool selection for simplicity',
    unlocked: false,
    icon: '🛠️'
  },
  {
    id: 'context-wizard',
    title: 'Context Wizard',
    description: 'Manage context windows efficiently',
    unlocked: false,
    icon: '🪄'
  },
  {
    id: 'architect',
    title: 'AI Architect',
    description: 'Complete all levels',
    unlocked: false,
    icon: '🏗️'
  }
]

export const useGameStore = create<GameState>((set) => ({
  currentLevel: 'vector-space',
  score: 0,
  achievements: initialAchievements,
  levelsCompleted: new Set(),

  setCurrentLevel: (level) => set({ currentLevel: level }),

  addScore: (points) => set((state) => ({
    score: state.score + points
  })),

  unlockAchievement: (achievementId) => set((state) => ({
    achievements: state.achievements.map(a =>
      a.id === achievementId ? { ...a, unlocked: true } : a
    )
  })),

  completeLevel: (level) => set((state) => {
    const newLevelsCompleted = new Set(state.levelsCompleted)
    newLevelsCompleted.add(level)

    // Check if all levels completed
    const allLevels: GameLevel[] = ['vector-space', 'rag-retrieval', 'attention', 'tool-orchestration', 'context-window']
    const allCompleted = allLevels.every(l => newLevelsCompleted.has(l))

    return {
      levelsCompleted: newLevelsCompleted,
      achievements: allCompleted
        ? state.achievements.map(a => a.id === 'architect' ? { ...a, unlocked: true } : a)
        : state.achievements
    }
  }),

  resetGame: () => set({
    currentLevel: 'vector-space',
    score: 0,
    achievements: initialAchievements,
    levelsCompleted: new Set()
  })
}))
