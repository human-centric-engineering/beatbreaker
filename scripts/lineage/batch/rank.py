"""Rank the 15-a candidates for the next drummer batches (15-d).

usage, from the repo root: python3 -I scripts/lineage/batch/rank.py <out.json> [top]

Writes every candidate, best first, to <out.json> and prints the top rows.
The method is set out in drumming-research.md, section DC.
"""
import collections, glob, json, math, pathlib, re, sys, unicodedata

OUT = sys.argv[1]
TOP = int(sys.argv[2]) if len(sys.argv) > 2 else 40
MODEL = 'prisma/seeds/app-beatbreaker/data/drummer-model'
POLLS = json.loads((pathlib.Path(__file__).parent / 'polls.json').read_text())


def key(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return ' '.join(re.sub(r'[^a-z0-9 ]', '', s.replace('.', ' ').replace('-', ' ')).split())


D = {}
for f in glob.glob(MODEL + '/drummers/*.json'):
    d = json.load(open(f))
    D[d['meta']['id']] = d
cand = {k: d for k, d in D.items() if d['meta']['record_status'] == 'candidate'}

# Rolling Stone: "A and B" shares a rank; a quoted nickname is dropped.
RS = {}
for r, n in POLLS['rolling_stone_100']['ranks'].items():
    for part in re.split(r' and ', re.sub(r'[“"][^”"]*[”"]', '', n)):
        RS[key(part)] = int(r)
MDH = {key(n) for n in POLLS['modern_drummer']['hall_of_fame']}
MDW = collections.Counter()
for n, c in POLLS['modern_drummer']['wins'].items():
    MDW[key(n)] += c
DB = {key(n) for n in POLLS['downbeat_hof']['names']}

INFL_IN = {'influenced_by', 'cites_as_influence', 'studied_with', 'mentored_by', 'admired'}
INFL_OUT = {'influenced', 'taught', 'mentored', 'cited_by'}
inf = collections.defaultdict(set)
for k, d in D.items():
    for r in d.get('relationships', []):
        t = r.get('target', {}).get('id')
        if not t:
            continue
        if r['type'] in INFL_IN:
            inf[t].add(k)
        if r['type'] in INFL_OUT and k in cand:
            inf[k].add(t)

# songs, with a transcription, with a link; and the transcription sites
songs = collections.defaultdict(lambda: [0, 0, 0, collections.Counter()])
for f in glob.glob(MODEL + '/recordings/*.json'):
    for t in json.load(open(f)).get('tracks', []):
        for di in t['drummer_ids']:
            s = songs[di]
            s[0] += 1
            if t.get('transcriptions'):
                s[1] += 1
                for x in t['transcriptions']:
                    s[3][x['site']] += 1
            if t.get('youtube') or t.get('spotify'):
                s[2] += 1

CONF = {'verified': 1, 'widely_reported': 0.75, 'likely': 0.45, 'needs_verification': 0.2}
HAND = {
    'Indian classical drummers', 'Taiko and samul nori drummers', 'West African traditional drummers',
    'Middle Eastern and Persian drummers', 'Pipe band drummers', 'Irish traditional drummers',
    'Nyabinghi drummers', 'Bomba and plena drummers', 'Afro-Peruvian drummers',
}
HAND_WORDS = (
    'conga', 'bongo', 'tabla', 'djembe', 'taiko', 'cajón', 'cajon', 'mridangam', 'darbuka', 'tombak',
    'bodhrán', 'bodhran', 'sabar', 'talking drum', 'frame drum', 'timbal',
)

rows = []
for k, d in cand.items():
    ident = d['identity']
    names = {key(ident['name']), key(re.sub(r'\(.*?\)', '', ident['name'])), key(ident.get('full_name', ''))}
    for a in ident.get('aliases', []) or []:
        names.add(key(a if isinstance(a, str) else a.get('name', '')))
    names.discard('')
    rsr = min([RS[n] for n in names if n in RS], default=None)
    mdh = any(n in MDH for n in names)
    mdw = max([MDW[n] for n in names], default=0)
    dbh = any(n in DB for n in names)
    poll = max(
        (0.5 + 0.5 * (101 - rsr) / 100) if rsr else 0,
        1 if mdh or dbh else 0,
        min(0.4 + 0.1 * mdw, 0.8) if mdw else 0,
    )
    infl = min(math.log1p(len(inf[k])) / math.log1p(12), 1)
    standing = max(poll, 0.8 * infl)
    n, tr, ln, sites = songs[k]
    confidence = d['legacy']['contribution']['evidence']['confidence']
    build = 0.7 * min(tr, 6) / 6 + 0.3 * min(ln, 8) / 8
    prio = {1: 1, 2: 0.5, 3: 0}[d['beatbreaker']['build_priority']]
    grp = d['beatbreaker']['group']
    inst = ident.get('primary_instruments', [])
    summ = ident.get('summary', '').lower()
    hand = bool(
        grp in HAND
        or (inst and 'drum kit' not in inst)
        or (
            'drum kit' not in inst
            and any(w in summ for w in HAND_WORDS)
            and 'drummer' not in summ.split(',')[0].replace('conga drummer', '')
        )
    )
    score = (0.4 * standing + 0.1 * CONF[confidence] + 0.35 * build + 0.15 * prio) * (0.6 if hand else 1)
    tags = []
    if rsr:
        tags.append(f'RS{rsr}')
    if mdh:
        tags.append('MD HoF')
    elif mdw:
        tags.append(f'MD poll x{mdw}')
    if dbh:
        tags.append('DB HoF')
    rows.append(dict(
        score=round(score * 100, 1), name=ident['name'], group=grp, prio=d['beatbreaker']['build_priority'],
        infl=len(inf[k]), polls=', '.join(tags), conf=confidence, songs=n, trans=tr, links=ln,
        sites=dict(sites), hand=hand, id=k, file=k.split(':')[1],
    ))
rows.sort(key=lambda r: -r['score'])
json.dump(rows, open(OUT, 'w'), indent=1, ensure_ascii=False)
for i, r in enumerate(rows[:TOP]):
    print(i + 1, r['score'], r['name'], r['group'].replace(' drummers', ''), r['prio'], r['infl'], r['polls'],
          r['conf'][:4], f"{r['songs']}/{r['trans']}/{r['links']}", 'HAND' if r['hand'] else '', sep=' | ')
