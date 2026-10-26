from pathlib import Path
from PIL import Image, ImageOps
root = Path(__file__).resolve().parents[1]
out = root / 'assets'
out.mkdir(exist_ok=True)
for name in ['1','8','20','24','28']:
    original = Image.open(root / 'img' / (name + '.png')).convert('RGB')
    for width in [400,640,1000]:
        resized = ImageOps.contain(original, (width, round(width*original.height/original.width)))
        resized.save(out / f'{name}-{width}.webp', quality=83, method=6)
portrait = Image.open(root/'img/perfil-ignacio-torchi.jpg').convert('RGB')
ImageOps.contain(portrait,(720,720)).save(out/'instructor.webp',quality=85,method=6)
print('Optimized responsive copies; originals in img/ unchanged.')
