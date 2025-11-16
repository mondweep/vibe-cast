# YouTube Download Process - Visual Flow Diagram

## How Downloads Work (Normal Case) ✓

```
┌────────────────────────────────────────────────────────────────┐
│ 1. User requests video                                         │
│    youtube_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ" │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. yt-dlp fetches video page                                   │
│    HTML response: Contains jsUrl + metadata                    │
│    jsUrl = "/s/player/abc12def/player.js"                     │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. Extract streaming formats                                   │
│    Parse JSON from initial data                                │
│    Get signatureCipher (encrypted URLs)                        │
│                                                                │
│    signatureCipher = "s=AQAD...XYZ&sp=sig&url=..."            │
│    jsUrl = "/s/player/abc12def/player.js"                     │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. Download JavaScript player                                  │
│    GET /s/player/abc12def/player.js                           │
│    Response: 2.5 MB minified JavaScript                        │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. Extract signature algorithm                                 │
│    Parse minified code                                         │
│    Find: var Rva = function(a) { a = a.reverse(); ... }       │
│                                                                │
│    Algorithm extracted:                                        │
│    1. Reverse array                                            │
│    2. Slice(3)                                                 │
│    3. Swap indices                                             │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 6. Execute signature algorithm                                 │
│    Input: sig = "AQAD...XYZ"                                  │
│                                                                │
│    Run: Rva("AQAD...XYZ")                                     │
│         → Reverse string                                       │
│         → Slice first 3                                        │
│         → Swap positions                                       │
│                                                                │
│    Output: valid_sig = "WXYZ321...DAQA"                       │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 7. Build valid streaming URL                                   │
│    base = "https://r1---sn-xxx.googlevideo.com/videoplayback" │
│    url += "?sq=..."                                            │
│    url += "&sig=" + "WXYZ321...DAQA"  ← VALID SIGNATURE      │
│                                                                │
│    Final URL: https://r1---sn-xxx.googlevideo.com/...?sig=... │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 8. Download video stream                                       │
│    curl -H "Range: bytes=0-" \                                 │
│      "https://r1---sn-xxx.googlevideo.com/...?sig=WXYZ..."   │
│                                                                │
│    HTTP 206: Partial Content                                   │
│    ✓ Streaming begins                                          │
│    ✓ Save to file                                              │
│    ✓ Success!                                                  │
└────────────────────────────────────────────────────────────────┘
```

## How Downloads Fail (Your Case) ✗

```
┌────────────────────────────────────────────────────────────────┐
│ 1. User requests video                                         │
│    youtube_url = "https://www.youtube.com/watch?v=BGXpfTGThrw" │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. yt-dlp fetches video page                                   │
│    HTML response: Contains jsUrl + metadata                    │
│    jsUrl = "/s/player/xyz98765/player.js"                     │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. Extract streaming formats                                   │
│    ✓ Parse JSON from initial data                              │
│    ✓ Get signatureCipher (encrypted)                           │
│    ✓ Get jsUrl                                                 │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. Download JavaScript player                                  │
│    GET /s/player/xyz98765/player.js                           │
│    Response: 2.8 MB minified JavaScript                        │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. Extract signature algorithm                                 │
│    Try regex patterns...                                       │
│    Try: var [a-zA-Z_$]=[a-zA-Z_$]\.split\(\"\"\);            │
│    Try: [a-zA-Z_$]\.reverse\(\)                               │
│    Try: Multiple patterns...                                   │
│                                                                │
│    ✗ Pattern 1: No match                                       │
│    ✗ Pattern 2: No match                                       │
│    ✗ Pattern 3: No match                                       │
│    (YouTube changed the algorithm!)                            │
│                                                                │
│    WARNING: Could not extract descrambler function             │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 6. Fallback: Try JavaScript runtime                            │
│    Check: node? (Installed ✓)                                  │
│    Check: java? (Not installed)                                │
│    Check: js2py? (Installed ✓)                                 │
│                                                                │
│    Try: Execute with node                                      │
│    ✗ Failed: Node can't parse extracted code                  │
│                                                                │
│    Try: Execute with js2py                                     │
│    ✗ Failed: js2py too limited for YouTube code               │
│                                                                │
│    Try: Browser cookies                                        │
│    ✗ Failed: No browser available in codespace               │
│                                                                │
│    WARNING: [youtube] Signature solving failed                 │
│    WARNING: Some formats may be missing                        │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 7. Use available formats (images only)                         │
│    Only formats without signature protection:                  │
│                                                                │
│    ID  EXT   RESOLUTION  FPS  │ PROTO │ VCODEC  INFO         │
│    ──────────────────────────────────────────────────          │
│    sb2 mhtml 48x27        0   │ mhtml │ images  storyboard   │
│    sb1 mhtml 80x45        1   │ mhtml │ images  storyboard   │
│    sb0 mhtml 160x90       1   │ mhtml │ images  storyboard   │
│                                                                │
│    WARNING: Only images are available for download             │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 8. Check requested format (best[ext=m4a])                      │
│    No audio formats available                                  │
│    No video formats available                                  │
│    Only image formats (not requested)                          │
│                                                                │
│    ERROR: [youtube] Requested format not available             │
│    ERROR: Use --list-formats for list of formats              │
└────────────────────────────────────────────────────────────────┘
```

## Why Node.js Doesn't Help

```
┌──────────────────────────────────────┐
│ Node.js IS installed                 │
│ $ which node                          │
│ /usr/bin/node                         │
│ $ node --version                      │
│ v18.19.1                              │
│ ✓ All present                         │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│ BUT: yt-dlp doesn't auto-detect it properly         │
│                                                      │
│ yt-dlp looks for:                                    │
│ 1. Browser via --cookies-from-browser (✗ no GUI)   │
│ 2. Cached signature algorithm (✗ outdated)          │
│ 3. Node.js via exec (✗ incomplete code)            │
│ 4. js2py fallback (✗ too limited)                   │
│                                                      │
│ Result: Falls through to "None found"               │
└──────────────────────────────────────────────────────┘
```

## The Blocked Signature Chain

```
YouTube Updates Player
        │
        ▼
    New Algorithm
        │
        ├─────────────────────────────────┐
        │                                 │
        ▼                                 ▼
  yt-dlp Tries          Your Codespace Tries
  Multiple                   to use:
  Extraction               1. Browser (✗ none)
  Patterns:                2. Node.js (✗ broken)
  1. Regex A (✗)          3. js2py (✗ limited)
  2. Regex B (✗)          4. Java (✗ missing)
  3. Regex C (✗)
  4. Regex D (✗)            Result: All fail
  5. Generic (✗)
  
    Result: No
    match
        │
        ├─────────────────────────────────┐
        │                                 │
        ▼                                 ▼
    ✓ Known format detected   ✗ Signature not solved
    (storyboard images)       (No valid URL)
        │                         │
        ▼                         ▼
    Limited download         ✗ Download blocked
    (images only)            ✗ ERROR: Format not available
```

## Signature Algorithm Components

```
Encrypted Signature: "AQAD1234EFGH5678IJKL9012MNOP3456"
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Step 1: Reverse     │
                    │ "6543210PNOM2101... │
                    └────────────┬────────┘
                                 │
                                 ▼
                    ┌─────────────────────┐
                    │ Step 2: Slice(3)    │
                    │ "3210PNOM2101..."   │
                    └────────────┬────────┘
                                 │
                                 ▼
                    ┌─────────────────────┐
                    │ Step 3: Swap        │
                    │ indices [0] <-> [50]│
                    └────────────┬────────┘
                                 │
                                 ▼
                    ┌─────────────────────┐
                    │ Step 4: Swap        │
                    │ indices [0] <-> [74]│
                    └────────────┬────────┘
                                 │
                                 ▼
                    ┌─────────────────────┐
                    │ Step 5: ...         │
                    │ (more operations)   │
                    └────────────┬────────┘
                                 │
                                 ▼
          Valid Signature: "WXYZ321DAQA..."
                      │
                      ▼
          ✓ YouTube validates
          ✓ Sends video stream
          ✓ Download succeeds
```

## Your Codespace Environment

```
┌─────────────────────────────────────────────────────────┐
│ Codespace (Headless Linux Container)                    │
│                                                         │
│ ✓ yt-dlp 2025.11.12 - Latest                           │
│ ✓ FFmpeg - Installed                                    │
│ ✓ Node.js 18.19.1 - Installed                          │
│ ✓ Python 3.12.1 - Latest                               │
│ ✓ Internet - Full access                               │
│                                                         │
│ BUT:                                                    │
│                                                         │
│ ✗ No Browser GUI (X11/Wayland)                         │
│ ✗ No Display Server                                    │
│ ✗ No Chrome/Firefox                                    │
│ ✗ Node.js not auto-detected by yt-dlp                  │
│ ✗ js2py has limitations                                │
│                                                         │
│ Result: Signature solving impossible                   │
└─────────────────────────────────────────────────────────┘

 vs.

┌─────────────────────────────────────────────────────────┐
│ Local Machine (Your Laptop/Desktop)                     │
│                                                         │
│ ✓ yt-dlp 2025.11.12 - Latest                           │
│ ✓ FFmpeg - Installed                                    │
│ ✓ Browser - Chrome/Firefox/Safari                       │
│ ✓ X11/Wayland - Display server available               │
│ ✓ JavaScript runtime - In browser                       │
│                                                         │
│ Result: Signature solving WORKS ✓                      │
│ Downloads work perfectly                               │
└─────────────────────────────────────────────────────────┘
```

## Solution Flow

```
┌─ Local Machine ─────────┐
│                          │
│ 1. Open Browser         │
│    (Chrome loaded)      │
│                          │
│ 2. Download video       │
│    yt-dlp --cookies...  │
│    ✓ Browser running    │
│    ✓ JavaScript works   │
│    ✓ Signature solved   │
│    ✓ Video downloads    │
│                          │
│ 3. Get audio file       │
│    song.wav (36MB)      │
│                          │
└────────────┬────────────┘
             │
             │ SCP / Upload
             │
             ▼
┌─ Codespace ─────────────────┐
│                              │
│ /workspaces/vibe-cast/audio/ │
│ ├── song.wav                │
│                              │
│ ✓ Audio ready for           │
│   voice isolation            │
│ ✓ Ready for translation      │
│ ✓ Ready for vibe-cast        │
│                              │
└──────────────────────────────┘
```

---

**Key Takeaway:** The signature solver isn't missing a tool—it's missing a JavaScript runtime with browser integration. The local machine solution works because browsers have full JavaScript engines built-in.
