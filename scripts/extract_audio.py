"""
Audio Extraction from YouTube
Extracts audio from YouTube videos using yt-dlp
"""

import yt_dlp
import os
from pathlib import Path


def download_audio(youtube_url, output_path='./audio', cookies_file=None, no_playlist=False):
    """
    Download audio from YouTube URL

    Args:
        youtube_url: YouTube video URL
        output_path: Directory to save audio file
        cookies_file: Optional path to cookies.txt file for authentication
        no_playlist: If True, don't download the entire playlist

    Returns:
        Path to downloaded audio file or None if failed
    """
    output_path = Path(output_path)
    output_path.mkdir(parents=True, exist_ok=True)

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': str(output_path / '%(title)s.%(ext)s'),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
        'postprocessor_args': [
            '-ar', '44100',  # Sample rate
            '-ac', '2',      # Stereo
        ],
        'quiet': False,
        'no_warnings': False,
        'noplaylist': no_playlist,
    }

    # Add cookies if provided
    if cookies_file and os.path.exists(cookies_file):
        ydl_opts['cookiefile'] = cookies_file

    try:
        print(f"Downloading audio from: {youtube_url}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            filename = ydl.prepare_filename(info)
            base_filename = os.path.splitext(filename)[0]
            wav_filename = f"{base_filename}.wav"
            print(f"✓ Downloaded: {wav_filename}")
            return wav_filename
    except Exception as e:
        print(f"✗ Error downloading audio: {e}")
        return None


def main():
    """Example usage"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python extract_audio.py <youtube_url> [--cookies <path_to_cookies.txt>] [--no-playlist]")
        print("Example: python extract_audio.py https://www.youtube.com/watch?v=...")
        print("         python extract_audio.py https://www.youtube.com/watch?v=... --cookies cookies.txt")
        print("         python extract_audio.py https://www.youtube.com/watch?v=... --no-playlist")
        sys.exit(1)

    url = sys.argv[1]
    cookies_file = None
    no_playlist = False
    
    # Parse arguments
    for i in range(2, len(sys.argv)):
        if sys.argv[i] == '--cookies' and i + 1 < len(sys.argv):
            cookies_file = sys.argv[i + 1]
        elif sys.argv[i] == '--no-playlist':
            no_playlist = True

    audio_file = download_audio(url, cookies_file=cookies_file, no_playlist=no_playlist)

    if audio_file:
        print(f"\nSuccess! Audio saved to: {audio_file}")
    else:
        print("\nFailed to download audio")
        sys.exit(1)


if __name__ == "__main__":
    main()
