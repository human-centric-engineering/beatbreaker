"""Merge a fork's scratch snippets into the shared files.

usage, from anywhere:
  python3 -I merge.py [--check] <repo> <scratch-drummers-dir> <key> <CONST> <group>

A fork that built a 15-a candidate hands back the upgraded record (it replaces
the candidate) and model/track-links.json (applied to the recordings).

Everything is checked before anything is written, so a bad hand-over leaves
the repo as it was. --check runs the checks and writes nothing: a fork runs it
as its last check, the parent before the merge.
"""
import json, pathlib, re, shutil, sys

args = sys.argv[1:]
check_only = '--check' in args
if check_only:
    args.remove('--check')
repo, scratch, key, const, group = args[:5]
repo = pathlib.Path(repo)
d = pathlib.Path(scratch) / key
mdir = repo / 'prisma/seeds/app-beatbreaker/data/drummer-model'
styles_p = repo / 'prisma/seeds/app-beatbreaker/data/styles.ts'
likeness_p = repo / 'lib/app/breaks/drummer/likenesses.ts'
research_p = repo / '.context/app/planning/drumming-research.md'

problems = []


def need(ok, msg):
    if not ok:
        problems.append(msg)


# --- checks -----------------------------------------------------------------
for f in ('style.ts.txt', 'likeness.ts.txt', 'research.md'):
    need((d / f).is_file(), f'missing {d / f}')
if problems:
    sys.exit('\n'.join(problems))

styles = styles_p.read_text()
groups_at = styles.index('export const STYLE_GROUPS')
need(f'\n  {key}: {{' not in styles, f'{key} already in STYLES')
need(f"'{group}'" in styles[groups_at:], f'no group {group!r} in STYLE_GROUPS: add it first')
need(f'const {const}: Persona' not in likeness_p.read_text(), f'{const} already in likenesses.ts')

# the style's song keys: `key: '...'` at song depth inside `songs: [`
entry = (d / 'style.ts.txt').read_text()
songs_at = entry.find('\n    songs: [')
song_keys = re.findall(r"^        key: '([^']+)'", entry[songs_at:], re.M) if songs_at >= 0 else []

# each song key must belong to this style alone
for k in song_keys:
    need(f"        key: '{k}'," not in styles, f'song key {k!r} is already used by another style')

# track-links.json: every link resolves, and every song is linked exactly once
links_p = d / 'model' / 'track-links.json'
links = json.loads(links_p.read_text()) if links_p.exists() else []
recordings = {}  # recording id -> (path, record), the fork's own new ones first
for sub in ('recordings',):
    for f in sorted((d / 'model' / sub).glob('*.json')) if (d / 'model' / sub).is_dir() else []:
        rec = json.loads(f.read_text())
        recordings[rec['id']] = (mdir / sub / f.name, rec, True)
linked = {}
for item in links:
    rid = item['recording_id']
    if rid not in recordings:
        rp = mdir / 'recordings' / (rid.split(':', 1)[1] + '.json')
        if not rp.exists():
            need(False, f'no recording {rid}')
            continue
        recordings[rid] = (rp, json.loads(rp.read_text()), False)
    _, rec, _ = recordings[rid]
    tracks = rec.get('tracks', [])
    if 'track' in item:
        t = item['track']
        need(not any(x['title'] == t['title'] for x in tracks), f"{rid} already has a track {t['title']!r}")
        keys = [t.get('song_key'), *t.get('also_song_keys', [])] if t.get('style_key') == key else []
    else:
        hit = [x for x in tracks if x['title'] == item['title']]
        need(len(hit) == 1, f"{len(hit)} tracks titled {item['title']!r} on {rid} (want exactly one)")
        if len(hit) == 1 and hit[0].get('song_key') and hit[0].get('style_key') != key:
            need(False, f"{item['title']!r} on {rid} already plays {hit[0]['style_key']}/{hit[0]['song_key']}")
        need(item.get('style_key') == key, f"link for {item['title']!r} names style {item.get('style_key')!r}, not {key!r}")
        keys = [item.get('song_key'), *item.get('also_song_keys', [])]
    for k in keys:
        if k is None:
            continue
        need(k in song_keys, f'{rid} links song {k!r}, which the style does not have')
        need(k not in linked, f'song {k!r} linked twice: {linked.get(k)} and {rid}')
        linked[k] = rid
# a new recording may carry its own linked tracks
for rid, (_, rec, new) in recordings.items():
    if not new:
        continue
    for t in rec.get('tracks', []):
        if t.get('style_key') != key:
            continue
        for k in [t.get('song_key'), *t.get('also_song_keys', [])]:
            if k is None:
                continue
            need(k in song_keys, f'{rid} links song {k!r}, which the style does not have')
            need(k not in linked, f'song {k!r} linked twice: {linked.get(k)} and {rid}')
            linked[k] = rid
for k in song_keys:
    need(k in linked, f'song {k!r} has no track naming it (add it to track-links.json)')

# model files: a new file is copied; an existing one only if it is a candidate the fork has built
copies = []
for sub in ('drummers', 'recordings', 'sources', 'styles'):
    src = d / 'model' / sub
    if not src.is_dir():
        continue
    for f in sorted(src.glob('*.json')):
        dst = mdir / sub / f.name
        if dst.exists():
            old = json.loads(dst.read_text())
            if sub == 'drummers' and old.get('meta', {}).get('record_status') == 'candidate':
                copies.append((f, dst, 'upgraded candidate'))
            else:
                print('SKIP existing (merge by hand):', sub, f.name)
            continue
        copies.append((f, dst, 'copied'))

if problems:
    sys.exit('not merged:\n  ' + '\n  '.join(problems))
print(f'{key}: {len(song_keys)} songs, each linked once; {len(copies)} model files')
if check_only:
    sys.exit(0)

# --- writes -----------------------------------------------------------------
# styles.ts: entry before the close of STYLES, key into its group
s = styles
end = s.rindex('\n};\n', 0, groups_at)
s = s[:end] + '\n' + entry.rstrip('\n') + s[end:]
gi = s.index(f"'{group}'", s.index('export const STYLE_GROUPS'))
close = s.index(']', gi + len(group) + 2)
# the group's list ends at the first ']' after the heading
before = s[:close].rstrip()
if before.endswith(','):
    s = before + f"\n      '{key}',\n    " + s[close:]
else:
    s = before + f", '{key}'" + s[close:]
styles_p.write_text(s)

# likenesses.ts
s = likeness_p.read_text()
i = s.index('/** Each likeness by the catalogue style')
s = s[:i] + (d / 'likeness.ts.txt').read_text().rstrip('\n') + '\n\n' + s[i:]
j = s.index('\n};\n', s.index('export const LIKENESSES'))
s = s[:j] + f'\n  {key}: {const},' + s[j:]
likeness_p.write_text(s)

# research: before the final "## Sources"
s = research_p.read_text()
i = s.rindex('\n## Sources\n')
s = s[:i] + '\n' + (d / 'research.md').read_text().strip('\n') + '\n' + s[i:]
research_p.write_text(s)
print('merged', key)

for f, dst, how in copies:
    shutil.copy(f, dst)
    print(how, dst.parent.name, f.name)

# track-links.json: the 15-b tracks this style's songs play (D74), and any new tracks
for item in links:
    rp = mdir / 'recordings' / (item['recording_id'].split(':', 1)[1] + '.json')
    rec = json.loads(rp.read_text())
    tracks = rec.setdefault('tracks', [])
    if 'track' in item:
        tracks.append(item['track'])
    else:
        hit = next(t for t in tracks if t['title'] == item['title'])
        hit['style_key'] = item['style_key']
        hit['song_key'] = item['song_key']
        if item.get('also_song_keys'):
            hit['also_song_keys'] = item['also_song_keys']
    rp.write_text(json.dumps(rec, indent=2, ensure_ascii=False) + '\n')
    print('linked', item['recording_id'], item.get('title') or item['track']['title'])
