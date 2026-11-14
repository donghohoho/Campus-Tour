#!/usr/bin/env python3
"""Build a campus map file for the game (same format as assets/campuses/khu-global.json).

Runs on GitHub Actions (.github/workflows/build-campus.yml) because it needs open internet:
  * OpenStreetMap (Overpass API)  — campus boundary, buildings, roads, parks, pitches, water, trees
  * AWS Terrain Tiles (SRTM, terrarium) — ground height

Only buildings whose centre lies inside the campus boundary are kept. Roads and areas are kept
near the campus so the edge doesn't look cut off. Output:
  assets/campuses/<id>.json         map data read by client.js
  assets/campuses/<id>.report.md    what was found (boundary, named buildings with positions, pitches, parks)

Usage:
  python tools/build_campus.py --id yonsei-sinchon --name 연세대학교 --lat 37.5658 --lon 126.9386
  python tools/build_campus.py --id korea-anam --osm way/26253960 --lat 37.588 --lon 127.030
"""
import argparse, io, json, math, os, sys, time, urllib.parse, urllib.request
from PIL import Image

MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter',
           'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
UA = {'User-Agent': 'campus-tour map builder (github.com/donghohoho/Campus-Tour)'}
ROADW = {'motorway': 16, 'trunk': 16, 'primary': 14, 'secondary': 11, 'tertiary': 9, 'residential': 6, 'unclassified': 5,
         'living_street': 5, 'service': 4.5, 'primary_link': 9, 'secondary_link': 7, 'tertiary_link': 6}
FOOTW = {'footway': 2.2, 'path': 1.8, 'pedestrian': 5, 'steps': 3, 'cycleway': 2.2, 'track': 3, 'corridor': 2.2}


def overpass(q):
    last = None
    for attempt in range(3):
        for url in MIRRORS:
            try:
                req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(), headers=UA)
                d = json.loads(urllib.request.urlopen(req, timeout=200).read())
                if 'elements' in d: return d['elements']
            except Exception as e:  # busy mirror → next one
                last = e; print('overpass fail', url, e, file=sys.stderr)
        time.sleep(15)
    raise SystemExit(f'Overpass unavailable: {last}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--lat', type=float, required=True, help='a point on the campus')
    ap.add_argument('--lon', type=float, required=True)
    ap.add_argument('--name', default='', help='name of the campus area in OSM (substring match), e.g. 연세대학교')
    ap.add_argument('--osm', default='', help='campus boundary, e.g. way/26253960 or relation/123 (comma separated); overrides --name')
    ap.add_argument('--radius', type=int, default=1300, help='metres around --lat/--lon to fetch')
    ap.add_argument('--out', default='assets/campuses')
    a = ap.parse_args()

    R = a.radius; dlat = R / 111320; dlon = R / (111320 * math.cos(math.radians(a.lat)))
    bb = f'{a.lat - dlat:.5f},{a.lon - dlon:.5f},{a.lat + dlat:.5f},{a.lon + dlon:.5f}'

    # ── 1. campus boundary ──
    if a.osm:
        ids = [x.strip().split('/') for x in a.osm.split(',') if x.strip()]
        sel = ''.join(f'{t}({i});' for t, i in ids)
        campus_el = overpass(f'[out:json][timeout:120];({sel});out geom tags;')
    else:
        cand = overpass(f'[out:json][timeout:120];(way["amenity"~"university|college"]({bb});relation["amenity"~"university|college"]({bb}););out geom tags;')
        cand = [e for e in cand if a.name and a.name in e.get('tags', {}).get('name', '')] or cand
        if not cand: raise SystemExit('no university area found — pass --osm')
        def dist(e):
            pts = e.get('geometry') or [p for m in e.get('members', []) for p in (m.get('geometry') or [])]
            return min((math.hypot(p['lat'] - a.lat, (p['lon'] - a.lon) * math.cos(math.radians(a.lat))) for p in pts), default=1e9)
        cand.sort(key=dist); campus_el = [cand[0]]
        print('campus candidates:', [(e['type'], e['id'], e['tags'].get('name')) for e in cand[:6]])
    # relations: fetch their outer member ways with full geometry (the bbox search may return them without it)
    for e in campus_el:
        if e['type'] == 'relation':
            ways = overpass(f'[out:json][timeout:120];relation({e["id"]});way(r);out geom;')
            roles = {m['ref']: m.get('role', '') for m in e.get('members', []) if m.get('type') == 'way'}
            e['members'] = [{'type': 'way', 'ref': w['id'], 'role': roles.get(w['id'], 'outer'), 'geometry': w.get('geometry', [])} for w in ways]
    campus_ids = {(e['type'], e['id']) for e in campus_el}

    def bbox_center(els):
        pts = [p for e in els for p in (e.get('geometry') or [q for m in e.get('members', []) for q in (m.get('geometry') or [])])]
        return (min(p['lat'] for p in pts) + max(p['lat'] for p in pts)) / 2, (min(p['lon'] for p in pts) + max(p['lon'] for p in pts)) / 2
    LAT0, LON0 = (round(v, 4) for v in bbox_center(campus_el))
    KX = 111320 * math.cos(math.radians(LAT0)); KZ = 111320
    loc = lambda p: [round((p['lon'] - LON0) * KX, 1), round((p['lat'] - LAT0) * KZ, 1)]

    def rings_of(e):
        if e['type'] == 'way': return [[loc(p) for p in e['geometry']]] if e.get('geometry') else []
        # stitch outer member ways end-to-end into closed rings
        segs = [[(p['lat'], p['lon']) for p in m['geometry']] for m in e.get('members', []) if m.get('role') in ('outer', '') and m.get('geometry')]
        rings = []
        while segs:
            ring = segs.pop(0)
            while ring[0] != ring[-1]:
                for i, sg in enumerate(segs):
                    if sg[0] == ring[-1]: ring += sg[1:]; break
                    if sg[-1] == ring[-1]: ring += sg[::-1][1:]; break
                    if sg[-1] == ring[0]: ring = sg[:-1] + ring; break
                    if sg[0] == ring[0]: ring = sg[::-1][:-1] + ring; break
                else: break
                segs.pop(i)
            rings.append([loc({'lat': a, 'lon': b}) for a, b in ring])
        return rings
    campus = [r for e in campus_el for r in rings_of(e)]

    def pip(x, z, q):
        c = False; j = len(q) - 1
        for i in range(len(q)):
            p1, p2 = q[i], q[j]
            if (p1[1] > z) != (p2[1] > z) and x < (p2[0] - p1[0]) * (z - p1[1]) / (p2[1] - p1[1]) + p1[0]: c = not c
            j = i
        return c
    def segd(x, z, p1, p2):
        dx, dz = p2[0] - p1[0], p2[1] - p1[1]; L = dx * dx + dz * dz or 1; t = max(0, min(1, ((x - p1[0]) * dx + (z - p1[1]) * dz) / L))
        return math.hypot(x - p1[0] - t * dx, z - p1[1] - t * dz)
    inside = lambda x, z: any(pip(x, z, r) for r in campus)
    def near(x, z, m): return inside(x, z) or min(segd(x, z, r[i], r[i - 1]) for r in campus for i in range(len(r))) < m

    # ── 2. everything around it ──
    xs = [p[0] for r in campus for p in r]; zs = [p[1] for r in campus for p in r]
    ext = max(map(abs, xs + zs)) + 250
    dlat = ext / KZ; dlon = ext / KX
    bb = f'{LAT0 - dlat:.5f},{LON0 - dlon:.5f},{LAT0 + dlat:.5f},{LON0 + dlon:.5f}'
    D = overpass(f'''[out:json][timeout:180];(
 way["building"]({bb}); relation["building"]({bb}); way["highway"]({bb});
 way["leisure"~"park|pitch|garden|stadium|track"]({bb}); way["landuse"~"grass|forest|recreation_ground"]({bb});
 way["natural"~"wood|water|scrub"]({bb}); way["amenity"="parking"]({bb}); node["natural"="tree"]({bb}););out geom tags;''')

    B, Rd, A, T, under = [], [], [], [], []
    for e in D:
        t = e.get('tags', {})
        if (e['type'], e['id']) in campus_ids: continue
        if e['type'] == 'node':
            if t.get('natural') == 'tree' and near(*loc(e), 30): T.append(loc(e))
            continue
        if 'building' in t:
            if t.get('location') == 'underground' or (t.get('layer', '0').lstrip('-').isdigit() and int(t.get('layer', '0')) < 0):
                under.append(t.get('name', '')); continue
            for p in rings_of(e):
                if len(p) < 3: continue
                if p[0] == p[-1]: p = p[:-1]
                cx = sum(q[0] for q in p) / len(p); cz = sum(q[1] for q in p) / len(p)
                if not inside(cx, cz): continue
                try: l = max(1, min(30, int(float(t.get('building:levels', '3')))))
                except ValueError: l = 3
                try: h = float(str(t['height']).replace('m', '').strip())
                except Exception: h = round(max(6, l * 4.4), 1)
                B.append({'p': p, 'h': h, 'l': l, 'n': t.get('name', ''), 'c': 1, 'k': t['building']})
            continue
        hw = t.get('highway')
        if hw and e.get('geometry'):
            pts = [loc(p) for p in e['geometry']]; probe = pts[::max(1, len(pts) // 8)] + [pts[-1]]
            if hw in ROADW and (ROADW[hw] >= 9 or any(near(x, z, 60) for x, z in probe)): Rd.append({'p': pts, 'w': ROADW[hw], 't': 'road', 'n': t.get('name', '')})
            elif hw in FOOTW and any(near(x, z, 5) for x, z in probe): Rd.append({'p': pts, 'w': FOOTW[hw], 't': 'foot', 'n': t.get('name', '')})
            continue
        k = None
        if t.get('leisure') in ('park', 'garden') or t.get('landuse') in ('grass', 'recreation_ground'): k = 'park'
        elif t.get('landuse') == 'forest' or t.get('natural') in ('wood', 'scrub'): k = 'wood'
        elif t.get('natural') == 'water': k = 'water'
        elif t.get('amenity') == 'parking': k = 'parking'
        elif t.get('leisure') in ('pitch', 'track', 'stadium'): k = 'pitch'
        if k:
            for p in rings_of(e):
                if len(p) >= 3 and any(near(x, z, 150) for x, z in p[::max(1, len(p) // 6)]): A.append({'k': k, 'p': p, 'n': t.get('name', '')})

    # ── 3. terrain (SRTM via AWS terrarium tiles, zoom 13, bilinear) ──
    Z = 13; tiles = {}
    def tile(x, y):
        if (x, y) not in tiles:
            req = urllib.request.Request(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png', headers=UA)
            tiles[(x, y)] = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read())).convert('RGB').load()
        return tiles[(x, y)]
    def elev(lat, lon):
        n = 2 ** Z; fx = (lon + 180) / 360 * n * 256
        fy = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n * 256
        def px(X, Y): r, g, b = tile(int(X // 256), int(Y // 256))[int(X % 256), int(Y % 256)]; return r * 256 + g + b / 256 - 32768
        x0, y0 = math.floor(fx - 0.5), math.floor(fy - 0.5); u, v = fx - 0.5 - x0, fy - 0.5 - y0
        return (px(x0, y0) * (1 - u) + px(x0 + 1, y0) * u) * (1 - v) + (px(x0, y0 + 1) * (1 - u) + px(x0 + 1, y0 + 1) * u) * v
    N, STEP, GH = 151, 12, 900
    H = [elev(LAT0 + (-GH + j * STEP) / KZ, LON0 + (-GH + i * STEP) / KX) for j in range(N) for i in range(N)]
    mn = min(H); H = [round(h - mn, 1) for h in H]

    out = {'origin': [LAT0, LON0], 'half': 700, 'grid': {'n': N, 'step': STEP, 'half': GH, 'h': H}, 'campus': campus,
           'buildings': B, 'roads': Rd, 'areas': A, 'trees': T}
    os.makedirs(a.out, exist_ok=True)
    json.dump(out, open(f'{a.out}/{a.id}.json', 'w'), ensure_ascii=False, separators=(',', ':'))

    c = lambda p: [round(sum(q[0] for q in p) / len(p)), round(sum(q[1] for q in p) / len(p))]
    rep = [f'# {a.id}', '', f'- origin: {LAT0}, {LON0}', f'- campus boundary: {[(e["type"], e["id"], e.get("tags", {}).get("name")) for e in campus_el]}',
           f'- extent x {min(xs):.0f}..{max(xs):.0f}, z {min(zs):.0f}..{max(zs):.0f} (m; +x east, +z north)',
           f'- buildings kept {len(B)} (named {sum(1 for b in B if b["n"])}), underground skipped {under}',
           f'- roads {len(Rd)}, areas {len(A)}, trees {len(T)}, relief {max(H)} m', '', '## named buildings (name · height · levels · [x, z])']
    rep += [f'- {b["n"]} · {b["h"]} · {b["l"]} · {c(b["p"])}' for b in sorted(B, key=lambda b: b['n']) if b['n']]
    rep += ['', '## pitches / named areas']
    rep += [f'- {x["k"]} · {x["n"] or "-"} · {c(x["p"])}' for x in A if x['k'] == 'pitch' or x['n']]
    open(f'{a.out}/{a.id}.report.md', 'w').write('\n'.join(rep) + '\n')
    print('\n'.join(rep[:8]))


if __name__ == '__main__':
    main()
