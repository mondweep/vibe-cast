// YouTube Data API proxy routes
// Handles OAuth token management and API calls

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

export async function getPlaylists(accessToken: string) {
  const response = await fetch(
    `${YOUTUBE_API_BASE}/playlists?part=snippet,contentDetails&mine=true&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) throw new Error('Failed to fetch playlists')
  return response.json()
}

export async function getPlaylistItems(playlistId: string, accessToken: string) {
  const response = await fetch(
    `${YOUTUBE_API_BASE}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) throw new Error('Failed to fetch playlist items')
  return response.json()
}

export async function getVideoDetails(videoId: string, apiKey: string) {
  const response = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
  )

  if (!response.ok) throw new Error('Failed to fetch video details')
  return response.json()
}

export async function getCaptionTracks(videoId: string, apiKey: string) {
  const response = await fetch(
    `${YOUTUBE_API_BASE}/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
  )

  if (!response.ok) throw new Error('Failed to fetch captions')
  return response.json()
}
