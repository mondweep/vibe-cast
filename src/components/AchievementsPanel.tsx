import { motion } from 'framer-motion'
import { X, Lock } from 'lucide-react'
import { useGameStore } from '../store/gameStore'

interface AchievementsPanelProps {
  onClose: () => void
}

export default function AchievementsPanel({ onClose }: AchievementsPanelProps) {
  const { achievements } = useGameStore()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full border border-white/10 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Achievements</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid gap-4">
          {achievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`
                p-4 rounded-xl border transition-all
                ${achievement.unlocked
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50'
                  : 'bg-white/5 border-white/10 opacity-50'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{achievement.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{achievement.title}</h3>
                    {!achievement.unlocked && <Lock className="w-4 h-4 text-gray-500" />}
                  </div>
                  <p className="text-sm text-gray-400">{achievement.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-white/5 rounded-lg">
          <p className="text-sm text-gray-400 text-center">
            Unlocked: {achievements.filter(a => a.unlocked).length} / {achievements.length}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
