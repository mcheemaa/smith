import sys, urllib.request, urllib.parse, re
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT = "/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf"
BASE = "https://api.dicebear.com/9.x/notionists/svg?backgroundColor=f6f5f2&bodyIconProbability=0&glassesProbability=100&beardProbability=100&gestureProbability=100"

def text_paths(text, size, cx, cy, rotate):
    font = TTFont(FONT)
    glyphs = font.getGlyphSet(); cmap = font.getBestCmap(); upm = font["head"].unitsPerEm
    scale = size / upm
    x = 0; parts = []
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, 0)))
        parts.append(pen.getCommands())
        x += glyphs[name].width * scale * 0.94
    width = x
    d = " ".join(parts)
    return f'<g transform="translate({cx} {cy}) rotate({rotate}) translate({-width/2:.1f} 0)"><path d="{d}" fill="#000"/></g>'

def compose(params, out, size=150, cx=880, cy=1400, rotate=-5, text="MYTH"):
    svg = urllib.request.urlopen(BASE + "&" + urllib.parse.urlencode(params)).read().decode()
    svg = svg.replace("</svg>", text_paths(text, size, cx, cy, rotate) + "</svg>")
    open(out, "w").write(svg)

if __name__ == "__main__":
    name, *kv = sys.argv[1:]
    params = dict(p.split("=", 1) for p in kv if "=" in p)
    extra = {k: float(v) for k, v in (p.split(":", 1) for p in kv if ":" in p)}
    compose(params, f"{name}.svg", **{k: (int(v) if k != "rotate" else v) for k, v in extra.items()})
