#!/usr/bin/env python3
"""
Local server for Word Smuggler.

Sets COOP/COEP so the page is cross-origin isolated, which lets llama.cpp's
WASM build use multiple threads (several times faster than the single-threaded
fallback you get on plain static hosting such as GitHub Pages).

Also supports HTTP Range requests, which matter when serving a local .gguf.

    python3 serve.py            # http://localhost:8000
    python3 serve.py 8080
"""
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Resource-Policy', 'cross-origin')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_head(self):
        """SimpleHTTPRequestHandler ignores Range; add minimal support."""
        rng = self.headers.get('Range')
        if not rng:
            return super().send_head()

        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()

        m = re.match(r'bytes=(\d+)-(\d*)', rng)
        if not m:
            return super().send_head()

        size = os.path.getsize(path)
        start = int(m.group(1))
        end = int(m.group(2)) if m.group(2) else size - 1
        end = min(end, size - 1)
        if start > end:
            self.send_error(416, 'Requested Range Not Satisfiable')
            return None

        f = open(path, 'rb')
        f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        # Hand back a bounded reader so copyfile() stops at `end`.
        return _Bounded(f, end - start + 1)


class _Bounded:
    def __init__(self, f, remaining):
        self.f, self.remaining = f, remaining

    def read(self, n=-1):
        if self.remaining <= 0:
            return b''
        if n is None or n < 0 or n > self.remaining:
            n = self.remaining
        data = self.f.read(n)
        self.remaining -= len(data)
        return data

    def close(self):
        self.f.close()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    root = os.path.dirname(os.path.abspath(__file__))
    srv = ThreadingHTTPServer(('0.0.0.0', port), partial(Handler, directory=root))
    print(f'Word Smuggler on http://localhost:{port}  (cross-origin isolated)')
    print('Serving from', root)
    srv.serve_forever()
