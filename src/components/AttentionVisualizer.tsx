import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, Zap, CheckCircle, Info, Search, Key, Database, Ruler } from 'lucide-react'
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
  const [showSoftmaxDemo, setShowSoftmaxDemo] = useState(false)
  const [useScaling, setUseScaling] = useState(true)

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

  // Simulate QK^T scores before softmax
  const rawScores = [180, 15, 30, 5, 175, 8, 170]
  const dK = 64 // dimension of keys
  const scaledScores = rawScores.map(s => s / Math.sqrt(dK))

  const softmax = (scores: number[]) => {
    const expScores = scores.map(s => Math.exp(s))
    const sum = expScores.reduce((a, b) => a + b, 0)
    return expScores.map(exp => exp / sum)
  }

  const unscaledSoftmax = softmax(rawScores)
  const scaledSoftmax = softmax(scaledScores)

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

        {/* Q, K, V Explanation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-2 gap-4"
        >
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-md rounded-xl p-6 border border-blue-500/20">
            <div className="flex items-start gap-3 mb-3">
              <Search className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-blue-300 mb-2">Q (Query) - What You're Looking For</h4>
                <p className="text-sm text-gray-300 mb-2">
                  The current token asking: "What should I pay attention to?"
                </p>
                <p className="text-xs text-gray-400">
                  Example: If processing "reorganize", Q represents this word's question about what's relevant
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-start gap-3 mb-3">
              <Key className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-purple-300 mb-2">K (Key) - What's Available</h4>
                <p className="text-sm text-gray-300 mb-2">
                  Each token's "label" that Q searches through
                </p>
                <p className="text-xs text-gray-400">
                  Like index entries in a database. Q compares against all keys to find matches
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-md rounded-xl p-6 border border-green-500/20">
            <div className="flex items-start gap-3 mb-3">
              <Database className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-green-300 mb-2">V (Value) - The Actual Content</h4>
                <p className="text-sm text-gray-300 mb-2">
                  What you get back when there's a match
                </p>
                <p className="text-xs text-gray-400">
                  The semantic meaning/representation retrieved based on attention weights
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-md rounded-xl p-6 border border-yellow-500/20">
            <div className="flex items-start gap-3 mb-3">
              <Ruler className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-yellow-300 mb-2">d_k - Dimension of Keys</h4>
                <p className="text-sm text-gray-300 mb-2">
                  The size of key vectors (typically 64-128)
                </p>
                <p className="text-xs text-gray-400">
                  √d_k is used for scaling to prevent huge dot products from saturating softmax
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Softmax Saturation Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-md rounded-2xl p-6 border border-red-500/20"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-red-300">⚠️ Softmax Saturation Problem</h3>
            <button
              onClick={() => setShowSoftmaxDemo(!showSoftmaxDemo)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              {showSoftmaxDemo ? 'Hide Demo' : 'Show Interactive Demo'}
            </button>
          </div>

          <p className="text-gray-300 mb-4 text-sm leading-relaxed">
            Without scaling by √d_k, large dot products create extreme probabilities. One token gets almost all attention (0.99+),
            others get nearly zero. This causes <strong className="text-red-400">gradient death</strong> during training - the model can't learn!
          </p>

          {showSoftmaxDemo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useScaling}
                    onChange={(e) => {
                      setUseScaling(e.target.checked)
                      handleTokenClick()
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Use √d_k Scaling</span>
                </label>
                <span className="text-xs text-gray-400">d_k = {dK}</span>
              </div>

              <div className="bg-black/30 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-2">
                    {useScaling ? `Scaled Scores (÷ √${dK} = ÷ ${Math.sqrt(dK).toFixed(1)})` : 'Raw QK^T Scores (Unscaled)'}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {(useScaling ? scaledScores : rawScores).map((score, i) => (
                      <div key={i} className="px-3 py-1 bg-blue-500/20 rounded text-sm font-mono">
                        {score.toFixed(1)}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-2">After Softmax (Probabilities sum to 1.0)</p>
                  <div className="space-y-2">
                    {(useScaling ? scaledSoftmax : unscaledSoftmax).map((prob, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-mono w-12">Token {i+1}</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-6 relative overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${prob * 100}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-full rounded-full ${
                              prob > 0.5 ? 'bg-red-600' : prob > 0.2 ? 'bg-yellow-600' : 'bg-green-600'
                            }`}
                          >
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold">
                              {(prob * 100).toFixed(1)}%
                            </span>
                          </motion.div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  useScaling ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'
                }`}>
                  <p className="text-sm font-semibold mb-2">
                    {useScaling ? '✅ Healthy Distribution' : '❌ Saturated!'}
                  </p>
                  <p className="text-xs text-gray-300">
                    {useScaling
                      ? 'Attention is distributed across tokens. Gradients can flow during training. Model can learn subtle relationships.'
                      : 'Almost all weight on 1-2 tokens! Gradients near zero. Model gets stuck. This is why scaling is critical.'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
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
