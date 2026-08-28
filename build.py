#!/usr/bin/env python3
"""Build SchoolHeat.exe using PyInstaller."""
import os, sys, subprocess

def main():
    print("Building SchoolHeat.exe...")
    print("Required: pip install pyinstaller pillow pyserial flask flask-cors requests")
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--name', 'SchoolHeat',
        '--onefile',
        '--windowed',
        '--add-data', 'index.html;.',
        '--add-data', 'manifest.json;.',
        '--add-data', 'service-worker.js;.',
        '--add-data', 'style.css;.',
        '--add-data', 'script.js;.',
        '--add-data', 'assets;assets',
        '--add-data', 'icons;icons',
        '--clean', '--noconfirm',
        'desktop_app.py'
    ]
    try:
        subprocess.check_call(cmd)
        print("\nSUCCESS! Find your app at: dist/SchoolHeat.exe")
    except subprocess.CalledProcessError as e:
        print(f"\nBUILD FAILED: {e}")
        print("Make sure all files are in the same folder.")

if __name__ == '__main__':
    main()
