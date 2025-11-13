import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wrench, Play, RefreshCw, CheckCircle, XCircle, Award } from 'lucide-react'
import { useGameStore } from '../store/gameStore'

interface Tool {
  id: string
  name: string
  cost: number
  description: string
  type: 'simple' | 'complex'
}

const tools: Tool[] = [
  {
    id: 'read_file',
    name: 'read_file',
    cost: 10,
    description: 'Read entire file into memory',
    type: 'simple'
  },
  {
    id: 'search_replace',
    name: 'search_replace',
    cost: 15,
    description: 'Simple string replacement',
    type: 'simple'
  },
  {
    id: 'codebase_search',
    name: 'codebase_search',
    cost: 25,
    description: 'Search entire codebase',
    type: 'complex'
  },
  {
    id: 'analyze_structure',
    name: 'analyze_structure',
    cost: 30,
    description: 'Analyze file structure',
    type: 'complex'
  },
  {
    id: 'create_hierarchy',
    name: 'create_hierarchy',
    cost: 35,
    description: 'Create hierarchical structure',
    type: 'complex'
  },
  {
    id: 'validate_schema',
    name: 'validate_schema',
    cost: 20,
    description: 'Validate against schema',
    type: 'complex'
  },
  {
    id: 'write_file',
    name: 'write_file',
    cost: 12,
    description: 'Write content to file',
    type: 'simple'
  }
]

const scenarios = [
  {
    id: 1,
    task: 'Simple File Reorganization',
    description: 'Just list the key concepts and put content under each',
    optimalTools: ['read_file', 'search_replace', 'write_file'],
    optimalCost: 37,
    aiSelectedTools: ['codebase_search', 'analyze_structure', 'create_hierarchy', 'validate_schema', 'write_file'],
    aiCost: 122
  },
  {
    id: 2,
    task: 'Create Simple List',
    description: 'Extract section headings and create a list',
    optimalTools: ['read_file', 'write_file'],
    optimalCost: 22,
    aiSelectedTools: ['codebase_search', 'analyze_structure', 'read_file', 'create_hierarchy', 'write_file'],
    aiCost: 112
  }
]

export default function ToolOrchestration() {
  const { addScore, unlockAchievement, completeLevel } = useGameStore()
  const [currentScenario] = useState(scenarios[0])
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [showResult, setShowResult] = useState(false)
  const [userCost, setUserCost] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const toggleTool = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(selectedTools.filter(id => id !== toolId))
    } else {
      setSelectedTools([...selectedTools, toolId])
    }
  }

  const calculateCost = () => {
    return selectedTools.reduce((total, toolId) => {
      const tool = tools.find(t => t.id === toolId)
      return total + (tool?.cost || 0)
    }, 0)
  }

  const handleExecute = () => {
    const cost = calculateCost()
    setUserCost(cost)
    setShowResult(true)
    setAttempts(attempts + 1)

    const efficiency = (currentScenario.optimalCost / cost) * 100
    const points = Math.max(0, Math.floor(efficiency * 2))
    addScore(points)

    if (cost <= currentScenario.optimalCost * 1.2 && !completed) {
      setCompleted(true)
      unlockAchievement('tool-optimizer')
      completeLevel('tool-orchestration')
      addScore(100)
    }
  }

  const reset = () => {
    setSelectedTools([])
    setShowResult(false)
    setUserCost(0)
  }

  const isOptimal = userCost <= currentScenario.optimalCost * 1.2
  const efficiency = userCost > 0 ? (currentScenario.optimalCost / userCost) * 100 : 0

  return (
    <div className="container mx-auto px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-4xl font-bold mb-4">Tool Orchestration Challenge</h2>
          <p className="text-gray-300 text-lg">
            Optimize tool selection for simplicity over complexity
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
            <Wrench className="w-8 h-8 text-green-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold mb-3">MCP + LangChain Orchestration</h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Tools are exposed via Model Context Protocol (MCP) servers and orchestrated by LangChain agents.
                The system pattern-matches tool sequences from training data, but lacks a "simplest path" optimizer.
              </p>
              <div className="bg-black/30 rounded-lg p-4 font-mono text-sm">
                <p className="text-gray-400">// Architecture</p>
                <p className="text-blue-300">LLM → LangChain Agent → MCP Client → MCP Servers → Tools</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Scenario */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-md rounded-2xl p-6 border border-green-500/20"
        >
          <h3 className="text-xl font-semibold mb-2">{currentScenario.task}</h3>
          <p className="text-gray-300 mb-4">{currentScenario.description}</p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-green-300">Optimal Solution</h4>
              <p className="text-sm text-gray-400 mb-2">Tools: {currentScenario.optimalTools.length}</p>
              <p className="text-sm text-gray-400">Cost: {currentScenario.optimalCost} tokens</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-red-300">AI's Pattern-Matched Solution</h4>
              <p className="text-sm text-gray-400 mb-2">Tools: {currentScenario.aiSelectedTools.length}</p>
              <p className="text-sm text-gray-400">Cost: {currentScenario.aiCost} tokens (3.3x more!)</p>
            </div>
          </div>
        </motion.div>

        {/* Tool Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-black/30 backdrop-blur-md rounded-2xl p-6 border border-white/10"
        >
          <h3 className="text-lg font-semibold mb-4">Select Your Tools</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => toggleTool(tool.id)}
                className={`
                  p-4 rounded-xl border-2 transition-all text-left
                  ${selectedTools.includes(tool.id)
                    ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                  ${tool.type === 'simple' ? 'hover:border-green-500/30' : 'hover:border-purple-500/30'}
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-mono text-sm font-semibold">{tool.name}</span>
                  <span className={`
                    px-2 py-0.5 rounded text-xs
                    ${tool.type === 'simple' ? 'bg-green-600' : 'bg-purple-600'}
                  `}>
                    {tool.cost}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{tool.description}</p>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 bg-white/5 rounded-lg p-4">
              <p className="text-sm text-gray-400">Selected Tools</p>
              <p className="text-2xl font-bold">{selectedTools.length}</p>
            </div>
            <div className="flex-1 bg-white/5 rounded-lg p-4">
              <p className="text-sm text-gray-400">Total Cost</p>
              <p className="text-2xl font-bold text-blue-400">{calculateCost()} tokens</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExecute}
                disabled={selectedTools.length === 0}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Execute
              </button>
              <button
                onClick={reset}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Result */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`
                rounded-2xl p-6 border-2
                ${isOptimal
                  ? 'bg-green-500/10 border-green-500/50'
                  : 'bg-yellow-500/10 border-yellow-500/50'
                }
              `}
            >
              <div className="flex items-start gap-4">
                {isOptimal ? (
                  <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-yellow-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-2 ${isOptimal ? 'text-green-300' : 'text-yellow-300'}`}>
                    {isOptimal ? 'Excellent Optimization!' : 'Room for Improvement'}
                  </h3>
                  <p className="text-gray-300 mb-4">
                    {isOptimal
                      ? 'You found a near-optimal solution! This is what constraint-aware tool selection looks like.'
                      : 'Try using fewer tools. Remember: the task asks for simplicity, not complexity.'}
                  </p>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-black/30 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Your Cost</p>
                      <p className="text-xl font-bold">{userCost}</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Optimal Cost</p>
                      <p className="text-xl font-bold text-green-400">{currentScenario.optimalCost}</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Efficiency</p>
                      <p className="text-xl font-bold text-blue-400">{efficiency.toFixed(0)}%</p>
                    </div>
                  </div>

                  {isOptimal && (
                    <div className="bg-green-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-green-300" />
                        <p className="text-sm text-green-200">
                          This is what AI systems lack: a constraint-aware optimizer that prioritizes simplicity
                          over pattern-matched complexity.
                        </p>
                      </div>
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
                  You understand how to optimize tool selection for constraint satisfaction, not just pattern matching.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
