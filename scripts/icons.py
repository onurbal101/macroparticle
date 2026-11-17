"""Generate the original PWA icons. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw

Path('public/icons').mkdir(parents=True, exist_ok=True)
for size, filename in [(192, 'icon-192.png'), (512, 'icon-512.png'), (512, 'maskable-512.png')]:
    image = Image.new('RGB', (size, size), '#345247')
    draw = ImageDraw.Draw(image)
    unit = size / 512
    def points(box):
        return tuple(round(value * unit) for value in box)
    draw.rounded_rectangle(points((110, 151, 402, 361)), radius=round(20*unit), outline='#f4f6e9', width=round(12*unit))
    draw.rounded_rectangle(points((140, 188, 320, 324)), radius=round(8*unit), outline='#f4f6e9', width=round(9*unit))
    draw.line(points((350, 200, 374, 200)), fill='#f4f6e9', width=round(10*unit))
    draw.ellipse(points((347, 251, 379, 283)), outline='#f4f6e9', width=round(7*unit))
    draw.line(points((168, 373, 195, 373)), fill='#f4f6e9', width=round(9*unit))
    draw.line(points((318, 373, 345, 373)), fill='#f4f6e9', width=round(9*unit))
    image.save(Path('public/icons') / filename)
