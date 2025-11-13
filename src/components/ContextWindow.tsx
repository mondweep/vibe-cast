import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, AlertTriangle, CheckCircle, Zap, TrendingDown } from 'lucide-react'
import { useGameStore } from '../store/gameStore'

interface ContextChunk {
  id: number
  type: 'system' | 'query' | 'file' | 'rag' | 'tool' | 'history'
  content: string
  tokens: number
  priority: 'high' | 'medium' | 'low'
  necessary: boolean
}

const initialChunks: ContextChunk[] = [
  { id: 1, type: 'system', content: 'System prompt and instructions', tokens: 500, priority: 'high', necessary: true },
  { id: 2, type: 'query', content: 'User query: "reorganize this file simply"', tokens: 50, priority: 'high', necessary: true },
  { id: 3, type: 'file', content: 'Full file content (2000 lines)', tokens: 3500, priority: 'medium', necessary: false },
  { id: 4, type: 'file', content: 'File structure summary', tokens: 200, priority: 'high', necessary: true },
  { id: 5, type: 'rag', content: 'Retrieved: Complex reorganization pattern #1', tokens: 800, priority: 'low', necessary: false },
  { id: 6, type: 'rag', content: 'Retrieved: Complex reorganization pattern #2', tokens: 750, priority: 'low', necessary: false },
  { id: 7, type: 'rag', content: 'Retrieved: Enterprise architecture doc', tokens: 900, priority: 'low', necessary: false },
  { id: 8, type: 'tool', content: 'Tool descriptions (20 tools)', tokens: 600, priority: 'medium', necessary: false },
  { id: 9, type: 'tool', content: 'Tool descriptions (3 essential)', tokens: 100, priority: 'high', necessary: true },
  { id: 10, type: 'history', content: 'Previous conversation turns', tokens: 1200, priority: 'low', necessary: false },
]

const MAX_TOKENS = 4000

export default function ContextWindow() {
  const { addScore, unlockAchievement, completeLevel } = useGameStore()
  const [selectedChunks, setSelectedChunks] = useState<number[]>([1, 2]) // System and query are mandatory
  const [completed, setCompleted] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const totalTokens = selectedChunks.reduce((sum, id) => {
    const chunk = initialChunks.find(c => c.id === id)
    return sum + (chunk?.tokens || 0)
  }, 0)

  const necessaryChunks = initialChunks.filter(c => c.necessary).map(c => c.id)
  const hasAllNecessary = necessaryChunks.every(id => selectedChunks.includes(id))
  const unnecessarySelected = selectedChunks.filter(id => !necessaryChunks.includes(id))

  const toggleChunk = (id: number) => {
    const chunk = initialChunks.find(c => c.id === id)
    // Can't deselect system or query
    if (chunk?.type === 'system' || (chunk?.type === 'query' && selectedChunks.includes(id))) {
      return
    }

    if (selectedChunks.includes(id)) {
      setSelectedChunks(selectedChunks.filter(cid => cid !== id))
    } else {
      setSelectedChunks([...selectedChunks, id])
    }
  }

  const handleOptimize = () => {
    setShowFeedback(true)
    setAttempts(attempts + 1)

    const withinBudget = totalTokens <= MAX_TOKENS
    const optimal = hasAllNecessary && unnecessarySelected.length === 0 && withinBudget

    if (optimal) {
      addScore(200)
      if (!completed) {
        setCompleted(true)
        unlockAchievement('context-wizard')
        completeLevel('context-window')
      }
    } else if (hasAllNecessary && withinBudget) {
      addScore(50)
    } else {
      addScore(10)
    }
  }

  const isOptimal = hasAllNecessary && unnecessarySelected.length === 0 && totalTokens <= MAX_TOKENS

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'system': return 'bg-blue-500/20 border-blue-500/50'
      case 'query': return 'bg-green-500/20 border-green-500/50'
      case 'file': return 'bg-purple-500/20 border-purple-500/50'
      case 'rag': return 'bg-yellow-500/20 border-yellow-500/50'
      case 'tool': return 'bg-pink-500/20 border-pink-500/50'
      case 'history': return 'bg-gray-500/20 border-gray-500/50'
      default: return 'bg-white/5 border-white/10'
    }
  }

  return (
    <div className="container mx-auto px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-4xl font-bold mb-4">Context Window Challenge</h2>
          <p className="text-gray-300 text-lg">
            Manage limited token budgets efficiently
          </p>
        </motion.div>

        {/* Explanation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-start gap-4">
            <BookOpen className="w-8 h-8 text-yellow-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold mb-3">Context Window Management</h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Models have limited context windows (8K-128K tokens). Every token costs money and adds latency.
                AI systems try to load everything via RAG, but don't optimize for minimal context.
              </p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>Reactive Management:</strong> Systems chunk/truncate when hitting limits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>No Proactive Optimization:</strong> Load everything, then cut when necessary</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>The Gap:</strong> No "minimal context for task" mode</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Token Budget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-md rounded-2xl p-6 border border-yellow-500/20"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Token Budget</h3>
            <div className="text-right">
              <p className="text-sm text-gray-400">Current / Maximum</p>
              <p className={`text-2xl font-bold ${totalTokens > MAX_TOKENS ? 'text-red-400' : 'text-green-400'}`}>
                {totalTokens.toLocaleString()} / {MAX_TOKENS.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="relative w-full bg-gray-700 rounded-full h-6 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (totalTokens / MAX_TOKENS) * 100)}%` }}
              className={`h-full rounded-full transition-colors ${
                totalTokens > MAX_TOKENS
                  ? 'bg-gradient-to-r from-red-600 to-red-500'
                  : totalTokens > MAX_TOKENS * 0.8
                  ? 'bg-gradient-to-r from-yellow-600 to-yellow-500'
                  : 'bg-gradient-to-r from-green-600 to-green-500'
              }`}
            />
            {totalTokens > MAX_TOKENS && (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 mr-1" />
                OVER BUDGET
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-black/30 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Selected Chunks</p>
              <p className="text-xl font-bold">{selectedChunks.length}</p>
            </div>
            <div className="bg-black/30 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Efficiency</p>
              <p className="text-xl font-bold text-blue-400">{((necessaryChunks.length / selectedChunks.length) * 100).toFixed(0)}%</p>
            </div>
            <div className="bg-black/30 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Cost</p>
              <p className="text-xl font-bold text-purple-400">${(totalTokens * 0.001).toFixed(2)}</p>
            </div>
          </div>
        </motion.div>

        {/* Context Chunks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-black/30 backdrop-blur-md rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Select Context Chunks</h3>
            <button
              onClick={handleOptimize}
              disabled={totalTokens > MAX_TOKENS || !hasAllNecessary}
              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Optimize
            </button>
          </div>

          <div className="space-y-2">
            {initialChunks.map((chunk) => {
              const isSelected = selectedChunks.includes(chunk.id)
              const isMandatory = chunk.type === 'system' || chunk.type === 'query'

              return (
                <button
                  key={chunk.id}
                  onClick={() => toggleChunk(chunk.id)}
                  disabled={isMandatory}
                  className={`
                    w-full p-4 rounded-xl border-2 transition-all text-left
                    ${isSelected ? getTypeColor(chunk.type) : 'bg-white/5 border-white/10'}
                    ${isMandatory ? 'cursor-not-allowed opacity-75' : 'hover:bg-white/10'}
                    ${chunk.necessary && !isSelected ? 'ring-2 ring-green-500/50' : ''}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`
                          px-2 py-0.5 rounded text-xs font-semibold
                          ${chunk.type === 'system' ? 'bg-blue-600' :
                            chunk.type === 'query' ? 'bg-green-600' :
                            chunk.type === 'file' ? 'bg-purple-600' :
                            chunk.type === 'rag' ? 'bg-yellow-600' :
                            chunk.type === 'tool' ? 'bg-pink-600' :
                            'bg-gray-600'}
                        `}>
                          {chunk.type}
                        </span>
                        {chunk.necessary && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-600">
                            necessary
                          </span>
                        )}
                        {isMandatory && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-600">
                            mandatory
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mb-1">{chunk.content}</p>
                      <p className="text-xs text-gray-400">
                        {chunk.tokens.toLocaleString()} tokens • {chunk.priority} priority
                      </p>
                    </div>
                    <div className="ml-4">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${isSelected ? 'bg-blue-600 border-blue-400' : 'border-gray-600'}
                      `}>
                        {isSelected && <CheckCircle className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Feedback */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`
                rounded-2xl p-6 border-2
                ${isOptimal
                  ? 'bg-green-500/10 border-green-500/50'
                  : hasAllNecessary && totalTokens <= MAX_TOKENS
                  ? 'bg-yellow-500/10 border-yellow-500/50'
                  : 'bg-red-500/10 border-red-500/50'
                }
              `}
            >
              <div className="flex items-start gap-4">
                {isOptimal ? (
                  <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-yellow-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-2 ${
                    isOptimal ? 'text-green-300' : 'text-yellow-300'
                  }`}>
                    {isOptimal
                      ? 'Perfect Optimization!'
                      : hasAllNecessary
                      ? 'Good, but Not Optimal'
                      : 'Missing Necessary Context'}
                  </h3>
                  <p className="text-gray-300 mb-4">
                    {isOptimal
                      ? 'You selected only the necessary chunks! This is minimal context optimization—exactly what AI systems lack.'
                      : hasAllNecessary
                      ? `You have all necessary chunks, but ${unnecessarySelected.length} unnecessary ones. For a simple task, you don't need complex RAG retrievals.`
                      : 'You\'re missing some necessary chunks. Make sure to include all chunks marked as "necessary".'}
                  </p>

                  {isOptimal && (
                    <div className="bg-green-500/20 rounded-lg p-4">
                      <p className="text-sm text-green-200">
                        <strong>The Gap Revealed:</strong> AI systems load full files, retrieve multiple complex patterns,
                        and include excessive tool descriptions. But for "make a simple list," you only need:
                        structure summary (200 tokens), not full file (3500 tokens). This is constraint-aware context management.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion Message */}
        {completed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div>
                <h3 className="font-semibold text-green-300">Level Complete!</h3>
                <p className="text-sm text-gray-300">
                  You've mastered minimal context optimization. This is the efficiency AI systems lack.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
