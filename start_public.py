#!/usr/bin/env python3
"""
SchoolHeat Public Access Launcher
=================================
One-click script to make your SchoolHeat app accessible from ANYWHERE.
Supports: ngrok, Cloudflare Tunnel, localtunnel

Usage:
    python start_public.py

This will:
1. Start the bridge server on your laptop
2. Create a public tunnel URL
3. Print a QR code judges can scan
4. Keep everything running
"""

import os, sys, subprocess, time, json, socket, threading, urllib.request

BRIDGE_PORT = 5000

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

def print_banner():
    print("""
╔══════════════════════════════════════════════════════════════╗
║           🌡️  SCHOOLHEAT PUBLIC ACCESS LAUNCHER              ║
║                                                              ║
║   Make your app accessible from ANYWHERE in the world!      ║
╚══════════════════════════════════════════════════════════════╝
""")

def print_qr_terminal(url):
    """Print a simple ASCII QR code in terminal"""
    try:
        import qrcode
        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.make()
        qr.print_ascii(invert=True)
    except ImportError:
        print(f"\n🔗 URL: {url}")
        print("   (Install 'qrcode' for ASCII QR: pip install qrcode[pil])\n")

def check_tool(name, command):
    """Check if a tunnel tool is installed"""
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=5)
        return result.returncode == 0 or name in result.stdout.lower()
    except Exception:
        return False

def start_ngrok(port):
    """Start ngrok tunnel"""
    print("\n🚀 Starting ngrok tunnel...")
    print("   (Free ngrok: URL changes every restart)")

    # Try to get existing authtoken
    ngrok_path = os.path.expanduser("~/.ngrok2/ngrok.yml")
    if not os.path.exists(ngrok_path):
        print("\n⚠️  Ngrok requires a free authtoken.")
        print("   1. Go to https://dashboard.ngrok.com/signup")
        print("   2. Copy your authtoken")
        print("   3. Run: ngrok config add-authtoken YOUR_TOKEN")
        print("   4. Then run this script again\n")
        return None

    proc = subprocess.Popen(
        ["ngrok", "http", str(port), "--log=stdout"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )

    # Wait for URL
    public_url = None
    for _ in range(30):
        time.sleep(1)
        try:
            with urllib.request.urlopen("http://127.0.0.1:4040/api/tunnels") as resp:
                data = json.loads(resp.read())
                for tunnel in data.get("tunnels", []):
                    if tunnel.get("public_url"):
                        public_url = tunnel["public_url"]
                        break
            if public_url:
                break
        except Exception:
            pass

    if public_url:
        return {"url": public_url, "proc": proc, "type": "ngrok"}
    return None

def start_cloudflare(port):
    """Start Cloudflare Tunnel (free, permanent URL possible)"""
    print("\n🚀 Starting Cloudflare Tunnel...")
    print("   (Free & permanent URL with cloudflared)")

    proc = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", f"http://localhost:{port}"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )

    public_url = None
    for _ in range(30):
        time.sleep(1)
        try:
            line = proc.stdout.readline()
            if "https://" in line and "trycloudflare.com" in line:
                # Extract URL
                parts = line.split()
                for part in parts:
                    if part.startswith("https://") and "trycloudflare.com" in part:
                        public_url = part.strip()
                        break
            if public_url:
                break
        except Exception:
            pass

    if public_url:
        return {"url": public_url, "proc": proc, "type": "cloudflare"}
    return None

def start_localtunnel(port):
    """Start localtunnel (free, no signup needed)"""
    print("\n🚀 Starting LocalTunnel...")
    print("   (Free, no signup, but less reliable)")

    proc = subprocess.Popen(
        ["npx", "localtunnel", "--port", str(port)],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )

    public_url = None
    for _ in range(30):
        time.sleep(1)
        try:
            line = proc.stdout.readline()
            if "your url is:" in line.lower():
                public_url = line.split("is:")[-1].strip()
                break
        except Exception:
            pass

    if public_url:
        return {"url": public_url, "proc": proc, "type": "localtunnel"}
    return None

def start_bridge_server(port, arduino_port=None):
    """Start the bridge server"""
    print(f"\n🔌 Starting Bridge Server on port {port}...")

    env = os.environ.copy()
    if arduino_port:
        env["ARDUINO_PORT"] = arduino_port

    # Check if bridge_server.py exists
    if not os.path.exists("bridge_server.py"):
        print("❌ bridge_server.py not found in current folder!")
        print("   Make sure you're in the SchoolHeat_TUKLAS folder.")
        return None

    proc = subprocess.Popen(
        [sys.executable, "bridge_server.py", "--host", "0.0.0.0", "--port", str(port)],
        env=env,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )

    # Wait a moment for server to start
    time.sleep(2)

    # Check if it's running
    if proc.poll() is None:
        return proc
    else:
        print("❌ Bridge server failed to start!")
        return None

def print_access_info(public_url, local_ip):
    print("\n" + "="*60)
    print("  🎉 SCHOOLHEAT IS NOW PUBLIC! 🎉")
    print("="*60)
    print(f"\n🔗 PUBLIC URL (share this):")
    print(f"   {public_url}")
    print(f"\n🏠 LOCAL URL (same network):")
    print(f"   http://{local_ip}:{BRIDGE_PORT}")
    print(f"\n📱 Anyone in the world can now:")
    print("   • Open the URL in their phone browser")
    print("   • Scan the QR code below")
    print("   • Add to Home Screen (PWA install)")
    print("   • See live Arduino data in real-time")
    print("\n📋 FOR YOUR BOOTH POSTER:")
    print(f"   Public URL: {public_url}")
    print("\n⚠️  IMPORTANT:")
    print("   • Keep this window open — closing it stops the server")
    print("   • The URL is temporary (changes when you restart)")
    print("   • For a permanent URL, see PUBLIC_ACCESS_GUIDE.txt")
    print("="*60 + "\n")

    print_qr_terminal(public_url)

def main():
    print_banner()

    local_ip = get_local_ip()
    print(f"📡 Local IP detected: {local_ip}")

    # Check for Arduino port argument
    arduino_port = None
    if len(sys.argv) > 1 and sys.argv[1].startswith("COM"):
        arduino_port = sys.argv[1]
        print(f"🔌 Arduino port: {arduino_port}")

    # Start bridge server
    bridge_proc = start_bridge_server(BRIDGE_PORT, arduino_port)
    if not bridge_proc:
        print("\n❌ Could not start bridge server. Exiting.")
        return

    print("✅ Bridge server running!")

    # Detect available tunnel tools
    tools = []
    if check_tool("ngrok", ["ngrok", "version"]):
        tools.append("ngrok")
    if check_tool("cloudflared", ["cloudflared", "version"]):
        tools.append("cloudflare")
    if check_tool("npx", ["npx", "--version"]):
        tools.append("localtunnel")

    if not tools:
        print("\n⚠️  No tunnel tools found!")
        print("\n📥 Install one of these (free):")
        print("   1. ngrok:      https://ngrok.com/download")
        print("   2. Cloudflare: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/")
        print("   3. Node.js:    https://nodejs.org (for localtunnel)")
        print("\n   See PUBLIC_ACCESS_GUIDE.txt for detailed setup.")
        print(f"\n🏠 For now, use same-network access:")
        print(f"   http://{local_ip}:{BRIDGE_PORT}")
        return

    print(f"\n🔧 Available tunnel tools: {', '.join(tools)}")

    # Try tools in order of preference
    tunnel = None
    for tool in ["cloudflare", "ngrok", "localtunnel"]:
        if tool in tools:
            if tool == "cloudflare":
                tunnel = start_cloudflare(BRIDGE_PORT)
            elif tool == "ngrok":
                tunnel = start_ngrok(BRIDGE_PORT)
            elif tool == "localtunnel":
                tunnel = start_localtunnel(BRIDGE_PORT)

            if tunnel:
                break

    if not tunnel:
        print("\n❌ Could not start any tunnel!")
        print(f"\n🏠 Use same-network access: http://{local_ip}:{BRIDGE_PORT}")
        return

    # Print access info
    print_access_info(tunnel["url"], local_ip)

    # Save URL to file for poster
    with open("PUBLIC_URL.txt", "w") as f:
        f.write(tunnel["url"])
    print("💾 URL saved to PUBLIC_URL.txt (for QR poster)")

    # Keep running
    print("\n⏳ Server is running. Press Ctrl+C to stop.\n")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down...")
        tunnel["proc"].terminate()
        bridge_proc.terminate()
        print("✅ Servers stopped. Goodbye!")

if __name__ == "__main__":
    main()
