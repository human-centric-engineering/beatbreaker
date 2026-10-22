# Drummer batches

How the next drummers are built from the long list, and the assignments for
the next batch. The ranking they come from, and the plan for batches 2 to 4,
are in `drumming-research.md`, section DC (Phase 15-d).

A batch is eight forks, four running at a time. Each fork builds one drummer
completely in its own scratch folder and never touches the repo. The parent
merges. The owner's memory note on drummer batches has the merge steps and the
traps from earlier batches; this file is what each fork is told.

## Batch 1 (planned 2026-10-22)

Every drummer here is a 15-a candidate: the record exists, and so do its
songs from 15-b. Keep the record id. Research letters follow DC in
`drumming-research.md`.

| Fork | Drummer        | Record                   | Style key       | Likeness         | Research | Drummers-tab group                      | Copy from                          |
| ---- | -------------- | ------------------------ | --------------- | ---------------- | -------- | --------------------------------------- | ---------------------------------- |
| 1    | Simon Phillips | `drummer:simon-phillips` | `simonphillips` | `SIMON_PHILLIPS` | DD       | Fusion drummers                         | `cobham`, `colaiuta`, `paice`      |
| 2    | D. J. Fontana  | `drummer:dj-fontana`     | `djfontana`     | `DJ_FONTANA`     | DE       | Rock and roll and roots drummers        | `earlpalmer`, `levonhelm`          |
| 3    | Matt Cameron   | `drummer:matt-cameron`   | `mattcameron`   | `MATT_CAMERON`   | DF       | Grunge drummers (new)                   | `grohl`, `taylorhawkins`           |
| 4    | Josh Freese    | `drummer:josh-freese`    | `joshfreese`    | `JOSH_FREESE`    | DG       | Alternative rock drummers               | `chadsmith`, `barker`              |
| 5    | Kenny Clarke   | `drummer:kenny-clarke`   | `kennyclarke`   | `KENNY_CLARKE`   | DH       | Bebop drummers                          | `roach`, `haynes`, `phillyjoe`     |
| 6    | Carl Palmer    | `drummer:carl-palmer`    | `carlpalmer`    | `CARL_PALMER`    | DI       | Progressive and math rock drummers      | `bruford`, `collins`, `peart`      |
| 7    | Fred Below     | `drummer:fred-below`     | `fredbelow`     | `FRED_BELOW`     | DJ       | Blues drummers (new)                    | `earlpalmer`, `texasshuffle`       |
| 8    | Milton Banana  | `drummer:milton-banana`  | `miltonbanana`  | `MILTON_BANANA`  | DK       | Samba and Brazilian jazz drummers (new) | `bossa`, `jazzsamba`, `brianblade` |

**The parent before the forks start:** add the three new groups to
`STYLE_GROUPS` in `styles.ts` (Grunge after Alternative rock, Blues before
Blues and psychedelic rock, Samba and Brazilian jazz after Afro-Cuban and
Latin jazz), since the merge script files each style into its group. Copy
`tools/` and `render/` from the newest scratchpad that has them: its
`merge.py` replaces a candidate's record with the fork's upgraded one and
applies the fork's `track-links.json`.

**What each fork should watch for:**

1. **Simon Phillips.** His songs span Judas Priest's _Sin After Sin_, Jeff
   Beck's _There & Back_, 801, Mike Oldfield and Toto. Keep the build to him,
   not to the bands: the open-handed, ambidextrous kit and the double-bass
   shuffle of "Space Boogie". The 801 track has no transcription.
2. **D. J. Fontana.** The Elvis RCA sides of 1956–57. "Hound Dog"'s fills and
   "Jailhouse Rock"'s stop-time hits are the two parts players learn.
   Fontana is not on the Sun sides: check every credit.
3. **Matt Cameron.** Soundgarden's odd meters ("Spoonman" in 7/4, "Fell on
   Black Days" in 6/4, "The Day I Tried to Live" in 7/8 and 4/4) are the
   reason he ranks. Give each section in another meter its own `backbeats`.
4. **Josh Freese.** A session drummer: A Perfect Circle, the Vandals, the
   Offspring's _Rise and Fall, Rage and Grace_, Devo, Guns N' Roses. Check
   each credit; on a session record he may not be on every track.
5. **Kenny Clarke.** Bebop's ride-cymbal time and "bombs". Only three
   Songsterr tabs: work from the records, the Modern Jazz Quartet and Miles
   Davis Prestige sides, and books. Brushes on "Django" and _Ascenseur pour
   l'échafaud_. Swing ratio by tempo, as A0 sets out.
6. **Carl Palmer.** ELP's _Tarkus_ (5/4) and _Brain Salad Surgery_, and Asia.
   "Toccata" uses synthesised percussion: that part alone may use an
   electronic kit, per the sampled-kit rule.
7. **Fred Below.** The Chess backbeat behind Little Walter, Muddy Waters,
   Sonny Boy Williamson and Chuck Berry. 15-b left "Roll Over Beethoven"
   out: its fork found Melvin Billups credited, where the existing record
   lists Below. Settle that one, and confirm every Berry credit (Ebby Hardy
   also drummed for him).
8. **Milton Banana.** Bossa nova as it was first recorded on the kit: brushes
   and rim on the snare under João Gilberto. Check the drummer on _Chega de
   Saudade_ (the 1958 single and the 1959 LP) track by track; Getz/Gilberto is his. The app's
   `bossa` pattern style is the genre; his style is how he played it.

## The brief each fork gets

Paste this to each fork, with its row from the batch table and `S`, the
scratchpad the batch runs from.

> You are one fork of eight. Build one drummer completely, in your own folder
> `<OUT>` = `$S/drummers/<key>/`. The parent merges your files into the repo
> with `$S/tools/merge.py`.
>
> **The repo is read-only to you.** Write only under `<OUT>`. Never run git,
> never edit a repo file, never run the repo's test suite, lint or
> `npm run validate`.
>
> **Machine etiquette.** One process at a time, in the foreground: nothing in
> the background, no parallel downloads, no watcher loops. Seven other forks
> share the machine. Downloads go in their own new empty directory under
> `<OUT>/dl/`; keep audio small (22050 Hz mono wav) and video short
> (`--download-sections`, 480p). **Every HTTP request sends a generic
> User-Agent (`Mozilla/5.0`), never the owner's name or email.** macOS has no
> `timeout`.
>
> **Your drummer is a candidate.** Their record is
> `prisma/seeds/app-beatbreaker/data/drummer-model/drummers/<slug>.json`, at
> `record_status: candidate`, with their songs from 15-b on the recordings'
> `tracks`. Start from both. Your songs come from that list first (the ones
> with a transcription and a link), and you may add others. Every song you
> score must have a track that names it.
>
> **What you hand back:**
>
> - `<OUT>/style.ts.txt`: the full `<key>: { ... },` entry for `STYLES` in
>   `styles.ts`, prettier-shaped.
> - `<OUT>/likeness.ts.txt`: `const <CONST>: Persona = { ... };` with the
>   leading comment naming one moment and its sources, as in
>   `lib/app/breaks/drummer/likenesses.ts`.
> - `<OUT>/research.md`: `## <LETTER>. <Name> (<date>)` for
>   `drumming-research.md`, in the house style of CW to CZ, with the song
>   table and a Sources list.
> - `<OUT>/model/drummers/<slug>.json`: **the upgraded record, same id.**
>   `record_status: draft`; `beatbreaker.style_key` set; `group` and
>   `build_priority` removed (a built drummer's group is its style's);
>   `songs_short_because` kept only if the list is still short. Then
>   everything a built drummer has, at schema 1.6.0: evidence on every claim,
>   eras, playing (feel, technique, kit, sound), influences, `identity.active`,
>   and sourced `devices` or a dated `coordination.devices_search`. Patterns
>   are `stylistic_archetype` or `approximation` only.
> - `<OUT>/model/track-links.json`: one entry per scored song.
>   `{ "recording_id", "title", "style_key", "song_key" }` (and
>   `also_song_keys` if several songs play one track) links a track that is
>   already there; `{ "recording_id", "track": { ... } }` adds a new one to an
>   existing recording. A new recording carries its own tracks.
> - `<OUT>/model/sources/<slug>.json` and `<OUT>/model/recordings/<rec>.json`
>   for anything new (reuse existing ids; an edit to an existing recording
>   other than its tracks goes in `notes.md` for the parent).
> - `<OUT>/notes.md`: the hand-over, in the shape of the last batch's forks
>   (merge command, model files and edges, kit, style and songs, checks and
>   results, tests the parent must update, library contradictions with the
>   evidence, things to know).
>
> **Read first:** `.context/app/catalogue.md` ("A drummer is a style", "A
> style with songs"), `.context/app/drummers.md`, `.context/app/anatomy.md`
> (Likenesses); the styles in your row's "Copy from" and the last batch's
> (`kenneyjones`, `budgie`, `mikejoyce`); `lib/app/breaks/catalogue/schemas.ts`,
> `sections.ts` (a song: at most 32 distinct bars, 26 sections, 32 arrangement
> slots), `meter.ts`, `lanes.ts`, `generate.ts`, `critic.ts`; the model's
> `README.md`, `schema/*.json`, `lib/app/lineage/check.ts`, `build.ts`,
> `layout.ts` (`GENRE_FAMILY`: list any genre you add) and
> `tests/unit/lib/app/lineage/model.test.ts`.
>
> **The songs.** Five to eight, each reproducing the flow of the record:
> intro, verse, chorus, bridge, solo, outro as sections in the record's
> order. Accuracy over speed. For each: **confirm from a discography or the
> sleeve that your drummer plays on it** (the 15-b lines are mostly
> `likely`); tempo from the tab's tempo map and the record beat-tracked;
> meter and swing; structure with bar counts; the part per section as lane
> strings, with fills. Comment each song and figure as the newest styles do
> (record, tab id, revision and `aiGenerated`, tempo evidence, which bars).
> Prefer human tabs; use a machine tab only where nothing human exists,
> checked against the record, and say so. Search Songsterr again for
> transcriptions 15-b missed. Where a song is a reconstruction, say so in
> its comment, the hint and the research.
>
> **Validate** with your `work/check.ts` (schema parse, then every song over
> 40 seeds: soft 0/40, served-not-hard 0/40, playable), run from the repo
> with `npx tsx --tsconfig ./tsconfig.json <OUT>/work/check.ts`, and your
> `work/record-check.ts` over a copy of the model with your files laid on it
> (Ajv, `checkCorpus`, `buildLineage`, `checkGraph`): 0 bad.
>
> **The style.** `drummer: true`; a `hint` in the house voice (who, the feel,
> each song by name and year, the source of the bars, "Approximations, not
> the records."); `weight` from the drummer's own playing, not copied;
> figures and fills drawn from the songs. **Sampled kits only**
> (`engine: 'pack'`), unless they really played electronics on a song. A
> section in another meter states its own `backbeats`. Song keys must not
> clash with any other style's.
>
> **The likeness.** One well-documented moment in their prime, looked at in
> real photos or footage. Only values the `Persona` type allows. Render it
> headless with `$S/render/` and look at the image.
>
> **Finish** with a short summary: songs (year, tempo, meter, sections,
> source of the bars, doubts), kit, weight, likeness moment, check results,
> and anything the parent must do by hand. If you run short of turns, write
> `notes.md` with where you are before you stop.
