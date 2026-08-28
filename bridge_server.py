#!/usr/bin/env python3
"""
SchoolHeat Bridge Server
Connects Arduino DHT sensor to the web app.
Supports local, ngrok, and Firebase modes.
"""

import sys
import json
import time
import argparse
import serial
import serial.tools.list_ports
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins="*")

arduino = None
last_reading = {"temperature": None, "humidity": None, "timestamp": None}

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
    global arduino
    if port is None:
        port = find_arduino_port()
    if port is None:
        print("[ERROR] No Arduino found.")
        return False
    try:
        arduino = serial.Serial(port, baudrate, timeout=2)
        time.sleep(2)
        print(f"[OK] Arduino on {port}")
        return True
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

def read_sensor():
    global arduino, last_reading
    if arduino is None or not arduino.is_open:
        return last_reading
    try:
        arduino.write(b'R')
        time.sleep(0.5)
        if arduino.in_waiting > 0:
            line = arduino.readline().decode('utf-8', errors='ignore').strip()
            if ',' in line:
                parts = line.split(',')
                if len(parts) >= 2:
                    temp = float(parts[0])
                    hum = float(parts[1])
                    last_reading = {
                        "temperature": temp,
                        "humidity": hum,
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                    }
                    print(f"[DATA] {temp}C, {hum}%")
    except Exception as e:
        print(f"[ERROR] Read: {e}")
    return last_reading

@app.route('/api/status', methods=['GET'])
def api_status():
    return jsonify({
        "status": "ok",
        "arduino_connected": arduino is not None and arduino.is_open,
        "port": arduino.port if arduino else None,
        "last_reading": last_reading,
        "server_time": time.strftime("%Y-%m-%d %H:%M:%S")
    })

@app.route('/api/read', methods=['GET'])
def api_read():
    data = read_sensor()
    return jsonify(data)

@app.route('/api/history', methods=['GET'])
def api_history():
    return jsonify({"history": [last_reading] if last_reading["temperature"] else []})

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', default=None, help='Arduino COM port')
    parser.add_argument('--baud', type=int, default=9600)
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--flask-port', type=int, default=5000)
    parser.add_argument('--no-arduino', action='store_true')
    args = parser.parse_args()

    print("=" * 60)
    print("  SchoolHeat Bridge Server v2.0")
    print("=" * 60)

    if not args.no_arduino:
        connect_arduino(args.port, args.baud)
    else:
        print("[MODE] Simulation")
        last_reading["temperature"] = 35.0
        last_reading["humidity"] = 70.0

    print(f"\n[OK] Server: http://{args.host}:{args.flask_port}")
    print("=" * 60)
    app.run(host=args.host, port=args.flask_port, debug=False, threaded=True)

if __name__ == '__main__':
    main()
