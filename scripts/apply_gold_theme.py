# -*- coding: utf-8 -*-
"""Re-tint the neutral glassmorphism vocabulary to the gold/dark brand theme.
Structure, layout and functionality are untouched — only colour tokens move."""
import io, re, glob, sys

# Ordered: longest / most specific first so nothing is partially consumed.
REPLACEMENTS = [
    # --- Soft gold hairline borders ------------------------------------------
    ("border-white/50", "border-[rgba(201,169,97,0.60)]"),
    ("border-white/40", "border-[rgba(201,169,97,0.50)]"),
    ("border-white/30", "border-[rgba(201,169,97,0.38)]"),
    ("border-white/20", "border-[rgba(201,169,97,0.28)]"),
    ("border-white/10", "border-[rgba(201,169,97,0.18)]"),
    ("border-white/5",  "border-[rgba(201,169,97,0.10)]"),

    # --- Translucent glass fills, warmed toward gold -------------------------
    ("bg-white/50", "bg-[rgba(246,231,188,0.32)]"),
    ("bg-white/40", "bg-[rgba(246,231,188,0.26)]"),
    ("bg-white/30", "bg-[rgba(246,231,188,0.20)]"),
    ("bg-white/20", "bg-[rgba(246,231,188,0.14)]"),
    ("bg-white/10", "bg-[rgba(246,231,188,0.08)]"),
    ("bg-white/5",  "bg-[rgba(246,231,188,0.05)]"),

    # --- Dark glass: neutral black -> warm near-black ------------------------
    ("bg-black/90", "bg-[rgba(11,10,8,0.90)]"),
    ("bg-black/80", "bg-[rgba(11,10,8,0.80)]"),
    ("bg-black/70", "bg-[rgba(11,10,8,0.70)]"),
    ("bg-black/60", "bg-[rgba(11,10,8,0.60)]"),
    ("bg-black/50", "bg-[rgba(11,10,8,0.50)]"),
    ("bg-black/40", "bg-[rgba(11,10,8,0.45)]"),
    ("bg-black/30", "bg-[rgba(11,10,8,0.35)]"),
    ("bg-black/20", "bg-[rgba(11,10,8,0.25)]"),
    ("bg-black/10", "bg-[rgba(11,10,8,0.15)]"),

    # --- Inset highlights and glows become gold ------------------------------
    ("rgba(255,255,255,", "rgba(246,231,188,"),

    # --- Solid white accents become gold -------------------------------------
    ("hover:bg-white hover:text-black", "hover:bg-[var(--gold-300)] hover:text-[#1A150B]"),
]

# `bg-white` / `text-white` as a standalone solid, not followed by / or -
SOLID_BG_WHITE = re.compile(r"\bbg-white\b(?![/\-])")

changed = {}
for path in sorted(glob.glob("components/*.tsx")):
    src = io.open(path, encoding="utf-8").read()
    out = src
    for a, b in REPLACEMENTS:
        out = out.replace(a, b)
    out = SOLID_BG_WHITE.sub("bg-[var(--gold-300)]", out)
    if out != src:
        io.open(path, "w", encoding="utf-8", newline="").write(out)
        changed[path] = sum(1 for a, b in REPLACEMENTS if a in src)

for p in changed:
    print("themed", p)
print("%d files updated" % len(changed))
