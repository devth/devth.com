# Nearby-star catalog

`nearby-stars.json` is an adapted subset of the **HYG Database 4.1**, by Astronomy Nexus / the astronexus HYG contributors. This adapted dataset is licensed **CC BY-SA 4.0**, independently of the site's code.

- Source: https://github.com/astronexus/HYG-Database
- Pinned revision: `c7f7f883fe678cc7680169a50ccd7dcc49b060ce`
- Input: `hyg/CURRENT/hygdata_v41.csv`
- Source license: https://github.com/astronexus/HYG-Database/blob/c7f7f883fe678cc7680169a50ccd7dcc49b060ce/hyg/CURRENT/LICENSE
- License terms: https://creativecommons.org/licenses/by-sa/4.0/

Changes: retain catalogued objects within a 100-light-year radius of the Sun, discard unused columns, and encode the remaining fields as compact JSON rows. Cartesian positions remain in the catalog's equatorial J2000.0 coordinate system and in parsecs. Null B−V values mean unknown, not measured solar color.

The renderer converts parsecs to light-years (1 pc = 3.261563777 ly) and rotates axes so celestial north is up. Distances are approximate catalog estimates, not live ephemerides. Earth and the Sun share the origin at this scale. This is not a complete inventory of every star within 100 light-years; it is the HYG sample within that radius. Symbols and brightness are exaggerated for legibility, not physical stellar radii. No synthetic background stars are added.

To regenerate, download the pinned CSV above and run:

```sh
python3 scripts/extract-nearby-stars.py /path/to/hygdata_v41.csv
npx vp fmt public/data/nearby-stars.json
```

## Constellation extension

`constellations.json` adds 62 stars beyond the nearby sample (79 guide vertices total), keeping their HYG J2000 positions and approximate distances. It includes seven selected Modern (Sky & Telescope) stick figures: Orion, the Big Dipper, Cassiopeia, Cygnus, Leo, Scorpius, and the Southern Cross. The Big Dipper is an asterism within Ursa Major, not a separate IAU constellation. Lines are perspective guides, not physical connections or official IAU boundaries.

- Star coordinates: the same pinned HYG 4.1 CSV and CC BY-SA 4.0 license above.
- Figure source: [Stellarium Modern (Sky & Telescope) index](https://github.com/Stellarium/stellarium/blob/d6c7677f24e679019015e385f6a5b208d8f49026/skycultures/modern_st/index.json).
- Figure authors: Paul Krizak, Jonathan E. Piskor, extended by G. Zotti; see the [source description and license](https://github.com/Stellarium/stellarium/blob/d6c7677f24e679019015e385f6a5b208d8f49026/skycultures/modern_st/description.md).
- Original figure license: [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/). This adaptation is distributed under the later [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) license, compatible with the HYG coordinates.
- Changes: select seven figures (only the Dipper path from Ursa Major), discard repeated/self edges, resolve HIP references to HYG IDs, and retain only their real-star coordinates using the same seven-column row format as `nearby-stars.json`. No artwork is included.

To regenerate from the pinned HYG CSV and Stellarium index JSON:

```sh
python3 scripts/extract-constellations.py /path/to/hygdata_v41.csv /path/to/stellarium-index.json
npx vp fmt public/data/constellations.json
```

Python is needed only for this optional extraction step, not the site's normal build or runtime. The normal build uses the checked-in catalog and makes no external astronomy requests.
