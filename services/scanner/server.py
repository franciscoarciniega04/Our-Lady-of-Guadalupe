"""Private scanner. ClamAV is a separate service with current signature updates.
No files are persisted. Deploy behind TLS, private ingress, and request limits.
"""
import os, json, hmac, socket, struct
from http.server import HTTPServer, BaseHTTPRequestHandler
import magic

MAX_BYTES = 50 * 1024 * 1024
ALLOWED = {'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm'}
TOKEN = os.environ['FILE_SCANNER_TOKEN']
CLAMD_HOST = os.environ['CLAMD_HOST']

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Never log headers, tokens, or file contents.

    def reply(self, status, body):
        raw = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        self.connection.settimeout(30)
        if not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + TOKEN):
            return self.reply(401, {'clean': False})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= MAX_BYTES:
                return self.reply(413, {'clean': False})
            data = self.rfile.read(length)
            if len(data) != length:
                return self.reply(400, {'clean': False})
            mime = magic.from_buffer(data, mime=True)
            if mime not in ALLOWED or mime != self.headers.get('Content-Type'):
                return self.reply(400, {'clean': False, 'mime': mime})
            with socket.create_connection((CLAMD_HOST, int(os.getenv('CLAMD_PORT', '3310'))), timeout=30) as clam:
                clam.sendall(b'zINSTREAM\0')
                for start in range(0, len(data), 65536):
                    chunk = data[start:start+65536]
                    clam.sendall(struct.pack('!I', len(chunk)) + chunk)
                clam.sendall(struct.pack('!I', 0))
                result = b''
                while b'\0' not in result and len(result) < 4096:
                    part = clam.recv(4096)
                    if not part:
                        break
                    result += part
            clean = result.rstrip(b'\0\n') == b'stream: OK'
            return self.reply(200 if clean else 400, {'clean': clean, 'mime': mime})
        except Exception:
            return self.reply(503, {'clean': False})

HTTPServer(('0.0.0.0', 8080), Handler).serve_forever()
