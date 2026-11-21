#!/usr/bin/env python3
"""Scarica i dati OpenStreetMap della zona di gioco (più un margine) in .osm-cache/.

Usa l'API ufficiale (api.openstreetmap.org/api/0.6/map) a tasselli piccoli, perché ogni richiesta
è limitata a 50.000 nodi. Per una zona più grande cambia CLIP in tools/build_map.py e rilancia.

    python3 tools/fetch_osm.py            # scarica solo i tasselli mancanti
    python3 tools/fetch_osm.py --force    # riscarica tutto
"""
import argparse, os, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_map import CLIP, ROOT, to_ll

STEP_LAT, STEP_LON = 0.006, 0.008
MARGIN = 450  # metri attorno alla zona giocabile (tram, edifici all'orizzonte)

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
    print(f'{len(tiles)} tasselli per lat {lat0:.4f}–{lat1:.4f}, lon {lon0:.4f}–{lon1:.4f}')
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
            except Exception as e:  # rete instabile: riprova con attesa crescente
                print('  errore', e, '— riprovo'); time.sleep(2 ** attempt)
        else:
            sys.exit('download fallito: ' + url)
        print(f'  [{i + 1}/{len(tiles)}] {os.path.basename(fn)} {os.path.getsize(fn) // 1024} KB')
        time.sleep(1)  # siamo ospiti dell'API OSM: niente raffiche
    print('fatto. Ora: python3 tools/build_map.py')

if __name__ == '__main__':
    main()
