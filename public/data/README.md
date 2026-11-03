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

Python is needed only for this optional extraction step, not the site's normal build or runtime. The normal build uses the checked-in catalog and makes no external astronomy requests.
