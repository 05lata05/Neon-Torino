#!/usr/bin/env python3
"""Downloads real building heights from ARPA Piemonte ("Edifici 3D 2017") for the game area.

Within the City of Turin the height (field ELEV, in metres) is the real eaves height from the City's
topographic database; outside Turin it is estimated from terrain models. Licence CC BY 2.5 Italy, attribution
"Arpa Piemonte - Geoportale" (see docs/CREDITS.md).

    python3 tools/fetch_heights.py      # writes .osm-cache/arpa_buildings.json
"""
import json, os, sys, time, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_map import CLIP, ROOT, to_ll

URL = 'https://webgis.arpa.piemonte.it/ags/rest/services/topografia_dati_di_base/Edifici_3D_2017/FeatureServer/0/query'
MARGIN = 120  # metres beyond the playable area
PAGE = 2000   # maximum allowed by the service

def main():
    lat1, lon0 = to_ll(CLIP[0] - MARGIN, CLIP[1] - MARGIN)
    lat0, lon1 = to_ll(CLIP[2] + MARGIN, CLIP[3] + MARGIN)
    feats, offset = [], 0
    while True:
        q = {'where': '1=1', 'geometry': f'{lon0},{lat0},{lon1},{lat1}', 'geometryType': 'esriGeometryEnvelope', 'inSR': 4326,
             'spatialRel': 'esriSpatialRelIntersects', 'outFields': 'ELEV,USO,DES', 'returnGeometry': 'true', 'outSR': 4326,
             'resultOffset': offset, 'resultRecordCount': PAGE, 'orderByFields': 'OBJECTID', 'f': 'json'}
        req = urllib.request.Request(URL + '?' + urllib.parse.urlencode(q), headers={'User-Agent': 'neon-torino-map-builder/1.0'})
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    d = json.load(r)
                break
            except Exception as e:  # flaky network: retry
                print('  error', e, '— retrying'); time.sleep(2 ** attempt)
        else:
            sys.exit('download failed')
        if 'error' in d:
            sys.exit('service error: ' + json.dumps(d['error']))
        got = d.get('features', [])
        for f in got:
            a, g = f['attributes'], f.get('geometry') or {}
            if g.get('rings'):
                feats.append({'h': a.get('ELEV'), 'use': a.get('USO'), 'method': a.get('DES'),
                              'rings': [[[round(x, 7), round(y, 7)] for x, y in r] for r in g['rings']]})
        print(f'  {offset + len(got)} buildings')
        if len(got) < PAGE and not d.get('exceededTransferLimit'):
            break
        offset += len(got)
        time.sleep(0.5)
    out = os.path.join(ROOT, '.osm-cache', 'arpa_buildings.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump({'source': 'Arpa Piemonte - Geoportale, Edifici 3D 2017 (CC BY 2.5 IT)', 'buildings': feats}, open(out, 'w'))
    print('wrote', out, len(feats), 'buildings')

if __name__ == '__main__':
    main()
