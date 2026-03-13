import type { LyricsLine } from '../../../shared/types/database.types'

export function findCurrentLineIndex(lines: LyricsLine[], currentTime: number): number {
  if (lines.length === 0) return -1

  // Binary search for efficiency with long lyric sets
  let low = 0
  let high = lines.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const line = lines[mid]

    if (currentTime >= line.start_time && currentTime < line.end_time) {
      return mid
    } else if (currentTime < line.start_time) {
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  return -1
}

export function getUpcomingLines(lines: LyricsLine[], currentIndex: number, count: number): LyricsLine[] {
  if (currentIndex < 0) return lines.slice(0, count)
  return lines.slice(currentIndex, currentIndex + count)
}
