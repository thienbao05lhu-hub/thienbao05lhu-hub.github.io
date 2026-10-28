from pathlib import Path
from io import BytesIO
import shutil
import re
import pymupdf as pdf
from PIL import Image, ImageOps, ImageDraw

root = Path.cwd()
source = Path('D:/CV_Skill/d67cec54-f708-403d-9125-d66c2f7669bc.png')
backup = root / '.taste-skill/cv-before-portrait-20261028'
backup.mkdir(parents=True, exist_ok=True)
shutil.copyfile(source, root / 'images/avatar-new.png')

# Fit the supplied photo into the CV's existing circular portrait frame.
portrait = ImageOps.fit(Image.open(source).convert('RGB'), (600, 600), centering=(0.5, 0.35))
mask = Image.new('L', (600, 600), 0)
ImageDraw.Draw(mask).ellipse((0, 0, 599, 599), fill=255)
circle = Image.new('RGB', (600, 600), 'white')
circle.paste(portrait, (0, 0), mask)
buffer = BytesIO()
circle.save(buffer, format='PNG')

for filename, preview in [('Curriculum Vitae.pdf', 'page-1.png'), ('Curriculum Vitae (English).pdf', 'page-1-en.png')]:
    target = root / filename
    original = backup / filename
    if not original.exists():
        shutil.copyfile(target, original)
    doc = pdf.open(original)
    page = doc[0]
    fonts = []
    for xref, _, _, base, _, *_ in page.get_fonts(full=True):
        data = doc.extract_font(xref)[3]
        family = base.split('+')[-1]
        fonts.append((f'CVFont{xref}', family, pdf.Font(fontbuffer=data), data))
    rewritten = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            text = ''.join(span['text'] for span in line['spans'])
            if 'Cuộc thi Thiết Kế Máy Tự Động Hóa' in text or 'Automation Machine Design Contest 2026' in text:
                spans = []
                for span in line['spans']:
                    updated = dict(span)
                    if 'Cuộc thi Thiết Kế Máy Tự Động Hóa' in updated['text']:
                        updated['text'] = re.sub(r'(Cuộc thi Thiết Kế Máy Tự Động Hóa)\s+20\d{2}(:?)', lambda m: m[1] + (':' if span['font'].endswith('Regular') else ''), updated['text'])
                    updated['text'] = updated['text'].replace('Automation Machine Design Contest 2026', 'Automation Machine Design Contest')
                    spans.append(updated)
                rewritten.append((line['bbox'], spans))
                page.add_redact_annot(pdf.Rect(line['bbox']), fill=(1, 1, 1))
    if rewritten:
        page.apply_redactions(images=0, graphics=0)
    for _, spans in rewritten:
        x = spans[0]['origin'][0]
        for span in spans:
            for char in span['text']:
                candidates = [font for font in fonts if font[1] == span['font'] and font[2].has_glyph(ord(char))]
                if not candidates:
                    raise ValueError(f'Missing glyph: {char!r} in {span["font"]}')
                alias, _, font, data = candidates[0]
                page.insert_font(fontname=alias, fontbuffer=data)
                color = span['color']
                rgb = (((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255)
                page.insert_text((x, span['origin'][1]), char, fontsize=span['size'], fontname=alias, color=rgb)
                x += font.text_length(char, fontsize=span['size'])
    image_xref = page.get_image_info(xrefs=True)[0]['xref']
    page.replace_image(image_xref, stream=buffer.getvalue())
    temp = root / '.taste-skill' / filename
    doc.save(temp, garbage=4, deflate=True)
    doc.close()
    shutil.copyfile(temp, target)
    result = pdf.open(target)
    text = result[0].get_text()
    assert not re.search(r'Cuộc thi Thiết Kế Máy Tự Động Hóa\s+20\d{2}', text)
    assert 'Automation Machine Design Contest 2026' not in text
    result[0].get_pixmap(matrix=pdf.Matrix(2, 2)).save(root / 'images/cv' / preview)
    print(filename, 'updated:', len(result), 'page(s)')
    result.close()

alias = root / 'Curriculum-Vitae-English.pdf'
if alias.exists():
    if not (backup / alias.name).exists():
        shutil.copyfile(alias, backup / alias.name)
    shutil.copyfile(root / 'Curriculum Vitae (English).pdf', alias)

html = root / 'index.html'
html.write_text(html.read_text(encoding='utf-8').replace('src="images/avatar.jpg"', 'src="images/avatar-new.png"'), encoding='utf-8')
