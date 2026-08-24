# -*- coding: utf-8 -*-
"""Rewrite every virtualTour node's `links` array in config/project.ts
from the spatially-derived navigation graph."""
import io, re, sys

GRAPH = {
    "exterior_p1": [
        ("exterior_p3", "Enter the Gate", 174.60, -14.00),
        ("exterior_p2", "Along the Street", -95.20, -10.80),
        ("exterior_p5", "Aerial View", 174.60, 22.00),
    ],
    "exterior_p2": [
        ("exterior_p1", "Back to Main Gate", -95.00, -11.00),
    ],
    "exterior_p3": [
        ("foyer", "Enter the Lobby", -149.00, -18.00),
        ("exterior_p1", "Out to the Street", 153.50, -19.00),
        ("exterior_p4", "Garden", -90.50, -18.00),
    ],
    "exterior_p4": [
        ("exterior_p3", "Back to Parking", -175.00, -15.50),
    ],
    "exterior_p5": [
        ("exterior_p1", "Down to Entrance", 160.00, -32.00),
    ],
    "foyer": [
        ("exterior_p3", "Down to Parking", 12.50, -24.00),
        ("living_area_01", "Enter the Home", -98.48, -32.39),
    ],
    "living_area_01": [
        ("foyer", "Back to Foyer", 87.31, -31.22),
        ("living_area_02", "Walk Further In", 146.47, -22.56),
        ("dining_area", "Go to Dining Area", -151.40, -14.00),
    ],
    "living_area_02": [
        ("living_area_01", "Back to Entrance", -55.00, -30.00),
        ("bedroom_01_1", "Bedroom 1", 38.16, -37.54),
        ("bedroom_02_1", "Bedroom 2", 67.13, -19.38),
        ("dining_area", "Dining Area", 174.60, -27.00),
    ],
    "dining_area": [
        ("living_area_02", "Back to Living Area", 98.40, -31.90),
        ("living_area_01", "Towards Entrance", 68.02, -20.05),
        ("kitchen_01", "Enter Kitchen", -145.53, -23.03),
    ],
    "kitchen_01": [
        ("dining_area", "Back to Dining", 126.50, -8.74),
        ("kitchen_02", "Further into Kitchen", 173.56, -10.50),
    ],
    "kitchen_02": [
        ("kitchen_01", "Back towards Dining", -143.30, -31.00),
    ],
    "bedroom_01_1": [
        ("living_area_02", "Exit Bedroom", 95.96, -36.68),
        ("bedroom_01_2", "Towards the Door", -165.50, -35.00),
    ],
    "bedroom_01_2": [
        ("living_area_02", "Exit Bedroom", -108.00, -33.00),
        ("bedroom_01_3", "Bedside View", 117.00, -38.00),
    ],
    "bedroom_01_3": [
        ("bedroom_01_2", "Back to Doorway", -60.00, -34.00),
    ],
    "bedroom_02_1": [
        ("living_area_02", "Exit Bedroom", 95.80, -30.00),
        ("bedroom_02_2", "Study Area", -172.00, -34.00),
    ],
    "bedroom_02_2": [
        ("bedroom_02_1", "Back to Bedside", -97.50, -36.00),
    ],
}

path = "config/project.ts"
content = io.open(path, encoding="utf-8").read()

def fmt(links):
    if not links:
        return "[]"
    rows = [
        '          {{ "nodeId": "{0}", "label": "{1}", "yaw": {2}, "pitch": {3} }}'.format(n, l, y, p)
        for n, l, y, p in links
    ]
    return "[\n" + ",\n".join(rows) + "\n        ]"

missing = []
for node, links in GRAPH.items():
    pattern = re.compile(
        r'("' + re.escape(node) + r'":\s*\{(?:(?!\}).)*?"links":\s*)\[.*?\]',
        re.DOTALL,
    )
    new_content, n = pattern.subn(lambda m: m.group(1) + fmt(links), content, count=1)
    if n != 1:
        missing.append(node)
    content = new_content

if missing:
    sys.exit("FAILED to match nodes: " + ", ".join(missing))

io.open(path, "w", encoding="utf-8", newline="").write(content)
print("Rewrote links for %d nodes (%d connections)."
      % (len(GRAPH), sum(len(v) for v in GRAPH.values())))
