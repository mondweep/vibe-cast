import { useState } from 'react'
import { Search } from 'lucide-react'

interface URLInputProps {
  onVideoSelect: (videoId: string) => void
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function URLInput({ onVideoSelect }: URLInputProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const videoId = extractVideoId(url.trim())
    if (videoId) {
      onVideoSelect(videoId)
    } else {
      setError('Please enter a valid YouTube URL')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube URL of a Sanskrit song..."
          className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>
      <button
        type="submit"
        className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        Play
      </button>
      {error && <p className="absolute mt-14 text-sm text-red-400">{error}</p>}
    </form>
  )
}
