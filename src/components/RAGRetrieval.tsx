import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Database, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react'
import { useGameStore } from '../store/gameStore'

interface Document {
  id: number
  title: string
  content: string
  type: 'complex' | 'simple'
  similarity: number
  frequency: number
}

const documents: Document[] = [
  {
    id: 1,
    title: 'Enterprise File Reorganization Architecture',
    content: 'Comprehensive multi-tier file reorganization system with microservices...',
    type: 'complex',
    similarity: 0.89,
    frequency: 1000
  },
  {
    id: 2,
    title: 'Advanced Refactoring Patterns',
    content: 'Implementing design patterns for large-scale code restructuring...',
    type: 'complex',
    similarity: 0.87,
    frequency: 850
  },
  {
    id: 3,
    title: 'Automated Document Management System',
    content: 'Building an automated system for document classification and reorganization...',
    type: 'complex',
    similarity: 0.85,
    frequency: 720
  },
  {
    id: 4,
    title: 'Hierarchical Content Structuring',
    content: 'Creating hierarchical structures with nested categories and cross-references...',
    type: 'complex',
    similarity: 0.83,
    frequency: 650
  },
  {
    id: 5,
    title: 'Making a Simple List',
    content: 'Just list the key concepts and put content under each. Simple.',
    type: 'simple',
    similarity: 0.62,
    frequency: 10
  },
  {
    id: 6,
    title: 'Basic File Organization',
    content: 'A straightforward approach: read file, identify sections, create list.',
    type: 'simple',
    similarity: 0.58,
    frequency: 8
  },
]

export default function RAGRetrieval() {
  const { addScore, unlockAchievement, completeLevel } = useGameStore()
  const [query, setQuery] = useState('')
  const [retrievedDocs, setRetrievedDocs] = useState<Document[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const handleSearch = () => {
    if (!query.trim()) return

    setIsSearching(true)
    setAttempts(attempts + 1)

    // Simulate search delay
    setTimeout(() => {
      // Sort by similarity score (complex docs have higher similarity)
      const sorted = [...documents]
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)

      setRetrievedDocs(sorted)
      setIsSearching(false)
      addScore(20)

      // Check if user searched for "simple" but got complex results
      if (query.toLowerCase().includes('simple') && sorted[0].type === 'complex') {
        if (attempts >= 2 && !completed) {
          setCompleted(true)
          unlockAchievement('rag-master')
          completeLevel('rag-retrieval')
          addScore(100)
        }
      }
    }, 1000)
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
          <h2 className="text-4xl font-bold mb-4">RAG Retrieval Simulator</h2>
          <p className="text-gray-300 text-lg">
            See why retrieval systems favor complexity over simplicity
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
            <Database className="w-8 h-8 text-purple-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold mb-3">How RAG Works</h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Retrieval-Augmented Generation (RAG) embeds your query and searches a vector database
                for similar documents. The ranking is based on:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>Cosine Similarity:</strong> How close the query vector is to document vectors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>Training Distribution:</strong> Complex solutions appear more frequently in training data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>Dense Clusters:</strong> Complex patterns form dense clusters in embedding space</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Search Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/20"
        >
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Try: 'simple file reorganization' or 'reorganize file'"
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <span>Search for "simple" to see why complexity wins in retrieval</span>
          </div>
        </motion.div>

        {/* Vector Database Stats */}
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h4 className="font-semibold">Training Distribution</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Complex Solutions:</span>
                <span className="text-blue-400 font-semibold">3,220 examples</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Simple Solutions:</span>
                <span className="text-red-400 font-semibold">18 examples</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '99%' }} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-5 h-5 text-purple-400" />
              <h4 className="font-semibold">Embedding Density</h4>
            </div>
            <p className="text-sm text-gray-300">
              Complex patterns form dense clusters in 1536-dimensional space. Simple solutions are
              scattered and sparse, making them harder to retrieve.
            </p>
          </motion.div>
        </div>

        {/* Retrieved Documents */}
        <AnimatePresence>
          {retrievedDocs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-semibold">Retrieved Documents (Top 3)</h3>
              {retrievedDocs.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`
                    p-4 rounded-xl border
                    ${doc.type === 'complex'
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-green-500/10 border-green-500/30'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{doc.title}</h4>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">
                        Similarity: <span className="text-white font-semibold">{doc.similarity.toFixed(2)}</span>
                      </span>
                      <span className={`
                        px-2 py-1 rounded text-xs font-semibold
                        ${doc.type === 'complex' ? 'bg-purple-600' : 'bg-green-600'}
                      `}>
                        {doc.type}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{doc.content}</p>
                  <p className="text-xs text-gray-500">
                    Training frequency: {doc.frequency} examples
                  </p>
                </motion.div>
              ))}

              {retrievedDocs[0]?.type === 'complex' && query.toLowerCase().includes('simple') && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-300 mb-1">The Revelation</h4>
                      <p className="text-sm text-gray-300">
                        You asked for "simple" but got complex solutions! This is exactly what happens
                        in AI systems. The embedding space has dense regions for complex solutions
                        (1000+ training examples) and sparse regions for simple ones (10 examples).
                        RAG retrieves based on similarity, not constraint satisfaction.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
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
                  You've discovered why RAG systems favor complexity: training distribution bias
                  encoded in the embedding space.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
