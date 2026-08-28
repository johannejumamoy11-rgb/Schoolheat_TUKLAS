#!/usr/bin/env python3
"""Desktop launcher - opens app in browser."""
import os, sys, webbrowser, threading
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8765

def start_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    HTTPServer(('127.0.0.1', PORT), SimpleHTTPRequestHandler).serve_forever()

def main():
    threading.Thread(target=start_server, daemon=True).start()
    url = f"http://127.0.0.1:{PORT}/index.html"
    print(f"Starting SchoolHeat on {url}")
    webbrowser.open(url)
    try:
        while True: import time; time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down..."); sys.exit(0)

if __name__ == '__main__':
    main()
