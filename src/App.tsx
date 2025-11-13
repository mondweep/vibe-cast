import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Search, Eye, Wrench, BookOpen, Trophy, Home } from 'lucide-react'
import { useGameStore } from './store/gameStore'
import IntroScreen from './components/IntroScreen'
import VectorSpaceExplorer from './components/VectorSpaceExplorer'
import RAGRetrieval from './components/RAGRetrieval'
import AttentionVisualizer from './components/AttentionVisualizer'
import ToolOrchestration from './components/ToolOrchestration'
import ContextWindow from './components/ContextWindow'
import AchievementsPanel from './components/AchievementsPanel'

function App() {
  const { currentLevel, setCurrentLevel, score, achievements } = useGameStore()
  const [showIntro, setShowIntro] = useState(true)
  const [showAchievements, setShowAchievements] = useState(false)

  const levels = [
    { id: 'vector-space', name: 'Vector Space', icon: Brain, color: 'blue' },
    { id: 'rag-retrieval', name: 'RAG Retrieval', icon: Search, color: 'purple' },
    { id: 'attention', name: 'Attention', icon: Eye, color: 'pink' },
    { id: 'tool-orchestration', name: 'Tool Orchestra', icon: Wrench, color: 'green' },
    { id: 'context-window', name: 'Context Window', icon: BookOpen, color: 'yellow' },
  ]

  const renderLevel = () => {
    switch (currentLevel) {
      case 'vector-space':
        return <VectorSpaceExplorer />
      case 'rag-retrieval':
        return <RAGRetrieval />
      case 'attention':
        return <AttentionVisualizer />
      case 'tool-orchestration':
        return <ToolOrchestration />
      case 'context-window':
        return <ContextWindow />
      default:
        return <VectorSpaceExplorer />
    }
  }

  if (showIntro) {
    return <IntroScreen onStart={() => setShowIntro(false)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowIntro(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Vibe Cast</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-lg font-semibold">
              Score: <span className="text-blue-400">{score}</span>
            </div>
            <button
              onClick={() => setShowAchievements(!showAchievements)}
              className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Trophy className="w-5 h-5" />
              {achievements.filter(a => a.unlocked).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full text-xs flex items-center justify-center">
                  {achievements.filter(a => a.unlocked).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Level Navigation */}
        <div className="container mx-auto px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto">
            {levels.map((level) => {
              const Icon = level.icon
              const isActive = currentLevel === level.id
              return (
                <button
                  key={level.id}
                  onClick={() => setCurrentLevel(level.id as any)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap
                    ${isActive
                      ? 'bg-blue-600 shadow-lg shadow-blue-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{level.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLevel}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderLevel()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Achievements Panel */}
      <AnimatePresence>
        {showAchievements && (
          <AchievementsPanel onClose={() => setShowAchievements(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
