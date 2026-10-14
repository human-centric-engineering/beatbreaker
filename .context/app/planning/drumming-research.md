# Drumming research: jazz, blues rock, Mitch Mitchell, next drummers

Gathered 2026-10-08 for the jazz expansion, the blues rock group and the
drummer catalogue. Most jazz and blues figures are standard teaching patterns,
not transcriptions of particular records. **Every Mitch Mitchell song groove is
an approximation** from descriptions and listening; no source online gave exact
transcriptions (Hal Leonard's Hendrix drum books have them).

## Notation

- `# grid 16`: one bar of 4/4 in 16ths. Beats at 0, 4, 8, 12; "and" at +2.
  Swung 8ths sit on even steps; the swing amount is applied separately.
- `# grid 24`: one bar of 12/8 (or 4/4 written in triplets). Pulses at 0, 6,
  12, 18; partials at +0, +2, +4.
- `# grid 18`: 3/4 or 9/8 in triplets. Pulses at 0, 6, 12.
- Lanes: `k` kick, `s` snare (1 ghost, 2 hit, 3 accent, 4 cross-stick,
  5 rimshot), `h` hand hat (1 closed, 3 open, 4 half-open), `hf` hat foot,
  `r` ride (1 ride, 2 bell), `c` crash, `t1`–`t3` toms. A lane a figure does
  not list is silent.
- Kick: a feathered kick is our `kickFeather` attr, not a value. A "bomb" is
  an accented kick.

## A. Jazz

### A0. Swing ratio by tempo (the most important parameter)

Friberg and Sundström measured ride cymbals on records by Tony Williams, Jack
DeJohnette, Jeff Watts and others. The long:short ratio of the swung 8th falls
roughly linearly as tempo rises: about **3.5:1** slow, **2:1** (true triplet)
only near **200 bpm**, about **1:1** very fast. From medium tempo up the short
8th stays near 100 ms.

| Tempo (quarter) | Ratio     | Label                  |
| --------------- | --------- | ---------------------- |
| < 90 (ballads)  | 2.5–3:1   | hard (beyond triplet)  |
| 90–160          | 2.2–2.6:1 | hard / triplet         |
| 160–220         | 1.8–2.2:1 | medium (about triplet) |
| 220–280         | 1.4–1.7:1 | light                  |
| > 280           | 1.1–1.3:1 | near straight          |

Apply it mainly to the ride. Snare and kick comping is better on the 24-step
triplet grid than as swung 8ths.

### A1. Medium swing ("spang-a-lang")

Ride carries the time (1, 2-a, 3, 4-a); hat foot on 2 and 4; kick feathered on
all four; sparse left-hand snare comping. Tempo 120–200. Swing medium–hard
(2–2.4:1).

```
# grid 16
# 1 basic time
r:  '1...1.1.1...1.1.'
hf: '....1.......1...'
k:  '1...1...1...1...'      (feathered)
# 2 Charleston comp (1, &2)
s:  '2.....2.........'
# 3 reverse Charleston (&1, 3)
s:  '..2.....2.......'
# 4 skip-note comps on &2 (ghost) and &4 (hit)
s:  '......1.......2.'
# 5 snare/kick conversation
s:  '..2.............'
k:  '..........2.....'
# 6 bomb on &4 setting up a crash on the next 1
r:  '1...1.1.1...1...'
s:  '............1...'
k:  '..............3.'
```

```
# grid 24
# 7 triplet time + middle-partial ghost comps
r:  '1.....1...1.1.....1...1.'
hf: '......1...........1.....'
s:  '........1...........1...'
k:  '1.....1.....1.....1.....'   (feathered)
# 8 lead-in comp: last partials of beat 4
s:  '....................2...'
k:  '......................2.'
# F1 2-beat triplet fill, snare to toms over 3-4
r:  '1.....1...1.............'
s:  '............2.2.2.......'
t1: '..................2.....'
t2: '....................2...'
t3: '......................2.'
# F2 "klook-mop": rimshot on the last partial of 4, kick on the next 1
s:  '......................5.'
# F3 s-s-k triplet run over 3-4
s:  '............2.2.....2...'
k:  '................2.....2.'
```

### A2. Up-tempo bebop (Kenny Clarke, Max Roach)

Clarke moved time from the hat to the ride and used the kick for irregular
accents, "dropping bombs"; "Klook" is his rimshot-then-kick lick. Roach: crisp
fast ride, melodic tom solos. Tempo 220–340. Swing light to near straight. Hat
foot on 2 and 4; kick silent but for bombs, little or no feathering; sparse
snare in conversation with the kick.

```
# grid 16
# 1 fast quarters on the ride
r:  '1...1...1...1...'
hf: '....1.......1...'
# 2 spang, light swing
r:  '1...1.1.1...1.1.'
hf: '....1.......1...'
# 3 bomb on &2, snare on 4
s:  '............2...'
k:  '......3.........'
# 4 klook-mop in the bar: rimshot &2, bomb on 3
s:  '......5.........'
k:  '........3.......'
# 5 Roach-like off-beat chatter
s:  '..1.......1...2.'
# 6 setup for a band hit on the next 1
r:  '1...1.1.1.......'
s:  '..........2.....'
k:  '..............3.'
# F1 8ths round the kit, beats 3-4
s:  '........2.2.....'
t1: '............2...'
t3: '..............2.'
# F2 Roach motif, stated on 2, answered on 4
t1: '....2.2.........'
s:  '........2.......'
t3: '............2.2.'
# F3 snare/kick alternating 8ths (trading-fours opener)
s:  '2...2...2...2...'
k:  '..2...2...2...2.'
```

### A3. Hard bop (Art Blakey)

Loud hat foot on 2 and 4; crescendoing **press roll** launching choruses;
minimal, well placed comping; the "Moanin'" shuffle (jazz ride over a snare
alternating ghosts with 2 and 4). Tempo 130–260. Swing medium–hard.

```
# grid 16
# 1 basic (hf loud)
r:  '1...1.1.1...1.1.'
hf: '....1.......1...'
k:  '1...1...1...1...'   (feathered)
# 2 "Moanin'" shuffle comp
s:  '1.1.3.1.1.1.3.1.'
# 3 lighter shuffle
s:  '..1.3.1...1.3.1.'
# 4 press roll on 4 into 1 (buzz, crescendo), then crash + kick
r:  '1...1.1.1.......'
s:  '............1123'
# 5 sparse: bomb on 1, comp on &4
s:  '..............2.'
k:  '3...............'
```

```
# grid 24
# 6 shuffle comp on the triplet grid
r:  '1.....1...1.1.....1...1.'
hf: '......1...........1.....'
s:  '....1.3...1.....1.3...1.'
# F2 triplet tom drop
t1: '............2.2.2.......'
t3: '..................2.2.2.'
```

F1: a two-bar press roll (buzz swelling into crash + kick). F3: ensemble
"shout" hits on the Charleston rhythm with a crash on each.

### A4. Brushes ballad

Left hand stirs clockwise, the turn marking the pulse; right hand taps the ride
rhythm on the snare. Tempo 50–90. Swing hard (2.5–3:1). The grid can show the
taps, the hat foot, the feathered kick and accented slaps; it **cannot show the
sweep** (a continuous texture) — that needs a sweep sample per beat or a noise
bed.

```
# grid 16
# 1 basic (sw = sweep onsets, not a lane we have)
sw: '1...1...1...1...'
s:  '1...1.1.1...1.1.'
hf: '....1.......1...'
k:  '1.......1.......'   (feathered)
# 2 half-note sweeps (below ~60 bpm)
s:  '....1.1.....1.1.'
# 3 brush slap comp on &2
s:  '1...1.3.1...1.1.'
```

### A5. Jazz waltz (3/4, Elvin-ish)

Ride 1, 2, a-of-2, 3; hat foot on 2 (or 2 and 3); kick feathered on 1;
triplet-partial comping and two-bar 6/4 hemiolas. Quarter 130–220 (in one above
~180). Swing medium.

```
# grid 18
# 1 standard
r:  '1.....1...1.1.....'
hf: '......1.....1.....'
k:  '1.................'
# 2 alternate ride (1, 2-a, 3-a)
r:  '1.....1...1.1...1.'
# 3 comp: "a" of 1 and middle partial of 3
s:  '....1.........1...'
# 4 k-s-s triplets over 2-3
k:  '......1.....1.....'
s:  '........1.1...1.1.'
# 5 hemiola over 2 bars (crash + kick every 2 beats)
c:  '1...........1.....'   bar 1
c:  '......1...........'   bar 2
```

### A6. Modal / Elvin Jones 12/8

Everything on the triplet grid; ride accented on the skip notes; left hand rolls
middle-partial triplets with the kick on structural notes; phrases start or end
on 2 or 4; superimposed half-note triplets and dotted-quarter groupings. Tempo
120–300 in 4, or 12/8 ballads at dotted quarter 50–80.

```
# grid 24
# 1 ride with skip accents (accents on 10, 22)
r:  '1.....1...1.1.....1...1.'
hf: '......1...........1.....'
# 2 rolling triplet comp
k:  '1...........1...........'
s:  '..1.1.....1...1.1.....1.'
# 3 middle-partial chain
s:  '..1.....1.....1.....1...'
k:  '1.....................2.'
# 4 half-note triplets superimposed
c:  '1.......1.......1.......'
k:  '1.......1.......1.......'
# 5 quarter-note triplets on toms
t1: '1...1...1...............'
t3: '............1...1...1...'
# 6 slow 12/8 ostinato
r:  '1.1.1.1.1.1.1.1.1.1.1.1.'
hf: '......1...........1.....'
k:  '1...........1.......2...'
s:  '........1...........1...'
# 7 hat foot on partials
hf: '....1.....1.....1.....1.'
# F1 s-s-k run round the kit
s:  '..2.2.....2.2...........'
k:  '1.....1...........1.....'
t1: '............2.2.........'
t3: '................2...2.2.'
# F2 triplet stream, crash + kick anticipating the 1
s:  '1.1.1.1.1.1.1.1.1.1.....'
c:  '......................1.'
k:  '......................3.'
```

### A7. Tony Williams (1960s Miles Quintet)

Hat foot on all four; very fast light ride; rimshots, crushed hats, rolls, loud
toms; kick and hat chatter with soloists. Tempo 200–360. Swing light to
straight.

```
# grid 16
# 1 basic
r:  '1...1.1.1...1.1.'
hf: '1...1...1...1...'
# 2 straight-8 ride at extreme tempos
r:  '1.1.1.1.1.1.1.1.'
# 3 rimshot stabs + bomb
s:  '......5.......5.'
k:  '..........3.....'
# 4 broken time
r:  '1.......1.1.....'
s:  '....1.....1...1.'
k:  '..3.............'
# F1 16th singles, snare to floor tom (needs breaking for our 4-snare rule)
s:  '........2222....'
t3: '............2222'
# F2 crash/kick unison bursts
c:  '1.....1.....1...'
k:  '3.....3.....3...'
```

### A8. Bossa nova (jazz context)

Cross-stick two-bar clave; surdo kick; straight 8ths on the hats; brushes an
option. Tempo 110–150. Straight.

```
# grid 16
h:  '1.1.1.1.1.1.1.1.'
s:  '4.....4.....4...'   (bar A)
s:  '....4.....4.....'   (bar B)
k:  '1.....1.1.....1.'
hf: '....1.......1...'
```

### A9. Jazz samba

One 16-step bar = two bars of 2/4. Half note 90–130. Straight.

```
# grid 16
k:  '1..11..11..11..1'   (surdo)
r:  '1.1.1.1.1.1.1.1.'
hf: '..1...1...1...1.'
s:  '4.....4.....4...'   (cross-stick clave)
r:  '1..21..21..21..2'   (bell on the "a")
```

### A10. Afro-Cuban 6/8 in jazz (Art Blakey)

12/8 bell (bembé) on the ride or bell; kick on dotted quarters; hat foot on the
2nd and 4th dotted quarters; left hand fills gaps or plays toms. Dotted quarter
90–140.

```
# grid 24
r:  '2...2...2.2...2...2...2.'
k:  '1.....1.....1.....1.....'
hf: '......1...........1.....'
s:  '..1...1.......1.1.......'
t3: '..................2.....'
# talking toms
t1: '..2.2.....2.............'
t3: '1.....1.....1.2.2.1.....'
```

### A11. Two-beat / Dixieland / New Orleans (Baby Dodds)

Kick on 2 (or 4) to the bar; snare press rolls on 2 and 4 with steady quarters;
rims, shell and woodblock for colour. Tempo 160–260. Swing medium.

```
# grid 16
# 1 two-beat (the 3s are press-roll buzzes)
k:  '1.......1.......'
s:  '1...3...1...3...'
# 2 four-beat
k:  '1...1...1...1...'
# 3 rim clicks
s:  '4.4.4.4.4.4.4.4.'
# 4 choke-cymbal backbeats
c:  '....1.......1...'
s:  '1.1.....1.1.....'
```

### A12. Swing-era big band (Jo Jones, Gene Krupa)

Jo Jones put time on the hat: slightly open, closing on 2 and 4 ("tsss-chick");
light feathered four on the kick, occasional bombs. Krupa: loud tom features.
Tempo 140–260. Swing medium–hard.

```
# grid 16
# 1 Jo Jones hat (4 = half-open, 1 = closed)
h:  '4...1.1.4...1.1.'
hf: '....1.......1...'
k:  '1...1...1...1...'   (feathered)
# 2 Krupa floor-tom jungle groove (approximate, Sing Sing Sing)
t3: '3...2.2.3...2.2.'
k:  '1...1...1...1...'
# 3 ensemble kick on &2 + crash
k:  '1...1.3.1...1...'
c:  '......1.........'
```

### A13. Shuffle swing (Basie)

Tempo 110–170. Swing hard (triplet).

```
# grid 16
h:  '1.1.1.1.1.1.1.1.'
hf: '....1.......1...'
s:  '....2.......2...'
k:  '1...1...1...1...'
s:  '..1.2.1...1.2.1.'   (skip-note ghosts, ride variant)
```

### A14. Jazz-funk / soul jazz (Idris Muhammad, Bernard Purdie)

Tempo 85–120. Straight or light 16th swing.

```
# grid 16
# 1 soul-jazz 8ths
h:  '1.1.1.1.1.1.1.1.'
s:  '....3.1.....3...'
k:  '1.....1...1.....'
# 2 16th ghost funk
h:  '1111111111111111'
s:  '.1..3..1.1..3..1'
# 3 second-line-ish (Idris)
s:  '3..1..1.3.1.1..1'
k:  '1.......1.....1.'
hf: '..1...1...1...1.'
```

### A15. Fusion (Billy Cobham, Steve Gadd)

Cobham: open-handed, double kick, 16th hats, odd meters. Gadd: linear and
march-derived stickings. Tempo 90–140. Straight.

```
# grid 16
# 1 Cobham-ish 16ths + double-kick burst
h:  '1111111111111111'
s:  '....3.......3...'
k:  '1.11....1.11..1.'
# 2 linear (no limbs together)
h:  '1...1...1...1...'
s:  '..2...1...2...1.'
k:  '.1...1...1...1..'
# 3 Gadd-ish march groove (approximate)
h:  '1.1.1.1.1.1.1.1.'
s:  '.1.13.1..1.13.1.'
k:  '1.......1.......'
```

### A16. ECM / broken time (Jack DeJohnette, Paul Motian)

Time implied, ride fragmented, hat foot not reliably on 2 and 4, phrases across
the bar line. Motian sparse, DeJohnette denser. Recipe: start from the spang,
drop 30–60% of ride notes, displace some by a partial, hat foot on random beats,
sparse snare and tom fragments.

```
# grid 16
r:  '1.....1.....1...'
hf: '..........1.....'
s:  '.....1..........'
t3: '..............2.'
```

### A17. Comping vocabulary

- **Charleston**: 1 and &2. **Reverse Charleston**: &1 and 3.
- **Skip-note comps**: &2 and &4.
- **Triplet partials**: +2 the classic ghost, +4 the lead-in. `s s k` and
  `s k k` chains are the bebop and Elvin fill core.
- **Dropping bombs**: an accented kick on &2, &4 or the last partial before 1,
  often with a crash, or after a rimshot ("klook-mop").
- **Trading fours**: 4 bars time, 4 bars solo resolving to the next 1.
- **2-feel vs 4-feel**: in a 2-feel the kick plays 1 and 3, the ride relaxes,
  a cross-stick on 4 is common; in a 4-feel the kick feathers four and comping
  is busier. Switch at a form boundary.

## B. Blues rock

Shuffle orchestrations: **double shuffle** (both hands play the shuffle),
**Texas** (leans on the skip, nearer dotted-8th–16th, 2.5–3:1), **Chicago**
(leans on the downbeats).

### B1. 12/8 slow blues — dotted quarter 45–70

```
# grid 24
h:  '1.1.1.1.1.1.1.1.1.1.1.1.'
s:  '......3...........3.....'
k:  '1.........1.1...........'
# ride + pickup kicks
r:  '1.1.1.1.1.1.1.1.1.1.1.1.'
k:  '1...1.....1.1.....1...1.'
# ghosted partials
s:  '..1...3.1.1...1...3...1.'
# open hat on the last partial
h:  '1.1.1.1.1.1.1.1.1.1.1.3.'
# F1 snare triplet on 4
s:  '..................2.2.2.'
# F2 full-bar roll down the kit
s:  '2.2.2.2.2.2.............'
t1: '............2.2.2.......'
t3: '..................2.2.2.'
```

### B2. Texas shuffle (Chris Layton, SRV "Pride and Joy") — ~115–125, hard swing

```
# grid 16
r:  '1.1.1.1.1.1.1.1.'
s:  '....3.......3...'
k:  '1...1...1...1...'
hf: '....1.......1...'
# "rub": skip-note ghosts
s:  '..1.3.1...1.3.1.'
# double shuffle
h:  '1.1.1.1.1.1.1.1.'
s:  '1.1.3.1.1.1.3.1.'
# bell on the skips (Texas lean)
r:  '1.2.1.2.1.2.1.2.'
# F1 shuffle triplet into a crash
s:  '........2.2.2.3.'
# F2 turnaround hits
c:  '1.....1.........'
k:  '1.....1.........'
```

### B3. Straight-8 blues rock (Cream, Free) — 100–140, straight

```
# grid 16
h:  '1.1.1.1.1.1.1.1.'
s:  '....3.......3...'
k:  '1.....1.1.......'
# ride + open hat
r:  '1.1.1.1.1.1.1.1.'
k:  '1.....1.1.....1.'
# Baker "Sunshine"-style tom beat (approximate)
t3: '2.......2.......'
t1: '....2.......2...'
k:  '1.......1.......'
# crash-wash chorus
c:  '1...1...1...1...'
k:  '1.1.....1.1.....'
```

### B4. Boogie shuffle ("La Grange") — ~155–165, medium–hard swing

```
# grid 16
h:  '1.1.1.1.1.1.1.1.'
s:  '....4.......4...'   (intro: rim)
s:  '....3.......3...'
k:  '1...1...1...1...'
# driving: open-hat backbeats
h:  '1.1.3.1.1.1.3.1.'
k:  '1.1.1...1.1.1...'
```

### B5. Half-time shuffle (Purdie, Bonham "Fool in the Rain", Porcaro "Rosanna") — 75–95

```
# grid 24
h:  '1...1.1...1.1...1.1...1.'
s:  '..1.....1...3.1.....1...'
k:  '1.........1.............'   (Purdie)
k:  '1...1.......1.......1...'   (Porcaro-ish)
k:  '1...1.........1.........'   (Bonham-ish, no ghosts)
```

## C. Mitch Mitchell (The Jimi Hendrix Experience)

**Background.** 1946–2008. Saturdays at Jim Marshall's drum shop as a
schoolboy; Georgie Fame and the Blue Flames Dec 1965–Oct 1966. Influences Elvin
Jones, Tony Williams, Max Roach, Philly Joe Jones, Joe Morello; his hero (per
Fame) was British jazz drummer Ronnie Stephenson. Jazz (traditional) grip.
Modern Drummer Hall of Fame 2009.

**Traits a generator can encode**

1. Triplet-based rolling phrasing (Elvin): snare, kick and tom triplet runs
   inside grooves; press rolls as texture.
2. A conversational, busy snare answering the guitar ("a wasp's nest flurry"
   on Fire).
3. Jazz ride time inside rock songs; heavy crash and ride wash.
4. Fills across the bar line, rolls down the toms in triplets or 16ths; often
   drops the backbeat for a bar or two.
5. A lighter, higher-tuned jazzy kit; open-hat sizzle; the kick follows the
   riff rather than a fixed rock pattern.

Suggested: fill probability 2–3x a rock drummer's, ~40% of fills triplet-based,
frequent middle-partial ghosts, crashes on riff accents.

**Kit.** Premier early 1967; Ludwig from summer 1967 (favourite a 1967 Silver
Sparkle Ludwig, now at the Musicians Hall of Fame; a black Ludwig sold at
Bonhams: 22" kick, 13" rack, 16" floor; a Ludwig Black Panther at Woodstock).
Snare a 5x14 Ludwig Supraphonic 400 (a Rogers Powertone at Woodstock). 1970 a
double-bass Gretsch with Rogers hardware. Cymbals unverified: thin 60s hats,
one ride, one or two crashes. Sample pick: a 60s Ludwig, medium-high tuning,
lightly damped, metal snare.

**Song grooves (all approximate)**

| Song                         | Meter                        | Tempo                      | Feel                                                                  |
| ---------------------------- | ---------------------------- | -------------------------- | --------------------------------------------------------------------- |
| Manic Depression             | 9/8 / triplet 3/4 jazz waltz | ~140 per pulse (also ~112) | Elvin-like; based on Ronnie Stephenson on Dankworth's "African Waltz" |
| Fire                         | 4/4                          | ~150                       | straight, "fast boogaloo"                                             |
| Purple Haze                  | 4/4                          | ~110                       | straight, slight swing lean                                           |
| Foxy Lady                    | 4/4                          | ~110                       | straight, kick doubles the riff                                       |
| Third Stone from the Sun     | 4/4                          | 115 or 172                 | swung jazz ride; Elvin-style jam                                      |
| Spanish Castle Magic         | 4/4                          | ~98                        | heavy, slight swing, ride and crash                                   |
| Crosstown Traffic            | 4/4                          | ~130                       | straight, snare pickups                                               |
| Up From the Skies            | 4/4                          | ~120                       | easy triplet jazz, brushes                                            |
| Voodoo Child (Slight Return) | 4/4                          | ~90                        | heavy straight 8ths, 16th lean                                        |
| If 6 Was 9                   | 4/4                          | ~80                        | slow, slightly swung, jazzy ride                                      |
| Little Wing                  | 4/4                          | ~70                        | restraint breaking into big fills                                     |
| Hey Joe                      | 4/4                          | ~82                        | medium, slight swing, rolls and triplet fills                         |

```
# Manic Depression, grid 18
r:  '1.....1...1.1.....'
h:  '......1...........'
s:  '..1.1.....1...1.1.'
k:  '1...........1.....'
# riff unison accents
c:  '1.................'
k:  '1.....1.....1.....'
s:  '..1.....1.1...1...'
# solo: triplets round the toms
s:  '1.1.1.............'
t1: '......1.1.1.......'
t3: '............1.1.1.'

# Fire, grid 16
h:  '1.1.1.1.1.1.1.1.'
s:  '....3..1....3.1.'
k:  '1.1.....1.1.....'
# stop-start hits
c:  '1.....1.........'
k:  '1.....1.........'
# tom chorus
t3: '2.2.....2.2.....'
s:  '....3.......3...'
k:  '1.......1.......'

# Purple Haze, grid 16
r:  '1.1.1.1.1.1.1.1.'
s:  '....3.......3...'
k:  '1.....1.1.....1.'
s:  '....3..1..1.3...'   (busier, on hat)
# fill, grid 24
s:  '............2.2.2.......'
t1: '..................2.2...'
t3: '......................2.'

# Foxy Lady, grid 16
h:  '1.1.1.1.1.1.1.3.'
s:  '....3.......3...'
k:  '1.....1...1.....'
c:  '1.......1.......'   (chorus hits)

# Third Stone from the Sun, head, grid 16
r:  '1...1.1.1...1.1.'
hf: '....1.......1...'
s:  '......1.......1.'
k:  '1.......1.......'
# jam, grid 24
r:  '1.....1.....1.....1.....'
s:  '..1.1.....1...1.1.....1.'
t3: '......1.............1...'
k:  '1...........1...........'

# Spanish Castle Magic, grid 16
r:  '1.1.1.1.1.1.1.1.'
s:  '....3..1.1..3...'
k:  '1.1.....1.....1.'

# Crosstown Traffic, grid 16
h:  '1.1.1.1.1.1.1.1.'
s:  '....3.......3.11'
k:  '1.1...1.1.1.....'

# Up From the Skies (brushes), grid 16
s:  '1...1.1.1...1.1.'
hf: '....1.......1...'
k:  '1.......1.......'

# Voodoo Child (Slight Return), grid 16
r:  '1.1.1.1.1.1.1.1.'
s:  '....3.......3...'
k:  '1.....1.1.1.....'
# active
h:  '1.1.1.1.1.1.1.3.'
s:  '....3..1.1..3.1.'
k:  '1.....1...1.....'

# If 6 Was 9, grid 16
r:  '1...1.1.1...1.1.'
s:  '....3.......3...'
k:  '1.......1.1.....'

# Little Wing, grid 16
h:  '1.1.1.1.1.1.1.1.'
s:  '....3.......3...'
k:  '1.......1.1.....'

# Hey Joe, grid 16
h:  '1.1.1.1.1.1.1.1.'
s:  '....3..1....3.1.'
k:  '1.....1.1.......'
```

### C2. His songs, one by one (2026-10-09)

A single 4/4 groove at one tempo could not hold him, so the `mitchell` style
plays **songs** (`Style.songs`, `lib/app/breaks/songs.ts`): each New picks one
and its meter, tempo, swing and kit come with it. The table is what they were
built from. Tempos are from songbpm.com (algorithmic, so sometimes half or
double; the doubtful ones are marked) and Bonedo's Hey Joe lesson. No free
transcription of his parts exists (the Hal Leonard drum books are paywalled),
so every bar in the seed is a reconstruction from descriptions and listening.

| Song                                 | Meter                   | Tempo (quarter)                                    | Feel                                     | Time on                        | Confidence                             |
| ------------------------------------ | ----------------------- | -------------------------------------------------- | ---------------------------------------- | ------------------------------ | -------------------------------------- |
| Fire                                 | 4/4                     | 153                                                | straight boogaloo; "wasp's nest" snare   | hats, floor tom in the chorus  | high (tempo)                           |
| Purple Haze                          | 4/4                     | 108                                                | mostly straight                          | crash-ride / hats              | medium                                 |
| Foxey Lady                           | 4/4                     | 98 (not ~110)                                      | straight, kick doubles the riff          | hats, crash on stabs           | medium                                 |
| Hey Joe                              | 4/4                     | 83                                                 | 16th swing ~58–60%                       | hats → crash-ride as it builds | medium-high                            |
| Little Wing                          | 4/4                     | 71                                                 | light 16th swing; sparse, erupting fills | hats, ride in solo             | medium                                 |
| The Wind Cries Mary                  | 4/4                     | 80                                                 | near straight, sparse, snare rolls       | hats                           | medium (sticks vs brushes unconfirmed) |
| Manic Depression                     | 9/8                     | ~150 per dotted quarter (225 as the Studio counts) | jazz waltz, triplets in the meter        | ride, foot on 2 and 3          | high (meter), medium (tempo)           |
| Voodoo Child (Slight Return)         | 4/4                     | 88 felt (176 detected)                             | heavy, 16th lean                         | crash-ride, ride               | medium                                 |
| Voodoo Chile (the jam)               | 12/8                    | ~55 per dotted quarter                             | slow blues, press rolls                  | ride                           | low (tempo)                            |
| Red House                            | 12/8                    | ~60–65 per dotted quarter                          | spare slow blues                         | hats, ride in solo             | low (tempo)                            |
| Up from the Skies                    | swung 4/4, written 12/8 | ~130–150                                           | easy triplet jazz feel                   | **brushes**, foot on 2 and 4   | high (brushes, feel)                   |
| If 6 Was 9                           | 4/4                     | ~56–66 (doubtful)                                  | slow, loose, swung; free-time outro      | jazzy ride                     | low                                    |
| Castles Made of Sand                 | 4/4                     | 94                                                 | light swing, snare pick-ups              | hats                           | medium                                 |
| Spanish Castle Magic                 | 4/4                     | 98                                                 | heavy, slight swing                      | ride and crash                 | medium                                 |
| Third Stone from the Sun             | 4/4                     | doubtful (tape speed)                              | swing ride ~65%, Elvin                   | ride, foot on 2 and 4          | high (feel), low (tempo)               |
| Crosstown Traffic                    | 4/4                     | 113 (not ~130)                                     | chunky, straight                         | hats                           | medium                                 |
| Stone Free                           | 4/4                     | 133                                                | straight, loping                         | hats, ride in chorus           | medium                                 |
| I Don't Live Today                   | 4/4                     | ~120–125 (estimate)                                | tribal                                   | **toms** carry the time        | low                                    |
| 1983… (A Merman I Should Turn to Be) | 4/4                     | ~69                                                | marching snare, bolero crescendo         | snare                          | low                                    |
| All Along the Watchtower             | 4/4                     | 113                                                | straight; heavy tom fills                | hats                           | medium                                 |

What the grid cannot hold: his sextuplets (16th-note triplets) in a 4/4 bar are
folded onto 16ths in threes; 32nd-note spurts are left out; tape-phased and
backwards drums (Bold as Love, Are You Experienced) are not attempted.

Sources: songbpm.com/@jimi-hendrix; bonedo.de (Hey Joe lesson); Wikipedia
(Manic Depression, Up from the Skies, I Don't Live Today, Third Stone from the
Sun); PopMatters "Mitch Mitchell: the perfect engine"; Far Out "Mitch
Mitchell's five essential drum tracks"; Louder "Mitch Mitchell's 6 greatest
moments"; notsomoderndrummer.com "The legacy of Mitch Mitchell"; DalSpace thesis
on his timing (92852ba2).

### C2b. Twenty-five more songs (2026-10-09, second pass)

Most of these come from community drum transcriptions on Songsterr: the raw
track data, quantised to 16ths. They are a big step up from reconstruction
but still not authoritative. Excluded because Buddy Miles plays drums:
Message to Love and Izabella (Fillmore), Machine Gun, Who Knows, Power to
Love, Changes, and probably the studio Room Full of Mirrors. AI-generated tabs
(Remember, You Got Me Floatin', She's So Fine) were not used.

| Song                              | Meter       | Tempo        | What it adds                                   | Source          |
| --------------------------------- | ----------- | ------------ | ---------------------------------------------- | --------------- |
| Little Miss Lover                 | 4/4         | 100          | the funk break, 16th kicks under a crash-ride  | s9369 (high)    |
| Gypsy Eyes                        | 4/4         | 116–120      | toms in place of the snare; floor tom on beats | s9274           |
| Long Hot Summer Night             | 4/4         | 85           | soul, busy 16th kick                           | s22566          |
| Come On (Let the Good Times Roll) | 4/4         | 142–150      | R&B rock on the ride bell                      | s557185         |
| House Burning Down                | 4/4         | 124          | snare-led verse; four on the snare             | s408964         |
| Love or Confusion                 | 4/4         | 110–112      | snare on every "and" over four on the floor    | s5951860        |
| Highway Chile                     | 4/4 shuffle | 136          | the hard shuffle                               | s22557          |
| Ain't No Telling                  | 4/4         | 140          | sloshy hats; quarter-snare chorus              | s8755           |
| Wait Until Tomorrow               | 4/4         | 112          | slight swing, cross-stick backbeat             | s9123           |
| Can You See Me                    | 4/4         | 132          | drums in unison with the riff                  | s9248           |
| Little Miss Strange               | 4/4         | 142          | pushed kick accents on the "and"s              | s22565          |
| Have You Ever Been                | 4/4         | 73           | slow Curtis Mayfield soul                      | s22555 (5 bars) |
| Are You Experienced?              | 4/4         | 82           | march snare over a near-silent kit             | s22539          |
| Laughing Sam's Dice               | 4/4         | 142–150      | half time, crash on every beat                 | s1537495        |
| Bold as Love (coda)               | 4/4         | 66–72        | ride and 16th kick build                       | s22542          |
| Catfish Blues                     | 12/8        | ~105 quarter | rolling-kick slow blues                        | s72228          |
| Straight Ahead                    | 4/4         | 108          | hat foot in 8ths                               | s1288107        |
| In from the Storm                 | 4/4         | 140→160      | accelerating; off-beat snare drive             | s1408222        |
| Freedom                           | 4/4         | 112          | syncopated funk rock                           | s9283           |
| Dolly Dagger                      | 4/4         | 120          | open-close hat funk                            | s22549          |
| Ezy Ryder                         | 4/4         | 120–124      | ride-bell intro, driving 8ths                  | s9423 (thin)    |
| Angel                             | 4/4         | 68           | ballad, a whole-bar snare build                | s22538          |
| Hear My Train A Comin'            | 4/4         | 72           | slow 16th blues rock                           | s22554          |
| Midnight                          | 4/4         | 80           | jazz funk, ride on the beat                    | s72224          |
| Lover Man                         | 4/4         | 100          | crash-ride blues rock, live                    | s22569          |

### C3. How he played: what the generator now encodes

The main source is Cook, _He's Got Great Feel, But What Do You Mean?_ (MA
thesis, Dalhousie 2013), which transcribes Purple Haze, Fire, Crosstown Traffic
and Lover Man. Also Bonedo's Mitchell solo workshop and Hey Joe transcription,
MusicRadar (Kramer; Mitchell's 1990 book), and Modern Drummer's 2009 tribute.

- **A hybrid beat that mutates every bar**, grounded by the backbeat and the 1:
  the figure/variation model already does this.
- **Fills grow through a song**: `fillsGrow`. Half-bar fills or shorter inside
  the phrase, the longest favoured at its end.
- **The busier groove second**: `build` (verse into chorus; the ride held back
  for the lift).
- **Crash and kick on the "and" of 4, tied over**: `anticipate`. This is
  Fire's recurring accent, and Kramer's "no way he's going to land on 1".
- **Fill vocabulary** (in the base style, so every song without its own fills
  has it):
  - the sextuplet cycle floor-snare-snare-rack-floor-floor, folded onto 16ths
  - Elvin's hand-hand-foot triplets
  - the four-stroke ruff
  - a nine-note phrase with an odd-placed crash
  - a paradiddle with tom accents over a samba kick
  - a press roll held like a note
- **Grooves from Cook**:
  - Purple Haze's verse: no ostinato, flammed backbeats.
  - Fire's chorus: quarter-note hats, a crash on the "and" of 4.
  - Fire's bridge: ride near the bell.
  - Fire's machine-gun 16ths from beat 3.
  - Crosstown's dotted-8th cross-rhythm, and its flam set-up.
  - Lover Man's loose hats, closed only on the backbeat.
  - Hey Joe's displaced backbeat.
- **Loose time**: a light feel table (snare a hair late, a steady wobble).
  No source measures his microtiming; this is a choice, not a finding.

Not represented: true sextuplets and 32nds in a 4/4 bar (the step is a 16th
everywhere, so they are folded onto 16ths), the kick landing late inside the
ruff, cymbal swells and mallet rolls, tempo drift, continuous crescendos,
backwards and flanged drums. Fire's stop bar (a flam on 1, then only the hat
foot on 2 and 4) was left out because the critic rightly rejects a bar with no
backbeat.

## D. Next drummers for the catalogue

- **John Bonham**: half-time shuffle (Fool in the Rain); the 16th-triplet
  R-L-kick "Bonham triplet"; a huge slightly late kick with doubles (Good Times
  Bad Times).
- **Ginger Baker**: tom grooves instead of a snare backbeat (Sunshine of Your
  Love); double kick and African polyrhythm; jazz swing and long solos (Toad).
- **Clyde Stubblefield**: very quiet ghosts; syncopated 16th kicks, displaced
  backbeats. Funky Drummer (approximate): `s: '....3..1.1.13..1'`.
- **Elvin Jones**: triplet grid throughout, skip-note ride accents, metric
  superimposition (A6).
- **Tony Williams**: hat foot on all four, light blistering ride, rimshot stabs,
  broken time (A7).
- **Max Roach**: melodic, compositional tom solos; crisp fast ride; odd meters.
- **Art Blakey**: press roll into choruses, loud hat on 2 and 4, Moanin' shuffle.
- **Buddy Rich**: big-band setups (snare before the accent, kick + crash on it);
  single-stroke rolls; kicks with the horns.
- **Stewart Copeland**: reggae-rock, one-drop or rim backbeat on 3; busy off-beat
  hats with splashes; ahead of the beat.
- **Keith Moon**: little steady hat, continuous tom rolls, crash washes, double
  kick; the drums as a lead instrument.
- **Bernard Purdie**: the half-time shuffle (B5) and his ghost-note pocket.

## E. Clyde Stubblefield (James Brown, 1965–70) — his records (2026-10-09)

The `stubblefield` style plays **songs** the way `mitchell` does (C2): each New
picks one of his records and its tempo, hat subdivision and swing come with it.

**Which records are his.** Some of the funk records most often credited to him
are not his. "Get Up (I Feel Like Being a) Sex Machine" and "Super Bad" are
Jabo Starks. The 1969 single of "Give It Up or Turnit a Loose" is Nate Jones;
the _Sex Machine_ version, the one remixed on _In the Jungle Groove_, is
Clyde's. "Papa's Got a Brand New Bag" (1965) predates him. The catalogue only
uses records Wikipedia's personnel lists credit to him.

**How he played.** Light: Bonedo's Cold Sweat lesson says he "played the drums
very softly, not really striking them hard". His ghosts are felt more than
heard. Funky Drummer's hats are "a challenging single-handed 16th-note hi-hat
pattern" (The Current), so the right hand stays on the hats and the left plays
every snare note. The style sets `oneHandHats`, which keeps the 3D drummer
from playing his sixteenths hand to hand (`drummer/sticking.ts`). He hardly
fills: "You don't have to do no soloing, brother, just keep what you got."

**Grids.** The first four are from Goodhertz's Funklet (Jack Stratton's
transcriptions): two bars at five velocity levels, with the open hats marked.
They are mapped as snare 4→accent, 3→hit, 2/1→ghost; kick 4→accent, else hit;
hats closed, with the opens marked. Each bar of a two-bar groove is its own
figure, because the generator plays one figure for a phrase's first half and
often another for its second; it cannot alternate them bar by bar. Where the
critic's air rule (a quarter of the bar free of kick and snare) failed a real
bar, the softest Funklet ghosts are left out (I Got the Feelin' bar 2: the
two lone ghosts, keeping the threes; Mother Popcorn bar 2: the three softest).

| Song                                       | Year | Tempo (quarter)              | Hats                                | What defines it                                                     | Source of the bars               |
| ------------------------------------------ | ---- | ---------------------------- | ----------------------------------- | ------------------------------------------------------------------- | -------------------------------- |
| Funky Drummer                              | 1969 | 101 (Funklet); 96 (songbpm)  | 16ths, one hand, opens just after 2 | snare `....3..1.1.23..2`, kick `1.1.......1..1..`                   | Funklet                          |
| Cold Sweat                                 | 1967 | 112 (Funklet); 120 (songbpm) | 8ths, open on the "and"s of 1 and 3 | bar 1 backbeat on the "and" of 4; bar 2 no kick on 1                | Funklet; PAS, Bonedo, Wikipedia  |
| I Got the Feelin'                          | 1967 | 128 (Funklet); 129 (songbpm) | 8ths                                | bar 1 backbeat on the "and"s of 2 and 4; bar 2 threes on the snare  | Funklet; Goodhertz notes         |
| Mother Popcorn                             | 1969 | 117 (Funklet and songbpm)    | quarters                            | backbeat on 2 and the "and" of 4; bar 2 kick on every "and"         | Funklet; drumstinytranscriptions |
| Say It Loud – I'm Black and I'm Proud      | 1968 | 108–115 (databases disagree) | 8ths (assumed)                      | —                                                                   | **reconstruction**               |
| Give It Up or Turnit a Loose (Sex Machine) | 1970 | 111 (songbpm)                | 8ths (assumed)                      | the "clap your hands, stomp your feet" break, drums under the voice | **reconstruction**               |
| Get Up, Get into It, Get Involved          | 1970 | 109 (songbpm)                | 16ths (assumed)                     | —                                                                   | **reconstruction**               |

Left out: "There Was a Time" (songbpm's 139 may be double), "Ain't It Funky
Now" (no tempo found), "Let a Man Come In and Do the Popcorn" and "Lowdown
Popcorn" (drummer not confirmed).

Sources: goodhertz.com/funklet (funky-drummer, cold-sweat, i-got-the-feelin,
mother-popcorn); Wikipedia (Clyde Stubblefield, Funky Drummer, Cold Sweat,
Mother Popcorn, I Got the Feelin', Say It Loud, Give It Up or Turnit a Loose,
Get Up Get into It Get Involved); songbpm.com/@james-brown; pas.org "Groove of
the Month: Cold Sweat"; bonedo.de Cold Sweat lesson;
yujidrums.hatenablog.com (Mother Popcorn); thecurrent.org "Pride and pain: the
story of the Funky Drummer"; funkydrummer.com School of Funk lesson 10.

## F. John Bonham (Led Zeppelin) — his records (2026-10-09)

The `bonham` style plays **songs** (C2). Three of them are in **sextuplet 4/4**
(`4/4-6`, added for him): 24 steps a bar, six to the beat. A straight eighth
is every third step, an eighth-note triplet every second, and a Bonham triplet
three real sextuplets rather than sixteenths in threes. Straight sixteenths do
not fit there, so a song whose groove needs them (Immigrant Song, Levee) stays
in 4/4 and folds its triplet fills onto sixteenths.

**Techniques and how they are modelled.**

- **The Bonham triplet.** Sextuplets grouped hand, hand, foot, moved round
  the kit (MusicRadar, Drumeo). Written as `4/4-6` fills: `s 22.22.`,
  `t1 ......22`, `t3 .........22.`, `k ..1..1..1..1`.
- **Good Times Bad Times kick triplets.** Played on one pedal: "fast triplets
  on a single bass drum" (Wikipedia). Each beat is the hand, then two kicks on
  the next two sextuplets (MusicRadar: "the illusion of the bass drum doing
  more than it actually is"). The hats are in the left foot under a cowbell
  ride (Drumeo).
  - The critic scores a sextuplet double as half again as quick as a sixteenth
    one (`doubleBpm = bpm × stepsPerQuarter / 4`). At 93 its advisory
    kick-doubles line fails, honestly: it is that hard.
- **Cowbell.** A cowbell was already in the percussion pack (recorded), and
  already on the 3D kit off the kick, put up only for a pattern that plays one
  (like the double pedal). Two things are new:
  - Each percussion mount now shows the instrument its slot sounds as, so a
    cowbell in slot 2 is a bell there, not a block.
  - A kit-mounted instrument (cowbell, block) stops where a written fill
    starts (`markFill`), because the fill needs that hand.
- **Half-time shuffle (Fool in the Rain).**
  - In `4/4-6`, so its tempo reads as the quarter (about 131) and not 12/8's
    dotted quarter.
  - The hats are on triplet partials 1 and 3, opening on the shuffled "and" of
    1; the backbeat is on 3, with sparse ghosts on the middle partials
    (MusicRadar, Drumeo).
- **Behind the beat** (Levee, Kashmir). A style `feel` with the snare
  0.06–0.07 of a sixteenth late.
  - Levee's Binson echo is production, not playing ("He wasn't playing that",
    Andy Johns), and is not modelled.
- **Immigrant Song.** Single paradiddles split between kick (right) and snare
  (left), dropping left strokes (drummercafe). Its gaps are banned to the kick
  (`noKick`), so a varied bar keeps its air.

| Song                    | Tempo   | Grid                 | Source of the bars                                     | Confidence |
| ----------------------- | ------- | -------------------- | ------------------------------------------------------ | ---------- |
| Good Times Bad Times    | 90–96   | 4/4-6                | Drumeo, MusicRadar descriptions                        | medium     |
| Fool in the Rain        | 126–134 | 4/4-6, backbeat on 3 | MusicRadar, Drumeo; kick reconstructed                 | medium     |
| Rock and Roll           | 166–174 | 4/4-6                | tempo sure; groove and ending reconstructed            | low–medium |
| Immigrant Song          | 110–114 | 4/4                  | drummercafe (paradiddle)                               | medium     |
| When the Levee Breaks   | 70–74   | 4/4                  | Drumeo (ghosts, soft kick); kick cluster reconstructed | medium     |
| Kashmir                 | 78–82   | 4/4                  | reconstruction                                         | low        |
| Black Dog               | 78–84   | 4/4                  | bonedo (8ths, bell in v2, the descending fill)         | low–medium |
| Trampled Under Foot     | 108–114 | 4/4                  | Drumeo ("loose hi-hats and doubles")                   | low        |
| Achilles Last Stand     | 142–150 | 4/4                  | reconstruction (the gallop)                            | low        |
| Communication Breakdown | 170–178 | 4/4                  | reconstruction                                         | low        |
| Whole Lotta Love        | 88–92   | 4/4                  | tempo (Wikipedia: 92); reconstruction                  | low        |

Left out:

- **The Crunge.** Its 9/8 is 4/4 plus an eighth, not three dotted quarters.
- **The Ocean.** A 4/4 bar then a 7/8 bar; a pattern has one meter.
- **Four Sticks.** Alternates 5/8 and 6/8.
- **Since I've Been Loving You.** No trustworthy tempo.
- **D'yer Mak'er.** No groove found.
- **Moby Dick.** A solo, partly with the hands.

Sources:

- songbpm.com/@led-zeppelin
- Wikipedia (each song)
- drumeo.com (GTBT, Levee, Fool in the Rain, Bonham licks, The Crunge)
- musicradar.com ("best John Bonham beats and fills"; "five song intros")
- bonedo.de (John Bonham workshop)
- drummercafe.com (Immigrant Song)
- onlinedrummer.com (Fool in the Rain)
- loudersound.com (Moby Dick)
- faroutmagazine.co.uk (D'yer Mak'er)

## G. Tony Williams (2026-10-09)

Sources: Goodman, _Tony Williams' drumset ideology to 1969_ (PhD, Sydney
2011, read in full); Friberg and Sundström, swing ratios of jazz ride
cymbals (_Music Perception_ 19/3, 2002; Tony's 1964 concert among them);
Todd Bishop's measured tempos and transcriptions (cruiseshipdrummer.com:
Seven Steps, Cantaloupe Island, the Sorcerer notes); brettworks on Cantaloupe
Island; Modern Drummer's 1983 "Studies in Style" (preview only). Paywalled or
not found: the 1984 and 1989 MD interviews, John Riley's books, Keith Waters's
book beyond its abstract.

**What the model could not do, and now does:**

| Gap                                                                                                                                  | Change                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Up-tempo swing at 270–372 bpm; 4/4 stopped at 190, so the old style wrote two bars per bar at half tempo                             | `4/4-8`, 4/4 in eighth steps, `maxBpm` 380; engraved as 4/4; swing scaled so 100 is still a triplet |
| Swing ratio falls with tempo (about 1:1 above 270, 2:1 near 200, wider below), so one swing number is wrong somewhere                | `swingCurve`: `swingAtTempo` derives the slider from the tempo, from a short note of about 100 ms   |
| Three against four and 7/4 over 4/4 run over several bars (So What, Joshua; the Tokyo So What, 2:13–2:37)                            | `crossRhythms`: accent cycles counted across the bar line                                           |
| The hat foot: little or none in 1964–65 ("my time is on the cymbal and in my head"), all four beats as the main pulse only from 1968 | Data: the Miles-era fast tunes mostly leave `hf` out; the old "foot on every beat" claim was wrong  |
| "On top of the beat" (Miles)                                                                                                         | A slight negative feel on ride and foot                                                             |

**Still not modelled:**

- Metric modulation and tempo drift (Footprints 166 → 221; No Blues 180 → 324 → 92 → 208).
- Polytempo (14 quarters in the time of 17).
- Tuplet fills (quintuplets, septuplets, quarter-note triplets).
- Crescendo shapes (only three velocity tiers exist).
- A hat-foot splash, and buzzes and dead strokes on toms.
- Brush sweeps.
- Per-bar meter changes (Love Song's 5/4 against 3/4).

The 32 songs and where each one's data comes from:

- **Measured tempos** (Bishop): Seven Steps, So What, Walkin', Agitation,
  Madness, Pee Wee, Masqualero, Prince of Darkness, Limbo.
- **Grooves from transcriptions:** Cantaloupe Island (Bishop's
  transcription), Fred (a Songsterr tab).
- **Reconstructed:** everything else.

Not Tony: Bitches Brew, _The Prisoner_, and the LA tracks of _Seven Steps to
Heaven_. No 5/4 or 7/4 Tony track could be verified, so none is labelled one.

## H. Ringo Starr (2026-10-10)

The grooves come from 52 Songsterr drum tabs, all marked human-made, by one
transcriber who labels each track with the player and the kit (Premier →
Downbeat → Super Classic → Hollywood Maple). Songsterr's default track
sometimes points at a percussion overdub, so the drum track was chosen by
hand. A few tabs list tempos in double or half time; flagged in the seed.

Personnel checks:

- Ringo plays on the 4 Sep 1962 single of Love Me Do; Andy White plays on
  the LP remake.
- Paul plays drums on Back in the USSR, Dear Prudence and The Ballad of John
  and Yoko, so those are out.
- Lady Madonna is brushes.

**Technique:**

- **A left-hander on a right-handed kit.** "If I'm leading, I can only come
  from the floor tom around" (AP, 2024). Fills go floor → snare, skip a drum,
  start late or on the hi-hat (Rain).
- **Drumeo's fill shape:** two 16ths, a rest, four or five 16ths.
- **The washy half-open hat of 1963–64** (Weinberg: "that sizzle, that
  swish"). The crash-ride takes over from 1965.
- **A feel just behind the beat**, the band drifting together with no click.
- **The sound by era:** ringing thin-headed toms early on; for A Day in the
  Life, slack towel-damped toms with the bottom heads off; from 1968, tea
  towels over everything.

**Model changes:**

| Gap                                                                    | Change                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------- |
| Generated fills ran high tom → floor                                   | `fillOrder`                                    |
| Grooves two bars long (I Feel Fine, Birthday)                          | figures twice the bar's length, played in turn |
| Here Comes the Sun's bridge in 11/8                                    | meter `11/8` (3+3+3+2)                         |
| The 1963–66 kit and the 1968–69 tea-towel sound                        | kits `sixties` and `teatowel`                  |
| Triplet fills inside straight songs (Come Together, A Day in the Life) | those songs are written in `4/4-6`             |

**Still not modelled:**

- Meter changes within a pattern (Lucy, Good Morning, Happiness Is a Warm
  Gun). These songs are split into sections instead.
- Backwards cymbals.
- Double-tracked drums.
- Tempo drift and crescendo shapes.
- Stop-time bars with no backbeat. The critic rejects them.

## I. Tony Allen (2026-10-10)

**The source is Allen himself.** He played five "major patterns of Afrobeat"
on camera for the _Birth of Afrobeat_ documentary. Sébastien Poitevin
transcribed all five (bestmusicsheet.com), and Joe Ospalla's PDF of the first
agrees almost note for note. They are the style's base figures. The song
grooves are variations of those families, not transcriptions, except Water No
Get Enemy, which follows a human Songsterr tab (489456). Almost every other
Songsterr tab for Fela is AI-generated, and those read as generic rock beats.
Tempos come from songbpm.com and Todd Bishop, some flagged as doubtful.

**What the five patterns share:**

- The hi-hat foot chicks every "and".
- The hand plays "1 & a" on the hat, with an occasional half-open stroke.
- The kick comes in pairs (1 + 1e, 3 + 3e).
- The snare comes in clusters with no fixed backbeat.
- In two of the five, beat 1 is snare, not kick.

**In his own words:**

- "I'd never play one, one."
- "My hi-hat does not stay closed."
- "I play like a machine or a loop."

Fills are rare, short, and never where you expect them (Bishop).

The fourth pattern ("double kicks") is thinned by a kick and a ghost. As
played (k `11..11..11..1...`, s `..12..12....12.2`) it leaves three of sixteen
steps free of kick and snare, and the critic asks for four.

**Model changes:**

| Gap                                                                                                        | Change                                      |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Every phrase half started on a crash with a kick under it; he leaves the 1 to the pattern, often the snare | `phraseMark: { crash: false, kick: false }` |
| The phrase-end fill fired 80% of the time                                                                  | `fillChance` (his: 0.2), and `midFills: 0`  |

**Still not modelled:**

- A hi-hat foot splash. The `hf` lane only chicks; a splash value would be a
  wire-format change. His demonstrations notate chicks.
- Structured four- or eight-bar variation (AAAB).
- Soft kicks.
- More than two percussion parts. The band's shekere, clips and congas are
  not the drummer's, so the style carries none.
- Rubato intros and stop-time.

**The generic `afrobeat` genre style contradicts these transcriptions** (left
as it is; changing it moves its golden):

- It puts open hand hats on every "and", where Allen's foot chicks.
- Its kick cells have no 1 + 1e double.
- It has a fixed backbeat on 6 and 12.

## J. Stewart Copeland (2026-10-10)

**The sources.** About 20 human-made Songsterr drum tabs (each tab's
`aiGenerated` flag was checked), read bar by bar: 2,610 bars of 4/4. Joe
Bergamini's _Stewart Copeland: Drumming in the Police and Beyond_ (Hudson
Music; the free sample's prose and gear chapters) settles Wrapped Around Your
Finger, Murder by Numbers' 12/8 and the kit. Drumeo, Bonedo, a 1983 Music UK
interview and a microtiming study fill in the feel. Tempos are songbpm's and
Bergamini's. Fall Out, One World, Tea in the Sahara, Walking in Your
Footsteps and Murder by Numbers' grid are reconstructions, and their `feel`
says so.

**What the tabs show:**

- The kick avoids the 1: only 20% of his kicks are on it, and none in the
  reggae verses (Walking on the Moon, Spirits, King of Pain, Man in a
  Suitcase).
- His cross-stick goes on 3 (37% of rim clicks), the one drop.
- The backbeat moves to 4 alone (Wrapped Around Your Finger, Can't Stand
  Losing You) or goes (Bring On the Night, Darkness, Masoko Tanga).
- The hi-hat talks: accented quarters, `111` bursts, gaps, a bark on the
  "and" of 4 (19% of his open hats), the foot on the "ands".
- Crashes and splashes come early: a third of them on the 1, the rest on 4
  or its "and", the next 1 left bare.
- Fills are rare (one in 15–30 bars; none in Walking on the Moon) and short.
- Verses go sparse and choruses go to rock, often on the ride bell.
- A Space Echo single repeat, a dotted 8th, on hats and rim (Walking on the
  Moon, Reggatta de Blanc, Every Little Thing).
- Backbeats slightly early (−0.6% to −0.9% of a beat).

**Model changes:**

| Gap                                                          | Change                                              |
| ------------------------------------------------------------ | --------------------------------------------------- |
| No echo: the Space Echo repeat is part of three songs' sound | `echo` (played, never written)                      |
| An anticipation always landed on a crash                     | `anticipateCymbal` (his: the splash)                |
| Each phrase half crashed on its 1, or never did              | `phraseMark.crash` may be a probability (his: 0.35) |
| No kit for his sound                                         | `police`: the DRS samples, snare and cymbals raised |

The verse-to-chorus flip is `build`: the busier figure second, every phrase.

**Still not modelled:** Octobans (three toms only), the gong drum and Oberheim
on Every Breath You Take, cymbal chokes, and how much faster he played live
(the ranges reach live tempos only where a source gives one).

## K. Yussef Dayes (2026-10-10)

**The sources.** Drum Hub's human transcriptions (Alex Richards): a beat sheet
with an excerpt of every track on _Black Classical Music_, and studies of Love
Is the Message, What Kinda Music and Strings of Light, read off the notation.
Three human Songsterr tabs (Tioga Pass, Lift Off, Jamaican Links). Nightrider,
For My Ladies and Last 100 come from AI tabs and say so; Black Focus and
Lowrider are templates built from his habits. Tempos are SongBPM's detections
or the transcriber's, with the half/double reading chosen per track.

**What the transcriptions show:**

- Dense, linear 16ths: hat, ghosted snare and kick take turns.
- The backbeat slides: the "and" of 2 (Love Is the Message), the "a" of 1 and
  "e" of 2 (Strings of Light), scattered (Rust). Beat 4 is the steadiest.
- Half-time at high tempos, the snare on 3 (Lift Off, Jamaican Links, Encore).
- Kick clusters, three 16ths on one foot (Tioga Pass: 3, 3e, 3&).
- Buzz strokes, flams, 32nd ghost drags into the 1.
- Rim clicks as the backbeat, on dotted 8ths in Pon di Plaza.
- A cymbal stack for accents; crash and kick on 1 where a section starts.
- Turquoise Galaxy is in 8th-note triplets.
- In his own words he plays without a click; reviewers call him tight. No
  source supports a "drunk" Dilla swing, so the swing is light (15–40 on the
  slider, about 53–57% MPC) and the reggae and Afro tracks near straight.

**Model changes:**

| Gap                                                        | Change                                            |
| ---------------------------------------------------------- | ------------------------------------------------- |
| Three 16ths on the kick were thinned and called unplayable | `heelToe`                                         |
| No china outside metal                                     | the stack plays as the china (`c` value 3)        |
| No kit for his sound                                       | `london`: Gogodze's samples, snare raised, driven |

**Still not modelled:** tempo drift and free-time intros; bars that mix 16ths
with sextuplets (48 steps a bar) and the live Tioga paradiddle-diddles in
32nds; 32nd ruffs (approximated by 16th pairs); the snares-off drum in
Marching Band (played on the high tom).

## L. Bernard Purdie (2026-10-11)

The `bernardpurdie` style plays **songs** the way `stubblefield` does (E): each
New picks one of his records, and its tempo, grid, hats and swing come with
it. The genre style `purdie` (the "Purdie shuffle", 12/8) is left as it is.

**Which records are his.** He claims around 4,000 sessions, and some of the
claims are his alone: the "21 Beatles songs" are disputed by everyone else
(Ringo Starr, Jim Vallance), so none is used. Credits were checked one by one:

- _The Royal Scam_ (1976): Wikipedia's personnel gives Purdie every track but
  3 and 8 ("Don't Take Me Alive" and "Everything You Did" are Rick Marotta), so
  Kid Charlemagne, The Fez and Haitian Divorce are his.
- _Aja_ (1977): Deacon Blues and Home at Last are Purdie; Aja is Steve Gadd,
  Peg Rick Marotta, Black Cow Paul Humphrey, Josie Jim Keltner, I Got the News
  Ed Greene.
- _Gaucho_ (1980): only Babylon Sisters is Purdie.
- Rock Steady (1971): Purdie, with Dr. John on percussion hitting a second
  bass drum with a stick (Funklet, from an alternate mix).
- King Curtis, _Live at Fillmore West_ (1971): Purdie on drums with Jerry
  Jemmott, Cornell Dupree and Billy Preston; Memphis Soul Stew opens it. The
  1967 studio single was cut at American Sound in Memphis and is not his.
- O-o-h Child (Five Stairsteps, 1970): Purdie's own account ("Vince gave me my
  head"), which Funklet and every write-up of the song repeat. No session
  sheet was found.
- Synthetic Substitution (Melvin Bliss, 1973): Purdie, as Jazzman Records and
  every account of the sample give it.
- Use Me (Esther Phillips, _Alone Again, Naturally_, 1972): the album credits
  both Purdie and Billy Cobham; Funklet gives this track to Purdie.
- Hot Sweat (_Master Drummers Volume 1_, 1996): Purdie alone, his take on
  Cold Sweat.

**How he played.** Strict, centred time: the thing his peers name first, so
the feel is near the grid with very little jitter. A hard backbeat with soft
ghosts round it. The hats are the engine: they open on the "and"s of 1 and 3,
and open a crack on the "a" just before 2 and 4 ("opens the HiHat slightly
just before the downbeat", Drummer Cafe; Jim Payne's Rock Steady lesson plays
the foot on the quarters to get it). The shuffle: triplets on the hats,
accented on the beat, with the ghosts "between the two hi-hats on the second
triplet" (Bonedo), and one backbeat, on 3. The kick moves under the chorus
("Purdie builds the chorus by improvising on the kick", Drummer Cafe). Fills
are few and short and stay inside the grid; long tom runs are avoided.

**Grids.** Seven are Goodhertz's Funklet (Jack Stratton's transcriptions):
two bars at five velocity levels, the opens marked. They are mapped as in E —
snare 4→accent, 3→hit, 2/1→ghost; kick 4→accent, else hit — and the hats
4→accent (`h` 2), open as marked, so a transcription's accented hats come
through. Funklet's swing setting (0–2) is read as 0, about 8 and about 14.
Where the critic's air rule (a quarter of the bar free of kick and snare)
failed a real bar, or left it with no slack for the generator's own kick
variations, the softest ghosts are left out: O-o-h Child (three a bar), The
Fez (the "a"s of 2 and 4), Hot Sweat bar 2 (two). Synthetic Substitution's
kick runs three 16ths on the "e", "and" and "a" of 3, which the critic calls
unplayable on one foot; its softest note (the "e") is left out.

Four are the commonest bars of human Songsterr transcriptions (each tab's
`aiGenerated` flag checked): Kid Charlemagne (113 bars), Deacon Blues (218),
Home at Last ("fix", 177) and Babylon Sisters ("fix", 178). The two shuffle
tabs are written as straight 8ths with no ghosts; their kicks are moved to
the triplet grid (an "and" is the last triplet) and the middle-triplet ghosts
that every Purdie-shuffle lesson describes are written in. The shuffles are
in `4/4-6`, as Bonham's Fool in the Rain is, so the tempo reads as the
record's quarter (Home at Last 126–128, not 12/8's dotted quarter) and the
backbeat on 3 is step 12.

| Song                     | Year | Tempo (quarter)                          | Hats                                                      | What defines it                                                    | Source of the bars                   |
| ------------------------ | ---- | ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------ |
| O-o-h Child              | 1970 | 89 (Funklet); 88 (songbpm)               | disco: two 16ths and an open "and", accented on the beat  | busy kick (1, &1, 3, &3, a3), snare cracking on the "e" of 3       | Funklet                              |
| Rock Steady              | 1971 | 103 (Funklet); 102 (Payne); 105          | 8ths, open on the "and"s of 1 and 3, a crack on 2a and 4a | no kick on 1; foot on the quarters                                 | Funklet; funkydrummer.com lesson 22  |
| Memphis Soul Stew (live) | 1971 | ~113 (songbpm; may be the studio single) | 16ths but for the backbeat, a crack before every beat     | left hand on every "e"                                             | **reconstruction** from Drummer Cafe |
| Use Me (Esther Phillips) | 1972 | 82 (Funklet); 83 (songbpm)               | 16ths, open on the "and"s of 1 and 3                      | a busy snare of even hits                                          | Funklet                              |
| Synthetic Substitution   | 1973 | 93 (Funklet)                             | 8ths, accented                                            | plain backbeat, fast-footed kick ("swings his foot a little")      | Funklet                              |
| Kid Charlemagne          | 1976 | 95–100 (tab); 97 (songbpm)               | 8ths, open on the "and"s of 1 and 3                       | four on the floor, ghosts on the "e"s and "a"s                     | Songsterr 54434 (human)              |
| The Fez                  | 1976 | 99 (Funklet and songbpm)                 | the "and"s only                                           | linear: snare in every gap, kick on 1 and 3                        | Funklet                              |
| Haitian Divorce          | 1976 | 74 (Funklet and songbpm)                 | 16ths, open on the "and"s of 1 and 3                      | kick on 1&, 2, 3&, 4; ghosts round the backbeat                    | Funklet                              |
| Deacon Blues             | 1977 | 116 (tab and songbpm)                    | 8ths; ride in the choruses                                | kick on 1, &2, 3, &4; no ghosts in the tab                         | Songsterr 54440 (human)              |
| Home at Last             | 1977 | 126 (tab); 128 (songbpm)                 | shuffle, accented on the beat; quarters in the verse      | backbeat on 3, kick on 1, 1-trip, 2-trip, 4-trip                   | Songsterr 3705091 (human) + ghosts   |
| Babylon Sisters          | 1980 | 120 (tab); 122 (songbpm)                 | shuffle; the intro on the beats                           | kick on 1 and the last triplet of 4; cross-stick on 3 in the intro | Songsterr 3789127 (human) + ghosts   |
| Hot Sweat                | 1996 | 114 (Funklet)                            | 8ths, then 16ths in pairs                                 | backbeat on 2 and the "and" of 4, then the kick doubled            | Funklet                              |

Kits: the 1970–73 soul records and Hot Sweat play `smdrums` (the 60s Ludwig,
"the funk and soul kit"); the Steely Dan records play `teatowel`, damped and
dry, for the record's "dry 70s" sound.

Left out: Say It Loud – I'm Black and I'm Proud (Purdie is credited on the
album, but the title song is Jabo Starks and Clyde Stubblefield, and which
tracks are his is unconfirmed); Memphis Soul Stew's 1967 single (Memphis
musicians); Day Dreaming and the rest of _Young, Gifted and Black_ (Purdie,
Ray Lucas and Al Jackson Jr. all drum on the album, split unconfirmed); Cissy
Strut (Zigaboo Modeliste); Green Earrings, The Royal Scam, The Caves of
Altamira and Sign In Stranger (his, but only AI-generated tabs and no
lesson, so no bars to trust); Soul Drums, Funky Donkey and Hap'nin' (his, but
no tempo or grid found); Cow'd Bell (Funklet, but from an instructional
video, and a cowbell groove); the Beatles claims.

**Still not modelled:** his hi-hat "pish-ship" is a hat opened a crack and
closed by the foot on the beat; the model has the half-open hat and the foot
chick but not the foot's close shaping the open note. The ghost level is the
kit's, not his 25–35 velocity. Dr. John's second bass drum on Rock Steady is
not played.

Sources: goodhertz.com/funklet (rock-steady, ooh-child, purdie-use-me,
synthetic-substitution, the-fez, hatian-divorce, hot-sweat, purdie-cowbell)
and its machine script (the `vals` and `mods` encoding); Songsterr API (songs
54434, 54440, 3705091, 3789127, 646715, 3761347; AI flags checked on the
rest); Wikipedia (Bernard Purdie, The Royal Scam, Aja, Gaucho, Soul Drums,
Memphis Soul Stew, O-o-h Child); songbpm.com/@steely-dan,
/@aretha-franklin/rock-steady, /@the-five-stairsteps/o-o-h-child,
/@esther-phillips/use-me, /@king-curtis/memphis-soul-stew; funkydrummer.com
School of Funk lesson 22 (Rock Steady); drummercafe.com (Home at Last,
Memphis Soul Stew); bonedo.de "Workshop: Shuffle Grooves"; Dusty Groove
(Alone Again, Naturally); nodepression.org (King Curtis Live at Fillmore
West); Jazzman Records (Synthetic Substitution).

## M. Jabo Starks (2026-10-11)

The `jabostarks` style plays **songs** the way `stubblefield` does (E): each New
picks one of his records, and its tempo, hats and swing come with it.

**Which records are his.** Only records whose Wikipedia personnel list (mostly
from Alan Leeds's liner notes) names him on drums are used:

- With James Brown: Sex Machine (1970), Super Bad (1970), Talkin' Loud and
  Sayin' Nothing (1970), Soul Power (1971), Hot Pants (1971), Make It Funky
  (1971), Get on the Good Foot (1972), The Payback (1973) and Papa Don't Take
  No Mess (1973).
- Licking Stick – Licking Stick (1968).
- With the J.B.'s: Pass the Peas (1971) and Doing It to Death (1973).
- Lyn Collins's Think (About It) (1972).
- Bobby Bland's Turn On Your Love Light (1961). Wikipedia says "probably",
  after Morthland; PAS and uDiscover name him.

Some of the credits around him belong to other drummers:

- **Say It Loud – I'm Black and I'm Proud.** His drummer record calls it a
  shared credit, citing PAS's obituary. That obituary also gives him Cold
  Sweat and I Got the Feelin', which are Clyde Stubblefield's, so it is not
  reliable track by track. Wikipedia credits Say It Loud to Stubblefield
  alone, so it stays in `stubblefield`.
- **Get Up, Get into It, Get Involved** is Stubblefield's.
- **The Grunt** is Frank Waddy's.
- **King Heroin** is Billy Cobham's.
- **My Thang** is Jimmy Madison's.
- **People Get Up and Drive Your Funky Soul** is Harvey Mason's or Ndugu
  Chancler's.
- **Funky President** is Allan Schwartzberg's (Funklet).
- **It's a New Day** is George Bragg's (Funklet).
- **Escape-ism, There It Is and I Got Ants in My Pants**: no drummer is
  named, so they are left out.

**How he played.** His playing was lean, crisp and steady, and he never tried
to outplay anyone. He kept cool while Brown raged in front of him. He came
from the blues, where Stubblefield came from soul and jazz (Wikipedia). His
groove sits "somewhere between 16th notes and 16th-note triplets", which is a
light 16th swing. Funklet's note on Sex Machine says "Jabo swings this beat
like mad". His hats are 8ths with a 16th slipped in before 3 (Sex Machine,
Hot Pants), and they open on the "and"s of 1 and 3. Under them, the left hand
plays ghosts on the same 16ths, so the style sets `oneHandHats`. That is an
inference from the grids, not something a source says.

He lifts a section with the cymbal, not with a fill:

- Super Bad's bridge moves to the ride bell, with the hat foot on every beat.
- Soul Power's B sections go to the ride.

The kick takes the 1 and the upbeats. The Payback is the exception, with the
kick on every beat. He hardly fills, so the style sets `fillChance` to 0.35
and `midFills` to 0. Its fills are short: a backbeat with the hats opening, a
ghost and an accent on the "a" of 4, or unison accents with the kick.

**Grids.** There are four kinds of source:

- **Funklet.** Sex Machine's two bars, mapped as in E: snare 4 is an accent,
  3 a hit, and 2 or 1 a ghost; kick 4 is an accent and anything else a hit;
  the hats are closed, with the opens marked. Funklet's own 109 bpm and swing
  setting 3 back up the heavy swing.
- **Modern Drummer.** Super Bad, from Joseph Connell's transcription (MD,
  May 2018, at 132 bpm). It was checked against two human Songsterr tabs
  (s10344 and the drum track of s6535055), which agree on the verse and the
  bridge.
- **Cruise Ship Drummer.** The Payback's three examples at 99 bpm: the intro,
  the groove and the ghosts at the end. A human Songsterr tab (s2397269)
  disagrees. It has the kick on 1 and 3 with a 16th on the "a" of 2 or 4,
  under 8ths on the hat foot, doubled on the floor tom. The published grid is
  used, and the tab's 16th kick backs up Cruise Ship's "the 16th note on the
  bass drum can happen on beat 2".
- **Human Songsterr tabs** (each tab's `aiGenerated` flag was checked):
  - Hot Pants (s1889573)
  - Pass the Peas (s1936430)
  - Licking Stick (s4694682), whose backbeat is a cross-stick
  - Sex Machine (s10223, its drum track named "Jab'o Starks"), which
    matches Funklet bar for bar

Make It Funky, Papa Don't Take No Mess, Doing It to Death, Think, Love Light
and Hot Pants Road have only AI-generated tabs, which were not used.

| Song                                     | Year | Tempo (quarter)                               | Hats                                                                     | What defines it                                                                                     | Source of the bars                       |
| ---------------------------------------- | ---- | --------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Get Up (I Feel Like Being a) Sex Machine | 1970 | 109 (Funklet); 108 (songbpm, Songsterr)       | 8ths, opens on the "and"s of 1 and 3, 16th before 3                      | snare `....3.11.1..3..1`, kick `2.........1...1.`, heavy swing                                      | Funklet; Songsterr s10223                |
| Super Bad                                | 1970 | 132 (MD); 125 (songbpm, Songsterr); 120 (tab) | 8ths and a 16th, opens on the "and"s of 1 and 3; ride bell in the bridge | snare on the 1 and the "and" of 2; bridge: bell and snare on 2, 3, 4, then on the "and"s of 1 and 3 | MD (Connell); Songsterr s10344, s6535055 |
| The Payback                              | 1973 | 99 (Cruise Ship); 98 (songbpm); 95 (tab)      | quarters, open on the "and" of 1 or 3                                    | kick on every beat and the "a" of 4; snare on 2 alone in the intro; ghosts later                    | Cruise Ship Drummer                      |
| Hot Pants                                | 1971 | 98 (songbpm and tab)                          | 8ths with 16ths before 3 and before the 1                                | kick on 1 and 3; long stops (1 and 2, then silence)                                                 | Songsterr s1889573                       |
| Pass the Peas                            | 1971 | 102 (tab); 99 (search)                        | 8ths                                                                     | plain kick on 1 and 3, snare on the "a" of 2 and the "e" of 3                                       | Songsterr s1936430                       |
| Licking Stick – Licking Stick            | 1968 | 104 (tab); 115 (getsongbpm)                   | 8ths, opens on the "and" of 3 (and of 1)                                 | cross-stick backbeat with clicks on the "a" of 2 and the "e" of 3                                   | Songsterr s4694682                       |
| Soul Power                               | 1971 | 105 (songbpm)                                 | shuffled 16th lilt; ride in the B section                                | shuffling verse; ride with the bell on 2 and 4, foot on 2 and 4                                     | **reconstruction**                       |
| Think (About It)                         | 1972 | 113 (songbpm); 110–115 (AI tab, not used)     | swung, "plenty of shuffle in the hi-hats"                                | the "yeah! woo!" break                                                                              | **reconstruction**                       |
| Turn On Your Love Light                  | 1961 | 106 (songbpm; may be half)                    | swung 8ths, ride to lift                                                 | gospel R&B drive                                                                                    | **reconstruction**                       |

**Left out:**

- **No grid found:** Talkin' Loud and Sayin' Nothing (102), Make It Funky
  (97), Get on the Good Foot (108), Papa Don't Take No Mess (97) and Doing It
  to Death (no tempo found). Built from nothing, they would be the same
  generic bar under nine titles.
- **Sex Machine's opening accents** (Songsterr bar 2: 8th-note kicks with
  the snare) and Super Bad's crash bar, which has the foot on 2. The phrase's
  crash on 1 stands in for both.
- **Think's tambourine**, which another player plays.
- **Funklet's five velocity levels on the hats.** Accented and unaccented
  closed hats are folded to one value.

**The model.** Nothing new was needed, but one gap showed. The cymbal switch
between sections is two figures in a phrase. `build` would put the ride
section second, but it sorts by note count, and his ride bars are no busier
than his hat bars, so it is not set. There is no way to say "the ride figure
second" when the ride figure is not the busier one.

Sources: goodhertz.com/funklet/get-up (Jack Stratton, 2011); moderndrummer.com
"John 'Jabo' Starks: 'Superbad'" (transcribed by Joseph Connell, 2018);
cruiseshipdrummer.com "Groove o' the day: Jabo Starks — The Payback" (2015);
songsterr.com tabs 10223, 10344, 6535055, 2397269, 1889573, 1936430, 4694682
(human), 610633 (AI, not used); Wikipedia (Jabo Starks; Get Up (I Feel Like
Being a) Sex Machine; Super Bad; Talkin' Loud and Sayin' Nothing; Hot Pants;
Make It Funky; Pass the Peas; Get on the Good Foot; Doing It to Death; The
Payback; Papa Don't Take No Mess; Licking Stick – Licking Stick; Think (About
It); Think break; Turn On Your Love Light; Say It Loud; Get Up, Get into It,
Get Involved; The Grunt; King Heroin; My Thang; People Get Up and Drive Your
Funky Soul); songbpm.com (@james-brown, @lyn-collins,
@bobby-blue-bland); getsongbpm.com (Licking Stick); attackmagazine.com "The
2nd most sampled track in history"; pas.org "In Memoriam: John 'Jabo'
Starks"; Rolling Stone "James Brown drummer John 'Jabo' Starks: 5 classic
tracks" (via the drummer record).

## N. Steve Gadd (2026-10-11)

The `gadd` style plays **songs** the way `stubblefield` does (E): each New
picks one of his records, and its tempo, hats and swing come with it. His
record in the drummer model (`drummer-model/drummers/steve-gadd.json`) sets the
rules: soft ghosts and firm backbeats, the snare a little behind, rudimental
fills (paradiddles, flams, drags) at phrase ends only and short, hand-foot
combinations, the crash only where a section starts, and no double kick.

**Which records are his.** Personnel credits were checked on Wikipedia for
every song kept. Some records often filed under him are not his. The title
track of _Still Crazy After All These Years_ and "My Little Town" are Roger
Hawkins; "Gone at Last" is Grady Tate (Gadd plays 3, 4 and 7–10 on that
album). On _Aja_ he plays only the title track; Paul Humphrey, Bernard
Purdie, Rick Marotta, Ed Greene and Jim Keltner play the rest. On _Gaucho_
he drums on "Glamour Profession", "My Rival" and "Third World Man" (on "Hey
Nineteen" he plays percussion; Marotta drums). George Benson's "Breezin'" and
Bob James's "Westchester Lady" are Harvey Mason; Chuck Mangione's _Chase the
Clouds Away_ is Joe LaBarbera. Al Di Meola's "Race with Devil on Spanish
Highway" is Lenny White (Gadd plays "Flight Over Rio" and "Elegant Gypsy
Suite"). On _The Mad Hatter_ he plays four tracks and Harvey Mason two. On
_Breakin' Away_ he plays everything but "Roof Garden" (Jeff Porcaro).

**How he played.** Rudiments split across the limbs: Drummer Cafe's 50 Ways
lesson has the left hand on the hats and "a three-note grouping between the
Hi-Hat foot, Hi-Hat and Snare drum"; MusicRadar calls it "a standard
rudimental beat split up across his four limbs". Bonedo hears dense 16ths in
the first half of each bar, "a caesura in the form of a quarter note on beat
three", and a snare roll at each bar's end; Drumeo gives the rolls as RRLRL
and then doubles, and the touch as light ("he's got a soft feel"). His
mozambique on Late in the Evening has the right hand on the bell pattern and
the left on a bombo-like part round the toms; Wikipedia adds that he played
it with two pairs of sticks, to sound like two drummers. Lenore (Drummer
Cafe) is a "funk-samba": the backbeat on 2 displaced by a 16th, early in the
A section and late in the B, the floor tom on 1, and in the B "the kick drum
always sounds with the hi-hat". Chuck E.'s in Love is a half-time shuffle
with the backbeat on 3 (Rockschool Grade 5 notes), "behind-the-beat drums"
(Classic Song of the Day). Aja's ending is "hand/foot triplets" and
"explosive tom-tom runs" (MusicRadar, Wikipedia); its drum part was two
takes.

**What the style encodes.** A snare offset of +0.04 of a 16th (about 6 ms at
100 bpm, the record's estimate), the kick +0.01, the hats on the grid;
`flam` 0.3 and `drag` 0.2 for the rudiments; `fillChance` 0.6 and no
`midFills`, every written fill two beats or less; `phraseMark.crash` 0.5. The
cowbell in Late in the Evening is a percussion slot on the kit (`perc` with
the bell steps), so the right hand leaves it for a fill. The 1970s songs play
`teatowel` (Gogodze's damped drums: his "towel-muffled toms"); the Clapton and
James Taylor songs play `osdk`, warmer and with soft strokes really soft.

**Grids.** Eight songs follow human Songsterr transcriptions (each tab's
`aiGenerated` flag checked), read bar by bar with the most common bars kept,
second pass 2026-10-11:

- **50 Ways** (234652): the verse is not linear after all. The hat foot on 1
  and the "a" of 1, the left hand's hat on the "e" of 1, 2 and the "and" of 2,
  ghosts on the "and" of 1 and the "e" of 2, the kick on 1, the "a" of 2 and 3
  with the rack tom on 3, and a 32nd roll from 4. The roll's first stroke and
  the 32nd after it are a buzz here, and the 16ths after it ghosts (four snare
  16ths in a row fail the critic); the answering bar has the floor tom on 4 and
  two double strokes. There is no backbeat on 2, so the song's backbeat is 4
  alone. The chorus is eighths with the hats open on every "and".
- **Late in the Evening** (424011): the right hand's bell pattern
  (`1.1.11.1.11.11.1`, split in the tab between hat and ride) and the left on
  the low tom on the "and" of 2 and the "a" of 3, which is the backbeat the
  critic looks for; the fill is the tab's, down the toms in threes. The tab
  writes no feet: the kick on the "and"s of 2 and 4 and the foot on every beat
  are from the lessons.
- **Aja** (54438, the drum track named for him): the verse, hats open on the
  "and"s of 1 and 3, a cross-stick on 2 and 4, the kick on 1, the "and" of 2,
  3 and the "and" of 4. Its ride sections (floor tom on 3, no backbeat) and
  the solo are left out, because the critic wants a backbeat in every bar.
- **Chuck E.'s in Love** (385456): written at 116 with a triplet feel and the
  snare once every two bars. Two of its bars are one bar here, in `4/4-6` at
  56–60: its eighths are the first and third of each triplet, the snare lands
  on 3, the hats on the "and"s, the kick in pairs. The tempo shown is the
  half-time beat, half the record's.
- **The Hustle** (57585): sixteenths on the hats with opens through the bar,
  the kick on 1 and the "and" of 2, not four on the floor. Its percussion and
  its intro (no backbeat) are left out.
- **Glamour Profession** (64450): the kick on every beat, the hats on the
  "and"s opening on the last, the foot on 1; its two tom fills.
- **Just the Two of Us** (597061, the drum track named for him): eighths, the
  kick on 1, the "a" of 2 and 3; the bridge (ride on the beats, no snare) is
  left out.
- **When You Got a Good Friend** (5009): a shuffle (the tab's triplet feel),
  the kick on every beat, the hats accented on it, a ghost on the "and" of 4.

Lenore is built from Drummer Cafe's description; Nite Sprite, Samba Song,
Third World Man, Slip Slidin' Away, We're in This Love Together and Stretch
of the Highway are reconstructions (Songsterr has only machine-made tabs of
them, or none). Each written fill keeps a struck note at or next to the
backbeat it covers, or the critic finds no backbeat in the last bar.

| Song                                     | Year | Tempo (quarter)                                  | Hats                                 | What defines it                                                            | Source of the bars                          |
| ---------------------------------------- | ---- | ------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------- |
| 50 Ways to Leave Your Lover (Paul Simon) | 1975 | 105 (tab); 102 (songbpm, Bonedo)                 | 16ths, left hand                     | hat foot, hat and snare in turn; kick on the "a" of 2 and 3; a roll into 4 | Songsterr 234652 (human)                    |
| Late in the Evening (Paul Simon)         | 1980 | 119 (songbpm)                                    | none: the cowbell                    | mozambique bell; the left hand on the low tom; foot on 1–4                 | Songsterr 424011 (human; feet from lessons) |
| Aja (Steely Dan)                         | 1977 | 117 (songbpm)                                    | 8ths, opens on the "and"s of 1 and 3 | cross-stick on 2 and 4; kick on 1, &2, 3, &4                               | Songsterr 54438 (human)                     |
| Nite Sprite (Chick Corea)                | 1976 | 120 (musiciwant)                                 | 16ths                                | funk 16ths, the 10" tom answering                                          | **reconstruction**                          |
| Lenore (Chick Corea)                     | 1976 | 130 (Drummer Cafe); 91 (songbpm)                 | 8ths                                 | backbeat a 16th early (A) and late (B); floor tom on 1                     | lesson (reconstruction)                     |
| Samba Song (Chick Corea, _Friends_)      | 1978 | 136 (Todd Bishop's solo transcription)           | ride 8ths                            | clave on the rim, surdo in the kick                                        | **reconstruction**                          |
| Chuck E.'s in Love (Rickie Lee Jones)    | 1979 | 116 (tab), so 58 half-time; 109 (AcousticBrainz) | on the "and"s, shuffled              | half-time shuffle in 4/4-6 at 56–60, snare on 3                            | Songsterr 385456 (human)                    |
| The Hustle (Van McCoy)                   | 1975 | 110 (songbpm)                                    | 16ths, opens through the bar         | kick on 1 and the "and" of 2                                               | Songsterr 57585 (human)                     |
| Glamour Profession (Steely Dan)          | 1980 | 117–118 (Shazam, Tunebat, songbpm)               | 8ths on the "and"s                   | disco, four on the floor, foot on 1                                        | Songsterr 64450 (human)                     |
| Third World Man (Steely Dan)             | 1980 | 107 (songbpm)                                    | 8ths                                 | slow, ghosts round the backbeat                                            | **reconstruction**                          |
| Slip Slidin' Away (Paul Simon)           | 1977 | 121 (songbpm)                                    | 8ths                                 | cross-stick on 2 and 4                                                     | **reconstruction**                          |
| Just the Two of Us (Grover Washington)   | 1980 | 96 (karaoke-version; Mixmeister 95.8)            | 8ths                                 | kick on 1, the "a" of 2 and 3                                              | Songsterr 597061 (human)                    |
| We're in This Love Together (Al Jarreau) | 1981 | 79 (songbpm; Musicnotes 70–75 "shuffle")         | 16ths, swung                         | slow 16th shuffle                                                          | **reconstruction**                          |
| When You Got a Good Friend (Clapton)     | 2004 | 96 (songbpm)                                     | 8ths, shuffled, accented on the beat | kick on every beat; a ghost on the "and" of 4                              | Songsterr 5009 (human)                      |
| Stretch of the Highway (James Taylor)    | 2015 | 110 (songbpm)                                    | 16ths                                | rolling groove, cross-stick verse                                          | **reconstruction**                          |

**Left out.** "Still Crazy After All These Years" (Roger Hawkins). "Night
Game" (credit unclear on the page). "Hey Nineteen" (percussion only). "My
Rival" (his, 97 bpm, but no description of the part was found). "Humpty
Dumpty" (his, 125 bpm, a version of unknown provenance) and "The One Step"
(his, 113 bpm): no description of either groove. The Stuff records (Chris
Parker and Gadd are credited together, with no track split). "Riding with the
King" and _Reptile_ (most tracks also credited to drum programming).
"Take It Away" (Ringo Starr drums on it too). "Today Today Today" (songbpm's
80 may be half). Stuff and the Gadd Gang, Steps Ahead and the Concert in
Central Park are left for a later pass.

**Not modelled.** Sextuplet hand-hand-foot fills (the 4/4 grid has none; they
are played as 16ths in threes); the two pairs of sticks on Late in the
Evening; brushes on the later ballads; the drag's and flam's exact grace
spacing.

Sources: Wikipedia (Steve Gadd; Late in the Evening; Still Crazy After All
These Years; Aja (song); Gaucho (album); The Leprechaun (Chick Corea album);
The Mad Hatter (album); Friends (Chick Corea album); Stuff (Stuff album);
Elegant Gypsy; Breakin' Away (album); Winelight; Slip Slidin' Away; The
Hustle (song); Me and Mr. Johnson; Before This World; Tug of War; Riding with
the King (B. B. King and Eric Clapton album); Reptile (album); Three (Bob
James album); Chase the Clouds Away); drummercafe.com "Steve Gadd 50 Ways
drum groove" and "Chick Corea Lenore Steve Gadd drum grooves"; bonedo.de
"Paul Simon 50 Ways To Leave Your Lover auf dem Schlagzeug lernen";
drumeo.com/beat (50 Ways); musicradar.com (five Steve Gadd tracks; career in
beats); classicsongoftheday.com (Chuck E.'s in Love); musicgurus.com
Rockschool Grade 5 (Chuck E.'s in Love); cruiseshipdrummer.com (Samba Song
solo transcription, Conga to Mozambique); hudsonmusic.com (Classic Steve
Gadd Grooves & Fills); songbpm.com (Paul Simon, Steely Dan, Van McCoy, Eric
Clapton, James Taylor, Chick Corea, Al Jarreau); getsongbpm.com;
tunebat.com; shazam.com; acousticbrainz.org; musiciwant.com;
karaoke-version.com; musicnotes.com.

## O. Omar Hakim (2026-10-11)

The `hakim` style plays **songs** the way `stubblefield` does (E): each New
picks one of his records, and its tempo, hats and kit come with it.

**Which records are his.** He shares two of his best-known albums, so each
song was checked track by track.

- _Let's Dance_ (Bowie, 1983) credits "Omar Hakim, Tony Thompson – drums" with
  no track split, and Wikipedia's album article says Thompson arrived late and
  played on three tracks. The title track is Hakim's (Wikipedia's song
  article; the human Songsterr tab names him). "Modern Love" and "China Girl"
  are not settled: Wikipedia's song articles credit Hakim, but
  davidbowieworld.com says Thompson's drumming "drives Modern Love, China Girl,
  Without You, Cat People and Shake It", and the human Modern Love tab names
  Thompson. Both are left out.
- _Brothers in Arms_ (Dire Straits, 1985): Hakim re-recorded the album in a
  few days. Terry Williams kept "Walk of Life" and the improvised crescendo at
  the start of "Money for Nothing", and (Neil Dorfsman) his toms and tom fills
  all through "Money for Nothing". So that song carries Hakim's groove and
  none of its tom fills.
- _The Dream of the Blue Turtles_ (Sting, 1985): Hakim is the only drummer.
- _Random Access Memories_ (Daft Punk, 2013): Hakim is credited on tracks 3,
  7–9, 11 and 13 (Giorgio by Moroder, Touch, Get Lucky, Beyond, Fragments of
  Time, Contact), and Quinn also on Touch. JR Robinson plays 1–6 and 14, so
  "Lose Yourself to Dance", "Give Life Back to Music", "Instant Crush" and
  "The Game of Love" are not his.
- "Slave to Love" (Bryan Ferry, 1985): Wikipedia's song article credits Hakim.
- Weather Report, 1982–86: _Procession_, _Domino Theory_, _Sportin' Life_,
  _This Is This!_. Not every track is a live kit. On "Can It Be Done" Zawinul
  says "I have the drum machine playing the hi-hat". "Domino Theory" is
  Zawinul's drum machine with Hakim overdubbed. "Two Lines" is a Linn part
  transcribed for him. "Ice-Pick Willy" is MIDI with Hakim's cymbal
  overdubbed. All four are left out. The Simmons on "Hot Cargo" is Mino
  Cinélu's.

**Electronic drums.** None on the songs here. His own account (Roland) has a
Syndrum in the late 1970s, a LinnDrum he programmed on New York sessions in
the early 1980s, a TD-5 triggering Michael Jackson's body-percussion samples
on _HIStory_, and a TD-10 on Madonna's tour after _Ray of Light_. None of
those records is in the style, so every song plays a sampled kit: `drs` by
default, `bigrusty` for the two gated 1980s records, and `police` for Weather
Report.

**How he played.** Bowie: "a fascinating drummer, with impeccable timing" and
"always fresh". The tabs show:

- Pop played big and simple: quarter-note hats on Let's Dance, eighths on
  Brothers in Arms, and a backbeat that never moves.
- The kick does the work, in 16ths under the hats: Let's Dance's 1, "a" of 1,
  "and" of 2, 3; So Far Away's 1 and "and" of 2; Beyond's dotted 8ths;
  Giorgio's climax, 1, 1a, 2&, 3e, 4, 4&.
- The hats speak quietly: a half-open on the "and" of 4 (So Far Away), a 16th
  pair at the bar's end (Get Lucky, So Far Away), an open hat on every beat
  (Get Lucky's chorus, Contact).
- Fills are rare and short, mostly the last beat: two on the floor tom, three
  16ths on the snare, ghosts into 4. "Avoid dated busy fills in pop."
- The fusion side is denser, with clean ghosts and 16th hats. No human
  transcription of his Weather Report playing was found (Cruise Ship Drummer's
  "Unpacking a groove: Predator" exists but could not be read), so Predator
  is a reconstruction and Corner Pocket follows an AI tab.
- Timing: the style's feel is near zero, a 0.005 wobble and nothing else.
  That is the claim of everyone who worked with him, not a measurement.

| Song                               | Year | Tempo (quarter)          | Hats                                  | What defines it                                                     | Source of the bars                 |
| ---------------------------------- | ---- | ------------------------ | ------------------------------------- | ------------------------------------------------------------------- | ---------------------------------- |
| Let's Dance                        | 1983 | 114 (tab); 115 (search)  | quarters, open on 4                   | kick `1..1..1.1.......`; an 8th-note crescendo into the groove      | Songsterr (human)                  |
| Money for Nothing                  | 1985 | 134 (tab and songbpm)    | 8ths, open on the "and" of 4          | kick on 1, 3 and the "and" of 4; ghosts into 4                      | Songsterr (human)                  |
| So Far Away                        | 1985 | 114 (tab and songbpm)    | 8ths, half-open on the "and" of 4     | kick on 1 and the "and" of 2; a 16th pair before the 1              | Songsterr (human)                  |
| Your Latest Trick                  | 1985 | 123 (tab and songbpm)    | 8ths, a 16th burst on the "and" of 1  | cross-stick on 2 and the "and" of 3, or the "and" of 2 and 4        | Songsterr (human)                  |
| One World                          | 1985 | 108 (tab and songbpm)    | 8ths (assumed; the tab has none)      | plain 1 and 3, 2 and 4; a snare pickup on the "and" of 4            | Songsterr (human)                  |
| Slave to Love                      | 1985 | 74 (tab); 147 (songbpm)  | the foot on every other 16th          | kick on every beat and the "e" of 3; the snare enters later         | Songsterr (human)                  |
| If You Love Somebody Set Them Free | 1985 | 125 (songbpm); 128 (tab) | 8ths                                  | kick pushing into 3                                                 | **Songsterr AI tab**               |
| Love Is the Seventh Wave           | 1985 | 160 (tab); 81 (songbpm)  | 8ths, a bark on the "and" of 4        | kick on 3 only; the cross-stick with it is added                    | Songsterr (human), snare **added** |
| Fortress Around Your Heart         | 1985 | 120 (tab and songbpm)    | 8ths                                  | cross-stick verse, struck chorus, kick 1, "and" of 2, 3             | **regenerated tab**                |
| Consider Me Gone                   | 1985 | 124 (tab); 127 (songbpm) | ride, swung                           | a rim click on 4 alone                                              | **Songsterr AI tab**               |
| Get Lucky                          | 2013 | 116 (tab and songbpm)    | 16ths, open on every beat             | the hats are the groove; claps on 2 and 4, also his                 | Songsterr (human)                  |
| Giorgio by Moroder                 | 2013 | 113 (tab and songbpm)    | 8ths; then the foot, crashes on beats | four on the floor; the climax's kick in dotted 8ths                 | Songsterr (human)                  |
| Contact                            | 2013 | 120 (tab); 124 (songbpm) | open on the beat; then the ride       | the snare answering the riff, a snare build                         | Songsterr (human)                  |
| Fragments of Time                  | 2013 | 131 (tab); 130 (songbpm) | quarters, 8ths or 16ths by section    | kick `1.1...1.1.1...1.`; a crash on the "and" of 4                  | Songsterr (human)                  |
| Beyond                             | 2013 | 100 (tab); 104 (songbpm) | 16ths                                 | the kick in dotted 8ths, `..1..1..1..1..1.`                         | Songsterr (human)                  |
| Predator                           | 1984 | 106 (songbpm)            | 16ths, open on the "and" of 2         | dense ghosts, kick 1, "a" of 1, "a" of 2, "and" of 3                | **reconstruction**                 |
| Corner Pocket                      | 1985 | 108 (songbpm); 105 (tab) | 16ths or 8ths                         | kick on 1, the "a" of 1 and the "and" of 2; the backbeat on 4 alone | **Songsterr AI tab**               |

The tabs were read with Songsterr's API: each tab's `aiGenerated` flag was
checked, the drum part's bars counted, and the commonest bars used as
figures. Changes made so the critic passes:

- Money for Nothing's `1123` ghosts into 4 lose the first ghost: four snare
  16ths in a row is a run.
- Contact's 16th snare build is broken into 8ths and pairs.
- Giorgio's drum-solo bars (16ths of ghosts throughout) are left out.

Left out:

- "Modern Love" and "China Girl": credits disputed (above). Wikipedia gives
  Modern Love Hakim, the tab and davidbowieworld give it Thompson.
- "Brothers in Arms", "The Man's Too Strong", "Why Worry": the tabs have no
  usable drum notes.
- "Ride Across the River": a tom-and-rim part across 3/4 and 4/4 bars. It
  fits the model but was not worth it against the rest.
- "Touch": a suite, six tempos in its first eight bars.
- "We Work the Black Seam" and "Children's Crusade": AI tabs only, and nothing
  in them is distinctive enough to stand without a human one.
- "Procession", "Where the Moon Goes", "Plaza Real", "D♭ Waltz": no tempo
  found for the first three; D♭ Waltz's songbpm figure (107) does not say
  whether it is a 3/4 bar, and nothing describes its drum part.
- "Can It Be Done", "Domino Theory", "Two Lines", "Ice-Pick Willy": drum machine
  or MIDI (above).
- "Lose Yourself to Dance", "Give Life Back to Music", "Instant Crush": JR
  Robinson.

**Still not modelled:** the gated-reverb snare as an effect (the `bigrusty`
kit stands in), his live hybrid kit, and Weather Report's percussion scores
"that you need 12 hands to play".

Sources: en.wikipedia.org (Omar Hakim; Let's Dance (David Bowie album); Let's
Dance (David Bowie song); Modern Love (David Bowie song); China Girl (song);
Brothers in Arms (album); The Dream of the Blue Turtles; Random Access
Memories; Slave to Love; Procession (album); Domino Theory (album); Sportin'
Life (Weather Report album)); davidbowieworld.com/bowie-tony-thompson-without-you;
weatherreportdiscography.org (procession, domino-theory, sportin-life);
roland.com/us/community/roland_users_group/1719 (his electronic kits);
songbpm.com (@david-bowie, @dire-straits, @sting, @daft-punk,
@weather-report, @bryan-ferry); musicgurus.com Rockschool "Let's Dance"
analysis; Songsterr drum tabs s29034 (Let's Dance), s480492 (Money for
Nothing), s30586 (So Far Away), s30096 (Your Latest Trick), s575827 (One
World), s486432 (Slave to Love), s802259 (Love Is the Seventh Wave), s422383
(Fortress Around Your Heart), s381654 (Get Lucky), s405392 (Giorgio by
Moroder), s390281 (Contact), s415921 (Fragments of Time), s415923 (Beyond),
and the AI tabs s2881738 (If You Love Somebody Set Them Free), s1549175
(Consider Me Gone), s2565903 (Corner Pocket), s407356 (Modern Love, credits
Thompson).

## P. Elvin Jones (2026-10-11)

The `elvinjones` style plays **songs** the way `gadd` does (N): each New
picks one of his records, and its meter, tempo and swing come with it. His
record in the drummer model (`drummer-model/drummers/elvin-jones.json`) sets
the rules: a triplet grid and never straight 16ths; generate, don't loop;
cross-rhythm accents in groups of two or four triplets across snare, toms and
kick; the ride legato and broad; the hi-hat foot on 2 and 4 by default. It
says to avoid quantised loops, a rock backbeat and sparse pocket minimalism.

**Which records are his.** Personnel credits were checked on Wikipedia for
every record kept. _My Favorite Things_ (Atlantic, recorded October 1960;
Steve Davis on bass). _Coltrane "Live" at the Village Vanguard_ (November
1961): Chasin' the Trane. _Impressions_: only "India" and "Impressions"
(Village Vanguard, 3 and 5 November 1961) and "Up 'Gainst the Wall" are his;
"After the Rain" and "Dear Old Stockholm" are Roy Haynes. _Live at Birdland_:
"Afro Blue" is live (8 October 1963); "Your Lady" is a studio track (18
November 1963), though the album is called Live. _Crescent_ (April and June
1964): Bessie's Blues. _A Love Supreme_ (9 December 1964; he is credited with
drums, gong and timpani). Wayne Shorter's _Juju_ (3 August 1964) and _Speak
No Evil_ (24 December 1964). McCoy Tyner's _The Real McCoy_ (21 April 1967),
Larry Young's _Unity_ (10 November 1965, "a standard 4-piece drum kit with
two cymbals and hi-hat") and Sonny Rollins's _A Night at the "Village
Vanguard"_ (3 November 1957) are his too, but on the Rollins record only the
evening sets: "A Night in Tunisia" on the original LP is Pete LaRoca's
afternoon set. The Jazz Machine's _Live in Japan 1978_ (Yomiuri Hall, 8–9
April 1978) has "A Love Supreme" as its second side.

**How he played.** Todd Bishop (Cruise Ship Drummer, "Key players: Elvin
Jones") hears the ride accent "the 'skip' note— the note on the & of 2 and 4"
and play down the note after it, "a strong tendency to phrase in 3/4, even
when playing in 4/4", and the snare, kick "and sometimes hihat" filling out
"a constant stream of triplets"; "the stereotype of his playing is that it is
all triplets, but he uses a lot of 16th notes as well", the grid "shifting
between triplets and 16th notes" ("How can I understand Elvin Jones?"). His
waltz "has a polyrhythm built into his playing, with an omnipresent 3/4 and
6/8 cross rhythm". The Afro waltz of Your Lady is "a linear left hand/BD/HH
part in 6/8 played under a standard jazz waltz cymbal pattern". Learn Jazz
Standards: "Throughout Elvin's playing, we can hear him stressing or even
landing phrases on the second triplet", "3/4 and 5/4 phrases on top of the
4/4 bar" while he keeps the ride going. John Xepoleas (Modern Drummer,
"Elvin Jones–style triplet fills") voices the right hand's accents on "the
ride cymbal and bass drum" and "all of the left hand notes softly on the
snare". Wikipedia (Afro Blue): Jones superimposed "two cross-beats over every
measure of a 3/4 waltz (2:3)", reversing Santamaría's 6/8. Ethan Hein: on My
Favorite Things "the groove's main feature is the accented 'and' of one".
Bishop on Chasin' the Trane: "bass drum accents on a downbeat, with a ghosted
note on the & before it". His snare is "tuned high", toms and kick "high ...
and wide open", cymbals "large ... thin, and dark".

**What the style encodes.** The `virtuosity` kit for every song (the open
jazz kit); `backbeatLane: 'hf'`, the foot on 2 and 4 in 4/4, on 3 (with 2 or
the "and" of 1) in the waltzes; `fill: 'comp'` with `midFills` 0.4 and a
crash on 40% of phrase marks; `crossRhythm` 0.35 with per-song cycles of 8
steps (four triplets) and 4 (two), 9 for Afro Blue's two cross-beats, 3 and 6
in the fast eighths (dotted quarters, three-beat phrases); ghosts weighted to
the middle triplet; the ride +0.03 of a step late and the snare +0.02 (the
record's "laid back" estimate). Medium tunes are in `4/4-6`, so the tempo is
the record's and every note sits on an even step (triplet eighths). The
waltzes are in `9/8`, a dotted quarter to each waltz beat, so the readout is
half again the waltz quarter. Over 200 the triplet meters cannot go (the
transport stops 4/4-6 at 190 and 9/8/12/8 at 300, a quarter of 200), so
Chasin' the Trane, Impressions and Pursuance are in `4/4-8` with
`swingCurve`, as Tony Williams's fast tunes are; Impressions and Pursuance
open at 240–280 and the slider reaches the records' 272–300.

**Grids.** Four songs follow human transcriptions by Todd Bishop (notation
images and PDFs read, 2026-10-11):

- **Chasin' the Trane** (part 1, choruses 1–6): the foot on every 2 and 4;
  the ride in quarters with the skip note; the snare on the "and" of 4 or 2,
  accented, a buzz on 4; the kick on a downbeat (bar 3 on 2), once a ghost
  "and" before an accent. Five of its bars are the figures. Its triplet
  streams (bars 34–36, the snare on the second and third triplets) do not fit
  in eighths.
- **Your Lady** (intro and head): kick, foot, ghosted snare, kick, foot, tom
  on the six eighths of a 3/4 bar, then foot, foot, snare, kick, foot, tom;
  the left-hand triplets later in the head.
- **Juju** (Page o' coordination, "developing an Elvin Jones groove" from the
  record, exercises 1–4): the cymbal on every eighth but the "and" of 1, the
  feet in 6/8 across two bars, a rim click on 2, a tom on the "and" of 3.
- **A Love Supreme, Jazz Machine** ("Groove o' the day: two by Elvin Jones"):
  the mozambique on the bell, a rim click on the "and" of 2, the high tom on
  4 and its "and", kick on 1 and foot on 3, in Bishop's two-bar eighth
  writing.

My Favorite Things is built from Bishop's "Assembling a basic Elvin waltz"
(it names My Favorite Things among its sources) and Hein's accented "and" of

1. Afro Blue, Resolution, Acknowledgement, Bessie's Blues, Speak No Evil,
   Witch Hunt, Impressions and Pursuance are reconstructions in his vocabulary.

| Song                                         | Year | Tempo (quarter)                                       | Meter | What defines it                                         | Source of the bars           |
| -------------------------------------------- | ---- | ----------------------------------------------------- | ----- | ------------------------------------------------------- | ---------------------------- |
| My Favorite Things (Coltrane)                | 1960 | 179 (jazzomat 179.3; AllSolos 177–179)                | 9/8   | waltz, the "and" of 1, triplets under the ride, hemiola | lesson (Bishop) + Hein       |
| Afro Blue (Live at Birdland)                 | 1963 | about 200: songbpm 133 (four readings) and 100 (two)  | 9/8   | two cross-beats a bar, 2:3                              | **reconstruction**           |
| Juju (Wayne Shorter)                         | 1964 | 177 (AllSolos, Elvin's solo; jazzomat 178.2, "LATIN") | 9/8   | 6/8 feet under the waltz ride, rim click on 2           | Bishop, Page o' coordination |
| Your Lady (Coltrane)                         | 1963 | **none found**; 150–170 estimated                     | 9/8   | linear kick / foot / left hand in 6/8                   | Bishop transcription         |
| Resolution (A Love Supreme)                  | 1964 | 178–182 (AllSolos)                                    | 4/4-6 | every triplet filled, accents in fours                  | **reconstruction**           |
| Acknowledgement (A Love Supreme)             | 1964 | 126 (AllSolos, "latin")                               | 4/4-6 | triplets round the toms over the bass figure            | **reconstruction**           |
| Bessie's Blues (Crescent)                    | 1964 | 184 (jazzomat)                                        | 4/4-6 | short fast blues, comps on the "ands"                   | **reconstruction**           |
| Speak No Evil (Wayne Shorter)                | 1964 | 142–143 (AllSolos; jazzomat 142.7)                    | 4/4-6 | broad ride, a few hard comps                            | **reconstruction**           |
| Witch Hunt (Wayne Shorter)                   | 1964 | 136–139 (AllSolos)                                    | 4/4-6 | horn calls answered on snare and kick                   | **reconstruction**           |
| Chasin' the Trane (Coltrane)                 | 1961 | 235–244 (Bishop); 236 (AllSolos)                      | 4/4-8 | snare on the "ands", foot on 2 and 4, no piano          | Bishop transcription         |
| Impressions (Coltrane, Vanguard)             | 1961 | 272 (AllSolos); 293.4 (jazzomat, swing ratio 0.99:1)  | 4/4-8 | near-even gallop, 3/4 phrases across the bar            | **reconstruction**           |
| Pursuance (A Love Supreme)                   | 1964 | 277–300 (AllSolos; his solo 284–300)                  | 4/4-8 | fastest swing on the record, rolling toms               | **reconstruction**           |
| A Love Supreme (Jazz Machine, Live in Japan) | 1978 | **none found**; 180–220 estimated (eighth writing)    | 4/4-8 | mozambique on the bell                                  | Bishop groove transcription  |

The Afro Blue tempo is a reading: songbpm's two values agree only if the
waltz quarter is 200 (133 is the dotted-quarter cross-beat, 100 the half
tempo). Your Lady and the Jazz Machine song have no measured tempo; both
ranges are estimates and should be measured.

**Left out.** India (his, 201–208 per AllSolos, but no description of his
part found); Up 'Gainst the Wall; Softly, as in a Morning Sunrise and
Spiritual from the Vanguard sets; Crescent's title track and The Drum Thing
(rubato and mallets); Psalm; The Real McCoy (Passion Dance's tempo readings
disagree, 120 and 141, and no description of the drums found); Unity (no
tempo or description found); the Rollins Vanguard record (no tempo or
description found); Tin Tin Deo on _Very R.A.R.E._ (1979, his record; Bishop
transcribed its Afro 6/8, the long bell pattern, but no tempo was found).

**Found on the way, not changed.**

- A figure row holds at most 32 steps (`styleParamsSchema`), so a two-bar
  9/8 figure (36 steps) cannot be written. The two-bar 6/8 foot parts of
  Juju and Your Lady are two one-bar figures, and the generator does not
  keep them in order.
- The triplet meters stop at a quarter of 190 (4/4-6) or 200 (9/8, 12/8:
  the transport's 300). Chasin' the Trane, Impressions, Pursuance and India
  are faster, so they are in eighths, and his triplets there (Chasin's
  streams, the middle triplet) cannot be written.
- The ride has no accent value (1 ride, 2 bell), so his accented skip note
  and the softer beat after it are not written.
- Bishop's "shifting between triplets and 16th notes" has no grid: a bar is
  either sextuplets or sixteenths.
- Gong, timpani and mallet swells (A Love Supreme, Crescent) are not in the
  kit.
- On the Jazz Machine's A Love Supreme he plays the bell pattern in 16ths,
  double time over the feet; it is written here in Bishop's eighths.

## Q. Tito Puente (2026-10-11)

The `puente` style plays **songs** the way `gadd` does (N): each New picks one
of his records, and its tempo and the right hand's instrument come with it.
His record in the drummer model (`drummer-model/drummers/tito-puente.json`)
sets the rules: always declare clave and stay in it; cáscara on verses, bell
on the montuno; open sections with an abanico; offer a kit translation (the
timbales on the toms, the bells on a cowbell). Its `avoid` list is a rock
backbeat and swung eighths.

**He played timbales, not a kit.** So the style is the kit translation of
plan decision D50: the macho (high timbale) is `t1`, the hembra (low) `t2`;
the shell (paila) is a `cascara` percussion slot and the mambo or cha-cha
bell a `cowbell` slot, both mounted and so in the right hand; the claves are
the percussionist's (`clave`, no hand). There is one bell-or-shell slot per
song, because a song has two percussion slots and one is the clave.

**Which records are his.** It is his orchestra on every one, and he is on
timbales as leader on each:

- _Dance Mania_ (RCA, recorded November–December 1957, released 1958):
  Wikipedia's personnel lists "Tito Puente – leader, arranger, timbales,
  vibraphone, marimba", with Ray Barretto (congas), Ray Rodríguez (bongos) and
  Julito Collazo (congas on 4 and 11). No kit drummer. Five songs are from it:
  El Cayuco, Complicación (Francisco Aguabella's), 3-D Mambo (Ray Santos's),
  Hong Kong Mambo, Mambo Gozón. Discogs's track list agrees.
- "Oye Como Va" (_El Rey Bravo_, Tico, recorded 1961, released 1962):
  Wikipedia: "arranged as a cha-cha-chá with a repeated piano tumbao". Its
  personnel lists congas and bongos and no kit. (The record's open question on
  the year: Wikipedia gives recorded 1961, released 1962.)
- "Ran Kan Kan": "first recorded … with his band in 1950" (Muppet Wiki's page
  on it; the song's later appearance on _Mambo Birdland_, 1999, is live).
  "Picadillo" and "Babarabatiri" are among his early mambo hits (as web search
  summaries put it; no credit page was found for either), and which take
  songbpm measured is not given; see below.
- "Para Los Rumberos": first on _Cuban Carnival_ (1956), whose personnel has
  Mongo Santamaría, **Willie Bobo** (himself a timbalero), Patato Valdés,
  Cándido and Johnny Rodríguez on percussion besides Puente on timbales. The
  song here is the 1972 remake on _Para Los Rumberos_, which Craft Recordings
  says slows "the original blistering fast rumba abierta tempo of the 1955
  version to a respectable mambo tempo" and ends with "a short timbale solo".
- "Mambo Diablo" (_Mambo Diablo_, Concord Picante, 1985): Tito Puente
  (timbales, vibes, percussion), José Madera (congas) and Johnny "Dandy"
  Rodríguez (bongos); George Shearing only on "Lullaby of Birdland". No kit.

**How he played.** "I played the drumset first … then I went over to the
timbales" (PAS Hall of Fame); he "brought them out front and played them
standing up … so he could give cues more easily", and "listens to the big
band as a rhythm player, and he interprets the band as a drum" (PAS). On
clave: "I always write the clave on the bottom of the score", and "the clave
doesn't change; the feeling changes" (PAS). jazz.com: "Puente's early drumming
style combined the cascara patterns of the timbales with bass drum and
cymbals, to 'kick' the arrangement." Wikipedia's Timbales article names his
vocabulary's sources: "the shells and the typical pattern played on them are
referred to as cáscara", the cowbell mounted in the mambo era, and the
abanico among the common strokes. For Oye Como Va a forum post on
mycongaplace quotes his book with Jim Payne (_Tito Puente's Drumming with the
Mambo King_): three patterns, "two for cymbal and one for bell played at
Half-tone = 64 bpm"; another poster: the timbalero plays "the cha cha beat",
"hitting the quarter note all the time".

**What the style encodes.**

- **Clave.** Every song declares the 2-3 son clave on the claves, steps
  `[2, 4, 8, 11, 14]` (one 4/4 bar here holds the whole clave: the record's
  two bars of eighths). That is the direction his record gives for both the
  bell and the shell; it was **not** checked against a chart song by song.
- **The right hand.** The instrumental mambos (Ran Kan Kan, 3-D Mambo, Hong
  Kong Mambo, Mambo Gozón, Picadillo, Para Los Rumberos) play the record's
  mambo bell, `[0, 2, 4, 5, 7, 8, 10, 11, 13, 15]`, the mouth accented on
  each bar's 1 and 3. The sung guarachas and the Latin jazz one (El Cayuco,
  Complicación, Babarabatiri, Mambo Diablo) play the shell, the cáscara over
  2-3, `[0, 2, 3, 5, 7, 8, 10, 12, 13, 15]` (the record's archetype, which
  matches the brief's table). Oye Como Va plays the cha-cha bell on every
  beat of its bars (every other step), accented on 1 and 3.
- **The left hand.** The hembra on 2 (a muffled stroke) and 4 (open) of each
  bar of the clave: steps 2, 6, 10, 14. The record's own bell archetype has
  the low timbale on 2 and 4; its cáscara archetype has it on 3, which is not
  used (no source for it was found, and the verse figure here keeps only the
  open stroke on each 4, the ponche). The open strokes, steps 6 and 14, are
  the style's `backbeats`: a tom counts for the critic, as in Gadd's
  mozambique. In the model's own beats those steps are the "and" of 2 and
  the "and" of 4, so nothing sits on a rock 2 and 4.
- **The kick.** A timbalero has no bass drum. The translation keeps one kick
  note, the bass tumbao's bombo (the anticipated "and" of 2 of each bar of
  the clave: steps 3 and 11; kick cells `0001`), on jazz.com's word that his
  early style used bass drum to "kick" the arrangement, and so that a
  drummer on a kit has something under the feet. Never on the 1:
  `phraseMark.kick` is false. Oye Como Va's figures have no kick (the bass
  and piano tumbao is the ostinato there).
- **The abanico** is the main fill: a press roll into a rimshot on the last
  eighth of the clave, into the 1 (`s: '885'`: two buzzes and a rimshot,
  on the snare, because a tom lane has no buzz or rimshot value). The other
  fill is the two timbales answering each other into the same rimshot; Para
  Los Rumberos's longer one stands for its "short timbale solo".
  `fillChance` 0.8, no `midFills`: a fill opens the next section and is
  played at a phrase end.
- **Feel.** Swing 0 everywhere ("swing 8ths" is on the avoid list); the
  timbales a shade on top (−0.02), the record's inferred "on top"; no
  ghosts (the left hand is on the hembra, not the snare).
- **Kit.** `police` ("bright and tight": the DRS kit with its snare cracking
  "like a brass snare cranked tight"): of the sampled kits it is the nearest
  to a steel-shelled timbale's ring and its rimshot, and it keeps the DRS
  toms, which ring clearly. `drs` would be rounder, `osdk` softer.
- **Tempo.** Songbpm's figures, which for the mambos are the half note: the
  charts are in cut time and one 4/4 bar here is two of their bars, so the
  half note is this grid's quarter (songbpm also lists 3-D Mambo at 198 on
  one version, the quarter). Oye Como Va is 124 on songbpm (the quarter of
  the cha-cha-chá), so 62 here; the book's "half-tone = 64" agrees.

**Grids.** None follows a human transcription. Songsterr has tabs of Oye
Como Va, Mambo Diablo, Cuban Fantasy, Mambo Gallego and Mambo en Blues, and
each has `aiGenerated: true`; the Payne book's three solo transcriptions and
José Madera's charts were not available. Every song is a reconstruction from
the record's archetypes and the descriptions above, and the songs differ
mainly in tempo and in whether the right hand is on the bell or the shell.

| Song                         | Year           | Tempo (this grid's quarter)                         | Right hand        | Clave            | Source of the bars |
| ---------------------------- | -------------- | --------------------------------------------------- | ----------------- | ---------------- | ------------------ |
| Oye Como Va                  | 1962 (rec. 61) | 62–64: songbpm 124 (quarter); "half-tone = 64" book | cha-cha bell, 1–4 | son 2-3 (claves) | **reconstruction** |
| Ran Kan Kan                  | 1950           | 105 (songbpm)                                       | mambo bell        | son 2-3          | **reconstruction** |
| El Cayuco (_Dance Mania_)    | 1958           | 128 (songbpm)                                       | cáscara           | son 2-3          | **reconstruction** |
| Complicación (_Dance Mania_) | 1958           | 95 (songbpm)                                        | cáscara           | son 2-3          | **reconstruction** |
| 3-D Mambo (_Dance Mania_)    | 1958           | 100–101 (songbpm; one listing 198, the quarter)     | mambo bell        | son 2-3          | **reconstruction** |
| Hong Kong Mambo (_D. M._)    | 1958           | 91 (songbpm)                                        | mambo bell        | son 2-3          | **reconstruction** |
| Mambo Gozón (_Dance Mania_)  | 1958           | 105 (songbpm)                                       | mambo bell        | son 2-3          | **reconstruction** |
| Babarabatiri                 | early 1950s    | 101 (songbpm; take not named)                       | cáscara           | son 2-3          | **reconstruction** |
| Picadillo                    | early 1950s    | 97 (songbpm; take not named)                        | mambo bell        | son 2-3          | **reconstruction** |
| Para Los Rumberos (1972)     | 1972           | 133 (songbpm; take not named, taken as the remake)  | mambo bell        | son 2-3          | **reconstruction** |
| Mambo Diablo                 | 1985           | 155 on songbpm, read as the quarter: 75–80 here     | cáscara           | son 2-3          | **reconstruction** |

**Left out.** "Mi Chiquita Quiere Bembé" (_Dance Mania_): by its name a 6/8
bembé, but no source for its rhythm or tempo was found. "Cuban Fantasy" (Ray
Bryant's, on _Cuban Carnival_): no tempo found. "Philadelphia Mambo" and
"Mambo Birdland": no tempo found, and _Mambo Birdland_ is an album, not a
song of that name that could be placed. "El Rey del Timbal" (songbpm 146):
which recording was not clear. The 1956 "Pa' Los Rumberos" at its rumba
abierta tempo: the remake was kept instead, and Willie Bobo is also on that
date.

**Found on the way, not changed.**

- A song cannot move the right hand from the shell to the bell between its
  verse and its montuno: percussion slots are per song, not per figure, and
  the bell on the ride lane over a shell slot would be three hands with the
  hembra. So each song is one or the other, against his record's "cáscara on
  verses, bell on montuno".
- The abanico is a roll on the drum's head: a tom lane has only hit, accent
  and flam, so the roll and its rimshot are written on the snare.
- The figure variation pass (`varyFigureBar`) puts a kick under every cymbal
  accent it adds and toggles off-beat kicks, so Oye Como Va, written without a
  kick, sometimes has one, and the mambos sometimes a kick off the bombo.
- The book's two cymbal patterns for Oye Como Va are not written: a song's
  bell slot plays in every bar, so a cymbal bar would have the bell under it.
- The 2-3 direction is the record's default; a chart-by-chart check (Madera's
  charts in the Payne book) would settle it per song.
- Songbpm does not say which take it measured for Babarabatiri, Picadillo,
  Ran Kan Kan and Para Los Rumberos, and its Mambo Diablo figure is read as
  the quarter (half note 77.5) by judgement, not by a source.

## R. José Luis "Changuito" Quintana (2026-10-11)

The `changuito` style plays **songs** the way `gadd` does (N): each New picks
one of his records, and its tempo, clave, percussion and kick come with it.
His record in the drummer model (`drummer-model/drummers/changuito.json`)
sets the rules: songo, with kick anticipations, displaced snare ghosts and
timbale accents; the bells keeping a steady pulse while the timbales move;
everything in clave, 2-3 rumba by default; no rock backbeat and no swing.

**Which records are his.** He joined Los Van Van in 1970, replacing Blas
Egües, and left in 1993 for a solo career, after _Disco Azúcar_; Samuel
Formell followed him (Wikipedia, timba.com). Egües plays the 1969 EPs (_Los
Van Van, Vol. I_): timba.com's personnel lists "Blas Egües: drums" for all
twelve tracks, so nothing from them is used. Every song kept carries Kevin
Moore's credit line "bass: Juan Formell — drums: Changuito" on timba.com
(_The Roots of Timba, Part II_), or comes from an album of the Changuito
years in timba.com's 1980s discography: Pero a mi manera and Y que se sepa
(singles, 1972–73), Chirrín chirrán and La Habana joven (_Vol. II_ /
_Tránsito_, 1974, "recorded in Spain as per Changuito"), Llegué llegué and Mi
ritmo caliente (_Vol. III_, 1974), Te traigo, Dale dos, Tu decisión ¿cuál
es?, Por qué lo haces and No digas que no compadre (_Vol. IV_, 1976), El
baile del buey cansao (_Vol. VII_, 1982), Por encima del nivel, better known
as Sandunguera (_Vol. VIII_, 1983). On some names in the brief: "Chapeando"
is a 2004 album, after he left; I found no song of that name from his
years. "Por encima del caballo" is not a Van Van title I could find; the
1983 hit is "Por encima del nivel" (Sandunguera). "La Habana no aguanta más"
is on _Vol. IX_ (1984), so his, but no description of its drum part was
found and songbpm's 148–152 may be a double time, so it is left out. _Ritmo y
Candela_ (1995, with Patato and Orestes Vilató, Grammy-nominated) is a
percussion record and I found no track credit for a kit, and on Flora Purim's
_Speed of Light_ (1994) he plays percussion (the record's own
`percussion_only`): both left out.

**How he played.** Drummerszone: Egües "used a kit without cymbals to invent
the songo beat. But it was Changuito who brought the songo to fruition, soon
restoring the cymbals and eventually adding timbales and electronic drums to
his traps", with influences from "James Brown's drummer Clyde Stubblefield"
and "Blood Sweat & Tears' Bobby Colomby". Moore (timba.com, _Changuito_)
gives his alterations from his video _La historia del songo_: Egües had the
kick on the downbeat; "the most significant change ... was moving the kick
drum from the downbeat to the bombos", and an "important later Changuito
alteration" keeps the 2-side bombo alone. In the same demonstration the rim
of the snare plays the offbeats of the first three beats and the toms the
last beat; Wikipedia (_Songo music_) gives the general rule, "the right hand
... plays the four main beats, while the left hand plays offbeats ... on a
closed hi-hat, woodblock, or cowbell ... snare rim, snare, cowbell(s), or
toms". Moore again: the snare "on the backbeat of the 2-side, but not the
3-side had already become the most common practice", the most common
variation "adding the snare on the ponche of the 3-side"; "a master at
spicing up slower rhythms with double-time variations" (La Habana joven,
Resuelve and Llegué llegué are slow songs whose drums imply double time); on
_Vol. IV_ a kick "which lasts two claves before repeating" (Te traigo). Victor
Barrientos on Mi son entero: "Using snare, bass drum and hi-hat only ...
shifting between the son half and double time feels", then "Chango lays into
the cowbell for the son feel", and "the press roll on the snare to bring the
dynamics down for the outgoing coro". From _Vol. VII_ (1982): "this is the
album where Changuito begins adding timbales, although there is still drumset
present" (timba.com). His "independencia" double bell, the "Changuito
Special": "He took the hand-held campana bell normally played by the
bongocero, mounted it on his timbale stand and played it with his right
hand, while simultaneously playing a modified timbale bell part with his left
and a kick drum pattern which he played from a standing position"
(timba.com, _Changuito_ musician page); Wikipedia (_Timbales_) prints it in
2-3.

**What the style encodes.** One clave to a bar, as Moore writes it and as the
brief's clave tables have it: sixteen steps are two bars of eighths, and the
tempo is Moore's (four steps a beat), which songbpm's numbers for these songs
agree with. Swing 0. The 2-3 rumba clave on the `clave` slot (no hand), 3-2
on Tu decisión. In the 1970s songs the other slot is the congas as Changuito
demonstrates El Yulo's part (high tones on 3, 4, 14, 15, low through the
3-side); Moore notes Yulo does not turn the figure round for 3-2, so Tu
decisión keeps it. In the timbales songs the bell is the `cowbell` slot (on
the kit, a hand) and the timbales are `t1`/`t2`. No rolled ghosts
(`ghostWeights: {}`): the left hand is written. Rudiments as `flam` 0.2 and
`drag` 0.1, the press roll as a buzz fill. Feel "on top" (snare −0.02, kick
−0.01 of a 16th): the record's beat placement, which it marks as inferred.
Kit `sixties`: ringing toms for the timbales, a bright snare.

The genre `songo` style puts a displaced backbeat on 6 and 12 with a 16th
hat and a swing range; his record and Moore's grids do not support either the
swing or a fixed backbeat there. His own demonstration has the left hand on 1,
2, 5, 7, 9 and 10 and the toms on 12 and 14, so the backbeats the generator
reads off his figures are those rim strokes, and the genre style is left as
it is.

**Grids.** Moore transcribes kick and snare against the clave and nothing
else, so the hands in his songs are the songo Changuito demonstrates (via
Moore) unless noted. Read from the colour-coded grids on each page (red a
stroke, black a rest):

- **Chirrín chirrán** (1974): the kick on both bombos (3, 11), his first
  alteration. Second figure: the snare on the 3-side's ponche (14).
- **La Habana joven** (1974): Moore's tumbao 1 (kick 0, 1, 9, 10; snare 4, 11) and tumbao 2 (kick 0, 1, 7, 11; snare 4, 12), and his variation kick
  (0, 7). At the slow tempo, with sixteenths on the hat for the double time
  he hears; the snare on the 2-side's backbeat is the one both share.
- **Llegué llegué / Guararey** (1974): Moore's tumbao 3, twelve claves of
  kick, five kept ([3, 11], [3, 5, 11], [1, 9, 13], [3, 5, 11, 13], [3, 10,
  11]); the hat in eighths from his note on the interlude.
- **Mi ritmo caliente** (1974): kick 0, 3, 5, 11, at 94.
- **Y que se sepa** (1973): both bombos, "frequently (but not always)" the
  offbeat after the first: [3, 5, 11] and [3, 11].
- **Te traigo** (1976): the two-clave kick, 0, 3, 11 then 0, 1, 3, 11, as one
  two-bar figure.
- **Dale dos** (1976): tumbao 3, the kick on the 2-side bombo alone.
- **Tu decisión ¿cuál es?** (1976): 3-2 rumba clave. Tumbaos 1 and 2 have the
  snare on the downbeat of the 2-side (8), a half-time backbeat; the kick
  under it (0, 6, with the bass) is mine. Tumbao 3 is "normal songo, but in
  3-2", so his songo turned round by half a bar.
- **Por qué lo haces** (1976): the "basic part - different every time", 0, 3,
  5, 11, and two of its changes.
- **No digas que no compadre** (1976): snare 8, kick 0, 7, 14, "a half time
  R&B figure"; the hats are mine.

**El baile del buey cansao** (1982) and **Sandunguera** (1983) are
reconstructions. Buey cansao: the bell on the four main beats, the left hand
of Wikipedia's basic songo stick pattern on the timbales, the kick on the
2-side bombo alone, two displaced snare ghosts. Sandunguera: the bongó-bell
voice of Wikipedia's Changuito Special on the cowbell (the mouth on the
beats, the neck between, plus the extra sixteenths on 7, 11 and 15), the two
strokes only the other bell plays (5, 9) on the low timbale, kick on the
bombos. Its 2-3 clave is from Bass Musician Magazine.

| Song                               | Year | Tempo (Moore's beat)                          | Clave                      | Hands                     | Source of the bars                     |
| ---------------------------------- | ---- | --------------------------------------------- | -------------------------- | ------------------------- | -------------------------------------- |
| Chirrín chirrán                    | 1974 | 107–109 (songbpm)                             | 2-3 rumba                  | his demo, hat on the beat | Moore (kick); demo (hands)             |
| La Habana joven                    | 1974 | ~60 (Moore: slow son montuno; songbpm 120 ×2) | 2-3 rumba                  | 16ths on the hat          | Moore (kick and snare)                 |
| Llegué llegué (Guararey)           | 1974 | 118 (Moore 59 ×2); songbpm 113                | 2-3 rumba                  | eighths on the hat        | Moore (kick, 12 claves)                |
| Mi ritmo caliente                  | 1974 | 94 (Moore)                                    | 2-3 rumba                  | demo                      | Moore (kick)                           |
| Y que se sepa                      | 1973 | 102 (Moore); songbpm 104                      | 2-3 rumba                  | demo                      | Moore (kick)                           |
| Te traigo                          | 1976 | 90 (Moore)                                    | 2-3 rumba                  | demo                      | Moore (two-clave kick)                 |
| Dale dos                           | 1976 | 96 (Moore); songbpm 94–98                     | 2-3 rumba                  | demo                      | Moore (kick)                           |
| Tu decisión ¿cuál es?              | 1976 | 153 (Moore, end); songbpm 146; held at 150    | **3-2** rumba              | demo turned round         | Moore (snare); kick reconstruction     |
| Por qué lo haces                   | 1976 | 115 (Moore); songbpm 110                      | 2-3 rumba                  | demo                      | Moore (kick)                           |
| No digas que no compadre           | 1976 | 102 (Moore)                                   | 2-3 rumba                  | eighths, reconstruction   | Moore (kick and snare)                 |
| El baile del buey cansao           | 1982 | 87 (songbpm 174–176, one entry 87)            | 2-3 rumba (record default) | bell + timbales           | **reconstruction**                     |
| Sandunguera (Por encima del nivel) | 1983 | 95–100 (songbpm, the 1983 cut)                | 2-3 (Bass Musician)        | bongó bell + timbale      | **reconstruction** (Changuito Special) |

**Left out.** The 1969 EPs (Egües). Pero a mi manera, Pero qué falta de
respeto, Ponte para las cosas, Ana and Si mami se va: his, with Moore's kick
(and for Ana and Pero qué falta the snare), but no tempo from Moore or
songbpm. Resuelve (~56, both backbeats): his, transcribed, but La Habana
joven already plays that slow double-time songo. La Habana no aguanta más,
Qué palo es ese, Anda ven y muévete: his, tempos known, no description of
the drums; one more invented bar under a new title would add nothing.
_Ritmo y Candela_ and _Speed of Light_: percussion, not kit.

**Found on the way, not changed.**

- The record's two archetype grids are 16ths over two 4/4 bars (32 steps to
  a clave). On the one-clave-to-a-bar grid half their strokes fall between
  steps (the timbale strokes on 7 and 15, the snare ghosts on odd 16ths), so
  they could not be used as written; the bell's even pulse with accents on 1
  and 3 survives, and is what Sandunguera's bell does.
- The record's tempo for the archetypes (100–130) is consistent with Moore's
  songo range, 105–130.
- The double bell (two cowbells at once) cannot be held: two percussion
  slots, and the clave needs one. Only the bongó bell is played; the other
  bell's own strokes go to the timbale.
- "Rim of snare" is written as a cross-stick (4), the nearest sound; two in a
  row (1, 2 and 9, 10) is a rim click, not a laid stick.
- The model has no tempo changes inside a song: Llegué llegué's three related
  tempos and Tu decisión's two at once (Moore) are one tempo each here.
- Electronic drums: drummerszone says he added them, and Van Van's 1983–86
  albums (from _Vol. VIII_, Sandunguera's) are the period "marred by the use
  of dated electronic percussion and synths" (timba.com). So he very likely
  played electronic drums on Sandunguera, but no source says which sounds
  were his. The kit stays a sampled pack (`sixties`).
- The record's birth-date and training questions are unchanged: timba.com's
  musician page says 18 January 1948, Casablanca, and "self taught /
  autodidacta"; it also gives his death as 6 June 2025, as the record does.

## S. Horacio "El Negro" Hernández (2026-10-11)

The `horaciohernandez` style plays **songs** the way `gadd` does (N): each New
picks one of his records, and its tempo, meter, kit and grooves come with it.
His record in the drummer model (`drummer-model/drummers/horacio-hernandez.json`)
sets the rules: every pattern declares a clave and a direction and variations
stay in it; the left foot carries the clave; the kick follows the bass
tumbao, the "and" of 2 and the 4; the direction flips only at a section
boundary. Avoid: a rock backbeat, accents that cross the clave, swung 8ths.

**Which records are his.** Credits checked on Wikipedia's personnel lists
unless said otherwise.

- _Habana_ (Roy Hargrove's Crisol, 1997, the 1998 Grammy): drums on every
  track but "Nusia's Poem" (Idris Muhammad). Changuito plays timbales and Angá
  Díaz congas beside him.
- _Supernatural_ (Santana, 1999): he plays one track, "Africa Bamba". The rest
  are Rodney Holmes, Carter Beauford, Billy Johnson, Alex González, Gregg
  Bissonette and Jimmy Keegan, or programming.
- _Shaman_ (Santana, 2002): one track, "You Are My Kind" (with Seal).
- _Live at the Blue Note_ (Michel Camilo, 2003, Grammy for Best Latin Jazz
  Album): his on all eighteen tracks, with Charles Flores on bass.
- _Triangulo_ (Michel Camilo, 2002): the trio with Anthony Jackson, all ten
  tracks (All About Jazz, Ink 19, Jazz Music Archives).
- _For Hamp, Red, Bags, and Cal_ (Gary Burton, 2001): he plays the three Cal
  Tjader tracks, "Afro Blue", "Body and Soul" and "João", with Danilo Pérez,
  John Patitucci and Luis Quintero; Lewis Nash plays the others (Dutch
  Wikipedia track table; the UNT catalogue).
- _Imprint_ (John Patitucci, 2000): tracks 1, 2 and 6 ("King Kong",
  "Postcard", "Imprint"); Jack DeJohnette plays the rest.
- _Mi Gran Pasión_ (Gonzalo Rubalcaba, 1987) and _Live in Havana_: Proyecto,
  with Rafael Carrasco and Felipe Cabrera.
- _Italuba_ (2004) and _Italuba II_ (2007): his own band.

Not his, or not checked: Steve Winwood's _About Time_ (2003) is Walfredo Reyes
Jr. on drums, with Karl Vanden Bossche and Richard Bailey on percussion; he
toured with Winwood, but the record is not his. Tito Puente's _Masterpiece_,
Paquito D'Rivera's records and an Irakere credit before Irakere 50 were not
confirmed and are left out. Wikipedia also lists Grammys for Alejandro Sanz's
_No es lo mismo_ and Eddie Palmieri's _Listen Here!_, which this pass did not
go into.

**How he played.** Pearl's artist page: "truly ambidextrous, being able to
play the leading pattern with either hand or to play the basic rhythmic
figure of Afro-Cuban music, the clave-beat, with his left foot on the
high-hat or the cowbell with the foot-pedal, while his right foot supports
the base line." Drummer Cafe and Hudson Music: a "Latin Fusion" style,
"melding the folkloric clave with the fierce punch, crisp snap and deep
grooves of today's Jazz, Pop, and Rock." Tiger Bill's review of the 1997
Modern Drummer Festival video: "Our Family" opens "with El Negro playing his
trademark left foot clave rhythm"; on "Rumbatella" he switches "back and forth
between his left foot clave pattern and his left foot bass drum pedal"; and
"his approach to drumming is more like a language than simply a collection of
memorized drum patterns". A _Triangulo_ review (Ink 19): "his subtle,
galloping work on 'La Comparsa', for example, is truly brilliant." SFJAZZ's
masterclass (episode 4): "the Cuban cáscara pattern can serve as an anchor for
polyrhythmic playing"; episode 5 moves between "duple and triple feel ...
from guaracha to rumba, conga de comparsa and timba."

His book _Conversations in Clave_ (2000, transcriptions by Ken Ross), by Tiger
Bill's review: Part 1 the four basic claves and four feel against six; Parts
2 and 4 clave or cáscara in the right hand with "the hi-hat ... played with
the foot on the initial downbeat" against left-hand variations; Part 5 the
6/8 clave, with "variations of cowbell ride, bass drum, and hi-hat patterns for
6/8 rhythms"; Part 6 three- and four-limb ostinatos; Part 7 groove
transcriptions: 6/8, guaguancó, mambo, conga and comparsa, cáscara, macuta,
cha-cha-chá, merengue, songo, mozambique. The grids themselves were not found
online; the style uses the book's list of grooves and the record's two
patterns, not the book's notes.

**What the style encodes.** `swing` 0 everywhere and no swing range (no swung
8ths). The kick cells and every Latin figure put the kick on the tumbao: in a
bar holding one clave, the "and" of 2 and the 4 of each half, steps 3, 6, 11
and 14. Each Latin song names its clave on the first perc slot, `clave`, which
takes no hand (the left foot's pedal block), and leaves `hf` empty. The right
hand's part is the second slot: a `cowbell` (Mambo for Roy, Afro Blue, the
songo) or the `cascara` (Afrodisia), both on the kit, so the hand leaves them
for a fill. A song with clave and bell has no slot left for the cáscara, so
each song picks one. The left hand is the snare and toms, conga and timbale
figures, and its accents on the "and"s of 2 and 4 (steps 6 and 14) are the
backbeat the critic looks for. Every written fill accents the three side of
the song's clave on the toms. The feel is on top (`s` −0.02, `k` −0.01),
`fillChance` 0.6, no mid-phrase fills, a crash on half the phrase starts. The
kit is `police`, the DRS kit with a fast, high, cracking snare and short
cymbals: the record's "bright, cutting bells, crisp snare, high-tuned toms,
punchy kick". The Santana songs play `drs`, the plain studio kit, and Afro
Blue the `virtuosity` jazz kit, Burton's acoustic quartet.

| Song (key)      | Clave (slot p1, the foot) | Right hand (p2)        | Cáscara |
| --------------- | ------------------------- | ---------------------- | ------- |
| mambo-for-roy   | son 2-3 [2,4,8,11,14]     | cowbell, every 8th     | no      |
| afrodisia       | rumba 2-3 [2,4,8,11,15]   | cáscara over 2-3       | yes     |
| afro-blue       | 6/8 clave [0,4,8,14,18]   | cowbell, 6/8 bell      | no      |
| la-comparsa     | son 2-3 [2,4,8,11,14]     | none: both hands drums | no      |
| night-in-torino | rumba 2-3 [2,4,8,11,15]   | none: ride bell (r)    | no      |
| que-negro-esta  | son 3-2 [0,3,6,10,12]     | cowbell, every step    | no      |
| africa-bamba    | none (Santana rock feel)  | none                   | no      |
| you-are-my-kind | none (Santana pop feel)   | none                   | no      |

**Grids.** Two songs follow human Songsterr transcriptions, `aiGenerated`
false on both, read bar by bar:

- **Africa Bamba** (717963, at its 100): sixteenths on the hats, the kick on
  1, the "a" of 1, 2, 3, the "a" of 3 and 4, and in the choruses on every
  beat. Most of the tab's bars have no snare at all; the critic wants a
  backbeat in every bar, so only the bars with the snare on 2 and 4 are kept.
  The maracas are the percussionist's.
- **You Are My Kind** (3770724, at its 105): eighths on the hats, the kick on
  1, the "a" of 1, the "and" of 2 and the "and" of 3, and on the "and" of 4
  every second bar; the intro's hats open on every eighth; the interlude's
  cross-stick figure; the last chorus in sixteenths; the tab's fill, the kick
  in pairs round a snare on 4. The four strokes the tab writes as crashes in
  the interlude are left out.

The six Latin songs are **reconstructions**. Mambo for Roy, Afrodisia, Afro
Blue, La Comparsa and Que Negro Está are grooves his book transcribes (mambo,
cáscara, 6/8, conga de comparsa, songo), laid out as the record's two
patterns lay them; A Night in Torino is the tune's Latin A section. Afrodisia
plays the record's cáscara pattern note for note (cáscara over rumba 2-3, the
kick on 3, 6, 11 and 14, the snare's ghost and pair of strokes). Que Negro
Está plays the record's songo read the way every other Latin song here is
(and Kevin Moore's songo transcriptions are): one bar holds one clave. The
record writes it over two bars of sixteenths, so every other step is kept:
son 3-2 on the foot, the bell's eighths on every step, the snare's accents on
the record's "and"s of 2 and 4 (steps 3, 7, 11, 15), the kick on its "and"
of 3 (steps 5 and 13). The record's ghosts and its tom 2 stroke sit on odd steps and drop
out; the variation keeps the tom on the last "and".

Tempos: the two tabs' own. For the rest no tempo was published anywhere
found; they are Deezer's track `bpm` field, a machine estimate, read so that
one 16-step bar holds one clave: Mambo for Roy 136, Afrodisia 112.3, A Night
in Torino 124.2. Afro Blue's 193.2 is read as eighths: a dotted quarter of
64, so 96.6 quarters in 12/8 (Mongo Santamaría's tune sits there). La
Comparsa's 100 is the tempo on Songsterr's machine-made tab (5641772,
`aiGenerated` true, used for the tempo only, not the notes). Que Negro Está
has two Deezer figures, 117.5 and 156.6; read as one clave a bar, 117.5 is a
songo tempo and 156.6 far too quick, so 117.5 is used. All six are open to a listen.

| Song                                     | Year | Tempo                                | Meter          | What defines it                         | Source of the bars        |
| ---------------------------------------- | ---- | ------------------------------------ | -------------- | --------------------------------------- | ------------------------- |
| Africa Bamba (Santana)                   | 1999 | 100 (tab); 99 (songbpm, Deezer)      | 4/4, 16th hats | kick 1, a1, 2, 3, a3, 4; snare 2 and 4  | Songsterr 717963 (human)  |
| You Are My Kind (Santana, Seal)          | 2002 | 105 (tab; Deezer 104.9)              | 4/4, 8th hats  | kick 1, a1, &2, &3 (&4 every other bar) | Songsterr 3770724 (human) |
| Mambo for Roy (Hargrove's Crisol)        | 1997 | 136 (Deezer, machine)                | 4/4, one clave | son 2-3 foot, bell, tumbao kick         | **reconstruction**        |
| Afrodisia (Hargrove's Crisol)            | 1997 | 112 (Deezer, machine)                | 4/4, one clave | cáscara over rumba 2-3                  | record's cáscara pattern  |
| Afro Blue (Gary Burton)                  | 2001 | 193 eighths (Deezer) = 96.6 quarters | 12/8           | 6/8 bell, 6/8 clave on the foot         | **reconstruction**        |
| La Comparsa (Michel Camilo, _Triangulo_) | 2002 | 100 (Songsterr machine tab)          | 4/4, one clave | son 2-3 foot, galloping hands           | **reconstruction**        |
| A Night in Torino (Tunisia) (Italuba)    | 2004 | 124 (Deezer, machine)                | 4/4, one clave | rumba 2-3 foot, ride bell, toms         | **reconstruction**        |
| Que Negro Está (Italuba)                 | 2004 | 117.5 (Deezer; another entry 156.6)  | 4/4, one clave | the record's songo, every other step    | record's songo pattern    |

**Left out.** _Live at the Blue Note_ (his, a Grammy, but no tempo or
description of any track was found). _Triangulo_'s other tracks, Patitucci's
_Imprint_, Burton's "Body and Soul" and "João" and _Habana_'s "Dream Traveler"
(Afro-Cuban 6/8 head, son montuno solos, per Jazz Leadsheets; Deezer's 123.4
could not be read as either pulse with confidence): no description of his
part. Songsterr has only machine-made tabs of Camilo's "Piece of Cake",
"Dotcom-bustion" and "Caribe". "Not Yet" has a human tab but is not his
record.

**Found on the way, not changed.**

- The record's songo writes the son clave over **two** bars of sixteenths,
  while its cáscara and every other grid holds one clave in sixteen pulses.
  The style reads it as one clave a bar, like the rest; the record's ghosts
  and tom stroke, on odd steps, are lost in that reading.
- The record's songo kick (the "a" of 1 and the "and" of 3) is not the
  tumbao its own generation rule asks for, and compressed (steps 5 and 13)
  it still is not; the grid is kept as written.
- `varyFigureBar` can put a crash, with a kick under it, on the "and" of 2, 3
  or 4 of any bar; in a clave song that may cross the clave, which the record
  says to avoid. The style has no way to turn it off.
- There is no pedal-played percussion and no second hi-hat-foot voice, so the
  clave is a percussionist's claves, not a block under his left foot; the 3D
  drummer does not play it.
- No song can switch clave direction at a section boundary, and no song holds
  both a bell and the cáscara with the clave.
- His bongos and timbales mounted in place of toms are played on the toms.

## T. Ginger Baker (2026-10-11)

The `baker` style plays **songs** the way `gadd` does (N): each New picks one
of his records, and its tempo, meter and grooves come with it. His record in
the drummer model (`drummer-model/drummers/ginger-baker.json`) sets the rules:
let the toms carry grooves; two-bass-drum (K/K2) ostinatos under tom phrases;
triplet and 12/8 feels; and avoid tight quantised rock and ghost-note funk.

**Which records are his.** Credits checked on Wikipedia. Cream was a trio:
every Cream drum part is Baker's. On "White Room" he is credited with drums
**and timpani** (Felix Pappalardi plays the violas). On _Blind Faith_ he is the
only drummer ("drums, percussion; vocals on 'Do What You Like'"), and he wrote
"Do What You Like". On Fela's _Live!_ (recorded at Abbey Road, 25 July 1971)
Tony Allen is the band's drummer and Baker plays on tracks 3–5 only: "Ye Ye De
Smell", "Egbe Mi O" and the 1978 Berlin drum duet with Allen; "Let's Start"
and "Black Man's Cry" are Allen's, so they are not used here. _Ginger Baker's
Air Force_ (1970) has three drummers (Baker, Phil Seamen, Remi Kabaka), and its
"Toad" has solos by all three, so the Toad here is Cream's.

**How he played.** Wikipedia (Ginger Baker): his drumming "melded jazz and
African rhythms"; he used "syncopation and ride cymbal patterns characteristic
of bebop", "two bass drums instead of the conventional single one", 7A sticks
in matched grip, and was "one of the first drummers to move his left foot
between his left bass drum pedal and hi-hat pedal". The two bass drums came
from seeing Sam Woodyard with Ellington in 1966, who "played incredible tom tom
and two bass drum patterns" (Jazzwise interview, as the search result quotes
it). On "Sunshine of Your Love" he "played much of the song on the tom-toms"
with a pattern that "emphasises beats one and three"; Tom Dowd: "the Indian
beat, where the downbeat is the beat" (Wikipedia, Sunshine of Your Love). On
"Toad" he builds "a sequence of drum patterns that are built up, varied, and
then dropped", with "complementary rhythms on the hi-hat, ride cymbal,
double-bass drums and tom-toms simultaneously" (Wikipedia, Toad). "White
Room": "Both Bruce and Baker claimed to have added the distinctive 5/4 ...
opening to what had been a 4/4 ... composition" (Wikipedia); "Baker leads
Cream from a mysterious 5/4 intro into the song's rumbling main 4/4 rhythm"
(Ultimate Classic Rock). "Do What You Like" is in 5/4 and runs fifteen minutes
(Wikipedia; Ultimate Classic Rock).

**What the style encodes.** `doubleKick` (two bass drums: to the generator,
critic and 3D drummer the same as a double pedal); the `sixties` kit (SM
Drums' 1960s Ludwig: he played Ludwig, the Songsterr tabs name a Super Classic
in silver sparkle, until the late 1990s); `toms`, and toms in five of the six
style figures; `ghostBias` 0.1 and no ghost weights (the record's
_avoid_: ghost-note funk); a feel a hair on top of the beat (the record's
`beat_placement: on_top`, inferred) with a 0.02 wobble rather than a grid
(_avoid_: tight quantised rock); `flam` 0.15 for the rudimental passages;
`midFills` 0.25 (the record's fill every four bars); a floor-tom accent every
dotted eighth as a cross-rhythm (`crossRhythm` 0.2) for his polyrhythm. The
style's own bpm stops at 150 because its hand-hand-foot-foot fill runs eight notes without a gap.

**Grids.** Ten songs follow human Songsterr transcriptions (each tab's
`aiGenerated` flag and revision history checked), read bar by bar, the most
common bars kept. Each tab's length at its marked tempo matches the record
(Sunshine 250 s, White Room 301 s, Crossroads 253 s, I Feel Free 170 s, Born
Under a Bad Sign 190 s, Badge 161 s), which is a check on the tempo too.

- **Sunshine of Your Love** (256): the verse, 30 bars of it, is all toms: rack
  and floor together on 1 and 3, the floor on the "and"s of 1 and 3, the mid
  tom with the kick on 2, the "and" of 2, 4 and the "and" of 4. The chorus has
  crashes on 1 and 3 and the toms answering the riff; the solo puts the snare
  with the crash on 1 and 3. Fills are threes down the kit.
- **White Room** (4455): the 5/4 bar (below) and the verse's fill.
- **Crossroads** (242, the Winterland live take on _Wheels of Fire_): the floor
  tom on 1, the snare on 2, 3 and 4, the kick on the "and"s of 1, 2 and 4, and
  only the hat foot on the "and"s of 2 and 4: the tab writes no cymbal under
  the verse, and it is kept as written.
- **I Feel Free** (4746): a two-bar verse, the hats open on the beat and the
  "and"s; its tom fill has no run of four, so it plays at 176.
- **Badge** (4135), **Tales of Brave Ulysses** (4922, the snare on every beat,
  then a section of floor tom and both kicks in eighths), **SWLABR** (4888),
  **Strange Brew** (4216) and **Born Under a Bad Sign** (62912, the ride's
  bell on the "and"s, the snare with the riff, so the song's backbeats are 2
  and the "and" of 3).
- **Do What You Like** (3491, the whole _Blind Faith_ album in one human tab,
  an early revision): crash and kick on 1, the hat foot on every eighth, the
  toms on the "and" of 2, the "and" of 3, 4 and 5. The cabasa in 16ths over it
  is left out: no credit says it is his. Its fills are reconstructions in
  eighths (the tab has none in that section).

**White Room: the 5/4 bar, not the 4/4 verse.** The bar the record calls out
(`why_it_matters`: "Odd-metre intro in 5/4") is the one Baker claimed to have
added; it is his part, not a plain backbeat; and it is 23 of the tab's 131
bars (the opening, and before and after the third verse). The verse (kick on
1 and the "and" of 1, a 16th after each backbeat, half-open hats) is a rock
beat the genre styles already play. The bar: crash, snare and kick on 1, then
both floor toms (or the timpani) struck together, a triplet on 2, a quarter on
3, eighths on 4, the "and" of 4 and 5. A 5/4 bar here is sixteenths, so the
triplet is the nearest steps, 4, 5 and 7; there is no sextuplet 5/4.

**Toad is a reconstruction.** Songsterr's Toad (67057) has no
drum part. The Toad here is in sextuplet 4/4 (`4/4-6`) from his record's
ostinato: the right kick on the beat, the left on the second triplet, the toms
on the third, a gap between every note; then the tom melody moving, jazz ride
time with the foot back on the hat, and a rudimental snare passage, the parts
Wikipedia names. Its backbeat is the toms on the last triplet of 1 and 3.

**No Afro 12/8 song.** Every Fela and _Live!_ tab on Songsterr is
machine-made, and no source found gives the meter of "Ye Ye De Smell", "Egbe
Mi O" or Air Force's "Aiko Biaye". A draft wrote his record's 12/8 archetype
(the standard bell on the `cowbell` slot, the kick on 1 and 3, the floor tom
on 2 and 4) as a song, but a song names a record and this one would name none,
so it was dropped. His West African playing waits for a record whose meter
can be checked.

| Song                   | Year | Tempo (quarter)                                  | Meter | What defines it                                              | Source of the bars          |
| ---------------------- | ---- | ------------------------------------------------ | ----- | ------------------------------------------------------------ | --------------------------- |
| Sunshine of Your Love  | 1967 | 116 (tab); 115 (songbpm)                         | 4/4   | toms, not snare; 1 and 3 accented                            | Songsterr 256 (human)       |
| White Room             | 1968 | 110 (tab, songbpm)                               | 5/4   | crash and snare on 1, both floor toms: triplet on 2, eighths | Songsterr 4455 (human)      |
| Crossroads (live)      | 1968 | 132 (tab; length matches); songbpm 101 disagrees | 4/4   | floor tom on 1, snare on 2, 3, 4, hat foot on the "and"s     | Songsterr 242 (human)       |
| I Feel Free            | 1966 | 176 (tab, songbpm)                               | 4/4   | open hats on the beat and the "and"s                         | Songsterr 4746 (human)      |
| Badge                  | 1969 | 106 (tab, songbpm)                               | 4/4   | eighths; the bridge on the ride, a crash on the "and" of 4   | Songsterr 4135 (human)      |
| Tales of Brave Ulysses | 1967 | 106 (tab, songbpm)                               | 4/4   | snare on every beat; floor tom and both kicks in eighths     | Songsterr 4922 (human)      |
| SWLABR                 | 1967 | 124 (tab, songbpm)                               | 4/4   | eighths; crash and snare on every beat; a run down the toms  | Songsterr 4888 (human)      |
| Strange Brew           | 1967 | 104 (tab); 106 (songbpm)                         | 4/4   | hats opening on 1, kick on 3, the "and" of 3 and of 4        | Songsterr 4216 (human)      |
| Born Under a Bad Sign  | 1968 | 92 (tab); songbpm 183 (doubled)                  | 4/4   | ride bell on the "and"s, snare with the riff, kicks doubled  | Songsterr 62912 (human)     |
| Toad                   | 1966 | 141 (songbpm; 71 half)                           | 4/4-6 | two kicks in triplets under tom phrases                      | **reconstruction** (record) |
| Do What You Like       | 1969 | 160 (tab); 153 (songbpm)                         | 5/4   | hat foot in eighths, toms answering, no snare                | Songsterr 3491 (human)      |

**Left out.** "Sitting on Top of the World" (4004, human): its 12/8 bar has the
kick and snare every two eighths under a ride on every eighth, two against
three; that may be his, or the tab's barring, and could not be checked against
the record. "Spoonful" (62917): 74 of its bars are blank. "Politician"
(4453): one plain bar of eighths, 76 times. "N.S.U." (415624): the drum track
is empty. "Deserted Cities of the Heart" (62913): the drum track is
machine-made ("regenerated", created via AI). Blind Faith's single-song tabs
("Had to Cry Today", "Do What You Like", "Well All Right"), every Fela tab with
Baker, and the Baker Gurvitz Army tabs are AI-generated. "Presence of the
Lord" has no drum track. Graham Bond Organisation: no tab found.

**Found on the way, not changed.**

- His left foot moved between the left bass drum and the hi-hat; the model has
  one `doubleKick` flag and a hat foot, so nothing stops a figure writing the
  hat foot under a left-foot kick (none of his here does).
- There is no sextuplet 5/4, so White Room's triplet on 2 is the nearest
  sixteenths.
- A timpani is not a lane: White Room's two floor toms stand for whatever the
  tab's two low drums were.
- A song cannot change meter at a section: White Room's 4/4 verse and Toad's
  4/4 vamp around the solo are not in the songs.
- The style-level cross-rhythm (a floor-tom accent every six steps) means three
  against four only on a sixteenth grid; Toad turns it off.

Sources: Wikipedia — [Ginger Baker](https://en.wikipedia.org/wiki/Ginger_Baker),
[Sunshine of Your Love](https://en.wikipedia.org/wiki/Sunshine_of_Your_Love),
[White Room](https://en.wikipedia.org/wiki/White_Room),
[Toad (instrumental)](<https://en.wikipedia.org/wiki/Toad_(instrumental)>),
[Blind Faith (album)](<https://en.wikipedia.org/wiki/Blind_Faith_(Blind_Faith_album)>),
[Live! (Fela Kuti album)](<https://en.wikipedia.org/wiki/Live!_(Fela_Kuti_album)>),
[Ginger Baker's Air Force (album)](<https://en.wikipedia.org/wiki/Ginger_Baker%27s_Air_Force_(album)>);
[Ultimate Classic Rock, Ginger Baker songs](https://ultimateclassicrock.com/ginger-baker-songs/);
[Far Out, six drum tracks](https://faroutmagazine.co.uk/ginger-baker-six-best-drum-tracks/);
[Jazzwise, Ginger Baker – Drums](https://jazzwise.com/features/article/ginger-baker-drums) (via search summary; the page did not load);
[Cedric Suggests, Fela with Ginger Baker Live!](https://cedricsuggests.co.uk/fela-with-ginger-baker-live-album-of-the-month-june-2021/);
Songsterr tabs 256, 4455, 242, 4746, 4135, 4922, 4888, 4216, 62912, 3491
(`https://www.songsterr.com/api/meta/<id>` for the `aiGenerated` flag and
revision); [songbpm.com](https://songbpm.com/@cream) (Cream; Blind Faith).

## U. Dave Lombardo (2026-10-11)

The `lombardo` style plays **songs** the way `bonham` and `tonywilliams` do
(F, G): each New picks one of his records, and its meter, tempo and grooves
come with it. His record in the drummer model
(`drummer-model/drummers/dave-lombardo.json`) sets the rules: tempos of 180 to
250 for the thrash sections and half-time for the heavy ones; K and K2 in turn
in a double-bass run; clave-like syncopations when the toms play over the
double bass; small timing jitter, never quantised. Its avoid list is
triggered, machine-perfect kicks, swing, and ghost-note funk.

**Which records are his.** Personnel was checked on Wikipedia album by album;
he is the drummer on every track of each one used: _Show No Mercy_ (1983),
_Hell Awaits_ (1985), _Reign in Blood_ (1986), _South of Heaven_ (1988),
_Seasons in the Abyss_ (1990), _Christ Illusion_ (2006) and _World Painted
Blood_ (2009). Paul Bostaph drums on everything from _Divine Intervention_
(1994) to _God Hates Us All_ (2001) and on _Repentless_ (2015); Songsterr also files Bostaph's "213",
"Disciple", "Bloodline" and a live "Hell Awaits" under Slayer, and its tabs
of the _Undisputed Attitude_ covers name John Dette. None of those is used. His records
outside Slayer (Grip Inc., Fantômas, Testament's _The Gathering_, Suicidal
Tendencies, Dead Cross) are his, but no transcriptions of them were read; they
are left for a later pass.

**How he played.** On two bass drums, not a double pedal: "I don't like a
double pedal because when the beater hits, I immediately come back with the
other pedal. And that head is resonating, which creates a momentum that isn't
helpful … With two bass drums, I don't have any problems. It's just a feel
thing" (Guitar Center, 2012, quoted on Wikipedia). Heel up, pedals angled;
in _Modern Drummer_ he said a beat on the bass drums always starts with his
left foot (Wikipedia). The _Angel of Death_ break began in a drum solo, and
Hanneman asked to put it in a song (Blabbermouth). Of that break he told _New
Noise_ that the double bass is in 32nd notes, with syncopated tom hits over it
in "a very typical Tito Puente" figure (as reported by Metal Injection and
NPR); NPR: "he unwittingly felt Puente's influence during a key drum break";
he grew up watching the drummers in Cuban dance bands at his parents' clubs.
Drummerworld called him "the godfather of double bass". _Die Zeit_: "Dave
Lombardo's fast and precise groove are at the eye of this metallic storm".

**What the style encodes.** `doubleKick`, so a run of kicks is two feet. No
swing and `ghostBias` 0 (the avoid list). A feel just ahead of the beat on the
snare and kick with a wobble of 0.03 of a sixteenth (his record's 3–4 ms of
jitter: "controlled chaos", not quantised). `rimshot` 0.3 for the cutting
snare; `flam` 0.1 for the flammed toms of the break. The kit is `crocell`, the
sampled kit of a metal band: a punchy kick and a tight, cracking snare, mixed
close with little room, nearest the dry _Reign in Blood_ sound (Rubin, no
triggers). The open hat of the tabs, struck on every eighth at speed, is
written half-open (`h` 4), as the `thrash` genre does. The style's own figures
and fills are his mid-tempo vocabulary, gathered from the songs below.

**Grids.** The songs are in two grids, as the plan says (11-e):

- **Past 190, in eighths (`4/4-8`).** Angel of Death, Raining Blood,
  Necrophobic, War Ensemble, Jesus Saves and Cult. Their tabs are written in
  sixteenths at the record's speed (about 200–250); here each tab sixteenth
  that falls on an eighth is kept and the rest dropped. The skank beat comes
  through whole (kick on the beat, snare on every "and", the ride or hat on
  every eighth). The tabs' kick doubles on the "e" (`x...xx..`), a sixteenth,
  are dropped, and so are their sections of sixteenth double bass at 175–210
  (Raining Blood's verse, War Ensemble's chorus, Angel of Death's intro and
  outro): too fine for eighths and past the run limit of a sixteenth grid
  (150). Eighths on both feet, as in War Ensemble and Cult, are kept.
- **Up to 190, in sixteenths (`4/4`).** South of Heaven, Mandatory Suicide,
  Seasons in the Abyss, Dead Skin Mask, the Hell Awaits intro, World Painted
  Blood and Black Magic, at the record's tempo. Where a song's bars run four
  sixteenths or more (double bass), its range stops at 150.
- **The Angel of Death break** is counted as he counts it: half the tab's
  210, so 103–110 (songbpm.com's 106), where his 32nds would be. They are
  written as sixteenths at that tempo, half the record's rate on the feet, as
  the plan allows. The bars either side are written in the same count (the
  ride on the record's eighths becomes sixteenths, the snare on its quarters
  eighths). The tab (Songsterr 17586) writes the tom figure as flammed
  quarter-note triplets, three on the rack tom and three on the mid; a
  sixteenth grid holds no triplet, so it is written as a tresillo (3-3-2) on
  each tom, the clave-like figure his record's rule asks for. **That figure is
  a reconstruction.**

All fourteen follow human Songsterr transcriptions, read with Songsterr's API
(each tab's `aiGenerated` flag was false), the drum track's bars counted and
the commonest kept; the tempo is the tab's tempo map, checked against
songbpm.com, which gives most of them in half time (106 for 212). Changes
made so the critic passes, and the rest:

- Four snare notes in a row fail the critic, so the tabs' snare rolls into a
  section (sixteenths at 210, eighths here) are broken with toms or rests.
- Hell Awaits: the intro has both toms on 1 and 3 over the double bass; under
  the crash that marks each half of the phrase that is three hands, so the 1
  is the floor tom alone.
- Dead Skin Mask has no snare in its main sections (the floor tom and bell on
  2 and 4 over the hat foot; double bass under the ride; a gallop under
  crashes); the song keeps none, and the critic finds its backbeat on the tom.
- World Painted Blood's tom figure (`xxx.x.xxx.x.xxx.`) alternates bar by bar
  between the mid and floor toms; here it is on the mid tom.
- War Ensemble's two-bar march figure (snare and floor tom on the riff, the
  crash on the pushes, eighths on the feet) is kept as one two-bar figure.
- The 6/4, 5/4, 9/8, 10/8, 11/8 and 12/8 bars of Mandatory Suicide, Black
  Magic, Jesus Saves, At Dawn They Sleep, Hell Awaits and Postmortem are left
  out: one song has one meter.

| Song                       | Year | Tempo (quarter)                                 | Grid  | What defines it                                                                   | Source of the bars                               |
| -------------------------- | ---- | ----------------------------------------------- | ----- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| Angel of Death             | 1986 | 206–220 (tab); 106/212 (songbpm)                | 4/4-8 | skank on ride or open hats; the 182 rock beat; half-time on the ride              | Songsterr 17586 (human)                          |
| Angel of Death (the break) | 1986 | 103–110, half the tab's 206–220                 | 4/4   | both feet throughout; toms over them; the double-bass ride beat either side       | Songsterr 17586 (human); toms **reconstruction** |
| Raining Blood              | 1986 | 211–251 (tab, skank sections); 89/178 (songbpm) | 4/4-8 | skank to the 250 of the ending, crash on every beat; the intro toms in unison     | Songsterr 17904 (human)                          |
| Necrophobic                | 1986 | 241–259 (tab); 124/248 (songbpm)                | 4/4-8 | the fastest on the record: skank on hats and ride                                 | Songsterr 53719 (human)                          |
| Jesus Saves                | 1986 | 210–228 (tab, fast part); 109/218 (songbpm)     | 4/4-8 | skank on the bell after a splash; the bell over a snare on every beat             | Songsterr 53758 (human)                          |
| War Ensemble               | 1990 | 195–207 (tab); 99/198 (songbpm)                 | 4/4-8 | eighths on both feet, snare on every beat; skank; the two-bar march               | Songsterr 18010 (human)                          |
| Cult                       | 2006 | 200–210 (tab); 101/202 (songbpm)                | 4/4-8 | skank; ride quarters over eighths on the feet; a tom groove                       | Songsterr 37608 (human)                          |
| South of Heaven            | 1988 | 134–146 (tab); 139 (songbpm)                    | 4/4   | hats over 2 and 4; snare on every beat over double bass; dotted-eighth china      | Songsterr 17962 (human)                          |
| Mandatory Suicide          | 1988 | 148 (tab and songbpm)                           | 4/4   | hats on the beat, double bass or 1 and 3; the ride; a half-time bar               | Songsterr 17669 (human)                          |
| Seasons in the Abyss       | 1990 | 152 (tab and songbpm)                           | 4/4   | rock beat on the ride, the snare doubling at the bar's end, the mid tom answering | Songsterr 17564 (human)                          |
| Dead Skin Mask             | 1990 | 110 (tab and songbpm)                           | 4/4   | no snare: floor tom and bell on 2 and 4; double bass under the ride; a gallop     | Songsterr 18024 (human)                          |
| Hell Awaits (intro)        | 1985 | 103–106 (tab); 106 (songbpm)                    | 4/4   | both toms with the kick on 2 and 4; toms on 1 and 3 over double bass              | Songsterr 18291 (human)                          |
| World Painted Blood        | 2009 | 180–182 (tab); 93/186 (songbpm)                 | 4/4   | eighths on both feet under crashes, hats or a tom figure in threes; skank         | Songsterr 60404 (human)                          |
| Black Magic                | 1983 | 177–190 (tab); 94/188 (songbpm)                 | 4/4   | skank on open hats                                                                | Songsterr 17871 (human)                          |

**Left out.** Criminally Insane, Postmortem, Hallowed Point, Chemical
Warfare, Ghosts of War, Silent Scream, Expendable Youth, At Dawn They Sleep,
Die by the Sword and Spirit in Black are his and have human tabs, but their
grooves are the skank beat and the double-bass beats the fourteen already
have (Postmortem's 12/8 opening and At Dawn They Sleep's 10/8 bars would need
songs of their own). Piece by Piece's tab has no snare in its main bars,
which looks unfinished. Reign in Blood's title is not a track ("Raining
Blood" is). Raining Blood's double-bass verse at 175 and the sixteenth double
bass of War Ensemble, Silent Scream and At Dawn They Sleep at 196–208 fit
neither grid (above).

**Found on the way, not changed.**

- The model has no leading foot: `doubleKick` alternates the feet, but he
  starts a run on the left (_Modern Drummer_), and two bass drums with their
  own heads are the same as a double pedal to the generator, the critic and
  the 3D drummer.
- A run of sixteenths on the kick at 175–210, the core of his playing, fits
  no grid: a sixteenth grid stops at 190 and its runs at 150; eighths are too
  coarse. Those sections are left out rather than slowed down.
- The tom figure of the break is in quarter-note triplets over straight
  sixteenths; no meter holds triplets and sixteenths in one bar.
- One song has one meter and one tempo: Seasons in the Abyss's slow intro at
  64, Raining Blood's verse at 175 against its 250 ending, Angel of Death's
  182 middle, Postmortem's 12/8 and the odd bars are not written.
- He stretches endings live (two more bars on Raining Blood's): the model has
  no live arrangement.

Sources:

- https://en.wikipedia.org/wiki/Dave_Lombardo
- https://en.wikipedia.org/wiki/Show_No_Mercy
- https://en.wikipedia.org/wiki/Hell_Awaits
- https://en.wikipedia.org/wiki/Reign_in_Blood
- https://en.wikipedia.org/wiki/South_of_Heaven
- https://en.wikipedia.org/wiki/Seasons_in_the_Abyss
- https://en.wikipedia.org/wiki/Christ_Illusion
- https://en.wikipedia.org/wiki/World_Painted_Blood
- https://blabbermouth.net/news/dave-lombardo-says-double-bass-break-in-slayers-angel-of-death-was-originally-part-of-a-drum-solo
- https://metalinjection.net/?p=389749 (New Noise interview, as reported)
- https://www.kunc.org/2023-05-05/from-slayer-to-tito-puente-drummer-dave-lombardo-changes-tempo (NPR)
- https://www.npr.org/transcripts/1173267909
- https://www.songsterr.com/api/songs?pattern=slayer
- https://www.songsterr.com/api/meta/17586 (and 17904, 53719, 53758, 18010, 37608, 17962, 17669, 17564, 18024, 18291, 60404, 17871)
- https://www.songsterr.com/a/wsa/slayer-angel-of-death-drum-tab-s17586
- https://www.songsterr.com/a/wsa/slayer-raining-blood-drum-tab-s17904
- https://www.songsterr.com/a/wsa/slayer-south-of-heaven-drum-tab-s17962
- https://www.songsterr.com/a/wsa/slayer-war-ensemble-drum-tab-s18010
- https://songbpm.com/@slayer/angel-of-death (and /raining-blood, /necrophobic, /jesus-saves, /war-ensemble, /cult, /south-of-heaven, /mandatory-suicide, /seasons-in-the-abyss, /dead-skin-mask, /hell-awaits, /world-painted-blood, /black-magic)

## V. Adrienne Davies (2026-10-11)

The `davies` style plays **songs** the way `gadd` does (N): each New picks
one of her records, and its meter, tempo and swing come with it. Her record
in the drummer model (`drummer-model/drummers/adrienne-davies.json`) sets the
rules: tempo 35 to 60 with a grid no finer than eighths; let every cymbal
ring; two to eight notes a bar; fills almost never, swells and dynamic shifts
instead. It says to avoid 16th hats, a busy kick, fast fills and short,
choked sounds. Its three patterns are archetypes: a glacial half-time
backbeat (ride on 1 and 3, snare on 3), a mallet swell and a slow swampy
shuffle.

**Which records are hers.** Credits checked on Wikipedia for every record
kept. _Hex; Or Printing in the Infernal Method_ (Southern Lord, recorded
March–May 2005, Randall Dunn producing): "drums, percussion, wind chime". _The
Bees Made Honey in the Lion's Skull_ (2008): "drums, percussion".
_Angels of Darkness, Demons of Light I_ (2011) and _II_ (2012, recorded at the
same sessions): "trap kit and percussives", with Lori Goldston on cello and
Karl Blau on bass. _Primitive and Deadly_ (2014): drums, with Bill Herzog on
bass and Mark Lanegan singing on "There Is a Serpent Coming" and "Rooks Across
the Gate". _Full Upon Her Burning Lips_ (2019): Wikipedia lists the members
without instruments; reviews (mxdwn, The Sound Projector) give the core duo,
Carlson on guitar and bass and Davies on drums and percussion. _Hibernaculum_
(2007, re-recordings of older songs) is credited to her on her Wikipedia page
but its personnel was not checked, and it is left out.

**How she played.** Lori Goldston, interviewing her for Tom Tom Magazine
(2011): her playing is "fluid and precise, somehow delicate and massive at
the same time"; in Earth "an extraneous note or gesture sounds ridiculous".
Davies there: "I have always preferred ride cymbals to crash or hi-hats, so I
wanted to make them more interesting and expressive", and she was working "on
using hats more and learning to play at other tempos, and to not swing
everything – straight feel, as well as 3/4 time and better fills". Her
favourite drummers: "Jim Keltner, Levon Helm, Thomas Widler [Wydler], Jim
Sclavunos, and Ralph Molina. Simplicity." Bandcamp Daily (2016): "I noticed
how impossible it was to play music that slow, [with that] relaxed of a
backbeat. If you go too slow, you lose all momentum and there's no groove to
it"; "What I'm doing is very circular; there are no right angles"; she
prefers Hex and Hibernaculum live. Louder Than War: "I always play the drums
lyrically and make each note count", slow playing as "using a rocking
motion, using your momentum" with "a 2/4 blues back beat". Metal Odyssey
(2011): "It's what I don't play and knowing what not to fill a song with";
"I like to make it dramatic, rather than pummel a song to death". The
Brooklyn Rail (2019): "Often, the quieter you play—it can sound heavier than
hitting hard"; her '64 mahogany Ludwig snare has been "my main snare on every
album and on tour"; a '72 14 × 10 Ludwig rack tom; Gregg Keplinger's
hand-hammered cymbals on top of the ride and the crash; "I absolutely love
playing brushes, and some of the heaviest songs that we've recorded have
them"; on "She Rides an Air of Malevolence", "a close-miked, hide drum with
soft mallets barely touching it". Her first kit was "a sixties Ludwig set of
drums, a blue oyster color" (Metal Odyssey). The Sound Projector on Full Upon
Her Burning Lips: "always soft and unobtrusive ... yet unerring", "precise and
placid drumming", and "unexpected cowbell dings" on "Descending Belladonna".
No Modern Drummer feature, lesson or published transcription of her playing
was found.

**Tempos.** No tempo for any of these songs is published anywhere found, and
the machine figures disagree with each other: songbpm (Spotify's analysis)
and Deezer's `bpm` field are double, triple or unrelated as often as right.
So each tempo was **measured**: the onset envelope of the record's 30-second
Deezer preview, autocorrelated, and the gaps between its strongest onsets
read by hand (a numpy script; the preview is part of the record, not
necessarily its main groove). A reading is trusted where a machine figure is
a whole multiple of it: Deezer's 116.8 and songbpm's 119 for Old Black are
twice the 59 measured, Deezer's 136 for Engine of Ruin three times the 45.5
(it is counting triplet eighths). Where nothing agrees, the measurement is
used and the table says so. The Bees Made Honey's 82 is the human tab's own
tempo, and the preview agrees (a dotted quarter of 55.5 is 83). Which pulse
is "the beat" is a reading too: at these speeds a stroke every 2.9 seconds is
a backbeat on 2 and 4 at 41 or once a bar at 83, and the notes are the same.
All are open to a listen.

**What the style encodes.** The kit is `smdrums`, SM Drums' 1960s Ludwig
with a 1965 snare left ringing, heard through a stereo mix: her '64 Ludwig
snare and her first sixties Ludwig, and the room. The three Primitive and
Deadly songs, where Earth "allowed themselves to be a rock band", take
`bigrusty`, the `doom` genre's thick, rough kit with its wash of cymbal. The
meter is `4/4-8`, bars of eighths, the record's grid; `ghostBias` 0 and
`noKick` on the "and"s of 1, 2 and 3, so no ghosts and no busy kick;
`targetDensity` 5 (two to eight notes); `fillChance` 0.15 and no mid fills;
`phraseMark` a crash on 30% of phrase starts, the record's "replace the ride
with a long crash swell" (0.3); the snare 0.03 of a step behind and the kick
0.02 (the record's "laid back", inferred). The style's own figures are the
record's half-time archetype, one bar each: the ride on 1 and 3, the snare on
3, the kick on 1 and sometimes the "and" of 4, the kick left out, a crash in
place of the ride, the ride on every beat. Its three fills are two
floor-tom strokes, a snare and a floor tom, and the swell: a crash and kick
on 1, rung through the bar, a floor tom on 3. **A song under 50 is counted in
eighths**, as the plan decided: one bar here is half a bar of the record's,
at twice the number, so a quarter here is the record's eighth and the steps
between are its sixteenths, which her rule leaves empty (`noKick` on every
odd step in those songs). The 12/8 songs need no doubling: a 12/8 tempo
counts quarters, so a dotted-quarter pulse of 36 reads 54. Their notes sit on
the eighths, the even steps. Father Midnight is swung (`swingUnit` 8, swing
80): in the preview its eighths split two to one.

**Grids.** One song follows a human transcription:

- **The Bees Made Honey in the Lion's Skull** (Songsterr 609341, the drum
  track named "Adrienne Davies", `aiGenerated` false, read bar by bar): 12/8
  at 82, the ride on the four dotted-quarter pulses (a crash or ride bell on
  the first bar of a phrase), the kick on 1 and on the last eighth of pulses
  2 and 4, the snare on pulse 3; every other bar the last kick is a snare;
  once, the snare on 3 and 4 with a kick after each, which is the fill. Every
  second bar of the tab is 15/8, the cymbal stopping for its last two
  pulses; that is left out.

Songsterr's other tabs of her songs (Old Black 1042140, Rise to Glory
1227621, Even Hell Has Its Heroes 2300416, Torn by the Fox 4019772) are
machine-made (`aiGenerated` true) and were not used. Miami Morning Coming
Down II (424408) is a human tab, but only a 14-bar intro fragment in 3/4 at
100 with four snare strokes, which does not match the record's 1.44-second
pulse; it was not used. The other fourteen songs are **reconstructions**
from the record's archetypes, what she says (ride over hats, the relaxed
2/4 backbeat, cymbals left to ring) and the measured pulse; the shuffles are
the record's swampy-shuffle archetype thinned toward its own rule of eight
notes a bar (the archetype has thirteen).

| Song                                    | Record                            | Tempo (measured; machine figures)                                                         | Meter, here         | What defines it                                          | Source of the bars |
| --------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------- | ------------------ |
| Land of Some Other Order                | Hex (2005)                        | pulse 0.89–0.97 s, 64–66 (autocorrelation 66.5); songbpm 105, Deezer 160 do not fit       | 4/4-8, 63–67        | ride on every beat, snare on 3, kick on 1                | **reconstruction** |
| Lens of Unrectified Night               | Hex                               | snare gaps 2.1–2.4 s, halves 1.10–1.23 s: 52–54; Deezer 105.2 (double)                    | 4/4-8, 52–55        | ride on 1 and 3, snare once a bar                        | **reconstruction** |
| An Inquest Concerning Teeth             | Hex                               | 1.38–1.58 s, 41.5 (autocorrelation 41.5); songbpm 144, Deezer 159 do not fit              | 4/4-8, 82–84 (×2)   | counted in eighths; snare on the record's 2 and 4        | **reconstruction** |
| Raiford (The Felon Wind)                | Hex                               | pulse 1.63–1.75 s, 35.7; Deezer 107.7 (= 3 × 35.9), songbpm 112 (≈ 3 × 37)                | 12/8, 52–55         | four slow pulses, snare on the third                     | **reconstruction** |
| The Bees Made Honey in the Lion's Skull | Bees (2008)                       | 82 (tab); dotted quarter 1.06–1.15 s = 83; Deezer 164.7 (double)                          | 12/8, 80–84         | kick on 1 and the "a" of 2 and 4, snare on 3             | Songsterr 609341   |
| Rise to Glory                           | Bees                              | stream 0.66–0.72 s, 87; songbpm 87, Deezer 86.9; read as eighths of 43.5                  | 4/4-8, 86–88 (×2)   | counted in eighths; ride on the record's eighths         | **reconstruction** |
| Engine of Ruin                          | Bees                              | pulse 1.27–1.39 s, 45.5 (autocorrelation 45.5); Deezer 136 (= 3 × 45.3)                   | 12/8, 67–70         | slow shuffle, snare on 2 and 4                           | **reconstruction** |
| Old Black                               | Angels I (2011)                   | bar 4.07 s, beat 1.02 s: 59; songbpm 119, Deezer 116.8 (double)                           | 4/4-8, 58–60        | dirge: ride on every beat, snare on 3                    | **reconstruction** |
| Father Midnight                         | Angels I                          | 0.85–0.93 s, 66–68 (autocorrelation 68); songbpm 65, Deezer 129.2 (double)                | 4/4-8, 64–68, swing | swung eighths split 2:1, kick on the "and" of 4          | **reconstruction** |
| Hell's Winter                           | Angels I                          | 1.13–1.25 s, 53 (autocorrelation 53.5); Deezer 105.5 (double)                             | 4/4-8, 52–54        | a crash ridden on 1 and 3                                | **reconstruction** |
| His Teeth Did Brightly Shine            | Angels II (2012)                  | dotted quarter 1.27 s, 47 (with 73 and 145); Deezer 141.1 (= 3 × 47)                      | 12/8, 69–72         | slow swampy shuffle, snare on 2 and 4                    | **reconstruction** |
| There Is a Serpent Coming               | Primitive and Deadly (2014)       | 0.96–1.03 s, 61–63 (autocorrelation 63); Deezer 160.9 does not fit                        | 4/4-8, 60–63        | rock backbeat on 2 and 4, `bigrusty`                     | **reconstruction** |
| Torn by the Fox of the Crescent Moon    | Primitive and Deadly              | two-bar cycle 6.45–6.7 s, eighths 0.39–0.43 s: 73–74; songbpm 144, Deezer 142.6 (eighths) | 4/4-8, 72–75        | backbeat on 2 and 4, a crash ridden; three-eighth pickup | **reconstruction** |
| Rooks Across the Gate                   | Primitive and Deadly              | 1.20–1.35 s, 47.5 (autocorrelation 47.5); Deezer 97.7 (double); songbpm 144 no            | 4/4-8, 94–98 (×2)   | counted in eighths; a crash on the record's beats        | **reconstruction** |
| Cats on the Briar                       | Full Upon Her Burning Lips (2019) | 0.87–0.96 s, 65 (autocorrelation 65); songbpm 66, Deezer 132.1 (double)                   | 4/4-8, 64–66        | soft: a cross-stick on 3 under the ride                  | **reconstruction** |

The three-note pickup in Torn by the Fox is three onsets an eighth apart
every second bar in the preview; whether they are the drums or the guitars
is not certain. Rise to Glory's 87, on which all three readings agree, is
read as the eighths of 43.5 because at 87 her relaxed 2/4 backbeat would
come every 1.4 seconds, quicker than anything else she plays; written here
at 87, the notes are the same either way.

**Left out.** The Dire and Ever Circling Wolves (65–68 measured, Deezer
132.9 = 2 × 66.5) and Omens and Portents I: The Driver (41.5, counted 83) are
the same grooves as Land of Some Other Order and An Inquest Concerning
Teeth. Hung from the Moon (57; Deezer 113 double), Descent to the Zenith (54),
A Multiplicity of Doors (62), The Corascene Dog (45), The Rakehell (no clear
reading) and Exaltation of Larks (59; songbpm 118, the eighths) have no
description of the drums beyond the tempo. Datura's Crimson Veils measures
70–72 but songbpm and Deezer both say 81 (161.5 = 2 × 80.75): unresolved.
She Rides an Air of Malevolence is the hide drum and soft mallets, which the
kit does not have. Miami Morning Coming Down II (41.5): see the tab above.
Hibernaculum: personnel not checked.

**Found on the way, not changed.**

- The model has no mallets, no cymbal roll or swell, no hide drum and no wind
  chimes, which are half of her sound (the record's "mallet swell and
  rumble" pattern, She Rides an Air of Malevolence, Hex's wind chime). A
  swell is written as a crash on 1 left to ring.
- Nothing says how long a cymbal rings: "let every cymbal ring" is the
  samples' own decay, and the kit has no choke to avoid.
- A song cannot change meter bar by bar, so the Bees tab's alternating 12/8
  and 15/8 is written as 12/8 alone.
- In a song counted in eighths the generator's variation can put a crash
  accent on an off-beat eighth here, the record's sixteenth; `noKick` keeps
  the kick off those steps, but no field keeps a cymbal off them.
- Brushes: she loves them and uses them on "some of the heaviest songs", but
  no source says which, so no song uses the DRS brush kit.
- The record's own swampy-shuffle archetype has thirteen notes a bar, over
  its own rule of two to eight; the shuffles here are thinned to eight or
  nine.
- The record's generation rule says 35 to 60, but the measured songs run from
  36 to 74 (its `tempo_comfort_bpm` of 30–80 is closer). Its open question
  "measure actual tempos" is partly answered here, from previews.
- The record lists Bill Frisell as a likely guest on Bees; not checked, and
  not relevant to the drums.

Sources: [Hex (Wikipedia)](https://en.wikipedia.org/wiki/Hex;_Or_Printing_in_the_Infernal_Method),
[The Bees Made Honey in the Lion's Skull (Wikipedia)](https://en.wikipedia.org/wiki/The_Bees_Made_Honey_in_the_Lion%27s_Skull),
[Angels of Darkness, Demons of Light I](https://en.wikipedia.org/wiki/Angels_of_Darkness,_Demons_of_Light_I)
and [II](https://en.wikipedia.org/wiki/Angels_of_Darkness,_Demons_of_Light_II),
[Primitive and Deadly](https://en.wikipedia.org/wiki/Primitive_and_Deadly),
[Full Upon Her Burning Lips](https://en.wikipedia.org/wiki/Full_Upon_Her_Burning_Lips),
[mxdwn review](https://music.mxdwn.com/2019/06/03/reviews/earth-full-upon-her-burning-lips/amp/),
[The Sound Projector review](https://www.thesoundprojector.com/2019/06/12/full-upon-her-burning-lips/),
[Tom Tom Magazine (Lori Goldston, 2011)](https://tomtommag.com/2011/12/earths-adrienne-davies/),
[The Brooklyn Rail (2019)](https://brooklynrail.org/2019/10/music/Lighter-And-Heavier-Adrienne-Davies-of-Earth-In-Conversation/),
[Bandcamp Daily (2016)](https://daily.bandcamp.com/features/adrienne-davies-interview),
[Louder Than War](https://louderthanwar.com/interview-depth-conversation-earth-eve-uk-tour/),
[Metal Odyssey (2011)](https://metalodyssey.net/2011/03/12/earth-a-metal-odyssey-interview-with-adrienne-davies/),
[Adrienne Davies (Wikipedia)](https://en.wikipedia.org/wiki/Adrienne_Davies),
[Songsterr 609341](https://www.songsterr.com/a/wsa/earth-the-bees-made-honey-in-the-lions-skull-drum-tab-s609341)
(and the machine-made 1042140, 1227621, 2300416, 4019772; the fragment
424408), songbpm (`https://songbpm.com/@earth/<song>`), and Deezer's API
(`https://api.deezer.com/album/<id>/tracks`, each track's `bpm` and
`preview`).

## W. Klek de Poitrine (2026-10-11)

The `klek` style plays **songs** the way `gadd` does (N): each New picks one
of Angine de Poitrine's records, and its meter, tempo and grooves come with
it. The record in the drummer model
(`drummer-model/drummers/klek-de-poitrine.json`) sets the rules: long
repetition with rare, abrupt changes; tight timing (2 ms of jitter) to sit
against live loops; polymetric accent cycles for builds; no swing, and no busy
fills during a loop build.

**The persona policy holds.** The record is `private_do_not_research`. This
research read the band's records, their Bandcamp notes, an article on the
music, the tempo database and the drum tabs, and nothing about who plays the
drums. The style, the songs and this section name only Klek de Poitrine, Khn
de Poitrine and the band.

**Which records are Klek's.** The band is a duo, and both albums' own
Bandcamp credits name Klek on drums: _Vol. 1_ (14 June 2024, "Percussions et
voix : Klek de Poitrine") and _Vol. II_ (3 April 2026, "Batterie et
percussions : Klek de Poitrine"). _Vol. 1_ is Sherpa, Tohogd, Tamebsz, Ababa
Hotel, Sahardnieh and L'Aberek; _Vol. II_ is Fabienk, Mata Zyklek, Sarniezz,
Utzp, Yor Zarad and Angor (some shops list the fourth as "Perep Utz"; the
band's own page says Utzp). The KEXP session, filmed at Trans Musicales in
Rennes on 4 December 2025 and published on 5 February 2026, is the same two
players; the Songsterr tabs taken from it are of Sherpa, Sarniezz and Mata
Zyklek, and MusicRadar's article reads Fabienk from it too.

**How Klek plays.** _Vol. 1_'s notes describe the band as "mantra-rock", built
"à la manière de la musique techno" round "un jeu dynamique d'ajout et de
retrait de motifs sonores": Khn records and layers loops live with the feet,
and "la batterie au timbre mat de Klek se comporte avec la sagesse et la
tempérance du sherpa; l'ajout progressif et calculé d'éléments ou le dosage
stoïque du silence guident l'auditeur … faisant danser des grooves
asymétriques, culminer l'intensité ou basculer le point d'ancrage rythmique au
bon moment". MusicRadar's dissection of Fabienk calls the drums "far simpler"
than the guitar, "with a beautifully dampened and close-miked drum sound,
which is straight out of funk playbook", and explains the trick in its second
part: the loops stay in 7/8 while "the drums play three bars of 4/4, with an
added bar of 2/4 at the end of each cycle. This creates a 14-beat crotchet
cycle, which is the same length as four bars of 7/8", with "cymbal crashes
which cement the beginning of each new 4-bar section" and a "4-to-the-floor
kick drum". It calls the device metric modulation. The tabs show the same
device in Tohogd (a 4/4 groove laid across four bars of 7/8) and two more
changes of pulse on a shared note: Sarniezz goes from 12/8 at a dotted
quarter of 116 to 4/4 at 174, the 8th unchanged, and Sherpa's triplet section
at 120 becomes the main groove at 180, the triplet 8th becoming the 8th.

**What the style encodes.** The record's rules, where the model has a field
for them: `swing` 0; a `feel` with `jitter` 0.015 of a 16th (about 2 ms at 130) and no lean; `build` (the busier figure second: "l'ajout progressif et
calculé d'éléments"); `fillChance` 0.4, `midFills` 0, `anticipate` 0 (few
fills, none inside the phrase); `crossRhythm` 0.25 over two cycles, Sherpa's
kick and snare on every dotted quarter for three bars, and the record's
archetype, a dotted-8th snare accent (marked in the source as not from a tab).
Each song sets `crossRhythm` itself: 0.35 in Sherpa, 0 elsewhere, because in
7/8, 5/8, 12/8 and the triplet bars the polymeter is already written in
the figures. The kit is `teatowel`, Gogodze's damped drums with the room taken
out: "timbre mat", "dampened and close-miked". `rimshot` 0.15 for the
hard-hit backbeat; few ghosts (`ghostBias` 0.1), because the tabs have almost
none. Two-bar figures carry what crosses the bar line: Sherpa's four-bar kick
cycle as two pairs, and Tohogd's 4/4 over two bars of 7/8.

**Grids.** Songsterr's tabs of the band were read through its API, each
tab's revision history checked: several began as a machine import (the
`aiGenerated` flag on the first revision) and were then rewritten by hand,
and those are counted as human where the history says the drums were
redone. Tabs only ever machine-made (Sherpa's first tab, the "Standard
tunning" and "y"/"a" copies, Sahardnieh, L'Aberek, Teaser, the Fallon
Zugzegk) were not used; the "mp3" uploads of one contributor were not used
either, since four of the five are flagged as machine-made. The bars were
decoded per measure and the most common kept. Ten songs follow human tabs:

- **Sherpa** (5022558, live at KEXP, one human revision; 4372986, _Vol. 1_,
  one human revision; 3886668, begun by machine and revised five times, as a
  check): all three put the main groove at 180, and two of them (5022558 and 3886668) agree on a four-bar kick cycle under 2 and 4 (1, 3, &3 / 1, &2,
  &3 / 1, &1, 3, &4 / &1, 3, &3), over open hats on the beat, the crash on the
  beat, or closed 8ths. All three have the
  build with kick and snare in unison on every dotted quarter across three
  bars, and two have the same fill, three on the snare, three on the tom. The
  16th snare rolls (two bars of them) are left out: four snare 16ths in a row
  fail the critic, and at 180 a run is past `RUN_RATE`.
- **Sherpa, the triplet section** (5022558, and 4372986's tempo map): at 120,
  triplet 8ths on the hat and kick and snare together on the last triplet of
  every beat, in `4/4-6`; then the tempo goes to 180. Its unison quarters
  (crash, kick and snare) are the fill.
- **Tohogd** (4039482; begun by machine, the drums rewritten and completed by
  hand over five revisions "to be accurate to studio recording"): 172, 7/8.
  The loops go down one at a time and the drums add one thing with each; then
  hats on a quarter pulse and a 4/4 groove (snare on 2 and 4, kick on 1, &1,
  3, &3) run over two bars of 7/8 at a time, with and without the loops.
- **Tamebsz** (4046299; begun by machine, drums added and corrected by hand):
  125, though the drum part goes no further than the intro. Hats on the beat,
  kick on 1 and the "and" of 2, a snare pickup at the bar's end.
- **Fabienk, first part** (4005903, rewritten "completely" by hand, drums
  "finished"; 4664952, one human revision): 128 (songbpm and both tabs), 7/8.
  The first groove has hat and snare struck together with the riff and the
  kick alone; the second is busier, half-open hat on 1, a ghost near the end.
  The two tabs disagree about the first groove; 4005903's is kept, with
  4664952's as a lighter figure.
- **Fabienk, second part** (4932418 "Loop Instructions" and 4413175, human;
  4005903; MusicRadar): four on the floor and 2 and 4 over a 14-beat cycle,
  written in 4/4, the drums' own meter. A draft wrote two bars of 7/4 so the
  backbeat ran on across them, but a figure row is 32 steps at most and that
  is 56; the 2/4 bar that closes each cycle is not written. The build is
  the tab's: kick alone, then hats on the beat and the snare, then 8ths, then
  16ths with the hat foot on the backbeat, then the crash on the beat with
  the kick on 8ths.
- **Mata Zyklek** (3886712, live at KEXP; begun by machine, "basically
  changed everything from the ai tabs" and the drums corrected by hand): 94
  (songbpm and the tab), 5/8 in 16ths. The chorus and post-chorus (kick in
  pairs, snare on the second and fourth 8ths, hats and hat foot on the 8ths)
  and the pre-chorus (the ride). The main riff is left out: the kick on six of
  its ten 16ths (three in a row) and the snare on three more leaves one step
  of air, and the critic asks for three.
- **Sarniezz** (5245273 and 4536298, human; 4887063 and 4967459, human;
  3922271 and 4549576, begun by machine and revised many times): 12/8 at a
  dotted quarter of 116 (songbpm 116), so 174 here. Hats on the 8ths (two tabs
  accent the pulse), the snare on the second and fourth pulse, the kick on
  every pulse or on the first and third; a section of hat, kick and snare
  together in 3+3+2. The fills: floor tom, snare and kick together on 8ths;
  crash, kick and snare on two notes.
- **Sarniezz, after the modulation** (the same tabs, marked "Rhythmic
  modulation" in two): 4/4 at 174, the crash ridden on the beat, snare on 2
  and 4, the kick on 1, &1, &2, &3 (sometimes &4 too) or 1, 3, &3, &4; two
  tabs put the hat foot on every beat in their 6/4 bars.
- **Yor Zarad** (5353242, human; 4664503 has almost no drums): eighth 214,
  so 107, in 7/8. 16ths on the hat with the 8ths accented and the snare on
  four of them, the half-open hat in a second section, and a break with the
  hat alone. The snare falls on hat strokes, so the 16ths are one hand's
  (`oneHandHats`). One of the tab's kicks (the second of the last pair) is
  thinned to leave the critic its four steps of air.

Two songs are **reconstructions**: Ababa Hotel (4595298) and Utzp (4664492)
come from tabs a machine began and one person revised once, without saying
the drums were changed. They are written from those tabs' most common bars
and labelled so. Ababa Hotel: 7/8 at 122 (songbpm; the tab says 125), 8ths
on the ride, the snare on the third 8th and on the "and" of the last two, and
a passage with the kick on a quarter pulse across the bar. Utzp: 129 (the
tab; songbpm does not list it), four on the floor with the snare on every
"and", the kick going to pairs as the loop builds, the crash on the 8ths at
the top.

| Song                            | Record        | Tempo (quarter)                    | Meter | What defines it                                                  | Source of the bars                                      |
| ------------------------------- | ------------- | ---------------------------------- | ----- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| Sherpa                          | Vol. 1; KEXP  | 180 (three tabs)                   | 4/4   | four-bar kick cycle; dotted-quarter kick and snare for the build | Songsterr 5022558, 4372986 (human); 3886668 (revised)   |
| Sherpa (the triplet section)    | KEXP; Vol. 1  | 120 (two tabs), then 180           | 4/4-6 | kick and snare on the last triplet of each beat                  | Songsterr 5022558 (human)                               |
| Tohogd                          | Vol. 1        | 172 (tab)                          | 7/8   | loop-by-loop build; 4/4 over the 7/8                             | Songsterr 4039482 (drums redone by hand)                |
| Tamebsz                         | Vol. 1        | 125 (tab)                          | 4/4   | hats on the beat; snare pickup                                   | Songsterr 4046299 (drums corrected by hand; intro only) |
| Ababa Hotel                     | Vol. 1        | 122 (songbpm); 125 (tab)           | 7/8   | ride 8ths; snare on the third 8th and the "and" of the last two  | **reconstruction** from Songsterr 4595298               |
| Fabienk                         | Vol. II; KEXP | 128 (songbpm, two tabs)            | 7/8   | hat and snare in unison with the riff                            | Songsterr 4005903 (rewritten by hand), 4664952 (human)  |
| Fabienk (second part)           | Vol. II; KEXP | 128                                | 4/4   | four on the floor and 2 and 4 across the 14-beat loop            | Songsterr 4932418, 4413175 (human); MusicRadar          |
| Mata Zyklek                     | Vol. II; KEXP | 94 (songbpm, tab)                  | 5/8   | kick in pairs; snare on the second and fourth 8ths               | Songsterr 3886712 (rewritten by hand)                   |
| Sarniezz                        | Vol. II; KEXP | 116 dotted (songbpm, tabs), so 174 | 12/8  | snare on pulses 2 and 4; 3+3+2 unison                            | Songsterr 5245273, 4536298, 4887063, 4967459 (human)    |
| Sarniezz (after the modulation) | Vol. II; KEXP | 174 (tabs)                         | 4/4   | the 8th held, the pulse from three to two; crash on the beat     | as above                                                |
| Utzp                            | Vol. II       | 129 (tab)                          | 4/4   | four on the floor, the snare on every "and"                      | **reconstruction** from Songsterr 4664492               |
| Yor Zarad                       | Vol. II       | 214 to the 8th (tab), so 107       | 7/8   | accented 16th hats; kick doubles                                 | Songsterr 5353242 (human)                               |

**Left out.** Sahardnieh (songbpm 145), L'Aberek (124) and Angor (99): their
only drum tabs are machine-made or an "mp3" upload of unclear making (Angor's
says 197 in 3/4, twice songbpm's figure). Zugzegk (played on the Tonight
Show): a machine tab only. Sherpa's closing 3/4 section and Sarniezz's 6/4
bars, which would be further songs in meters of their own; the album
versions' differences from the KEXP set, since most tabs follow KEXP.

**Not modelled, found on the way, not changed.**

- **A 4/4 groove over a 7/8 loop longer than two bars.** Tohogd's 4/4 runs
  four bars of 7/8 before it comes round (56 16ths, seven bars of 4/4); a
  figure holds at most two bars, so the cycle is cut into two halves that
  each keep the quarter pulse across their own bar line. Fabienk's 14-beat
  cycle is played as plain 4/4, without its closing 2/4 bar.
- **Metric modulation inside a song.** A song has one meter and one tempo
  range, so Sherpa's 120 triplets into 180 and Sarniezz's 12/8 into 4/4 are
  two songs each; the shared note value, the point of the device, is in the
  feel line and the tempo, not played.
- **The loops themselves.** Klek locks to Khn's looper (MusicRadar: a Boss
  RC-600 clocking a DB-80 metronome); the model has no loop to lock to, so
  "tight to the loop" is only the small jitter.
- **Dense kicks.** Mata Zyklek's main riff and one bar of Yor Zarad have more
  kick and snare than the critic's air floor allows; the riff is left out and
  the Yor Zarad kick thinned. Three single-foot kicks in a row (Mata Zyklek)
  would need `heelToe`, which no source supports for Klek.
- **Snare rolls at 180.** Sherpa's 16th snare rolls are past `RUN_RATE` and
  fail the critic's four-in-a-row check.
- **Kit.** Not documented anywhere found (the record's open question stands);
  `teatowel` is chosen from the descriptions of its sound.

Sources: anginedepoitrine.bandcamp.com/album/vol-1 and /album/vol-ii (track
lists, credits, the _Vol. 1_ notes); en.wikipedia.org/wiki/Angine_de_Poitrine;
musicradar.com/artists/in-actual-fact-its-pure-maths-just-what-are-angine-de-poitrine-actually-doing-musically-we-dissect-their-biggest-track
(Fabienk); kexp.org/read/2026/3/25/angine-de-poitrine-kexp-session-feature
(the session's date); songbpm.com/@angine-de-poitrine (Fabienk, Mata Zyklek,
Sarniezz, Ababa Hotel, Sahardnieh, L'Aberek, Angor); Songsterr,
songsterr.com/a/wsa/angine-de-poitrine-tabs-a524708?inst=drum, tabs 5022558,
4372986, 3886668, 4039482, 4046299, 4595298, 4005903, 4664952, 4932418,
4413175, 3886712, 3922271, 5245273, 4549576, 4536298, 4887063, 4967459,
4664492, 5353242, 4664503 (each read through songsterr.com/api/meta/{id} and
its revisions).

## X. Phil Collins (2026-10-14)

The `collins` style plays **songs** the way `baker` does (T): each New picks
one of his records, and its tempo, meter and grooves come with it. His record
(`drummer-model/drummers/phil-collins.json`) is new in 11-g, written from this
section.

**Which records are his.** Credits checked on Wikipedia. He joined Genesis on
8 August 1970 and plays every drum part on its records from _Nursery Cryme_;
from _A Trick of the Tail_ (1976) he is the singer too, and on tour Bill
Bruford (1976) and then Chester Thompson drummed while he sang, but the
studio drums are his. In Brand X he plays on _Unorthodox Behaviour_ (1976),
_Moroccan Roll_ (1977), _Livestock_ and part of _Product_ (1979), which he
shares with Mike Clark; "...And So to F..." is his tune and his drums. On
Peter Gabriel's third album he drums on "Intruder". On Philip Bailey's "Easy
Lover" (1984) he sings, drums and produces. On his own records, In the Air
Tonight's verses are a **Roland CR-78** ("the Disco-2 pattern, plus some
programming", Wikipedia); the drums after the break are his kit.

**How he played.** Wikipedia: rudiments under Lloyd Ryan and then Frank King;
Ringo Starr and Roger Powell of the Action (who brought him Motown and Stax)
first; Buddy Rich's view of the hi-hat "prompted him to stop using a second
bass drum and start using the hi-hat"; among the drummers he names are Billy
Cobham, Tony Williams, Elvin Jones, Ginger Baker, Bonham, Keith Moon, Charlie
Watts, Airto Moreira and Sonny Payne. His kits have always been set up
left-handed (DrumSpy, via a search summary). The gated sound began on
Gabriel's "Intruder": Gabriel had him play without cymbals, and Hugh Padgham
and Steve Lillywhite opened the overhead talkback mic, "heavily compressed as
well as using a gate" (Wikipedia, Gated reverb); Collins and Padgham used it on
_Face Value_. On odd meters, of "...And So to F...", which is in nine: "I'm fine
with seven because seven's an easy one, yet apart from that, I've never been
able to just flow in and out of odd times"; he sang Percy Jones's bass line to
get through it ("If I deviate from that, I'd be sunk"; Far Out, via a search
summary, the page refused the fetch). Turn It On Again: Rutherford had the
riff slower, "And Phil said ... 'Do you realize it is in 13/8?'"; its verse
and chorus alternate 6/4 and 7/4 (Wikipedia). Squonk "was designed to
resemble Led Zeppelin's 'Kashmir'", and Los Endos's rhythm came from Brand X
and Santana's "Promise of a Fisherman" (Wikipedia, A Trick of the Tail). Of
the In the Air Tonight break, Collins: "There's no kick in between the last
two tom hits" (quoted by Drumeo).

**What the style encodes.** No new field. The gated songs (Intruder, In the
Air Tonight, I Don't Care Anymore) write no cymbal and turn the phrase's crash
off (`phraseMark.crash: false`); their backbeat is a rimshot. His fill is the
In the Air Tonight break: two toms struck together and a kick, in threes
down the kit, then the floor tom and the kick in turn (`fills`, weighted
highest, and `fillsGrow`). Two other fills are his concert-tom habit (two toms
together in eighths, the kick between) and Easy Lover's flams between the rack
toms (`flam` 0.2). `ghostBias` 0.3 for Brand X's ghosted sixteenths, off in
the gated songs. Kits: `bigRoom` (Big Rusty in a big room) for the 1980s;
`drs` for 1970s Genesis; `osdk`, with its wide dynamic range, for Brand X's
ghost notes; `bigrusty` for Squonk.

**In the Air Tonight** is a song in two sections. A is the verse, the CR-78
alone: its hats (open on 1 and 4, closed on the "and"s) on the hat lane and
its conga on the `conga` slot, which takes no hand; the phrase always ends on
the break (`fillChance: 1`), with no crash or kick to mark it. B is the drums:
the tab's kit track (a kick, a rimshot on 2 and 4, a ghost before and after)
under the machine's hats. The kit is the sampled `bigRoom` throughout, so it is
not on `drummer-kits.test.ts`'s list: the machine's part is written on sampled
hats and a conga rather than a CR-78.

**Grids.** Nine songs follow human Songsterr transcriptions (each tab's
`aiGenerated` flag checked through the meta API), read bar by bar with the
most common bars kept; four follow Drumeo's published notation, and Supper's
Ready takes a bar from each. Where a tab's length can be checked against the
record at its marked tempo, it matches (In the Air Tonight 323 s at 95 against
334; I Missed Again 224 against 221; I Don't Care Anymore 300 against 302;
Squonk 391 against 387; Intruder 291 against 294).

| Song                               | Year | Tempo (quarter)                                            | Meter     | What defines it                                                             | Source of the bars                     |
| ---------------------------------- | ---- | ---------------------------------------------------------- | --------- | --------------------------------------------------------------------------- | -------------------------------------- |
| In the Air Tonight                 | 1981 | 95 (tab, Drumeo); 96 (Wikipedia)                           | 4/4       | CR-78 verse; the break; kick and rimshot, no cymbal of his own              | Songsterr 50420 (human); Drumeo (fill) |
| Intruder (Peter Gabriel)           | 1980 | 94 (tab; length matches); songbpm 105                      | 4/4       | no cymbals at all: kick and gated snare                                     | Songsterr 1070567 (human)              |
| I Missed Again                     | 1981 | 108 (tab; length matches)                                  | 4/4       | hats open on the "and"s of 1 and 4                                          | Songsterr 1061008 (human)              |
| I Don't Care Anymore               | 1982 | 140 (tab; length matches)                                  | 4/4       | a two-bar tom ostinato in eighths for a cymbal                              | Songsterr 669676 (human, early)        |
| Easy Lover (Philip Bailey)         | 1984 | 132 (tab); 129 (songbpm, Drumeo)                           | 4/4       | straight eighths, kick on the "and"s of 2 and 4                             | Songsterr 33578 (human)                |
| Turn It On Again                   | 1980 | 126–128 (tab); 128 (songbpm)                               | 6/4 + 7/4 | a rock beat run across a bar of 6/4 and one of 7/4                          | Songsterr 36367 (human)                |
| Behind the Lines                   | 1980 | 164 (Drumeo, songbpm)                                      | 4/4       | the ride's bell on the beats, the hat between                               | Drumeo                                 |
| Squonk                             | 1976 | 86 (tab, songbpm; length matches)                          | 4/4       | slow and heavy, snare accented                                              | Songsterr 36370 (human)                |
| Dance on a Volcano                 | 1976 | 110–123 (tab); 114 (songbpm)                               | 7/8       | kick and hat foot on every eighth; ride; the bell over a busy snare         | Songsterr 36377 (human)                |
| The Cinema Show                    | 1973 | 119 (Drumeo: eighth = 238); 134 (songbpm)                  | 7/8       | hat opened on 1, 3 and after 6, closed by the foot                          | Drumeo                                 |
| Supper's Ready (Apocalypse in 9/8) | 1972 | 94 (Drumeo: eighth = 188)                                  | 9/8       | 2+2+2+2+1, a flam, the kick running into the bar line                       | Drumeo; Songsterr 61645 (human)        |
| ...And So to F... (Brand X)        | 1979 | 156 (tab); played at 140–150                               | 9/8       | the ride in eighths, the kick on the bass line                              | Songsterr 1477092 (human)              |
| Nuclear Burn (Brand X)             | 1976 | 153 (Drumeo: eighth = 306); songbpm 173; played at 140–150 | 11/8      | a bar of 4/4 in ghosted sixteenths, then two threes, hat closed by the foot | Drumeo                                 |

- **The In the Air Tonight break** follows Drumeo, not the tab: the tab puts
  a kick between the last two tom hits, which Collins says is the usual
  mistake. Drumeo's two noteheads together are written as two toms at once:
  rack toms for the first three groups, rack and floor for the fourth, then
  the floor tom alone.
- **Turn It On Again** is written in the tab as one bar of 13/4: the rock beat
  carried across twelve beats and one more. It is the 6/4 and 7/4 the record
  plays, so it is two one-bar sections in turn (`arrangement: A B A B`), with
  a fill on one bar in five and a crash on one in four.
- **Behind the Lines**: Drumeo's first bar. Its second ends in sixteenths of
  bell and ghosted snare, which at 164 is faster than the run rule allows.
- **The Cinema Show** leaves out Drumeo's ghosts on 9 and 12, so four steps of
  the 7/8 bar stay clear of kick and snare, as the critic asks; with them the
  bar had two, and a variation's added kick took one more.
- **...And So to F...** keeps the tab's 9/8 bars with air in them. Its densest
  bars, the ride and kick together on the bass line and the snare in every gap
  between, run the snare four sixteenths at a time and leave no quarter of the
  bar clear: the critic refuses both, so they are not here. The tab marks 156;
  sixteenths without a gap stop at 150 here, so the song opens a little under
  the record, as does Nuclear Burn.

**Left out.** "Watcher of the Skies" (Drumeo, 6/4 at 120): the snare and hat in
unison, "four consecutive one-handed strokes" on the snare, which the critic
calls a run, and too little air; it was written and taken out. "Los Endos":
its main theme is sixteenths at 170–180, past the run rule. "Firth of Fifth":
a bar of 13/16, which no meter here holds. "Abacab" (Songsterr 36360): its
bars sit an eighth late against the record's backbeat, so the barring is in
doubt. Every Brand X tab on Songsterr but "...And So to F..." is
machine-made ("Nuclear Burn"'s drum track is "regenerated"); Moroccan Roll's
tracks have none. "Second Home by the Sea" (Simmons SDS-V) and "Mama" and
"Sussudio" (drum machines) would need a synthesised kit.

**Found on the way, not changed.**

- He plays a left-handed kit. The 3D drummer plays every kit right-handed; the
  record says left-handed and nothing else does.
- Gated reverb is not a kit parameter: `room` is a send, not a gate.
  `bigRoom` is the nearest sampled kit.
- In the Air Tonight's CR-78 has a third voice (the tab's MIDI note 27, an
  eighth-note part with an accent on 2 every other bar) that could not be
  identified, so it is not written.
- Drumeo's Cinema Show bar has two ghosts as 32nds at the end of its second
  group; the grid holds one.
- The 11/8 meter groups 3+3+3+2, and Nuclear Burn is 2+2+2+2+3; the steps are
  the same, only the beaming differs.

Sources: Wikipedia — [Phil Collins](https://en.wikipedia.org/wiki/Phil_Collins),
[In the Air Tonight](https://en.wikipedia.org/wiki/In_the_Air_Tonight),
[Gated reverb](https://en.wikipedia.org/wiki/Gated_reverb),
[Turn It On Again](https://en.wikipedia.org/wiki/Turn_It_On_Again),
[A Trick of the Tail](https://en.wikipedia.org/wiki/A_Trick_of_the_Tail),
[Unorthodox Behaviour](https://en.wikipedia.org/wiki/Unorthodox_Behaviour),
[Product](<https://en.wikipedia.org/wiki/Product_(Brand_X_album)>);
[Drumeo, The 12 Most Iconic Phil Collins Drum Parts](https://www.drumeo.com/beat/iconic-phil-collins-drum-parts/)
(notation read from its SVGs);
[Far Out, And So to F](https://faroutmagazine.co.uk/the-one-song-phil-collins-struggled-to-play-right) (via search summary);
[DrumSpy, left-handed drummers](https://drumspy.com/?p=15769) (via search summary);
Songsterr tabs 50420, 1070567, 1061008, 669676, 33578, 36367, 36370, 36377,
61645, 1477092 (`https://www.songsterr.com/api/meta/<id>` for the
`aiGenerated` flag); [songbpm.com](https://songbpm.com/@genesis) (Genesis,
Phil Collins, Brand X, Peter Gabriel, Philip Bailey).

## Y. Billy Cobham (2026-10-14)

The `cobham` style plays **songs**, as `collins` does (X). His record
(`drummer-model/drummers/billy-cobham.json`) is new in 11-g; until now he was a
stub named by Yussef Dayes's record, and keeps the id it gave him,
`drummer:billy-cobham`.

**Which records are his.** Credits checked on Wikipedia. Spectrum (recorded
14-16 May 1973): he plays on every track but "To the Women in My Life", a solo
piano piece by Jan Hammer; Tommy Bolin and Lee Sklar are on Quadrant 4,
Stratus and Red Baron, Ron Carter on Spectrum. The Mahavishnu Orchestra's _The
Inner Mounting Flame_ (1971) and _Birds of Fire_ (1973) are his; its
"Visions of the Emerald Beyond" (1975, with "Be Happy") is Narada Michael
Walden's, so not used. Miles Davis: _A Tribute to Jack Johnson_, _Big Fun_,
_Live-Evil_, _Get Up with It_. George Benson's _White Rabbit_ (CTI, November
1971). **The Headhunters:** no source found credits him with Herbie Hancock's
Headhunters, whose drummers were Harvey Mason and then Mike Clark; Wikipedia's
article names no connection, and a search turned up none. He played with
Hancock elsewhere, and with George Duke, Stanley Clarke and many others; the
record notes the Headhunters claim as a likely misconception.

**How he played.** Wikipedia: born in Colón, Panama, 16 May 1944; drums from
four, with his father (a weekend pianist) from eight; his first kit at fifteen
on getting into the High School of Music & Art; a US Army band 1965-68; Horace
Silver; a house drummer for Atlantic. "Cobham plays his drums using the
open-handed technique." His mid-1970s kit: "two Fibes bass drums, a custom
Duffy snare, two flared-shell rack toms ... four Fibes rack toms, two Fibes
floor toms ... a hi-hat, five Zildjian cymbals, and one hanging 36-inch gong."
He cites Buddy Rich, Jo Jones and Louie Bellson, and Tony Williams, Elvin
Jones, Jimmy Cobb, Roy Haynes, Max Roach and Art Blakey. Phil Collins: "Billy
Cobham played some of the finest drumming I've ever heard on that record" (The
Inner Mounting Flame). Todd Bishop (cruiseshipdrummer.com, 2020): "snare
drummy", "the first major player to play the drums open handed"; fills of "a
lot of singles, and a lot of open rolls with accented singles"; the bass drum
"in normal funk ways, and for accents, and ostinatos, often tied to the
cymbals"; "an energy sound, not a deep 'power' sound"; a snare "tuned rather
high, with the snares highly tensioned"; and the china "mounted upside down",
which "was widely copied". A search summary credits Quadrant 4 with a
"double bass drum shuffle" (from the description of Bergamini's Hudson Music
book of transcriptions, which was not read).

**What the style encodes.** `doubleKick` (two bass drums, every song); the
`police` kit (the DRS kit with its snare raised: Bishop's tight, high snare);
`hats: 16` and, for Stratus, `oneHandHats` (sixteenths on the hat with one
hand, the other on the snare, which is what open-handed allows);
`anticipate` 0.2 with `anticipateCymbal: 3`, so an anticipated "and" of 4
lands on the china; `midFills` 0.35 and `fillsGrow` (he fills often, in
singles round the kit); a feel a hair on top (Bishop's "energy sound",
inferred). The test's list of china players gains him.

**Grids.** Six songs follow human Songsterr tabs (each tab's `aiGenerated`
flag checked), read bar by bar with the most common bars kept; White Rabbit
follows Todd Bishop's transcription.

| Song                   | Year | Tempo (quarter)                                 | Meter          | What defines it                                                 | Source of the bars          |
| ---------------------- | ---- | ----------------------------------------------- | -------------- | --------------------------------------------------------------- | --------------------------- |
| Stratus                | 1973 | 90 (tab); 86 (songbpm)                          | 4/4            | one-handed sixteenths; snare on 2, the "e" of 3 and 4           | Songsterr 64400 (human)     |
| Red Baron              | 1973 | 88 (tab); 89 (songbpm)                          | 4/4            | eighths; the same snare; the kick on the "a" of 1               | Songsterr 791843 (human)    |
| Quadrant 4             | 1973 | 240 (tab); 242 (songbpm)                        | 4/4 in eighths | both bass drums on every eighth, swung, under a jazz ride       | Songsterr 519969 (human)    |
| Spectrum               | 1973 | 110 (tab); songbpm 125                          | 7/8            | hat opening on the "and"s of 1 and 3, snare between the kicks   | Songsterr 1324254 (human)   |
| Meeting of the Spirits | 1971 | 176–186 (tab)                                   | 6/4            | ride and hat foot, one snare a bar                              | Songsterr 13040 (human)     |
| Birds of Fire          | 1973 | 98 (tab); songbpm 109                           | 9/8            | ride and hat foot in eighths, snare in pairs, kick off the beat | Songsterr 42451 (human)     |
| White Rabbit (Benson)  | 1971 | 111 (songbpm; not confirmed by a second source) | 4/4            | a funk beat, then the ride's bell                               | Todd Bishop's transcription |

- **Quadrant 4** is written in the tab in triplets: the ride's spang-a-lang,
  the snare on 2 and 4 with a ghost on the middle triplet of 1 and 3, and the
  kick on every beat and its last triplet. Sextuplet 4/4 stops at 190 here, and
  12/8 would put its dotted quarter at 240, a slider of 360, past 300; so it is
  4/4 in eighths, swung to a triplet (`swing` 90–100), where the last triplet is
  the swung "and". The two ghosts on the middle triplet have no step and are
  left out. With two bass drums the kick is on every eighth.
- **Spectrum**: the tab's bar, not Bishop's. Bishop's has a sixteenth triplet
  on the last eighth (LRL, the last note lightly accented) and leaves one step
  of the fourteen clear of kick and snare, which the critic calls airless; the
  tab's leaves four. Its 32nds on 6 are left out.
- **White Rabbit**: Bishop's funk beat and two of his three bell bars. The third
  leaves two steps clear of kick and snare. His first phase, the flamenco beat,
  puts a sixteenth triplet and two sixteenths in one beat, which no grid here
  holds.
- **Stratus**'s section E puts crashes on the bass line with both feet under
  them; it is a light third figure.

**Left out.** "Vital Transformation" (Songsterr 12855, human, 9/8): linear
sixteenths with kick or snare on every step but one, which the critic refuses
as airless; it is the song that most shows how he played, and it waits on a
rule for linear grooves. "Dance of Maya" (420191): its drum track is not in
General MIDI notes, and its 20/8 has no meter here. "Lila's Dance" (20/8 and
14/8), "Faith" (10/8, and its credit is not checked), "Miles Beyond" and
"Awakening" (bars too sparse to read). "Crosswinds", "Panhandler", "Sorcery"
and "Do What You Wanna" are machine-made. "The Dancer" (Stanley Clarke, Bishop's
transcription): a reader says it may be Steve Gadd or Gerry Brown. Right Off
(Jack Johnson), The Noonward Race, One Word and Taurian Matador have no free
transcription found.

**Found on the way, not changed.**

- The critic's air rule (a quarter of the bar clear of kick and snare) refuses
  the linear sixteenths that are much of his Mahavishnu playing, ghosts
  included: a ghost counts as a note. Vital Transformation and Bishop's
  Spectrum bar are the cases.
- Open-handed is a record field only: the 3D drummer crosses its hands for the
  hat as it does for everyone.
- There is no sextuplet meter above 190, so a fast triplet shuffle has to be
  swung eighths, which loses the middle triplet.
- The china is the crash lane's value 3; there is no second china or gong.

Sources: Wikipedia — [Billy Cobham](https://en.wikipedia.org/wiki/Billy_Cobham),
[Spectrum](<https://en.wikipedia.org/wiki/Spectrum_(Billy_Cobham_album)>),
[White Rabbit (George Benson album)](<https://en.wikipedia.org/wiki/White_Rabbit_(George_Benson_album)>) (via search summary);
Todd Bishop — [Let's talk about Billy Cobham](https://cruiseshipdrummer.com/2020/09/02/lets-talk-about-billy-cobham/),
[White Rabbit](https://cruiseshipdrummer.com/2023/01/24/groove-o-the-day-billy-cobham-white-rabbit/),
[in 7/8](https://cruiseshipdrummer.com/2012/06/14/groove-o-the-day-billy-cobham-in-7-8/);
[Hudson Music, COBHAM](https://hudsonmusic.com/product/cobham) (via search summary);
Songsterr tabs 64400, 791843, 519969, 1324254, 13040, 42451;
[songbpm.com](https://songbpm.com/@billy-cobham).

## Z. Lenny White (2026-10-14)

The `lennywhite` style plays **songs**, as `collins` does (X). His record
(`drummer-model/drummers/lenny-white.json`) is new in 11-g. He has only three
songs: of all the drummers here, he is the one whose records have the fewest
free transcriptions, and none was written without one.

**Which records are his.** Credits checked on Wikipedia. Born Leonard White
III, 19 December 1949, in Queens; self-taught; his first gig was with Jackie
McLean, who recommended him for Miles Davis's _Bitches Brew_ (1969, with Jack
DeJohnette and Don Alias also drumming); then Freddie Hubbard's _Red Clay_
(1970). Return to Forever's drummers: Airto Moreira (1972-73), Steve Gadd
(1973), Lenny White (1973-76 and the reunions), Gerry Brown (1977). "Gadd was
unwilling to tour with the band ... Lenny White ... replaced Gadd and Lewis"
(Wikipedia, Return to Forever). He is the only drummer on _Romantic Warrior_
(February 1976), whose "Sorceress" is his tune. On Al Di Meola's _Land of the
Midnight Sun_ he drums on the title track only (Steve Gadd on "The Wizard",
Alphonse Mouzon on the suite). On _Elegant Gypsy_ Wikipedia gives him "Midnight
Tango" and "Race with Devil on Spanish Highway"; the only tabs found contradict
that (one's drum track is named Steve Gadd; the other is "Race with Devil on
_Turkish_ Highway", a later record), so neither is used. Twennynine (1979-81)
is his own band.

**How he played.** Modern Drummer's preview of Marc Atkinson's transcription
of "The Magician": "he plays openhanded, utilizing his left hand on the hi-hat
and right hand on the snare, and even riding with his left hand", with "many
grooves and fills leading with the left". Todd Bishop, hearing him live in
2019: cymbals reversed on a right-handed kit (the ride on the left); "his
denser playing was economical and non-technical ... lots of singles and
doubles"; "tune oriented", with "big accompanying statements that were not
always on the same grid as the primary groove"; "Tony's playing in the 60s was
clearly a formative influence". Bishop on Red Clay: "really on the front of
the beat", measured at 64-70 bpm, the vamp's second bar a little faster, and a
double-time feel under the saxophone solo at the same tempo.

**What the style encodes.** `oneHandHats` (open-handed: the sixteenths in the
left hand, the right free for the snare); a feel on the front of the beat (the
kick, snare, hat and ride all a fiftieth of a sixteenth early); a cross-rhythm
(`crossRhythm` 0.25: an accent on snare and kick every six sixteenths across
the last two bars) for the statements off the grid; `midFills` 0.3. The kit is
`muldjord`, a real kit recorded properly; nothing found describes his 1970s
sound closely enough to tune one to it.

| Song                              | Year | Tempo (quarter)          | Meter     | What defines it                                              | Source of the bars        |
| --------------------------------- | ---- | ------------------------ | --------- | ------------------------------------------------------------ | ------------------------- |
| Duel of the Jester and the Tyrant | 1976 | 150–160 (tab)            | 4/4 + 7/8 | heavy half-time, snare on 3; unison eighths; 7/8 on the ride | Songsterr 914514 (human)  |
| Land of the Midnight Sun          | 1976 | 120 (tab); 119 (songbpm) | 4/4       | sixteenths on the hat in one hand, the snare in pairs        | Songsterr 414449 (human)  |
| Morning Sunrise (Twennynine)      | 1979 | 71 (tab, songbpm)        | 7/4 + 4/4 | a cross-stick in the 7/4 opening; slow eighths in the verse  | Songsterr 3084901 (human) |

- **Duel** is two sections: A the half-time theme (the tab's most common bars,
  with the band's unison of eighth-note kicks under a crash); B its 7/8, on
  the ride, and its fill (three on the snare, then the rack and mid toms in
  eighths). A's fills are in eighths, because sixteenths without a gap stop at
  150 and the song runs to 160.
- **Morning Sunrise** opens in 7/4 in the tab, so A is the 7/4 and B the
  verse.

**Left out.** "Medieval Overture" (Songsterr 515705, human): 3/4 at 240 in
the tab, past 3/4's 190 here; the bars are eighths and the bell, and could be
written if the tempo is checked. "The Musician" (RTF, 2019): its drum track is
"regenerated". "Hymn of the Seventh Galaxy", "Majestic Dance", "The Magician",
"Vulcan Worlds", "After the Cosmic Rain", "Captain Señor Mouse", "Red Clay",
"Best of Friends", "Butter", "Tropical Nights", "Sweet Dreamer": machine-made
tabs. "Sorceress", "Dayride", "No Mystery", "Spanish Key": no tab at all.
"Invitation" (Joe Henderson, Bishop's transcription): the image and PDF are
gone. "Miles Runs the Voodoo Down" has three drummers and its groove is Don
Alias's.

**Found on the way, not changed.**

- Open-handed is a record field; the 3D drummer crosses for the hat as for
  everyone, and plays the ride with the right hand where he used his left.
- No sixteenth meter in 3/4 goes past 190, so a fast 3/4 in eighths has no
  grid (there is a `4/4-8` but no `3/4-8`).

Sources: Wikipedia — [Lenny White](https://en.wikipedia.org/wiki/Lenny_White),
[Return to Forever](https://en.wikipedia.org/wiki/Return_to_Forever),
[Romantic Warrior](https://en.wikipedia.org/wiki/Romantic_Warrior),
[Land of the Midnight Sun](<https://en.wikipedia.org/wiki/Land_of_the_Midnight_Sun_(album)>),
[Elegant Gypsy](https://en.wikipedia.org/wiki/Elegant_Gypsy);
Todd Bishop — [Notes on a Lenny White performance](https://cruiseshipdrummer.com/2019/09/12/notes-on-a-lenny-white-performance/),
[Red Clay](https://cruiseshipdrummer.com/2014/03/28/groove-o-the-day-lenny-white-red-clay/);
[Modern Drummer, The Magician (preview)](https://www.moderndrummer.com/article/the-magician-transcription-by-marc-atkinson/);
Songsterr tabs 914514, 414449, 3084901; [songbpm.com](https://songbpm.com/@al-di-meola).

## Sources

- https://acoustics.org/pressroom/httpdocs/137th/friberg.html
- https://mcg.uva.nl/mcg-2023/papers/honing-haas-2008.pdf
- https://www.ismir2015.uma.es/articles/143_Paper.pdf
- https://en.wikipedia.org/wiki/Kenny_Clarke
- https://www.moderndrummer.com/2007/10/max-roach/
- https://www.moderndrummer.com/2009/12/art-blakey/
- https://scottkfish.com/2019/09/30/in-love-with-art-blakeys-minimalist-drumming/
- https://www.learnjazzstandards.com/blog/learning-jazz/drums/how-to-comp-on-the-drums-like-elvin-jones/
- https://www.learnjazzstandards.com/blog/what-is-jazz-comping/
- https://www.moderndrummer.com/article/the-charleston/
- https://www.moderndrummer.com/2015/03/video-lesson-jazz-drummers-workshop-elvin-jones-style-triplet-fills-part-1/
- https://www.moderndrummer.com/article/january-1983-studies-style-part-ii-tony-williams/
- https://pas.org/?p=29211
- https://percussion.byu.edu/brushes
- https://paulwertico.com/articles/brushbasics.php
- https://cruiseshipdrummer.com/bembe
- https://pas.org/warren-baby-dodds/
- https://traditional-jazz.com/history/drummers/baby-dodds
- https://pas.org/jo-jones/
- https://www.soundbrenner.com/blogs/articles/purdie-shuffle
- https://reverb.com/news/video-matt-sorum-texas-shuffle-drum-lesson
- https://en.wikipedia.org/wiki/Pride_and_Joy_(Stevie_Ray_Vaughan_song)
- https://www.songfacts.com/articles/3-deep-grooves-to-celebrate-zz-top-drummer-frank-beard/
- https://en.wikipedia.org/wiki/Mitch_Mitchell
- https://www.npr.org/2008/11/14/96978286/hendrix-drummer-mitch-mitchell-remembered
- https://popmatters.com/65736-mitch-mitchell-the-perfect-engine-2496102532.html
- https://www.loudersound.com/features/six-songs-mitch-mitchell
- https://www.bonhams.com/auction/22818/lot/114/mitch-mitchellthe-jimi-hendrix-experience-a-ludwig-part-drum-kit-1960s
- https://en.wikipedia.org/wiki/Manic_Depression_(song)
- https://en.wikipedia.org/wiki/Third_Stone_from_the_Sun
- https://en.wikipedia.org/wiki/Up_from_the_Skies
- https://songbpm.com/@jimi-hendrix
- https://www.musicradar.com/news/ginger-baker-drummer
- https://articles.roland.com/behind-the-beat-funky-drummer-by-james-brown/
- https://hudsonmusic.com/wp-content/uploads/Stewart-Copeland-Sample.pdf
- https://www.drumeo.com/beat/stewart-copeland-drum-genius/
- https://www.bonedo.de/?p=250858
- https://www.muzines.co.uk/articles/stewart-copeland/11996
- https://revuemusicaleoicrm.org/vol12-n2/microtiming-tempo-variability-rock-drummers/
- https://www.onlinedrummer.com/blogs/drum-lessons/drum-technique-in-a-bottle
- https://www.songsterr.com/a/wsa/the-police-tabs-a194?inst=drum
- https://songbpm.com/@the-police
- https://www.drum-hub.com/blog/2023/7/19/use-paradiddles-to-create-grooves-like-yussef-dayes-the-cinematic-orchestra-amp-tower-of-power-
- https://www.drum-hub.com/blog/2020/2/10/yussef-kamaal-strings-of-light-beat-breakdown
- https://www.songsterr.com/a/wsa/yussef-dayes-ft-rocco-palladino-tioga-pass-drum-tab-s884502
- https://www.songsterr.com/a/wsa/tom-misch-yussef-dayes-lift-off-drum-tab-s6965167
- https://www.songsterr.com/a/wsa/yussef-dayes-jamaican-links-drum-tab-s1273078
- https://songbpm.com/@yussef-dayes
- https://drummerszone.com/artists/profile/15367/yussef-dayes
- https://www.drum-hub.com/blog/2023/10/20/i-learnt-1-drum-beat-from-every-song-on-yussef-dayes-black-classical-music-amp-you-can-too
- https://www.drum-hub.com/blog/2022/3/15/yussef-dayes-love-is-the-message-beat-breakdown
- https://www.drum-hub.com/blog/2020/4/3/tom-misch-amp-yussef-dayes-what-kinda-music-drum-cover-with-notation
- https://www.drum-hub.com/blog/2023/8/16/improve-bass-drum-speed-with-grooves-from-mark-guiliana-yussef-dayes-amp-kublai-khan-tx-1
- https://en.wikipedia.org/wiki/My_Favorite_Things_(John_Coltrane_album)
- https://en.wikipedia.org/wiki/A_Love_Supreme
- https://en.wikipedia.org/wiki/Impressions_(John_Coltrane_album)
- https://en.wikipedia.org/wiki/Crescent_(John_Coltrane_album)
- https://en.wikipedia.org/wiki/Live_at_Birdland_(John_Coltrane_album)
- https://en.wikipedia.org/wiki/Live!_at_the_Village_Vanguard
- https://en.wikipedia.org/wiki/Speak_No_Evil_(Wayne_Shorter_album)
- https://en.wikipedia.org/wiki/JuJu_(Wayne_Shorter_album)
- https://en.wikipedia.org/wiki/The_Real_McCoy_(McCoy_Tyner_album)
- https://en.wikipedia.org/wiki/Unity_(Larry_Young_album)
- https://en.wikipedia.org/wiki/A_Night_at_the_Village_Vanguard
- https://en.wikipedia.org/wiki/Afro_Blue
- https://en.wikipedia.org/wiki/Very_R.A.R.E.
- https://mion.music/en/records/artists/the-elvin-jones-jazz-machine/albums/the-elvin-jones-jazz-machine-live-in-japan-1978
- https://jazzomat.hfm-weimar.de/dbformat/dbcontent.html
- https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo216.html
- https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo224.html
- https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo227.html
- https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo433.html
- https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo435.html
- https://www.allsolos.com/album/53/my-favorite-things
- https://www.allsolos.com/album/67/a-love-supreme
- https://www.allsolos.com/album/86/impressions
- https://www.allsolos.com/album/87/coltrane-live-at-the-village-vanguard
- https://www.allsolos.com/album/102/speak-no-evil
- https://www.allsolos.com/album/145/juju
- https://www.allsolos.com/solo/1365/elvin-jones-drums-solo-on-a-love-supreme-part-3-pursuance
- https://songbpm.com/@john-coltrane
- https://shipdrummer.blogspot.com/2020/12/transcription-elvin-jones-chasin-trane.html
- http://www.pdxdrummer.com/downloads/lessons_downloads/transcriptions/pdxdrummer.com_transcription_elvin-jones_chasin-the-trane_01.pdf
- https://shipdrummer.blogspot.com/2012/06/transcription-elvin-jones-your-lady.html
- https://shipdrummer.blogspot.com/2012/03/groove-o-day-elvin-afro-waltz.html
- https://shipdrummer.blogspot.com/2012/04/developing-elvins-afro-waltz.html
- https://shipdrummer.blogspot.com/2022/12/page-o-coordination-juju.html
- http://www.pdxdrummer.com/downloads/lessons_downloads/drumset/pdxdrummer.com_poc-juju.pdf
- https://shipdrummer.blogspot.com/2015/07/assembling-basic-elvin-jones-style-waltz.html
- https://shipdrummer.blogspot.com/2024/04/groove-o-day-two-by-elvin-jones.html
- https://shipdrummer.blogspot.com/2014/07/groove-o-day-elvin-afro-6.html
- https://shipdrummer.blogspot.com/2015/01/how-can-i-understand-elvin-jones.html
- https://shipdrummer.blogspot.com/2017/05/key-players-elvin-jones.html
- https://www.learnjazzstandards.com/blog/learning-jazz/drums/trading-fours-like-elvin-jones-style-and-analysis/
- https://ethanhein.substack.com/p/my-favorite-things
- https://en.wikipedia.org/wiki/Oye_C%C3%B3mo_Va
- https://en.wikipedia.org/wiki/Dance_Mania_(album)
- https://en.wikipedia.org/wiki/Timbales
- https://en.wikipedia.org/wiki/Tumbao
- https://en.wikipedia.org/wiki/Mambo_Birdland
- https://api.discogs.com/masters/306080
- https://api.discogs.com/releases/568361
- https://pas.org/?p=7879
- https://www.jazz.com/encyclopedia/puente-tito-ernesto-antonio-jr
- https://www.mycongaplace.com/forum/eng/viewtopic.php?p=3237
- https://www.FunkyDrummer.com/funk-store-products/tito-puente-drumming-with-the-mambo-king
- https://craftrecordings.com/blogs/news/tito-puente-para-los-rumberos
- https://www.lyreka.com/album/tito-puente-cuban-carnival
- https://theaudiobeat.com/music/tito_puente_mambo_diablo_lp.htm
- https://breezewiki.discard.no/muppet/wiki/Ran-Kan-Kan
- https://songbpm.com/@tito-puente
- https://songbpm.com/@tito-puente/oye-como-va
- https://songbpm.com/@tito-puente/ran-kan-kan
- https://songbpm.com/@tito-puente/el-cayuco
- https://songbpm.com/@tito-puente/complicacion
- https://songbpm.com/@tito-puente/babarabatiri
- https://songbpm.com/@tito-puente/picadillo
- https://songbpm.com/@tito-puente/mambo-gozon
- https://songbpm.com/@tito-puente/hong-kong-mambo
- https://songbpm.com/@tito-puente/para-los-rumberos
- https://songbpm.com/@tito-puente/mambo-diablo
- https://songbpm.com/@tito-puente/el-rey-del-timbal
- https://www.songsterr.com/api/songs?pattern=tito%20puente
- https://en.wikipedia.org/wiki/Changuito
- https://en.wikipedia.org/wiki/Songo_music
- https://en.wikipedia.org/wiki/Los_Van_Van
- https://en.wikipedia.org/wiki/Sandunguera
- https://upload.wikimedia.org/wikipedia/en/c/c2/Two_cowbells.png
- https://www.timba.com/artists/6?lang=en-US
- https://www.timba.com/artist_pages/1969-los-van-van-the-first-eps
- https://www.timba.com/artist_pages/1970-1974-the-singles
- https://www.timba.com/artist_pages/1975-1979
- https://www.timba.com/artist_pages/the-1980s
- https://www.timba.com/encyclopedia_pages/changuito
- https://www.timba.com/encyclopedia_pages/the-songo-enigma
- https://www.timba.com/encyclopedia_pages/los-van-van-s-first-album
- https://www.timba.com/encyclopedia_pages/los-van-van-the-singles
- https://www.timba.com/encyclopedia_pages/another-lost-classic
- https://www.timba.com/encyclopedia_pages/into-the-eye-of-the-storm
- https://www.timba.com/encyclopedia_pages/transition-to-tr-nsito
- https://www.timba.com/encyclopedia_pages/the-album-los-van-van
- https://www.timba.com/encyclopedia_pages/chang
- https://www.timba.com/encyclopedia_pages/llegu-llegu
- https://www.timba.com/encyclopedia_pages/two-styles-of-kick-drum-playing
- https://www.timba.com/encyclopedia_pages/los-van-van-volume-iv
- https://www.timba.com/encyclopedia_pages/the-clave-and-the-backbeat
- https://timba.com/musicians/changuito?lang=en-US
- https://drummerszone.com/artists/jos-luis-changuito-quintana-fuerte/570/profile/
- https://www.moderndrummer.com/2025/06/jose-luis-changuito-quintana-the-eternal-pulse-of-cuban-drumming/
- https://bassmusicianmagazine.com/2015/09/bass-lines-by-jaime-vazquez-part-xiv-los-van-vans-sandunguera/amp/
- https://songbpm.com/@los-van-van
- https://en.wikipedia.org/wiki/Horacio_Hernández
- https://en.wikipedia.org/wiki/Habana_(album)
- https://en.wikipedia.org/wiki/Supernatural_(Santana_album)
- https://en.wikipedia.org/wiki/Shaman_(album)
- https://en.wikipedia.org/wiki/About_Time_(Steve_Winwood_album)
- https://en.wikipedia.org/wiki/Live_at_the_Blue_Note_(Michel_Camilo_album)
- https://nl.wikipedia.org/wiki/For_Hamp,_Red,_Bags,_and_Cal
- https://discover.library.unt.edu/catalog/b4240023
- https://news.allaboutjazz.com/michel-camilo-marks-his-move-to-telarc-with-his-most-ambitious-recording-to-date.php
- https://ink19.com/2002/04/magazine/music-reviews/michel-camilo
- https://www.jazzmusicarchives.com/album/michel-camilo/triangulo
- https://www.jazzmusicarchives.com/album/gonzalo-rubalcaba/mi-gran-pasion
- https://www.jazzmusicarchives.com/album/roy-hargrove/habana
- https://latinomusiccafe.com/2010/08/09/cafe-with-master-percussionist-horacio-el-negro-hernandez/
- https://en.wikipedia.org/wiki/John_Patitucci
- https://www.allmusic.com/album/italuba-mw0000331678
- https://www.audaud.com/?p=5930
- https://pearldrum.com/artist/horacio-hernandez
- https://drummercafe.com/featured/drummer-percussionist/horacio-hernandez.html
- https://hudsonmusic.com/?p=4881
- https://www.drumeo.com/beat/?p=23034
- https://www.discussionsinpercussion.com/home/2020/1/22/jcj2epmsfkbq3pz3rbqzegn6ny3cg9
- https://tigerbill.com/drumreviews/elnegrohernandezatmoderndrummerfest.htm
- https://tigerbill.com/drumreviews/conversationsinclavehernandez.htm
- https://www.alfred.com/products/conversations-in-clave-00-907096
- https://athome.sfjazz.org/masterclasses-lessons-lectures/videos/conversations-in-clave-ep-4-cascara-variations
- https://athome.sfjazz.org/masterclasses-lessons-lectures/videos/conversations-in-clave-ep-5-feeling-the-clave-in-4-and-6
- https://jazzleadsheets.com/dream-traveler.html
- https://songbpm.com/@santana/africa-bamba
- https://www.songsterr.com/a/wsa/santana-africa-bamba-drum-tab-s717963
- https://www.songsterr.com/a/wsa/santana-feat-seal-you-are-my-kind-drum-tab-s3770724
- https://www.songsterr.com/api/meta/5641772
- https://api.deezer.com/album
