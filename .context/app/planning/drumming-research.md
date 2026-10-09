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
