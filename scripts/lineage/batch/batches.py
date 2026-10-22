"""Pick the next drummer batches from rank.py's output (15-d).

usage, from the repo root: python3 -I scripts/lineage/batch/batches.py <ranking.json> [batches]

Adds each candidate's lineage family, rank and batch to <ranking.json> and
prints the batches. The rules are in drumming-research.md, section DC.
"""
import collections, json, re, sys

RANKING = sys.argv[1]
N = int(sys.argv[2]) if len(sys.argv) > 2 else 4
MODEL = 'prisma/seeds/app-beatbreaker/data/drummer-model/drummers/'
GF = dict(re.findall(r"'(style:[a-z0-9-]+)': '([a-z-]+)'", open('lib/app/lineage/layout.ts').read()))
FAMILIES = ['rock', 'jazz', 'funk-soul', 'metal-experimental', 'latin-african']


def family(d):
    for g in sorted(d['style_profile']['genres'], key=lambda g: -g['weight']):
        if g['style_id'] in GF:
            return GF[g['style_id']]


rows = json.load(open(RANKING))
for i, r in enumerate(rows):
    d = json.load(open(MODEL + r['file'] + '.json'))
    r['family'] = family(d)
    r['rank'] = i + 1
    r.pop('batch', None)  # a rerun on its own output starts clean
    r['summary'] = d['identity'].get('summary', '')
    r['contribution'] = d['legacy']['contribution']['description']

# kit drummers with five songs to listen to
pool = [r for r in rows if not r['hand'] and r['links'] >= 5]
batches = []
for n in range(N):
    b, groups, fc = [], set(), collections.Counter()
    # each family's best first, then down the ranking: one per group, three per family
    for f in FAMILIES:
        for r in pool:
            if r['family'] == f and r['group'] not in groups:
                b.append(r)
                groups.add(r['group'])
                fc[f] += 1
                break
    for r in pool:
        if len(b) >= 8:
            break
        if r in b or r['group'] in groups or fc[r['family']] >= 3:
            continue
        b.append(r)
        groups.add(r['group'])
        fc[r['family']] += 1
    b.sort(key=lambda r: r['rank'])
    for r in b:
        pool.remove(r)
        r['batch'] = n + 1
    batches.append(b)
json.dump(rows, open(RANKING, 'w'), indent=1, ensure_ascii=False)
for i, b in enumerate(batches):
    print(f'--- batch {i + 1}')
    for r in b:
        print(r['rank'], r['score'], r['name'], '|', r['group'], '|', r['family'], '|', r['polls'], '|',
              f"{r['songs']}/{r['trans']}/{r['links']}", r['sites'])
