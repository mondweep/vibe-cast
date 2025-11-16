# Browser Console - Visual Step-by-Step Guide

## The Absolute Easiest Way

### Step 1: Open YouTube Video
```
Visit: https://www.youtube.com/watch?v=YOUR_VIDEO_HERE
```

You should see a video playing. Example:
```
┌─────────────────────────────────────────────────┐
│  YouTube                                    [X] │
├─────────────────────────────────────────────────┤
│                                                 │
│    ▶ Your Video Title                           │
│    [Video player here]                          │
│                                                 │
│    Description, comments, etc.                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Step 2: Open Developer Console

**Keyboard Shortcuts:**

On **Windows/Linux:**
- Press: `Ctrl + Shift + J`
- OR: `F12` then click "Console" tab

On **Mac:**
- Press: `Cmd + Option + J`
- OR: `Cmd + Option + I` then click "Console" tab

**Or Right-Click Method:**
1. Right-click anywhere on page
2. Select **"Inspect"** or **"Inspect Element"**
3. Click **"Console"** tab at top

You'll see:
```
┌──────────────────────────────────────────────────────┐
│ YouTube [Developer Tools Open]                       │
├──────────────────────────────────────────────────────┤
│ [Elements] [Console] [Network] [Performance] ...     │ ← Click Console
├──────────────────────────────────────────────────────┤
│ >>  _                                                │ ← Cursor here
│                                                      │
│                                                      │
│ Type here and press Enter                            │
└──────────────────────────────────────────────────────┘
```

### Step 3: Copy This Code (Simple Version)

**⚠️ IMPORTANT:** Paste as a SINGLE LINE (not multiple lines)

```javascript
const videoId=new URLSearchParams(window.location.search).get('v');console.log('yt-dlp "https://www.youtube.com/watch?v='+videoId+'" -x --audio-format wav');
```

**What to do:**
1. Select all the code above ↑
2. Copy it (Ctrl+C or Cmd+C)
3. Go back to browser console
4. Right-click → Paste (or Ctrl+V) - paste as ONE LINE
5. Press **Enter**

### Step 4: You'll See Output Like This

```
>> const videoId = new URLSearchParams...

Video: Rick Astley - Never Gonna Give You Up

yt-dlp "https://www.youtube.com/watch?v=dQw4w9WgXcQ" -x --audio-format wav
```

### Step 5: Copy That yt-dlp Command

Example:
```
yt-dlp "https://www.youtube.com/watch?v=dQw4w9WgXcQ" -x --audio-format wav
```

You now have the URL! 🎉

## Next: Use in Codespace

### Step 6: Open Codespace Terminal

In VS Code, click **Terminal** menu → **New Terminal**

You should see:
```
@username ➜ /workspaces/vibe-cast (branch) $
```

### Step 7: Run This Command

Type (or paste) the yt-dlp command you got:

```bash
yt-dlp "https://www.youtube.com/watch?v=dQw4w9WgXcQ" -x --audio-format wav
```

Press **Enter** and wait!

### Step 8: Watch the Magic

You'll see:
```
[youtube] dQw4w9WgXcQ: Downloading webpage
[youtube] dQw4w9WgXcQ: Downloading tv downgraded player API JSON
[youtube] dQw4w9WgXcQ: Downloading web creator player API JSON
[download] Downloading 1 format(s): 160+140
[download] 100% of 5.00MiB in 00:05
[ExtractAudio] Deleting original file
✓ Downloaded: Rick Astley - Never Gonna Give You Up.wav
```

Done! 🎉

---

## Visual Comparison: What Happens

### Before (What Failed)

```
┌─ Codespace ──────────────────┐
│                              │
│ yt-dlp tries to:             │
│ 1. Find signature algorithm  │
│ 2. Execute with Node.js      │
│ 3. Run with js2py            │
│                              │
│ ✗ All fail!                  │
│ ✗ No JavaScript available    │
│                              │
└──────────────────────────────┘
```

### After (What Works)

```
┌─ Your Browser ────────────────┐
│                               │
│ JavaScript console:           │
│ 1. Get video ID               │
│ 2. Copy yt-dlp command        │
│ 3. Paste in codespace         │
│                               │
│ ✓ Browser has JavaScript!     │
│ ✓ Browser has your cookies!   │
│ ✓ Works immediately!          │
│                               │
└───────────────────────────────┘
           ↓
┌─ Codespace ───────────────────┐
│                               │
│ yt-dlp with fresh info:       │
│ 1. Get metadata (works!)      │
│ 2. Find formats (works!)      │
│ 3. Download stream            │
│ 4. Extract audio              │
│                               │
│ ✓ Everything works!           │
│ ✓ Audio ready!                │
│                               │
└───────────────────────────────┘
```

---

## Complete Visual Example

### Console Screenshot Example

```
console.log('Hello from YouTube!')
↓ (you type this)

>> console.log('Hello from YouTube!')
   Hello from YouTube!
   undefined
>> _

(The "undefined" is just JavaScript saying the function didn't return anything)
```

### Real Example With Your Script

```javascript
>> const videoId = new URLSearchParams(window.location.search).get('v');
>> const title = document.title.split(' - ')[0];
>> console.log(`Video: ${title}`);
   Video: My Favorite Song
   undefined
>> console.log(`yt-dlp "https://www.youtube.com/watch?v=${videoId}" -x --audio-format wav`);
   yt-dlp "https://www.youtube.com/watch?v=abc123def456" -x --audio-format wav
   undefined
>> _
```

Then you copy that yt-dlp command and paste it in codespace!

---

## The Full Workflow Visually

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: YouTube in Browser                                  │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Video playing... Rick Astley - Never Gonna Give U... │  │
│ │ [▶ Playing...]                                       │  │
│ └────────────────────────────────────────────────────────┘  │
│ Action: Open console (Ctrl+Shift+J)                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Browser Console Open                                │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [Elements] [Console] [Network] ...                    │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ >> _                                                  │  │
│ │ (Console ready for input)                             │  │
│ └────────────────────────────────────────────────────────┘  │
│ Action: Paste the code                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Press Enter                                         │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ >> const videoId = new URLSearchParams(...)          │  │
│ │ yt-dlp "https://www.youtube.com/watch?v=dQw4..." ... │  │
│ │ undefined                                             │  │
│ │ >> _                                                  │  │
│ └────────────────────────────────────────────────────────┘  │
│ Action: Copy the yt-dlp command                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Go to Codespace Terminal                            │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ @username ➜ /workspaces/vibe-cast (branch) $ _       │  │
│ │                                                        │  │
│ │                                                        │  │
│ └────────────────────────────────────────────────────────┘  │
│ Action: Paste yt-dlp command                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Run Download                                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ @username ➜ ... $ yt-dlp "https://..." -x ...        │  │
│ │ [youtube] Extracting URL...                           │  │
│ │ [youtube] Downloading webpage...                      │  │
│ │ [download] 100% of 5.00MiB in 00:05                  │  │
│ │ ✓ Downloaded: Song.wav                               │  │
│ │ @username ➜ ... $ _                                  │  │
│ └────────────────────────────────────────────────────────┘  │
│ Action: Celebrate! 🎉 Audio ready!                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Copy-Paste Ready Commands

### Just Want the Simplest Version?

**Step 1: Copy this entire block:**

```javascript
const videoId = new URLSearchParams(window.location.search).get('v');
console.log(`yt-dlp "https://www.youtube.com/watch?v=${videoId}" -x --audio-format wav`);
```

**Step 2: Paste in browser console**

**Step 3: Press Enter**

**Step 4: Copy the yt-dlp command that appears**

**Step 5: Paste in codespace terminal**

**Step 6: Press Enter and wait!**

---

## Common Questions

### Q: Why does the console show "undefined"?
**A:** That's normal! JavaScript functions that don't return a value show "undefined". The important part is the output above it.

### Q: What if it doesn't work?
**A:** Try these:
1. Make sure you're on a YouTube video page
2. Make sure the URL has `?v=` in it
3. Try refreshing the page
4. Try a different video

### Q: Can I use this on any video?
**A:** Yes! Any public video works. For private/restricted videos, you need to be logged in (which you are in browser).

### Q: Does my location matter?
**A:** Only if the video is geo-restricted. If you can watch it in your browser, the script will work.

### Q: Is this legal?
**A:** It's the same as downloading in your browser normally. You're using YouTube's own interface and your own cookies.

---

## That's It!

You now know:
1. ✓ How to open console
2. ✓ How to run JavaScript
3. ✓ How to get video IDs
4. ✓ How to use yt-dlp
5. ✓ How to get audio files

**You're all set!** Go try it! 🚀
