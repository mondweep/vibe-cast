import { useEffect, useRef, useCallback } from 'react'
import { PLAYBACK_POLL_INTERVAL_MS } from '../../../shared/lib/constants'

declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: () => void
  }
}

interface YouTubePlayerProps {
  videoId: string
  onTimeUpdate: (time: number) => void
  onEnd: () => void
  onReady: () => void
}

export function YouTubePlayer({ videoId, onTimeUpdate, onEnd, onReady }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const intervalRef = useRef<number | null>(null)

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = window.setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        onTimeUpdate(playerRef.current.getCurrentTime())
      }
    }, PLAYBACK_POLL_INTERVAL_MS)
  }, [onTimeUpdate])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    const initPlayer = () => {
      if (!containerRef.current) return

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            onReady()
            startPolling()
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              startPolling()
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              stopPolling()
            } else if (event.data === window.YT.PlayerState.ENDED) {
              stopPolling()
              onEnd()
            }
          },
        },
      })
    }

    if (window.YT?.Player) {
      initPlayer()
    } else {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
      window.onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      stopPolling()
      playerRef.current?.destroy()
    }
  }, [videoId, onEnd, onReady, startPolling, stopPolling])

  return (
    <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
