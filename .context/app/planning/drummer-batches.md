# Drummer batches

How the next drummers are built from the long list, and the assignments for
the next batch. The ranking they come from, and the plan for batches 2 to 4,
are in `drumming-research.md`, section DC (Phase 15-d).

A batch is eight forks, four running at a time. Each fork builds one drummer
completely in its own scratch folder and never touches the repo. The parent
merges. The owner's memory note on drummer batches has the merge steps and the
traps from earlier batches; this file is what each fork is told.

## Batch 1 (planned and built 2026-10-22)

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
Latin jazz), since the merge script files each style into its group. Merge
with the repo's `scripts/lineage/batch/merge.py`, never a scratchpad copy: it
replaces a candidate's record with the fork's upgraded one, applies the
fork's `track-links.json`, and checks the whole hand-over before it writes
anything. Copy the forks' working tools (`check.ts`, `record-check.ts`,
`beats.py`, `tabrev.py` and the rest) and `render/` from scratchpad
`07323667-d5f3-4e56-9c57-d4c292b51eeb`, the one 15-d ran from, into `$S`.
After the merge, run `npx vitest run tests/unit/lib/app/lineage` and re-rank
(`scripts/lineage/batch/README.md`) before planning the next batch.

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

## Owner's picks (built 2026-10-23)

Three drummers the owner asked for by name, outside the ranking: Terry
Bozzio (a batch 2 candidate, taken early), and two YouTube drummers with no
record before this, El Estepario Siberiano and Clay Aeschliman. El Estepario
starts the YouTube drummers group, the first group for drummers known mainly
from video, and his recordings are the videos themselves (the recording
schema's `video` format). Clay Aeschliman is filed with the progressive
drummers: his fame is Polyphia's records, and his videos play them.

| Fork | Drummer                | Record                           | Style key    | Likeness          | Research | Drummers-tab group                 |
| ---- | ---------------------- | -------------------------------- | ------------ | ----------------- | -------- | ---------------------------------- |
| 1    | Terry Bozzio           | `drummer:terry-bozzio`           | `bozzio`     | `TERRY_BOZZIO`    | DL       | Progressive and math rock drummers |
| 2    | El Estepario Siberiano | `drummer:el-estepario-siberiano` | `estepario`  | `EL_ESTEPARIO`    | DM       | YouTube drummers (new)             |
| 3    | Clay Aeschliman        | `drummer:clay-aeschliman`        | `aeschliman` | `CLAY_AESCHLIMAN` | DN       | Progressive and math rock drummers |

What came of it:

- **Bozzio** supersedes §AK's "not added": the 15-d rules take a dated
  `coordination.devices_search` where no device holds in a song, so he is
  built from the songs the grid can play (Zappa, Missing Persons). His
  melodic ostinato solos and _The Black Page_ stay out, and his hint says so.
- **Exercises are songs.** A style has no slot for an exercise, so El
  Estepario's Drumeo exercises are songs whose sections are the exercise's
  steps, labelled as exercises. A library entry with written sticking, as
  the rudiments have, would be a better home later.
- **`singlePedalRuns`**, a new style attribute: kick runs on one pedal at
  the speed others need two for. The generator keeps them and the critic
  passes them, as with `doubleKick`, but the 3D drummer plays them with one
  foot. Before it, a single-pedal player's runs had to claim a double pedal.

## Owner's picks, second set (built 2026-10-24)

Three more by name. Greg Errico and Andy Newmark were candidates (batch 1
ranks); DJ Johnson of Khruangbin had no record: `drummer:donald-johnson` is A
Certain Ratio's drummer, a different man, so his is `drummer:dj-johnson`.

| Fork | Drummer      | Record                 | Style key   | Likeness       | Research | Drummers-tab group       |
| ---- | ------------ | ---------------------- | ----------- | -------------- | -------- | ------------------------ |
| 1    | DJ Johnson   | `drummer:dj-johnson`   | `djjohnson` | `DJ_JOHNSON`   | DO       | Funk drummers            |
| 2    | Greg Errico  | `drummer:greg-errico`  | `errico`    | `GREG_ERRICO`  | DP       | Funk drummers            |
| 3    | Andy Newmark | `drummer:andy-newmark` | `newmark`   | `ANDY_NEWMARK` | DQ       | Pop and session drummers |

What came of it:

- **A player's own front head.** `KitStyle.head` paints the kick's front head
  as the player's was, in place of BeatBreaker's name: Errico's Sly and the
  Family Stone lettering, traced from the owner's image into outlines
  (`front-heads.ts`). `fineDots` prints his black shells' rows of small studs.
- **Machine tabs are not transcriptions.** Errico's fork found four Sly tracks
  listing machine-made Songsterr tabs under `transcriptions`, which is for
  human ones; they are gone. Six of his seven songs follow machine tabs
  (nothing human exists), checked against the records for tempo and form,
  and say so.
- **Fresh was played to a drum machine.** Newmark played along with Sly's
  Rhythm Ace on every track (his own account, 2021): his drums over it, not
  instead of it, so the songs keep sampled kits and the machine's part is not
  written. In Time's bars are verse 1 from a published score; the rest of its
  form reuses them, and says so.

## Batch 2, first three (planned 2026-10-26)

The top three of the re-ranked long list (`rank.py`, 2026-10-26), all 15-a
candidates: keep the record ids. Max Weinberg starts a new group, Heartland
and roots rock drummers, filed after Progressive and math rock and before Punk.

| Fork | Drummer      | Record                 | Style key     | Likeness       | Research | Drummers-tab group                      | Copy from                           |
| ---- | ------------ | ---------------------- | ------------- | -------------- | -------- | --------------------------------------- | ----------------------------------- |
| 1    | Steve Jordan | `drummer:steve-jordan` | `stevejordan` | `STEVE_JORDAN` | DT       | Pop and session drummers                | `newmark`, `porcaro`, `watts`       |
| 2    | Clem Burke   | `drummer:clem-burke`   | `clemburke`   | `CLEM_BURKE`   | DU       | New wave drummers                       | `copeland`, `paulcook`, `moon`      |
| 3    | Max Weinberg | `drummer:max-weinberg` | `maxweinberg` | `MAX_WEINBERG` | DV       | Heartland and roots rock drummers (new) | `levonhelm`, `kenneyjones`, `watts` |

**What each fork should watch for:**

1. **Steve Jordan.** A session drummer across decades: the _Saturday Night
   Live_ and _Late Night_ bands, Keith Richards' X-Pensive Winos, John
   Mayer Trio, and the Rolling Stones since 2021. Keep the build to his
   pocket: behind-the-beat backbeat, ghost notes, the hi-hat feel. Check each
   credit; on a session record he may not be on every track.
2. **Clem Burke.** Blondie, 1976–82: the Moon-and-Ringo fills over a
   disco or new wave groove. "Heart of Glass" (to a drum machine's pulse:
   check what he played over it), "Dreaming", "Atomic", "One Way or
   Another" (not "Call Me": Keith Forsey drums on it). Sampled kits unless the record shows he played electronics.
3. **Max Weinberg.** The E Street Band from 1974: _Born to Run_, _Darkness_,
   _Born in the U.S.A._ The big snare and the four-on-the-floor drive. On
   _Born to Run_ the title track is Ernest "Boom" Carter's, recorded before
   Weinberg joined, and _Greetings_ and _The Wild, the Innocent_ are Vini
   Lopez's: check every credit.

What came of it (built 2026-10-27):

- **Library corrections.** The forks found four errors in existing records,
  each fixed with its source: _Born to Run_'s title track is Ernest "Boom"
  Carter's (the album now has two co-drummers); _Take It So Hard_ is Charley
  Drayton's drumming, with Jordan on bass; and three YouTube links pointed at
  live films (Tenth Avenue Freeze-Out, Gravity, Who Did You Think I Was) where
  the record was meant.
- **A tab's "china" is not evidence.** Burke's One Way or Another tab writes
  its accent on 4 as a china. No china is seen on his 1978 kit and no source
  names one, so those hits are on the second crash. Check a tab's china
  against the kit before adding a drummer to the china players.
- **Heart of Glass's kick** is on every beat (two human tabs and Burke's own
  account), against the tab followed for the rest of the song; the record
  keeps it as an open question.
- **Jordan's years with the X-Pensive Winos are not played yet:** their two
  candidate songs had disagreeing or groove-only tabs.

## Owner's picks, Motown (planned 2026-10-27)

The Funk Brothers' three drummers, by name. Uriel Jones and Richard "Pistol"
Allen are 15-a candidates: keep the record ids. Benny Benjamin was built on
2026-10-19 (BR) from five human tabs; his fork revisits the style rather than
building it, so `merge.py` (which refuses an existing key) does not apply to
him and the parent splices his entry by hand. All three file under Soul and
Motown drummers.

| Fork | Drummer                | Record                         | Style key       | Likeness         | Research | Drummers-tab group       | Copy from                    |
| ---- | ---------------------- | ------------------------------ | --------------- | ---------------- | -------- | ------------------------ | ---------------------------- |
| 1    | Uriel Jones            | `drummer:uriel-jones`          | `urieljones`    | `URIEL_JONES`    | DW       | Soul and Motown drummers | `bennybenjamin`, `aljackson` |
| 2    | Richard "Pistol" Allen | `drummer:richard-pistol-allen` | `pistolallen`   | `PISTOL_ALLEN`   | DX       | Soul and Motown drummers | `bennybenjamin`, `aljackson` |
| 3    | Benny Benjamin         | `drummer:benny-benjamin`       | `bennybenjamin` | `BENNY_BENJAMIN` | BR       | Soul and Motown drummers | (his own style)              |

**What each fork should watch for:**

1. **Uriel Jones.** The owner asked for three songs by name: "Ain't Too Proud
   to Beg" (the Temptations, 1966), "Signed, Sealed, Delivered I'm Yours"
   (Stevie Wonder, 1970) and "25 Miles" (Edwin Starr, 1969). Build all three.
   Motown credited no players before 1971: check each credit, and where the
   sources disagree say so in the comment, the hint and the record.
   Grapevine (Marvin Gaye) and Cloud Nine are his best known.
2. **Pistol Allen.** Holland-Dozier-Holland's hits: Baby Love, Where Did Our
   Love Go, Reach Out I'll Be There and the Supremes' four-on-the-floor
   snare. Uptight is disputed between him and Benjamin.
3. **Benny Benjamin.** BR left Get Ready, Going to a Go-Go and You Can't
   Hurry Love out for want of human tabs. Search again, and where none exists
   reconstruct from the record (beat-tracked, labelled a reconstruction),
   since the earlier refusal left out his best-known records. Upgrade the
   record to schema 1.6.0; his likeness stays unless better photographs turn up.

## Batch 2, next three (claimed 2026-10-29)

The top three of the re-ranked long list (`rank.py`, 2026-10-29), all 15-a
candidates: keep the record ids. Each files into a group that exists.

| Fork | Drummer        | Record                   | Style key      | Likeness         | Research | Drummers-tab group                  | Copy from                          |
| ---- | -------------- | ------------------------ | -------------- | ---------------- | -------- | ----------------------------------- | ---------------------------------- |
| 1    | Alex Van Halen | `drummer:alex-van-halen` | `alexvanhalen` | `ALEX_VAN_HALEN` | DY       | Hard rock drummers                  | `bonham`, `paice`, `rogertaylor`   |
| 2    | Mick Fleetwood | `drummer:mick-fleetwood` | `fleetwood`    | `MICK_FLEETWOOD` | DZ       | Blues and psychedelic rock drummers | `mitchell`, `baker`, `kenneyjones` |
| 3    | Richie Hayward | `drummer:richie-hayward` | `hayward`      | `RICHIE_HAYWARD` | EA       | Heartland and roots rock drummers   | `levonhelm`, `zigaboo`, `purdie`   |

**What each fork should watch for:**

1. **Alex Van Halen.** Van Halen with David Lee Roth, 1978–84: the swing in
   the shuffle, the big open toms, and the double-bass gallop of "Hot for
   Teacher". On _1984_ check what he played on "Jump" (a drum machine or
   Simmons pads would allow an electronic kit for that song alone, per the
   sampled-kit rule) and on "Panama". "You Really Got Me" is the Kinks' song:
   score his part, not Mick Avory's.
2. **Mick Fleetwood.** Two bands under one name: the Peter Green blues band
   ("Oh Well", "Albatross") and the _Rumours_ era. "Go Your Own Way"'s
   tom-led verse, "Dreams", "The Chain" and "Tusk" are the parts players
   learn. Check each _Rumours_ and _Tusk_ credit and how each part was made
   (loops, overdubs, the USC band) before scoring it as one drummer's part.
3. **Richie Hayward.** Little Feat's New Orleans-inflected groove on a rock
   kit: "Dixie Chicken", "Fat Man in the Bathtub", "Spanish Moon", "Two
   Trains". Confirm from the sleeves that he plays on each track you score;
   Little Feat used other drummers and percussionists on some sessions.

What came of it (built 2026-10-29):

- **Songs.** Van Halen eight (1978–84), Fleetwood seven (1968–79), Hayward
  six (1972–78), all from human tabs bar Hayward's Rock and Roll Doctor, a
  machine tab checked against the record for tempo and form, which says so.
  Albatross (timpani mallets), Oh Well (empty tabs), You Really Got Me (the
  Kinks' part), and Two Trains (machine tab only, its tempo off the record)
  are left out.
- **Tape loops of his own playing.** Fleetwood's Dreams and Tusk were built
  on loops of him; scored as his parts, the loops named in each comment.
- **Hot for Teacher's intro** is Simmons pads and rototoms, so it is left
  out and every Van Halen song keeps a sampled kit; nothing places a drum
  machine on Jump.
- **Library corrections.** Seven Little Feat tracks listed machine-made
  Songsterr tabs as `transcriptions`; they are off, and Dixie Chicken's human
  tab (2920774) is in. Spanish Moon stays Hayward's: three Discogs sleeves
  credit him alone, against Wikipedia's uncited Fred White.
- **No second bass drum.** Van Halen has `doubleKick`, but the 3D kit draws
  one bass drum for every drummer.

## Batch 2, next two (claimed 2026-10-29)

The top two of the re-ranked long list (`rank.py`, 2026-10-29), both 15-a
candidates: keep the record ids. Each files into a group that exists.

| Fork | Drummer       | Record                  | Style key | Likeness        | Research | Drummers-tab group | Copy from                          |
| ---- | ------------- | ----------------------- | --------- | --------------- | -------- | ------------------ | ---------------------------------- |
| 1    | Peter Erskine | `drummer:peter-erskine` | `erskine` | `PETER_ERSKINE` | EB       | Fusion drummers    | `hakim`, `gadd`, `dejohnette`      |
| 2    | Dale Crover   | `drummer:dale-crover`   | `crover`  | `DALE_CROVER`   | EC       | Grunge drummers    | `mattcameron`, `billward`, `grohl` |

**What each fork should watch for:**

1. **Peter Erskine.** Weather Report, 1978–82 (_Mr. Gone_ in part, _8:30_,
   _Night Passage_, _Weather Report_ 1982), then Steps Ahead, and the big
   bands before them (Stan Kenton, Maynard Ferguson). Much of his playing is
   swing on the ride: score it as swing, with its own feel, not as a straight
   fusion groove. "Birdland" is Alex Acuña's and "Teen Town" is Jaco
   Pastorius on drums: check every _Heavy Weather_ and _Mr. Gone_ credit
   (Tony Williams and Steve Gadd play on parts of _Mr. Gone_).
2. **Dale Crover.** The Melvins from 1984: the slow, heavy sludge and the
   big tom work of _Gluey Porch Treatments_, _Bullhead_, _Houdini_ and
   _Stoner Witch_. He also drums on Nirvana's January 1988 demo, and
   "Floyd the Barber" and "Paper Cuts" on _Bleach_ come from it: confirm
   each credit (Chad Channing plays the rest of _Bleach_). Check meter on
   each Melvins song; some shift or stretch bars.

What came of it (built 2026-10-29):

- **Songs.** Erskine three (1978), Crover five (1988–93). Erskine's are the
  live Birdland and Teen Town from Offenbach and Black Market from _8:30_:
  his takes of the two _Heavy Weather_ songs, not Acuña's or Pastorius's.
  No human transcription of his parts is free (the published ones are Hal
  Leonard's), so each is rebuilt from a machine tab aligned to the record,
  and says so. Crover's are all from human tabs.
- **No swing tune for Erskine yet.** Night Passage's tab is one bar repeated
  and Rockin' in Rhythm has none; it is an open question in his record.
- **One figure per section is too few.** Crover's first build held one bar
  per section and gave five distinct breaks in twelve presses of New. The
  fork put back the tab's own variations (Boris's riff never repeats two
  bars running) and the test passes with no `HELD` entry. Only Paper Cuts
  truly holds its grooves.
- **Library corrections.** _8:30_'s Birdland and Teen Town linked the
  _Heavy Weather_ takes and listed human tabs of Acuña's and Pastorius's
  studio parts (removed); Floyd the Barber linked a 1991 Grohl concert and
  Night Goat a 2007 one; Eye Flys listed a machine-made tab (removed). Each
  machine tab a song is built from is cited in its track's evidence, not
  listed as a transcription, as for Hayward.

## Batch 2, next four (claimed 2026-10-31)

The top four of the re-ranked long list (`rank.py`, 2026-10-31), all 15-a
candidates: keep the record ids. Three are rock and one funk and soul, inside
the family rule. Earl Hudson starts a new group, Hardcore punk drummers, filed
after Punk drummers. The owner asked for two forks at a time, so they run in
two rounds: Tommy Ramone and Jerry Allison, then Earl Hudson and Roger
Hawkins.

| Fork | Drummer       | Record                  | Style key      | Likeness        | Research | Drummers-tab group               | Copy from                                   |
| ---- | ------------- | ----------------------- | -------------- | --------------- | -------- | -------------------------------- | ------------------------------------------- |
| 1    | Tommy Ramone  | `drummer:tommy-ramone`  | `tommyramone`  | `TOMMY_RAMONE`  | ED       | Punk drummers                    | `paulcook`, `headon`, `ringo`               |
| 2    | Jerry Allison | `drummer:jerry-allison` | `jerryallison` | `JERRY_ALLISON` | EE       | Rock and roll and roots drummers | `djfontana`, `earlpalmer`, `fredbelow`      |
| 3    | Earl Hudson   | `drummer:earl-hudson`   | `earlhudson`   | `EARL_HUDSON`   | EF       | Hardcore punk drummers (new)     | `barker`, `headon`, `carltonbarrett`        |
| 4    | Roger Hawkins | `drummer:roger-hawkins` | `rogerhawkins` | `ROGER_HAWKINS` | EG       | Soul and Motown drummers         | `aljackson`, `bennybenjamin`, `stevejordan` |

**What each fork should watch for:**

1. **Tommy Ramone.** The Ramones' first three albums, 1976–77 (_Ramones_,
   _Leave Home_, _Rocket to Russia_): straight eighths at speed, no fills to
   speak of, the hi-hat or ride driving every bar. Marky Ramone drums from
   _Road to Ruin_ (1978) on, so "I Wanna Be Sedated" is his, not Tommy's:
   check every credit. Score the evenness, not added variation the record
   does not have; if a song truly holds one groove, say so.
2. **Jerry Allison.** Buddy Holly and the Crickets, 1957–59: the tom-tom
   paradiddles of "Peggy Sue", "That'll Be the Day", "Not Fade Away" (played
   on a cardboard box: a sampled kit that comes close, said so) and
   "Everyday" (knee slaps). Check each Holly credit: some sides were cut in
   New York or Clovis with other drummers or none. Swing or shuffle feel per
   song from the record.
3. **Earl Hudson.** Bad Brains, from 1979: hardcore at extreme tempos ("Pay
   to Cum", "Banned in D.C.", "Sailin' On", "Big Takeover") and the reggae
   songs ("I Luv I Jah", "Leaving Babylon"), two feels one drummer. Tempos
   from the record, not the tab, and checked against two hands and two feet;
   the ROIR cassette (1982) and _Rock for Light_ (1983) have different takes
   of some songs: name which one is scored.
4. **Roger Hawkins.** FAME and the Muscle Shoals Rhythm Section: Percy
   Sledge's "When a Man Loves a Woman", Wilson Pickett, Aretha Franklin's
   1967 Atlantic sessions, the Staple Singers' "I'll Take You There", Paul
   Simon, Bob Seger. Session credits are thin and often wrong: confirm each
   from a sleeve or the session logs, and say which songs he shares with
   another drummer.

What came of it (built 2026-10-31):

- **Songs.** Ramone seven (1976–77), Allison four (1957–58), Hudson five
  (all from the ROIR cassette, 1982), Hawkins six (1966–78). All from human
  tabs, bar Hudson's Sailin' On and Big Takeover: machine tabs since corrected
  by hand, which their comments say.
- **Left out.** Not Fade Away (a cardboard box, a tab that writes a hi-hat),
  Everyday (knee slaps), I Wanna Be Your Boyfriend (two bars repeated),
  Hudson's reggae (machine tabs only, and drums that cannot be heard apart
  from the bass on the record), and five Hawkins songs whose only tabs are
  machine drafts. Natural Woman is Gene Chrisman's.
- **Three hand notes at once.** Some Hawkins tabs write the crash with the
  ride, or a hat under a fill. Each is read as a drummer plays it (the crash
  takes the note, the hat goes to the foot), and one tom under a crash and
  snare in I Never Loved a Man is dropped; every bar is listed in his fork's
  notes.
- **Peggy Sue holds one bar for 89 bars**, as both human tabs write it, so it
  has a `HELD` entry in the distinct-breaks test.
- **Library corrections.** Machine-made tabs listed as transcriptions on four
  Crickets songs, House of Suffering, I Luv I Jah and Respect Yourself are
  off; the scored human tabs are on. Two Wikipedia sources pointed at
  disambiguation pages (Oh, Boy! and Roger Hawkins). Five links were the wrong
  take: Blitzkrieg Bop's video edit, Not Fade Away's undubbed upload, Banned
  in D.C.'s and Big Takeover's _Rock for Light_ re-recordings, and I Against
  I's _Omega Sessions_ take. Peggy Sue had no link.
- **The link check fails Big Takeover** because the band's ROIR upload spells
  it "Big Take Over". The link is right and stays.
- **`merge.py` places research before DW's `## Sources`**, not at the end of
  the file, and adds a style to a group the parent has already written. Each
  section was moved to the end, and the doubled group entry taken out.

## Batch 2, next two (claimed 2026-10-31)

The top two of the re-ranked long list (`rank.py`, 2026-10-31), both 15-a
candidates: keep the record ids. One is rock and one jazz, inside the family
rule, and each files into a group that exists. The owner asked for one fork at
a time, so Cozy Powell runs first, then Steve Smith.

| Fork | Drummer     | Record                | Style key    | Likeness      | Research | Drummers-tab group | Copy from                         |
| ---- | ----------- | --------------------- | ------------ | ------------- | -------- | ------------------ | --------------------------------- |
| 1    | Cozy Powell | `drummer:cozy-powell` | `cozypowell` | `COZY_POWELL` | EH       | Hard rock drummers | `bonham`, `paice`, `alexvanhalen` |
| 2    | Steve Smith | `drummer:steve-smith` | `stevesmith` | `STEVE_SMITH` | EI       | Fusion drummers    | `gadd`, `colaiuta`, `erskine`     |

**What each fork should watch for:**

1. **Cozy Powell.** Rainbow, 1975–80 (_Rising_, _Long Live Rock 'n' Roll_,
   _Down to Earth_): "Stargazer", "Tarot Woman", "A Light in the Black",
   "Since You Been Gone", "All Night Long". Before that the Jeff Beck Group
   (1971–72) and his own hit "Dance with the Devil" (1973); after it MSG,
   Whitesnake's _Slide It In_ (1984), Emerson, Lake & Powell and Black
   Sabbath's _Headless Cross_ (1989). Whitesnake's 1987 album is Aynsley
   Dunbar's, not his: check each credit. Check meter and feel on "Stargazer"
   and the long Rainbow songs from the record; the double bass is his, but
   the 3D kit draws one bass drum.
2. **Steve Smith.** Journey, 1978–85 (_Evolution_ to _Frontiers_): "Any Way
   You Want It", "Don't Stop Believin'", "Who's Crying Now", "Separate Ways",
   "Faithfully". He files as fusion, so look for Vital Information and Steps
   Ahead tunes with human tabs and a link to add to the Journey songs. Larrie
   Londin plays most of _Raised on Radio_ (1986): check every credit. Score
   any swing or shuffle as such, not straightened.

## The brief each fork gets

Paste this to each fork, with its row from the batch table and `S`, the
scratchpad the batch runs from.

> You are one fork of eight. Build one drummer completely, in your own folder
> `<OUT>` = `$S/drummers/<key>/`. The parent merges your files into the repo
> with the repo's `scripts/lineage/batch/merge.py`.
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
>   `prisma/seeds/app-beatbreaker/data/styles.ts`, prettier-shaped.
> - `<OUT>/likeness.ts.txt`: `const <CONST>: Persona = { ... };` with the
>   leading comment naming one moment and its sources, as in
>   `lib/app/breaks/drummer/likenesses.ts`.
> - `<OUT>/research.md`: `## <LETTER>. <Name> (<date>)` for
>   `drumming-research.md`, in the house style of CW to CZ, with the song
>   table and a Sources list.
> - `<OUT>/model/drummers/<slug>.json`: **the upgraded record, same id.**
>   `record_status: draft`; `beatbreaker.style_key` set; `group` and
>   `build_priority` removed (a built drummer's group is its style's);
>   `songs_short_because` kept only if its reason still holds. Then
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
> (`kenneyjones`, `budgie`, `mikejoyce`) in
> `prisma/seeds/app-beatbreaker/data/styles.ts`;
> `lib/app/breaks/catalogue/schemas.ts`; in `lib/app/breaks/`, `sections.ts`
> (a song: at most 32 distinct bars, 26 sections, 32 arrangement slots),
> `meter.ts`, `lanes.ts`, `generate.ts` and `critic.ts`; the model's
> `README.md`, `schema/*.json`, `lib/app/lineage/check.ts`, `build.ts`,
> `layout.ts` (`GENRE_FAMILY`: list any genre you add) and
> `tests/unit/lib/app/lineage/model.test.ts`.
>
> **The songs.** The ones that show the drummer's playing best, up to eight.
> Quality, not a quota: there is no minimum, and a drummer who played on few
> songs worth hearing gets few. Each reproduces the flow of the record:
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
> (Ajv, `checkCorpus`, `buildLineage`, `checkGraph`): 0 bad. **Never add,
> move or drop a note, or lower a tempo, to pass the critic.** It holds a
> song only to two hands and two feet at its tempo (`physical.ts`); a bar
> that fails that is a misreading of the tab or a tab error, so read the bar
> again, and if the tab really asks for it, put the bar, the check and the
> tab's notes in `notes.md` for the parent. Last, run the
> merge's own checks, which write nothing:
> `python3 -I scripts/lineage/batch/merge.py --check . $S/drummers <key> <CONST> '<group>'`
> from the repo. It fails unless every song in your style has exactly one
> track naming it (in `track-links.json` or a new recording), every link
> finds its track, and your song keys clash with no other style's: the rules
> the lineage tests enforce after the merge.
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
