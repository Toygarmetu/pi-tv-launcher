#!/usr/bin/env python3
"""TV Launcher yerel sunucusu — yalnızca Python standart kütüphanesi.

Görevleri:
  * web/ klasörünü (launcher arayüzü) servis eder
  * /api/config      : config.json (+ config.local.json) birleşimi
  * /api/info        : telefon kumandası adresi vb.
  * /api/media       : medya klasörlerini gezme (klasör/video listesi)
  * /media/stream    : video akışı (HTTP Range destekli, ileri/geri sarma için)
  * /media/subtitle  : .srt -> WebVTT dönüştürme
  * /api/events      : Server-Sent Events (telefondan gelen URL / tuş komutları)
  * /api/open, /api/key : telefon sayfasının (/remote) gönderdiği komutlar

Mac'te: python3 server/server.py   — Pi'de de aynı (python3 hazır gelir).
"""
import json
import mimetypes
import os
import queue
import re
import socket
import sys
import threading
import time
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(ROOT, "web")

VIDEO_EXT = {".mp4", ".m4v", ".webm", ".mkv", ".mov", ".ogv"}
SUB_EXT = (".vtt", ".srt")

mimetypes.add_type("video/mp4", ".m4v")
mimetypes.add_type("video/x-matroska", ".mkv")
mimetypes.add_type("text/javascript", ".js")


# --------------------------------------------------------------------------- config

def _merge(base, extra):
    for k, v in extra.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            _merge(base[k], v)
        else:
            base[k] = v
    return base


def load_config():
    with open(os.path.join(ROOT, "config.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    local = os.environ.get("TVL_CONFIG", os.path.join(ROOT, "config.local.json"))
    if os.path.exists(local):
        with open(local, encoding="utf-8") as f:
            _merge(cfg, json.load(f))
    return cfg


CONFIG = load_config()


def media_roots():
    roots = []
    for d in CONFIG.get("mediaDirs", []):
        path = os.path.realpath(os.path.expanduser(d["path"]))
        roots.append({"name": d.get("name") or os.path.basename(path), "path": path})
    return roots


def resolve_media_path(rel):
    """'<kök-index>/<göreli yol>' -> gerçek dosya yolu. Kök dışına çıkışı engeller."""
    idx, _, sub = (rel or "").partition("/")
    roots = media_roots()
    if not idx.isdigit() or int(idx) >= len(roots):
        return None, None
    root = roots[int(idx)]["path"]
    full = os.path.realpath(os.path.join(root, sub))
    if full != root and not full.startswith(root + os.sep):
        return None, None
    return root, full


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))  # paket gönderilmez, sadece yerel arayüz seçilir
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


# --------------------------------------------------------------------------- events (SSE)

class EventBus:
    def __init__(self):
        self._subs = set()
        self._lock = threading.Lock()

    def subscribe(self):
        q = queue.Queue(maxsize=100)
        with self._lock:
            self._subs.add(q)
        return q

    def unsubscribe(self, q):
        with self._lock:
            self._subs.discard(q)

    def publish(self, event):
        with self._lock:
            subs = list(self._subs)
        for q in subs:
            try:
                q.put_nowait(event)
            except queue.Full:
                pass
        return len(subs)


BUS = EventBus()

YT_ID = re.compile(
    r"(?:youtube\.com/(?:watch\?(?:.*&)?v=|shorts/|live/|embed/)|youtu\.be/)([A-Za-z0-9_-]{11})")


def normalize_url(text):
    text = (text or "").strip()
    if not text:
        return None
    if not re.match(r"^[a-z][a-z0-9+.-]*://", text, re.I):
        text = "https://" + text
    if not text.lower().startswith(("http://", "https://")):
        return None
    return text


# --------------------------------------------------------------------------- srt -> vtt

def read_text(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp1254", "latin-1"):  # Türkçe altyazılar çoğu zaman cp1254
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", "replace")


def srt_to_vtt(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"(\d{2}:\d{2}:\d{2}),(\d{3})", r"\1.\2", text)
    return "WEBVTT\n\n" + text


# --------------------------------------------------------------------------- handler

class Handler(SimpleHTTPRequestHandler):
    server_version = "TVLauncher/0.1"

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=WEB_DIR, **kw)

    def log_message(self, fmt, *args):
        if "--verbose" in sys.argv:
            super().log_message(fmt, *args)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # ----- helpers
    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 64 * 1024:
            return {}
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            return {}

    # ----- routing
    def do_GET(self):
        url = urlparse(self.path)
        qs = parse_qs(url.query)
        p = url.path
        if p == "/api/config":
            global CONFIG
            CONFIG = load_config()  # config.json değişikliği için sunucuyu yeniden başlatmaya gerek yok
            return self.send_json(CONFIG)
        if p == "/api/info":
            port = self.server.server_address[1]
            return self.send_json({"remoteUrl": f"http://{lan_ip()}:{port}/remote"})
        if p == "/api/media":
            return self.api_media(qs.get("path", [""])[0])
        if p == "/media/stream":
            return self.stream_file(qs.get("path", [""])[0])
        if p == "/media/subtitle":
            return self.subtitle(qs.get("path", [""])[0])
        if p == "/api/events":
            return self.sse()
        if p in ("/remote", "/remote/"):
            self.path = "/remote.html"
        return super().do_GET()

    def do_POST(self):
        p = urlparse(self.path).path
        data = self.read_json()
        if p == "/api/open":
            url = normalize_url(data.get("url"))
            if not url:
                return self.send_json({"ok": False, "error": "Geçersiz adres"}, 400)
            m = YT_ID.search(url)
            n = BUS.publish({"type": "open", "url": url, "youtubeId": m.group(1) if m else None})
            return self.send_json({"ok": True, "receivers": n})
        if p == "/api/key":
            key = data.get("key")
            if key not in {"up", "down", "left", "right", "ok", "back", "home", "playpause"}:
                return self.send_json({"ok": False}, 400)
            return self.send_json({"ok": True, "receivers": BUS.publish({"type": "key", "key": key})})
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    # ----- media listing
    def api_media(self, rel):
        roots = media_roots()
        if not rel:
            items = [{"name": r["name"], "type": "dir", "path": f"{i}/",
                      "missing": not os.path.isdir(r["path"])} for i, r in enumerate(roots)]
            return self.send_json({"path": "", "title": "Videolar", "items": items})
        root, full = resolve_media_path(rel)
        if not full or not os.path.isdir(full):
            return self.send_json({"error": "Klasör bulunamadı"}, 404)
        idx = rel.split("/", 1)[0]
        base = os.path.relpath(full, root)
        base = "" if base == "." else base + "/"
        dirs, videos = [], []
        try:
            names = sorted(os.listdir(full), key=str.casefold)
        except OSError as e:
            return self.send_json({"error": str(e)}, 500)
        name_set = set(names)
        for name in names:
            if name.startswith("."):
                continue
            fp = os.path.join(full, name)
            rp = f"{idx}/{base}{name}"
            if os.path.isdir(fp):
                dirs.append({"name": name, "type": "dir", "path": rp + "/"})
                continue
            stem, ext = os.path.splitext(name)
            if ext.lower() not in VIDEO_EXT:
                continue
            subs = [f"{idx}/{base}{stem}{s}" for s in SUB_EXT if stem + s in name_set]
            try:
                size = os.path.getsize(fp)
            except OSError:
                size = 0
            videos.append({"name": stem, "file": name, "type": "video", "path": rp,
                           "size": size, "subtitles": subs})
        title = os.path.basename(full) if base else roots[int(idx)]["name"]
        parts = rel.rstrip("/").split("/")
        parent = "" if len(parts) == 1 else "/".join(parts[:-1]) + "/"
        return self.send_json({"path": rel, "title": title, "parent": parent, "items": dirs + videos})

    # ----- streaming with Range
    def stream_file(self, rel):
        _, full = resolve_media_path(rel)
        if not full or not os.path.isfile(full):
            return self.send_error(HTTPStatus.NOT_FOUND)
        size = os.path.getsize(full)
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        start, end = 0, size - 1
        rng = self.headers.get("Range")
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            if not m:
                return self.send_error(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
            if m.group(1):
                start = int(m.group(1))
                if m.group(2):
                    end = min(int(m.group(2)), size - 1)
            elif m.group(2):  # son N bayt
                start = max(0, size - int(m.group(2)))
            if start >= size:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.end_headers()
                return
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            self.send_response(200)
        length = end - start + 1
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        self.end_headers()
        try:
            with open(full, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = f.read(min(512 * 1024, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass  # oynatıcı sarma yaptığında bağlantıyı keser — normal

    def subtitle(self, rel):
        _, full = resolve_media_path(rel)
        if not full or not os.path.isfile(full) or not full.lower().endswith(SUB_EXT):
            return self.send_error(HTTPStatus.NOT_FOUND)
        text = read_text(full)
        if full.lower().endswith(".srt"):
            text = srt_to_vtt(text)
        body = text.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/vtt; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # ----- server-sent events
    def sse(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        q = BUS.subscribe()
        try:
            self.wfile.write(b"retry: 2000\n\n")
            self.wfile.flush()
            while True:
                try:
                    ev = q.get(timeout=15)
                    msg = "data: " + json.dumps(ev, ensure_ascii=False) + "\n\n"
                except queue.Empty:
                    msg = ": ping\n\n"
                self.wfile.write(msg.encode("utf-8"))
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            BUS.unsubscribe(q)


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    host = CONFIG.get("server", {}).get("host", "0.0.0.0")
    port = int(os.environ.get("TVL_PORT") or CONFIG.get("server", {}).get("port", 8080))
    httpd = Server((host, port), Handler)
    print(f"TV Launcher: http://localhost:{port}   (telefon: http://{lan_ip()}:{port}/remote)")
    for r in media_roots():
        print(f"  medya: {r['name']:<16} {r['path']}{'' if os.path.isdir(r['path']) else '  (yok)'}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
