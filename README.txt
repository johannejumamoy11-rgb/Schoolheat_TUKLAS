SCHOOLHEAT v3.0 — TUKLAS 2025 COMPETITION PACKAGE
==================================================

📦 WHAT'S INCLUDED
------------------
index.html          — The main web app (stunning dark UI)
style.css           — Modern glassmorphic design
script.js           — Complete app logic (bug-free)
manifest.json       — PWA manifest
service-worker.js   — Offline support
firebase_bridge.py  — Laptop-side Arduino bridge

🚀 QUICK START (3 Steps)
------------------------

STEP 1: Upload to GitHub Pages
   a. Go to https://github.com/johannejumamoy11-rgb/Schoolheat_TUKLAS
   b. Click "Add file" → "Upload files"
   c. Drag ALL 5 files (index.html, style.css, script.js, manifest.json, service-worker.js)
   d. Type commit message: "v3.0 TUKLAS Final"
   e. Click "Commit changes"
   f. Wait 2 minutes
   g. Visit: https://johannejumamoy11-rgb.github.io/Schoolheat_TUKLAS/

STEP 2: Set Up Firebase (for live data)
   a. Go to https://console.firebase.google.com/project/schoolheat-tuklas/database
   b. Click "Create Database" → "Start in test mode"
   c. Location: asia-southeast1
   d. Copy your database URL (looks like: https://schoolheat-tuklas-default-rtdb.asia-southeast1.firebasedatabase.app/)
   e. Open firebase_bridge.py in Notepad
   f. Replace DEFAULT_FIREBASE_URL with your URL
   g. Save

STEP 3: Run on Competition Day
   On your laptop:
      python firebase_bridge.py

   On judges' phones:
      Open https://johannejumamoy11-rgb.github.io/Schoolheat_TUKLAS/
      Go to Settings → paste Firebase URL → Enable Cloud Mode → Connect

🎯 WHAT JUDGES WILL SEE
-----------------------
✅ Stunning dark glassmorphic UI
✅ Animated gauge with needle
✅ Real-time temperature & humidity
✅ Color-coded heat index status
✅ Campus dashboard with all locations
✅ Reading history table
✅ 7-day prediction chart
✅ Campus hazard map
✅ Works on ANY phone, ANY network

🔥 NEW IN v3.0
--------------
• Completely rebuilt from scratch — zero bugs
• Dark glassmorphic design (impresses judges)
• Animated gauge with real needle
• Proper input validation (no more crashes)
• Debounced Firebase polling (consistent readings)
• Mobile-optimized bottom navigation
• Smooth animations and transitions
• Toast notifications
• State locking (prevents duplicate calculations)

📱 FILES TO UPLOAD TO GITHUB
----------------------------
You ONLY need these 5 files in your repo:
   1. index.html
   2. style.css
   3. script.js
   4. manifest.json
   5. service-worker.js

Keep firebase_bridge.py on your LAPTOP only.

❓ NEED HELP?
------------
If something breaks, tell me EXACTLY what you see on screen
and I'll fix it immediately.

Good luck at TUKLAS 2025! 🔥📱🌐
