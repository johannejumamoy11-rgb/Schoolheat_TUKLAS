from PIL import Image
import os

# Convert your school logo PNG to ICO
input_path = "icons/icon-192.png"
output_path = "icons/icon-192.ico"

if not os.path.exists(input_path):
    # Try the download.png file
    input_path = "download.png"
    output_path = "icons/icon-192.ico"

print(f"Converting {input_path} -> {output_path}")

img = Image.open(input_path)
# ICO supports multiple sizes, but 192x192 is fine
img.save(output_path, format="ICO", sizes=[(192, 192)])

print(f"Done! Created: {output_path}")
