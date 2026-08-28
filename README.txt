================================================================================
  SCHOOLHEAT v2.0 - TUKLAS CLOUD EDITION
  Permanent URL + Wireless + Arduino Cloud Sync
================================================================================

QUICK START
-----------
1. Add your images to assets/ and icons/ folders
2. Install: pip install pyinstaller pillow pyserial flask flask-cors requests
3. Build: python build.py
4. Find app: dist/SchoolHeat.exe

FOR PERMANENT URL + WIRELESS
----------------------------
1. Deploy to GitHub Pages → see GITHUB_PAGES_SETUP.txt
2. Create Firebase DB → see FIREBASE_SETUP.txt  
3. Configure firebase_bridge.py with your Firebase URL
4. Run: python firebase_bridge.py
5. Judges open your GitHub URL on their phones
6. They see LIVE Arduino data from anywhere!

BACKUP OPTIONS
--------------
- No internet? → METHOD3_OFFLINE_SETUP.txt (USB tethering)
- No Firebase? → NGROK_SETUP_GUIDE.txt (temporary public URL)
- No Arduino? → Manual input mode works perfectly!

FILES
-----
index.html              Main app (with Firebase support)
style.css               Styling
script.js               App logic (with cloud mode)
manifest.json           PWA manifest
service-worker.js       Offline caching
bridge_server.py        Local Arduino bridge
firebase_bridge.py      Cloud Arduino bridge (pushes to Firebase)
desktop_app.py          Desktop launcher
build.py                Build script
QR_POSTER.html          Printable QR poster
GITHUB_PAGES_SETUP.txt  How to get permanent URL
FIREBASE_SETUP.txt      How to create free cloud database
PERMANENT_URL_GUIDE.txt Complete wireless setup guide
NGROK_SETUP_GUIDE.txt   Temporary public URL guide
METHOD3_OFFLINE_SETUP.txt  No-internet guide
README.txt              This file

GOOD LUCK AT TUKLAS!
================================================================================
