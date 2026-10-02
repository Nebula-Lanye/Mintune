from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/upload/file_00000000db4882119d6626cfd4fe9de5.png')
out = Path('/home/ubuntu/Mintune/assets/images')
image = Image.open(source).convert('RGB')

# Top mark: crop the square app-icon artwork, excluding the full wordmark.
icon = image.crop((250, 80, 1000, 830)).resize((1024, 1024), Image.Resampling.LANCZOS)
icon.save(out / 'mintune-icon.png', optimize=True)

# Full wordmark: crop the lower logo and place it on the same dark brand field.
logo_crop = image.crop((150, 780, 1110, 1135))
# The supplied wordmark is placed on a dark navy panel. Replace that panel
# color so the wordmark can sit directly on Mintune's app background.
pixels = logo_crop.load()
for y in range(logo_crop.height):
    for x in range(logo_crop.width):
        r, g, b = pixels[x, y]
        if r < 35 and g < 45 and b < 65:
            pixels[x, y] = (16, 36, 29)
logo = Image.new('RGB', (1200, 520), '#050D20')
scale = min(1080 / logo_crop.width, 390 / logo_crop.height)
resized = logo_crop.resize((round(logo_crop.width * scale), round(logo_crop.height * scale)), Image.Resampling.LANCZOS)
logo.paste(resized, ((logo.width - resized.width) // 2, (logo.height - resized.height) // 2))
logo.save(out / 'mintune-logo.png', optimize=True)

# Android 12+ treats the splash image as a centered square icon. Keep the
# complete horizontal wordmark inside a square safe area so it is not clipped.
splash = Image.new('RGB', (1024, 1024), '#050D20')
splash_width = 780
splash_height = round(resized.height * splash_width / resized.width)
splash_logo = resized.resize((splash_width, splash_height), Image.Resampling.LANCZOS)
splash.paste(splash_logo, ((splash.width - splash_logo.width) // 2, (splash.height - splash_logo.height) // 2))
splash.save(out / 'splash-icon.png', optimize=True)

print('created', out / 'mintune-icon.png', icon.size)
print('created', out / 'mintune-logo.png', logo.size)
print('created', out / 'splash-icon.png', splash.size)
