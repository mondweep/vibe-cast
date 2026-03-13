import { useProgress } from '../contexts/learning/hooks/useProgress'
import { Flame, BookOpen, Music, TrendingUp, Download } from 'lucide-react'
import { FAMILIARITY_THRESHOLDS } from '../shared/lib/constants'

export function ProgressPage() {
  const progress = useProgress()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-100 mb-1">Progress</h2>
        <p className="text-gray-400 text-sm">Your Sanskrit learning journey</p>
      </div>

      {/* Streak and top-level stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Flame className="text-orange-400" size={20} />}
          value={progress.streak}
          label="Day streak"
        />
        <StatCard
          icon={<BookOpen className="text-amber-400" size={20} />}
          value={progress.totalWords}
          label="Words learned"
        />
        <StatCard
          icon={<Music className="text-purple-400" size={20} />}
          value={progress.songsPlayed}
          label="Songs played"
        />
        <StatCard
          icon={<TrendingUp className="text-green-400" size={20} />}
          value={progress.masteredWords}
          label="Mastered"
        />
      </div>

      {/* Familiarity distribution */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Vocabulary Breakdown</h3>
        <div className="space-y-3">
          <FamiliarityBar
            label="New"
            count={progress.distribution.new}
            total={progress.totalWords}
            color="bg-red-500"
          />
          <FamiliarityBar
            label="Recognized"
            count={progress.distribution.recognized}
            total={progress.totalWords}
            color="bg-amber-500"
          />
          <FamiliarityBar
            label="Known"
            count={progress.distribution.known}
            total={progress.totalWords}
            color="bg-blue-500"
          />
          <FamiliarityBar
            label="Mastered"
            count={progress.distribution.mastered}
            total={progress.totalWords}
            color="bg-green-500"
          />
        </div>
      </div>

      {/* Recent songs */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Recent Songs</h3>
        {progress.recentSongs.length === 0 ? (
          <p className="text-gray-500 text-sm">No songs played yet</p>
        ) : (
          <ul className="space-y-2">
            {progress.recentSongs.map((song) => (
              <li key={song.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-300">{song.title || 'Untitled'}</span>
                <span className="text-gray-500">{song.wordsLearned} words</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Export */}
      <button
        onClick={progress.handleExportCSV}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-amber-400 transition-colors"
      >
        <Download size={16} />
        Export vocabulary as CSV
      </button>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 flex flex-col items-center gap-1">
      {icon}
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function FamiliarityBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400 w-24">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-gray-500 w-12 text-right">{count}</span>
    </div>
  )
}
