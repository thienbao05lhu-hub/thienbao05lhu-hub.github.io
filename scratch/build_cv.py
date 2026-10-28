import base64
import subprocess
import os
import fitz

# 1. Read avatar
with open('scratch/cv_avatar.jpeg', 'rb') as f:
    b64_avatar = base64.b64encode(f.read()).decode('utf-8')
data_uri = f'data:image/jpeg;base64,{b64_avatar}'

# 2. Read HTML and replace image src
with open('scratch/cv_en.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
html = re.sub(r'src=["\'][^"\']*cv_avatar[^"\']*["\']', f'src="{data_uri}"', html)

with open('scratch/cv_en.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated HTML with base64 avatar.")

# 3. Print to PDF via Edge
html_abs = os.path.abspath('scratch/cv_en.html')
pdf_abs = os.path.abspath('Curriculum Vitae (English).pdf')
edge_exe = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

cmd = [
    edge_exe,
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    f'--print-to-pdf={pdf_abs}',
    f'file:///{html_abs}'
]
subprocess.run(cmd, check=True)
print("PDF printed successfully.")

# 4. Copy to alternate names
with open(pdf_abs, 'rb') as src, open('Curriculum-Vitae-English.pdf', 'wb') as dst:
    dst.write(src.read())

# 5. Render PNG page-1-en.png at 1190 x 1684
doc = fitz.open(pdf_abs)
page = doc[0]
scale_x = 1190.0 / page.rect.width
scale_y = 1684.0 / page.rect.height
pix = page.get_pixmap(matrix=fitz.Matrix(scale_x, scale_y))
pix.save('images/cv/page-1-en.png')
print(f"Rendered images/cv/page-1-en.png ({pix.width}x{pix.height})")

# 6. Verify image in PDF
for img in page.get_images():
    print("PDF image:", img)

