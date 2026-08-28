import flet as ft
import os
import sys
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socketserver

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
from bridge_server import app as flask_app, serial_reader, find_arduino_port
import bridge_server as bs

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args): pass
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

def find_free_port():
    with socketserver.TCPServer(("127.0.0.1", 0), lambda *a: None) as s:
        return s.server_address[1]

def start_static_server(port, directory):
    os.chdir(directory)
    httpd = HTTPServer(("127.0.0.1", port), QuietHandler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

def start_bridge(port, serial_port, baud, csv_file):
    bs.csv_file = csv_file
    bs.serial_running = True
    threading.Thread(target=serial_reader, args=(serial_port, baud, csv_file), daemon=True).start()
    threading.Thread(target=lambda: flask_app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False), daemon=True).start()

def main(page: ft.Page):
    page.title = "SchoolHeat"
    page.theme_mode = ft.ThemeMode.LIGHT
    page.window_width = 550
    page.window_height = 480
    page.window_resizable = False
    page.theme = ft.Theme(color_scheme_seed="#d9534f", use_material3=True)
    page.padding = 30

    # === START SERVERS ===
    static_port = find_free_port()
    bridge_port = find_free_port()
    start_static_server(static_port, BASE_DIR)

    csv_path = os.path.join(BASE_DIR, "schoolheat_data.csv")
    bridge_status = "Checking..."
    status_color = ft.colors.GREY

    try:
        detected = find_arduino_port()
        if detected:
            start_bridge(bridge_port, detected, 9600, csv_path)
            bridge_status = f"Arduino connected on {detected}"
            status_color = ft.colors.GREEN
        else:
            bridge_status = "Manual mode (no Arduino detected)"
            status_color = ft.colors.ORANGE
    except Exception as e:
        bridge_status = f"Bridge offline: {e}"
        status_color = ft.colors.RED

    app_url = f"http://127.0.0.1:{static_port}/index.html"

    # === UI ===
    status_text = ft.Text(bridge_status, color=status_color, weight=ft.FontWeight.BOLD, size=14)
    url_text = ft.Text(app_url, selectable=True, size=13)
    info_text = ft.Text("Ready to launch.", size=12, color=ft.colors.ON_SURFACE_VARIANT)

    def open_browser(e):
        webbrowser.open(app_url)
        info_text.value = "Opened in your default browser!"
        page.update()

    def copy_url(e):
        page.set_clipboard(app_url)
        info_text.value = "URL copied to clipboard!"
        page.update()

    page.add(
        ft.Column(
            [
                ft.Image(src="icons/icon-192.png", width=90, height=90, fit=ft.ImageFit.CONTAIN),
                ft.Text("SchoolHeat", size=34, weight=ft.FontWeight.BOLD, color=ft.colors.PRIMARY),
                ft.Text("Heat Index Monitoring System", size=15, color=ft.colors.ON_SURFACE_VARIANT),
                ft.Divider(height=30),

                ft.Container(
                    content=ft.Column([
                        ft.Text("SERVER STATUS", size=11, weight=ft.FontWeight.W_500, color=ft.colors.ON_SURFACE_VARIANT),
                        status_text,
                    ], spacing=4),
                    padding=15,
                    border_radius=10,
                    bgcolor=ft.colors.SURFACE_VARIANT,
                    width=400,
                ),

                ft.Container(height=15),
                ft.Text("APP URL", size=11, weight=ft.FontWeight.W_500, color=ft.colors.ON_SURFACE_VARIANT),
                ft.Container(content=url_text, padding=10, border_radius=6, bgcolor=ft.colors.SURFACE, width=400),

                ft.Container(height=20),
                ft.Row(
                    [
                        ft.ElevatedButton(
                            "Open in Browser",
                            icon=ft.icons.OPEN_IN_BROWSER,
                            on_click=open_browser,
                            style=ft.ButtonStyle(bgcolor=ft.colors.PRIMARY, color=ft.colors.ON_PRIMARY),
                            height=45,
                        ),
                        ft.OutlinedButton(
                            "Copy URL",
                            icon=ft.icons.COPY,
                            on_click=copy_url,
                            height=45,
                        ),
                    ],
                    spacing=12,
                    alignment=ft.MainAxisAlignment.CENTER,
                ),

                ft.Container(height=10),
                info_text,
                ft.Container(height=15),
                ft.Text(
                    "Keep this window open while using SchoolHeat.",
                    size=11,
                    italic=True,
                    color=ft.colors.ON_SURFACE_VARIANT,
                ),
            ],
            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            spacing=8,
            expand=True,
        )
    )

ft.app(target=main, assets_dir="assets")