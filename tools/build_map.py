#!/usr/bin/env python3
"""Builds data/torino.json from OpenStreetMap data.

Usage:
    python3 tools/fetch_osm.py            # downloads the OSM tiles into .osm-cache/
    python3 tools/fetch_heights.py        # real building heights (ARPA Piemonte)
    python3 tools/build_map.py            # writes data/torino.json and the sign source for Unreal
    python3 tools/build_map.py --compare old.json   # compares with an existing file

Game coordinates ("map metres"): x towards east, y towards south, starting from ORIGIN.
The engine multiplies them by 5 (1 m = 5 units) and shifts them by (clip.x0-50, clip.y0-50).

Output format (all lines are encoded as integer polylines, Google style):
  R  roads        [class, oneway, name_index, lanes, polyline(1 m), maxspeed_kmh?]
  B  buildings    [levels, kind, outer(qb m), holes...]  kind: 0 generic 1 church 2 stadium 3 garage 4 school
  BR roofs        one entry per building in B: 0 (no roof tags) or [shape, roof height m, roof levels, orientation]
  BF facades      string, one character per building in B: its use, for the facade type (see facade_use);
                  upper case when OSM says the walls are brick (building:material=brick)
  A  areas        [kind, outer(qb m), holes...]          kind: g green, p pitch, k parking, w water, r railway
  TW tram tracks  [[x,y],...]   TR tram lines [line, [[x,y],...]]   TS/BS tram/bus stops [x,y,name]
  SF street furniture by type, rows [OSM node ID, x, y]; trees add a 4th item, the OSM genus, when it is tagged
  L  landmarks    {id: {...}}  real shapes of the buildings the game models by hand (src/landmarks/)
"""
import argparse, glob, json, math, os, re, sys, xml.etree.ElementTree as ET
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGIN = [45.0571, 7.6282]                 # lat, lon of the north-west corner
K = [78653.96734960107, 111132]            # metres per degree [lon, lat] at this latitude
QB = 2                                     # resolution (m) of buildings and areas
# playable area in map metres: x0, y0, x1, y1 (version 1 was [500, 400, 2300, 2050])
CLIP = [500, 400, 2300, 2400]

# ---------------------------------------------------------------- reading OSM
def load_osm(paths):
    nodes, ways, rels = {}, {}, {}
    for f in paths:
        for e in ET.parse(f).getroot():
            t = {x.get('k'): x.get('v') for x in e.findall('tag')}
            if e.tag == 'node':
                nodes[e.get('id')] = (float(e.get('lat')), float(e.get('lon')), t)
            elif e.tag == 'way':
                ways[e.get('id')] = ([n.get('ref') for n in e.findall('nd')], t)
            elif e.tag == 'relation':
                rels[e.get('id')] = ([(m.get('type'), m.get('ref'), m.get('role')) for m in e.findall('member')], t)
    return nodes, ways, rels

def to_xy(lat, lon):
    return ((lon - ORIGIN[1]) * K[0], (ORIGIN[0] - lat) * K[1])

def to_ll(x, y):
    return (ORIGIN[0] - y / K[1], ORIGIN[1] + x / K[0])

# ---------------------------------------------------------------- encoding
def enc_num(v, out):
    v = ~(v << 1) if v < 0 else (v << 1)
    while v >= 0x20:
        out.append(chr((0x20 | (v & 0x1f)) + 63)); v >>= 5
    out.append(chr(v + 63))

def encode(pts, q):
    out, px, py = [], 0, 0
    for x, y in pts:
        ix, iy = int(round(x / q)), int(round(y / q))
        enc_num(ix - px, out); enc_num(iy - py, out); px, py = ix, iy
    return ''.join(out)

def dedupe(pts, q):
    o = []
    for p in pts:
        r = (round(p[0] / q), round(p[1] / q))
        if not o or (round(o[-1][0] / q), round(o[-1][1] / q)) != r:
            o.append(p)
    return o

def area(r):
    return abs(sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r))) / 2)

def centroid(r):
    return (sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r))

def half(v):
    return round(v * 2) / 2

def rdp_idx(pts, a, b, tol):
    """Ramer-Douglas-Peucker on indices a..b (inclusive); returns the indices to keep."""
    if b - a < 2:
        return [a, b]
    ax, ay = pts[a]; bx, by = pts[b]
    dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1e-9
    best, bi = -1, a
    for i in range(a + 1, b):
        d = abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L
        if d > best: best, bi = d, i
    if best <= tol:
        return [a, b]
    return rdp_idx(pts, a, bi, tol)[:-1] + rdp_idx(pts, bi, b, tol)

# ---------------------------------------------------------------- OSM geometry
class Geo:
    def __init__(self, nodes, ways, rels):
        self.N, self.W, self.R = nodes, ways, rels

    def way_xy(self, wid):
        refs = self.W[wid][0]
        if not all(r in self.N for r in refs):
            return None
        return [to_xy(*self.N[r][:2]) for r in refs]

    def closed_ring(self, wid):
        p = self.way_xy(wid)
        if not p or len(p) < 4 or self.W[wid][0][0] != self.W[wid][0][-1]:
            return None
        return p[:-1]

    def stitch(self, wids):
        """Joins ways into closed rings (for multipolygons)."""
        segs = [list(self.W[w][0]) for w in wids if w in self.W and all(r in self.N for r in self.W[w][0])]
        rings = []
        while segs:
            cur = segs.pop(0)
            changed = True
            while cur[0] != cur[-1] and changed:
                changed = False
                for i, s in enumerate(segs):
                    if s[0] == cur[-1]: cur += s[1:]
                    elif s[-1] == cur[-1]: cur += s[::-1][1:]
                    elif s[-1] == cur[0]: cur = s + cur[1:]
                    elif s[0] == cur[0]: cur = s[::-1] + cur[1:]
                    else: continue
                    segs.pop(i); changed = True; break
            if cur[0] == cur[-1] and len(cur) >= 4:
                rings.append([to_xy(*self.N[r][:2]) for r in cur[:-1]])
        return rings

    def polygons(self, pred):
        """Returns [(tags, outer, holes, id)] for closed ways and multipolygons that satisfy pred(tags)."""
        out = []
        for wid, (refs, t) in self.W.items():
            if pred(t):
                r = self.closed_ring(wid)
                if r: out.append((t, r, [], 'w' + wid))
        for rid, (mem, t) in self.R.items():
            if t.get('type') != 'multipolygon' or not pred(t):
                continue
            outer = self.stitch([m[1] for m in mem if m[0] == 'way' and m[2] in ('outer', '')])
            inner = self.stitch([m[1] for m in mem if m[0] == 'way' and m[2] == 'inner'])
            for o in outer:
                hs = [h for h in inner if point_in(centroid(h), o)]
                out.append((t, o, hs, 'r' + rid))
        return out

def point_in(pt, ring):
    x, y, c = pt[0], pt[1], False
    for i in range(len(ring)):
        a, b = ring[i], ring[i - 1]
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            c = not c
    return c

def in_box(p, box, m=0):
    return box[0] - m <= p[0] <= box[2] + m and box[1] - m <= p[1] <= box[3] + m

# ---------------------------------------------------------------- classification
ROAD_CLS = {'primary': 'P', 'primary_link': 'P', 'trunk': 'P', 'trunk_link': 'P',
            'secondary': 'S', 'secondary_link': 'S', 'tertiary': 'T', 'tertiary_link': 'T',
            'residential': 'R', 'unclassified': 'R', 'living_street': 'R', 'pedestrian': 'X'}

def building_kind(t):
    b = t.get('building', '')
    if b in ('church', 'cathedral', 'chapel') or t.get('amenity') == 'place_of_worship': return 1
    if b in ('stadium', 'arena') or t.get('leisure') == 'stadium': return 2
    if b in ('garage', 'garages', 'roof', 'shed', 'kiosk', 'carport', 'hut'): return 3
    if b in ('school', 'kindergarten') or t.get('amenity') in ('school', 'kindergarten'): return 4
    return 0

# use of a building for its facade: r apartment block, h house, c church, p public/services, m commercial,
# i industrial, g garage/shed, u unknown. From the OSM building tag; for building=yes, from the other OSM tags or the
# Arpa Piemonte use (USO: R residential, S services, P productive).
FACADE_USE = {
    'apartments': 'r', 'residential': 'r', 'dormitory': 'r',
    'house': 'h', 'detached': 'h', 'semidetached_house': 'h', 'terrace': 'h', 'villa': 'h', 'farm': 'h', 'bungalow': 'h',
    'church': 'c', 'cathedral': 'c', 'chapel': 'c',
    'school': 'p', 'kindergarten': 'p', 'government': 'p', 'public': 'p', 'civic': 'p', 'hospital': 'p', 'university': 'p',
    'college': 'p', 'sports_centre': 'p', 'sports_hall': 'p', 'stadium': 'p', 'arena': 'p', 'gym': 'p', 'fire_station': 'p',
    'train_station': 'p', 'transportation': 'p', 'air-supported': 'p',
    'retail': 'm', 'commercial': 'm', 'supermarket': 'm', 'office': 'm', 'shop': 'm', 'mall': 'm',
    'industrial': 'i', 'warehouse': 'i', 'manufacture': 'i', 'factory': 'i', 'service': 'i', 'hangar': 'i', 'storage_tank': 'i',
    'garage': 'g', 'garages': 'g', 'roof': 'g', 'shed': 'g', 'carport': 'g', 'hut': 'g', 'kiosk': 'g',
}
ARPA_USE = {'R': 'r', 'S': 'p', 'P': 'i'}

def facade_use(t, arpa_use=None):
    u = FACADE_USE.get(t.get('building', ''))
    if not u:
        if t.get('amenity') == 'place_of_worship': u = 'c'
        elif t.get('amenity') in ('school', 'kindergarten', 'hospital', 'clinic', 'library', 'townhall', 'police'): u = 'p'
        elif t.get('shop'): u = 'm'
        else: u = ARPA_USE.get(arpa_use, 'u')
    return u.upper() if t.get('building:material') == 'brick' else u

def levels(t):
    try:
        return max(0, int(float(t.get('building:levels', '0').split(';')[0])))
    except ValueError:
        return 0

ROOF_SHAPES = ('flat', 'gabled', 'hipped', 'half-hipped', 'pyramidal', 'skillion', 'gambrel', 'mansard', 'round', 'dome', 'onion', 'saltbox')

def roof_info(t):
    """Roof tags of a building: 0 when none is mapped, else [shape, roof height in m (0 = unknown), roof levels, orientation]."""
    shape = t.get('roof:shape', '').strip().lower()
    if shape not in ROOF_SHAPES: shape = ''
    try: h = round(float(t.get('roof:height', '0').split(';')[0].replace('m', '').strip()), 1)
    except ValueError: h = 0
    try: rl = max(0, int(float(t.get('roof:levels', '0').split(';')[0])))
    except ValueError: rl = 0
    o = t.get('roof:orientation', '') if t.get('roof:orientation') in ('along', 'across') else ''
    return [shape, h, rl, o] if shape or h or rl else 0

def area_kind(t):
    if t.get('natural') == 'water' or t.get('water') or t.get('landuse') in ('basin', 'reservoir') \
       or (t.get('leisure') == 'swimming_pool' and 'building' not in t):
        return 'w'
    if t.get('leisure') in ('park', 'garden', 'dog_park') or t.get('landuse') in ('grass', 'village_green', 'recreation_ground', 'meadow', 'forest', 'flowerbed') \
       or t.get('natural') in ('wood', 'scrub', 'grassland'):
        return 'g'
    if t.get('leisure') in ('pitch', 'playground', 'track'):
        return 'p'
    if t.get('amenity') == 'parking' and t.get('parking') not in ('underground', 'multi-storey', 'rooftop') and t.get('layer', '0') in ('0', ''):
        return 'k'
    if t.get('landuse') == 'railway':
        return 'r'
    return None

# ---------------------------------------------------------------- landmarks (real shapes, modelled by hand in the game)
# id OSM: w = way, r = relation, n = node
LANDMARKS = {
    'stadium':       {'outer': 'r1695662', 'pitch': 'w124253933', 'name': 'Stadio Olimpico Grande Torino'},
    'maratonaTower': {'shape': 'w106487762', 'h': 40, 'name': 'Torre Maratona'},
    'cauldron':      {'node': 'n1765623646', 'h': 57, 'name': 'Braciere Olimpico'},
    'arena':         {'shape': 'w41753512', 'h': 12, 'name': 'Inalpi Arena'},
    'piscinaMonumentale': {'shape': 'w49054011', 'levels': 2, 'name': 'Piscina Stadio Monumentale'},
    'piscinaOlimpica':    {'shape': 'w106357922', 'levels': 2, 'name': 'Nuova Piscina Olimpica'},
    'aquatica':           {'shape': 'w106487528', 'levels': 1, 'name': 'Aquatica'},
    'outdoorPool':        {'shape': 'w106403249', 'name': 'Vasca esterna'},
    'piscinaSebastopoli': {'shape': 'w211767603', 'name': 'Piscina Sebastopoli'},
    'torinoNuoto':        {'shape': 'w243270140', 'name': 'Torino Nuoto'},
    'villaAmoretti':      {'shape': 'w56250013', 'name': 'Villa Amoretti'},
    'centraleLatte':      {'area': 'w242182366', 'name': 'Centrale del Latte di Torino'},
    'sme':                {'area': 'w49046716', 'univ': True, 'name': 'Scuola di Management ed Economia'},
    'rignon':             {'area': 'w48135024', 'detail': True, 'name': 'Parco Rignon'},
}
KEEP_TAGS = ('building', 'building:levels', 'height', 'roof:shape', 'roof:height', 'roof:levels', 'roof:orientation', 'man_made',
             'name', 'building:colour', 'roof:colour', 'building:material', 'roof:material', 'leisure', 'sport', 'surface',
             'highway', 'natural', 'genus', 'attraction', 'amenity', 'playground', 'step_count', 'lit')

class Heights:
    """Real heights from ARPA Piemonte (tools/fetch_heights.py): for each OSM building without a level count,
    takes the largest volumetric unit inside its footprint and converts metres into levels."""
    def __init__(self, path):
        self.grid = defaultdict(list)   # units with a height
        self.uses = defaultdict(list)   # units with a use (USO)
        if not os.path.exists(path):
            return
        for f in json.load(open(path))['buildings']:
            r = [to_xy(y, x) for x, y in f['rings'][0]]
            c = centroid(r)
            cell = (int(c[0] // 50), int(c[1] // 50))
            if f.get('use'):
                self.uses[cell].append((c, area(r), f['use']))
            if f.get('h') and f['h'] > 0:
                self.grid[cell].append((c, area(r), f['h']))
    def __bool__(self):
        return bool(self.grid)
    @staticmethod
    def _largest(grid, outer):
        xs, ys = [p[0] for p in outer], [p[1] for p in outer]
        best = None
        for gx in range(int(min(xs) // 50), int(max(xs) // 50) + 1):
            for gy in range(int(min(ys) // 50), int(max(ys) // 50) + 1):
                for u in grid[(gx, gy)]:
                    if (best is None or u[1] > best[1]) and point_in(u[0], outer):
                        best = u
        return best
    def levels_for(self, outer):
        best = self._largest(self.grid, outer)
        # calibrated on buildings that have both: height ≈ 3.3 m per level + 2 m
        return max(1, round((best[2] - 2) / 3.3)) if best else 0
    def use_for(self, outer):
        best = self._largest(self.uses, outer)
        return best[2] if best else None

def speed_limit_kmh(value):
    # OSM uses km/h for bare numbers. Keep unknown and non-metric values unset.
    match = re.fullmatch(r'([0-9]+(?:\.[0-9]+)?)(?: *km/h)?', (value or '').strip())
    if not match:
        return None
    speed = float(match.group(1))
    if not math.isfinite(speed) or speed <= 0:
        return None
    return int(speed) if speed.is_integer() else speed


def street_furniture(nodes, clip):
    tags = {
        'trees': ('natural', 'tree'),
        'streetLamps': ('highway', 'street_lamp'),
        'benches': ('amenity', 'bench'),
        'wasteBins': ('amenity', 'waste_basket'),
    }
    furniture = {kind: [] for kind in tags}
    for node_id, (lat, lon, node_tags) in nodes.items():
        for kind, (key, value) in tags.items():
            if node_tags.get(key) != value:
                continue
            x, y = to_xy(lat, lon)
            if in_box((x, y), clip):
                row = [node_id, half(x), half(y)]
                if kind == 'trees' and node_tags.get('genus'):
                    row.append(node_tags['genus'])
                furniture[kind].append(row)
    for rows in furniture.values():
        rows.sort(key=lambda row: int(row[0]))
    return furniture


VENUE_AMENITIES = {
    'bar', 'biergarten', 'cafe', 'cinema', 'fast_food', 'food_court', 'ice_cream',
    'music_venue', 'nightclub', 'pharmacy', 'pub', 'restaurant', 'theatre',
}


def sign_category(tags):
    shop = tags.get('shop')
    if shop and shop not in ('no', 'vacant'):
        return 'shop=' + shop
    amenity = tags.get('amenity')
    if amenity in VENUE_AMENITIES:
        return 'amenity=' + amenity
    return None


def sign_details(tags):
    name = tags.get('name', '').strip()
    category = sign_category(tags)
    if not name or not category:
        return None
    if tags.get('location') == 'underground' or any(tags.get(key) == 'yes' for key in ('disused', 'abandoned')):
        return None
    levels = tags.get('level', '').strip()
    if levels and '0' not in {level.strip() for level in levels.split(';')}:
        return None
    return name, category, 0 if levels else None


def shop_signs(geo, clip):
    signs = []
    point_locations = defaultdict(list)
    for node_id, (lat, lon, tags) in geo.N.items():
        details = sign_details(tags)
        if not details:
            continue
        position = to_xy(lat, lon)
        if in_box(position, clip):
            signs.append(['n' + node_id, *details, [half(v) for v in position]])
            point_locations[details[0].casefold(), details[1]].append(position)

    area_signs = {}
    for tags, ring, holes, osm_id in geo.polygons(sign_details):
        name, category, level = sign_details(tags)
        if any(point_in(p, ring) and not any(point_in(p, h) for h in holes)
               for p in point_locations[name.casefold(), category]):
            continue  # prefer the mapped point when the same venue is tagged on its outline
        vertices = [p for p in ring if in_box(p, clip)]
        if not vertices:
            continue
        center = centroid(ring)
        if not (in_box(center, clip) and point_in(center, ring) and not any(point_in(center, h) for h in holes)):
            center = min(vertices, key=lambda p: math.dist(p, center))
        size = area(ring)
        if osm_id not in area_signs or size > area_signs[osm_id][0]:
            area_signs[osm_id] = size, [osm_id, name, category, level, [half(v) for v in center]]

    signs.extend(sign for _, sign in area_signs.values())
    return sorted(signs, key=lambda sign: (sign[0][0], int(sign[0][1:])))


def build(geo, clip, landmark_ids=True, heights=None):
    N, W, R = geo.N, geo.W, geo.R
    road_box = (clip[0], clip[1], clip[2], clip[3])
    tram_box = (clip[0] - 450, clip[1] - 750, clip[2] + 450, clip[3] + 750)
    names, name_idx = [], {}
    def nidx(n):
        if not n: return -1
        if n not in name_idx: name_idx[n] = len(names); names.append(n)
        return name_idx[n]

    # --- roads: whole ways touching the area; simplified, always keeping junctions
    R_out, sel = [], []
    for wid, (refs, t) in W.items():
        cls = ROAD_CLS.get(t.get('highway'))
        if not cls or t.get('area') == 'yes' or t.get('layer', '0').startswith('-') or t.get('tunnel') in ('yes', 'building_passage'):
            continue
        if cls == 'X' and not t.get('name'):
            continue
        p = geo.way_xy(wid)
        if not p or not any(in_box(q2, road_box) for q2 in p):
            continue
        sel.append((wid, cls, t))
    use = Counter(r for wid, _, _ in sel for r in W[wid][0])
    for wid, cls, t in sel:
        refs = W[wid][0]
        keep = [i for i, r in enumerate(refs) if i == 0 or i == len(refs) - 1 or use[r] > 1]
        pts_all = [to_xy(*N[r][:2]) for r in refs]
        idx = []
        for a, b in zip(keep, keep[1:]):
            idx += rdp_idx(pts_all, a, b, 2.5)[:-1]
        idx.append(keep[-1])
        ow = t.get('oneway')
        ow = 1 if ow in ('yes', '1', 'true') or t.get('junction') in ('roundabout', 'circular') else (-1 if ow == '-1' else 0)
        try: lanes = int(t.get('lanes', '0').split(';')[0])
        except ValueError: lanes = 0
        pts = dedupe([(round(pts_all[i][0]), round(pts_all[i][1])) for i in idx], 1)
        if len(pts) < 2: continue
        road = [cls, ow, nidx(t.get('name')), lanes, encode(pts, 1)]
        speed = speed_limit_kmh(t.get('maxspeed'))
        if speed is not None:
            road.append(speed)
        R_out.append(road)

    # --- landmarks: real shapes; the replaced buildings are removed from the generic list
    L, skip_geo = {}, []          # skip_geo: (centroid, area) of the buildings modelled by hand
    def shape_of(ref):
        kind, i = ref[0], ref[1:]
        if kind == 'w' and i in W:
            r = geo.closed_ring(i)
            return (r, []) if r else (None, None)
        if kind == 'r' and i in R:
            mem = R[i][0]
            o = geo.stitch([m[1] for m in mem if m[0] == 'way' and m[2] in ('outer', '')])
            h = geo.stitch([m[1] for m in mem if m[0] == 'way' and m[2] == 'inner'])
            return (o[0], h) if o else (None, None)
        return None, None
    def q(r): return [[half(x), half(y)] for x, y in r]
    def tagsub(t): return {k: v for k, v in t.items() if k in KEEP_TAGS}
    def lines_in(ring, pred):
        out = []
        for wid, (refs, t) in W.items():
            if not pred(t): continue
            p = geo.way_xy(wid)
            if p and sum(point_in(x, ring) for x in p) * 2 >= len(p):
                out.append({'tags': tagsub(t), 'pts': q(p)})
        return out
    if landmark_ids:
        for lid, spec in LANDMARKS.items():
            o = {'name': spec['name']}
            if 'node' in spec:
                n = N.get(spec['node'][1:])
                if not n: print('missing landmark', lid, file=sys.stderr); continue
                o['pos'] = [half(v) for v in to_xy(n[0], n[1])]
            ref = spec.get('shape') or spec.get('outer') or spec.get('area')
            if ref:
                ring, holes = shape_of(ref)
                if not ring: print('missing landmark', lid, ref, file=sys.stderr); continue
                o['outer'] = q(ring); o['holes'] = [q(h) for h in holes]
                if 'area' not in spec: skip_geo.append((centroid(ring), area(ring)))
                t = (W.get(ref[1:]) or R.get(ref[1:]) or (None, {}))[1]
                o['tags'] = tagsub(t)
            if 'pitch' in spec:
                r2, _ = shape_of(spec['pitch']); o['pitch'] = q(r2) if r2 else None
            for k2 in ('h', 'levels'):
                if k2 in spec: o[k2] = spec[k2]
            if 'area' in spec:
                ring = o['outer']; c = centroid(ring)
                inner = []
                for wid, (refs, t) in W.items():
                    is_b = 'building' in t or t.get('man_made') in ('water_tower', 'silo', 'storage_tank')
                    if not is_b: continue
                    r2 = geo.closed_ring(wid)
                    if not r2: continue
                    cc = centroid(r2)
                    near_univ = spec.get('univ') and t.get('building') == 'university' and math.hypot(cc[0] - c[0], cc[1] - c[1]) < 250
                    if not (point_in(cc, ring) or near_univ): continue
                    if any(math.hypot(cc[0] - s[0][0], cc[1] - s[0][1]) < 3 for s in skip_geo): continue
                    inner.append({'id': 'w' + wid, 'outer': q(r2), 'tags': tagsub(t)})
                    skip_geo.append((cc, area(r2)))
                o['buildings'] = inner
                if spec.get('detail'):
                    o['paths'] = lines_in(ring, lambda t: t.get('highway') in ('footway', 'path', 'steps', 'pedestrian', 'cycleway'))
                    o['treeRows'] = lines_in(ring, lambda t: t.get('natural') == 'tree_row')
                    o['areas'] = [{'tags': tagsub(t), 'outer': q(r2)} for t, r2, _, _ in geo.polygons(
                        lambda t: t.get('leisure') in ('playground', 'dog_park', 'pitch', 'garden') or t.get('amenity') in ('fountain',))
                        if point_in(centroid(r2), ring)]
                    o['trees'] = [[half(v) for v in to_xy(la, lo)] for la, lo, t in N.values()
                                  if t.get('natural') == 'tree' and point_in(to_xy(la, lo), ring)]
                    o['points'] = [{'tags': tagsub(t), 'pos': [half(v) for v in to_xy(la, lo)]} for la, lo, t in N.values()
                                   if (t.get('amenity') in ('bench', 'fountain', 'drinking_water', 'waste_basket') or t.get('leisure') in ('playground',)
                                       or t.get('playground')) and point_in(to_xy(la, lo), ring)]
            L[lid] = o

    def skipped(outer):
        c, a = centroid(outer), area(outer)
        return any(math.hypot(c[0] - s[0][0], c[1] - s[0][1]) < 3 and abs(a - s[1]) < 0.15 * s[1] + 5 for s in skip_geo)

    # --- buildings (no duplicates: some stadiums are mapped twice as a relation)
    B_out, BR_out, BF_out, seen, stats = [], [], [], set(), Counter()
    for t, outer, holes, oid in geo.polygons(lambda t: 'building' in t and t.get('building') != 'no' and t.get('layer', '0')[:1] != '-' and t.get('location') != 'underground'):
        if not any(in_box(p, clip) for p in outer): continue
        if area(outer) < 6 or skipped(outer): continue
        c = centroid(outer); key = (round(c[0]), round(c[1]), round(area(outer) / 10))
        if key in seen: continue
        seen.add(key)
        o = dedupe(outer, QB)
        if len(o) < 3: continue
        lv = levels(t)
        if not lv and heights:
            lv = heights.levels_for(outer)
            if lv: stats['arpa_heights'] += 1
        elif lv: stats['osm_levels'] += 1
        row = [lv, building_kind(t), encode(o, QB)]
        for h in holes:
            hh = dedupe(h, QB)
            if len(hh) >= 3: row.append(encode(hh, QB))
        B_out.append(row)
        BR_out.append(roof_info(t))
        if BR_out[-1]: stats['roofs'] += 1
        BF_out.append(facade_use(t, heights.use_for(outer) if heights else None))

    # --- areas
    A_out = []
    for t, outer, holes, oid in geo.polygons(lambda t: area_kind(t) is not None and 'building' not in t):
        if not any(in_box(p, clip) for p in outer): continue
        o = dedupe(outer, QB)
        if len(o) < 3: continue
        row = [area_kind(t), encode(o, QB)]
        for h in holes:
            hh = dedupe(h, QB)
            if len(hh) >= 3: row.append(encode(hh, QB))
        A_out.append(row)

    # --- trams: tracks, lines, stops; bus stops
    TW = []
    for wid, (refs, t) in W.items():
        if t.get('railway') != 'tram': continue
        p = geo.way_xy(wid)
        if not p or not any(in_box(q2, tram_box) for q2 in p): continue
        TW.append([[half(x), half(y)] for x, y in p])
    TR = []
    for rid, (mem, t) in R.items():
        if t.get('route') != 'tram': continue
        line = t.get('ref') or t.get('name', '?')
        seq = []
        can_reverse_start = True  # the first usable way has no established direction yet
        for member_type, wid, role in mem:
            if member_type != 'way' or role not in ('', 'forward', 'backward') or wid not in W: continue
            refs = W[wid][0]
            if len(refs) < 2 or not all(r in N for r in refs): continue
            if not seq: seq = list(refs); continue
            if refs[0] == seq[-1]: seq += refs[1:]
            elif refs[-1] == seq[-1]: seq += refs[::-1][1:]
            elif can_reverse_start and seq[0] in (refs[0], refs[-1]):
                seq = seq[::-1]; seq += refs[1:] if refs[0] == seq[-1] else refs[::-1][1:]
            else: seq += refs  # gap: carry on anyway
            can_reverse_start = False
        pts = [to_xy(*N[r][:2]) for r in seq]
        pts = [p for p in pts if in_box(p, tram_box, 1200)]
        inside = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:]) if in_box(a, clip, 60) and in_box(b, clip, 60))
        if len(pts) < 2 or inside < 300: continue
        row = [line, [[half(x), half(y)] for x, y in pts]]
        if not any(r[0] == row[0] and r[1][0] == row[1][0] and r[1][-1] == row[1][-1] for r in TR):
            TR.append(row)
    TS, BS = [], []
    for nid, (la, lo, t) in N.items():
        p = to_xy(la, lo)
        if not in_box(p, clip, 400): continue
        if t.get('railway') == 'tram_stop' or (t.get('public_transport') == 'stop_position' and t.get('tram') == 'yes'):
            TS.append([half(p[0]), half(p[1]), t.get('name', '')])
        elif t.get('highway') == 'bus_stop' and in_box(p, clip, 80):
            BS.append([half(p[0]), half(p[1]), t.get('name', '')])

    print('buildings:', len(B_out), '| levels from OSM:', stats['osm_levels'], '| heights from ARPA:', stats['arpa_heights'],
          '| no data:', len(B_out) - stats['osm_levels'] - stats['arpa_heights'], '| roof tags:', stats['roofs'])
    return {'v': 2, 'qb': QB, 'origin': ORIGIN, 'k': K, 'clip': clip, 'names': names,
            'R': R_out, 'B': B_out, 'BR': BR_out, 'BF': ''.join(BF_out), 'A': A_out, 'TW': TW, 'TR': TR, 'TS': TS, 'BS': BS, 'SF': street_furniture(N, clip), 'L': L}

def compare(new, old):
    print('key           new      old')
    for k in ('R', 'B', 'A', 'TW', 'TR', 'TS', 'BS', 'names'):
        print(f'{k:8} {len(new[k]):8} {len(old.get(k, [])):8}')
    print('road classes new     ', sorted(Counter(r[0] for r in new['R']).items()))
    print('road classes old     ', sorted(Counter(r[0] for r in old['R']).items()))
    print('building kinds new   ', sorted(Counter(b[1] for b in new['B']).items()))
    print('building kinds old   ', sorted(Counter(b[1] for b in old['B']).items()))
    print('facade uses new      ', sorted(Counter(new.get('BF', '')).items()))
    print('facade uses old      ', sorted(Counter(old.get('BF', '')).items()))
    print('areas new', sorted(Counter(a[0] for a in new['A']).items()))
    print('areas old', sorted(Counter(a[0] for a in old['A']).items()))
    print('tram lines new', [(t[0], len(t[1])) for t in new['TR']])
    print('tram lines old', [(t[0], len(t[1])) for t in old['TR']])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--osm', default=os.path.join(ROOT, '.osm-cache'))
    ap.add_argument('--out', help='write the map to a different path')
    ap.add_argument('--clip', type=float, nargs=4, default=CLIP)
    ap.add_argument('--shop-signs-out', help='write named shop and venue points separately for Unreal')
    ap.add_argument('--compare')
    ap.add_argument('--no-landmarks', action='store_true')
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(a.osm, '*.osm')))
    if not files: sys.exit('No .osm files in ' + a.osm + ' — run tools/fetch_osm.py first')
    geo = Geo(*load_osm(files))
    clip = [int(v) for v in a.clip]
    heights = Heights(os.path.join(a.osm, 'arpa_buildings.json'))
    if not heights: print('warning: ARPA heights missing, run tools/fetch_heights.py')
    data = build(geo, clip, not a.no_landmarks, heights)
    if a.compare:
        compare(data, json.load(open(a.compare)))
    map_out = a.out or os.path.join(ROOT, 'data', 'torino.json')
    signs_out = a.shop_signs_out
    if not a.out and not signs_out:
        signs_out = os.path.join(ROOT, 'data', 'santa_rita_shop_signs.json')
    os.makedirs(os.path.dirname(os.path.abspath(map_out)), exist_ok=True)
    with open(map_out, 'w') as f:
        json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
    print('wrote', map_out, os.path.getsize(map_out), 'bytes;', 'landmarks:', ', '.join(data['L']))
    if signs_out:
        signs = shop_signs(geo, clip)
        os.makedirs(os.path.dirname(os.path.abspath(signs_out)), exist_ok=True)
        with open(signs_out, 'w', encoding='utf-8') as f:
            json.dump(signs, f, separators=(',', ':'), ensure_ascii=False)
            f.write('\n')
        print('wrote', signs_out, ':', len(signs), 'named shops and venues')

if __name__ == '__main__':
    main()
