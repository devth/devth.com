"""Extract the checked-in, CC BY-SA 4.0 HYG 4.1 stellar neighborhood.

Usage: python3 scripts/extract-nearby-stars.py /path/to/hygdata_v41.csv
The normal site build uses the vendored JSON and never downloads a catalog.
"""

import csv
import json
import math
import pathlib
import sys

REVISION = "c7f7f883fe678cc7680169a50ccd7dcc49b060ce"
LY_PER_PC = 3.261563777
rows = []
with open(sys.argv[1], newline="", encoding="utf-8") as source:
    for star in csv.DictReader(source):
        distance = float(star["dist"])
        if distance < 0 or distance * LY_PER_PC > 100:
            continue
        position = [float(star[axis]) for axis in ("x", "y", "z")]
        if not all(math.isfinite(value) for value in position):
            continue
        rows.append([
            int(star["id"]), star["proper"], *position,
            float(star["absmag"]), float(star["ci"]) if star["ci"] else None,
        ])
catalog = {
    "source": "HYG Database 4.1 / Astronomy Nexus contributors",
    "sourceUrl": "https://github.com/astronexus/HYG-Database",
    "revision": REVISION,
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "epoch": "J2000.0",
    "radiusLightYears": 100,
    "positionUnit": "parsec",
    "columns": ["hygId", "properName", "x", "y", "z", "absoluteMagnitude", "colorIndexBV"],
    "stars": rows,
}
output = pathlib.Path(__file__).resolve().parent.parent / "public/data/nearby-stars.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"Wrote {len(rows)} catalogued stars to {output}")
