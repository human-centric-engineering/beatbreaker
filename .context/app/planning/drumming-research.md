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
