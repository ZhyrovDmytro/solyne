"""Render the reviewed legal Markdown into standalone, escaped static pages."""
from html import escape
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def inline(text):
    text = escape(text)
    return re.sub(r'https://[^\s]+', lambda match: '<a href="' + match[0] + '">' + match[0] + '</a>', text)

for name in ('privacy', 'terms', 'support'):
    source = ROOT / 'docs' / 'legal' / f'{name}.md'
    blocks = []
    text = re.sub(r'(?m)^(#{1,2} .+)\n(?!\n)', r'\1\n\n', source.read_text().strip())
    for paragraph in text.split('\n\n'):
        if paragraph.startswith('# '):
            blocks.append('<h1>' + inline(paragraph[2:]) + '</h1>')
        elif paragraph.startswith('## '):
            blocks.append('<h2>' + inline(paragraph[3:]) + '</h2>')
        else:
            blocks.append('<p>' + inline(paragraph) + '</p>')
    title = {'privacy': 'Privacy Policy', 'terms': 'Terms of Use', 'support': 'Support'}[name]
    page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>{title} — Solyne</title><link rel="stylesheet" href="../style.css"></head><body><a class="skip" href="#main">Skip to content</a><div class="wrap"><nav aria-label="Main navigation"><a class="logo" href="../" aria-label="Solyne home">solyne<span>.</span></a><div class="navlinks"><a href="../privacy/">Privacy</a><a href="../terms/">Terms</a><a href="../support/">Support</a></div></nav><main class="legal" id="main"><aside class="draft">Pre-release draft. Operator details and policies must be finalized before Solyne launches. Contact: <a href="mailto:support@nummio.fyi?subject=Solyne%20question">support@nummio.fyi</a>.</aside>{''.join(blocks)}</main><footer class="footer"><span>© 2026 Solyne</span><a href="../">Back to Solyne</a></footer></div></body></html>'''
    destination = ROOT / 'apps' / 'website' / name / 'index.html'
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(page)
    assert '<h1>' in page and 'support@nummio.fyi' in page
    assert not re.search(r'<h[12]>[^<]*\n', page), 'Heading must not contain body paragraphs'
print('Rendered Privacy, Terms and Support pages.')
