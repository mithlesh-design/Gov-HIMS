#!/usr/bin/env python3
"""Collapse the off-brand rainbow (purple/violet/fuchsia + brand teal/cyan) to the
single deep-blue system. Status colors (green/emerald, amber/yellow, red/rose,
orange, sky, indigo, slate/gray) are intentionally left untouched.

Idempotent. Run from repo root: python3 scripts/codemod-uniform-palette.py
"""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / "src"

# 1) Tailwind color-scale tokens: purple-/violet-/fuchsia- -> blue-
TW = [
    (re.compile(r'\bpurple-'),  'blue-'),
    (re.compile(r'\bviolet-'),  'blue-'),
    (re.compile(r'\bfuchsia-'), 'blue-'),
]

# 2) Hex colors (case-insensitive). Purple/violet -> blue ramp; brand teal/cyan -> blue.
HEX = {
    # purple / violet ramp -> blue ramp (deep->light)
    '#6D28D9': '#1E3A8A', '#7C3AED': '#1E3A8A', '#7E22CE': '#1E3A8A',
    '#8B5CF6': '#2563EB', '#9333EA': '#2563EB', '#A855F7': '#2563EB',
    '#A78BFA': '#60A5FA', '#C084FC': '#60A5FA',
    '#C4B5FD': '#93C5FD', '#D8B4FE': '#93C5FD',
    '#DDD6FE': '#DBEAFE', '#E9D5FF': '#DBEAFE',
    '#EDE9FE': '#EFF6FF', '#F3E8FF': '#EFF6FF', '#F5F3FF': '#F5F8FF', '#FAF5FF': '#F5F8FF',
    # brand teal / cyan / sky-as-brand -> blue
    '#0891B2': '#2563EB', '#06B6D4': '#2563EB', '#22D3EE': '#60A5FA',
    '#14B8A6': '#2563EB', '#2DD4BF': '#60A5FA', '#0D9488': '#1E3A8A', '#0E7490': '#1E3A8A',
    '#0EA5E9': '#2563EB',
}

# 3) rgba()/rgb() purple+teal+cyan triplets -> blue triplets (preserve alpha).
RGBA = {
    (139, 92, 246):  (37, 99, 235),    # violet-500
    (124, 58, 237):  (30, 58, 138),    # violet-600
    (109, 40, 217):  (30, 58, 138),    # violet-700
    (167, 139, 250): (96, 165, 250),   # violet-400
    (8, 145, 178):   (37, 99, 235),    # cyan-600
    (6, 182, 212):   (37, 99, 235),    # cyan-500
    (20, 184, 166):  (37, 99, 235),    # teal-500
    (13, 148, 136):  (30, 58, 138),    # teal-600
    (14, 165, 233):  (37, 99, 235),    # sky-500 brand
}

def conv_rgba(text):
    def repl(m):
        r, g, b = int(m.group('r')), int(m.group('g')), int(m.group('b'))
        if (r, g, b) in RGBA:
            nr, ng, nb = RGBA[(r, g, b)]
            tail = m.group('tail') or ''
            return f"rgba({nr},{ng},{nb}{tail})" if m.group('fn') == 'rgba' else f"rgb({nr},{ng},{nb})"
        return m.group(0)
    pat = re.compile(r'(?P<fn>rgba?)\(\s*(?P<r>\d{1,3})\s*,\s*(?P<g>\d{1,3})\s*,\s*(?P<b>\d{1,3})\s*(?P<tail>,[^)]*)?\)')
    return pat.sub(repl, text)

def conv_hex(text):
    def repl(m):
        h = m.group(0).upper()
        return HEX.get(h, m.group(0))
    return re.compile(r'#[0-9A-Fa-f]{6}\b').sub(repl, text)

changed = 0
for path in ROOT.rglob('*.tsx'):
    if path.name.startswith('._'):
        continue
    try:
        src = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        print('skip (non-utf8)', path.relative_to(ROOT.parent))
        continue
    out = src
    for pat, rep in TW:
        out = pat.sub(rep, out)
    out = conv_hex(out)
    out = conv_rgba(out)
    if out != src:
        path.write_text(out)
        changed += 1
        print('updated', path.relative_to(ROOT.parent))

print(f'\n{changed} files updated')
