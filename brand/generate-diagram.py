"""Emits the README harness diagram in light and dark from one template. Run: python3 brand/generate-diagram.py"""
import re, pathlib, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
avatar = (ROOT / "assets" / "smith-ok.svg").read_text()
avatar = re.sub(r"<metadata.*?</metadata>", "", avatar, flags=re.S)
avatar = re.sub(r"^<svg[^>]*>", "", avatar).replace("</svg>", "").replace("viewboxMask", "portraitMask")

PALETTES = {
    "dark": dict(text="#e6edf3", muted="#6d7681", box="#161b22", edge="#30363d", pill="#2d333b", arrow="#4d5566",
                 accent="#c68128", blue="#6d94c4", green="#5d9b72", plum="#9b7ba0"),
    "light": dict(text="#1f2328", muted="#8a8578", box="#faf8f3", edge="#e6e0d2", pill="#e9e3d5", arrow="#b3ada0",
                  accent="#b97a18", blue="#4a6d94", green="#4e8a63", plum="#7a5b7d"),
}
SANS = "'Instrument Sans', -apple-system, 'Segoe UI', sans-serif"
MONO = "ui-monospace, 'SF Mono', monospace"

def box(x, y, w, label, color, p):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="48" rx="14" fill="{p["box"]}" stroke="{p["edge"]}"/>'
            f'<rect x="{x+22}" y="{y+19}" width="10" height="10" rx="3" fill="{color}"/>'
            f'<text x="{x+42}" y="{y+29}">{label}</text>')

def svg(p):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 470" width="1080" height="470" role="img" aria-label="The harness: a message in Slack, an issue in Linear, and the agent's own heartbeat each write into a session; Smith wakes on its own machine and answers with a streamed reply, a pull request, and activities on the issue">
  <defs>
    <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0.6 L7.4 4 L0 7.4 Z" fill="{p['arrow']}"/></marker>
    <marker id="arr-accent" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0.6 L7.4 4 L0 7.4 Z" fill="{p['accent']}"/></marker>
    <clipPath id="portrait"><circle cx="573" cy="192" r="40"/></clipPath>
  </defs>

  <g font-family="{SANS}" font-size="15" fill="{p['text']}">
    {box(28, 66, 190, "you, in Slack", p['accent'], p)}
    {box(28, 166, 190, "an issue in Linear", p['blue'], p)}
    {box(28, 266, 190, "its own heartbeat", p['green'], p)}
  </g>
  <g fill="none" stroke="{p['arrow']}" stroke-width="1.5">
    <path d="M 218 90 C 256 90, 268 132, 300 149" marker-end="url(#arr)"/>
    <path d="M 218 190 C 246 190, 270 190, 300 190" marker-end="url(#arr)"/>
    <path d="M 218 290 C 256 290, 268 248, 300 231" marker-end="url(#arr)"/>
  </g>

  <text x="376" y="54" text-anchor="middle" font-size="11.5" letter-spacing="2.5" fill="{p['muted']}" font-family="{MONO}">THE SESSION</text>
  <rect x="306" y="70" width="140" height="240" rx="18" fill="{p['box']}" stroke="{p['edge']}"/>
  <g>
    <rect x="322" y="96" width="104" height="18" rx="6" fill="{p['pill']}"/>
    <rect x="322" y="124" width="82" height="18" rx="6" fill="{p['pill']}"/>
    <rect x="322" y="152" width="96" height="18" rx="6" fill="{p['pill']}"/>
    <rect x="322" y="180" width="70" height="18" rx="6" fill="{p['pill']}"/>
    <rect x="322" y="208" width="108" height="18" rx="6" fill="{p['pill']}"/>
    <rect x="322" y="236" width="90" height="18" rx="6" fill="{p['accent']}"/>
  </g>
  <text x="376" y="340" text-anchor="middle" font-size="12.5" fill="{p['muted']}" font-family="{MONO}">one per conversation, kept on disk</text>

  <path d="M 446 197 C 480 197, 500 193, 526 192" fill="none" stroke="{p['accent']}" stroke-width="2" marker-end="url(#arr-accent)"/>

  <g clip-path="url(#portrait)"><g transform="translate(533 152) scale(0.04587)" fill="none">{avatar}</g></g>
  <circle cx="573" cy="192" r="40" fill="none" stroke="{p['edge']}" stroke-width="1.5"/>
  <text x="573" y="138" text-anchor="middle" font-size="13" fill="{p['muted']}" font-family="{SANS}">on its own machine</text>

  <g fill="none" stroke="{p['arrow']}" stroke-width="1.5">
    <path d="M 614 176 C 650 148, 662 100, 698 91" marker-end="url(#arr)"/>
    <path d="M 618 190 C 646 190, 670 190, 698 190" marker-end="url(#arr)"/>
    <path d="M 614 206 C 650 234, 662 282, 698 289" marker-end="url(#arr)"/>
  </g>
  <g font-family="{SANS}" font-size="15" fill="{p['text']}">
    {box(702, 66, 220, "a reply, streamed", p['accent'], p)}
    {box(702, 166, 220, "a pull request", p['plum'], p)}
    {box(702, 266, 220, "activities on the issue", p['blue'], p)}
  </g>

  <text x="702" y="367" font-size="12.5" fill="{p['muted']}" font-family="{MONO}">the repositories stay cloned on the machine</text>
  <text x="702" y="387" font-size="12.5" fill="{p['muted']}" font-family="{MONO}">each task gets its own git worktree</text>
  <text x="702" y="407" font-size="12.5" fill="{p['muted']}" font-family="{MONO}">tests run before it reports</text>
</svg>
'''

for name, palette in PALETTES.items():
    out = ROOT / "brand" / ("smith-harness-dark.svg" if name == "dark" else "smith-harness.svg")
    out.write_text(svg(palette))
    bg = "#0d1117" if name == "dark" else "#ffffff"
    subprocess.run(["rsvg-convert", "-w", "1080", "-b", bg, str(out), "-o", str(ROOT / "local" / f"diagram-{name}.png")], check=True)
    print(out.name, out.stat().st_size, "bytes")
