# YouTube Signature Algorithm - Practical Example

## What Actually Happens

### Step 1: YouTube Sends Encrypted Data

When you load a YouTube video page, the server response includes:

```javascript
// Embedded in the initial data JSON:
{
  "streamingData": {
    "formats": [
      {
        "itag": 22,  // format ID
        "url": "https://r1---sn-xxx.googlevideo.com/videoplayback?...",
        "signatureCipher": "s=AQAD...XYZ123&sp=sig&url=...",  // ENCRYPTED!
        "mimeType": "video/mp4; codecs=\"avc1.64001F, mp4a.40.2\"",
        "bitrate": 2500000,
        "width": 1280,
        "height": 720,
        "lastModified": "1699999999999",
        "fps": 30,
        "qualityLabel": "720p"
      }
      // ... more formats
    ]
  },
  "jsUrl": "/s/player/abc12def/player.js"  // KEY: Player script location
}
```

The problem: The `signatureCipher` contains an encrypted signature (`s=AQAD...`).

### Step 2: Extract the Player JavaScript

yt-dlp fetches the player from the `jsUrl`:

```
GET https://www.youtube.com/s/player/abc12def/player.js HTTP/1.1

Response: (2-5 MB of minified JavaScript)

// Simplified excerpt from the actual player:
var Rva=function(a){
  a=a.split("");
  a=a.slice(3);
  a=a.reverse();
  var b=a[0];
  a[0]=a[50];
  a[50]=b;
  b=a[0];
  a[0]=a[74];
  a[74]=b;
  return a.join("")
};
```

### Step 3: Find the Descrambler Function

yt-dlp searches the player code for patterns like:

```javascript
// Pattern to find signature function
var [a-zA-Z_$]=[a-zA-Z_$]\.split\(\"\"\);
// Typical descrambler function:
[a-zA-Z_$]\.reverse\(\)
```

The actual function might look like:

```javascript
function Rva(a) {
    a = a.split("");
    // Step 1: Slice (remove first 3 characters)
    a = a.slice(3);
    // Step 2: Reverse
    a = a.reverse();
    // Step 3: Swap positions
    var b = a[0];
    a[0] = a[50];
    a[50] = b;
    // More swaps...
    b = a[0];
    a[0] = a[74];
    a[74] = b;
    return a.join("");
}
```

### Step 4: Execute the Function

yt-dlp runs the extracted function with the encrypted signature:

```python
# Python-side, after extracting the JavaScript function:

encrypted_sig = "AQAD...XYZ123"  # From signatureCipher

# If using Node.js runtime:
result = subprocess.run([
    'node', '-e',
    f"console.log((function(a){{a=a.split('');a=a.slice(3);a=a.reverse();...}})('{encrypted_sig}')"
], capture_output=True)

valid_signature = result.stdout.strip()
# Result: "WXYZ321...DAQA"  (decrypted)
```

### Step 5: Build Valid URL

```python
# Reconstruct the valid streaming URL:

base_url = "https://r1---sn-xxx.googlevideo.com/videoplayback?"
params = {
    'sq': '...',
    'rn': '...',
    'rbuf': '0',
    'sig': valid_signature,  # ← NOW VALID!
}

valid_url = base_url + urllib.parse.urlencode(params)
# Now you can download from this URL!
```

### Step 6: Download the Stream

```bash
curl "https://r1---sn-xxx.googlevideo.com/videoplayback?...&sig=WXYZ321..." \
  -o video_stream.m4v
```

## Why It's Complex

### Real JavaScript Player Excerpt (Actual YouTube Code)

```javascript
// This is what YouTube actually sends (2.5+ MB minified):
var Rva = function(a) {
    a = a.split("");
    Ly4(a, 47);
    a = a.reverse();
    Ly4(a, 1);
    Fsh(a, 74);
    Fsh(a, 1);
    Ly4(a, 26);
    return a.join("")
};

var Ly4 = function(a, b) {
    var c = a[0];
    a[0] = a[b % a.length];
    a[b] = c
};

var Fsh = function(a, b) {
    a.splice(-b)
};
```

The algorithm includes:
- **Helper function calls** (not just inline operations)
- **Complex variable names** (single letters, purposely obscured)
- **Multiple transformations** (10-20+ operations)
- **Index calculations** (using modulo, arrays, etc.)

### Why YouTube Changes This Weekly

YouTube intentionally:
1. Renames functions (`Rva` → `Xyz` next week)
2. Reorders operations
3. Changes helper functions
4. Adds/removes operations
5. Updates player version

```
// Week 1
var Rva = function(a) { a = a.reverse(); Ly4(a, 47); ... }

// Week 2 (YouTube updates)
var Xyz = function(a) { Fsh(a, 26); a = a.reverse(); ... }

// yt-dlp needs to re-extract and re-implement!
```

## The Actual Error in Your Codespace

```
WARNING: [youtube] Signature solving failed
```

This happens because:

1. **yt-dlp tries to find the function:**
   ```python
   # Looking for pattern in JavaScript
   pattern = r'\.split\(\"\"\)\s*;\s*(\w+)\.reverse\(\)'
   match = regex.search(player_code)
   # ✓ Found: Rva = function(a) { ... }
   ```

2. **yt-dlp tries to extract the algorithm:**
   ```python
   # Parse the function body
   func_body = extract_function_body("Rva", player_code)
   # ✓ Got function body
   ```

3. **yt-dlp tries to execute it:**
   ```python
   # Try JavaScript runtime (fails - no node, no browser):
   result = run_javascript(func_body)
   # ✗ ERROR: No JavaScript runtime available
   
   # Try js2py fallback:
   result = js2py_execute(func_body)
   # ✗ ERROR: js2py can't parse complex YouTube code
   ```

4. **yt-dlp gives up:**
   ```
   WARNING: Signature solving failed
   ERROR: Only images available
   ```

## What We'd Need to Fix It

### Option A: Node.js Integration

```python
# yt-dlp would need to detect and use Node.js

import subprocess

def descramble_signature(sig, js_func_code):
    # Execute the function using Node.js
    js_code = f"""
    var descramble = {js_func_code};
    console.log(descramble('{sig}'));
    """
    
    result = subprocess.run(
        ['node', '-e', js_code],
        capture_output=True,
        timeout=10
    )
    
    if result.returncode == 0:
        return result.stdout.decode().strip()
    else:
        raise Exception(f"Node.js execution failed: {result.stderr}")
```

Issue: yt-dlp's Node.js support is incomplete/buggy.

### Option B: Browser Automation

```python
# Use Selenium or Puppeteer to run code in real browser

from selenium import webdriver

driver = webdriver.Chrome()
result = driver.execute_script(f"""
    return (function(a){{
        a = a.split('');
        a = a.reverse();
        // ... rest of algorithm
        return a.join('');
    }})('{sig}');
""")
```

Issue: Requires browser installation and X server in codespace.

### Option C: Pre-computed Algorithms

```python
# Cache the extracted algorithms

SIGNATURE_ALGORITHMS = {
    'abc12def': {  # Player version
        'function': 'Rva',
        'operations': [
            ('reverse',),
            ('slice', 3),
            ('swap', 50, 0),
            ('swap', 74, 0),
        ]
    }
}

def descramble_cached(sig, player_id):
    sig_array = list(sig)
    algo = SIGNATURE_ALGORITHMS[player_id]
    
    for op in algo['operations']:
        if op[0] == 'reverse':
            sig_array = sig_array[::-1]
        elif op[0] == 'slice':
            sig_array = sig_array[op[1]:]
        elif op[0] == 'swap':
            sig_array[op[1]], sig_array[op[2]] = sig_array[op[2]], sig_array[op[1]]
    
    return ''.join(sig_array)
```

Issue: YouTube updates player every week, cache becomes stale.

## Real-World Timing

### Timeline of a Download Failure

```
Monday 8:00 AM UTC: YouTube releases new player.js
    - New algorithm implemented
    - Old algorithm patterns don't match anymore

Monday 9:00 AM: User tries to download
    - yt-dlp uses cached algorithm from last week
    - Signature doesn't match YouTube's validation
    - ERROR: Signature verification failed

Tuesday 2:00 PM: yt-dlp developer notices
    - Checks GitHub issues
    - Confirms widespread signature failures
    - Starts debugging

Tuesday 6:00 PM: New algorithm extracted
    - Downloads YouTube player.js
    - Analyzes minified code
    - Identifies new pattern
    - Implements in yt-dlp source code

Wednesday 10:00 AM: Fix released
    - yt-dlp 2025.11.20 published
    - pip install --upgrade yt-dlp
    - Downloads work again

Friday: Process repeats...
```

## The YouTube Arms Race

**YouTube's Goal:** Stop automated downloads  
**yt-dlp's Goal:** Stay compatible  
**The Cycle:**

```
┌─────────────────────────────────────┐
│ YouTube updates player.js           │
│ (Changes signature algorithm)        │
└────────────────┬────────────────────┘
                 │
                 ▼
        ✗ Downloads fail
        ✗ Error: Signature solving failed
                 │
                 ▼
┌─────────────────────────────────────┐
│ yt-dlp developers extract new       │
│ algorithm from updated player.js    │
└────────────────┬────────────────────┘
                 │
                 ▼
        ✓ Fix published
        ✓ yt-dlp updated
        ✓ Downloads work again
                 │
                 ▼
        (Repeat every week)
```

## Current State (November 2025)

**yt-dlp Status:** Up to date (v2025.11.12)  
**YouTube Player:** Updated regularly  
**Your Environment:** Lacks JavaScript runtime  
**Result:** Downloads blocked for signature-protected videos

---

**The Lesson:** YouTube's signature system is intentionally complex and constantly changing. It's not a bug in yt-dlp; it's a deliberate security measure by YouTube to prevent mass downloading.
