"""Adapt seven Stellarium S&T figures and pinned HYG 4.1 coordinates.

Usage: python3 scripts/extract-constellations.py hygdata_v41.csv stellarium-index.json
Source revisions and licenses are recorded in public/data/README.md.
No downloads are performed by this script or by the normal site build.
"""
import csv
import json
import math
import pathlib
import sys

names = {"Ori": "Orion", "UMa": "Big Dipper", "Cas": "Cassiopeia", "Cyg": "Cygnus", "Leo": "Leo", "Sco": "Scorpius", "Cru": "Southern Cross"}
source = json.loads(pathlib.Path(sys.argv[2]).read_text())
figures = []
for code, name in names.items():
    figure = next(f for f in source["constellations"] if f["id"].split()[-1] == code)
    # The Dipper is an asterism, not the whole Great Bear.
    paths = [figure["lines"][1]] if code == "UMa" else figure["lines"]
    edges = sorted({tuple(sorted((a, b))) for path in paths for a, b in zip(path, path[1:]) if a != b})
    figures.append({"id": code, "name": name, "kind": "asterism" if code == "UMa" else "constellation", "edges": edges})
hips = {hip for f in figures for edge in f["edges"] for hip in edge}
stars = []
by_hip = {}
with open(sys.argv[1], newline="", encoding="utf-8") as file:
    for row in csv.DictReader(file):
        if not row["hip"] or int(row["hip"]) not in hips:
            continue
        hip = int(row["hip"])
        if hip in by_hip:
            continue
        if not 0 < float(row["dist"]) < 100000:
            raise ValueError(f"Unknown distance for HIP {hip}")
        position = [float(row[axis]) for axis in ("x", "y", "z")]
        if not all(math.isfinite(value) for value in position):
            raise ValueError(f"Invalid position for HIP {hip}")
        by_hip[hip] = int(row["id"])
        stars.append([int(row["id"]), row["proper"] or row["bf"].strip() or f"HIP {hip}", *position, float(row["absmag"]), float(row["ci"]) if row["ci"] else None])
if hips != by_hip.keys():
    raise ValueError(f"Missing HIP stars: {hips - by_hip.keys()}")
for figure in figures:
    figure["edges"] = [[by_hip[a], by_hip[b]] for a, b in figure["edges"]]
data = {"source": "HYG 4.1; Stellarium Modern (Sky & Telescope)", "hygRevision": "c7f7f883fe678cc7680169a50ccd7dcc49b060ce", "figureRevision": "d6c7677f24e679019015e385f6a5b208d8f49026", "license": "CC BY-SA 4.0", "epoch": "J2000.0", "positionUnit": "parsec", "stars": stars, "figures": figures}
output = pathlib.Path(__file__).resolve().parent.parent / "public/data/constellations.json"
output.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"Wrote {len(stars)} real stars and {sum(len(f['edges']) for f in figures)} guide segments")
