"""Re-encode full style samples and rectify only the drawing area from a UI screenshot."""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/restyle'
OUT.mkdir(parents=True,exist_ok=True)
source=Image.open('/home/ubuntu/upload/pasted_file_CoDEkY_image.png').convert('RGB')
# The paper area only; QUAD order is upper-left, lower-left, lower-right, upper-right.
original=source.transform((372,526),Image.Transform.QUAD,(82,47,98,573,449,552,441,37),Image.Resampling.BICUBIC)
original.save(OUT/'original.webp',quality=94)
for name in ['anime','realistic','watercolour','graphic-novel']:
 path=OUT/(name+'.png')
 if not path.exists():raise FileNotFoundError(path)
 image=Image.open(path).convert('RGB')
 image.thumbnail((768,1152),Image.Resampling.LANCZOS)
 image.save(OUT/(name+'.webp'),quality=86)
print('Prepared original and four style samples; all compositions preserved.')
