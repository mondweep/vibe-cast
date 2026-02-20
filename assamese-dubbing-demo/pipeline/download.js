/**
 * Audio Download Utility
 *
 * Downloads audio from URLs for pipeline processing:
 *   - YouTube URLs: extracted via yt-dlp
 *   - Direct audio/video URLs: fetched directly
 *
 * Returns a Buffer suitable for Sarvam STT.
 */

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch/,
  /youtu\.be\//,
  /youtube\.com\/shorts/,
  /youtube\.com\/embed/,
];

function isYouTubeUrl(url) {
  return YOUTUBE_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Download audio from a URL into a Buffer.
 *
 * @param {string} url - YouTube URL or direct audio/video URL
 * @returns {Promise<{ buffer: Buffer, filename: string, duration: number|null }>}
 */
async function downloadAudio(url) {
  if (isYouTubeUrl(url)) {
    return await downloadFromYouTube(url);
  }
  return await downloadFromDirectUrl(url);
}

/**
 * Extract audio from YouTube using yt-dlp.
 * Downloads as WAV (16kHz mono) for optimal STT compatibility.
 */
function downloadFromYouTube(url) {
  return new Promise((resolve, reject) => {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `yt_audio_${Date.now()}.wav`);

    const args = [
      '--no-playlist',
      '--no-check-certificates',
      '--remote-components', 'ejs:github',
      '--extract-audio',
      '--audio-format', 'wav',
      '--postprocessor-args', 'ffmpeg:-ar 16000 -ac 1',
      '--max-filesize', '50m',
      '--output', tmpFile,
      url,
    ];

    // Pass proxy to yt-dlp if set
    const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
    if (proxy) {
      args.unshift('--proxy', proxy);
    }

    // Add deno to PATH if available
    const env = { ...process.env };
    if (fs.existsSync('/root/.deno/bin/deno')) {
      env.PATH = `/root/.deno/bin:${env.PATH}`;
    }

    execFile('yt-dlp', args, { timeout: 120000, env }, (error, stdout, stderr) => {
      if (error) {
        // Clean up temp file on error
        try { fs.unlinkSync(tmpFile); } catch {}
        reject(new Error(`YouTube download failed: ${error.message}`));
        return;
      }

      try {
        const buffer = fs.readFileSync(tmpFile);
        fs.unlinkSync(tmpFile); // Clean up

        resolve({
          buffer,
          filename: 'youtube_audio.wav',
          duration: null, // Could parse from yt-dlp output if needed
        });
      } catch (readErr) {
        reject(new Error(`Failed to read downloaded audio: ${readErr.message}`));
      }
    });
  });
}

/**
 * Download audio from a direct URL via fetch.
 */
async function downloadFromDirectUrl(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download from URL (${response.status}): ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Determine filename from URL or content-type
  const urlPath = new URL(url).pathname;
  const ext = path.extname(urlPath) || guessExtension(contentType);
  const filename = `download_${Date.now()}${ext}`;

  return { buffer, filename, duration: null };
}

function guessExtension(contentType) {
  if (contentType.includes('wav')) return '.wav';
  if (contentType.includes('mp3') || contentType.includes('mpeg')) return '.mp3';
  if (contentType.includes('ogg')) return '.ogg';
  if (contentType.includes('flac')) return '.flac';
  if (contentType.includes('mp4') || contentType.includes('m4a')) return '.m4a';
  if (contentType.includes('webm')) return '.webm';
  return '.wav';
}

module.exports = { downloadAudio, isYouTubeUrl };
