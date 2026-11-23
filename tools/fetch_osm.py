#!/usr/bin/env python3
"""Downloads the OpenStreetMap data of the game area (plus a margin) into .osm-cache/.

Uses the official API (api.openstreetmap.org/api/0.6/map) in small tiles, because each request
is limited to 50,000 nodes. For a larger area change CLIP in tools/build_map.py and run again.

    python3 tools/fetch_osm.py            # downloads only the missing tiles
    python3 tools/fetch_osm.py --force    # downloads everything again
"""
import argparse, os, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_map import CLIP, ROOT, to_ll

STEP_LAT, STEP_LON = 0.006, 0.008
MARGIN = 450  # metres around the playable area (trams, buildings on the horizon)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--out', default=os.path.join(ROOT, '.osm-cache'))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    lat1, lon0 = to_ll(CLIP[0] - MARGIN, CLIP[1] - MARGIN)
    lat0, lon1 = to_ll(CLIP[2] + MARGIN, CLIP[3] + MARGIN)
    tiles = []
    la = lat0
    while la < lat1:
        lo = lon0
        while lo < lon1:
            tiles.append((round(lo, 4), round(la, 4), round(lo + STEP_LON, 4), round(la + STEP_LAT, 4)))
            lo += STEP_LON
        la += STEP_LAT
    print(f'{len(tiles)} tiles for lat {lat0:.4f}–{lat1:.4f}, lon {lon0:.4f}–{lon1:.4f}')
    for i, (x0, y0, x1, y1) in enumerate(tiles):
        fn = os.path.join(a.out, f'tile_{y0}_{x0}.osm')
        if os.path.exists(fn) and not a.force:
            continue
        url = f'https://api.openstreetmap.org/api/0.6/map?bbox={x0},{y0},{x1},{y1}'
        req = urllib.request.Request(url, headers={'User-Agent': 'neon-torino-map-builder/1.0'})
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=120) as r, open(fn, 'wb') as f:
                    f.write(r.read())
                break
            except Exception as e:  # flaky network: retry with growing waits
                print('  error', e, '— retrying'); time.sleep(2 ** attempt)
        else:
            sys.exit('download failed: ' + url)
        print(f'  [{i + 1}/{len(tiles)}] {os.path.basename(fn)} {os.path.getsize(fn) // 1024} KB')
        time.sleep(1)  # we are guests of the OSM API: no bursts
    print('done. Now: python3 tools/build_map.py')

if __name__ == '__main__':
    main()
