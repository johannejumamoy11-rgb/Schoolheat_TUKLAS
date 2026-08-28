#!/usr/bin/env python3
"""
SchoolHeat ngrok Launcher
Creates a public URL so anyone can access your bridge server.
"""

import os
import sys
import time
import subprocess
import json
import urllib.request

def check_ngrok():
    """Check if ngrok is installed."""
    try:
        subprocess.run(['ngrok', 'version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def install_ngrok():
    """Download and install ngrok."""
    print("[INFO] ngrok not found. Downloading...")
    print("[INFO] Please download ngrok manually from: https://ngrok.com/download")
    print("[INFO] 1. Download the Windows ZIP")
    print("[INFO] 2. Extract ngrok.exe to this folder")
    print("[INFO] 3. Sign up at ngrok.com (free)")
    print("[INFO] 4. Run: ngrok config add-authtoken YOUR_TOKEN")
    print("[INFO] 5. Then run this script again")
    input("\nPress Enter to open ngrok.com in browser...")
    os.system("start https://ngrok.com/download")
    sys.exit(1)

def get_ngrok_url():
    """Get the public ngrok URL from the API."""
    try:
        with urllib.request.urlopen('http://localhost:4040/api/tunnels') as resp:
            data = json.loads(resp.read().decode())
            for tunnel in data['tunnels']:
                if tunnel['proto'] == 'https':
                    return tunnel['public_url']
    except Exception as e:
        print(f"[ERROR] Could not get ngrok URL: {e}")
    return None

def main():
    print("=" * 60)
    print("  SchoolHeat ngrok Launcher")
    print("  Creates a PUBLIC URL for cross-network access")
    print("=" * 60)

    if not check_ngrok():
        install_ngrok()

    # Check if bridge server is running
    print("\n[INFO] Starting ngrok tunnel to localhost:5000...")
    print("[INFO] This creates a public URL anyone can access!\n")

    # Start ngrok
    ngrok_proc = subprocess.Popen(
        ['ngrok', 'http', '5000'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
    )

    print("[WAIT] Waiting for ngrok to start...")
    time.sleep(4)

    # Get the public URL
    public_url = get_ngrok_url()

    if public_url:
        print("=" * 60)
        print("  SUCCESS! Your app is now PUBLIC!")
        print("=" * 60)
        print(f"\n  PUBLIC URL: {public_url}")
        print(f"\n  1. Open this URL on your phone (any network!)")
        print(f"  2. In app Settings, enter: {public_url}")
        print(f"  3. Judges can scan QR code with this URL")
        print(f"  4. Anyone in the world can access your app!")
        print("\n  Press Ctrl+C to stop ngrok")
        print("=" * 60)

        # Save URL to file for QR poster
        with open('ngrok_url.txt', 'w') as f:
            f.write(public_url)

        # Keep running
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[INFO] Stopping ngrok...")
            ngrok_proc.terminate()
    else:
        print("[ERROR] Could not get ngrok URL. Check if ngrok is running.")
        ngrok_proc.terminate()

if __name__ == '__main__':
    main()
