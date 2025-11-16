#!/usr/bin/env python3
"""
Download YouTube audio with cookies support
"""
import yt_dlp
import ssl
import certifi

# Disable SSL verification (for environments with proxy issues)
ssl._create_default_https_context = ssl._create_unverified_context

def download_audio(url, cookies_file='cookies.txt', output_dir='output/audio'):
    """Download audio from YouTube URL using cookies"""

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': f'{output_dir}/%(title)s.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
        'cookiefile': cookies_file,
        'nocheckcertificate': True,
        'verbose': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['web']
            }
        },
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"Downloading from: {url}")
            info = ydl.extract_info(url, download=True)
            print(f"\nSuccess! Downloaded: {info.get('title', 'Unknown')}")
            return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    url = "https://www.youtube.com/watch?v=4NjK4UMY7Iw"
    success = download_audio(url)
    exit(0 if success else 1)
