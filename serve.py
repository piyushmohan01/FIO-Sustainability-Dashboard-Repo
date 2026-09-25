# serve.py
# Starts a local HTTP server from the project root directory.
# Required because fetch() in dashboard.js is blocked by the browser.
# Run from the fio_dashboard/ root: python serve.py

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    # Suppress per-request log lines to keep terminal readable.
    # Remove this override to restore request logging if debugging.
    def log_message(self, format, *args):
        pass

try:
    with socketserver.TCPServer(("", PORT), QuietHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"FIO Dashboard running at {url}")
        print("Press Ctrl+C to stop the server")
        webbrowser.open(url)
        httpd.serve_forever()
except OSError:
    print(f"Port {PORT} is already in use.")
    print("Either stop the existing server or change PORT in serve.py")
    sys.exit(1)
except KeyboardInterrupt:
    print("\nServer stopped")