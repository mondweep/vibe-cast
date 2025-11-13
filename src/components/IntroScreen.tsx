import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import Footer from './Footer'

interface IntroScreenProps {
  onStart: () => void
}

export default function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl w-full"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <Sparkles className="w-12 h-12 text-blue-400" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Vibe Cast
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-300 mb-8"
          >
            Standing Under the Machine: An Interactive Journey
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">What You'll Discover</h2>
          <p className="text-gray-300 mb-6 leading-relaxed">
            When a simple task reveals complex architecture beneath. This interactive experience
            shows you how AI coding assistants really work—not from documentation, but from behavior.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-blue-300">🎯 Vector Embeddings</h3>
              <p className="text-sm text-gray-400">
                See how words become numbers in high-dimensional space
              </p>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-purple-300">🔍 RAG Retrieval</h3>
              <p className="text-sm text-gray-400">
                Discover why retrieval systems favor complexity
              </p>
            </div>

            <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-pink-300">👁️ Attention Mechanisms</h3>
              <p className="text-sm text-gray-400">
                Watch how transformers decide what matters
              </p>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-green-300">🛠️ Tool Orchestration</h3>
              <p className="text-sm text-gray-400">
                Learn how MCP and LangChain work together
              </p>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-yellow-300">📚 Context Windows</h3>
            <p className="text-sm text-gray-400">
              Master the art of managing limited token budgets
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <button
            onClick={onStart}
            className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 flex items-center gap-3 mx-auto"
          >
            Begin Your Journey
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="text-sm text-gray-400 mt-4">
            Based on the article by Rodrigo Mazorra Blanco & Raghavendra Datta PALLETI
          </p>
        </motion.div>
      </motion.div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
