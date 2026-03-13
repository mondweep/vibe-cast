const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

export interface YouTubeVideo {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
}

export interface YouTubePlaylist {
  id: string
  title: string
  itemCount: number
  thumbnail: string
}

export async function fetchUserPlaylists(accessToken: string): Promise<YouTubePlaylist[]> {
  const response = await fetch(
    `${YOUTUBE_API_BASE}/playlists?part=snippet,contentDetails&mine=true&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await response.json()
  return (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.snippet.title,
    itemCount: item.contentDetails.itemCount,
    thumbnail: item.snippet.thumbnails?.default?.url || '',
  }))
}

export async function fetchPlaylistVideos(playlistId: string, accessToken: string): Promise<YouTubeVideo[]> {
  const response = await fetch(
    `${YOUTUBE_API_BASE}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await response.json()
  return (data.items || []).map((item: any) => ({
    id: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.default?.url || '',
    channelTitle: item.snippet.channelTitle,
  }))
}

export async function fetchCaptions(videoId: string): Promise<string | null> {
  // YouTube captions require OAuth or timedtext API
  // For MVP, try fetching auto-generated captions
  try {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/captions?part=snippet&videoId=${videoId}&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`
    )
    const data = await response.json()
    const sanskritTrack = data.items?.find(
      (item: any) => item.snippet.language === 'sa' || item.snippet.language === 'hi'
    )
    return sanskritTrack?.id || null
  } catch {
    return null
  }
}
