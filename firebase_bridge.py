#!/usr/bin/env python3
"""
SchoolHeat Firebase Bridge
Reads from Arduino and pushes data to Firebase Realtime Database.
This allows the app to be accessed from anywhere with a permanent URL.
"""

import sys
import time
import json
import argparse
import serial
import serial.tools.list_ports
import requests

# ===== CONFIG =====
# Replace this with your Firebase Database URL after setup
DEFAULT_FIREBASE_URL = "https://YOUR-PROJECT-default-rtdb.firebaseio.com"

# ===== SERIAL FUNCTIONS =====
def find_arduino_port():
    ports = list(serial.tools.list_ports.comports())
    for p in ports:
        if 'Arduino' in p.description or 'CH340' in p.description or 'USB-SERIAL' in p.description:
            return p.device
    for p in ports:
        if p.device in ['COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9']:
            return p.device
    return None

def connect_arduino(port=None, baudrate=9600):
    if port is None:
        port = find_arduino_port()
    if port is None:
        print("[ERROR] No Arduino found. Check USB connection.")
        return None
    try:
        arduino = serial.Serial(port, baudrate, timeout=2)
        time.sleep(2)
        print(f"[OK] Arduino connected on {port}")
        return arduino
    except Exception as e:
        print(f"[ERROR] Failed to connect: {e}")
        return None

# ===== FIREBASE FUNCTIONS =====
def push_to_firebase(firebase_url, temperature, humidity):
    """Push sensor data to Firebase Realtime Database."""
    url = f"{firebase_url}/readings/latest.json"
    data = {
        "temperature": temperature,
        "humidity": humidity,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "source": "arduino"
    }
    try:
        response = requests.put(url, json=data, timeout=10)
        if response.status_code == 200:
            print(f"[CLOUD] Pushed to Firebase: {temperature}C, {humidity}%")
            return True
        else:
            print(f"[ERROR] Firebase returned {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[ERROR] Firebase push failed: {e}")
        return False

def read_and_push(arduino, firebase_url, interval=5):
    """Main loop: read Arduino and push to Firebase."""
    print(f"[INFO] Starting Firebase bridge...")
    print(f"[INFO] Pushing to: {firebase_url}")
    print(f"[INFO] Reading every {interval} seconds")
    print("[INFO] Press Ctrl+C to stop\n")

    while True:
        try:
            if arduino and arduino.is_open:
                arduino.write(b'R')
                time.sleep(0.5)
                if arduino.in_waiting > 0:
                    line = arduino.readline().decode('utf-8', errors='ignore').strip()
                    if ',' in line:
                        parts = line.split(',')
                        if len(parts) >= 2:
                            temp = float(parts[0])
                            hum = float(parts[1])
                            push_to_firebase(firebase_url, temp, hum)
            else:
                # Simulation mode if no Arduino
                import random
                temp = round(30 + random.random() * 15, 1)
                hum = round(50 + random.random() * 30, 1)
                push_to_firebase(firebase_url, temp, hum)

            time.sleep(interval)
        except KeyboardInterrupt:
            print("\n[INFO] Stopping Firebase bridge...")
            break
        except Exception as e:
            print(f"[ERROR] Loop error: {e}")
            time.sleep(interval)

# ===== MAIN =====
def main():
    parser = argparse.ArgumentParser(description='SchoolHeat Firebase Bridge')
    parser.add_argument('--firebase-url', default=None, help='Firebase Database URL')
    parser.add_argument('--port', default=None, help='Arduino COM port')
    parser.add_argument('--baud', type=int, default=9600, help='Baud rate')
    parser.add_argument('--interval', type=int, default=5, help='Push interval in seconds')
    parser.add_argument('--simulate', action='store_true', help='Simulate data (no Arduino needed)')
    args = parser.parse_args()

    firebase_url = args.firebase_url or DEFAULT_FIREBASE_URL

    print("=" * 60)
    print("  SchoolHeat Firebase Bridge")
    print("  Pushes Arduino data to the cloud for global access")
    print("=" * 60)

    if "YOUR-PROJECT" in firebase_url:
        print("\n[WARNING] You need to set your Firebase URL!")
        print("[INFO] Edit this file and change DEFAULT_FIREBASE_URL")
        print("[INFO] Or use: --firebase-url https://your-project-default-rtdb.firebaseio.com")
        print("[INFO] See FIREBASE_SETUP.txt for instructions\n")
        return

    arduino = None
    if not args.simulate:
        arduino = connect_arduino(args.port, args.baud)
        if not arduino:
            print("[INFO] Falling back to simulation mode...")

    read_and_push(arduino, firebase_url, args.interval)

    if arduino:
        arduino.close()

if __name__ == '__main__':
    main()
