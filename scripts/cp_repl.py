#!/usr/bin/env python3
"""Minimal CircuitPython raw-REPL client (the C6 has no CIRCUITPY drive).

  cp_repl.py exec 'print(1+1)'
  cp_repl.py get  code.py  [local]
  cp_repl.py put  local    [remote]
  cp_repl.py ls
"""
import base64
import glob
import sys
import time

import serial


def port():
    ports = glob.glob("/dev/cu.usbmodem*")
    if not ports:
        sys.exit("no /dev/cu.usbmodem* device found")
    return ports[0]


class Repl:
    def __init__(self):
        self.s = serial.Serial(port(), 115200, timeout=0.5)
        self.s.dtr = True
        self.s.write(b"\r\x03\x03")  # interrupt running code.py
        for _ in range(4):
            time.sleep(0.6)
            self.s.reset_input_buffer()
            self.s.write(b"\x01")  # raw REPL
            try:
                self._read_until(b"raw REPL; CTRL-B to exit\r\n>", 2)
                return
            except TimeoutError:
                self.s.write(b"\x03")
        raise TimeoutError("could not enter raw REPL")

    def _read_until(self, marker, timeout):
        buf, end = b"", time.time() + timeout
        while time.time() < end:
            buf += self.s.read(4096)
            if buf.endswith(marker) or marker in buf:
                return buf
        raise TimeoutError(f"waiting for {marker!r}, got {buf[-200:]!r}")

    def exec(self, code, timeout=15):
        self.s.write(code.encode() + b"\x04")
        out = self._read_until(b"\x04>", timeout)
        out = out.split(b"OK", 1)[1]
        body = out.split(b"\x04")
        stdout, stderr = body[0], body[1] if len(body) > 1 else b""
        if stderr:
            raise RuntimeError(stderr.decode(errors="replace"))
        return stdout.decode(errors="replace")

    def close(self, reload=False):
        self.s.write(b"\x02")  # leave raw REPL
        if reload:
            self.s.write(b"\x04")  # soft reload -> runs code.py
        self.s.close()


def main():
    cmd, args = sys.argv[1], sys.argv[2:]
    r = Repl()
    try:
        if cmd == "exec":
            print(r.exec(args[0]), end="")
        elif cmd == "ls":
            print(r.exec("import os\nfor f in os.listdir('/'): print(f, os.stat('/'+f)[6])"), end="")
        elif cmd == "get":
            out = r.exec(f"import binascii\nprint(binascii.b2a_base64(open('{args[0]}','rb').read()).decode())")
            data = base64.b64decode(out.strip())
            open(args[1] if len(args) > 1 else args[0], "wb").write(data)
            print(f"got {len(data)} bytes")
        elif cmd == "put":
            data = open(args[0], "rb").read()
            dest = args[1] if len(args) > 1 else args[0].split("/")[-1]
            r.exec(f"f=open('{dest}','wb')")
            for i in range(0, len(data), 256):
                r.exec(f"import binascii;f.write(binascii.a2b_base64('{base64.b64encode(data[i:i+256]).decode()}'))")
            r.exec("f.close()")
            print(f"put {len(data)} bytes -> {dest}")
    finally:
        r.close(reload=(cmd == "put"))


if __name__ == "__main__":
    main()
