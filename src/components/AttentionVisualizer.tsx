import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, Zap, CheckCircle, Info } from 'lucide-react'
import { useGameStore } from '../store/gameStore'

interface Token {
  text: string
  attention: number
  type: 'task' | 'constraint' | 'pattern'
}

const sentences = [
  {
    id: 1,
    text: 'Reorganize this file with a simple structure',
    tokens: [
      { text: 'Reorganize', attention: 0.35, type: 'task' as const },
      { text: 'this', attention: 0.05, type: 'task' as const },
      { text: 'file', attention: 0.15, type: 'task' as const },
      { text: 'with', attention: 0.03, type: 'constraint' as const },
      { text: 'a', attention: 0.02, type: 'constraint' as const },
      { text: 'simple', attention: 0.08, type: 'constraint' as const },
      { text: 'structure', attention: 0.32, type: 'pattern' as const },
    ]
  },
  {
    id: 2,
    text: 'Create a minimal list of key concepts',
    tokens: [
      { text: 'Create', attention: 0.28, type: 'task' as const },
      { text: 'a', attention: 0.02, type: 'constraint' as const },
      { text: 'minimal', attention: 0.06, type: 'constraint' as const },
      { text: 'list', attention: 0.18, type: 'pattern' as const },
      { text: 'of', attention: 0.04, type: 'constraint' as const },
      { text: 'key', attention: 0.22, type: 'pattern' as const },
      { text: 'concepts', attention: 0.20, type: 'pattern' as const },
    ]
  }
]

const attentionHeads = [
  { id: 1, name: 'Syntactic', focus: 'task', color: '#3b82f6' },
  { id: 2, name: 'Semantic', focus: 'pattern', color: '#8b5cf6' },
  { id: 3, name: 'Positional', focus: 'task', color: '#ec4899' },
  { id: 4, name: 'Task-Specific', focus: 'pattern', color: '#10b981' },
]

export default function AttentionVisualizer() {
  const { addScore, unlockAchievement, completeLevel } = useGameStore()
  const [selectedSentence, setSelectedSentence] = useState(sentences[0])
  const [activeHead, setActiveHead] = useState<number | null>(null)
  const [completed, setCompleted] = useState(false)
  const [interactionCount, setInteractionCount] = useState(0)

  const handleTokenClick = () => {
    const newCount = interactionCount + 1
    setInteractionCount(newCount)
    addScore(15)

    if (newCount >= 5 && !completed) {
      setCompleted(true)
      unlockAchievement('attention-guru')
      completeLevel('attention')
      addScore(100)
    }
  }

  const getAttentionColor = (attention: number) => {
    return `rgba(59, 130, 246, ${attention})`
  }

  const getSoftmaxDistribution = (tokens: Token[]) => {
    const total = tokens.reduce((sum, t) => sum + t.attention, 0)
    return tokens.map(t => ({
      ...t,
      normalized: t.attention / total
    }))
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
          <h2 className="text-4xl font-bold mb-4">Attention Mechanism Visualizer</h2>
          <p className="text-gray-300 text-lg">
            See how transformers decide what matters
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
            <Eye className="w-8 h-8 text-pink-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold mb-3">How Attention Works</h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Inside transformers, attention mechanisms compute: <code className="bg-black/30 px-2 py-1 rounded text-blue-300">Attention(Q, K, V) = softmax(QK^T/√d_k)V</code>
              </p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>Multi-Head Attention:</strong> 12-32 parallel heads, each focusing on different relationships</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>Learned Associations:</strong> Weights encode patterns from training (e.g., "reorganize" → "complex structure")</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>Softmax Distribution:</strong> Attention weights sum to 1, favoring frequent patterns</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Sentence Selector */}
        <div className="flex gap-4">
          {sentences.map((sentence) => (
            <button
              key={sentence.id}
              onClick={() => {
                setSelectedSentence(sentence)
                handleTokenClick()
              }}
              className={`
                flex-1 p-4 rounded-xl border transition-all
                ${selectedSentence.id === sentence.id
                  ? 'bg-blue-500/20 border-blue-500/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }
              `}
            >
              <p className="text-sm">{sentence.text}</p>
            </button>
          ))}
        </div>

        {/* Attention Heads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 backdrop-blur-md rounded-2xl p-6 border border-pink-500/20"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-pink-400" />
            Attention Heads (Multi-Head Attention)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {attentionHeads.map((head) => (
              <button
                key={head.id}
                onClick={() => {
                  setActiveHead(activeHead === head.id ? null : head.id)
                  handleTokenClick()
                }}
                className={`
                  p-4 rounded-xl border transition-all
                  ${activeHead === head.id
                    ? 'bg-white/20 border-white/40 shadow-lg'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                `}
                style={{
                  borderColor: activeHead === head.id ? head.color : undefined
                }}
              >
                <div className="text-center">
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: head.color }}
                  />
                  <p className="font-semibold text-sm">{head.name}</p>
                  <p className="text-xs text-gray-400 mt-1">Focuses on {head.focus}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Token Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-black/30 backdrop-blur-md rounded-2xl p-8 border border-white/10"
        >
          <h3 className="text-lg font-semibold mb-6">Attention Weights Distribution</h3>

          <div className="space-y-6">
            {/* Token Display */}
            <div className="flex flex-wrap gap-3 justify-center">
              {selectedSentence.tokens.map((token, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={handleTokenClick}
                  className="cursor-pointer"
                >
                  <div
                    className="px-6 py-4 rounded-xl border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: getAttentionColor(token.attention),
                      borderColor: token.type === 'task' ? '#3b82f6' : token.type === 'pattern' ? '#8b5cf6' : '#6b7280',
                    }}
                  >
                    <p className="font-mono text-lg font-semibold mb-1">{token.text}</p>
                    <p className="text-xs text-gray-300">
                      Attention: {(token.attention * 100).toFixed(0)}%
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Attention Bar Chart */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-400">Softmax Distribution (Σ = 1.0)</h4>
              {getSoftmaxDistribution(selectedSentence.tokens).map((token, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm font-mono w-24 text-right">{token.text}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-8 relative overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${token.normalized * 100}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.05 }}
                      className="h-full rounded-full flex items-center justify-end px-2"
                      style={{
                        backgroundColor: token.type === 'task' ? '#3b82f6' : token.type === 'pattern' ? '#8b5cf6' : '#6b7280'
                      }}
                    >
                      <span className="text-xs font-semibold">{(token.normalized * 100).toFixed(1)}%</span>
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Insight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6"
        >
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-yellow-300 mb-2">The Pattern</h4>
              <p className="text-sm text-gray-300 mb-3">
                Notice how <span className="text-blue-400 font-semibold">"Reorganize"</span> and{' '}
                <span className="text-purple-400 font-semibold">"structure"</span> receive high attention
                (35% and 32%), while <span className="text-gray-400 font-semibold">"simple"</span> only
                gets 8%. This is learned behavior: the model saw "reorganize" + "complex structure"
                thousands of times during training, encoding strong associations in the Q, K, V projection matrices.
              </p>
              <p className="text-sm text-gray-300">
                Constraints like "simple" or "minimal" are whispers compared to the roar of pattern-matched complexity.
              </p>
            </div>
          </div>
        </motion.div>

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
                  You understand how attention mechanisms distribute focus based on learned patterns,
                  not constraint satisfaction.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
