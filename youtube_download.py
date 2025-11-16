#!/usr/bin/env python3
"""
YouTube Audio Downloader with Signature Bypass
Attempts multiple methods to download YouTube audio
"""

import subprocess
import sys
import os
from pathlib import Path

def download_with_yt_dlp(url, cookies_file, output_dir):
    """Try downloading with yt-dlp using various strategies"""
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    strategies = [
        # Strategy 1: Try with cookies and android client (no signature needed)
        {
            'name': 'Android TV Client',
            'args': [
                'yt-dlp',
                '--cookies', cookies_file,
                '--extractor-args', 'youtube:player_client=android_tv',
                '-f', 'best[ext=m4a]/bestaudio',
                '-x', '--audio-format', 'wav',
                '--audio-quality', '192K',
                '-o', str(output_dir / '%(title)s.%(ext)s'),
                url
            ]
        },
        # Strategy 2: Try with cookies and web creator client
        {
            'name': 'Web Creator Client',
            'args': [
                'yt-dlp',
                '--cookies', cookies_file,
                '--extractor-args', 'youtube:player_client=web_creator',
                '-f', 'best[ext=m4a]/bestaudio',
                '-x', '--audio-format', 'wav',
                '--audio-quality', '192K',
                '-o', str(output_dir / '%(title)s.%(ext)s'),
                url
            ]
        },
        # Strategy 3: Try with best format selection (pre-merged)
        {
            'name': 'Best Pre-merged Format',
            'args': [
                'yt-dlp',
                '--cookies', cookies_file,
                '-f', 'b',
                '-x', '--audio-format', 'wav',
                '--audio-quality', '192K',
                '-o', str(output_dir / '%(title)s.%(ext)s'),
                url
            ]
        },
        # Strategy 4: Try without cookies (for public videos)
        {
            'name': 'Public Video (No Auth)',
            'args': [
                'yt-dlp',
                '-f', 'best[ext=m4a]/bestaudio',
                '-x', '--audio-format', 'wav',
                '--audio-quality', '192K',
                '-o', str(output_dir / '%(title)s.%(ext)s'),
                url
            ]
        }
    ]
    
    for strategy in strategies:
        print(f"\n📥 Trying: {strategy['name']}...")
        try:
            result = subprocess.run(
                strategy['args'],
                capture_output=True,
                text=True,
                timeout=180
            )
            
            if result.returncode == 0:
                print(f"✓ SUCCESS with {strategy['name']}!")
                return True
            else:
                if "100%" in result.stderr or "100%" in result.stdout:
                    print(f"✓ SUCCESS with {strategy['name']}!")
                    return True
                    
        except subprocess.TimeoutExpired:
            print(f"⏱️  Timeout with {strategy['name']}")
        except Exception as e:
            print(f"❌ Error with {strategy['name']}: {e}")
    
    return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 youtube_download.py <URL> [--cookies <path>] [--output <dir>]")
        sys.exit(1)
    
    url = sys.argv[1]
    cookies_file = 'cookies.txt'
    output_dir = './audio'
    
    # Parse optional arguments
    for i in range(2, len(sys.argv), 2):
        if sys.argv[i] == '--cookies' and i + 1 < len(sys.argv):
            cookies_file = sys.argv[i + 1]
        elif sys.argv[i] == '--output' and i + 1 < len(sys.argv):
            output_dir = sys.argv[i + 1]
    
    print("=" * 50)
    print("YouTube Audio Downloader")
    print("=" * 50)
    print(f"URL: {url}")
    print(f"Cookies: {cookies_file}")
    print(f"Output: {output_dir}")
    print()
    
    if download_with_yt_dlp(url, cookies_file, output_dir):
        print("\n" + "=" * 50)
        print("✓ Download completed successfully!")
        print("=" * 50)
        sys.exit(0)
    else:
        print("\n" + "=" * 50)
        print("❌ All download strategies failed")
        print("=" * 50)
        print("\nPossible solutions:")
        print("1. Refresh your cookies from your browser")
        print("2. Try with a different video URL")
        print("3. Install ffmpeg: sudo apt-get install ffmpeg")
        sys.exit(1)

if __name__ == '__main__':
    main()
