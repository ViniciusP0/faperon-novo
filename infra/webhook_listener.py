#!/usr/bin/env python3
"""Recebe o webhook de push do GitHub e dispara infra/deploy.sh."""
import hashlib
import hmac
import json
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPLOY_SCRIPT = os.path.join(REPO_DIR, "infra", "deploy.sh")
SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "")
HOST = "127.0.0.1"
PORT = 9001
MAX_BODY_SIZE = 5 * 1024 * 1024  # payloads de push do GitHub não passam disso


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _reject(self, code):
        self.send_response(code)
        self.end_headers()

    def do_POST(self):
        if self.path != "/webhook":
            self._reject(404)
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            self._reject(400)
            return
        if length < 0:
            self._reject(400)
            return
        if length > MAX_BODY_SIZE:
            self._reject(413)
            return
        body = self.rfile.read(length)

        signature = self.headers.get("X-Hub-Signature-256", "")
        if not SECRET or not self._valid_signature(body, signature):
            self._reject(401)
            return

        event = self.headers.get("X-GitHub-Event", "")
        if event == "ping":
            self.send_response(200)
            self.end_headers()
            return

        if event != "push":
            self._reject(404)
            return

        try:
            payload = json.loads(body or b"{}")
        except json.JSONDecodeError:
            self._reject(400)
            return

        if payload.get("ref") != "refs/heads/main":
            self.send_response(200)
            self.end_headers()
            return

        subprocess.Popen([DEPLOY_SCRIPT], cwd=REPO_DIR, start_new_session=True)
        self.send_response(202)
        self.end_headers()

    def _valid_signature(self, body, signature):
        if not signature.startswith("sha256="):
            return False
        expected = hmac.new(SECRET.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(f"sha256={expected}", signature)


def main():
    if not SECRET:
        sys.stderr.write("GITHUB_WEBHOOK_SECRET nao configurado, abortando\n")
        sys.exit(1)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    sys.stderr.write(f"webhook listener em http://{HOST}:{PORT}/webhook\n")
    server.serve_forever()


if __name__ == "__main__":
    main()
