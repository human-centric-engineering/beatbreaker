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

- **The In the Air Tonight break** follows Drumeo. The tab agrees on the
  notes and puts its kick on 4 a triplet late, near the "e". Drumeo's two
  noteheads together are written as two toms at once: rack toms for the
  first three groups, rack and floor for the fourth, then the floor tom
  (Drumeo's last two are two floor toms together, and there is one floor tom
  here). Drumeo prints Collins's "There's no kick in between the last two tom
  hits" beside notation that has the kick on the "e" and the "a" of 4,
  between and after those two floor-tom pairs. The two are not reconciled
  here: the notes follow the notation, and the record asks what he meant.
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

## AA. Michael Shrieve (2026-10-14)

The `shrieve` style plays **songs**, as `collins` does (X). His record
(`drummer-model/drummers/michael-shrieve.json`) is new in 11-g; he was a stub
named by Santana's "Oye Como Va" recording, and keeps that id. That recording
had its drummer's evidence under `ev`, not `evidence`; it is renamed.

**Which records are his.** Wikipedia: born 6 July 1949 in San Francisco,
raised in Redwood City; at nineteen he "jammed with Santana at a recording
studio and was invited to join that day"; Woodstock on 16 August 1969; seven
albums, 1969-74 (Santana, Abraxas, Santana III, Caravanserai, Welcome,
Borboletta, Lotus); he co-wrote four of Caravanserai's tracks and co-produced
it. In his own words (A Breath of Fresh Air): the band "just had a big falling
out with the drummer", remembered him, and "literally followed me home to my
parents' house". So the 1968 _Live at the Fillmore_ shows, whose tabs exist,
are Bob Livingston's, not his, and are not used. Santana's percussion section
was Michael Carabello (congas) and José "Chepito" Areas (timbales); on
Caravanserai, Mingo Lewis and Armando Peraza.

**How he played.** "I started with big band drummers like Buddy Rich and Gene
Krupa and then I got into Tony Williams, [Jack DeJohnette], Roy Haynes" (the
transcript writes "Jackie Jeanette"). From the 1983 Modern Drummer interview,
as Scott K. Fish quotes it: "I see it as a flow of energy. Let's say the rhythm
I play contains a flow of energy that isn't locked to the rhythm."
UltimateSantana: "a staggering array of complicated, jazz-influenced patterns
that not only complemented, but enhanced the syncopated percussion team." "We
played to each other. We don't play to the crowd." A search summary says he
studied Elvin, Haynes, Philly Joe and Tony Williams with his friend Lenny
White; no page found says so, so the record has no edge for it and asks.

**What the style encodes.** The `sixties` kit (an open, ringing 1960s Ludwig);
a loose feel with no lean (`jitter` 0.02: "not locked to the rhythm");
`fillsGrow` (Soul Sacrifice builds to its solo); and, in the songs, **the
percussion section on the percussion lanes**: Carabello's congas under Soul
Sacrifice, the bongos under Black Magic Woman, the maracas and cabasa under
Song of the Wind. Those slots take no drummer's hands, as they were other
players'. The style's figures are his kit parts only.

| Song                         | Year | Tempo (quarter)                  | What defines it                                                  | Source of the bars        |
| ---------------------------- | ---- | -------------------------------- | ---------------------------------------------------------------- | ------------------------- |
| Soul Sacrifice (Woodstock)   | 1969 | 132 (tab); 136 (songbpm, studio) | riding the crash on the beat; the solo's snare in threes         | Songsterr 1621352 (human) |
| Evil Ways                    | 1969 | 120 (tab); 117 (songbpm)         | eighths on the hat, a cross-stick verse, the ride in the outro   | Songsterr 3582839 (human) |
| Persuasion (Woodstock)       | 1969 | 126–138 (tab); 131 (songbpm)     | hats, then floor tom and kick together in eighths                | Songsterr 1621303 (human) |
| Fried Neck Bones (Woodstock) | 1969 | 120–130 (tab)                    | the ride in eighths; crashes on 1 and the "and" of 2             | Songsterr 1621357 (human) |
| Black Magic Woman            | 1970 | 120 (tab); 124 (songbpm)         | the hat open in threes and a kick, the bongos playing the groove | Songsterr 357 (human)     |
| Samba Pa Ti                  | 1970 | 88 (tab); 92 (songbpm)           | sixteenths on the hat, two on the snare                          | Songsterr 17329 (human)   |
| Taboo                        | 1971 | 85 (tab); 90 (songbpm)           | slow; a cross-stick verse; the hat open on the "and"s            | Songsterr 1815434 (human) |
| Song of the Wind             | 1972 | 94 (tab); 90 (songbpm)           | a cross-stick tresillo with maracas and cabasa                   | Songsterr 17440 (human)   |

- **Soul Sacrifice** follows the Woodstock tab; the congas are from the studio
  tab (17533), whose drum track has them merged into his part.
- **Black Magic Woman**'s tab writes the bongos in his track; they go on the
  conga slot (there is no bongo), and his part is the hat and the kick.
- **Samba Pa Ti**'s tab gives the samba section hats and snare only, no kick,
  and it is kept as written.

**Left out.** "Waiting" (Woodstock): its drum track is "regenerated". "Savor",
"Jingo" (studio and Woodstock), "No One to Depend On", "Incident at
Neshabur", "Toussaint L'Overture": machine-made tabs. "Oye Como Va" (61155):
the tab has bongos and no kit. "Batuka": the tab is cymbal swells. The 1968
Fillmore tabs: Bob Livingston.

**Found on the way, not changed.**

- There is no bongo instrument; the conga slot stands in for it.
- Two Santana percussionists at once (congas and timbales) need two slots;
  each song here writes the one its tab gives.

Sources: [Wikipedia, Michael Shrieve](https://en.wikipedia.org/wiki/Michael_Shrieve);
[A Breath of Fresh Air, transcript](https://abreathoffreshair.com.au/transcript/transcript-santanas-drummer-michael-shrieve-on-life-music-and-beyond/);
[Scott K. Fish, Michael Shrieve pt 1](https://scottkfish.com/2025/01/23/michael-shrieve-pt-1-of-2/);
[UltimateSantana, Michael Shrieve](https://www.ultimatesantana.com/resources/the-band/michael-shrieve/);
Songsterr tabs 1621352, 17533, 3582839, 1621303, 1621357, 357, 17329, 1815434,
17440; [songbpm.com](https://songbpm.com/@santana).

## AB. Cindy Blackman Santana (2026-10-14)

The `cindyblackman` style plays **songs**, as `collins` does (X). Her record
(`drummer-model/drummers/cindy-blackman-santana.json`) is new in 11-g. She was
two stubs: Tony Williams's record named her `drummer:cindy-blackman-santana`
and Yussef Dayes's `drummer:cindy-blackman`, which is the two-nodes-for-one-
person fault 11-a fixed for Cozy Cole. Her record keeps the first (her name
since 2010) and Dayes's reference moves to it; a test holds it.

**Which records are hers.** Wikipedia: born 18 November 1959 in Yellow
Springs, Ohio; the Hartt School from eleven, then Berklee with Alan Dawson,
who had taught Tony Williams; to New York in 1982; _Arcane_ (1987) as leader
with Wallace Roney, Joe Henderson and Kenny Garrett; Lenny Kravitz's drummer
from 1993 for eighteen years; _Another Lifetime_ (2010), a Tony Williams
tribute; married Carlos Santana on 19 December 2010; on _Corazón_ (2014),
_Africa Speaks_ (2019) and _Blessings and Miracles_ (2021); _Give the Drummer
Some_ (2020). **Kravitz**: he plays most instruments on his own records, the
drums included; her one studio track with him is "Straight Cold Player" on
_5_ (1998), per DRUM! (via a search summary). She is in the "Are You Gonna Go
My Way" video, but the record's drums are his, so no Kravitz hit is used.
_Africa Speaks_: Rick Rubin, ten days at Shangri-La, forty-nine songs, her on
drums. _Blessings and Miracles_: her on all but "Joy" (Derek Mixon) and track
7, so the human "Joy" tab is not hers. The live "Corazón Espinado" is from
_Corazón, Live from Mexico: Live It to Believe It_, Guadalajara, 14 December
2013, released 9 September 2014; the studio version (1999, _Supernatural_)
predates her. Public Enemy's "She Got Game" (4 February 2026) credits her
on drums. Modern Drummer has just covered her new record, _Coherence_
(October 2026), with Carlos Santana and John McLaughlin among its guests; no
transcription of it exists yet.

**How she played.** Modern Drummer (2008): hearing Tony Williams on _Four &
More_, "I was trippin'"; "I'm chasing the legends of Art Blakey, Tony
Williams, and Elvin Jones, I'd better be ready"; "You better smack those
drums, because those cats weren't messing around"; a 1950s Gretsch
round-badge Broadkaster at home. Wikipedia: Blakey "really was like a father to
me. I learned a lot just watching him." Bart Elliott (Drummer Cafe, 2015)
transcribed the groove she opened her Vic Firth interview with: "a wonderful
mix of New Orleans funk, latin and jazz", a gallop on the ride (an eighth and
two sixteenths) over ghosts in the left hand, the kick and the hat foot in a
one-bar ostinato.

**What the style encodes.** The `bigrusty` kit (thick, hit hard, a big wash of
cymbal); `rimshot` 0.35 ("smack those drums"); a feel on top, after Williams
(inferred); `buzz` 0.1 for the roll that opens She Got Game's chorus. Her Vic
Firth groove is a style figure, not a song: it names no record.

| Song                    | Year | Tempo (quarter)                        | What defines it                                                               | Source of the bars        |
| ----------------------- | ---- | -------------------------------------- | ----------------------------------------------------------------------------- | ------------------------- |
| Breaking Down the Door  | 2019 | 102 (tab); 103 (songbpm)               | the kick on every beat, the snare on the "a" of 1 and 3, the "and" of 2 and 4 | Songsterr 4521944 (human) |
| Corazón Espinado (live) | 2014 | 128 (tab); the 1999 studio take is 120 | hats, then the ride, then the crash and snare on every beat                   | Songsterr 5178015 (human) |
| She Got Game            | 2026 | 100 (tab)                              | the kick on the "a" of 2 and the 3, the hats filling in sixteenths            | Songsterr 3917543 (human) |

- **Breaking Down the Door**'s backbeat is its snare figure (the "a" of 1, the
  "and" of 2, the "a" of 3, the "and" of 4), so it has its own fill, the tab's
  turnaround with a crash on the "and" of 4 over that figure: the style's
  fills put the snare on the beat and the critic then found no backbeat.
- **She Got Game**'s roll into the chorus is twelve sixteenths on the snare,
  which the critic calls a run; it is written as buzz strokes on the eighths,
  then the backbeat on 4, with the kick into the 1 (the tab's three kicks
  are two here, the third a triple the critic refuses on one foot).

**Left out.** Every Kravitz hit (his drums); "Joy" (Derek Mixon); the Playing
for Change "Oye Como Va", "Yo Soy la Luz", "Corazón Espinado" (studio, live
990131), "Move", "Saideira": machine-made or not hers. Her jazz records,
Spectrum Road and _Coherence_ have no transcription found, and they are the
heart of her playing: the record asks for them.

**Found on the way, not changed.**

- She has three songs. Like Lenny White's, her style is thinner than her
  playing because only three of her records have a human transcription.

Sources: Wikipedia — [Cindy Blackman Santana](https://en.wikipedia.org/wiki/Cindy_Blackman_Santana),
[Africa Speaks](<https://en.wikipedia.org/wiki/Africa_Speaks_(album)>),
[Blessings and Miracles](https://en.wikipedia.org/wiki/Blessings_and_Miracles);
[Modern Drummer, The Lady Comes To Play (2008)](https://www.moderndrummer.com/2008/04/cindy-blackman/);
[Modern Drummer, Coherence (2026)](https://www.moderndrummer.com/article/cindy-blackman-santana-talks-about-her-new-record-coherence/);
[Drummer Cafe, Smooth Struttin' New Awlins Gumbo](https://drummercafe.com/education/lessons/cindy-blackman-smooth-struttin-new-awlins-gumbo);
[DRUM!, Lenny Kravitz drummers](https://drummagazine.com/lenny-krawitz-drummers/) (via search summary);
[santana.com, Corazón Live from Mexico](https://santana.com/news/were-proud-to-announce-sept-9th-release-of-corazon-live-from-mexico-live-it-to-believe-it/) (via search summary);
[Black America Web, She Got Game](https://blackamericaweb.com/2026/02/05/public-enemy-he-got-game-as-a-women-power/) (via search summary);
Songsterr tabs 4521944, 5178015, 3917543; [songbpm.com](https://songbpm.com/@santana).

## AC. Polyrhythm: the devices, sourced (2026-10-14)

Phase 12-b ([`polyrhythm-plan.md`](./polyrhythm-plan.md) §7 A, D56). Every
drummer record now names its rhythmic **devices** in one vocabulary (plan §3),
each citing a source, or records the transcription-level search that found
none (`technique_profile.coordination.devices` / `devices_search`, schema
1.5). Only `cross-rhythm` and `hemiola` are polyrhythms; the rest are named
for what they are. A reputation, an odd meter, a sextuplet lick or a
listener's comment was not counted as a source.

**What the pass found.** Sourced true polyrhythm is rare in this roster:
Elvin Jones's waltz hemiola (2:3, Wikipedia on _Afro Blue_ and Todd Bishop)
and Tony Williams' dotted quarters against the pulse on _Vertigo_ (2:3,
Goodman). Most of what drummers call polyrhythm here is **polymeter**
(Bonham holding 4/4 under the _Kashmir_ and _Black Dog_ riffs; Tony Williams'
3/4 and 7/4 cycles; Elvin's three- and five-beat phrases; Klek on _Fabienk_),
**grouping** (Gadd, Collins, Shrieve, Copeland, Klek), **displacement**
(Stubblefield's _Cold Sweat_, Changuito, Copeland), **timeline** (Horacio,
Puente), **ostinato independence** (Allen, Horacio, Gadd, Baker, Starks,
Blackman Santana, Puente) or **metric modulation** (Tony Williams, Klek).

| Drummer                | Devices (confidence, heard on)                                                                                                                                                                                                                                                                                                                                                                                                                           | The search                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adrienne Davies        | —                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Searched, none found. Slow tempo, momentum and restraint, and a song in 3/4, which is a meter.                                                                                                                                                                                                                                         |
| Bernard Purdie         | —                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Searched, none found. The Purdie shuffle is triplets over a half-time backbeat: a swung subdivision with no second pulse.                                                                                                                                                                                                              |
| Billy Cobham           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                        | No device held. Leads: an eight-note paradiddle cell over the bar on For Someone I Love (Bishop; not a 3, 5 or 7 grouping, and the subdivision on the record is not stated), and 'rhythmic displacement' in the blurb for his own By Design pieces (the charts were not read). Mahavishnu's long meters are odd meter, not polyrhythm. |
| Changuito              | displacement (verified, Sandunguera)                                                                                                                                                                                                                                                                                                                                                                                                                     | Tagged from the records and this document (§7 A)                                                                                                                                                                                                                                                                                       |
| Cindy Blackman Santana | ostinato-independence (likely, Smooth Struttin' New Awlins Gumbo (her Vic Firth interview groove))                                                                                                                                                                                                                                                                                                                                                       | One ostinato found. No cross-rhythm, grouping or metric modulation at transcription level.                                                                                                                                                                                                                                             |
| Clyde Stubblefield     | displacement (verified, Cold Sweat (1967))                                                                                                                                                                                                                                                                                                                                                                                                               | A displacement found. Funky Drummer's hat 'shoops' are a side effect of the heel, by Moore's account, not a device.                                                                                                                                                                                                                    |
| Dave Lombardo          | —                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Searched, none found. The Angel of Death tom figure he calls 'a very typical Tito Puente' figure is not named as a clave or any timeline by a source.                                                                                                                                                                                  |
| Elvin Jones            | hemiola 2:3 (verified, Afro Blue, My Favorite Things); polymeter (widely_reported, Anthropology, Dear John C.)                                                                                                                                                                                                                                                                                                                                           | The waltz 2:3 is sourced. A 3:4 cross-rhythm in groups of four triplet partials is not named by any source read, so it is left out.                                                                                                                                                                                                    |
| Ginger Baker           | ostinato-independence (widely_reported, Toad)                                                                                                                                                                                                                                                                                                                                                                                                            | An ostinato found (Toad). The 3:2 tom figure over a duple kick is not sourced, so it is not tagged.                                                                                                                                                                                                                                    |
| Horacio Hernández      | timeline (verified, Our Family, Rumbatella); ostinato-independence (verified, Our Family)                                                                                                                                                                                                                                                                                                                                                                | Tagged from the records and this document (§7 A)                                                                                                                                                                                                                                                                                       |
| Jabo Starks            | ostinato-independence (likely, Soul Power (1971), Sex Machine (1970))                                                                                                                                                                                                                                                                                                                                                                                    | An ostinato found. His light sixteenth swing is a feel, not a second pulse.                                                                                                                                                                                                                                                            |
| John Bonham            | polymeter (widely_reported, Kashmir (Physical Graffiti, 1975)); polymeter (verified, Black Dog (Led Zeppelin IV, 1971))                                                                                                                                                                                                                                                                                                                                  | Two polymeters, in both of which he holds the 4. The Bonham triplet is a sextuplet lick, not a cross-rhythm; The Crunge, The Ocean and Four Sticks are odd meters.                                                                                                                                                                     |
| Klek de Poitrine       | grouping (needs_verification, Sherpa); polymeter (verified, Fabienk, Tohogd); metric-modulation (likely, Sarniezz, Sherpa)                                                                                                                                                                                                                                                                                                                               | Tagged from the records and this document (§7 A)                                                                                                                                                                                                                                                                                       |
| Lenny White            | —                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Searched, none sourced. Bishop's line does not say groupings, and the style's accent every six 16ths is BeatBreaker's reading.                                                                                                                                                                                                         |
| Michael Shrieve        | grouping (likely, Soul Sacrifice)                                                                                                                                                                                                                                                                                                                                                                                                                        | A grouping found in a community tab, not a published transcription.                                                                                                                                                                                                                                                                    |
| Mitch Mitchell         | —                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Searched, none sourced. Manic Depression is an Elvin-style jazz waltz in compound triple time (Riley; Wikipedia), but no source names a 2:3 or a hemiola in his own part.                                                                                                                                                              |
| Omar Hakim             | —                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Searched, none found. A 9/8 groove (Ableton) is odd meter.                                                                                                                                                                                                                                                                             |
| Phil Collins           | grouping (likely, In the Air Tonight (Face Value, 1981))                                                                                                                                                                                                                                                                                                                                                                                                 | One grouping found. Nuclear Burn (11/8), Watcher of the Skies (6/4) and The Cinema Show (7/8) are odd meter, not devices.                                                                                                                                                                                                              |
| Ringo Starr            | —                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Searched, none found. Ticket to Ride is syncopation following the riff, Come Together's fills are sextuplets, Happiness Is a Warm Gun changes meter. About 175 of Pollack's pages were not read.                                                                                                                                       |
| Steve Gadd             | ostinato-independence (widely_reported, Late in the Evening); grouping (verified, Love for Sale (Burning for Buddy, Vol. 1, 1994))                                                                                                                                                                                                                                                                                                                       | A grouping found, beside the mozambique. The Samba Song solo has a figure three 16ths long from bar 29 (Bishop), but how far it repeats is not stated. 'That Steve Gadd lick' (Afro) is a triplet inside a triplet in one lick, not a cross-rhythm.                                                                                    |
| Stewart Copeland       | displacement (verified, Walking On The Moon, Roxanne); grouping (likely)                                                                                                                                                                                                                                                                                                                                                                                 | Nothing beyond the displacement. The echo's timing is never given, so no dotted-eighth three-against-four is claimed; his hemiola stays a song-level cross-rhythm in the catalogue.                                                                                                                                                    |
| Tito Puente            | timeline (verified); ostinato-independence (likely, Oye negra, El Botellero, Eco (Machito Orchestra, 1942))                                                                                                                                                                                                                                                                                                                                              | Clave and a layered ostinato found. No sourced cross-rhythm: the 6/8 bembé on timbales is a lead only.                                                                                                                                                                                                                                 |
| Tony Allen             | ostinato-independence (verified, Water No Get Enemy)                                                                                                                                                                                                                                                                                                                                                                                                     | No ratio is sourced; the interlocking independence is. Unread leads: the Scribd document and Bishop's African Message and No Agreement posts.                                                                                                                                                                                          |
| Tony Williams          | polymeter (verified, Vertigo (Jackie McLean, 1963), Teo's Bag (Circle in the Round, 1968)); cross-rhythm 2:3 (likely, Vertigo (Jackie McLean, 1963)); polymeter (verified, So What (Miles in Tokyo, 1964)); metric-modulation (verified, Footprints (Miles Smiles, 1966), Fall (Nefertiti, 1967), I Fall in Love Too Easily (Live at the Plugged Nickel, 1965), Limbo (Sorcerer, 1967)); polytempo (likely, No Blues (Live at the Plugged Nickel, 1965)) | The threes over the bar are a 3/4 cycle over 4/4 on Vertigo and Teo's Bag, not So What or Joshua as the record once said; So What (Tokyo) is 7/4 over 4/4. No source found for his 5s and 7s as tuplets.                                                                                                                               |
| Yussef Dayes           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Searched, none found. Lead: Drum Hub's sheet reportedly has the Pon di Plaza rim clicks on dotted 8ths, a grouping of threes, but the notation could not be read. Sabar is an influence he names, not a device.                                                                                                                        |

**Corrections the pass made to what the records said:**

- **Tony Williams' threes.** Goodman's thesis (read in full this time, from
  a Wayback copy of the PDF) has the 3/4 over 4/4 on _Vertigo_ (Jackie
  McLean, 1963, twelve bars, Butch Warren joining in dotted quarters) and
  _Teo's Bag_ (1968); his _So What_ case (Tokyo, 1964) is **7/4** over 4/4,
  and _Joshua_ is not analysed. The trait "threes over the bar … as on So
  What and Joshua" now names those records. Metric modulation is Goodman's
  _Footprints_ (old dotted eighth = new quarter, 8:6), _Fall_ and _I Fall in
  Love Too Easily_; _No Blues_ is a superimposed faster pulse (polytempo).
  The plan's VOA 2012 article only calls him "famous for his use of
  polyrhythms and metric modulation" and names no record: not used.
- **Copeland's displacement** is the **kick** moved off the 1 onto 2 and 4
  (_Walking on the Moon_; MusicRadar), not "the backbeat moved by an eighth",
  which no source read says. His song-level hemiola stays in the catalogue.
- **Gadd's _Late in the Evening_.** The mozambique with two sticks a hand is
  his; Wikipedia credits the record's bell and temple blocks to Ralph
  MacDonald.
- **Left out for want of a source:** Elvin's 3:4 in groups of four triplet
  partials, Ginger Baker's 3:2 tom figure, Mitch Mitchell's 2:3 on _Manic
  Depression_ (Riley calls it "his version of Elvin"; nobody names the
  ratio), Lenny White's groupings, Cobham's paradiddle cell and the
  displacement in his _By Design_ blurb, Yussef Dayes's dotted-eighth rim
  clicks on _Pon di Plaza_ (the Drum Hub notation is behind a sign-up), and
  Tony Williams' 5s and 7s as tuplets. Each is a lead in its record's
  `devices_search.note`.
- **`polyrhythm_usage`** weights were not changed. No source read supports
  the numbers either way; they are the model's estimate.

**For 12-c.** A style gets polyrhythmic fills only from a sourced device.
Grid-aligned candidates: Tony Williams' 3/4 over 4/4 and 2:3, Elvin's waltz
hemiola and three-beat phrasing, Gadd's three-note grouping, Collins's threes
of 16ths, Shrieve's threes on the snare, Bonham holding 4 under a riff in
three. Displacement and timeline (Stubblefield, Changuito, Horacio, Puente)
are written and labelled as themselves, never as poly fills.

The sources are in each record's `devices[].evidence.source_ids`, resolved
from `sources/`; the `/drummers/<slug>` pages list them with links.

## AD. Tomas Haake (2026-10-15)

Phase 12-e ([`polyrhythm-plan.md`](./polyrhythm-plan.md) §7 B, D57). The
`haake` style plays **songs**, as `lombardo` does (U): each New picks one of
his records, with its tempo and grooves. His record is
`drummer-model/drummers/tomas-haake.json`, schema 1.5.

**Which records are his.** Meshuggah's drummer from 1990 (Wikipedia). Every
album has him at the kit except _Catch Thirtythree_ (2005), "the only
Meshuggah album on which programmed drums have been used"; the 2006 reissue of
_Nothing_ re-recorded the drums "by using the original drum hits as triggers",
so the hits are his; on _obZen_ Drumkit from Hell was "an auxiliary sound
source", not programmed. Nothing from _Catch Thirtythree_ or the _I_ EP is
used.

**How he plays.** In his words: "Sometimes it's the feet doing the riff, and
the hands are going straight over it"; "Whoever writes the song also writes
the drum parts. Usually not a lot is changed in those drum parts except for
the fills"; "I don't have a ride cymbal. It's just big crashes and Chinas"
(_Modern Drummer_, 2013). "I only do the hits with the guitar hits. So the
toms are doing what the guitars are doing together with the bass drum instead
of being a fill that's on top of something else"; the odd cycles (he names
17, 23 and 34) "start over" at 8 or 16 bars and are not odd time signatures
"because it's all built around 4/4"; "I'm not counting while playing";
rimshots "even on the toms"; comfortable at about 140, "past 160–170 it's
getting awkward" (_DRUM!_, 2012). _obZen_ "is straight 4/4 all through", "a
pattern of snare and kick could be nine hits over an 8/8 bar", "alternative
cycles or odd groupings" (_DRUM!_, 2010). Wikipedia, citing PopMatters: on
_Rational Gaze_ he "plays simple 4/4 time, hitting the snare on each third
beat, for 16 bars". Drumstickler's _Ligature Marks_ breakdown has the kick on
a phrase 37 eighths long under the snare on 3, coming round in 16 bars.

**Devices (schema 1.5).** **Polymeter**, in the groove and in fills (the
toms join the kick on the riff), verified from his own words and the
analyses above. **Grouping**, in fills: _Electric Red_'s opening, the toms in
pairs and the kick on every third sixteenth over the hat foot, which he
describes as "a patiently rolling, relatively spare tom and kick
arrangement" (likely: his description and a human tab, not a published
transcription). Not claimed: "23/16" as a meter (Wikipedia cites a
Rockdetector biography for it; the band calls it 4/4); _Bleed_'s herta as a
cross-rhythm (a cycle three sixteenths long under 4/4 is polymeter by plan §3).

**What the style encodes.** The hands' 4/4 with the snare on 3
(`backbeats: [8]`), two kicks (`doubleKick`), `rimshot` 0.6, no swing, no
ghosts added (the ghosted snare is in the figures), the `crocell` kit (a metal
band's, close and dry, two of each cymbal). Each song's figures are **two
bars of the tab at a time**, so the riff crosses the bar line as on the
record; the style's own figures are one bar each. Poly fills (12-c): the
**polymeter** cell is Ligature Marks' eighth-and-quarter on the floor or mid
tom with the kick, the cymbal keeping the beat (`time`), four or five cells;
the **grouping** cell is Electric Red's pair-and-kick in threes, six or ten
cells. Rate 0.3.

| Song                          | Year | Tempo (quarter)                    | What defines it                                                  | Source of the bars       |
| ----------------------------- | ---- | ---------------------------------- | ---------------------------------------------------------------- | ------------------------ |
| Future Breed Machine          | 1995 | 140–150 (tab 166–186; songbpm 175) | china on the beat over the riff, then double bass in 16ths       | Songsterr 13389 (human)  |
| New Millennium Cyanide Christ | 1998 | 140–150 (tab 152; songbpm 150)     | china in eighths, ghosted snare inside the riff, the snare on 3  | Songsterr 12605 (human)  |
| Rational Gaze                 | 2002 | 128–136 (tab and songbpm 133)      | half-open hat on the beat, rimshot on 3, the kick on the riff    | Songsterr 13236 (human)  |
| Stengah                       | 2002 | 116–122 (tab 120; songbpm 118)     | open hat on the beat, ghosts, the kick every three sixteenths    | Songsterr 12661 (human)  |
| Straws Pulled at Random       | 2002 | 136–142 (tab and songbpm 140)      | both toms on the beat over the hat foot; china over a spare kick | Songsterr 43182 (human)  |
| Electric Red                  | 2008 | 106–114 (tab and songbpm 110)      | toms and kick in threes; the floor tom in eighths over the riff  | Songsterr 43186 (human)  |
| Do Not Look Down              | 2012 | 154–162 (tab and songbpm 160)      | crash on the beat, rimshot on 3, a spare kick across the bar     | Songsterr 269211 (human) |
| Demiurge                      | 2012 | 82–88 (tab 85; songbpm 113)        | crash on the beat, ghosted snare between the kicks               | Songsterr 383114 (human) |

Tempos are the tab's, checked against songbpm.com. Where the feet run four
sixteenths or more (Future Breed Machine, New Millennium Cyanide Christ) the
range stops at 150 (`RUN_RATE`). Demiurge's tab is at 85 and songbpm says
113; the tab's bars are at its own tempo, so 85 is kept. Fills that began on
beat 3 are cut to their last six steps so the snare on 3 stays in every bar,
as the critic asks.

**Left out.** _Bleed_ (Songsterr 23825, human): the feet are 32nds at 115, a
cell of six 32nds that comes round every three bars, under china quarters and
the snare on 3. No meter holds 32nds (D46), and written as sixteenths it is
half the record's speed; Lombardo's double bass at 175–210 was left out on
the same rule (U). _Combustion_ (tab at 220) is past a sixteenth grid.
_Lethargica_, _Pravus_, _Clockworks_ and others have human tabs too; the eight
above cover the vocabulary, and Clockworks' tab has triplets and 32nds off the
grid.

**Found on the way, not changed.** A two-bar figure holds two bars of a
cycle that takes eight or sixteen to come round, so the generated riff
restarts every two bars where the record's keeps going. A song-length
cross-cycle would need a figure longer than two bars.

## AE. Danny Carey (2026-10-15)

Phase 12-e. The `carey` style plays songs; his record is
`drummer-model/drummers/danny-carey.json`, schema 1.5.

**Which records are his.** Tool's drummer since it formed in Los Angeles in
1990, on every record (Wikipedia, Tool). Before it, Green Jellö as "Danny
Longlegs", and Pigmy Love Circus; since, Volto! and Legend of the Seagullmen
(Wikipedia). Only Tool is used here.

**How he plays.** Jazz in high school and at the University of
Missouri–Kansas City; tabla with Aloke Dutta; he drums to "the 'feel' of the
song" and its "inner pulse" rather than counting (Wikipedia). Drumeo:
_Lateralus_ moves 9/8, 8/8, 7/8 (working title "987"); _Invincible_ "has a
7/16 groove with a pattern that goes over the bar line, resulting in a 7
over 3 polyrhythm"; on _Eulogy_ "groupings of 3 on the hi-hats take three
full bars to resolve"; on _Rosetta Stoned_ he "plays in 3/4 while implying 4/4
on the right hand and 5/16 with the bass drum"; influences Bonham, Cobham,
Peart, Tony Williams and Bruford. MusicRadar (2020): _Forty Six & 2_ is
largely 4/4; in its 7/8 he plays "16th-note triplets round the kit, playing
over the bar line", and "the final stabs of the song take us into a hypnotic
five-note accent pattern that repeats seven times"; _Eulogy_'s hat has "open
accents on every third sixteenth note" over a "Bohnam-esque kick and snare";
_Ticks and Leeches_ is a 16th-note tom pattern in 7/4 with "double pedals
underneath".

**Devices (schema 1.5).** **Grouping** in the groove (Eulogy's hat in threes,
verified: Drumeo, MusicRadar and the tab agree). **Polymeter** in the groove
(Rosetta Stoned's kick on a five-sixteenth cycle under 3/4, verified: Drumeo
and the tab). **Grouping** in fills (the fives repeated seven times over the
bar line in Forty Six & 2, likely: a magazine's description, no
transcription). Leads not tagged: Invincible's "7 over 3" (no transcription
read), Lateralus's "5/8 against the band's 6/8" (a search summary only), and
the right hand's 4/4 in Rosetta Stoned, which the tab read does not show.

**What the style encodes.** No swing, few added ghosts, `rimshot` 0.2, the
`drs` kit (an even studio kit with Paiste cymbals, as his are). Each song in
its own meter. **Eulogy is in two sections**: the verse, and the hat in
threes, where `crossRhythms` opens the hat every three sixteenths over the
last three bars of the section, so the threes come round on the next 1 as
Drumeo describes, rather than restarting with a figure. Poly fills (12-c):
his five-note grouping, a snare accent and four 16ths, each five on one drum
round the kit, three or six cells in 4/4 and **all seven** in the 5/4 and
7/4 songs, whose two bars hold 35 sixteenths. Rate 0.25. The kick in fours
on The Pot and the double bass under Ticks and Leeches are `doubleKick`.

| Song              | Year | Meter | Tempo (quarter)                        | What defines it                                                    | Source of the bars       |
| ----------------- | ---- | ----- | -------------------------------------- | ------------------------------------------------------------------ | ------------------------ |
| Sober             | 1993 | 4/4   | 145–150 (tab 145–157; songbpm 149)     | the hat opening on the "and"s, the snare on 3; the ride section    | Songsterr 19923 (human)  |
| Forty Six & 2     | 1996 | 4/4   | 78–84 (tab; songbpm 159, double)       | rim clicks over the hat foot; hat and crash with the riff's kick   | Songsterr 460731 (human) |
| Eulogy            | 1996 | 4/4   | 84–90 (tab 82–90; songbpm 181, double) | the verse; the hat in threes for three bars                        | Songsterr 19725 (human)  |
| Stinkfist         | 1996 | 4/4   | 85–90 (tab; songbpm 171, double)       | a hat figure with opens on the "a"s, the kick in pairs             | Songsterr 19811 (human)  |
| The Grudge        | 2001 | 5/4   | 92–98 (tab 90–98; songbpm 96)          | the hat over the kick; the ride section; fills with the kick under | Songsterr 20085 (human)  |
| Ticks and Leeches | 2001 | 7/4   | 140–150 (tab 147–164)                  | sixteenths on the rack and floor toms; both feet under them        | Songsterr 56862 (human)  |
| Vicarious         | 2006 | 5/4   | 110–118 (tab 110–120; songbpm 115)     | the hat opening across the bar, a double on the snare before 2     | Songsterr 56870 (human)  |
| Rosetta Stoned    | 2006 | 3/4   | 108–116 (tab 105–119; songbpm 112)     | the kick in fives under 3/4, the snare on 3                        | Songsterr 56856 (human)  |
| The Pot           | 2006 | 4/4   | 104–110 (tab; songbpm 107)             | the riff on the kick under hat and crashes; china, kick in fours   | Songsterr 29442 (human)  |

**Left out.** _Lateralus_ and _Schism_ (Songsterr 20198, 6700, human): their
5/8, 6/8 and 7/8 are written in sixteenths, and BeatBreaker's eighth-note
meters hold eighths only; read at eighths, nearly every bar of both is off
the grid. _Jambi_ (9/8) the same. _Forty Six & 2_'s 7/8 section and _The
Grudge_'s 5/8 for the same reason; the 4/4 and 5/4 sections are written.
_Invincible_ and _Fear Inoculum_ (7/8 and 11/8 in sixteenths) likewise.
_Corrected in 12-g (§AO): the eighth-note meters do hold sixteenths
(`meter.ts` splits every eighth in two, so 7/8 is fourteen steps); these
were left out for a reason that does not hold, and are still to write._

**Found on the way, not changed.** A meter of five, six or seven eighths
split in sixteenths (`5/8-16` and the like) would let in the half of his
catalogue that is in those meters; it is a new meter, not a style change.

## AF. Ari Hoenig (2026-10-15)

Phase 12-f ([`polyrhythm-plan.md`](./polyrhythm-plan.md) §7 B, D57). The
`hoenig` style plays songs; his record is
`drummer-model/drummers/ari-hoenig.json`, schema 1.5.

**Which records are his.** A leader since _Time Travels_ (1999) and the
drummer on every record under his name: _Inversations_ (Dreyfus, 2007; the
trio with Jean-Michel Pilc and Johannes Weidenmueller), _Bert's Playground_
(Dreyfus, 2008), _Lines of Oppression_ (Naive/AH-HA, 2011), _NY Standard_
(Fresh Sound New Talent, 2018; recorded 2015, _Bessie's Blues_ 2010) and
_Conner's Days_ (Fresh Sound New Talent, 2019; recorded 2017). Credits from
All About Jazz's reviews and the Bandcamp and Fresh Sound album pages; where
Wikipedia's year or label differs (_Inversations_ 2006, _Lines of
Oppression_ Naïve 2012) the album's own page is used. A sideman with Pilc,
Kenny Werner, Richard Bona and others (Wikipedia; Drummerworld), but only
his own records are used here.

**How he plays.** Philadelphia-born (1973), violin and piano before drums,
three years at North Texas with Ed Soph, then New York (Drummerworld).
Modern Drummer (Michael Dawson, 2012), reviewing _Metric Modulations_:
"a wizard when it comes to bending barlines and implying alternate time
signatures without ever losing track of the form ... there's actually a
very specific method to his madness". The first book, _Intro to
Polyrhythms_, "dealt with the basics of implied time, which involves
internalizing 'core rhythms' based on various triplet groupings,
quarter-note triplets, and dotted-quarter notes"; the second "digs into
advanced approaches to metric modulation, including implied time in
odd-time signatures, five- and seven-note groupings in 8th notes and
triplets, and five-over-four polyrhythms". Its video has "improvised
examples by Ari Hoenig and Johannes Weidenmueller in duo as well as trio"
(his Bandcamp shop). _Systems Book 1_ teaches comping "using melodies that
stress the 2nd triplet note" and "triplet displacements" (his site). On the
records: _Moment's Notice_ in "a bright 7/8", _Fall_ in 5/4, and _The Way
You Look Tonight_'s tag "fodder for rhythmic displacement" (Dreyfus's
release notes, 2008); _Rhythm-a-ning_'s bridge phrased "in long groups of
5, starting on the last beat before the bridge" (DIY-Drummer, from
transcribing it); on _Conner's Days_ "a master of metric modulation,
superimposing displaced rhythmic patterns and time signatures over
preexisting ones", _All of You_ "puts 5 over 4 and swings hard in both",
_All the Things You Are_ in 5/4 with "clipped drum and bass fills"
(Charette, The New York City Jazz Record). His melodic drumming, tunes at
pitch on the toms and snare with the elbow bending a head (Kelman; Orthmann;
This is Jazz), is a technique, not a device.

**Devices (schema 1.5).** **Metric modulation** (verified: his book, Modern
Drummer, Charette, WBGO). **Polymeter**, implied meters over the form, with
_All of You_ as the example (likely: Charette does not say whether "5 over
4" is a 5/4 over the 4/4 or quintuplets; "swings hard in both" reads as two
meters). **Grouping**, fives and sevens in eighths and triplets, and
_Rhythm-a-ning_'s fives (likely). **Cross-rhythm 3:2** (quarter-note
triplets), **cross-rhythm 2:3** (dotted quarters in 4/4) and **hemiola
2:3** (dotted quarters in 3/4), the core rhythms of _Intro to Polyrhythms_
(likely: its contents and Modern Drummer, no record's bars). **Cross-rhythm
5:4**, the five over four of _Metric Modulations_ (likely: no transcription
of a record read). **Displacement** (likely: _The Way You Look Tonight_;
_Systems Book 1_). All in comping and solos; displacement in comping. Most
rest on his books and on Modern Drummer tying them to his playing, not on
a transcription: that is why they are "likely".

**The first tuplet poly fill.** His 5:4 is the first sourced device in the
roster that is a true tuplet, so his style is the first to use 12-d's
`device: 'tuplet'` fill: five even notes round the drums in the time of the
bar's four beats, the ride keeping the four, one span landing on the 1. The
record names it as what it is, a `cross-rhythm` with ratio 5:4 (plan §3: a
cross-rhythm the grid cannot hold is a tuplet); the record schema has no
`tuplet` kind.

**What the style encodes.** The `virtuosity` kit (the open jazz kit with
its own toms; his is a four-piece). Sextuplet 4/4 at the style, the
hi-hat foot on 2 and 4, ghosts on the middle triplet (_Systems Book 1_),
`fill: 'comp'`, rate 0.3 for poly fills. Six poly fills, all comping over
the time and counted back from the bar line: fives of triplet eighths,
sevens of triplet eighths, fives of straight eighths (groupings), quarter-note
triplets round the drums (3:2), dotted quarters on snare and kick (2:3),
and the 5:4 tuplet. The fast songs in eighths carry the fives of eighths,
the dotted quarters and the 5:4; the 7/8 and 5/4 songs set none. _Someday
My Prince Will Come_ has his hemiola instead; _Rhythm-a-ning_ the fives of
eighths alone, at 0.45; _All of You_ a five-beat crash-and-kick cycle across
the phrase (`crossRhythms` every 30 sextuplets), since two cycles of 5/4 are
longer than a poly fill may be. Metric modulation is not written: no song's
modulation is located, and the library's shelf 7 teaches it.

| Song                        | Year | Meter | Tempo (quarter)                              | What defines it                                        | Source of the bars                      |
| --------------------------- | ---- | ----- | -------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| Pent-Up House               | 2015 | 4/4-8 | 236–246 (AllSolos 238–245)                   | brisk swing, foot on 2 and 4                           | reconstruction                          |
| Bessie's Blues              | 2010 | 4/4-8 | 262–286 (AllSolos 263–285)                   | a blues at a gallop, swing nearly even                 | reconstruction                          |
| In Walked Bud               | 2015 | 4/4-6 | 88–94 (AllSolos 89–92)                       | medium-slow, Monk's push on the last triplet of 2      | reconstruction                          |
| Boplicity                   | 2015 | 4/4-6 | 112–120 (AllSolos 116)                       | light swing, sudden changes of rhythm (Musica Jazz)    | reconstruction                          |
| Someday My Prince Will Come | 2015 | 9/8   | 285–300, i.e. 190–200 a beat (AllSolos 235)  | fast waltz; his hemiola                                | reconstruction                          |
| Moment's Notice             | 2008 | 7/8   | 138–160 (estimate; songbpm 144, algorithmic) | the head in a bright 7/8                               | reconstruction (Dreyfus release notes)  |
| All the Things You Are      | 2017 | 5/4   | 130–150 (estimate; 5/4's runs stop at 150)   | 5/4, a suggested backbeat, clipped drum and bass fills | reconstruction (Charette; Van de Linde) |
| All of You                  | 2017 | 4/4-6 | 150–180 (estimate)                           | a five-beat cycle over the four                        | reconstruction (Charette)               |
| Rhythm-a-ning               | 2011 | 4/4-8 | 220–260 (estimate)                           | fast; fives across the bar                             | reconstruction (DIY-Drummer)            |
| Guernsey St. Gooseneck      | 2017 | 4/4   | 86–98 (estimate)                             | hip-hop: cross-stick, stuttering hat; a krautrock beat | reconstruction (Charette; Van de Linde) |

**Left out.** _Moanin'_, _'Round Midnight_, _Anthropology_'s theme and his
solo records: the melody at pitch is the point, and the grid has no pitch.
_Fall_ (5/4, guitar trio): no tempo and nothing on the drums beyond the
meter; _All the Things You Are_ carries the 5/4. _Arrows and Loops_ and
_Figuration_ (in eleven, "rooted in Bulgarian dance rhythms"): BeatBreaker's
11/8 groups 3-3-3-2, and how his eleven divides is not given. _The Way You
Look Tonight_: its displacement is a device the style does not write as a
poly fill, and no tempo was found. _Moment's Notice_'s 4/4 intro: a section
would share the 7/8's tempo, and the intro is "moderate" where the head is
"bright", by a ratio nobody gives. _The Pauper and the Magician_, _Golden
Treasures_ and _Tea for Three_: nothing on the drums specific enough for
bars. No song follows a transcription: Songsterr has no Hoenig, the two
YouTube transcriptions (his _Anthropology_ solo; _Rhythm_) could not be
read, and copies of his books on file-sharing sites were not used.

**Found on the way, not changed.**

- `poly-fill.test.ts` matches a poly fill to a record device of the same
  kind, but the record schema has no `tuplet` kind: a tuplet fill should
  match a `cross-rhythm` device with its ratio, or no drummer can have one.
- _Moment's Notice_ (4/4 intro, 7/8 head) and his metric modulations both
  want a section at a tempo that is not one of `TEMPO_RATIOS`, or at a
  ratio a source gives; none does yet.
- _Someday My Prince Will Come_ at 235 a beat is past 9/8's ceiling (300,
  200 a beat) and 3/4's (190).

## AG. Max Roach (2026-10-15)

Phase 12-f. The `roach` style plays songs; his record is
`drummer-model/drummers/max-roach.json`, schema 1.5. He was a stub,
`drummer:max-roach`, cited by Tony Williams, Tony Allen, Bonham, Cobham,
Baker, Mitchell and Yussef Dayes; the id is kept.

**Which records are his.** Born 1924 in North Carolina, raised in Brooklyn;
subbed for Sonny Greer with Ellington at eighteen; with Kenny Clarke the
first bebop drummer (Wikipedia). Credits checked for every record used:
Charlie Parker's _Ko-Ko_ (Savoy, 26 November 1945: Parker, Gillespie,
Curley Russell, Roach; Wikipedia, Ko-Ko); _Clifford Brown & Max Roach_
(EmArcy, 1954: Brown, Harold Land, Richie Powell, George Morrow); _Sonny
Rollins Plus 4_ (Prestige, March 1956: Rollins, Brown, Powell, Morrow);
_Saxophone Colossus_ (Prestige, June 1956: Rollins, Tommy Flanagan, Doug
Watkins); _Jazz in 3/4 Time_ (EmArcy, 1957: Dorham, Rollins, Wallace or
Bryant, Morrow); the _Sonny Clark Trio_ (Time, March 1960: Clark, George
Duvivier; from the catalogue entry and reissue listings, read through search
results); _We Insist!_ (Candid, 1960-61); _The Many Sides of Max_ (Mercury,
recorded 1959, released 1964: Booker Little, Julian Priester, George
Coleman, Art Davis); _Drums Unlimited_ (Atlantic, 1966; The Drum Also
Waltzes, the title track and For Big Sid unaccompanied).

**How he plays.** The time on the ride rather than the bass drum, which in
bebop "would only be used for accents and supports" (Roach to Scott K. Fish,
1981); in the later quintets the bass drum is played through and accented
(Bishop: Flossie Lou, A Little Sweet, Blue 7). Hi-hat foot on 2 and 4.
"Max always hits the cymbal on the downbeat after an accent on the & of 4"
(Bishop, Flossie Lou). His solos are composed, "a master of theme and
variation" (Modern Drummer, 2007), question and answer at one-, two- and
four-bar lengths (Rampih), and his comping sounds "composed ... everything
sounds like a deliberate statement" (Bishop, A Little Sweet). He named Jo
Jones, Sid Catlett, Chick Webb and Kenny Clarke (PAS). In the waltz he
leaves the third beat light: "boom-tcheek-(hush)" (Chambert-Loir, Valse
Hot).

**Devices (schema 1.5).**

- **Ostinato-independence** in solos (verified): the hands solo over a foot
  ostinato, the bass drum on 1 and the hi-hat on 2 with nothing on 3 in _The
  Drum Also Waltzes_ (Steve Smith in DRUM!; BANG! The Drum School;
  Chambert-Loir), and quarters on the bass drum with 2 and 4 on the hat all
  through his _Blue 7_ solo (Bishop). Morris's Rutgers thesis places Kofi
  Ghanaba's influence in "complex ostinatos in long-form individual
  improvisations". One pulse in every layer, so not a polyrhythm.
- **Polymeter** in comping and solos (verified): "longer ideas, where he's
  phrasing in 3/4 within the 4/4 of the tune" (Bishop, _A Little Sweet_);
  "The beginning of most of these breaks is phrased in 3/4 time within 4/4"
  (Bishop, _Minor Meeting_ fours).
- **Grouping** in solos (likely): "a simple running 3/8 pattern" in one of
  the _Minor Meeting_ fours (Bishop). How far it runs is in the PDF.
- **Displacement** in solos (verified): "a 4/4 idea twice, then displaces it"
  (Bishop, _Minor Meeting_); a motif "displaced" in the second A of
  _Parisian Thoroughfare_ (Learn Jazz Standards).

**Not tagged.** NPR's "master of polyrhythms" (2007) is a press phrase and
names no record. No source read names a **hemiola** or a 2:3 in his own
waltz playing, so the plan's "_Jazz in ¾ Time_, the waltz with hemiola" is
not tagged; the waltzes are written as waltzes. Leads, in `devices_search`
and `open_questions`: _Garvey's Ghost_ (1961), where "Roach plays a jazz
waltz behind the 6/4 Afro feel" (Bishop) and is "playing in 6 but also in 3"
(Nasheet Waits), which may be a 2:3 against the vamp once the transcription
is read; _Un Poco Loco_'s cowbell (Bud Powell, 1951), "in phrases of 5 over
the 4" (Waits), "whole note triplets across the barline" (Boudreau), the
bass drum "at a different tempo still" (Kaplan), three readings that do not
agree; and his 1991 clinic's "two against three", which is about Ghanaian
drumming, not a record of his. On _Freedom Suite_ Bishop says the cymbal
"stays in 4" and lacks Mel Lewis's running 3/4, so that rubadub is not a
polymeter; his three-beat cells resolving after three bars are Bishop's
exercise.

**What the style encodes.** Default 4/4 swung on the eighths (60, range
52-68), the hat foot on 2 and 4 (`backbeatLane: 'hf'`), `fill: 'comp'` with
written fills half the time, the `virtuosity` kit (the one sampled
live-club jazz kit with toms and a foot hat; nearest to a small 1950s
bebop kit, which no pack kit is). Poly fills (12-c): his polymeter, a cell
three beats long on snare and bass drum under the ride, counted back from
the bar line to land on the 1; in 4/4 (rate 0.2), and in eighths on A
Little Sweet (0.35, over the time) and Minor Meeting (0.35, as a break,
with the running 3/8 as a grouping cell three eighths long: an accent, a
rest, the bass drum, so the bar keeps its air at 262). Ko-Ko and the
waltzes draw none: Ko-Ko is 1945 and the sourced phrasing is from 1959-60;
in a waltz a three-beat cycle is the bar. Blue 7 and The Drum Also Waltzes
hold their foot ostinatos with `forceKick` and figures, and fill more often
(`midFills`, `fillChance`), since they are solos. Minor Meeting has
`toms: false` ("snare drum, bass drum, and cymbals").

| Song                  | Year | Meter | Tempo (quarter)                                                  | What defines it                                                                    | Source of the bars                                               |
| --------------------- | ---- | ----- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Ko-Ko                 | 1945 | 4/4-8 | 290-300 (WJD 299.4; Wikipedia about 300; the meter stops at 300) | quarters on the cymbal, bass drum bombs only, snare chatter; the solo as fills     | **reconstruction** (bebop vocabulary; A2)                        |
| Jordu                 | 1954 | 4/4   | 134-144 (WJD 139.0)                                              | the A figure off the beat, on it, off it; floor tom set-ups; floor tom 16ths       | Bishop's description (PDF not read); the figure's rhythm assumed |
| Blue 7                | 1956 | 4/4   | 130-140 (WJD 133.3-137.6)                                        | solo over bass drum quarters (light) and the foot on 2 and 4; paradiddles          | Bishop's description (PDF not read)                              |
| Valse Hot             | 1956 | 9/8   | 141 (AllSolos), so 205-218 in 9/8                                | bass drum on 1, hat on 2, the third beat left light                                | Chambert-Loir's description; reconstruction                      |
| Minor Meeting         | 1960 | 4/4-8 | 255-268 (Bishop 262)                                             | fours on snare, bass drum and cymbal; breaks opening in three                      | Bishop's description (PDF not read)                              |
| A Little Sweet        | 1959 | 4/4-8 | 222-238 (Bishop about 230)                                       | bass drum loud on every beat, accent on 4; snare on the "and" of 3 then of 2       | Bishop's description (PDF not read)                              |
| The Drum Also Waltzes | 1966 | 9/8   | 81 (Drumeo, the note not given), so 115-128 here                 | the feet on 1 and 2 of the waltz, a theme on snare and toms answered and thickened | feet: Smith, BANG!, Chambert-Loir; hands **reconstruction**      |

**Left out.** _St. Thomas_ (WJD 207-224; five choruses of solo): no human
transcription of the groove found (Songsterr's are AI-generated), and a
calypso written without one would be invented. _Un Poco Loco_: the cowbell
figure's three descriptions disagree. _Garvey's Ghost_: a waltz against a
6/4 vamp needs the transcription to place. _Freedom Suite_: the rubadub is
described (RLRR in swing eighths, snare on the "and" of 1 and 3, little hat
foot) but no tempo was found. _As Long As You're Living_ (5/4 blues at 186,
Bishop): how he splits the five is not described. _Daahoud_, _Joy Spring_,
_Cherokee_ (Study in Brown, 360) and _I'll Remember April_: tempos found
(WJD, AllSolos) but nothing on his part beyond the solos, and Ko-Ko already
holds the fast bebop. Songsterr's Jordu, Joy Spring and Stompin' at the Savoy
tabs are AI-generated; the one human tab (a 2026 Cherokee drum part) was not
used.

**Found on the way, not changed.**

- The Drum Also Waltzes' tempo: Drumeo lists 81 without the note value. If
  it is the dotted half, the song is three times as fast (about 365 in 9/8);
  the transcription or the record should settle it.
- Bishop's PDFs (Blue Seven, Minor Meeting, A Little Sweet, Jordu, Flossie
  Lou, Freedom Suite, Garvey's Ghost) would turn four reconstructions into
  transcriptions and might settle Garvey's Ghost.
- New genre files `style:bebop` and `style:hard-bop` (the plan's `bebop`
  family); each needs a `GENRE_FAMILY` row in `lib/app/lineage/layout.ts`
  ('jazz').
- Other records: Tony Williams has him as `influenced_by` (Goodman), Tony
  Allen, Bonham, Cobham, Baker, Mitchell and Yussef Dayes as
  `cites_as_influence`. His record says `influenced` for each, citing their
  sources and his Wikipedia, which names Tony Williams, Cobham, Baker,
  Mitchell, DeJohnette, Morello and Erskine. Bonham's quoting of The Drum
  Also Waltzes in Moby Dick (Wikipedia, Max Roach) could be added to
  Bonham's record as evidence.

## AH. Dafnis Prieto (2026-10-15)

Phase 12-f. The `prieto` style plays songs; his record is
`drummer-model/drummers/dafnis-prieto.json`, schema 1.5.

**Which records are his.** Born in Santa Clara, Cuba, on 31 July 1974;
conservatory in Santa Clara, then the National School of Music in Havana; in
New York from 1999 (Wikipedia; jazz.com). A sideman with Henry Threadgill,
Steve Coleman, Eddie Palmieri, Jane Bunnett and the Caribbean Jazz Project
(jazz.com). As leader (his label's discography): About the Monks (Zoho, 2004;
Wikipedia says 2005), Absolute Quintet (Zoho, 2006, Grammy nomination),
Taking the Soul for a Walk (2008), the Sí o Sí Quartet's Live at Jazz
Standard NYC (2009, "drums, vocals & clave"), Proverb Trio (2012), Triangles
and Circles (2015), the Big Band's Back to the Sunset (2018; Grammy, Best
Latin Jazz Album, at the 2019 ceremony), Transparency (2020), Cantar (2022),
3 Sides of the Coin (2024). He is the only drummer on each; on Back to the
Sunset Roberto Quintero plays congas, bongos and percussion beside him.

**How he plays.** DRUM! (2015): he "uses the clave as a guide, playing with as
much freedom as he sees fit"; "Don't count. Sing!"; influences Elvin Jones,
Max Roach, Buddy Rich, Tony Williams and Changuito. Yamaha (2007): "he often
implies a larger drum ensemble, evoking bongos and timbales with his toms and
snares", the rimshots standing in for timbales, on a maple kit with an 18x16
bass drum and toms tuned "something like G, C, G"; Changuito and Tata Güines
as models. His Drumeo lesson (2014), whose sheet music was read exercise by
exercise, is the core source: every exercise is written over the **rumba clave
3-2** (in one 4/4 bar of sixteenths: 0, 3, 7, 10, 12), or over the cáscara (its
busy half first: 0, 2, 3, 5, 7, 8, 10, 12, 13, 15) or a cowbell pattern (an
eighth and two sixteenths a beat), with George Lawrence Stone's Stick Control
patterns split between the kick and the snare under it, in eighths, on the
"e" and "a", in sixteenths and in triplets, and a 6/8 bell over the kick and
snare in turn. A podcast's notes on him: "practicing the clave with one limb
and reading the rhythms of the George Stone 'Stick Control' book with another
limb". On Claveteo (Boston Globe, 2012, his words): "we all play in the rhythm
of the clave, but seen in different perspectives because the clave starts on
different beats"; to NPR (2009): "The piano starts and keeps the rhythm of the
clave the whole time with one note. I'm basically holding and supporting the
tune and making embellishments."

**Devices (schema 1.5).** **Ostinato-independence** in the groove (the clave,
cáscara or bell held while kick and snare read Stick Control against it,
verified: his Drumeo notation, the podcast, his master-class and lesson
pages). **Timeline** in the groove and solos (the clave as the guide; his
master class on the cáscara/clave chapter builds "strategies for soloing",
verified). **Displacement** in the groove (Claveteo: the same clave from
different starting points, verified from his own words; it is the
arrangement's, and which beats is not given). **Cross-rhythm 3:2** in the
groove (eighth-note triplets on kick and snare against the cáscara and the
clave, exercises 16–18 of the Drumeo lesson; verified, but an exercise, not
shown on a record). None is in fills, solos or comping of a kind a poly fill
can be, so **the style has no poly fills.**

Leads not tagged: the MacArthur citation's "highly complex, polyrhythmic
structures" and Modern Drummer's "signature polyrhythmic independence" (press
phrases); Kevin Whitehead's "superimposing divergent beats" and Peter
Apfelbaum's "break, superimpose, or shift rhythms" (praise); DownBeat's
"odd-metered, odd-grouping, often metrically modulating compositions" (3 Sides
of the Coin, no part shown); Mel Minter's "strong cross-rhythms" on Song for
Chico (no ratio); Hudson Music's lesson "6/8 in a 4/4 Pulse" (title only, its
transcription paid for); the book's "manipulation of pulses and patterns to
create rhythmic illusions" (the book was not read). Blah Blah Blah's kick every
third sixteenth restarts in each bar (3+3+3+3+4), so it is not a grouping
across the bar. What Are the Odds? (15/8, 21/8, 27/8) is odd meter.

**What the style encodes.** Distinct from Horacio's: no clave on a pedal. The
claves play the clave as his lessons write it, on its own line; the right
hand plays the cáscara, the cowbell pattern or the 6/8 bell; the left hand
and the kick play the lesson's Stick Control lines under it, so the kick is a
voice, not a tumbao. Each Latin song keeps one clave and one direction. No
swing in the Latin songs; Blah Blah Blah slightly swung, as transcribed. The
`virtuosity` kit (a small club kit with its own toms and a foot hat, the
nearest pack kit to his 18-inch maple set). Fills are reconstructions: the
lesson lines' snare notes on the high toms, a rimshot into the 1. No
`polyFills` (above).

| Song                   | Year | Meter     | Tempo (quarter)                                 | Clave                        | What defines it                                                                | Source of the bars                                    |
| ---------------------- | ---- | --------- | ----------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Blah Blah Blah         | 2015 | 4/4 + 5/4 | 98–102 (DRUM! 100; songbpm 100)                 | none                         | a second line, bars of 4/4 and 5/4 in turn; kick every third sixteenth, buzzes | DRUM! Magazine transcription, 2015 (human, published) |
| Una Vez Más            | 2018 | 4/4       | 105–111 (songbpm 108 and 109, the half note)    | rumba 3-2 (his lesson's)     | the cowbell pattern over Stone's first pattern on the upbeats, or in eighths   | reconstruction from his Drumeo lesson (ex. 7, 12)     |
| Song for Chico         | 2018 | 4/4       | 90–96 (songbpm 93, the half note)               | rumba 2-3 (with his cáscara) | the cáscara over Stone's first pattern in eighths, or on the upbeats           | reconstruction from his Drumeo lesson (ex. 6, 11)     |
| The Triumphant Journey | 2018 | 12/8      | 136–143 (songbpm 93 read as the dotted quarter) | 6/8                          | the standard bell over kick and snare in turn, the sticking turned round       | reconstruction from his Drumeo lesson (ex. 19)        |

**Left out.** _Claveteo_ (2009), the device's own song: no tempo was found
(songbpm has no entry, Deezer's API gives none), and which beats the clave
starts on, and the "different meters" he puts it in, are not documented, so
writing it would be invention. _Si o Si_ and _Ilu-Uli_ (2009): reviews describe
them ("clings, claps, and clatters, rims and heads and muted cymbals"; "the
prog-rock big beat") but no bars. _Danzonish Potpourri_ (its 3/4 section),
_Out of the Bone_ ("Samba-like"), _Two for One_ (a drum vamp), _Tumba
Francesa_, _Danzón Santa Clara_ and _Conga Ingenua_: a style is named, no part
is, and his own lesson has no danzón, samba or conga pattern to build one
from. Blah Blah Blah's later bars (32nd-note buzzes, triplets, a seven-stroke
roll) are off the sixteenth grid; one buzz stands for the 32nds of the third
bar. Four songs, short of six to ten: the rest had no bars to read.

**Found on the way, not changed.**

- The Hudson Music "Afro-Cuban Concepts" pack (2008) and his book's
  cáscara/clave chapter are the two places a sourced grouping, displacement in
  the hands or a kit cross-rhythm in fills is most likely; both are paid for.
- The jazz-latin clave test (`jazz-latin.test.ts`) would hold `prieto`'s three
  clave songs as rumba 3-2, rumba 2-3 with the cáscara, and 6/8; Blah Blah Blah
  has no clave slot.
- songbpm reads Una Vez Más at 108 on the Big Band's page and 109 on his own.

## AI. Agbekor and mozambique (2026-10-15)

Phase 12-f, §7 C of the polyrhythm plan: two genre styles, `agbekor` and
`mozambique`. Neither is a drummer, so neither has a record, songs or poly
fills. The model gains `style:agbekor` and a summary for
`style:west-african`, and `style:mozambique` is corrected (see below).
Sources are in `drummer-model/sources/genre-styles.json`.

### Agbekor

**What it is.** An Ewe war dance from south-east Ghana and Togo, once called
Atamga, today performed for cultural presentations; a slow and a fast
section; the lead drummer calls the dancers' movements (Wikipedia, Agbekor).
Its music is Atsiagbekor, the subject of David Locke's dissertation (1978)
and of the Boston study group he founded, the Agbekor Drum and Dance
Society. Neither the dissertation nor his _Worlds of Music_ chapter on it
was read; the parts below come from Locke's public writing on Ewe music and
from sources that name Agbekor.

**How the time works.** Ternary-quadruple time: four main beats of three
pulses, twelve pulses to one turn of the bell. Locke's "metric matrix" holds
the four-feel (the dance), the six-feel (in Agbadza, the handclap) and the
three-feel at once; "a set of dotted notes may temporarily make 3:2 and 3:4
temporal structures" (Locke 2011). Six against four, three against two, is
"the first most useful cross rhythmic texture in the development of Anlo-Ewe
dance-drumming"; its "polyrhythmic variant" starts the six a pulse later
(Ladzekpo). Locke prefers "three _with_ two" to "three against two".

**The parts, and which are sourced for Agbekor.**

| Part             | What it plays (pulses 1–12)                                              | In BeatBreaker (12/8, step = 2 × pulse − 2)        | Source                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gankogui (bell)  | the standard pattern, 1 3 5 6 8 10 12; the low bell on 1 when slow       | cowbell, steps 0 4 8 10 14 18 22, accent 0, `held` | Locke, Agbadza ("pulses one, three, five, six, eight, ten and twelve"); Wikipedia (example: Atsiagbekor); UVic MUS 320 ("lower pitched bell on beat 1") |
| Axatse (rattle)  | "pa ti pa pa ti pa ti pa ti pa pa" from the bell's 2nd stroke: all but 2 | shaker, steps 0 4 6 8 … 22, the "pa"s accented     | Wikipedia, Ewe music; Locke, Yewevu ¶80 (no stroke after bell stroke one); Locke, Agbadza                                                               |
| Kagan            | the "ups": the 2nd and 3rd pulses of every beat                          | cross-stick, steps 2 4 8 10 14 16 20 22            | Burns ¶69 and note 61 (names Agbekor, Locke 1979); Locke, Agbadza ("a widely known kagan part")                                                         |
| Kidi             | response drum, in dialogue with the lead                                 | not written                                        | Wikipedia, Ewe drumming; no Agbekor theme read                                                                                                          |
| Totodzi, kloboto | "hemiola patterns" (a 2021 paper, through a search summary only)         | not written as such                                | unread: lead only                                                                                                                                       |
| Atsimevu (lead)  | calls, the "call to turn"                                                | the fills, left hand on the toms (reconstruction)  | Wikipedia, Agbekor; no call transcribed                                                                                                                 |
| The dance's beat | the four main beats                                                      | kick, steps 0 6 12 18                              | Locke (the dance makes the four-feel); Agawu via Wikipedia (main beats are the "dance feet")                                                            |
| The six-feel     | six even beats against the four (3:2), or a pulse later                  | hi-hat foot, steps 0 4 … 20, or 2 6 … 22           | Ladzekpo (both textures); Locke 1982, 2011; Wikipedia, Ewe music. Which Agbekor drum carries it: not sourced                                            |

**Devices, named.** The bell is a **timeline**, not a polyrhythm. The
kagan's ups are offbeat timing against the four-feel, not a cross-rhythm.
The **cross-rhythm** is the six-feel against the four-feel, **3:2** (six
against four); its 3:4 cousin, the three-feel (every four pulses) against the
four, is in Locke's matrix but no Agbekor part was found carrying it, so the
style does not write it. The plan's "4:3" is Locke's eight-feel against the
six-feel (Agbadza's kagan); not sourced for Agbekor, not written.

**What the style encodes.** 12/8 at 120–180 quarters: Burns gives 80–120 a
dotted quarter for Ewe dances at slow to moderate tempo (¶42); the meter
counts quarters. The `virtuosity` kit: the one pack kit whose percussion
lanes (cowbell, shaker) are recordings, with its own toms and foot hat, as
`afrocuban` uses. The right hand on the bell, `held`: in Ewe music the bell
never stops ("Listen to the bell", Locke), so a fill does not lift it and
the fills are the left hand alone. The left hand plays the kagan on the rim
(its "rim shot" timbre, Locke); the kick the four; the hi-hat foot the six,
or the six a pulse later. The feet make the 3:2. No ghosts, no crash (the
ensemble has no cymbal), no backbeat. Five fills, all reconstructions:
eighths in threes down the toms, three quarters over the last two beats
(the 3:2 itself, on the floor tom), a short pickup, a call on the high tom
answered on the floor tom, and a bar of pairs on the middle tom. The lead
drum calls inside the phrase too (`midFills` 0.4): the bell, rattle, kagan
and dance beat never change, so the calls are what one New differs from
the next in.

### Mozambique

**Two rhythms, one name.** Pello el Afrokan (Pedro Izquierdo) created the
Cuban mozambique in 1963 from the comparsa: congas, bombos, cowbells and
trombones, and the first popular band music to use rumba clave
systematically. Eddie Palmieri's New York mozambique (1965) was inspired by
it; "both rhythms are based on conga de comparsa drums, they have no parts
in common". Pello's is in rumba clave, Palmieri's in son clave, both mostly
in a 2-3 sequence (Wikipedia, citing Orovio, Peñalosa and Sanabria). The
New York bell, first played by Julito Collazo and then Manny Oquendo, "was
later adopted by drumset players"; Gadd plays it on _Late in the Evening_
(Wikipedia, citing Walden, "Gadd's Mozambique", _Modern Drummer_, Nov.
1987). It is the basic songo stick pattern without the stroke on beat 3
(Peñalosa, _Rumba Quinto_ p. 148, via Wikipedia).

**The bells, one bar = one clave** (as `son` is written: two bars of cut
time in one bar of sixteenths).

| Pattern                       | Steps                   | Clave                  | Source                                                                 |
| ----------------------------- | ----------------------- | ---------------------- | ---------------------------------------------------------------------- |
| Cuban (Pello) bell, low tone  | 0 4 7 12                | rumba 2-3: 2 4 8 11 15 | Wikipedia's figure and MIDI, from Changuito and Silverman (1998) p. 70 |
| Cuban (Pello) bell, high tone | 2 6 9 10 11 14 15       | rumba 2-3              | the same                                                               |
| New York bell                 | 0 2 4 5 7 9 10 12 13 15 | son 2-3: 2 4 8 11 14   | Wikipedia's "NY-style Mozambique bell pattern in 2-3 clave"            |

**The kit mozambique as taught.** The right hand plays the bell; "all we
need to do to complete the outline is play the other eighth notes on the
snare" (Best 2019): steps 1 3 6 8 11 14, whose last three are the clave's
three side. The bombo on the "and" of 2 of the clave's second bar is
"always present", of the first "often/usually", the ponche on 4 emphasised
(Bishop 2015); "start by putting it on the & of 2 of the second measure, or
of both measures" (Bishop 2018). Steps 11 and 3. Bishop: 2-3 son clave,
"usually the case on Palmieri's recordings". Gadd's version (the repo's
`late-in-the-evening`, Songsterr 424011): the left hand on the low tom at 6
and 11, the kick at 6 and 14, the hi-hat foot every beat (feet from
lessons). Malabe and Weiner's _Afro-Cuban Rhythms for Drumset_ has
"Mozambique on Drumset" and a "Steve Gadd Mozambique Pattern" (Alfred's
contents); the book itself was not read.

**Devices, named.** The clave and the bell are **timelines**. The kit
mozambique is **ostinato-independence**: four limbs on four fixed parts. No
part is in a different pulse, so it is not a polyrhythm.

**What the style encodes.** The New York mozambique, because it is the one
drummers play on the kit; the hint says Pello's is a different rhythm in
rumba clave. 2-3 son clave on the claves at fixed steps, another player's,
so nothing lifts or turns it. The bell on the cowbell, the right hand's: a
fill lifts it, as Gadd's fills go down the toms, so it is not `held`. Three
figures: the outline with the bombo in both halves; the three side on the
floor tom with the bombo in the second half (a reconstruction); Gadd's.
Two fills, reconstructions, with their accents on the clave's three side
(8, 11, 14). 110–128, half notes: machine estimates (Deezer) of Pello's
"Mozambique" 116.5 and "María Caracoles" 126.4, and _Late in the Evening_
118.5 (songbpm 119). No ghosts, straight eighths. The `virtuosity` kit, for
its recorded cowbell and claves.

**Found on the way, not changed.** `drummers/steve-gadd.json` derives his
mozambique from "Cuban mozambique (Pello el Afrokan) bell and conga parts";
Wikipedia says his bell is Palmieri's New York one, which has no parts in
common with Pello's. A `style:new-york-mozambique` in the model would let
his record say so. Pello's Cuban rhythm would make a second style
(`mozambique-cuban`, rumba clave, two-tone bell) if wanted.

**Left out.** Agbekor's fast section (no tempo source); the kidi, totodzi,
kloboto and atsimevu themes (no Agbekor transcription read); any Agbekor
kit adaptation by a kit teacher (none found: Hartigan's _West African
Rhythms for Drumset_ covers Sikyi, Adowa, Gahu and Akom).

## AJ. Gavin Harrison (2026-10-15)

Phase 12-g ([`polyrhythm-plan.md`](./polyrhythm-plan.md) §7 B). The
`harrison` style plays songs; his record is
`drummer-model/drummers/gavin-harrison.json`, schema 1.5.

**Which records are his.** Porcupine Tree's drummer from _In Absentia_ (2002)
to the 2010 hiatus and again from 2021 (_Closure/Continuation_, 2022); King
Crimson 2008 and 2013 on; The Pineapple Thief from 2016 (Wikipedia). Joined
Porcupine Tree "in early 2002 for their seventh studio album, _In Absentia_"
(Modern Drummer, 2004). Solo and duo: _Sanity & Gravity_ (1997), _Drop_ (2007)
and _Circles_ (2009) with 05Ric, _Cheating the Polygraph_ (2015, big-band
arrangements of Porcupine Tree songs) (Wikipedia; PopMatters). Only Porcupine
Tree records are used for songs. One credit note: _The Sound of Muzak_'s groove
was "originally programmed on a drum machine" by Steven Wilson; Harrison made
"hi hat changes and some ghost note additions" (Drumeo). The record has him
playing it.

**How he plays.** His books are a method of illusions: _Rhythmic Illusions_
has chapters on Displacement (types 1 and 2), Modulation (types 1, 2 and 3),
"Subdivision, formula & grouping", "Rhythmic scales & polyrhythmic groupings"
and "Related tempo"; _Rhythmic Perspectives_ on ostinato, "Polyrhythmic
theory", "Start displacements" (51 examples) and "Modulating inside formulas
and spacings" (contents, Médiathèque/PointCulture catalogue). Modern Drummer
(2004): the books explore "the cerebral aspects of metric modulation and beat
displacement concepts". In his words: "I'd write out a part starting in
different positions in the bar and come up with five different grooves...they
were the same groove but perceived differently" (Modern Drummer, 2006). Neil
Peart, in the foreword to _Rhythmic Composition_, recalls his method of
"displace that rhythm by a sixteenth note" and says the _Trains_ drumming
"gracefully smoothes over what could be a jagged combination of rhythms"
(Peart, 2014, transcript). Bruford: "the ability to move at will through
several parallel meters, whose relationship to the basic pulse can then be
said to be 'displaced' or 'modulated'" (Wikipedia, quoting Bruford). He calls
making an odd meter sound even **"overriding"**: the hat in eighths stressing
the quarter over an odd kick-and-snare cell (bonedo workshop). He tunes "for
microphones" and plays a 12" snare with the wires "really tight"; single
strokes on the toms (Batteria & Percussioni, 2010). He wants complex rhythm to
"sound musical and accessible to the listener - and not just 'clever'"
(guitarguitar, 2019).

**Devices (schema 1.5).**

- **Grouping** in the groove (verified): _The Sound of Muzak_ (_In Absentia_,
  2002), the kick and snare in a cell of seven sixteenths, 3+2+2, under the
  hat's eighths accented on the quarter (bonedo workshop); the Songsterr tab
  (human) writes 7/4 as four seven-sixteenth cells, kick on 1 and 4 of each,
  snare on 6, the hat accented on every quarter. Seven-sixteenth cells over
  a quarter pulse; not tagged as a 4:7 cross-rhythm, which no source names.
- **Displacement** in the groove (likely): his books' Displacement chapters
  and "start displacements", Peart's "displace that rhythm by a sixteenth
  note", Bruford, and his "same groove but perceived differently" (Modern
  Drummer, 2006). No record's displaced bar is named by a source read.
- **Metric modulation** (likely): his books' Modulation chapters; on
  _Cheating the Polygraph_ (2015) "metric modulation, and clever harmonies"
  to "seamlessly go from one tempo into another" between paired songs (his
  words, PopMatters, 2015). No ratio or bar is given.
- **Polymeter** in improvised sections, King Crimson live (likely): "one
  drummer plays (bass drum and muted crash cymbal together) in patterns of 7
  whilst the other drummer does the same thing but in patterns of 11" (his
  account of "thraking", Batteria & Percussioni, 2010, on Hudson Music). Two
  drummers; no record named.
- **Grouping** as method (likely): Drumeo's "Grooving in 3's, 4's and 5's",
  his lesson: hat foot in quarters, the kick on every third sixteenth, the ride
  in fives over the bar, snare backbeat. A lesson, not a record.

**Not tagged.** "Polyrhythmic madness" (Modern Drummer, 2008, on _Drop_) is
press. The books' "polyrhythmic groupings" and "Polyrhythmic theory" chapters
name no ratio read here. Leads from tabs alone, not tagged: _Harridan_'s chorus
(the crash and kick-snare in threes of sixteenths across 5/4, 0-3-6-9-12 then
16), _Futile_'s intro (dotted eighths over 8/4), _Anesthetize_ part 1's toms
accented 3+3+2 in eighths. _Halo_'s single 17/16 bar is an odd bar, not a
device.

**What the style encodes.** The `police` kit (the DRS kit with its snare
played fast and high, the nearest to his small, tight snares; its cymbals are
Paiste, his are dark Zildjian Ks). No swing, few ghosts, the hat in eighths
with the quarter accented. **No poly fills** (D56): his one device at bar
level, the sevens of _The Sound of Muzak_, is in the groove, so it is that
song's figure, four cells of 3+2+2 to the 7/4 bar; displacement, modulation
and Crimson's sevens against elevens rest on his method, not on a fill on a
record. Fills are single strokes down the toms, _Fear of a Blank Planet_'s
floor tom and snare, and _Halo_'s open hat, foot and snare (its 32nds as three
sixteenths). _Blackest Eyes_ fills for one beat only, the turnaround's pair,
so the snare on the "e" of 3 that both its bars have is never filled over;
_Harridan_'s eight-sixteenth snare crescendo is an intro, and runs longer
than the critic lets a snare, so it takes the style's single strokes down the
toms alone.

| Song                             | Year | Record                 | Meter | Tempo (quarter)                              | What defines it                                                         | Source of the bars                           |
| -------------------------------- | ---- | ---------------------- | ----- | -------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| The Sound of Muzak               | 2002 | In Absentia            | 7/4   | 92-96 (tab 94; karaoke-version ~95)          | kick-kick-snare in sevens of 16ths, hat accented on every quarter       | Songsterr 15884 (human)                      |
| Blackest Eyes (verse)            | 2002 | In Absentia            | 4/4   | 92-96 (tab 94; karaoke-version ~95)          | hat eighths, a snare on the "e" of 3 between the backbeats              | Songsterr 16042 (human)                      |
| Halo                             | 2005 | Deadwing               | 4/4   | 96-100 (tab 98; musiciwant 120, algorithmic) | open hat alone on 3, kick 1, "a" of 1, "and" of 2, "a" of 2, "and" of 3 | Songsterr 15089 (human)                      |
| Shallow                          | 2005 | Deadwing               | 4/4   | 84-88 (tab 86)                               | hard rock eighths; snare on the last 16th; a busier second bar          | Songsterr 15172 (human)                      |
| The Start of Something Beautiful | 2005 | Deadwing               | 5/4   | 156-164 (tab 160)                            | eighths only: hat foot under, snare on the "and"s of 2 and 4            | Songsterr 644873 (human); meter caveat below |
| Anesthetize (part 1, verse)      | 2007 | Fear of a Blank Planet | 4/4   | 106-114 (tab 110)                            | toms only, ghosted 16ths, accents 3+3+2 in eighths                      | Songsterr 50753 (human)                      |
| Fear of a Blank Planet (verse)   | 2007 | Fear of a Blank Planet | 6/4   | 158-166 (tab 163)                            | hat eighths loud-soft, snare on 2, 4 and 6, kick moving across 2 bars   | Songsterr 50744 (human)                      |
| Harridan                         | 2022 | Closure/Continuation   | 5/4   | 124-130 (tab 127)                            | hat quarters, snare on 2 and 5; the chorus crash in threes              | Songsterr 581744 (human)                     |

Tempos are each tab's (`automations.tempo`); Blackest Eyes and The Sound of
Muzak checked against karaoke-version.com ("variable (around 95 BPM)"). The
others were not cross-checked (songbpm's Porcupine Tree page lists only two
songs; musiciwant's Halo 120 is algorithmic and files it under the wrong album).

**Left out.**

- _Trains_: Songsterr 16040's only drum tracks are "Handclaps" and
  "Percussion"; no kit part to read. Peart's foreword praises its fills but
  gives no bars.
- _Futile_ (Songsterr 50736, human, 112): bars of 8/4, 9/8, 31/32 and 18/16
  (no 31/32 or 18/16 meter); the chorus's 7/8, in sixteenths, the grid holds,
  but its bars were not read.
- _Way Out of Here_ (Songsterr 50732, human, 112): 6/8 in sixteenths, which
  the grid holds, but with triplet-32nd drags it does not, and its bars were
  not written out. Drumeo's "6/8 double bass herta groove" from it is a solo
  idea, and hertas at this tempo would be 32nds.
- _Deadwing_ (Songsterr 50728): the track read at index 9 had no drum notes;
  not pursued.
- _Bonnie the Cat_, _Nil Recurring_, _Cheating the Polygraph_, King Crimson
  and The Pineapple Thief: no human tab or bar-level description found or read.
  King Crimson's parts are split across two or three drummers.
- _The Start of Something Beautiful_ is kept with a caveat: he describes "a
  rhythm in 9/8 ... that then progressed to a more energetic 5/8 for the
  chorus" (guitarguitar, 2019); the tab writes the verse and chorus as 5/4 at
  160 and the 9/8 as hats only. A 5/4 bar of eighths at 160 sounds as two 5/8
  bars at 320 eighths would, so the bars hold either way; the section names
  are the tab's.

**Found on the way, not changed.**

- The Songsterr part JSON is readable at
  `dqsljvtekg760.cloudfront.net/<songId>/<revisionId>/<image>/<partIndex>.json`
  with ids from `songsterr.com/api/meta/<songId>` (which also gives
  `aiGenerated`). All tabs used say `aiGenerated: false`.
- _Rhythmic Composition_ (Hudson, 2014; Branam's transcriptions of 20 Porcupine
  Tree parts with his commentary, including Blackest Eyes, Trains, Sound of
  Muzak, Futile, Halo, Anesthetize, Nil Recurring) would turn the device leads
  above into sourced devices and the tabs into published transcriptions. Not
  read.
- Both _Fear of a Blank Planet_ (6/4 at 163) and _The Start of Something
  Beautiful_ (5/4 at 160) are under their meters' ceiling of 190, and every
  song was generated over 40 seeds with none unplayable.
- A snare figure the songs share off the backbeat (_Blackest Eyes_' "e" of 3)
  is read as a backbeat by the generator, so a half-bar fill that drops it
  fails the critic. The song's fill is one beat long instead.

## AK. Terry Bozzio (2026-10-15): searched, not sourced

Phase 12-g ([`polyrhythm-plan.md`](./polyrhythm-plan.md) §7 B, D57). **Not
added.** His sourced devices live in pieces the grid cannot hold: the
ostinato under melodies on tuned toms (the grid has no pitch) and Zappa's
nested tuplets in 32nds and 64ths. The songs it can hold (Missing Persons,
Zappa's rock songs, U.K., _Guitar Shop_) have no device named by any source
read, and their human tabs are plain 4/4 rock time. He stays a stub on the
map (Tomas Haake cites him). The rule working, not a shortfall (plan §10).

**Which records are his.** Zappa's drummer from April 1975 to February 1978:
_Bongo Fury_ (1975), _Zoot Allures_ (1976), _Zappa in New York_ (recorded
December 1976, released 1978), _Sheik Yerbouti_ (1979), and later _Thing-Fish_
(1984) (Wikipedia). U.K.'s _Danger Money_ (AIR, November 1978 – January 1979)
and the live _Night After Night_ (1979) (Wikipedia, Danger Money; Drummer
Cafe). Missing Persons, which he co-founded: _Spring Session M_ (October 1982;
Bozzio credited "vocals, keyboards, synthesizers, drums, percussion"),
_Rhyme & Reason_ (1984), _Color in Your Life_ (1986) (Wikipedia). _Rhyme &
Reason_ blended "Simmons triggering Linn, digital sounds blended with the
analog electronics, my Paiste cymbals and some Tama drums and some Roto Toms",
and he programmed LinnDrum parts (Modern Drummer, December 1984, Mattingly):
that record's drums are partly programmed and should not be used. _Jeff
Beck's Guitar Shop_ (1989), co-written and co-produced with Beck and Tony
Hymas, Grammy-winning (Wikipedia). Bozzio Levin Stevens: _Black Light
Syndrome_ (1997), _Situation Dangerous_ (2000) (Wikipedia). Solo: _Solo Drum
Music I & II_, _Drawing the Circle_, _Chamberworks_ (Wikipedia; Drummer
Cafe).

**How he plays.** Zappa wrote _The Black Page_ for him, "originally a solo
piece for drums" (Wikipedia). It is "written in common time with extensive
use of tuplets, including tuplets inside tuplets", a quarter-note triplet
"in which each beat is counted with its own tuplet of 5, 5 and 6"
(Wikipedia, The Black Page). The human Songsterr tab (1105085, 29 bars, 60
to the quarter) has the hi-hat foot in quarters under the hands throughout,
32nds and 64ths, and tuplets of 3, 5, 6, 7 and 11, some nested. Modern
Drummer's clinic on Zappa's rhythms (Saydlowski, December 1984) names "odd
rhythmic groupings—quintuplets, septuplets, etc.—played over standard
meters" on _Manx Needs Women_ and _The Black Page_ (both _Zappa in New
York_). On _Dancin' Fool_ (_Sheik Yerbouti_) Todd Bishop transcribed the
opening, the break and the "yowza" interlude: Rototoms, right hand on a lower
tom and left on a higher one, hi-hats "half-open much of the time", two bass
drums for the doubles (the PDF was not read). On Missing Persons the drum
parts were arranged, not timekept; _Clandestine People_ is "a song in which
the drum melodies came first. The guitar line and other parts were
constructed around the drum beats" (Modern Drummer, December 1984, which
printed his part; the notation could not be read from the OCR). Of U.K.'s
_The Only Thing She Needs_ (5/4), after the instrumental "he's content to
play a straight 4/4 beat for the remaining two and a half minutes" (The
Progressive Aspect, 2019): a reviewer's line about feel, not a polymeter.
From 1990 to 1995 he "developed ostinato-based drum solo compositions" and
made _Melodic Drumming and the Ostinato_ Vols. 1–3 (Wikipedia; Drummer
Cafe); Alfred: "self-accompaniment with ostinato patterns ... melodic,
harmonic, and even two-part contrapuntal techniques". His Drum Channel
_Rhythm_ courses set one limb's figure as the ostinato under permutations in
the others ("Triplet Figures – Right Hand 9 Basic Permutations, Right Foot
Fig. 5 as Ostinato"). To Rolling Stone (2014, via a reprint) he accompanies
himself "the same way a pianist would — with his left hand playing the bass
notes and the right hand soloing against it", on toms "tuned to chromatic and
diatonic pitches".

**Devices (schema 1.5), as found.**

- **Ostinato-independence**, in solos (verified as method: his own
  _Melodic Drumming and the Ostinato_ and Drum Channel lessons; Wikipedia ties
  it to his solo compositions). No named solo piece's foot ostinato was found
  in words or notation, and the hands carry pitch. Not grid-holdable as a song.
- **Ostinato-independence** in _The Black Page_ drum solo (hat foot in
  quarters under the hands; likely: a human Songsterr tab, not a published
  transcription). The hands are 32nds, 64ths and nested tuplets: off the grid.
- **Cross-rhythm** (tuplets: quintuplets, septuplets over the beat), on
  _Manx Needs Women_ and _The Black Page_ (likely: Modern Drummer's clinic
  describes them; the figures are Zappa's written parts). Nested tuplets are
  more than one `TupletSpan` level can hold; _Manx Needs Women_'s figure was
  not seen in notation.
- **Polyrhythm over ostinatos**: Drum Channel and Alfred say "ostinatos,
  polyrhythms" in the _Solo Drums_ DVD contents, but no ratio or record is
  named. Not tagged. (A "3-over-4 and 5-over-4 over a locked ostinato" line
  found on moosedrumapp.lovable.app is an AI-generated app page: not used.)

**The search.** Nothing names a device in a Missing Persons, U.K., _Guitar
Shop_ or Bozzio Levin Stevens song. Human Songsterr tabs read: _Destination
Unknown_ (5343064), _Walking in L.A._ (753414), _City of Tiny Lites_ (68251):
plain 4/4 time with eighths on the hat, the kick in fours or on 1 and 3. AI
tabs, not used: _Destination Unknown_ (681360), _Words_ (live, 1047171; and
5569049), _Noticeable One_, _Windows_ (992038), _Mental Hopscotch_,
_Clandestine People_, _U.S. Drag_, _Walking in LA_ (1020965), U.K.'s _Danger
Money_, _Rendezvous 6:02_, _The Only Thing She Needs_, _Caesar's Palace
Blues_, _Nothing to Lose_, _Carrying No Cross_, Beck's _Savoy_, Zappa's
_Disco Boy_. Leads not read: the _Clandestine People_ notation (MD December
1984, p. with the interview; the djvu text has no notation); Bishop's
_Dancin' Fool_ PDF; his own study of the _U.S. Drag_ part in the Alfred
_Solo Drums_ DVD (2006), a beat he was "frequently asked at clinics to
demonstrate" (search summary only); the _Rhythm 2_ workbook PDF from Drum
Channel (downloaded, could not be rendered); _Melodic Drumming and the
Ostinato_ booklets.

**What a style would encode, if a later pass sources a device in a song.**
Straight 16ths or eighths in 4/4, no swing, half-open hats, toms played as
pairs (right hand low, left high: Bishop), two kicks for doubles, a
`virtuosity`-like big kit is wrong for the bands; a rock kit with Paiste
cymbals for 1975–86. The obvious poly fill, a quintuplet or septuplet span
over the beat (Zappa), is sourced only to written Zappa parts, which are the
composer's, not his habit.

**Song candidates the grid can hold (no device; kept for reference).**

| Song                     | Year | Record           | Meter | Tempo (quarter)     | What defines it                                     | Source of the bars        |
| ------------------------ | ---- | ---------------- | ----- | ------------------- | --------------------------------------------------- | ------------------------- |
| Destination Unknown      | 1982 | Spring Session M | 4/4   | 120 (tab; estimate) | hat eighths, kick 1 and 3, snare 2 and 4, tom 16ths | Songsterr 5343064 (human) |
| Walking in L.A.          | 1982 | Spring Session M | 4/4   | 138 (tab)           | crash-and-kick intro hits; kick in fours under hats | Songsterr 753414 (human)  |
| City of Tiny Lites       | 1979 | Sheik Yerbouti   | 4/4   | not read            | kick and hat foot in quarters, 16th kick pickups    | Songsterr 68251 (human)   |
| Dancin' Fool             | 1979 | Sheik Yerbouti   | 4/4   | not found           | tom pairs, half-open hats, double kicks             | Bishop (PDF not read)     |
| The Only Thing She Needs | 1979 | Danger Money     | 5/4   | not found           | 5/4, double bass in the instrumental                | description only          |

**Left out.** _The Black Page #1_ (drum solo): 32nds, 64ths and nested
tuplets at 60. _Manx Needs Women_: quintuplets and septuplets, figure not
seen. His solo pieces (_Africa_, _5 Flute Loops_ and others): the melody at
pitch is the point. _Rhyme & Reason_ songs: LinnDrum and Simmons programming
(MD 1984). _Words_, _Mental Hopscotch_, _Windows_: AI tabs only.

**Found on the way.** None of Zappa's Bozzio-era tuplet writing fits one
level of `TupletSpan`; nested tuplets would need spans inside spans.

## AL. Roy Haynes (2026-10-15)

Phase 12-g ([`polyrhythm-plan.md`](./polyrhythm-plan.md) §7 B). The `haynes`
style plays songs; his record is `drummer-model/drummers/roy-haynes.json`,
schema 1.5.

**Which records are his.** Born in Roxbury, Boston, on 13 March 1925 (PAS
Hall of Fame, correcting the old 1926); died 12 November 2024 (Wikipedia).
With Lester Young 1947–49, Charlie Parker 1949–52 and Sarah Vaughan 1953–58;
in the 1960s he often subbed for Elvin Jones in Coltrane's quartet
(Wikipedia). Credits were checked for every record used: _Now He Sings, Now
He Sobs_ (Solid State, recorded March 1968 at A&R, released December 1968:
Corea, Miroslav Vitouš, Haynes; _Windows_ is one of the 1988 CD's bonus tracks;
Wikipedia), _It's Time!_ (Jackie McLean, Blue Note, recorded 5 August 1964,
released 1965: Charles Tolliver, Herbie Hancock, Cecil McBee, Haynes;
Wikipedia), _Cracklin'_ (New Jazz, 6 April 1963: Booker Ervin, Ronnie
Mathews, Larry Ridley; Wikipedia), _Cleopatra Feelin' Jazzy_ (Paul Gonsalves,
Impulse!, 1963: Hank Jones, Dick Hyman, Kenny Burrell, George Duvivier,
Haynes, Manny Albam percussion; Wikipedia, which spells the tune _Bluz for
Liz_) and _Out of the Afternoon_ (Impulse!, May 1962: Roland Kirk, Tommy
Flanagan, Henry Grimes; Wikipedia).

**How he plays.** "Snap Crackle" named his snare sound in the 1950s
(Wikipedia); he credited the phrase to George Shearing and Al McKibbon and
said "I never analyzed it" (PAS). He does not keep 2 and 4 with the hi-hat
foot: "I can't even do that if I tried ... I just put my foot on the side, and
play it when I want to play it" (Panken interviews); Scott K. Fish has him
saying he never could hold strict 2 and 4, so the foot became a free voice.
"I dance around the 2 and 4, but it's still there ... design around it"
(Panken). Mingus to him: "you didn't play the beat, you _suggested_ the beat"
(Modern Drummer, Gitler, 2004). Bishop, across his transcriptions: "lots of
unisons, lots of linear things, not a lot of layered independence"
(_Bad News Blues_ 01); the cymbal "a dotted 8th/16th interpretation", "light
backbeats", accents on "the &s of 4, relatively fewer &s of 3", the snare and
bass drum together with "the bass [accented] and ... the snare [ghosted]"
(_Bad News Blues_ 02, 03); on _Bluz for Liz_ he "frequently punches the & of
3, or & of 3/& of 4 with a buzzed stroke", "splashes the hihat with his foot",
the bass drum "sparse"; both hands and both feet "often ... in unison".
Rampih: eighths and sixteenths "straight and in front", triplets "laid back,
open and wide"; the hi-hat "a separate voice" in solos. On _New Arrival_
"most running eighth notes are straight", the syncopations swung (Bishop).
His flat ride: "the cymbal that I used on 'Now He Sings, Now He Sobs' ... was
a flat ride Paiste" (Panken); Iverson calls it "his famous flat ride".

**Devices (schema 1.5).**

- **Polymeter 3/4 over 4/4**, in comping (verified). _Matrix_: "overlapping
  meters atop the piece's 4/4 pulse, such as 3/4 and 6/4", the threes marked on
  ride, hi-hat or snare; example 8 (bars 105–109) has the hi-hat marking
  three-beat units while the snare plays dotted quarters (Huopainen, 2024).
  _It's Time_: "The tune is in 4, but Haynes is playing with a strong broken up
  3 feel all the way through", "meter-within-meter", phrases of "two, three, and
  four beats" (Bishop; the PDF was not read).
- **Polymeter 6/4 over 4/4**, in comping (verified): _Matrix_ bars 24–32, "a
  6/4-meter pattern over the 4/4 pulse for eight measures on his ride cymbal",
  backed by the snare, resolved by a snare-and-bass-drum accent (Huopainen,
  example 7). The ride's rhythm inside the six was not legible in the text read.
- **Polymeter 5/4 over 4/4**, in comping (verified): _Matrix_ bars 61–68 and
  145–152, the hi-hat foot in "a 2-3 clave-type division", two quarters then
  three, against snare dotted quarters and the ride (Huopainen, example 9).
  The thesis's "clave-type" is a 2+3 grouping of quarters, not a clave: it is
  tagged polymeter, not timeline.
- **Cross-rhythm 2:3** (dotted quarters over 4/4), in comping (verified):
  _Matrix_ bars 5–8 (ride, snare and bass drum, answering the piano), 69–72,
  77–84 (snare only), 117–121 (snare, ride, hi-hat) and 185–193 (six bars)
  (Huopainen §5.1.1, "a three-eighth-note phrase ... a polyrhythmic
  phenomenon"). Tagged as Tony Williams' _Vertigo_ dotted quarters were (§AC).

Confidence note: Huopainen's thesis is a full transcription of the head and
the piano-solo comping, with bar numbers and limbs; its text was read in full
through a text extraction, but the notation images were not seen. Bishop's
_It's Time_ is his description; the PDF was not read (as for Roach, §AG).

**Not tagged.** "Broken time" (PAS playlist, _Matrix_, _Yardbird Suite_) is a
feel, not a device. Accents on the "and" of 4 / "and" of 1 (_Bad News Blues_)
are syncopation. Huopainen's hi-hat accent moving "from beat 1 to beat 3" in
example 8 is the 3/4 cycle against the bar, not a separate displacement. No
**ostinato-independence**: Bishop says the opposite, unisons and linear
playing. No **hemiola** in his waltzes: Bishop's _Windows_ lesson names
exaggerated accents "in odd places", "triplets between the snare and bass
drum" and open ruffs, but no 2:3; Coltrane's _My Favorite Things_ (Newport
'63) "how to play in three" (PAS playlist) names no ratio. Coltrane said he
and Elvin could "spread out the rhythm" (Haynes to Panken): praise.

**How he differs from the roster's jazz drummers.** Elvin Jones's sourced
devices are triplet-based (the waltz 2:3, three- and five-beat phrases over
layered triplets). Tony Williams' threes are a 3/4 cycle on the cymbal at
speed and his 7/4 on _So What_, plus metric modulation. Max Roach phrases in
3/4 in comping and breaks over a foot ostinato in solos. Haynes's polymeters
move between limbs, and the **hi-hat foot** can carry one: the 5/4 on the foot
in _Matrix_ has no counterpart in the roster. His feet and hands mostly
**double** each other rather than layer (Bishop), his eighths are near-straight
at speed, and he works off the flat ride's dry, unwashed pulse.

**What the style encodes.** Default `4/4-8`, near-straight (swing 6–20 at
260–290; only _Snap Crackle_, swung, follows the tempo curve); the ride on quarters with its skip and no bell, for the flat ride;
the hi-hat foot free, not a backbeat lane (no backbeats at all: the snare
comps); ghosts on the "and"s of 4, fewer on 3; the bass drum sparse, in
unison with the snare. Kit `virtuosity`. **Poly fills** in comping, counted
back from the bar line to land on the 1, on _Matrix_ and _It's Time_ only,
the two records they are sourced on: the **3/4 polymeter** (bass drum and
foot together, the snare on the "and" between) and the **2:3** dotted
quarters on snare and bass drum. The **6/4** and **5/4** cycles are
_Matrix_'s `crossRhythms`, since two cycles of either are longer than a poly
fill may be; a cycle is one stroke each time round, so the 5/4 marks its
first beat and not the 2+3 inside it. _It's Time_'s threes are a
`crossRhythms` every three beats over three bars, at 0.9: "all the way
through".

| Song           | Year | Record                         | Meter | Tempo (quarter)                                         | What defines it                                                                           | Source of the bars                                                      |
| -------------- | ---- | ------------------------------ | ----- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Matrix         | 1968 | Now He Sings, Now He Sobs      | 4/4-8 | 280–296 (Huopainen 288; songbpm 120, wrong)             | flat ride, broken time; 3/4, 6/4 and 5/4 cycles, the 5/4 on the hat foot; dotted quarters | Huopainen's transcription (thesis text; notation not seen)              |
| It's Time      | 1964 | It's Time! (Jackie McLean)     | 4/4-8 | 260–272 (Bishop 266)                                    | "broken up 3 feel all the way through"; unisons, sparse hat, near-straight eighths        | Bishop's description (PDF not read)                                     |
| Bad News Blues | 1963 | Cracklin'                      | 4/4-6 | 150–170 (estimate)                                      | dotted-8th cymbal sketching a shuffle, light backbeats, accents on the "and" of 4         | Bishop's description of three transcriptions (PDFs not read)            |
| Bluz for Liz   | 1963 | Cleopatra Feelin' Jazzy        | 4/4-6 | 120–140 (estimate)                                      | buzzed accents on the "and" of 3 / "and" of 4, soft hat-foot splashes, sparse bass drum   | Bishop's description (108 bars; PDF not read)                           |
| Windows        | 1968 | Now He Sings, Now He Sobs (CD) | 9/8   | 260–280, i.e. 175–185 a beat (songbpm 181, algorithmic) | waltz; exaggerated accents in odd places; triplets between snare and bass drum            | Bishop's lesson page; reconstruction                                    |
| Snap Crackle   | 1962 | Out of the Afternoon           | 4/4-8 | 230–260 (estimate)                                      | orchestrated drum intro; solo of 16th calls and answers, then offbeat-eighth tom figures  | reconstruction (Kurtz, jazz.com; Rampih transcribed the solo, not read) |

**Left out.** _Steps_, _What Was_ and _Now He Sings, Now He Sobs_ (title
track): Drumming Patterns sells transcriptions of his comping on each (and
Steve Hatfield's free _Matrix_ PDF exists), but none could be read and no
description of his part was found; songbpm's 109 for the title track is
algorithmic. _In Walked Bud_ (Monk, 1958): "the classic example of melodic
drumming" (Bishop), a solo on the melody's rhythm; the transcription is in a
paid e-book and no tempo was found. _New Arrival_ (Nat Adderley, 1955) and
_G.W._ (Dolphy, _Outward Bound_, 1960): Bishop transcribed an intro, solo and
fours, not time; no tempo. _Sugar Ray_, _Our Delight_ (_We Three_, 1958) and
_Moon Ray_: praise of the timekeeping and solos, nothing on the bars.
_My Favorite Things_ (Newport '63): "how to play in three", no bars or tempo.
Hi-hat foot "splashes" and snare buzzes have no lane value: written as foot
notes and accents.

**Found on the way, not changed.**

- A `crossRhythms` cycle is one stroke each time round, so _Matrix_'s 2+3
  inside the five-beat cycle cannot be written; a cycle with a rhythm of its
  own would hold it.
- A hi-hat foot that is a free voice, not `backbeatLane: 'hf'`, may want a
  style flag; Roach and Hoenig both put the foot on 2 and 4.
- Huopainen's thesis cites Riley's _Beyond Bop Drumming_ (1997); Riley was
  not read here.

## AM. Jack DeJohnette (2026-10-15)

Phase 12-g ([`polyrhythm-plan.md`](./polyrhythm-plan.md) §7 B). The
`dejohnette` style plays songs; his record is
`drummer-model/drummers/jack-dejohnette.json`, schema 1.5.

**Which records are his.** Born in Chicago on 9 August 1942, died in
Kingston, New York, on 26 October 2025 (Wikipedia; NPR). Piano from age four
and at the Chicago Conservatory, then drums (PAS Hall of Fame). In New York
from 1966 (PAS). Credits for every record used:

- Jackie McLean, _Jacknife_ (Blue Note; recorded 1965, released 1975). Bishop
  calls it "his first major recording at age 24".
- Freddie Hubbard, _Polar AC_ (CTI, 1975). The title track was recorded on 16
  September 1971 with DeJohnette; the other tracks have Lenny White and Billy
  Cobham (Wikipedia, Polar AC).
- George Benson, _Beyond the Blue Horizon_ (CTI). The year is from memory
  (1971); Conran cites a CBS reissue of 1987.
- Miles Davis, _Live at the Fillmore East_ (Columbia; Bishop's header). The
  recording date and release were not checked.
- Lee Konitz, _Satori_ (Milestone; Bishop's header, 1974).
- Stan Getz, _My Foolish Heart: Live at the Left Bank_. Recorded 20 May 1975
  in Baltimore with Richie Beirach and Dave Holland, released on Label M in
  2000 (PopMatters; AAJ news).
- Special Edition, _Irresistible Forces_ (Impulse!; Bishop's header, 1987).

Charles Lloyd's _Forest Flower_, _Bitches Brew_, _Live-Evil_, the Jarrett
Standards Trio and Gateway are his too (Wikipedia; PAS). No song here comes
from them, for want of bars (see "Left out").

**How he plays.** He called it "multi-directional music" (PAS). NPR says he
built it from Roy Haynes and Rashied Ali: rather than anchoring the time on
the ride, he spread the emphasis round the kit, "earthy and elastic".

He calls his time "washing machine time", "clothes never hitting the bottom
of the machine at the exact same time per revolution" (Riley, _Beyond Bop
Drumming_, via Conran p. 8). He also says "you are playing dialogues with
yourself as well" (Riley p. 44, via Conran).

Conran's thesis (St. Francis Xavier, 2024) transcribes ten records. On
_Picture 3_ (_Pictures_, ECM, 1977) the time is "a two-beat phrase; four,
three-beat phrases; and then another two-beat phrase" (p. 9). A "three beat
ride phrase" recurs in the solos on _Boo Ann's Grand_, _Climax_ and
_Billie's Bounce_ (pp. 45, 52), traced to Tony Williams' _Madness_ (Bishop,
via Conran). His phrasing "does not adhere to the measure as much as Jones
does" (p. 18). He leaves the time to the hat foot under brushes and uses the
hat as a comping voice (Conran; Burns).

Bishop's grooves show a wide range:

- "an Elvin-like groove, very repetitively" (_Soft Blue_) and "a very Elvin
  Jones-like mode" (_On the Nile_);
- a straight-eighth "mostly-linear snare drum and bass drum" groove, which
  Bishop calls a "CTI feel" (_Polar AC_);
- "non-independent" Stone-type sticking, the cymbal with the bass drum
  against the snare (_Directions_);
- a bright samba (_Fiesta_);
- a bossa with "a tresillo-type rhythm on the bass drum" (_Gentle Rain_);
- repeated grooves in turn on Special Edition's _47th Groove_.

His book with Charlie Perry, _The Art of Modern Jazz Drumming_, has a
"meter-within-meter" chapter: "mostly, playing 3/4 ideas in a 4/4 setting"
(Bishop's review).

**Devices (schema 1.5).**

- **Polymeter**, in comping, time and solos (verified). On _Picture 3_ the
  ride makes four three-beat phrases in a row, a 3/4 cycle over three bars
  of 4/4 (Conran, fig. 1.1). The three-beat ride phrase recurs in the solos
  (Conran). His method is the same idea: "meter-within-meter … 3/4 ideas in
  a 4/4 setting" (DeJohnette and Perry, through Bishop's review). Bishop
  also calls patterns 7 and 19 from his _Directions_ and _Climax_
  transcriptions "polyrhythmic/polymetric patterns that can be played over
  two or more bars of 4/4".
- **Cross-rhythm 3:2**, in comping (verified). On _Nardis_ (Bill Evans at
  the Montreux Jazz Festival, 1968), mm. 17–20 have "a quarter note triplet
  figure" on the high tom against the melody's eighths. In mm. 21–24 the
  ride anticipation is "another example of the rhythmic hemiola or three
  over two ratio" (Burns, St. Francis Xavier, 2024, pp. 32–33). The
  transcription is Burns's own.
- **Cross-rhythm 5:4**, in an intro and fills (verified as transcribed).
  Bars 1–5 of _Directions_ are eighth-note quintuplets on the snare, with
  the cymbal and bass drum at the head of each group: five in the time of
  four eighths (Bishop's transcription). Bishop hedges on intent: "he may
  have worked out the 5s, or maybe he's thinking something else and is just
  pushing the rhythm around."

**Not tagged.**

- _Jacknife_'s B section, "a ride pattern in three against the 4/4 pulse,
  creating a hemiola for the first two bars" (Burns p. 30). Whether this is
  dotted quarters (2:3) or a three-beat cell (polymeter) is in her fig. 4,
  which was not readable. Hemiola is a triple-meter term here. It is a lead.
- Conran's "displaces" (_Foxy Trot_, _Boo Ann's Grand_). It means moving an
  idea round the kit or masking a beat, not a figure shifted by a stated
  subdivision. It is a lead.
- _Directions_' groove, which Bishop calls "non-independent", so it is not
  ostinato-independence.
- _Mr. Clean_'s "32nd note quintuplets", a lick and off the grid.
- The press's "multi-directional" and "polyrhythmic comping" (Burns's
  summary of Elvin, not of him).

**How his devices differ from the roster's jazz drummers.**

- **Elvin** (§AC): the waltz 2:3 hemiola, with phrases that keep to the
  measure. DeJohnette's mixed two-, three-, four- and five-beat phrases
  cross it (Conran).
- **Tony Williams**: steady 3/4 and 7/4 cycles and metric modulation.
  DeJohnette's three-beat ride phrase is Tony's (Conran), but sits inside
  irregular phrase lengths, and no modulation of his is sourced.
- **Roach** (§AG): composed theme-and-variation solos over foot ostinatos,
  and 3/4 phrasing in 4/4. DeJohnette shares the 3/4-in-4/4, but his
  sourced cross-rhythms (quarter-note triplets on a tom in comping, and
  quintuplet eighths) are his alone in the jazz roster.
- **Roy Haynes** (§AL): NPR and Burns (via Metheny) name him as
  DeJohnette's model for spreading the time round the band and the kit.

**What the style encodes.** The `virtuosity` kit (his are many small toms
tuned high; the grid's three hold three). Swing by song: the triplet grid for
_Soft Blue_ and _On the Nile_, straight for the bossa, samba and Special
Edition, swung eighths for _Green Dolphin St_. `fill: 'comp'`, no backbeat:
his foot moves and the snare comps. **One poly fill**, the three-beat phrase
over the 4/4 (polymeter, verified), on _Green Dolphin St_, the one swing song
fast enough to want it, as a cell of three beats counted back from the bar
line. _Soft Blue_ draws none ("he virtually never deviates", Bishop) and
fills rarely. **The 3:2 and 5:4 are in the record but on no song**: _Nardis_
has no tempo and its figure was not read, and _Directions_ is left out (below).

| Song                | Year | Record                                 | Meter | Tempo (quarter)                                    | What defines it                                                              | Source of the bars                             |
| ------------------- | ---- | -------------------------------------- | ----- | -------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------- |
| Soft Blue           | 1965 | McLean, _Jacknife_                     | 4/4-6 | 150–160 (Bishop 157)                               | Elvin-like two-bar groove, rim click on 2, triplet on the floor tom          | Bishop transcription (image read)              |
| On the Nile         | 1965 | McLean, _Jacknife_                     | 9/8   | 175–190, i.e. 117–127 a beat (Bishop ♩=122 in 3/4) | dotted-quarter feel, accents on 1 and the "and" of 2, triplet pickup on toms | Bishop transcription (image read)              |
| Gentle Rain         | 1971 | Benson, _Beyond the Blue Horizon_      | 4/4   | 114–120 (Bishop 117)                               | ride eighths, sparse rim clicks, a tresillo on the bass drum                 | Bishop transcription (image read, approximate) |
| On Green Dolphin St | 1974 | Konitz, _Satori_                       | 4/4-8 | 195–203 (Bishop 199)                               | duo swing, snare on the "and"s, the foot moving                              | Bishop transcription (time bars only)          |
| Fiesta              | 1975 | Getz, _My Foolish Heart_ (Left Bank)   | 4/4   | 126–134 (Bishop, half note = 130)                  | samba: the bass drum on 1 and the "a", bell figure, tom answers              | Bishop transcription (image read)              |
| 47th Groove         | 1987 | Special Edition, _Irresistible Forces_ | 4/4   | 112–118 (Bishop 115)                               | two grooves: hat quarters over kick pairs; bell on the "and"s, snare on 2, 4 | Bishop transcription (image read)              |

**Note on _Directions_.** Bishop marks ♩=121 under ¢.

- If that is the quarter, each ¢ bar is one bar of `4/4-8` at 121.
- If it is the half note (cut time is counted in halves), two ¢ bars make one
  bar of `4/4` sixteenths at 121.

The lane strings below are the same either way. Listen to the record before
choosing.

**Left out.**

- _Directions_ and _Polar AC_: their linear snare and bass drum, read from
  Bishop's images, strike all but one step of every bar, and the critic asks
  a quarter of each bar for air (no kick or snare), so neither ever plays.
  Thinning the bars would change the transcription, so they are left out
  (the Lombardo rule, § U). _Directions_ is where the 5:4 is, so no song
  plays it yet.

- _Nardis_ (the 3:2) and _Picture 3_ (the polymeter): no tempo in either
  thesis, and the thesis figures could not be read.
- _Jacknife_: no tempo, and fig. 4 unread.
- _Timeless_ (Abercrombie, ECM): brushes over a three-bar vamp of 4/4, 4/4,
  6/4. A figure is one or two bars, and no tempo is marked.
- _Mr. Clean_ (Hubbard): 32nd-note quintuplets.
- _Boo Ann's Grand_ (about 241): a solo, triplet-based.
- _Backwoods Song_ (Gateway): rolls in 32nds, no tempo.
- _Forest Flower_, _Bitches Brew_, _Live-Evil_, the Jarrett standards,
  _Zoot Suite_ and _Third World Anthem_: no transcription or bar-level
  description was found.
- _On Green Dolphin St_'s triplet comping (bars 8, 13–20, 25–36): at 199 it
  is past `4/4-6`'s ceiling (190). Only its eighth-note time bars are used.

**Found on the way, not changed.**

- Bishop posts his transcriptions as images, and they can be read note for
  note. His free PDFs (pdxdrummer.com) of _Climax_, _Mr. Clean_, _Boo Ann's
  Grand_ and _Backwoods Song_ would add more.
- Burns's and Conran's figures (_Nardis_, _Jacknife_, _Picture 3_) would
  give the devices' own songs bars, once a tempo is taken from the records.
- The critic's air rule refuses a linear groove that fills the bar
  (_Directions_, _Polar AC_). A linear groove is a groove; a flag for one
  would let them in, and the 5:4 with them.
- `4/4-6` stops at 190. Swing at 199 with triplet comping (_Green Dolphin
  St_) has no meter.
- Max Roach's record already lists DeJohnette as `influenced` (§AG).

## AN. Antonio Sánchez (2026-10-15)

Phase 12-g ([`polyrhythm-plan.md`](./polyrhythm-plan.md) §7 B). The
`sanchez` style plays songs; his record is
`drummer-model/drummers/antonio-sanchez.json`, schema 1.5.

**Which records are his.** Pat Metheny Group from _Speaking of Now_ (Warner
Bros., 2002; his first with the group, recorded at Right Track, New York) and
_The Way Up_ (Nonesuch, 2005); Metheny's trio on _Day Trip_ (2008, with
Christian McBride); _Unity Band_ (2012); _From This Place_ (2020) (Wikipedia,
Antonio Sánchez; Wikipedia, Speaking of Now). Gary Burton's _Quartet Live_
(2009), _Common Ground_ (2011), _Guided Tour_ (2013). As leader on CAM Jazz:
_Migration_ (2007; Chris Potter, David Sánchez, Scott Colley, with Chick Corea
on track 1 and Metheny on 3 and 8; recorded January 2007), _Live in New York
at Jazz Standard_ (2010), _New Life_ (2013), _Three Times Three_ (2014/15),
_The Meridian Suite_ (2015), _Bad Hombre_ (2017), _Lines in the Sand_ (2019);
_SHIFT (Bad Hombre Vol. II)_ (Warner, 2022); the _Birdman_ score (Milan, 2014) (Wikipedia; Wikipedia, Migration). BEATrio with Béla Fleck and Edmar
Castañeda (2025; _Kaleidoscopes_ is his tune; highresaudio, NPR/WLRN).

**How he plays.** Classical piano at Mexico's National Conservatory, then
Berklee (magna cum laude) and a master's at New England Conservatory, where
Danilo Pérez taught him and sent him to Paquito D'Rivera in 1997
(Wikipedia). Rock first (Beatles, Stones, Rush, The Police), then videos of
Gadd, Weckl and Colaiuta (Berklee Today, 2003); Peart and Copeland
(Varga, 2008). "Tony Williams einer meiner wichtigsten Einflüsse. Aber auch Roy
Haynes, Jack DeJohnette, Elvin Jones, Max Roach, Philly Joe Jones" (bonedo,
2022). "Deeply influenced by Afro-Cuban and Mexican rhythmic concepts"
(15 Questions). In a 2015 lesson his samba ostinato is "constant 8th notes on
the ride, a dotted 8th/16th-note figure on the bass drum, and offbeat 'chicks'
with the hi-hat foot", the left hand free over it (Modern Drummer, 2015). His
Hudson DVD covers "left-foot clave" and "odd-meter clave" (Hudson Music).
Micallef's _Migration_ review: "From foot pedal–executed clave patterns to
blazingly fast and intricate drumset figures" (Modern Drummer, 2007).

**The Gathering Sky, in his words** (his _Gathering Sky Lesson_ video, read
through its captions on chordu.com): "It has like a West African vibe to it,
that's how it starts. And then it goes like into 3-4 samba, sort of, when the
guitar solo starts." Of the drum solo: "Most of it is gonna be based around
clave. The 4-4 clave, which is like a 3-2 rumba clave"; "the 5-4 clave that I
did previously. Only this time I have another cowbell right next to my right
foot. And I play beat number one of each 5-4 bar on that one"; "another
clave, which I also developed playing with Danilo Perez, which is in 7-8. The
first bar is 2-3 clave. The second bar turns around into a 3-2 clave"; "when
you hear this cowbell, that's beat one of every two bars of 7-8"; "While
playing the clave on the hi-hat, if I hit with my heel this bell"; "what I
call extreme independence ... I let go of my lower body playing the clave,
and then I can play stuff in another time or another tempo on top." Metheny
"composed 'The Gathering Sky' specifically to take advantage of Sanchez's ...
ability to perform clave ... with a cowbell that he plays with his left foot"
(Varga, 2008).

**Devices (schema 1.5).**

- **Timeline** in solos (verified: his own account, naming the clave and the
  meter, for _The Gathering Sky_ (_Speaking of Now_, 2002); Metheny via
  Varga). A 3-2 rumba clave on the hi-hat foot (with a bell struck by the
  heel), and claves of his own in 5/4 and 7/8, the right foot marking the 1
  on a cowbell. Also _Migration_ (2007) by Micallef's review (likely; no
  track named).
- **Ostinato-independence** in solos (verified: the same account; "I let go
  of my lower body playing the clave" and solo on top). Also his samba
  ostinato with the left hand free (Modern Drummer, 2015; method, likely).
- **Polymeter** in the groove (likely: his account in DRUM!, 2017): on
  _Fire Trail/Distant Glow_ (_Bad Hombre_, 2017) the drums play 5/4 against a
  4/4 sequence, "you'd get this overlap at the bar length before it would come
  back to the same place ... It kind of snaps back"; and with Danilo Pérez
  "We would play with the clave, and I would play this big, wide 5/4" (no
  record named). Who holds which meter is the writer's paraphrase; no bars.

**Not tagged.** "Cross rhythmic expression" and "polyrhythmic flurries"
(Micallef; review summaries) are press phrases. "Another time or another
tempo on top" names no ratio and no record: a polytempo lead only. The 5/4
and 7/8 claves are timelines in odd meters, not polymeter: the bar line and
the clave agree. _The Meridian Suite_'s quarter notes over 5/8 (Modern
Drummer, 2015) is a lead: the article is behind a paywall, and "override" is
unexplained.

**How his devices differ from Horacio's.** The same two kinds. Horacio's
(§S) are a clave on the cowbell pedal under the band's groove (_Our
Family_, _Rumbatella_). Sánchez's, by his account, are under his own solos,
on the hi-hat pedal with heel-struck bells, and in meters of his own (a 5/4
clave with the right foot marking each 1; a 7/8 clave two bars long, 2-3 then
3-2). In BeatBreaker the difference is the meter and the fill mode, not a new
device: a timeline-and-ostinato style whose solos sit over the feet.

**What the style encodes.** The `virtuosity` kit. Straight time for the
Metheny songs. _The Gathering Sky_ is two songs: the samba under the guitar,
his own samba ostinato (ride eighths, the kick a dotted eighth and sixteenth,
the hat foot on the "and"s) fitted to three beats, the left hand free; and
the drum solo, a 3-2 rumba clave on the hi-hat foot in one bar of sixteenths
(as Horacio's claves are written) with the heel bell on the clave slot,
`held` so a fill never lifts it, and the hands soloing over it, filling
often. The timeline is written and labelled as itself, never as a poly fill;
he has **no poly fills** (his polymeter has no bars). Both _Gathering Sky_
tempos are estimates; the samba's sits at 122–132, since its kick's dotted
eighth and sixteenth meet the next beat as a double, which the critic holds
to 132 (AcousticBrainz's 134 is a machine's). His 5/4 and 7/8 claves are not
written: their strokes are only in the Hudson booklet.

| Song                    | Year | Record          | Meter | Tempo (quarter)                                                                   | What defines it                                                    | Source of the bars                               |
| ----------------------- | ---- | --------------- | ----- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| The Gathering Sky       | 2002 | Speaking of Now | 3/4   | 120–140 (estimate; an AcousticBrainz figure of 134, algorithmic, via search only) | the "3-4 samba, sort of" under the guitar solo; his samba ostinato | reconstruction (his lesson; Modern Drummer 2015) |
| The Gathering Sky, solo | 2002 | Speaking of Now | 4/4   | as the samba (estimate; no ratio given)                                           | a 3-2 rumba clave on the hi-hat foot, the hands soloing over it    | reconstruction (his lesson)                      |
| You                     | 2002 | Speaking of Now | 4/4   | 95–105 (tab 98, 95 at bar 80, 105 at bar 90)                                      | a ride in 8ths and paired 16ths, snare on 2& and 4, kick across it | Songsterr 3523898 (human, Michael Dybala)        |
| Afternoon               | 2002 | Speaking of Now | 4/4   | 102–108 (tab 105)                                                                 | a two-bar kick-and-snare figure under hat, later ride, 8ths        | Songsterr 4251855 (human, Brady94)               |

**Left out.** _As It Is_: the tab's bar 9 was read, but its tempo was not,
and songbpm's 136 for the studio take could as well be 68. _Grids and
Patterns_ (_The Meridian Suite_, 5/8): Modern Drummer's preview describes the
quarter-note hat over the 5/8 but gives no kick or snare strokes and no tempo.
_Challenge Within_ (_Migration_, 2007; 5/4 clave with a
cascara): its bars are in Bergamini's Hudson booklet, which was not read from a
legitimate copy (as for Hoenig's books, §AF); no tempo found. _Fire Trail/Distant Glow_: the
polymeter has no bars and no tempo, and its 4/4 layer is a synth. _Kaleidoscopes_
(BEATrio, 2025; Songsterr 5772764, human, 136): the tune runs in 13/16,
14/16, 11/16 and 15/16 bars, which no BeatBreaker meter holds. _Birdman_:
improvised to the director's hand signals, no steady meter (thefilmstage;
Berklee). _Obbakoso_ (Songsterr 3322874) and Burton's _Afro Blue_
(5002119): AI transcriptions. _Unity Band_, _The Way Up_, _Day Trip_, _New
Life_, _Three Times Three_, _Lines in the Sand_: no drum-specific description
or tab found (reviews say "relentlessly pushes", "big pocket"); the _Day
Trip_ Hal Leonard book is guitar transcriptions. The 7/8 clave (two bars,
2-3 then 3-2) is not written: its strokes are not given.

**Found on the way.**

- Hudson's _Master Series: Antonio Sanchez_ booklet (Bergamini, 2008) covers
  the left-foot clave and the odd-meter claves (its product page). A bought
  copy would make the timeline verified from a transcription and give
  _Challenge Within_ and the 5/4 and 7/8 claves their bars.
- A fill does not clear the hat-foot lane, so the clave on the foot runs
  under the hands' fills as it should; the heel bell is a `held` clave slot.

## AO. Vinnie Colaiuta (2026-10-15)

Phase 12-g ([`polyrhythm-plan.md`](./polyrhythm-plan.md) §7 B). The
`colaiuta` style plays songs; his record is
`drummer-model/drummers/vinnie-colaiuta.json`, schema 1.5.

**Which records are his.** Vincent Peter Colaiuta, born 5 February 1956 in Brownsville, Pennsylvania. He played with Frank Zappa from 1978 to 1981: _Joe's Garage_, _Tinsel Town Rebellion_ and _Shut Up 'n Play Yer Guitar_. He played with Joni Mitchell in the 1980s and with Sting from 1990: _Ten Summoner's Tales_ (1993) and _Mercury Falling_ (1996). Jeff Beck followed in 2008–10, and Jing Chi with Robben Ford and Jimmy Haslip from 2002 (all Wikipedia).

Credits for the records used:

- **_Ten Summoner's Tales_:** Songsterr's tab tracks name him on _Seven Days_, _If I Ever Lose My Faith in You_, _Shape of My Heart_ and _Fields of Gold_. He discusses _Seven Days_, _Love Is Stronger Than Justice_, _Saint Augustine in Hell_ and _If I Ever Lose My Faith in You_ as his own (Modern Drummer, Robyn Flans, October 1993).
- **_I Hung My Head_:** his, on _Mercury Falling_ (bonedo, Schröder, 2026).
- **_Keep It Greasey_:** his, on _Joe's Garage_ (his own account, Modern Drummer, Flans, 1982; Songsterr track credit).

**How he plays.** His only formal teacher was Gary Chaffee at Berklee, who "was doing things like applying polyrhythms to the drumset" (MD 1982). Chaffee "polished it ... especially on a physical level with the linear thing and the sticking" (Percussive Notes, Mattingly, 1995).

With Zappa: "Frank would say, 'Play this against that, or play five against four.' ... It forced me to try to improvise these polyrhythms" (MD 1982). _Keep It Greasey_ has "one part where the actual time signature is 19/16 ... another part in 21. It was all one live take" (MD 1982).

His rule for odd time is "regardless of how many pulses a bar happens to contain, you're going to play it with the same consideration of feel", "not necessarily defining the downbeats in every bar" (PN 1995). He groups 5/4 "two and three versus three and two" (Berklee Press, 2001). On the Sting record "I don't think Sting intended for people to sit there and count the stuff out" (PN 1995).

The Sting songs are his own account at bar level:

- **_Seven Days_:** "I phrased it by playing over the bar line, so the hi-hat pattern resolves every two bars. That smoothes it out and gives it a regularity that 4/4 has" (MD 1993).
- **_Love Is Stronger Than Justice_:** "it's that over-the-bar ride cymbal, where the ride cymbal is playing sort of quarter notes ... solidify that seven" (MD 1993).
- **_Saint Augustine in Hell_:** "The same kind of thing. These patterns in seven are very similar" (MD 1993).

Steve Ley (Online Drummer, 2015, via Wikipedia) puts _Seven Days_ in 5/8 at 184. He has the hi-hat accents "on the odd numbered beats for the first measure and even numbered beats on the second", the kick on 1 and the snare on 4. Matthew Rait (PhD thesis, York University, 2019, via Wikipedia) calls the figure "rhythmic displacement ... implying a duple rhythmic organization".

bonedo (Tschak, 2018) notates _Saint Augustine in Hell_ in 7/8, with the bell accents on eighths 1, 3, 5 and 7 in bar 1 and on 2, 4 and 6 in bar 2. bonedo (Schröder, 2026) has _I Hung My Head_ in 9/8 (2+3+2+2). Live, the hat plays an eighth and two sixteenths, a four-sixteenth cell across the bar. The main groove has bell quarters over hat eighths with quarter accents.

**Devices (schema 1.5).**

- **Polymeter** in the groove: a two-eighth (quarter-note) cycle over a bar of five, seven or nine eighths, coming round every two bars, with the kick on 1 and the snare fixed.
  - _Seven Days_: verified. His own account, Ley's description and Songsterr 422388 (human) agree. The tab has hat accents on sixteenths 0, 4 and 8, then 2 and 6, and in the chorus the bell on 4 and 8, then 2 and 6.
  - _Saint Augustine in Hell_: verified, from bonedo's notation and his own account.
  - _Love Is Stronger Than Justice_: likely. It rests on his own account ("sort of quarter notes"). The Drum Ninja transcription read has a hi-hat in 16ths in the verse.
  - _I Hung My Head_: likely. bonedo's text was read; its notation was not.
  - Rait's "displacement" names the same figure. It is not tagged twice, since nothing is moved off its beat: the accents fall on and off the beat because the bar is odd.
- **Cross-rhythm 4:5** in the groove: on _Stan Key_ (_Jing Chi_, 2002), "a four-over-five polyrhythm" on the china at 4:23 "while keeping a steady 4/4 beat with his other limbs" (Bédard, Modern Drummer, 2018). Likely: a magazine's description of a named record, with the lesson's notation behind a paywall. If the china notes fall every five sixteenths, this is a **grouping** of fives, not a tuplet. The kind should be settled when the lesson is read.

**Not claimed:**

- Zappa's "five against four" as a device: it is his method, with no record named.
- The fill in _Saint Augustine in Hell_ ("four snare accents in sixteenth-triplet groups of three", bonedo): these are accents every eighth inside sextuplets, a sextuplet lick.
- _Keep It Greasey_'s 19/16 and 21: odd meter.
- Zappa's "grand prize goes to Vinnie Colaiuta" for "those polyrhythms" (_The Real Frank Zappa Book_, via the Zappa wiki): reputation.

**Against Bozzio.** Terry Bozzio was recorded as not sourced because Zappa's written tuplets and solo pieces are off the grid. Colaiuta's Zappa work is the same:

- _The Black Page_ is a written piece he learnt by transcribing it.
- _Keep It Greasey_ is in 19/16.
- The _Shut Up 'n Play Yer Guitar_ solos are improvised against Zappa's rhythms, and no transcription of them was read.

He is added for the Sting grooves alone. Those are on the grid and described by him at bar level.

**What the style encodes.** The `drs` kit (an even studio kit, as the Yamaha
and Zildjian of the Sting records). Straight sixteenths, no swing, few
ghosts; the cross-stick in the quiet songs. **No poly fills** (D56): the
polymeter is in the groove, so it is the odd-meter songs' own figures, two
bars of 5/8, 7/8 or 9/8 in sixteenths with the cycle running across them
and coming round on the third bar's 1. The 4:5 is held back until its kind
is settled. _I Hung My Head_ keeps bonedo's quarter accents on the hat and
leaves its bell to the hat, as a hand has one cymbal and the critic holds
it so.

| Song                           | Year | Record                     | Meter | Tempo (quarter)                                  | What defines it                                                         | Source of the bars                                     |
| ------------------------------ | ---- | -------------------------- | ----- | ------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| Seven Days                     | 1993 | Ten Summoner's Tales       | 5/8   | 92–94 (tab 94; Ley 184 eighths)                  | hat 16ths, accents a quarter apart across the bar; cross-stick on 4     | Songsterr 422388 (human), Ley, his account             |
| Saint Augustine in Hell        | 1993 | Ten Summoner's Tales       | 7/8   | 86–92 (tab 89)                                   | bell quarters across two bars of 7/8; snare on 3 and 7                  | bonedo notation (bell), Songsterr 3779971 (kick/snare) |
| Love Is Stronger Than Justice  | 1993 | Ten Summoner's Tales       | 7/8   | 82–88 (tab 170 in 7/4 eighths, i.e. 85)          | hat 16ths, kick 1, &4, 6, snare 3 and 7; ride quarters over the bar     | Drum Ninja (description), his account; reconstruction  |
| If I Ever Lose My Faith in You | 1993 | Ten Summoner's Tales       | 4/4   | 96–100 (tab 99)                                  | hat 16ths, kick 1, a of 1, & of 2, & of 3; chorus ride and bell in 8ths | Songsterr 19407 (human)                                |
| Shape of My Heart              | 1993 | Ten Summoner's Tales       | 4/4   | 80–84 (tab 164 in eighths; 82–84 search summary) | hat 16ths, kick on 1 and 3, cross-stick on 2 and 4                      | Songsterr 22055 (human)                                |
| Fields of Gold                 | 1993 | Ten Summoner's Tales       | 4/4   | 100–104 (tab 104)                                | cross-stick on 2 and 4, kick on 1 and & of 2, shaker                    | Songsterr 397226 (human)                               |
| I Hung My Head                 | 1996 | Mercury Falling            | 9/8   | 95–105 (estimate; bonedo's play-along at 100)    | hat 8ths, accents a quarter apart across the bar; 2+3+2+2               | reconstruction (bonedo text)                           |
| Keep It Greasey (intro)        | 1979 | Joe's Garage Acts II & III | 4/4   | 132–138 (tab 136)                                | ride bell in a broken 16th line over a busy kick, ghosted snare         | Songsterr 604777 (human)                               |

**Left out.**

- _Keep It Greasey_'s chorus (19/16) and verse (23/16): no grid holds them. The 7/4 second chorus was not read.
- _The Black Page_, the _Sinister Footwear_ pieces and the _Shut Up 'n Play Yer Guitar_ solos: written or improvised tuplets off the grid, as with Bozzio.
- _Watermelon in Easter Hay_: 9/4, written in the tab as 4/4 and 5/4 bars alternating. There is no 9/4 meter, and a song figure has one meter.
- _Joe's Garage_ (the song): the tab has 57 tempo changes (85–180) and nothing beyond a rock eighth-note beat.
- _The Central Scrutinizer_: Bishop's transcription is an image that was not read, and there is no tempo.
- _St. Agnes and the Burning Train_ and _Heavy Cloud No Rain_: Songsterr has no drums, and the MD 1993 interview gives nothing.
- _Stan Key_: no bars or tempo read.
- _Love Is Stronger Than Justice_'s chorus, "a country two-beat" in 4/4 (Berklee 2001): the verse defines it. It could be a 4/4 section, but the ratio of its tempo to the verse's is not given.
- The tabs' 32nd-note hat pairs in _Seven Days_ (end of every other bar): written as one sixteenth.
- Jeff Beck, Joni Mitchell, Gino Vannelli, Herbie Hancock, Megadeth (_The System Has Failed_, 2004): no drum part was read.

**Found on the way, not changed.**

- §AE says BeatBreaker's eighth-note meters "hold eighths only". They do
  not: `meter.ts` splits every eighth of 5/8, 6/8, 7/8, 9/8, 11/8 and 12/8
  in two (`sub: 2`), so 5/8 is ten sixteenths and 7/8 fourteen. The songs
  here are written in sixteenths. The same line left Carey's _Lateralus_
  and _Schism_ (§AE) and Harrison's _Futile_ and _Way Out of Here_ (§AJ)
  out; it is no reason for any of them.
- The over-the-bar quarter in an odd bar is the plan's polymeter at its smallest: a cycle of one quarter against the bar. The library's polymeter shelf could take it as a "make odd time feel like four" exercise.

## AP. Ignacio Berroa (2026-10-15): searched, not distinct

Phase 12-g ([`polyrhythm-plan.md`](./polyrhythm-plan.md) §7 B). The plan adds
him only if his devices are distinct from Horacio Hernández's (§S: clave on a
pedal under the groove; four-way independence). They are not, on what could
be read: **not added**. No record or style is written, and the search is
below. The rule working, not a shortfall (plan §10).

**Which records are his.** Born in Havana on 8 July 1953. He trained at the
National School of Arts and the National Conservatory, and was professional
from 1970 (jazz.com; World Music Central). He played with Emiliano Salvador
from 1975 to 1979 (Panken, 2014). He left Cuba in the Mariel boatlift in 1980,
and Mario Bauzá introduced him to Dizzy Gillespie, who hired him in August 1981. He stayed with Gillespie's quartet, big bands and the United Nation
Orchestra until Gillespie's death in 1993 (Wikipedia; jazz.com). He was
adjunct faculty at FIU from 1991 to 1994 (jazz.com). As a leader: _Codes_
(Blue Note, 2006; Grammy nomination; Danish Music Award 2007), _Heritage and
Passion_ (2014) and _Straight Ahead from Havana_ (Codes Drum Music, 2017; trio
with Martin Bejerano and Josh Allen) (Wikipedia; MLWZ). _Codes_ tracks:
Matrix, Joao Su Merced, La Comparsa, Partido Alto, Realidad y Fantasía,
Pinocchio, Woody 'N' You, Inútil Paisagem (search listing, from Books-A-Million
and Qobuz; the pages themselves returned 403). Personnel include David Sánchez
and Felipe Lamoglia (saxophones), Gonzalo Rubalcaba and Eddie Simon (piano),
John Patitucci and Armando Gola (bass), and Giovanni Hidalgo (Blue Note page;
Modern Drummer, 2006). As a sideman: Steve Turre, _Rainbow People_ (HighNote,
6 May 2008; _Cleopatra's Needle_ is track 6, by Steve Kirby) (Wikipedia,
Rainbow People). Also McCoy Tyner, Chick Corea, Freddie Hubbard, Jackie
McLean, Charlie Haden and Tito Puente (jazz.com), and _Live at the Royal
Festival Hall_ (United Nation Orchestra, 10 June 1989).

**How he plays.** "Like a Cuban Roy Haynes, Ignacio's drumming sizzles,
sparks, and pops, easily flowing from Rumba to Swing" (Modern Drummer, quoted
by Yamaha). On 6/8: "the main thing is the clave … We rely on the clave; we
don't rely on the downbeat all the time", answering Micallef's "you avoid
playing the bass drum on the downbeat of the 6/8 pattern". In straight-ahead
jazz: "Clave is implied. It's in my blood, so I don't think about it" (Modern
Drummer, Micallef, July 2006). On _School Days_, a shuffle Dizzy sang: "I was
playing the shuffle, and then suddenly, at some point, I started playing the
Afro-Cuban clave. While keeping the shuffle, I put the clave … He loved it.
… The only thing I did afterwards was changing that pattern from the cowbell
to the cymbal". He explains: "in jazz they swing the notes, BING,
BINK-A-DING, BINK-A-DING, and we might do BING-BING-PA-BING, BING-PA … This is
a triple feel from the Africans. … You can superimpose" (Panken, 2014). On
odd meters: "everything is like a 4. Everything has to swing" (Panken).
Bishop's transcriptions: on _Woody'n You_ (_Codes_) "he's playing rumba
clave on the cowbell" in "a funk Afro 12/8 groove". On _Cleopatra's Needle_
his phrase-ending fills in a 6/4 bar make "melodic use of the bass drum",
"two-tone melodies between the bass drum and snare drum", and he "repeats the
same fill multiple times with variations" (Cruise Ship Drummer, 2018, 2019).
His books: _Groovin' in Clave_ "combines Rock and Funk with Afro-Cuban
Rhythms", and _A New Way of Groovin'_ (PlayinTime/Carl Fischer, 2002, 80 pp.
and CD) is "combining jazz and rumba clave for a new sound on the drumset"
(retailer copy; Internet Archive catalogue). Neither was read.

**Devices (schema 1.5), as they would be tagged.**

- **Timeline** in the groove (verified): rumba clave on the cowbell over a
  12/8 Afro groove, _Woody'n You_ (_Codes_, 2006), from Bishop's
  transcription. The same kind as Horacio's (who plays it on a left-foot
  pedal) and Prieto's (claves over the 6/8 bell, _The Triumphant Journey_).
- **Timeline** over a shuffle (likely; his own account, but no recording):
  clave on cowbell, then cymbal, over Dizzy's _School Days_ shuffle (Panken,
  2014). Both layers are ternary, so this is not a cross-rhythm.
- Not tagged, lead only: **grouping** in fills. In _Cleopatra's Needle_
  (_Rainbow People_, 2008) each 6/4 fill bar opens with a cell of kick, rest,
  accented snare, three sixteenths long, three times (kicks on 0, 3, 6, 9 of
  the bar's 24 sixteenths), and the opening recurs in four of the seven 6/4
  bars. That is a reading of Bishop's notation. Bishop names the melody
  between kick and snare, not a grouping.

**Why this does not make him distinct.** Horacio's clave is on a pedal, and
Antonio Sánchez's (§AN) is on the hi-hat foot under his solos. Fidyk's Modern Drummer
lesson "Swingin' the Clave" (2012) names Sánchez, Robby Ameen and Prieto for
that, not Berroa. Prieto plays the clave from shifting starting points and has
the 12/8 bell. Berroa's sourced timeline differs only in which limb plays it.
The device that would be his, jazz time in clave as a method, is in _A New
Way of Groovin'_, which could not be read. No record ties a specific pattern
from it to a track.

**Songs that could be written.**

| Song               | Year | Record                                 | Meter                   | Tempo (quarter)                                        | What defines it                                                                                           | Source of the bars                                                             |
| ------------------ | ---- | -------------------------------------- | ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Woody 'N' You      | 2006 | Codes (Blue Note)                      | 12/8                    | estimate 120–135 (no tempo given by Bishop or songbpm) | rumba clave 3-2 on cowbell, ghosted snare, accents on the last eighth of beats 2 and 4, a high-tom pickup | Bishop transcription (Groove o' the day, 2018), four bars, read in full        |
| Cleopatra's Needle | 2008 | Steve Turre, Rainbow People (HighNote) | 6/4 fill bar inside 4/4 | 96 (Bishop's marking)                                  | kick and snare in threes of sixteenths; a crash and the kick on the next 1                                | Bishop transcription (2019), the fills only; the 4/4 groove is not transcribed |

**Left out.**

- _Matrix_ (_Codes_), 6/8, songbpm 95 (142 in quarters if 95 is the dotted
  quarter; an estimate). Only his account exists (clave first, kick off the
  downbeat) and Dayton-Johnson's "shifts to Afro-Cuban rhythm almost four
  minutes in" (from a search summary; the review returned 403). Writing bars
  would be invention.
- _School Days_: no recording of the clave-over-shuffle version is
  identified.
- _Pinocchio_ (songbpm 139) and _La Comparsa_ (148): tempos, but no bars.
- The _Straight Ahead from Havana_ tracks (_La Tarde_, _Me Recordarás_):
  reviews say "rolling and rumbling under a repeated riff" (Blogcritics), but
  give no bars and do not say which rhythm is under which tune.
- The Dizzy and United Nation Orchestra records: no drum transcription found.

**Found on the way, not changed.**

- _Groovin' in Clave_ is often dated 2006; the Internet Archive record has
  its sequel, _A New Way of Groovin'_, as 2002, so _Groovin' in Clave_ is
  earlier. Its year was not found.
- Bishop's _Woody'n You_ transcription has a hi-hat foot on every
  dotted-quarter beat, which is "not present on the recording; I've included
  it to emulate the shekere".
- Hudson Music's PDF `com.magappzine.miketestapp.00018-sample.pdf` appears in
  a search for _A New Way of Groovin'_. It could not be rendered (no PDF
  tool), so it may hold a Berroa lesson.
- For a later pass, the leads that could change the verdict: the two books
  (paid for), the full Modern Drummer 2006 feature (paywalled), and the
  Hudson PDF.

## AQ. Brian Downey (2026-10-18)

The `downey` style plays **songs** the way `baker` (T) and `collins` (X) do:
each New picks one of his records, and its tempo, meter and grooves come
with it. His record (`drummer-model/drummers/brian-downey.json`, schema 1.5)
is new, written from this section, with ten Thin Lizzy recordings and
`sources/brian-downey.json`.

**Which records are his.** Brian Michael Downey was born on 27 January 1951 in
Dublin and grew up in Crumlin (Wikipedia). His school bands with Phil Lynott
were the Liffey Beats, Mod Con Cave Dwellers and the Black Eagles. He then
played in Sugar Shack, and then in Lynott's Orphanage with Terry Woods, Joe
Staunton and Pat Quigley ("We were mainly a blues band", Hot Press 2024).
Eric Bell saw Downey and Lynott with Orphanage in December 1969. Downey agreed
to a new band "on condition that Lynott would play bass" (Wikipedia, Thin
Lizzy). Thin Lizzy was Lynott, Bell, Downey and Eric Wrixon, and Wrixon left
before the first single. Downey and Lynott were its only constant members
until 1983.

He is the credited drummer, "drums, percussion", on every studio album from
_Thin Lizzy_ (1971) to _Thunder and Lightning_ (1983) and on _Live and
Dangerous_ (Wikipedia, each album's page). There are two exceptions:

- Mark Nauseef, uncredited, drums on "Sarah" on _Black Rose_.
- Phil Collins added percussion to _Johnny the Fox_, on a track nobody could
  recall.

Nauseef also deputised on tour in 1978, when Downey had pneumonia, and in 1982. Of _Live and Dangerous_, even Tony Visconti, who claimed it was "75%
recorded in the studio", kept the drums from the live tapes. The 2022 box set
showed far less overdubbing than he had claimed (Wikipedia).

Downey co-wrote or co-arranged several of the songs:

- "Whiskey in the Jar", arranged by Bell, Downey and Lynott.
- "The Rocker" and "Slow Blues" (_Vagabonds_).
- "For Those Who Love to Live" (_Fighting_).
- "Cowboy Song" and "Emerald" (_Jailbreak_).
- "Johnny the Fox Meets Jimmy the Weed" (_Johnny the Fox_).
- "Bad Reputation" and "Opium Trail" (_Bad Reputation_).
- "S & M" (_Black Rose_).
- "Chinatown" (_Chinatown_).

After the band ended he played on Lynott's solo records and on Gary Moore's,
from _Back on the Streets_ (1978) to _Close As You Get_ (2007). He played in
Thin Lizzy reunions from 1996, and again from 2010 to 2013. He has led Brian
Downey's Alive and Dangerous since 2016.

**How he played.** The pipe band came first. His father played in the
Harold's Cross Pipe Band, and Downey had "a couple of years' tuition" with the
Fintan Lawlor Pipe Band (Hot Press, Murphy, 2011). He was in a pipe band from
about nine and practised on the band's drums at home (Dolbear, 2007). The
rudiments he calls essential are a pipe band's: "The single stroke roll is a
must, and the Mama-dada roll, which is the long roll, double paradiddles",
triple paradiddles, triplets and ratamacues. He adds that rudiments alone
do not make a drummer who can play songs with a band (Hot Press 2011; read
through a summary, so not quoted).

Next came records his postman father brought home unclaimed. One was Eddie
"Cleanhead" Vinson's _Back Door Blues_: "This had Louis Hayes on drums and he
playing stuff that sounded really intricate, but very fresh as well". Another
was Oscar Brown Jr's "When I Was Cool", "a real sort of blues shuffle thing
which was very influential". Then came Tony Meehan's solo on the Shadows'
"See You in My Drums", and the Beatles: "I thought Ringo invented the
backbeat" (Dolbear). His first kit was an Olympic with no ride: "it gave me a
sort of independence between my right foot and my left hand" (Dolbear). In
2011 his favourites were "Elvin Jones and Max Roach. And you have to include
Buddy Rich. In the rock thing Billy Cobham and Vinnie Colaiuta", and Neil
Peart, "a superb drummer" (Hot Press 2011). In 2007 he named Brian Blade (Dolbear).

With Lynott the job was restraint. "When Phil was singing and playing it was
nearly impossible for it to become complicated". He described Lynott's bass:
"He used a pick and his internal timing was very good, his right hand was
very strict". Murphy calls it "a minimalist's discipline". Downey calls the
rhythm section "second to none" (Hot Press 2011).

Murphy's introduction describes his playing on particular songs:

- "Delicate and light-fingered on ballads like 'Still In Love With You'".
- "economic and precise on 'Waiting For An Alibi' and 'Jailbreak'".
- "an exquisite swing, tossing deft, almost jazzy fills".

Modern Drummer (2011) has "explosive chops, a fine sense of dynamics", "one
of the sweetest grooves in heavy rock", and on The Boys Are Back in Town "an
unstoppable uptempo shuffle groove". Steve Ley's transcription of that song
is "a rockin' shuffle-groove throughout, punctuating the guitarists' riffs
with off-beat hi-hat slurps and end-of-the-bar crashes" (OnlineDrummer;
description only).

Two of the band's grooves are his:

- **_Don't Believe a Word_:** Lynott wrote it as a slow 12-bar blues. Downey
  "devised a faster shuffle rhythm" when he and Robertson reworked it.
- **_Johnny the Fox Meets Jimmy the Weed_:** Gorham: "The whole thing really
  took off when Brian Downey sat down and put his personal funk take on it
  with the drums" (Wikipedia, Johnny the Fox).

Other playing notes:

- **Brushes:** Lynott would say "Let's do something totally different, you
  play with brushes" (Dolbear).
- **Bad Reputation:** "'Bad Reputation' has that weird time signature, and I
  like playing 'Emerald'".
- **Sha-La-La:** a solo "in straight 4/4 but when I improvised over it I could
  change into four or five new patterns after eight or sixteen bars, so it
  was never set in stone" (Hot Press 2011).
- **Toms:** "whereas I like a ring" (Hot Press 2011).

**Kit.** From Dolbear, in his own order:

- Olympic, then Premier.
- Hayman "by the third or fourth gig" of Lizzy.
- Gretsch "with a pair of big 26" bass drums": "we recorded 'Fighting' with
  the Gretsch and 'Nightlife' as well".
- Rogers with double bass drums and 12, 13, 14 and 16-inch toms, rewrapped
  chrome by Chas Foote.
- Tama, including Cobham's Superstar.

Cymbals went from Zyn to Super Zyn, a spell of Paiste, then Zildjian. In 2011
he played a Tama Starclassic with two 22-inch bass drums, a 14x5.5 snare,
13-inch Zildjian K hats, a K ride, crashes, a china and a splash, and his own
Wincent 5B (Hot Press 2011). On _Chinatown_ he "added double bass drum fills"
(Wikipedia). The years of the Rogers and the Tama are not given anywhere read.
The record infers them and says so.

**Devices (schema 1.5).** None found. A `devices_search` is recorded instead.
It read:

- Seven human Songsterr tabs, bar by bar.
- Ley's description.
- Modern Drummer 2011, both Hot Press interviews, and Dolbear.
- The Wikipedia pages.

No Drumeo, MusicRadar or Modern Drummer lesson on his parts was found. The
leads that did not hold:

- **Bad Reputation's "weird time signature":** its chorus alternates bars of
  4/4 and 5/4 (Songsterr 56439). That is odd meter.
- **Bad Reputation's verse kick:** 3+3+2 under a snare on every beat. It
  follows the riff inside one bar, a common rock figure with no cross pulse.
- **Emerald:** written in 3/4 at 181 with the kick in eighths. That is meter
  and speed.
- **The Sha La La solo:** improvised, and no transcription of it was read.

**What the style encodes.**

- **Feel:** straight eighths on the rock songs; a full triplet shuffle on
  The Boys Are Back in Town, Dancing in the Moonlight, Don't Believe a Word,
  Do Anything You Want To and Chinatown. Songsterr marks a triplet feel on the
  first two. The shuffles are written in sextuplets (`4/4-6`) at the beat you
  feel, the triplets in the grid and Swing at zero, as Bonham's Fool in the
  Rain is, so the readout shows the tempo people quote (138 for Don't Believe
  a Word, not a 12/8 quarter of 207). Emerald, a jig, is in 12/8.
- **Ghosts:** `ghostBias` low, about 0.1. The tabs have almost no ghost notes,
  and the playing is about the backbeat and the riff.
- **Hat and crash:** the hat opened on an off-beat under the riff (the "and"
  of 3 in Boys and Jailbreak; open eighths in Bad Reputation's verse). The
  crash pushed onto the "and" of 4 with the guitars, with no hat on the
  following 1 (Ley's "end-of-the-bar crashes").
- **Fills:** at phrase ends, swung and close to jazz: sixteenths and triplets
  down ringing toms, single strokes first (his rudiment).
- **Bass drums:** two, only in fills (Chinatown) and in Emerald's gallop
  under the guitar solo.
- **Kit:** an open, ringing 1970s rock kit with a big bass drum and little
  muffling. No freely licensed samples of his sound were found; the style
  plays `drs`, an even studio kit with a Paiste ride and crash (his cymbals in
  the mid-1970s, before Zildjian), less damped than `studioRock`, so the toms
  keep some ring, and drier than `sixties`'s room. His two bass drums, the
  chrome wrap and the gong are not in the 3D kit; the likeness's kit is
  `metal`.
- **Quiet songs:** a cross-stick (Dancing in the Moonlight's second section);
  brushes only if a song is written for them.

**Patterns in the record.** Seven bars or bar pairs, all `approximation`,
`draft`, from human Songsterr tabs (`aiGenerated` false through the meta API):

- The Boys Are Back in Town (19634), on a triplet grid.
- Jailbreak (361).
- Whiskey in the Jar (47373).
- Cowboy Song (20248).
- Emerald (20278).
- Bad Reputation's verse (56439).
- Dancing in the Moonlight (56442), on a triplet grid.

Each keeps the tab's most common bar or bars.

**The songs, in sections.** The user asked for the records' flow, so every
song is written in sections (A, B, C…, at most 32 distinct bars) played in an
`arrangement` that follows the record (at most 32 slots: the limit was 16 when
these songs were first written, and was raised so that each could play its
record through, intro to outro): intro, verses,
choruses, solos and outro in their order. The section boundaries are the
Songsterr tabs' own markers (Intro, Verse, Chorus, Solo…), read with
`--sections` in the tab reader, cross-checked against the records'
structure, beat-tracked where a tab follows another version (Wild One) or has
no markers (Little Girl in Bloom). A section's figures are the bars the tab
plays there, weighted by how often; set pieces (Wild One's tom figure every
third bar, Cowboy Song's snare build, Jailbreak's sirens, Emerald's unison
breaks) are the sections' fills with `midFills` and `fillChance` set so they
fall where the record has them. Cowboy Song's slow opening is not a section:
Downey does not play in it (the record's cymbals are silent until 49.5 s).
Bars the critic refuses (a stop bar with no backbeat, a snare run of four)
are left out, and each song's notes say which.

**Grids.** Eleven songs follow human Songsterr transcriptions (each tab's
`aiGenerated` flag checked through the meta API); Don't Believe a Word and
Chinatown have only machine-made tabs, and follow them where two agree and
the record, beat-tracked, bears them out. Every tempo was checked against the
record and the tab's length at its marked tempo.

| Song                                   | Year | Tempo (quarter)                                                                          | Meter                                         | What defines it                                                                                                              | Source of the bars                                                                    |
| -------------------------------------- | ---- | ---------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Whiskey in the Jar                     | 1972 | 126 (tab); 127–128 (record, beat-tracked); length matches                                | 4/4                                           | straight eighths, kick on the "and" of 3, almost no fills                                                                    | Songsterr 47373 (human); the record folded; 3889107 (AI, 1973 TV) for fills           |
| Wild One                               | 1975 | 120 (tab; record lag 0.500 s)                                                            | 4/4 in sextuplets                             | the tom figure every third bar; open hats on the beats; sextuplet and triplet verse fills                                    | Songsterr 410614 (human); the album's order from its audio                            |
| Cowboy Song                            | 1976 | 92 then 132 (tab; length matches); band at 133–135 (record)                              | 4/4                                           | the snare build after a drumless slow opening; hits with crashes on the "and"s; the ride for the chorus and the twin guitars | Songsterr 20248 (human)                                                               |
| Jailbreak                              | 1976 | 141 (tab; record mean 141; length matches)                                               | 4/4, a bar of 2/4                             | a pushed two-bar beat; the chorus's crash on the "and" of 4 tied over; the stops; the sirens                                 | Songsterr 361 (human)                                                                 |
| The Boys Are Back in Town              | 1976 | 160 (tab); 162–163 (record); songbpm 80/160                                              | 4/4 in sextuplets (a shuffle)                 | crash on the "and" of 4 pushing past the 1; triplet fills; quarter-note-triplet stabs                                        | Songsterr 19634 (human)                                                               |
| Dancing in the Moonlight               | 1977 | 144 (tab); 145 (record)                                                                  | 4/4 in sextuplets (swung)                     | cross-stick and hat foot; the ride with the kick on the "and"s; one triplet fill; the stop                                   | Songsterr 56442 (human)                                                               |
| Emerald                                | 1976 | 181 (tab, 3/4); dotted quarter 120–122 (record)                                          | 12/8                                          | a jig: snare on the second pulse, gallops, the mid tom and kick in eighths, unison breaks                                    | Songsterr 20278 (human)                                                               |
| Don't Believe a Word                   | 1976 | 138 (record beat-tracked 138.6; the tab's 12/8 at a quarter of 207)                      | 4/4 in sextuplets (a shuffle; the tabs' 12/8) | Downey's fast shuffle, the kick on the bass line, stops                                                                      | Songsterr 2072614 (**AI**), checked against 7416077 (AI) and the record               |
| Do Anything You Want To                | 1979 | 153 (the tab's 12/8 at a quarter of 230; length matches: 230 s against 233); songbpm 155 | 4/4 in sextuplets (a shuffle; the tabs' 12/8) | the intro's floor tom and timpani; a hard shuffle, the kick off the 1                                                        | Songsterr 410605 (human)                                                              |
| The Rocker                             | 1973 | 144 (tabs; the full-length tab matches: 315 s against 312); songbpm 145                  | 4/4                                           | straight eighths; the toms on the riff under the ride; band stabs                                                            | Songsterr 56432 (human, shortened); 7142603 (AI) for the solo's climax                |
| The Friendly Ranger at Clontarf Castle | 1971 | 119 (tab; record 117–119, the intro 102–107; length matches: 179 s against 181)          | 4/4                                           | a tom figure in sixteenths; a three-bar groove, the snare on 2                                                               | Songsterr 410611 (human)                                                              |
| Little Girl in Bloom                   | 1973 | 110 (record beat-tracked 110.7; songbpm 111; tab 116, too fast: 296 s against 312)       | 4/4                                           | the backbeat against half time, the snare on 3 and the tom on 1; a soloing outro                                             | Songsterr 264407 (human)                                                              |
| Chinatown                              | 1980 | 148–152 (record beat-tracked 150; songbpm 151; the tab's 12/8 at a quarter of 230)       | 4/4 in sextuplets (a shuffle; the tabs' 12/8) | a snare roll in, a hard shuffle, hand-and-foot "double bass" fills                                                           | Songsterr 1674938 (**AI**), checked against 7416217 (AI), 56433's form and the record |

### Whiskey in the Jar

**Record.** Single, Decca, November 1972 (Thin Lizzy's first hit; later a bonus track on
_Vagabonds of the Western World_ reissues). The trio line-up: Phil Lynott, Eric Bell, Brian
Downey on drums. Downey (Hot Press, 2024, via search summary): the band started out "with
something easy to play at first like Whiskey In The Jar ... a good icebreaker"; manager Ted Carroll
heard them jamming it and persuaded them to record it. The tab's drum track is named "Brian Downey |
Hayman Showman Gold | Drums".

**Tempo.** Songsterr 47373 marks 126. The record (Thin Lizzy Official Audio, 5:45) beat-tracks at
126–128 throughout (mean 127.4 from first to last beat; autocorrelation lag 0.470 s = 127.7). 183
bars at 126 (three of them 5/4) run 349 s against 345, and the record fades from about 322 s (bar
~168). Straight eighths: the hats' autocorrelation peaks at half a beat and is negative at a third
and two thirds. Song range 124–130.

**Structure** (tab markers, bar numbers of the tab; the record agrees where checked):

| Bars    | Section                                | Drums                                                                    |
| ------- | -------------------------------------- | ------------------------------------------------------------------------ |
| 1–6     | intro (guitar; 3 bars 5/4, 3 bars 4/4) | tacet (the record's hat band is silent until 19.4 s)                     |
| 7       | intro                                  | stabs: snare + mid tom + kick on 3, snare + floor tom + kick on 4        |
| 8–15    | the riff                               | hats in eighths, snare 2 and 4                                           |
| 16–31   | verse 1                                | same                                                                     |
| 32–47   | chorus + riff                          | same                                                                     |
| 48–63   | verse 2                                | same                                                                     |
| 64–71   | chorus                                 | same                                                                     |
| 72–105  | solo (34)                              | same (human tab); snare also on the "and" of 2 (record folded; 1973 tab) |
| 106–121 | verse 1 again                          | same                                                                     |
| 122–137 | chorus + riff                          | same                                                                     |
| 138–153 | verse 3                                | same                                                                     |
| 154–183 | chorus, riff, coda                     | bars 172–181 cross-stick (in the fade), crash, end                       |

**Tabs.** Songsterr 47373, human (`aiGenerated: false`), rev 8780924 (2026-08-30, "Added track
info & fixed drums", reviewed "fair"); rev 786222 (2024) has the same drum part with the hats
written on the foot. It is a skeleton: one bar (hats in eighths, snare 2 and 4, kick 1 and 3) for
175 bars, no fills. Songsterr 3889107 "Whiskey In The Jar 1973 Video Sound HQ" is
`aiGenerated: true` (rev 5093578): a machine transcription of the 1973 TV performance, 128 bpm, 113
bars; used only for detail the human tab lacks, and only where the record's audio agrees.

**How the bars were read.** The tab's bars as printed by `tab.py`. Then the record itself: the
studio audio was beat-tracked and its percussive part (median-filter HPSS) split into kick
(40–100 Hz), snare (1–4.5 kHz) and cymbal (7–11 kHz) onset bands; each tab section's bars were
folded onto one bar of sixteenths. Every section shows the kick strongest on 1 and 3 and nearly as
strong on the "and" of 3 (the 1973 tab's commonest bar, `1.......1.1.....`, x16), which the human
tab leaves out; the chorus folds show a kick on the "and" of 4 too; the solo fold shows the snare on
the "and" of 2 (the 1973 tab's bars 35–43 have it). Bass guitar shares the kick band, so these
pushes are the weaker evidence: the human tab's plain bar is kept in every pool beside them.

**Design.** Six sections, 31 bars: A the stab bar (1), B the riff (8), C verse (8), D chorus (8,
the "and"-of-4 kick), E solo (4, snare on the "and" of 2), F the cross-stick coda (2). The drums are
one groove for nearly the whole record, so the sections differ little — that is the record. Fills
are rare (`fillChance` 0.3), from the 1973 performance: mid-tom eighths over 3 and 4, and snare
eighths into mid-tom eighths. Arrangement (31): A B C C D B C C D E E E E E E E E E C C D B C C D B F F F F F — the
record's order with each verse at 8 bars of 16 and the solo at 12 of 34.

**Grids row.**

### Wild One

**Record.** _Fighting_ (Vertigo, 12 September 1975), track 4, 4:18–4:22 (Wikipedia; Metal Music
Archives, spirit-of-metal); also a 7" single (October 1975). Lynott, Gorham, Robertson, Downey on
drums. The 2012 reissue has an alternate version on its bonus disc. The audio used is the album
version (YouTube "Wild One", ThinLizzyChannel, lwYSI-tYj7Y, 4:23); a 3:33 upload ("Wild One [HQ]
'75") is a shorter edit and was set aside.

**Tempo.** Songsterr 410614 marks 120. The record: beat lag 0.500 s by autocorrelation (120.0), the
beat tracker 120–123. Straight eighths (the hats' autocorrelation is strongest at half a beat). Song
range 118–122.

**Tab.** Songsterr 410614, human (`aiGenerated: false`), rev 274879, its only revision (2016,
"Initial revision", track "Percussão"). 120 bars at 120 = 240 s. Its order: intro 11, verse 17,
chorus 11, verse 17, chorus 8, solo 8, "harmony" 4 (the verse fill and three bars of tom triplets),
chorus 11, verse 17, chorus 11, "harmony end" 5.

**The album's order is not the tab's.** The album runs about 126 bars to its end at ~253 s. Its
tom bars (no hats, the toms' 80–250 Hz band up, the cymbal band down to 1.4 against 1.6–1.9) fall
at bars 1, 4, 7 (intro), 29, 32, 35 (chorus 1), 57, 60, 63 (chorus 2) and 110, 113, 116 (chorus 3);
its verse fills (a bar with no kick, then a bar with the snare and toms high) at 27–28, 55–56 and
108–109. Bars 64–95 have neither: a long instrumental (taken as the solo) where the tab has a solo of
8, the harmony break and a chorus. So the arrangement follows the album: intro (1–11), verse 1
(12–28), chorus 1 (29–39), verse 2 (40–56), chorus 2 (57–63), solo (64–95), verse 3 (96–109),
chorus 3 (110–~119), crash bars to the end (~120–126).

**Drum part** (tab, 4/4 at 120, rows in sixteenths):

- Tom bar (intro and chorus bars 1, 4, 7): kick on 1; both rack toms in eighths from the "and" of
  1 to 3, the mid tom carrying on to the bar line (chorus 1); in choruses 2 and 3 the high tom to 3,
  then the mid tom on the "and" of 3, 4 and its "and".
- Crash bar (2, 5, 8; and 9–11 at the end of the intro and chorus): crash on 1, snare 2 and 4, the
  kick on the "and" of 2, 3 and the "and" of 4, none on the 1.
- Groove bar (3, 6): the same with the kick on 1.
- Verse (x14 in 17): open hats on the four beats, snare 2 and 4, the kick on 1, its "and", 3 and its
  "and". The tab writes no cymbal in the chorus but the crash; the record's cymbal band has the same
  quarter-note pulse in the chorus as in the verse, so the chorus bars keep the open hats on the
  beats.
- Verse end: a bar of snare sextuplets (in 4/4-6: `2..22....2..222...2..22.`), then snare on 1,
  the high tom in eighth-note triplets through 2, the mid tom through 3 and 4.

**Design.** 4/4-6 (sextuplets) for the whole song, so the verse-end bars are in the grid: an
eighth is 3 steps, a triplet 2. Five sections, 27 bars:

- A, the tom figure (1 bar): the toms alone, no crash and no fill: the bar that opens the intro
  and every chorus (album bars 1, 29, 57, 110).
- B, crash, groove, toms (6 bars): one figure, the groove bar; `build` splits the six in three
  and three so each half starts on a crash; `midFills: 1` and `fillChance: 1` put the tom bar on
  the third and sixth. After A, that is the record's seven bars, T C G T C G T: three tom figures
  to a chorus. (The first version had no A, so a chorus opened on the crash and had two tom
  figures; code review caught it.)
- C, the crash bars (4): crash on every 1, the kick off it (`phraseMark.kick: false`,
  `forceKick: []`).
- D, the verse (8): always ends on a fill: the tom-triplet bar, or the snare sextuplets' second
  half (its first half has no backbeat on 2, which the critic requires of a full-bar fill).
- E, the solo (8): the verse's bar, the chorus kick in the second half, fills less often.
  Arrangement (21): A B C D D A B C D D A B E E E E D D A B C: the album bar for bar, the solo its
  full 32 bars (at 16 slots it had been cut to 24).

**Grids row.**

### Cowboy Song

**Record.** _Jailbreak_ (Vertigo, 26 March 1976), side two, 5:14. Lynott, Gorham, Robertson,
Downey on drums. Modern Drummer (2011) lists "Emerald" and "Cowboy Song" among Downey's high
points. The audio used: Thin Lizzy Official "Cowboy Song" (Q61q458T92w, 5:14).

**Tempo.** Songsterr 20248: 92 for bars 1–16, 132 from bar 17. Length: 16 bars at 92 (41.7 s) and
150 at 132 (272.7 s) make 314.4 s against the record's 314.3. The record's band section
beat-tracks at 132–136 (autocorrelation lag 0.446 s = 134.7; mean from first beat to last 133.2).
Straight eighths (hats peak at half a beat). Song range 130–136.

**The slow opening.** Lynott sings over guitar and piano in free, slow time; the tab's drum track is
empty for bars 1–20, and the record agrees: its cymbal band is silent (0.4–1.0 against 1.7–2.2 once
the band plays) until 49.5 s, where the snare build begins (tab bar 21), and the band lands at
58.5 s (bar 26). **Decision: no section for it.** A section is drums; Downey plays nothing there, and
a section at ×2/3 (88, the nearest ratio to 92/132) would be an invented part. The song starts where
he does, with the build, at the band's tempo.

**Structure** (tab markers; bars at 132 from bar 17):

| Bars    | Section                                  | Drums                                                                                                                                                          |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–20    | slow opening, then the band's first bars | tacet                                                                                                                                                          |
| 21–25   | build                                    | snare in eighths, the hats joining; bar 25 ends in sixteenths                                                                                                  |
| 26–41   | verse (16)                               | hats in eighths, kick 1, 3, "and" of 3; every fourth bar (3, 7, 11) hits with crashes on the "and"s of 3 and 4; bar 15 a snare-and-toms run, 16 the hits again |
| 42–49   | chorus (8)                               | ride in quarters, snare on 2 and the "and" of 3, kick 1, 3, 4, "and" of 4; bar 4 mid tom in eighths; bar 8 a snare fill                                        |
| 50–65   | verse                                    | as before                                                                                                                                                      |
| 66–73   | chorus                                   | as before                                                                                                                                                      |
| 74–89   | solo (16)                                | the verse's beat                                                                                                                                               |
| 90–137  | bridge (48)                              | the chorus's 8, then 40 bars on the ride: kick 1, "and" of 2, 3, "and" of 4                                                                                    |
| 138–153 | solo (16)                                | the verse's beat, tom fills                                                                                                                                    |
| 154–166 | outro (13)                               | the chorus's beat, then the stops: crash, snare and kick on 1, the "and" of 2 and 4                                                                            |

**Tab.** Songsterr 20248, human (`aiGenerated: false`), rev 7699131 (2026-07-03, "Saves position
shift"), after several human revisions (BGruver 2026-04, "James" 2026-01 "updated section labels").
Track "Percussion".

**How the bars were read.** `tab.py --sections`, bar by bar, commonest bars first. Changes for the
critic and the run rule: the verse's hit bar has four sixteenths on the snare in one version (bar 3);
the other (bar 7: three sixteenths after the backbeat) is used. Bar 15's six sixteenths on the snare
are broken once (`222.22`). The chorus's last bar has the snare on the "and"s of 1, 2 and 3 and four
sixteenths into the verse: its second half is the fill, the last four sixteenths three.

**Design.** Five sections, 30 bars: A the build (4: snare and hats in eighths, no crash or kick),
B the verse (8: the hit bar as a fill inside the phrase and at its end, a crash starting each half),
C the chorus (8: the mid-tom bar inside, the snare fill at the end), D the twin guitars (8: the
bridge's ride beat), E the stops (2). Arrangement (20): A B B C B B C B B C D D D D D B B C E E — every part
in the record's order; the bridge's 40 ride bars at 16.

**Grids row.**

### Jailbreak

**Record.** _Jailbreak_ (Vertigo, 26 March 1976), title track, 4:01. Downey on drums. Audio used:
Thin Lizzy Official "Jailbreak" (yFMVvSAeVO4, 4:00).

**Tempo.** Songsterr 361 marks 141; 143 bars run 243 s against 241. The record beat-tracks at a
mean of 141.1 from first beat to last (its autocorrelation's beat peak reads 145.8, between hop
steps). Straight eighths (hats peak at half a beat). Range 138–146.

**Tab.** Songsterr 361, human (`aiGenerated: false`), rev 3817760 (2025-11-13, "Some changes
reverted according to the original audio"); rev 7269657 (2026) is an alternate tuning of the same.

**Structure** (tab markers): intro 1–4 (crash and kick on bar 1's 1, two bars of riff, a bar of
2/4 with a snare on 2) · pre-verse 5–12 · verse 13–28 · chorus 29–36 (bar 7 a fill to a crash and
kick on 4; bar 8 a stop, only two sixteenths on the snare) · pre-verse 37–44 · verse 45–60 · chorus
61–76 (ends on the same stop) · interlude 77–103 (6 bars of the pre-verse beat, the fill and stop,
then the sirens 85–102: eighths on the kick, crash with toms on 1, the "and" of 2 and 4, the
second bar answering, then the final hit) · pre-verse 104–111 · verse 112–127 · chorus 128–143 (its
end: snare runs, the mid tom, the stabs, a last crash).

**Drum part.** Pre-verse and verse are one two-bar groove (x7 and x6 a verse): kick on 1, the "and"
of 2 and of 3; then 1, its "and", 3, its "and" and the "and" of 4, the hat opening on the "and" of 3. The chorus is a two-bar figure: a crash with the kick on 1 and on the "and" of 4, and the bar
after it has no kick on the 1 (the push is tied over), the kick on 3 and its "and", two sixteenths
after the backbeat on 4. The sirens: the tab strikes two toms with the crash at once; one tom is
kept (two hands), the tab's own differing tom kept where they differ.

**Design.** Seven sections, 28 bars: A the intro's crash (1), B the bar of 2/4 (1, `meter: '2/4'`),
C the verse (8, the two-bar figure; the verse's tom fill, or the two sixteenths), D the chorus (8,
`forceKick: []` so the pushed bar has no 1; the bar-7 fill with the snare under the crash on 4, so
the 4 is still struck), E the stop (1), F the sirens (8, two-bar figure), G the ending stabs (1).
Arrangement (23): A B C C C D E C C C D D E C E F F C C C D D G. The intro's two bars of riff alone cannot be a
section (no drums) and are left out.

### The Boys Are Back in Town

**Record.** _Jailbreak_ (1976), 4:26; the single reached the US top 20. Downey on drums. Modern
Drummer (2011): "It also boasts an unstoppable uptempo shuffle groove courtesy of founding drummer
Brian Downey." Audio used: "The Boys Are Back In Town (New Stereo Version / 2024)" (wRBFv7pz7TY,
4:31), a remix of the same performance (the original upload refused the download).

**Tempo.** Songsterr 19634 marks 160. songbpm.com: 80 (double time 160). The record's beat lag is
0.368 s (162.9); 180 bars (the tab's 192 less 12 empty bars of fade) at 162 make 267 s against
4:26. Range 158–164, written at the 160 count (a bar of 4/4 at 160 is the tab's bar).

**Swing.** The tab writes straight eighths. The record's cymbal band, autocorrelated at the 160
beat, is up at a third and two thirds of the beat and slightly negative at a half, where Whiskey in
the Jar, Cowboy Song, Jailbreak and Wild One all peak: the off-beats are late, a shuffle. So the
song is in 4/4-6 with every "and" on the last triplet of its beat (step 4 of 6), Swing at zero,
as Bonham's Fool in the Rain is written. The tab's triplet fills are already in that grid.

**Tab.** Songsterr 19634, human (`aiGenerated: false`), rev 7299786 (2026-06-10), track "Brian
Downey | Drums | 1970 Ludwig Classic Maple". Compared: 1561243 ("E Standard", human, rev 2076033) and 2576871 (human, rev 3396012) have the same commonest bars in the same numbers (the
verse bar x30, the no-1 crash bar x21, the twin-guitar bar x16, the crash bar with the 1 x14): one
transcription retuned. 955863 is `aiGenerated: true` (150 bpm, quarter-note hats) and not used.

**Structure** (tab markers): intro 1–16 · verse 17–32 · chorus 33–44 · twin guitars 45–52 (bar 8
the triplet stabs) · verse 53–68 · chorus 69–80 · twin guitars 81–88 · bridge 89–104 (a bar of
snare triplets, a bar of mid-tom triplets, six of the chorus's beat, again, an ending bar) · verse
105–120 · chorus 121–128 · quiet chorus 129–136 · solo 137–152 · outro harmonies 153–192 (fade).

**Drum part.** Intro and chorus: a crash on the "and" of 4 with the kick, and the bar after it with
no kick on the 1 (x7 of 16), or with one (x4); the kick on 3 and its "and". Verse: hats on every
shuffled eighth, the kick on 3, its "and" and the "and" of 4. Twin guitars: the kick on 1 and the
"and" of 2. Fills: the snare in triplets from the "and" of 1 into the high tom; the snare through
2 and 4; the floor tom in triplets; quarter-note-triplet stabs with crash, snare and kick.

**Design.** Six sections, 23 bars: A intro and chorus (8), B verse (8, and the solo), C twin
guitars (4), D the triplet stabs (1), E the bridge's snare roll (1), F the bridge's mid tom (1).
The two bridge bars are sections of their own: as fills they would leave the backbeat the critic
requires. Arrangement (32): A A B B A C C D B B A C C D E F A E F A B B A B B B C C C C C C.

### Dancing in the Moonlight (It's Caught Me in Its Spotlight)

**Record.** _Bad Reputation_ (Vertigo, September 1977), 3:26; a UK single. Downey on drums.
Louder calls it "a jazzy, swinging, finger-snapping tale of teenage romance on the streets of South
Dublin"; a reviewer: "Brian knew where to keep it laid-back and simple, like 'Dancing in the
Moonlight'". The song began as a bass line Lynott brought to Gorham and Downey (search summaries).
Audio used: Thin Lizzy Official (6PxibUaQiLM, 3:33).

**Tempo.** Songsterr 56442 marks 144. The record's strongest beat lag is 0.413 s (145.3); 109 bars at
145 run 180 s, the record fading after that to 3:26. (A beat tracker held at 130 locked wrongly
here; the autocorrelation settles it.) Range 142–148.

**Swing.** The record's strongest short lags are a third and two thirds of the 0.413 s beat (0.137,
0.274 s) with nothing at a half: the eighths are swung. The tab writes them straight. Written in
4/4-6, every "and" on the last triplet of its beat, Swing at zero.

**Tab.** Songsterr 56442, human (`aiGenerated: false`), rev 8718942 (2026-08-27), track "Drums -
Brian Downey".

**Structure** (tab markers): intro 1–10 (cross-stick on 2 and 4, the hat foot, two kick bars in
turn; bar 9 snare triplets over 3 and 4, bar 10 the snare on 1) · verse 11–26 · chorus 27–35 (bar 8
the triplet fill, bar 9 the stop: snare on 1, ride on 3 and 4) · verse 36–51 · chorus 52–60 ·
bridge 61–77 (the intro's beat) · solo 78–93 (the verse's beat) · chorus 94–109 (into the fade).

**Drum part.** Verse, solo, chorus: the ride on 1, 2, its "and", 3, its "and" and 4; the kick on 1
and the "and"s of 2, 3 and 4; a crash every fourth bar; no fills in the verse. The only fill: the
snare in eighth-note triplets over 3 and 4.

**Design.** Five sections, 29 bars: A intro (4), B verse (8, no fills), C chorus (8, always the
triplet fill), D the stop (1), E bridge (8). `cymbalAccent: false` in the cross-stick sections.
Arrangement (16): A A B B C D B B C D E E B B C C.

### Emerald

**Record.** _Jailbreak_ (1976), side two, 4:04. Downey on drums. Downey (Far Out, 2 May 2024, his
ten favourite Thin Lizzy songs): "Kind of an Irish-influenced groove on this one. Lots of
Irish-influenced guitar, too, with a jiggy kind of vibe." Modern Drummer (2011) names "Emerald" and
"Cowboy Song" among his high points. Audio used: Thin Lizzy Official "Emerald" (IB79pKUJN-o, 4:04).

**Tempo and meter.** Songsterr 20278 writes 241 bars of 3/4 at 181 (240 s against 4:04). The
record's beat is a dotted quarter at 120–122 (autocorrelation lag 0.493 s; 0.167 s, a third of it,
is the eighth): two pulses to each tab bar, so each tab bar is a bar of 6/8 with the eighth at 362.
Written in 12/8, two tab bars to one, at a quarter of 180 (the same eighth). Range 178–184.

**Tab.** Songsterr 20278, human (`aiGenerated: false`), rev 3993175 (2025-11-26), track "Brian
Downey". 5733396 "Emerald (Correct)" is `aiGenerated: true` and not used.

**Structure** (tab markers, in tab bars of 6/8): intro 1–4 and verse 1 5–20 (the hat on 1, the kick
on the second pulse; bar 20 a snare fill) · verse 2 21–38 (the snare on the second pulse; gallops at
bars 4, 8, 12; the unison toms-and-kick break 15–18) · end of verse 2 39–54 (the tom groove: kick in
eighths, the mid tom with it) · verse 3 55–70, verse 4 71–88 (on the ride's bell) · end of verse 4
89–104 (tom groove) · pre-solo 105–140 (16 bars of kick eighths with crash stops, then 18 bars with
no drums — the record's drum bands fall silent from 121 s to 139 s — and a two-bar fill) · solo
141–220 · outro 221–241 (the verse beat, the tom groove, a last crash).

**Changes.** The tab's sixteenths on snare and kick together (the gallops, the break) are twelve
notes a second at this tempo and three kicks running; they are thinned to eighths with one double.
The tab's hats under the ride in verses 3–4 and the solo are a second take (a hat and a ride on one
step); the ride is kept. The intro's sixteenths on the hat foot are left out.

**Design.** Six sections, 32 bars of 12/8: A intro and verse 1 (4), B verse (8: `fillsGrow` and
`midFills: 1` put the gallop on bars 2, 4 and 6 and the unison break at the end, exactly the
record's verse 2), C the tom groove (4), D the verse on the bell (8, the same fills), E the solo (4),
F the pre-solo (4). Arrangement (23): A A B C C D D C C F F E E E E E E E E E E C C. The drumless twin-guitar
break cannot be a section and is left out.

### Don't Believe a Word

_The notes below count the tab's 12/8 at a quarter; the style writes the song in sextuplets (`4/4-6`), the same 24 steps a bar, at the beat you feel (138)._

#### Record

- _Johnny the Fox_ (Vertigo, 1976), side one, track 4: **2:18**, credited to
  Phil Lynott. Recorded August 1976 (Musicland, Munich, abandoned on 6
  August; then Ramport, Battersea, and Olympic, Barnes). Single 26 November
  1976, UK No. 12, Irish No. 2. Downey: drums and percussion (Phil Collins
  added percussion to a track nobody could later name). Wikipedia,
  [Johnny the Fox](https://en.wikipedia.org/wiki/Johnny_the_Fox).
- **The shuffle is Downey's.** Wikipedia: Lynott first played it as a slow
  12-bar blues; Robertson called it "shite"; "Robertson and Downey then
  reworked it, with Downey devising a faster shuffle rhythm and Robertson
  writing the riff." The slow arrangement is the one Lynott and Gary Moore
  recorded on _Back on the Streets_ (1978); the _Live and Dangerous_ version
  starts slow. This song is the 2:18 studio cut.

#### Tempo and feel

- The record, beat-tracked (`beats.py`, onset flux, the dynamic-programming
  tracker): **138.6** a beat over 137 s, 136–140 throughout.
- Songsterr 2072614 marks 138; its 80 bars at 138 run 139 s, against 2:18.
  (songbpm.com's 143 and 4:35 are another version's.)
- A shuffle: folding the record's bars on a twelfth-of-a-beat grid, the hats
  and the kick land on the beat and on its **last triplet** (two thirds of the
  way through), never on the straight "and". Written in **12/8** at a quarter
  of **207** (the 138 beat is the dotted quarter), Swing at zero; the range is
  204–210.
- Grid: 24 sixteenths to the bar, a triplet 2 steps.

#### The tabs: all machine-made

Every Songsterr drum track of this song has `aiGenerated: true`:

| songId                    | Title                                | Revision | Notes                                           |
| ------------------------- | ------------------------------------ | -------- | ----------------------------------------------- |
| 2072614                   | Don't Believe A Word (Greatest Hits) | 2755235  | the studio cut, written in triplets; **used**   |
| 7416077                   | Don't Believe A Word (Bass tab)      | 9678640  | the studio cut, on straight sixteenths; checked |
| 7361403                   | Don't Believe A Word                 | 9608741  | 138 bars, 98 then 132: a live version           |
| 3625893, 3723130, 7348117 | live versions                        | —        | not used                                        |

The human tab 20379 (rev 1772511) has guitars and bass but no drums; it has
the studio cut's length (73 bars with an 8-bar repeat, at 139).

**How the AI bars were checked.**

1. The two machine readings of the studio cut agree bar for bar on where the
   fills, stops and crash patterns fall, and on the kick: 2072614's triplet
   `1.1..11.1..1` (1, the last triplet of 1, of 2, 3, the last of 3 and of 4)
   is 7416077's `1.1...1.1.1...1.` with its off-beats straightened.
2. The record agrees with the triplet reading: the folded kick peaks on 1,
   the last triplet of 1 and of 2, on 3 and the last of 3 and 4; the hats on
   the beat and the triplet before the next.
3. The record's per-bar energy has the tom fills where the tab has them
   (bars 8 and 20 loudest in the tom band) and the kick dropping out at the
   stops (bar 16), within a bar of the tab's numbering later in the song.
4. Rydquist's guitar tab (skyminds.net) gives the order: "Intro 8 bars"
   ("Guitar tacet, drums by the one and only Brian Downey! (one bar or
   something..)"), Verse 1, Verse 3 (a repeat), "Bridge (or is this the
   chorus.. never mind)", "Bridge again", Solo, Outro.

What is still the machine's: the exact hat part (on the beat, or shuffling,
bar by bar), the crash placements, and the fills' notes.

#### Structure (2072614's bars)

| Bars  | Part         | Drums                                                                                            | Section |
| ----- | ------------ | ------------------------------------------------------------------------------------------------ | ------- |
| 1–8   | intro        | shuffling hats, the boogie kick; snare-and-tom triplet fill (8)                                  | A       |
| 9–24  | verses 1–2   | hats on the beat; crash a triplet early (11, 13), the 1 dropped after; stop (16), fills (20, 24) | B ×2    |
| 25–32 | bridge       | a crash with the snare on 2; stop on a crash and the hat foot (32)                               | C       |
| 33–48 | verse 3      | as the verses; tom fills (35, 40), triplet roll (48)                                             | B ×2    |
| 49–56 | bridge again | the hat opened on 2, then the crash on 2 over shuffling hats; roll (56)                          | C       |
| 57–72 | solo         | shuffling hats opened on 4's last triplet; tom fills (60, 64)                                    | D ×4    |
| 73–80 | outro        | crash on 2 again; a crash on every beat (79); the last hit (80)                                  | E       |

Arrangement: `A A B B C B B C D D D D E` — 13 slots, 80 bars, all of them.
Sections hold 4 + 8 + 8 + 4 + 8 = 32.

#### Left out

- The stops: bar 16 (the band out, the kick a triplet before the 1 and the
  hat foot on 2, 3 and 4) and bar 32 (a crash on 1, then the hat foot). The
  critic asks every bar of a section with a backbeat for one, so
  `generateGood` would never keep a phrase ending on them.
- Bar 12's anticipation is written as two one-bar figures (11 and 12), not a
  two-bar one: a 12/8 bar is 24 steps and a figure row holds 32.

#### Doubts

- **The bars are a machine's**, corroborated by a second machine reading, by
  the record's onsets and by a guitar tab's form, not by a human drum
  transcription. No drum transcription or lesson was found (searches of
  Songsterr, Drumeo, onlinedrummer.com, Musicnotes, the web).
- The shuffle's off-beat in the record sits on or a little after the
  triplet; 12/8 puts it exactly on the triplet.

### Do Anything You Want To

_The notes below count the tab's 12/8 at a quarter; the style writes the song in sextuplets (`4/4-6`), the same 24 steps a bar, at the beat you feel (153)._

The user called it "You Can Do Anything You Want To"; the record's title is
**Do Anything You Want To**.

#### Record

- _Black Rose: A Rock Legend_ (Vertigo, 1979), side one. 3:53, written by
  Phil Lynott. Recorded December 1978 to February 1979 at Pathé Marconi EMI
  (Paris), Good Earth and Morgan (London). Single 8 June 1979 (b/w "Just the
  Two of Us", and "S & M"). Wikipedia,
  [Black Rose: A Rock Legend](https://en.wikipedia.org/wiki/Black_Rose:_A_Rock_Legend).
- Brian Downey is credited with "drums, percussion"; he is the only drummer
  on the album.

#### Tempo and feel

- Songsterr 410605 marks **230** a quarter in **12/8**: a dotted quarter of 153. 147 bars of 12/8 (6 quarters each) at 230 run **230 s**, against the
  record's 3:53 (233 s). songbpm.com gives **155** (the dotted-quarter
  pulse), 3:54.
- A shuffle: the tab's hats play the first and third triplet of every pulse
  (`1...1.` per pulse on a sixteenth grid), the snare is on the second and
  fourth pulses. It is written in **12/8**, the triplets in the grid and Swing
  at zero, as the Purdie shuffle and Blakey's Moanin' are. The readout counts
  quarters: 226–234 on it is the record's 151–156 dotted quarter.
- Grid: 4 steps to the quarter, 24 to the bar; a triplet eighth is 2 steps, a
  pulse 6. The run rule in 12/8 holds four consecutive steps to 150, so no
  figure or fill here has more than three in a row (bar 28's ruff is three).

#### Structure (Songsterr markers, bar ranges in the tab)

| Bars    | Marker      | Bars | Drums                                                                           | Section |
| ------- | ----------- | ---- | ------------------------------------------------------------------------------- | ------- |
| 1–9     | INTRO       | 9    | pickup bar, then the floor-tom figure with the kick, snare on 2 and 4; fill     | A       |
| 10–17   | PRE VERSE 1 | 8    | shuffle on the hats, kick off the 1; snare-then-tom fill, crash a triplet early | B       |
| 18–28   | VERSE 1     | 11   | the same, no crash on the 1; anticipations on bars 25, 27; ruff on bar 28       | C       |
| 29–36   | CHORUS      | 8    | crash on 1 every other bar, a triplet early on the others; fill                 | D       |
| 37–44   | PRE VERSE 2 | 8    | as 10–17                                                                        | B       |
| 45–55   | VERSE 2     | 11   | as 18–28                                                                        | C       |
| 56–63   | CHORUS      | 8    | as 29–36, a different last bar                                                  | D       |
| 64–71   | BRIDGE      | 8    | two-bar crash pattern; high-tom pickup                                          | E       |
| 72–79   | INTERLUDE   | 8    | the intro's tom figure                                                          | A       |
| 80–98   | PRE VERSE 3 | 19   | as the pre-verse, longer, a tom fill in the middle                              | B       |
| 99–106  | VERSE 3     | 8    | the bridge's two-bar crash pattern                                              | E       |
| 107–114 | SOLO        | 8    | the same, a crash a triplet early on the second bar too                         | E       |
| 115–147 | OUTRO       | 33   | the tom figure, the second bar answering on the tom                             | A       |

Arrangement: `A A B C C C D B C C C D E A A B B E E A A A A A A A A` — 27 slots, the record's order
throughout. Sections hold 4 + 8 + 4 + 8 + 8 = 32 bars. Shortened: the intro
plays 8 of 9 bars, each verse 8 of 11, the interlude 4 of 8, the third
pre-verse 8 of 19, the outro 4 of 33.

#### The tab

- **Songsterr 410605**, "Do Anything You Want To", revision 508691, by
  PRS_TRIBUTE (2022-08-16), **`aiGenerated: false`**. Track "Drums". It is the
  only human drum tab; 2558200 and 7416426 are machine-made.
- Read with `tab.py 410605 --sections` (grid 4): each marker's distinct bars,
  their counts and positions, kept as the figures (weighted by count) and the
  last bars as the fills. Bars marked OFFGRID (the intro's last two tom
  strokes, bar 28's ruff) are two 32nds and a sixteenth inside the last
  triplet: written as two sixteenths (steps 22–23), and bar 28's three snares
  as steps 16–18.
- The tab has a **Timpani** track: a roll (three 1/24 notes) at the end of
  every odd bar and a stroke on the next 1, through the intro (bars 1–8) and
  the interlude (72–78). The drum track's two-stroke tom pickup sits under
  the roll. The timpani are not a lane here; the pickup is. Downey on the
  timpani (Hot Press, 2011): "Anytime I had the opportunity I'd try to master
  the technique of that long single stroke roll on the timpani"; he called
  them weird to play and fit only for the studio.

#### How the figures were chosen

- A: the intro's two alternating bars (2, 3) and the outro's answering bar
  (116); the fill is bar 9.
- B: bars 11/13/15 (kick on the last triplet of 1, on 3, on 3's last
  triplet, on 4's) and 12/14 (and on 2's last triplet) in the tab's 3:2
  proportion; the fill is bar 17, whose crash and kick land a triplet before
  the verse's 1. Section B keeps the phrase crash and kick, as the tab's bar
  10 has both.
- C: the same two bars and the anticipation bar (25, 27); the verse's 1 has
  no crash and no kick (the pre-verse took them early), so `phraseMark` is
  off. Fill: bar 28.
- D: the crash bar and the anticipation bar in turn; no kick under the crash
  (`phraseMark.kick: false`). Fills: bar 36 (chorus 1), bar 63 (chorus 2).
- E: bars 64/65 and the solo's 110; fills bar 71 (two high-tom strokes) and
  bar 114 (three floor-tom triplets).
- The kick is never on the 1 in B–E but the pre-verse's first bar: the song
  sets `forceKick: []`, and every section a backbeat of `[6, 18]`.

#### Doubts

- 12/8 against 4/4: the record is felt in four with a shuffle; 12/8 is how
  this repo writes a full-triplet shuffle. If the downey style wants it as
  4/4 with `swingUnit: 8`, every row would be re-gridded.
- The two-bar alternations (the intro's tom figure, the chorus's crash every
  other bar) cannot be two-bar figures: a figure row is at most 32 steps, and
  a 12/8 bar is 24. They are one-bar figures, so the generator draws one per
  half-phrase rather than alternating bar by bar.
- No Downey interview about this song was found (Hot Press 2011, Modern
  Drummer 2011, Wikipedia searched).

### The Rocker

#### Record

- _Vagabonds of the Western World_ (Decca, 1973), side one, track 4:
  **5:12**, credited to Eric Bell, Brian Downey and Phil Lynott. Recorded 11
  April to 19 July 1973 at AIR and Decca 4, London ("further work was done on
  'The Rocker' afterward"). The single (9 November 1973, b/w "Here I Go
  Again", Irish No. 11) is an edit of **2:41**. Downey: drums, percussion, the
  only drummer credited. Wikipedia,
  [Vagabonds of the Western World](https://en.wikipedia.org/wiki/Vagabonds_of_the_Western_World).
- This follows the album version.

#### Tempo and feel

- Songsterr 56432 marks **144**; the machine-made 2167156 marks 144 for 189
  bars, which run **315 s** against the album's 312. songbpm.com: 145, 5:15.
- Straight eighths, 4/4, sixteenth grid; 142–146. Its runs (eight
  sixteenths on the tom in the riff) are within the run rule up to 150.

#### The tabs

| songId                    | Title                  | aiGenerated | Revision | Length                  |
| ------------------------- | ---------------------- | ----------- | -------- | ----------------------- |
| 56432                     | Rocker                 | **false**   | 351321   | 108 bars at 144 = 176 s |
| 2167156                   | The Rocker             | true        | 2879315  | 189 bars at 144 = 315 s |
| 7142603                   | The Rocker (with solo) | true        | 9325855  | 187 bars at 140 = 320 s |
| 7361635, 4490018, 7348192 | (live / other)         | true        | —        | not used                |

**56432** (Leonard, 2018; the drum track is named "Brian Downey") is the
human transcription, and it is **shortened**: 176 s is neither the album
(312) nor the single (161). Laid against 7142603, which runs the album's
length, its bars 1–79 are 7142603's 1–79 section for section (the intro, the
verses, the riff, the stabs, the intro riff again), its solo 80–104 is 25 of
7142603's 28 (80–107), and its last four bars (105–108) are 7142603's ending
(181–187). What it leaves out is 7142603's 108–182: the rest of the solo, its
climax and a last verse. Songsterr's video sync for 56432 is linear (one bar
every 1.7 s), so it does not place the cut.

#### Structure (56432's bars)

| Bars    | Part                 | Drums                                                                                                       | Section |
| ------- | -------------------- | ----------------------------------------------------------------------------------------------------------- | ------- |
| 1–13    | intro                | the riff over a cowbell in quarters; crash-and-kick stabs on the "and" of 2 and the 1; snare fills (11, 13) | A ×2    |
| 14–21   | verse 1              | hats in eighths, kick 1 and 3, a crash on 1 then on the "and" of 2 and 3                                    | B       |
| 22–29   | the riff             | the ride in eighths and the toms on Bell's line; no kick, no backbeat                                       | C       |
| 30–37   | verse 2              | as 14–21                                                                                                    | B       |
| 38–53   | the riff, twice      | as 22–29, a new tom line in 50–53                                                                           | C ×2    |
| 54–61   | verse 3              | as 14–21                                                                                                    | B       |
| 62–70   | stabs                | crashes with the band on the "and" of 1, of 2, of 4                                                         | D       |
| 71      | (2/4)                | —                                                                                                           | —       |
| 72–79   | the intro riff again | as 7–13                                                                                                     | A       |
| 80–104  | solo                 | the crash on 1 then on the "and" of 2, the snare on the "and" of 4 too                                      | E ×2    |
| —       | (7142603 108–161)    | the solo's climax: the ride, then a crash on every beat                                                     | F ×2    |
| —       | (7142603 162–180)    | a last verse                                                                                                | E       |
| 105–108 | ending               | crashes on the "and" of 2 and on 4, a 2/4 bar, down the toms, last crash                                    | G       |

Arrangement: `A A A B C B C C B D D A A E E E E E E E F F F F F F F E E D D G` — 32 slots; sections 4 + 8 + 8

- 4 + 4 + 2 + 2 = 32 bars.

#### How the figures were read

`tab.py 56432` (grid 4), every bar printed, and `fig.py` to cut one- and
two-bar figures straight from the tab's rows:

- A: bars 7–8 as one two-bar figure; fills 11 and 13. The tab's cowbell
  (GM 56, quarters, bars 2–12) is the section's `perc` slot, not a figure
  lane.
- B: 14–15 and 16–17 as two-bar figures (the verse's crash every other bar);
  fill: bar 17's ending.
- C: the riff's two-bar tom lines 22–23, 24–25, 26–27, 52–53, and bar 28;
  fill bar 29. The riff has no kick in the tab: `phraseMark.kick: false` and
  `forceKick: []`.
- D: 62–63, 65–66, 69–70 as two-bar figures.
- E: 80–81 and 96–97.
- F: 7142603 (AI) bars 138 and 108–109.
- G: 105 and 107 as one two-bar figure (the 2/4 bar between them, a crash and
  two snares, is left out).

#### Left out

- Bar 20's four snares to the bar line (34, 58 the same), bar 51's five, and
  bar 21's setup (no snare near 4): the critic refuses a snare run of four
  and a bar without its backbeat.
- Bar 28's open hats over the ride (one cymbal at a time).
- An unidentified note (GM 5) on the "and" of 3 in 17, 31, 55 and the solo.
- 2/4 bars 71 and 106.

#### Doubts

- **F is a machine's reading**, of a stretch the human tab does not
  transcribe. Its kick (1, the "and" of 1, of 2, 3, its "and", the "and" of 4)
  is the AI's habit throughout 7142603, where the human tab has 1 and 3; it
  may be busier than the record.
- The cowbell in the intro is in the human tab alone; the machine tabs have
  none.
- The section names are read off the drums and the tab's form; no lyric or
  chord sheet with section headings was found for it.

### The Friendly Ranger at Clontarf Castle

The user called it "The Lonely Ranger at Clontarf Castle" and placed it on
_Shades of a Blue Orphanage_ (1972). The title is **The Friendly Ranger at
Clontarf Castle**, and it is on the **first album**.

#### Record

- _Thin Lizzy_ (Decca, 1971), side one, track 1: **3:01**, credited to Eric
  Bell and Phil Lynott. Recorded 4–9 January 1971 at Decca Studios, London;
  produced by Scott English and Nick Tauber. Downey: drums and percussion.
  Wikipedia, [Thin Lizzy (album)](<https://en.wikipedia.org/wiki/Thin_Lizzy_(album)>).
  _Shades of a Blue Orphanage_'s track list
  ([Wikipedia](https://en.wikipedia.org/wiki/Shades_of_a_Blue_Orphanage))
  does not have it.

#### Tempo and feel

- Songsterr 410611 marks **102** from bar 2 and **119** from bar 28: 27 bars
  at 102 and 57 at 119 run 179 s against 3:01.
- The record, autocorrelating its onsets in 20 s windows: **105–107** for
  the first 20 s (the toms alone), **117–119** from 50 s, easing to 114 by
  the end. (A dynamic-programming beat tracker locked to whatever tempo it
  was given here, so it was not used.) songbpm.com does not list it.
- A break has one tempo, so the song takes the body's: 114–120. The intro
  plays a little quicker than the record's.
- Straight sixteenths, 4/4. The intro's run of eleven sixteenths round the
  toms is 7.9 notes a second at 119, inside the run rule.

#### The tab

- **Songsterr 410611**, revision 274876, enikey87 (2016), **`aiGenerated:
false`**; the drum track is named "Brian Downey". The only drum tab.
- Markers: Intro (1), Enter bass (15), Verse part (27), Guitar harmony (61).
- Read with `tab.py 410611 --sections` and `fig.py`.

#### Structure

| Bars  | Marker         | Bars | Drums                                                                                                               | Section |
| ----- | -------------- | ---- | ------------------------------------------------------------------------------------------------------------------- | ------- |
| 1–14  | Intro          | 14   | one bar fourteen times: six sixteenths on the high tom, high and low tom, the floor tom on 4                        | A ×3    |
| 15–26 | Enter bass     | 12   | the same figure under a crash, the ride and the kick on its 1; floor-tom sixteenths (17); bar 26 empty              | B ×2    |
| 27–60 | Verse part     | 34   | hats in eighths, kick 1 and its "and", the snare on 2 alone; every third bar busier; the hat opened at the end (60) | C ×6    |
| 61–64 | Guitar harmony | 4    | a crash and the kick, then three bars of silence                                                                    | D       |
| 65–82 | Guitar harmony | 18   | the verse's groove, in threes again                                                                                 | C ×3    |
| 83–84 | (end)          | 2    | a crash, then silence                                                                                               | D       |

Arrangement: `A A A B B C C C C C C D C C C D` — 16 slots; sections 4 + 6 + 6

- 2 = 18 bars.

#### How the figures were chosen

- The verse is a **three-bar** cycle: two bars of the plain groove (22 of 34) and one busy bar (11): the snare on 2, on its "a", on the "and" of 3 and
  of 4, the kick between. A figure is one or two bars, so the two are
  weighted 2:1 and the generator draws them.
- B's variants: bar 22's third low-tom stroke (a figure) and bar 17's floor
  tom in sixteenths (the fill).
- D: a crash and the kick, then a bar of silence (a two-bar figure). The
  record's three bars of silence are one.

#### Left out / doubts

- The snare on 2 alone is the tab's, every bar of the verse; with the kick
  on 1 and its "and" it reads as a half-time feel against the guitar's
  eighths. Not checked against another transcription (there is none).
- The intro's slower tempo (105 against 119).
- No Downey comment on the song was found.

### Little Girl in Bloom

#### Record

- _Vagabonds of the Western World_ (Decca, 1973), side two, track 2:
  **5:12**, Phil Lynott. Recorded 11 April to 19 July 1973 at AIR and Decca
  4, London. Downey: drums, percussion. Wikipedia,
  [Vagabonds of the Western World](https://en.wikipedia.org/wiki/Vagabonds_of_the_Western_World).

#### Tempo and feel

- Songsterr 264407 marks **116**, but its 143 bars at 116 run 296 s against
  the record's 312. The record, beat-tracked: **110–112** throughout (mean
  110.7); songbpm.com: 111, 5:17. 143 bars at 110 run 312 s: the tab's bar
  count is right and its tempo a little quick. The range is 108–112.
- Straight, 4/4, sixteenth grid. Slow and spacious: the verses alternate a
  backbeat with a half-time bar, the snare on 3 alone and the low tom on 1
  and its "and".

#### The tab

- **Songsterr 264407**, revision 1553885, Marcel Mesquita Gomes
  (2025-03-18), **`aiGenerated: false`**. The only drum tab. No markers.
- The sections were found from the tab's **bass track** (the root of each
  bar) and where the drums change:
  - the verse progression is G–Em–G–Em–D–Em–D–Em, eight bars (bars 9–16,
    17–24, 25–32, 45–52, 53–60, 61–68, 81–88, 89–96);
  - the chorus moves to C and B (bars 33–44, 69–80), twelve bars;
  - bars 97–105 are G–Em with no drums, 104–108 no bass; the outro (109–142)
    is the bass arpeggiating G, Em and D under the guitar solo.
- A chord sheet (chordie/guitaretab) has five-line verses on G/Em/D and a
  chorus on C/Em/G, in the order verse, verse, verse, chorus, verse, verse,
  chorus: the tab's form with its instrumental verses left out.

#### Structure

| Bars    | Part                   | Drums                                                                                     | Section |
| ------- | ---------------------- | ----------------------------------------------------------------------------------------- | ------- |
| 1–8     | intro                  | no drums; kick eighths in 8                                                               | —       |
| 9–16    | verse 1                | the backbeat, kick 1, 3 and its "and"                                                     | A       |
| 17–32   | verses 2–3             | half time: crash on 1 and its "and", the snare on 3, the low tom on 1; fills (24, 28, 32) | B ×2    |
| 33–44   | chorus 1               | the snare on the "and" of 2 alone (33–36), the backbeat (37–40), crashes on 2 (41–44)     | C ×2    |
| 45–52   | verse 4                | backbeat, then the snare on 3 alone (49–52)                                               | A       |
| 53–60   | verse 5                | half time with the tom                                                                    | B       |
| 61–68   | verse 6                | backbeat, then snare on 3 (65–68)                                                         | A       |
| 69–80   | chorus 2               | backbeat (69–72), the ride with the snare on 3 (73–76), toms (77–80)                      | C, D    |
| 81–88   | verse 7                | the snare on 2 with the tom (81–84), the ride (85–88)                                     | D       |
| 89–96   | verse 8                | half time with the tom                                                                    | B       |
| 97–105  | break                  | a crash, then eight bars without drums                                                    | —       |
| 106–108 | the build              | a snare on 4; snare and tom in sixteenths to the bar line                                 | E       |
| 109–142 | outro: the guitar solo | two-bar phrases: a crash on 1 and the "and" of 4, then a fill bar                         | F ×3    |
| 143     | end                    | —                                                                                         | —       |

Arrangement: `A B B C C C A B A C D D D D B E F F F F F F F F` — 24 slots; sections 8 + 8 + 4

- 4 + 2 + 4 = 30 bars.

#### How the figures were cut

`fig.py 264407 4 <bars>`, one-bar and two-bar figures straight from the tab:
A from 9, 49–50, 65; B from 17–18, 22, 19, 25 and fills 24 and the second
half of 28; C from 33, 37, 41–42 and the end of 34; D from 73–74, 85–86, 88
and the second half of 76; E from 106 and 108 (the fill); F from 109–110,
111–112, 117–118, 119–120.

#### Left out

- The drumless bars (1–8, 97–105): a section of silence would be a figure
  with nothing in it.
- Bar 44's six snares, bar 107's four, bar 126's four: the critic refuses a
  snare run of four.
- Bars 77–84's toms on the "and" of 4 (two sections already hold the ride and
  the backbeat), and the offgrid bars (32, 56, 77, 116).

#### Doubts

- The section names come from the bass's harmony, not from markers or a
  lyric sheet with headings; the chord sheet agrees on the verse/chorus
  order.
- No Downey comment on the song was found. (Pitchfork, via Wikipedia, calls
  it "a gorgeous soul serenade".)

### Chinatown

_The notes below count the tab's 12/8 at a quarter; the style writes the song in sextuplets (`4/4-6`), the same 24 steps a bar, at the beat you feel (148–152)._

#### Record

- _Chinatown_ (Vertigo, 1980), side one, track 2: **4:43**, credited to
  Downey, Gorham, Lynott and Snowy White. Recorded 1980 at Good Earth (and
  RAK). Single 16 May 1980. Wikipedia,
  [Chinatown (Thin Lizzy album)](<https://en.wikipedia.org/wiki/Chinatown_(Thin_Lizzy_album)>):
  built from White's ideas and a bass exercise Brush Shiels had shown Lynott;
  "Downey added double bass drum fills". Downey: drums and percussion.

#### Tempo and feel

- The record, beat-tracked: **148–152** a beat (mean 150.3 over 282 s).
  songbpm.com: 151, 4:43.
- **A shuffle.** Slowhand's guitar transcription (Ultimate Guitar 1740401)
  heads the intro "Shuffle Q=146(8=s8)": swung eighths. Folding the record's
  verse bars on a twelfth-of-a-beat grid, the kick's off-beats land at two
  thirds to three quarters of the beat, never on the straight "and" — a hard
  shuffle. (The human guitar tab 56433 writes the riff as straight eighths
  and triplets; the transcription and the record outweigh it.)
- Written in **12/8** at a quarter of **222–228**, a dotted quarter of
  148–152; Swing at zero. 179 bars of 12/8 at the tab's 230 run 280 s
  against the record's 283.

#### The tabs: machine-made

The brief named only 1674938; a search found a second drum track. Both are
`aiGenerated: true`:

| songId  | Title                | Revision | Reading                                 |
| ------- | -------------------- | -------- | --------------------------------------- |
| 1674938 | Chinatown (AI)       | 2227748  | 12/8 at 230, 179 bars; **used**         |
| 7416217 | Chinatown (Bass tab) | 9678799  | 4/4 at 145, 180 bars; triplets off-grid |

Two human tabs have no drums: 56433 (guitars, rev 71470, 158 bars with
repeats to about 181, 4/4 at 146) and Slowhand's on Ultimate Guitar.

**How the AI bars were checked.**

1. The two machine readings agree on every section, stop and fill, bar for
   bar: the snare roll (9–14), the hits (15–17), the hand-and-foot fills
   (18–19, 61–62, 113–114, 159–160, 167–168), the stops and rolls (79–83),
   and the 2/4 (6/8) bars at 88 and 93 (and 98, 103 in 7416217). They
   disagree on the grid: 7416217 straightens the shuffle into sixteenths, and
   its triplet bars fall off its own grid. 1674938's 12/8 reading is the one
   the record and the published transcription support.
2. The human guitar tab 56433 puts its 2/4 bars at 69, 74, 79 and 82: with
   its repeats expanded (bar 1 played twelve times, 22–25 and 38–41 twice)
   they land at 88, 93, 98 and 101, where the AI tabs have theirs (7416217's
   last is at 103). The form is right.
3. The kick on the bass line (1, the last triplet of 1, of 2, 3, the last of
   3 and of 4) matches the record's folded kick, which peaks late in every
   beat.
4. The hand-and-foot fills are the "double bass drum fills" Wikipedia
   names: the tab writes them snare, kick, tom, kick, tom, kick in triplets
   under the guitars' quarter-note-triplet run (Slowhand's 1st Verse opens
   with that run, N.C.).

#### Structure (1674938's bars; section names from Slowhand)

| Bars    | Part (Slowhand)      | Drums                                                                         | Section  |
| ------- | -------------------- | ----------------------------------------------------------------------------- | -------- |
| 1–8     | Intro                | no drums (the riff alone)                                                     | —        |
| 9–14    | Intro                | the snare on every triplet                                                    | A ×3     |
| 15–17   | Intro                | a chord hit with crash and kick, a tom pickup, another hit                    | B        |
| 18–20   | 1st Verse (N.C. run) | the hand-and-foot triplets                                                    | B (fill) |
| 21–31   | 1st Verse            | hat on the beat, the boogie kick                                              | C        |
| 32–40   | 1st Verse            | the pushes: crashes with the band, the hats shuffling; fill (40)              | D        |
| 41–60   | 2nd Verse            | as 21–40                                                                      | C, D     |
| 61–83   | Bridge               | hand-and-foot (61–62); a riff bar and a push bar in turn; stops, rolls        | E ×2     |
| 84–117  | Guitar Solo 1        | the ride's bell, then open hats; 6/8 bars; rolls; stops                       | F ×2     |
| 118–139 | 3rd Verse            | as the verses                                                                 | C, D     |
| 140–176 | Guitar Solo 2        | the riff's bar, triplet rolls round crashes, hand-and-foot (159–160, 167–168) | F        |
| 177–179 | Outro                | the snare roll, a last crash                                                  | A        |

Arrangement: `A A A B C D D C D D E E E E E E F F F F C D D F F F F F A` — 29 slots; sections 2 + 4 + 8

- 4 + 4 + 8 = 30 bars.

#### Left out

- The 6/8 (2/4) bars in solo 1 (88, 93): a section is one meter.
- Bars with sixteenths inside the shuffle at this tempo: the snare runs in
  109–110, 151–152 (`..2222222222..`), 66 and 76 — past the run rule (four
  consecutive steps in 12/8 stop at 150) and the critic's snare run.
- Bar 16's six-sixteenth tom pickup becomes three triplets (7416217 has two
  notes there).
- The hand-and-foot fill inside the solos: it has nothing on 2 or 4, and the
  critic wants a backbeat in every bar of a section that has one. It stays
  in B, which has none, and as the song's default fill.
- 1674938's ride-bell hemiola in 172–176 (the bell every other triplet
  against the snare): 7416217 reads those bars as open hats on the beat; the
  two disagree, so neither is written.

#### Doubts

- **The bars are a machine's.** Two machine readings, the record's onsets,
  the human guitar tab's form and Slowhand's "Shuffle" corroborate the form,
  the meter and the kick; the hat part, the crashes and the fills' notes are
  still AI. No human drum transcription or lesson was found.
- The record's shuffle is harder than a triplet (the off-beat near three
  quarters of the beat in places); 12/8 writes it on the triplet.

**Found on the way, not changed.**

- Modern Drummer dates The Boys Are Back in Town 1977. The single is 17 April
  1976 (Wikipedia, Jailbreak).
- Hot Press's 2025 reprint spells the song "Sha-Na-Na" in one place; it is
  Sha La La.
- Thin Lizzy's music is described as mixing hard rock with Irish folk, and
  Whiskey in the Jar is a traditional song. The model has no Celtic or
  folk-rock genre, so the record uses `hard-rock`, `rock`, `blues-rock` and
  `blues-shuffle`. A new genre would need a row in `GENRE_FAMILY`.
- No drummer was found naming him as an influence in their own words. The
  promoters' "often cited as being an influence by many of the world's top
  drummers" names nobody, so the record has no `cited_by` and no
  descendants.
- Songsterr tab authors write their own kit names into the drum track ("1970
  Ludwig Classic Maple" on Boys, "Hayman Showman Gold" on Whiskey). These are
  not evidence, and the record does not use them.

Sources: Wikipedia —
[Brian Downey (drummer)](<https://en.wikipedia.org/wiki/Brian_Downey_(drummer)>),
[Thin Lizzy](https://en.wikipedia.org/wiki/Thin_Lizzy) (read to character
100,000 of 167,712),
[Thin Lizzy (album)](<https://en.wikipedia.org/wiki/Thin_Lizzy_(album)>),
[Whiskey in the Jar](https://en.wikipedia.org/wiki/Whiskey_in_the_Jar),
[Shades of a Blue Orphanage](https://en.wikipedia.org/wiki/Shades_of_a_Blue_Orphanage),
[Vagabonds of the Western World](https://en.wikipedia.org/wiki/Vagabonds_of_the_Western_World),
[Fighting](<https://en.wikipedia.org/wiki/Fighting_(Thin_Lizzy_album)>),
[Jailbreak](<https://en.wikipedia.org/wiki/Jailbreak_(album)>),
[Johnny the Fox](https://en.wikipedia.org/wiki/Johnny_the_Fox),
[Bad Reputation](<https://en.wikipedia.org/wiki/Bad_Reputation_(Thin_Lizzy_album)>),
[Live and Dangerous](https://en.wikipedia.org/wiki/Live_and_Dangerous),
[Black Rose: A Rock Legend](https://en.wikipedia.org/wiki/Black_Rose:_A_Rock_Legend),
[Chinatown](<https://en.wikipedia.org/wiki/Chinatown_(Thin_Lizzy_album)>);
[Peter Murphy, Keeping Himself Lizzy, Hot Press, 2011](https://hotpress.com/music/keeping-himself-lizzy-7492530)
([2025 reprint](https://www.hotpress.com/music/happy-birthday-brian-downey-revisiting-a-classic-hot-press-interview-23067116));
[Will Russell, Hot Press, 2024](https://hotpress.com/music/brian-downey-on-thin-lizzy-and-vagabonds-of-the-western-world-nobody-could-really-label-us-23002096);
[Modern Drummer, Brian Downey: Style, Power, And Swing With Thin Lizzy, 2011](https://www.moderndrummer.com/?p=1984);
[Mike Dolbear, British Drum Icons: Brian Downey (interviewed January 2007)](http://mikedolbear.com/british-drum-icons/drummer-brian-downey/);
[OnlineDrummer, The Boys Are Back in Town (Steve Ley), description](https://www.onlinedrummer.com/shop/the-boys-are-back-in-town-thin-lizzy-drum-sheet-music/);
[Colin Hunt, Über Rock, 2019](https://uber-rock.co.uk/?p=3975);
Songsterr tabs 19634, 361, 47373, 20248, 20278, 56439, 56442
(`https://www.songsterr.com/api/meta/<id>` for the `aiGenerated` flag).

## AR. Joey Jordison (2026-10-18)

The `jordison` style plays **songs** the way `downey` (AQ) and `lombardo` do: each New picks one
of his records, and its tempo, meter and grooves come with it. His record
(`drummer-model/drummers/joey-jordison.json`, schema 1.5) is new and is written from this section.
It comes with five Slipknot recordings, `sources/joey-jordison.json`, and two new genres,
`style:nu-metal` and `style:death-metal`. **Both genres need a row in `GENRE_FAMILY`
(`metal-experimental`) before `layout.test.ts` passes.**

He performed masked, and his name was always public. The record is an ordinary one, with a
`persona` block (`real_identity_policy: "public"`) for #1's mask and jumpsuit.

**Which records are his.** Nathan Jonas Jordison was born on 26 April 1975 in Des Moines, Iowa,
and died in his sleep on 26 July 2021 in Waukee, Iowa, aged 46; no cause was announced
(Wikipedia). He joined Slipknot in 1995:

- **How he joined.** Shawn Crahan, Anders Colsefni and Paul Gray started the Pale Ones in
  September 1995. Gray invited Jordison to a rehearsal "to experiment with extra drum elements",
  and he joined on drums, which moved Crahan to percussion.
- **The name.** In late-night planning at the gas station where Jordison worked nights, he
  suggested renaming the band Slipknot, after one of its songs (Wikipedia, Slipknot).

He was #1, the drummer on the first four studio albums:

- _Slipknot_ (1999): he co-mixed it with Ross Robinson, and Wait and Bleed and Surfacing carry his
  music.
- _Iowa_ (2001): he and Paul Gray "wrote material for most of the album" from October 2000.
- _Vol. 3: (The Subliminal Verses)_ (2004).
- _All Hope Is Gone_ (2008): "the record that I've wanted Slipknot to sound like".

He also produced _9.0: Live_ (2005). Slipknot announced on 12 December 2013 that he had left; he
said he had been fired. In 2016 he revealed acute transverse myelitis, which had taken the use of
his left leg near the end of his Slipknot years.

Beyond Slipknot (Wikipedia):

- **His own bands.** Murderdolls, on rhythm guitar, from 2002; Scar the Martyr (2013–2016);
  Vimic; Sinsaenum from 2016.
- **Filling in.**
  - Metallica at Download 2004, eight of the thirteen songs on Lars Ulrich's kit.
  - Satyricon (late 2004), Ministry (2006), Korn (2007) and Rob Zombie (after 2010).

**How he played.**

- **Early.** He played guitar first. His parents gave him a kit at eight; he was self-taught and
  then had a teacher of "R&B and jazz techniques", though he wanted to play metal (Wikipedia;
  Drumeo). His first serious band, Modifidious, played speed and thrash metal.
- **Drum corps.** "Sehr geholfen hat mir auch, dass ich während meiner Schulzeit einige Jahre im
  Drum Corps gespielt habe. Dort habe ich viel über Stick Control gelernt" (years in a school
  drum corps; "I learned a lot about stick control there"; Bonedo, 2017).
- **Learning speed.** He learned by playing along to his favourite records, and on speed he said:
  "Man darf sich auf keinen Fall abschrecken lassen, wenn es nicht auf Anhieb klappt, denn das
  braucht seine Zeit" ("don't be discouraged if it doesn't work at once; it takes time").

His drummers, in his own words (Metal Hammer, 2016):

- **Dave Lombardo:** "the fucking master", "my ultimate influence as far as this type of music
  goes". _Reign in Blood_ came "in my fucking Easter basket" in 1986.
- **Charlie Benante:** "I busted my ass trying to learn the double bass parts to A Skeleton in the
  Closet as a kid ... He's hugely responsible for training me."
- **Lars Ulrich:** "his double bass was completely on point".
- **Bonham, Peart and Moon:** "I have to start with John Bonham"; Rush's 2112 "set my heart on
  fire"; Keith Moon "one of the most eccentric, fast and crazy drummers of all time".
- **Bill Ward:** "the best heavy metal drummer of all time ... the ultimate fucking groove and
  swing".
- **Hellhammer:** "his double bass and blasts and fills".
- **Brann Dailor and Danny Heifetz:** also on his list.

He named others elsewhere:

- To Bonedo in 2017: Pete Sandoval, Tomas Haake, Danny Carey, Dale Crover (the Melvins were his
  favourite band) and Charlie Watts. Stewart Copeland was the reason for his octobans.
- Wikipedia adds Peter Criss, Gene Krupa, Buddy Rich and Vinnie Paul.

What the writing says about him:

- **Wikipedia:** "technical parts influenced by thrash metal, with blast beats and fills at high
  tempos". _Iowa_ is "one of the few mainstream albums" with blast beat percussion, and a review
  calls it "an abrasive amalgam of death metal blastbeats and bestial grunting".
- **Drumeo** credits him with bringing death-metal double bass into the mainstream after
  Metallica and Slayer. It quotes him: "Double bass needs to be used as a dynamic, not for
  flash", and "Songs are not drum solos". It also notes the snare hits and fills he put in
  unexpected places, and Stewart Copeland's praise: "All that cool shit that he does with both
  his feet and his hands has to be marveled at."

Bonedo's play-alike (2025) writes out his grooves with notation:

- **People = Shit.** It opens on a traditional blast at 210, then double bass at 220. The intro
  ends on a "Hammer-Blast" (kick, snare and china together in continuous sixteenths) and a
  one-bar 32nd fill across the kit.
- **The half-time chorus.** The kick lands on the last sixteenth, with two kicks against the snare
  on 2 and 4. The chorus ends on a sextuplet snare roll with china accents.
- **Duality's verse.** It "leaves out the backbeat", with the kick and hat on the off-beats.
- **Psychosocial's intro.** A sextuplet "four hands, two feet" fill.
- **Before I Forget.** A mosh part "with many groups of three".

Jay Weinberg, who took his chair, called him "one of the greatest drummers we've ever had the
privilege of witnessing" (Loudwire, from MusicRadar, 2016). In polls:

- Rhythm's readers voted him the best drummer of the previous 25 years (2010).
- Loudwire's readers voted him the world's greatest metal drummer (2013).
- He won a Metal Hammer Golden God in 2016.

**The tabs, bar by bar.** Seven human Songsterr tabs were read, with the Jordison track picked by
name (each tab also carries Crahan's and Fehn's percussion). They agree with Bonedo.

- **People = Shit (14043).**
  - The intro blast: the kick on every eighth, the snare on the sixteenth after each, and the
    china with the kick, at the tab's 216.
  - The hammer blast: all three on the eighths.
  - The chorus at 121: china quarters, the snare on 2 and 4, and the kick `x.x.x.x...x.x..x`.
  - 19 of its 119 bars have the kick in continuous sixteenths, 12 are traditional blasts and 5
    are hammer blasts.
- **Disasterpiece (18193).** At 210. The main riff alternates two crashes on the beats over a
  rimshot backbeat and quarter-note kicks, then switches to china quarters over kick eighths. 19
  of its bars have continuous sixteenths on the kick, and 6 are blasts.
- **The Heretic Anthem (18446).** Sixteenths on the feet under open-hat eighths at about 199.
- **The later records.**
  - Duality (18211) at 145: the open hat on the off-beat eighths, a ghost before 3, and the kick
    `x..x..x...xx.xx.`.
  - Psychosocial (19615) at 135: open-hat eighths, a rimshot backbeat and kick quarters, then
    kick eighths under a tom figure.
  - Neither song has a blast; Psychosocial has one bar of double-bass sixteenths.
- **The debut.** Wait and Bleed (17296) at 186: open-hat eighths and a kick in threes,
  `xxx...xxx.x...x.`. Eyeless (17306) at 210: crash quarters with the snare on 2, 3 and 4.

Every tab is in 4/4. Songsterr's tempos run high and are taken as the tabs' own; the record says
so in its open questions.

**Kit.** The kit is Paiste from May 2001 (Paiste). For the Iowa era, community notes have an
Orange County Drum & Percussion kit and a 13x7 maple snare, and Pearl Masters MMX from the Vol. 3
tour (Equipboard); this needs a dated source. In detail:

- **Drums.** Two 22x18 bass drums throughout; four racks and two floors in the Iowa listing.
- **Cymbals.** Chinas everywhere. The 2008 Slipknot set-up lists three 2002 Wild chinas and a
  RUDE china, RUDE crash/rides, 2002 Wild hats, a 2002 Power Ride and Signature splashes.
- **Triggers and electronics.** ddrum triggers and Roland electronics (Wikipedia).
- **Sticks.** Ahead JJ1 sticks, then his Promark TX515W from 2005.

In 2017 he played a Pearl Reference in piano black with a 14x6.5 Masters Maple snare and a Demon
Drive double pedal on the right bass drum only (Bonedo).

On stage in 2002 (Disasterpieces): black shells and chrome, a racing seat with a harness, and a
round riser ringed in red light that rose and tipped the kit toward the crowd. On the All Hope Is
Gone tour it turned him upside down; a loose harness once nearly let him slip (Bonedo).

**Devices (schema 1.5).** None found. A `devices_search` is recorded instead. It read:

- The seven tabs above bar by bar, and four more (My Plague, (Sic), Purity, Spit It Out) scanned
  for blasts and double bass.
- Bonedo's play-alike and interview.
- Drumeo, and Metal Hammer.
- The Wikipedia pages.

No Modern Drummer, MusicRadar or Drum! transcription was read. The leads that did not hold:

- **Before I Forget's groups of three, and the 3+3+2 kicks** of Duality and Wait and Bleed. They
  follow the riff inside the bar and never cross the bar line as a cycle.
- **His sextuplet and 32nd fills.** These are subdivision and speed, not a device.

**What the style encodes.**

- **Feel.** Straight sixteenths and no swing: on top of the beat, tight, `jitter` small (about
  0.015). Swing at zero.
- **Ghosts.** `ghostBias` low, about 0.1. The tabs have almost none; Duality's one ghost before 3
  is the exception.
- **Hands.**
  - Open-hat eighths in the verses.
  - Chinas on the beat in the choruses and over blasts; two crashes by turns on the beats
    (Disasterpiece).
  - Rimshot backbeats on 2 and 4, or on 3 in the half-time sections.
- **Blasts (Iowa only).** Two kinds:
  - Traditional: the kick on the eighths, the snare between, and the china with the kick.
  - Hammer: kick, snare and china together.
  - Both at 200 to 220, for four to eight bars at a time, as the intro or the song's peak.
- **Double bass.** Continuous sixteenths on two kicks (K and K2 alternating) for the heavy riffs,
  under open hats or a china. Used as a dynamic: in sections, not under every groove.
- **Half time.** Choruses drop to half time: the china on the beats, the snare on 2 and 4 at the
  slow tempo, and the kick on the last sixteenth pushing over the bar line.
- **Kick with the riff.** Threes inside the bar (`x..x..x.`, `xxx...xxx`) in the verses.
- **Fills.** Frequent, and sometimes where the phrase does not ask for one:
  - single strokes in 32nds round the toms;
  - sextuplet snare rolls with china accents;
  - a sextuplet "four hands, two feet" figure.
- **Kit.** `crocell`, as `lombardo` and `haake` use: a metal band's double-kick kit with a tight,
  cracking snare and a china. Optionally there is a light re-tune for Iowa (`KIT.md`): snare rate
  about 1.09, kick 1.03, dry, drive about 1.10. No freely licensed samples of his own kit exist.
- **Likeness.** London Arena, 16 February 2002 (Disasterpieces): the white mask with black and
  dark red streaks, long black hair over it, and the off-white jumpsuit with black bands across
  the back and a "1" patch on the arm. `likeness/MASK.md` is the build sheet; the `Persona` type
  needs a `mask: 'jordison'`.

**Patterns in the record.** Nine bars or bar pairs, all `approximation` and `draft`, from human
Songsterr tabs (`aiGenerated` false through the meta API):

- People = Shit: the intro blast, the hammer blast and the half-time chorus.
- Disasterpiece's main riff (two bars).
- The Heretic Anthem's double bass.
- Duality's verse.
- Psychosocial's verse and tom bar.
- Eyeless's verse.
- Wait and Bleed's verse.

**The songs.**

| Song                        | Year | Tempo (quarter)                                                                                                       | Meter                                      | What defines it                                                                                                                           | Source of the bars                                                             |
| --------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| (Sic)                       | 1999 | 192 (tab); 192.9 (record autocorrelation), 192.3 (beat-tracked); length matches (198.8 s against 200 s)               | 4/4 in eighths                             | rimshot hits with the floor tom; double bass under open hats; snare on every beat over the ride in the chorus; half-time breakdown        | Songsterr 17303 (human)                                                        |
| Wait and Bleed              | 1999 | 162→176→184→186 (tab); 187.5 (record); length matches (148 s)                                                         | 4/4 in eighths                             | the riff's three-note kick; chorus toms between the backbeats; double bass verse with the snare on 3; crash quarters over both feet       | Songsterr 17296 (human)                                                        |
| Surfacing                   | 1999 | 210, build-up 250–223 (tab); 212.7 (record); 220.6 s against 218 s                                                    | 4/4 in eighths                             | two-handed hats round the backbeat (the "paradiddle groove"); crash on every beat; four-bar tom figure; half-time bridge over double bass | Songsterr 586 (human)                                                          |
| Eyeless                     | 1999 | 205–210, breaks 188–200 (tab); 207.1 (record); length matches (235.4 s against 236 s)                                 | 4/4 in eighths                             | snare hits with the tom answering; crash quarters over eighths on the kick; half-time post-chorus; linear verse bar                       | Songsterr 17306 (human)                                                        |
| People = Shit               | 2001 | 216/236 intro, 116–123 body (tab); 122.3 and 244.8 (record); 217.8 s against 216 s                                    | 4/4; the intro at ×2 in eighths            | blast intro; crash eighths over a syncopated kick; toms over sixteenth double bass; sextuplet rolls                                       | Songsterr 14043 (human), form checked against 485865 (human)                   |
| Disasterpiece               | 2001 | 210–215 (tab, marked slow); 216.4 (record); 278 bars at 216 = 309 s, the record's length                              | 4/4 in eighths                             | toms intro; blast; china over double bass; skank beat on the ride; snare roll over the kick in quarters; half-time choruses               | Songsterr 18193 (human)                                                        |
| The Heretic Anthem          | 2001 | 199–202 (tab); 205.1 (record), 199–207 beat-tracked; 220.6 s against 218 s of band                                    | 4/4 in eighths                             | double bass under hats and china; half-time chorus on the crash; floor tom in eighths                                                     | Songsterr 18446 (human, the only tab)                                          |
| Duality                     | 2004 | 138–150 (tab); 145.9 (record); length matches (254 s against 253 s)                                                   | 4/4                                        | toms over the kick in eighths; verse kick in threes; crash on the "and" of 4 over the 1; roll accented in threes; linear crash/snare bar  | Songsterr 18211 (human)                                                        |
| Before I Forget             | 2004 | 134, rising to 144/150/142, outro 134 (tab); record the same, 134.5→151→135; length matches (263 s against 264 s)     | 4/4                                        | kick every three sixteenths with the snare late; toms on 1 in the chorus; floor-tom bridge; four-sixteenth kick in the verse              | Songsterr 1379 (human)                                                         |
| Psychosocial                | 2008 | 135 (tab); 136.0 (record); 279 s against 284 s (tail)                                                                 | 4/4                                        | a tom bar every fourth bar; crash quarters in the chorus; half-open hats with snare bursts; half-time breakdown with fours on the kick    | Songsterr 19615 (human)                                                        |
| Gematria (The Killing Name) | 2008 | 196–216, breakdown 132–147 (tab); 207 body, 146.8 breakdown, 215 intro (record); length matches (361 s against 362 s) | 4/4 in eighths; the breakdown at ×¾ in 4/4 | double bass under hats and china; skank on the bell; snare on 1 and 3 under the solos; three-quarter-speed breakdown                      | Songsterr 499331 (human, "Studio Version"), form checked against 79755 (human) |

**Tried but not used.** Spit It Out (17314), Left Behind (23003, 402659, 542390), My Plague (22263, 541688), The Blister Exists (18232, 61 bars off the grid at 95), Pulse of the Maggots (53807, 488235) and Dead Memories (22111) all have human tabs. They were dropped only to keep the list at eleven across the four albums, not for want of a tab. Pulse of the Maggots and My Plague are the best candidates to add next.

**Arrangement.** Every song plays the record's sections in order, intro to outro, within 32 slots and at most 32 distinct bars. Long sections are shortened, and each song's comment says by how much.

| Song | Year | Tempo (quarter) | Meter | What defines it | Source of the bars |
| ---- | ---- | --------------- | ----- | --------------- | ------------------ |
|      |      |                 |       |                 |                    |

### Sources (AR)

- https://en.wikipedia.org/wiki/Joey_Jordison
- https://en.wikipedia.org/wiki/Slipknot_(band)
- https://en.wikipedia.org/wiki/Slipknot_(album)
- https://en.wikipedia.org/wiki/Iowa_(album)
- https://en.wikipedia.org/wiki/Vol._3:_(The_Subliminal_Verses)
- https://en.wikipedia.org/wiki/All_Hope_Is_Gone
- https://en.wikipedia.org/wiki/Disasterpieces
- https://www.loudersound.com/features/joey-jordison-picks-the-10-greatest-drummers-ever (Metal Hammer, 2016 interview)
- https://www.bonedo.de/artikel/interview-und-gear-chat-mit-joey-jordison (2017)
- https://www.bonedo.de/artikel/drum-play-alike-8-joey-jordison-workshop (2025)
- https://www.drumeo.com/beat/?p=29774 (5 Things Every Drummer Can Learn From Joey Jordison)
- https://www.paiste.com/en/musicians/joey-jordison
- https://equipboard.com/joey-jordison and https://equipboard.com/items/ocdp-joey-jordison-iowa-drum-kit (community-sourced)
- https://loudwire.com/slipknot-jay-weinberg-copying-joey-jordison-would-be-insulting/
- https://hellorayo.co.uk/kerrang/entertainment/music/slipknot-masks (the 2008 mask)
- https://www.youtube.com/watch?v=tUibKh0Z--c (Disasterpieces drum solo, London, 2002)
- https://www.youtube.com/watch?v=l4y1HPrKa8I ("Disasterpiece" drum cam, London, 2002)
- https://www.songsterr.com/api/meta/<id> for 14043, 17306, 18193, 18211, 19615, 17296, 18446 (and 22263, 17303, 18360, 17314 scanned)

## AS. Steve "Skinny" Felton (2026-10-18)

The `skinny` style plays **songs** the way `downey` (AQ) does: each New picks one
of Mushroomhead's records, and its tempo, meter and grooves come with it. His
record (`drummer-model/drummers/steve-felton.json`, schema 1.5) is new, written
from this section, with two recordings (XX, XIII), `sources/steve-felton.json`,
and two new genres, `style:alternative-metal` and `style:industrial-metal`, which
need rows in `GENRE_FAMILY` (`metal-experimental`).

**Identity.** He is public: Steve Felton, credited by name as producer on every
Mushroomhead record. The record is an ordinary one with a `persona` block
(`real_identity_policy: "public"`) for Skinny, the masked drummer. No birth date
or place was found in any source read, so none is stored.

**Which records are his.** Mushroomhead began in 1993 in Cleveland's Warehouse
District as a side project. Its members came from the city's other bands, and
wore masks and pseudonyms so the new band would not be confused with them
(Wikipedia). Felton: "Everybody was in other bands", playing doom, extreme and
black metal; "I didn't want to sound like Pantera or Nine Inch Nails" (Loudwire,
2014). Metal Hammer (2024) has eight of them in "home-made horror masks". He
tells how it started (2002 interview, from captions): the first show was at a
Cleveland club, and "three days later we were playing in front of 2,000 people at
the Cleveland Agora with Gwar".

He is the band's only constant member: drums from 1993 to 2022, and in the
studio since; samples, keyboards and production throughout; percussion and
water drums from 2006 (Wikipedia, and its members list). He produced every
record and directed most of the videos (Nu Metal Agenda, 2024). The records
he drums on:

- _Mushroomhead_ (1995), _Superbuick_ (1996) and _M3_ (1999), all self-financed.
- _XX_ (Eclipse, May 2001; Universal, December 2001). These are the best songs
  of those three albums, remixed for the label by Toby Wright. Produced by
  "Mushroomhead and Steve Felton".
- _XIII_ (Universal, 2003). Recorded at Mars Studio, Shalersville, with Johnny K
  and Matt Wallace. No. 40 on the Billboard 200 and about 400,000 sold
  worldwide, the band's biggest record.
- _Savior Sorrow_ (2006) to _A Wonderful Life_ (2020), and _Call the Devil_
  (2024) in the studio. Which tracks the touring drummers played is not sourced.

In 2022, back injuries took him off the live kit. Aydin Kerr plays drums on
stage, and Felton plays water drums, keyboards and samples (Wikipedia). The
style plays the XX and XIII years, his prime at the kit.

**How he played.** He came to drums late, from thrash: "86, 87, really wanted to
become a metal drummer. I was into bands like Megadeth, Metallica, Slayer,
Sacred Reich ... got my first drum set when I was 16, I was a late starter, never
took a lesson, taught myself everything" (Zildjian, _Sound Legacy - Skinny_,
2014, from captions). He also wanted to be big: "Back then I had big hopes and
dreams that we'd be Metallica one day" (Metal Hammer, 2024). He names no
drummer. The record links him to Lombardo and Lars Ulrich through the bands, at
`scope: band`, `inferred`.

The rest of his sound came from outside metal. In 2002 (from captions): "I'll
bring like the hardcore gabber type techno ideas ... the real abrasive, 180
beats a minute". He named Rotterdam's _Nightmare in Rotterdam_ series and early
Thunderdome, and said the band ended its home shows "with a mix set of brutal
hardcore". J Mann, beside him: "by being the drummer, that is also the
foundation musically". Skinny himself: "I'm really a drummer". On the drums in
general (Dead Rhetoric, 2024):

- "It's always been the heart and soul of the live machine."
- "The kick drum is almost as loud as the voice or guitars."
- "I'm a big fan of industrial metal. Anything percussive or theatrical."

Kiss, Alice Cooper, Bowie, the Residents, Mr. Bungle and Pink Floyd's _The Wall_
shaped the masks and the films rather than the drumming (Loudwire; Metal
Hammer; Nu Metal Agenda).

Five human Songsterr tabs show the parts, each read by its commonest bars:

- **Sun Doesn't Rise** (12854, 96). The verse has a crash on 1 and the open hat
  on every other eighth. The snare is on 2 and 4 with a 16th pickup. The kick
  is in dotted eighths with the riff, on steps 0, 3, 6 and 9, then 11 and 13.
  The intro is ten bars of the mid tom in 16ths, two on and one off, over the
  kick.
- **Solitaire Unraveling** (47989, 140–155). Half time: the snare on 3, the open
  hat on the quarters, the kick on syncopated eighths. A machine tab (1321870)
  agrees.
- **Kill Tomorrow** (47992, 140). 47 of 134 bars are continuous 16th double bass
  under open quarter hats and the snare on 2 and 4. Half-time bars and a crash
  and china intro on dotted eighths make up the rest.
- **Before I Die** (13545, 160). 16th double bass under the backbeat; half time
  with a double-bass burst to the bar line; a floor-tom intro in 16ths.
- **Bwomp** (420309, 140 and 110). The techno sections are the hat in 16ths over
  four on the floor, his gabber. The verse is a backbeat with the kick in a
  burst of four 16ths.

The tabs have no ghost notes, no swing and no odd meters.

**Kit.** No make is on record for any era. Footage of 2002 shows black lacquer,
chrome, and a chrome rack across the front. There are four rack toms in a row,
floor toms and a dozen cymbals. The front head is the X face in a red ring
(Ozzfest, East Troy, 11 August 2002; Pierre's, Fort Wayne, 21 November 2002).
Sabian is legible on a crash in the "Solitaire Unraveling" video. By 2014 he
was a Zildjian artist, with all A series cymbals: chinas at each end, two hats
(14 and a closed 12), four Heavy Crashes, a Mega Bell ride, a Zil-Bel and a
splash. No source says he triggered his drums or played pads on the records.
The water drums came in 2006. He built them with Cleveland designer Dave Brooks,
after the Blue Man Group, for an intermission piece of his own: "a drum solo but
not on a drum set" (RocknRollWorld, 2015). They are not his kit, and the style
does not play them.

**Devices (schema 1.5).** None found. A `devices_search` is recorded instead. It
read the five human tabs and two machine tabs, the Zildjian film, eight
interviews and the Wikipedia pages. No Modern Drummer, DRUM!, Drumeo or MusicRadar
feature or lesson was found. The lead that did not hold: Sun Doesn't Rise's
dotted-eighth kick (steps 0, 3, 6, 9, then 11, 13). It follows the riff inside one
bar and lands on the next 1. That is a riff figure, not a cross pulse held
against the meter. Half time, 16th double bass and four on the floor are feel
and speed.

**What the style encodes.**

- **Feel:** straight 16ths, Swing 0. Most songs sit at 90–160; the half-time
  songs are written at the tempo people quote (Solitaire Unraveling at 140–155,
  the snare on 3).
- **Ghosts:** `ghostBias` near 0 (about 0.05). The tabs have none; the playing is
  kick, backbeat and cymbals.
- **Kick:** on the riff in syncopated eighths and 16ths under a plain backbeat.
  It is the loudest voice ("almost as loud as the voice or guitars").
- **Hat and crash:** an open, washy hat on the quarters in half time and on the
  off-beat eighths elsewhere. A crash on the 1 of each phrase; chinas for the
  heaviest parts.
- **Double bass:** continuous 16ths alternating feet (`doubleKick: true`) in the
  heaviest sections (Kill Tomorrow, Before I Die), under the backbeat. No
  blasts.
- **Techno:** four on the floor under 16th hats for the techno sections (Bwomp).
- **Fills:** short, at phrase ends: tom runs in 16ths, a 16th snare pickup, a
  crash on the 1. Song intros on one tom in 16ths (Sun Doesn't Rise, Before I
  Die). `midFills` low.
- **Kit:** `crocell`, as it is: a metal band's kit with a punchy kick, a tight,
  cracking snare and two of each cymbal. It is what `lombardo` and `haake` play.
  No freely licensed samples of his own kit were found. The water drums and the
  band's samples are not played. The likeness's kit is black gloss and chrome
  (`KIT.md`).

**The songs.**

The `skinny` style plays **songs** as `downey` (AQ) does: each New picks one of his records and plays
it in sections, intro to outro, in an `arrangement` that follows the record (at most 32 distinct bars
and 32 slots). Section boundaries are the Songsterr tabs' own markers, read with `tab.py --sections`;
Burn and Qwerty have none and are read from their bars, which fall in fours. Every tempo was
beat-tracked from the record (autocorrelation of the onset envelope over 4, 8, 16 and 32 beats, and in
30–40 s windows for the unclicked 1990s records) and checked against the tab's length at its marked
tempo. All twelve follow human transcriptions (`aiGenerated: false` through the meta API).

**Grids.** Sixteenths, except: the quarter-note-triplet bars of Kill Tomorrow and Solitaire and the
whole of We Are the Truth in `4/4-6`; Burn's bar of 5/4. Qwerty is counted at 155 (its 32nd double bass
as sixteenths), each tab bar two bars here. Where the feet run sixteenths above 150 (Before I Die, Burn,
43's fast break, Qwerty), those sections are in eighths (`4/4-8`) at the record's tempo, as Lombardo's
and Jordison's fast songs are: the sixteenth double bass falls on the eighths. Every part's written
range is its `playableBpm` as written, under its meter's ceiling.

| Song                 | Year                 | Tempo (quarter)                                                                                   | Meter                                        | What defines it                                                                                          | Source of the bars                      |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 43                   | 1995 (XX 2001)       | 178–180 in the tab's count (backbeat at 89–90; record unclicked, 808 beats in ~271 s)             | 4/4; the fast break in 4/4-8                 | floor tom and kick in threes, crashes in pairs, half time; a break in dotted eighths, then the feet      | Songsterr 420311 (human)                |
| Bwomp                | 1996 (XX 2001)       | 140–146 (record, unclicked; tab 140); the breaks at 104–106 (tab 110), played at the song's tempo | 4/4                                          | sixteenths on the hat over the kick on the beat, opened on the riff; four kicks under 2 and 4            | Songsterr 420309 (human)                |
| Solitaire/Unraveling | 1999 (XX 2001)       | 142–156 drifting (record windows; tab map 127–155; length 272 s against 274);                     | 4/4; two bars in 4/4-6                       | half time on open hats, a crash every other bar; quarter-note-triplet hits and a 6/4 turn                | Songsterr 47989 (human)                 |
| Before I Die         | 1999 (XX 2001)       | 158–167 (record, unclicked; tab 160; 195 s against 193); runs in 4/4-8                            | 4/4; six sections in 4/4-8                   | a sixteenth run on the feet every other bar; double bass under 2 and 4, then every beat                  | Songsterr 13545 (human)                 |
| Sun Doesn't Rise     | 2003                 | 96 (record 96.0, a click; tab 96; 196 s against 194)                                              | 4/4                                          | the kick in dotted eighths under open eighths, a crash on every 1; the mid-tom figure                    | Songsterr 12854 (human), track "Skinny" |
| Kill Tomorrow        | 2003                 | 144.5 (record, a click; tab 140; 222.5 s at 144.5 against 226.6)                                  | 4/4; the tom break in 4/4-6                  | half time, a cymbal sweep in dotted eighths every fourth bar, double bass, toms in quarter-note triplets | Songsterr 47992 (human), track "Skinny" |
| Becoming Cold        | 2003                 | 141 (record, a click; tab 135; at 141 the tab's empty bars fall on the record's silence at 201 s) | 4/4                                          | three sixteenths of kick on the 1 under an open-closed hat; double-bass bursts; half-time chorus         | Songsterr 573806 (human)                |
| Save Us              | 2006                 | 122 (record, a click; tab 125; 228 s at 122 against 230)                                          | 4/4                                          | half time, the kick on the riff, floor tom and kick in eighths; a verse that stops                       | Songsterr 420301 (human)                |
| 12 Hundred           | 2006                 | 118 (record, a click; tab 120/118; 201 s against 204)                                             | 4/4                                          | crash and snare on every beat over the feet (32nds, as sixteenths); ghost rolls; double bass; half time  | Songsterr 420304 (human)                |
| Burn                 | 2006                 | 156 (record, a click; tab 156; 172 s against 174); runs in 4/4-8                                  | 4/4, a bar of 5/4; four sections in 4/4-8    | half time with bursts of eight sixteenths on the feet, the crash on every beat, a floor-tom gallop       | Songsterr 6264698 (human); no markers   |
| Qwerty               | 2014 (shared credit) | 77.5 (record, a click; tab 77), counted at 155; runs in 4/4-8                                     | 4/4 at 155 (tab bars doubled); four in 4/4-8 | half time with the feet in sixteenths, chinas and splashes on the beat, stops and hits                   | Songsterr 480174 (human); no markers    |
| We Are the Truth     | 2014                 | 162 (record, a click; tab 160; 238.5 s at 162 against 245)                                        | 4/4 in sextuplets (triplet eighths)          | a tom groove in triplets under a crash on 1 and 3; the kick alone; the snare in triplets                 | Songsterr 420313 (human)                |

**Songs tried and dropped.**

- **Born of Desire** (M3): only machine-made tabs (1943167, rev 2588249, 160 bpm, 44 distinct bars;
  4717023, rev 6169713, 167–175 bpm, 5 distinct bars). They disagree on the tempo and the second is a
  sketch; with human tabs for twelve other songs, the rule against machine tabs applies.
- **Simple Survival** (Savior Sorrow): the human tab (47995, rev 302726) stops after 33 bars (1:27 of
  3:15); the full tab (4341815) is machine-made.
- **Our Apologies** (The Righteous & the Butterfly): Songsterr 420312 has no drum track.
- **The Heresy** (A Wonderful Life, 2020; human tab 488351, 85 bpm, markers) and **Come On** (Beautiful
  Stories, 2010; human 420310): usable, left out to keep twelve, and because both records credit a
  second drummer (Godsey; Daniel Fox) with no track split. Either could be a thirteenth.
- Human tabs also exist for Xeroxed, The Wrist, Never Let It Go, These Filthy Hands, The New Cult King,
  Conflict, The Final Act, Nowhere to Go, Mother Machine Gun, The Dream Is Over, Almost Gone, Eternal,
  Destroy the World Around Me, Damage Done, Out of My Mind, Seen It All, The Harm You Do and others;
  not read.

**Doubts, in one place.**

- The sections in eighths (Before I Die, Burn, 43's fast break, Qwerty) halve the feet's sixteenths
  and drop the kick's "e" and "a" onto the eighth before, to keep the record's tempo.
- Bwomp's two breaks are at three quarters of the song's tempo on the record; a section can only be
  ×½ or ×2, so they play at the song's tempo.
- Snare rolls are written with every fourth note left out (the critic refuses four in a row); 12
  Hundred's 32nd kick gallop is written as straight sixteenths.
- Qwerty's drums are credited to Skinny and Robbie Godsey together (tracks 2–4, 9, 10, 12 are Godsey's).
- Burn's and Qwerty's section names are mine (no markers).
- Solitaire's 6/4 turn keeps only its four beats of triplets.

| Song | Year | Tempo (quarter) | Meter | What defines it | Source of the bars |
| ---- | ---- | --------------- | ----- | --------------- | ------------------ |
| …    | …    | …               | …     | …               | …                  |

**Sources** (in `sources/steve-felton.json`):

- Wikipedia: _Mushroomhead_; _List of Mushroomhead band members_; _XX_; _XIII_.
- Zildjian, _Sound Legacy - Skinny_ (video, Mayhem Festival, 12 November 2014),
  automatic captions.
- J Mann and Skinny, European interview, spring 2002 (EraseTheDoubt upload),
  automatic captions.
- RocknRollWorld Magazine, _20 minutes with Skinny_ (video, 2015), automatic
  captions.
- Chris Epting, Loudwire, 30 July 2014.
- Katarina McGinn, Dead Rhetoric, 8 August 2024.
- _Water's Rage_, The Nu Metal Agenda, 19 September 2024.
- Greg Latham, Rock Sins, 30 July 2019.
- Paul Travers, Metal Hammer (Louder), 19 September 2024.
- Blabbermouth, _Would Mushroomhead ever perform without the masks?_, 17 July 2024.
- Footage: _Solitaire Unraveling_ official video (2002); Ozzfest, East Troy, 11
  August 2002; Summerfest, Milwaukee, 27 June 2002 (both Liberated Tape Archive);
  Pierre's, Fort Wayne, 21 November 2002 (Brad Nolan, drum angle).
- Songsterr human drum tabs 12854, 47989, 47992, 13545, 420309 (`aiGenerated`
  false); 1321870 and 1943167 (machine) for comparison.

## AT. Jizmak Da Gusha (2026-10-18)

The `jizmak` style plays **songs** the way `downey` (AQ) and `lombardo` do:
each New picks one of his records, and its tempo, meter and grooves come with
it. The record (`drummer-model/drummers/jizmak-da-gusha.json`, schema 1.5) is
new, written from this section. It comes with six Gwar albums in
`recordings/` and `sources/jizmak-da-gusha.json`.

**Who he is.** Jizmak Da Gusha is Gwar's drummer, a costumed character.
Brad Roberts has played him since 1989. Roberts is openly credited on every
album ("Brad Roberts (Jizmak Da Gusha): drums"), so the record is a public
one with a `persona` block (`real_identity_policy: "public"`). It has
`full_name` "Brad Roberts" and no `born`, because no source read gives a
date or place.

In the band's story Jizmak is a beast from the planet "The Wide Wide World of
Sports". He was frozen in ice for a millennium and thawed to replace the
drummer Nippleus Erectus (Wikipedia). He is "the only member to have been
portrayed by the same human since 1989" (Spotlight Report, 2025), and he
gives interviews in character.

The brief said he had retired from the role. Nothing read says so:

- Wikipedia's member list has him in the February 2024 to present line-up.
- He gave interviews as Jizmak in May 2025 (Milwaukee Metal Fest), August
  2025 (before Good Things in Australia) and November 2025 (the kit
  run-down).
- In August 2025 he said Gwar "is going to be around forever".

The record keeps him active, and its `open_questions` say why.

**Which records are his.** Gwar formed in Richmond, Virginia, in 1984. It
grew out of Dave Brockie's punk band Death Piggy and the Slave Pit, Hunter
Jackson and Chuck Varga's prop workshop (Wikipedia, Gwar). The drummers
before him (List of Gwar members) were:

- Sean Sumner (1985).
- Jim Thomson, as Hans Sphincter and Hans Orifice (1985 to 1987).
- Rob Mosby, as Nippleus Erectus (1987 to 1989), on _Hell-O_ (1988).
- Pete Luchter, as Lee Beato, for a few gigs in 1989.

Thomson filled in on the 1989 tour after Luchter left, and "later quit and
was replaced by Brad Roberts" (Wikipedia, Gwar). Roberts "first started
playing with Gwar in 1989, after the year's North American tour", in time to
record _Scumdogs of the Universe_ (Wikipedia, Jizmak Da Gusha). A pressing
error credited that album to Mosby.

He is the credited drummer on every Gwar album from _Scumdogs_ (January 1990) to _The New Dark Ages_ (2022), and on the EP _The Return of Gor-Gor_
(2025). The record keeps six albums:

| Record                      | Year | Producer                           | Why                                                                          |
| --------------------------- | ---- | ---------------------------------- | ---------------------------------------------------------------------------- |
| _Scumdogs of the Universe_  | 1990 | Ron Goudie, Hypo Luxa, Paul Barker | crossover thrash; The Salaminizer, Sick of You (the most-played live song)   |
| _America Must Be Destroyed_ | 1992 | Glen Robinson                      | Gor-Gor's toms with the kick at 230; The Road Behind, a power-ballad parody  |
| _This Toilet Earth_         | 1994 | Scott Wolfe                        | Saddam a Go-Go's disco hat under horns                                       |
| _Violence Has Arrived_      | 2001 | Grant Rutledge and Gwar            | "more of a thrash metal sound than any of their previous albums"; Biledriver |
| _War Party_                 | 2004 | Gwar and Glen Robinson             | the heavier 2000s with Cory Smoot; the tour of the wolf-headed Jizmak        |
| _Lust in Space_             | 2009 | Cory Smoot and Gwar                | Let Us Slay's 6/4 bar and gallops                                            |

Some claims rest on the band's own words. In 2025 he said he named "The
Salaminizer". He also said a verse of "King Queen" was cut for length and
restored on the 2020 reissue (Defenders of the Faith).

Outside Gwar he has played in:

- X-Cops (two songs, replacing Mike Dunn).
- The Dave Brockie Experience (_Diarrhea of a Madman_, 2001; _Songs for the
  Wrong_, 2003).
- No Deal (2001).
- Armstrong, a Dallas pop-rock band, with Zach Blair (2002).

The sources are Wikipedia and Drummerszone.

**How he played.** There is little in his own words about playing, and no
drum magazine interview was found. What there is comes from the Drummerszone
profile (read through a summary) and a 2017 fan essay built on it:

- He nearly gave up: "At the age of ten, I wanted to quit playing drums,
  almost as soon as I had started". His mother made him finish what he
  started.
- He worked for his kit: "It took four years to get the trap kit and started
  playing seriously at 14". He mowed lawns for it, and his parents matched
  what he saved. This is quoted from a CDN interview that was not found.
- **Influences:** "Besides Buddy Rich", Alex Van Halen, Bill Stevenson, Dave
  Lombardo, Mikkey Dee, Bill Ward and Billy Cobham. "You name it, I listened
  to it."
- **The job:** "The drummer's job is to make that song swing."

A 2020 podcast's description adds "a Bad Brains show that changed his life"
and "the difficulty of playing drums in costume". Only the description was
read (Crash Bang Boom). Paiste's page, written in character, says he "beats
any who cannot keep up with the unrelenting tempo he sets".

The playing itself is from eight human Songsterr tabs (`aiGenerated` false
through the meta API), read by distinct bar:

- **The crossover beat.** The hat open on every beat, the snare on 2 and 4,
  the kick on the off-beats between.
  - The Salaminizer at 187: bar 19, 16 of 166 bars.
  - El Presidente at 160: bar 11, 35 of 175.
- **Mid-tempo punk.** Sick of You at 132: the hat in eighths accented on the
  beats and opened on the "and" of 4, the foot closing it. Its commonest bar
  is the hat over four on the floor.
- **Toms with the kick.** Gor-Gor at 230: a two-bar figure in eighths, the
  mid and floor toms interlocked with the bass drum, with a snare and china
  on the "and" of 4 (bars 11 and 12, 28 of 194 between them). Its tempo map
  runs 70, 230, 220, 150, 230.
- **Double bass.** Biledriver at 130 (the tab marks 125; the record beat-tracks at 130): the bass drum in unbroken sixteenths
  in most bars, under either the hat open on the beats with the snare on 2
  and 4, or the ride bell and snare together on every off-beat eighth.
- **Gallops and a 6/4 bar.** Let Us Slay at 168:
  - a 6/4 bar (crash, open hats, snare on 2, 4 and 6, the kick in eighths);
  - then a 2/4 bar of chinas;
  - triplet gallops on the kick (bars 2 and 88, written off the sixteenth
    grid).
- **Parody.** Saddam a Go-Go at 124: a disco hat, half-open on every
  off-beat with the foot on the beats, under the horns that open _This
  Toilet Earth_.
- **Death Pod** (Scumdogs): 244 empty 6/8 bars, the long noise section,
  around 4/4 grooves at 170 and 139.

Almost no ghost notes appear in any of them, and no blast beats.

**Kit.** The kit is from Another Rundown (21 November 2025), filmed at his
kit in costume at Marathon Music Works, Nashville:

- **Drums:** Yamaha Live Custom Oak, "which I happen to wrap in our new comic
  book, The Return of Gor-Gor". "The kicks are 22 inch kicks, probably 18
  inches deep". A 10-inch tom, a 12-inch rack tom, 14 and 16-inch floor toms.
- **Snare:** "a nice 6 and 1/2 in ... Yamaha deep brass snare ... It's got
  the crack".
- **Heads:** Evans EC2 on the toms, an EMAD on the kicks, a reverse-dot EC2
  on the snare.
- **Cymbals:** Paiste Color Sound 900 in purple ("a little Prince vibe")
  with PST X Swiss crashes. The 2025 set:
  - 15-inch heavy hats;
  - 19, 18 and 20-inch crashes;
  - a 20-inch heavy ride;
  - an 18-inch china;
  - 10 and 12-inch splashes.
- **Extras:** a cowbell on the bass drum hoop "for a couple of old tunes",
  and a Yamaha pad for an 808 drop.
- **Sticks:** ProMark. His signature model has been discontinued.
- **How long:** "The first 20 years in Gwar, I changed it around all the time
  ... the last 20 years has probably been the roughly the same setup."

Paiste's artist page (artist since February 1995) lists two undated
set-ups of twelve cymbals each:

- Color Sound 900 Black, with two chinas, two splashes and a Mega Bell.
- An older one in Alpha.

Earlier he played GMS drums ("GMS are the best drums that the humans could
come up with", DrumMagazine.com via Equipboard). He uses two bass drums, not
a double pedal.

**Devices (schema 1.5).** None found. A `devices_search` is recorded instead.
It read:

- The eight human tabs above.
- Two machine-made tabs for leads: King Queen and Maggots.
- The rundown, Drummerszone, the 2017 essay, the 2025 interviews and the
  Wikipedia pages.

No Modern Drummer, Drum! or Drumeo coverage of his parts was found. The leads
that did not hold:

- **Let Us Slay:** its 6/4 + 2/4 pairs are eight beats regrouped with the
  riff. That is odd meter, with no cross pulse.
- **The Salaminizer's bar 74:** the hat and snare on a 3+3+2 grouping of
  eighths over the kick in eighths. It follows the riff and comes round
  every bar.

**What the style encodes.**

- **Feel:** straight; no swing ratio. His "swing" means groove. He plays on
  top, loud and even.
- **Ghosts:** `ghostBias` very low, about 0.05. The tabs have none to speak
  of.
- **Fast songs (160 to 230):** the hat, or the ride, open on every beat, the
  snare on 2 and 4, the kick on the off-beat eighths and sixteenths between.
  Crashes and chinas on the 1 and in the breaks.
- **Thrash sections:** sixteenths across two bass drums (K and K2
  alternating), the ride bell and snare on every off-beat eighth, or the
  open-hat beat over them. Triplet gallops.
- **Mid-tempo:** hat eighths accented on the beats, opened on the "and" of 4.
- **Tom figures:** toms and kick interlocked in eighths, for intros and
  builds (Gor-Gor).
- **Fills:** at phrase ends, single strokes down the toms into a crash or
  china on 1. Usually one bar, and no particular grouping in threes (none
  found). `midFills` low.
- **Tempo changes inside a song:** half time for a heavy riff, stops, and a
  new tempo for a break, as Gor-Gor and Saddam a Go-Go (124, then 190) have.
- **Parody:** a disco hat or a power-ballad half time where a song sends a
  genre up.
- **Double bass:** two 22-inch bass drums; `double_bass` 0.75.
- **Kit:** `crocell`, as Lombardo and Haake. It is a close metal kit with a
  cracking snare, two crashes, a china, a splash and half-open and open hats.
  No freely licensed samples of his sound exist. See the likeness's
  `KIT.md`.

**Patterns in the record.** Six bars or bar pairs, all `approximation`,
`draft`, from the human tabs:

- The Salaminizer (688675).
- Sick of You (8180).
- Gor-Gor (417139), two bars.
- Saddam A Go-Go (8070).
- Biledriver (37068), with the sixteenths split across two bass drums
  (inferred).
- Let Us Slay (688679), in 6/4.

**Relationships.**

- **`cites_as_influence`:** Buddy Rich, Alex Van Halen, Bill Stevenson, Dave
  Lombardo (`drummer:dave-lombardo`), Mikkey Dee, Bill Ward and Billy Cobham
  (`drummer:billy-cobham`). All are `likely`: Drummerszone through a summary.
- **`style_lineage`:** punk.
- **`replaced`:** Rob Mosby, Pete Luchter and Jim Thomson.
- **`bandmate`:** Dave Brockie, Mike Derks and Cory Smoot.
- **`rhythm_section_partner`:** Michael Bishop.

**Not sourced:** his birth date and place, a retirement, any 1990s interview
on his playing, and the dates of the change from GMS to Yamaha.

**The songs.**

| Song               | Year | Tempo (quarter)                                                                                                              | Meter                                                           | What defines it                                                                                                                                                                    | Source of the bars                                    |
| ------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| The Salaminizer    | 1990 | 187 (tab); 190.9 (record autocorrelation), 189.1 (beat-tracked); 218 s against 216 s                                         | 4/4; the bridge in 6/4 and 4/4 bars                             | his crossover beat (open hats on the beats, snare 2 and 4, kick off the beat, crash on the "and" of 4); half-time riff on the ride; snare and hat every third eighth over two bars | Songsterr 688675 (human revision of a machine draft)  |
| Sick of You        | 1990 | 132 (tab); 132.4 beat-tracked, 132.7 autocorrelation; length matches (188 s against 189 s)                                   | 4/4                                                             | the ride over four on the floor, no snare; chorus hits; hats opened on 4; a breakdown of hats over four on the floor that builds to sixteenths                                     | Songsterr 8180 (human)                                |
| Gor-Gor            | 1992 | 230/220, breakdowns 150 (tab); fast 217–231, breakdowns 157 (record); 258 s against 261 s                                    | 4/4 in eighths; breakdowns at ×⅔ in 4/4 and 4/4 sextuplets      | mid and floor toms interlocked with the kick; the hat foot on the beats; triplets on both bass drums under the ride                                                                | Songsterr 417139 (human)                              |
| Saddam a Go-Go     | 1994 | 124, 190 for four bars (tab); 122.3–122.8 and 190.9 (record); 148 s against 150 s                                            | 4/4; the roll at ×1.5                                           | the disco hat, half-open on the off-beats, the foot on the beats; open hats in the bridge; stops with the horns                                                                    | Songsterr 8070 (human)                                |
| Immortal Corrupter | 2001 | 133, 12/8 at 199 (tab); 133.6 beat-tracked; 332 s against 335 s                                                              | 4/4; 7/8; 12/8 at ×1.5                                          | a 7/8 riff on the ride; kick bursts under open hats; double bass under crashes; the thrash beat with the snare on every "and"; snare in pairs over double bass                     | Songsterr 635505 (human)                              |
| Biledriver         | 2001 | 125 (tab), but the record is 130 (129.8–130.6 autocorrelation; 347 beats against 348 quarters; 160.6 s at 130 against 161 s) | 4/4                                                             | both bass drums in sixteenths under the bell and snare on every "and", or under open hats on the beats; a splash on every beat                                                     | Songsterr 37068 (human)                               |
| Womb with a View   | 2004 | 202 (tab); 202.9 beat-tracked, 203.8 autocorrelation; 144 s against 146 s                                                    | 4/4 in eighths                                                  | the crossover beat over two bars; the skank (snare and hat on every beat); half time; the snare in threes                                                                          | Songsterr 37064 (human)                               |
| Go to Hell!        | 2006 | 160 (tab); 160.0 beat-tracked, 160.7 autocorrelation; 284 s against 286 s                                                    | 4/4; the intro's 4/4 + 3/4 pairs as 7/4; double bass in eighths | open hats over four on the floor; the floor tom with the kick in eighths and the snare in threes; half-time stabs; double bass under crashes                                       | Songsterr 751596 (human revision of a machine draft)  |
| Let Us Slay        | 2009 | 168/170 (tab); 169.4 beat-tracked, 169.7 autocorrelation; 208 s against 207 s                                                | 4/4; 4/4 sextuplets; the 6/4 + 2/4 riff as two bars of 4/4      | triplets on both bass drums under hats, crashes or the bell; the riff in 6/4 and 2/4; half time on the crash                                                                       | Songsterr 688679 (human, redone from a machine draft) |
| Zombies, March!    | 2010 | 195, march 150 (tab); 195.0–195.4, march 151.0 (record); 270 s against 273 s                                                 | 4/4 in eighths; 12/8 at ×1.5; the march at ×¾ in sextuplets     | the skank and the thrash beat; triplets on both feet; half time on the crash; a shuffle march                                                                                      | Songsterr 5614148 (human)                             |
| El Presidente      | 2017 | 160 (tab); 160.0 beat-tracked, 160.1 autocorrelation; length matches (262.5 s against 262 s)                                 | 4/4                                                             | open hats on the beats, the kick on 1 and 3; half time on the ride; a skank in threes and a gallop on the kick                                                                     | Songsterr 742105 (human revision of a machine draft)  |

**Tried but not used.**

- **Ragnarök (1995).** Dirty, Filthy (1077642) has drums that are machine-made: the first revision is AI, and the second changed only the bass. There is no second machine tab to check it against, so it fails the brief's rule. Meat Sandwich (37065, human, 2016) is incomplete: 67 bars at 115 against a record of 3:29 (115 confirmed from the record), about two-thirds of the song.
- **Battle Maximus (2013).** Torture (417140, human, 2016) has a "drum track" of unmapped notes, a rhythm with no drums named. Every other song from the album is machine-made only.
- **The New Dark Ages (2022).** Machine-made tabs only.
- **The brief's other examples.** Maggots, Have You Seen Me?, Fishfuck and Bring Back the Bomb have machine-made tabs only. Horror of It All has no Songsterr tab.
- **Human tabs not chosen.** Black and Huge (6639800, Scumdogs) and The Road Behind (194944, AMBD; a 2026 human tab) were dropped only to keep one or two songs per album. The Road Behind, the power-ballad parody, is the best one to add next. Also human but not used: If I Could Be That (417129), Hate Love Songs (70900, 62 bars), U Ain't Shit (37066), The Song of Words (70899), Beauteous Rot (37069, 54 bars), Murderer's Muse (5852311, mostly off the sixteenth grid), Tormentor (2972613), Auroch (6116652), I'll Be Your Monster (467343), A Gathering of Ghouls/Storm Is Coming (4716058), Time for Death (5820519), Death Pod (1411203, a long noise section).
- **Revision histories with machine drafts.** Poor Ole Tom (6959209), Come the Carnivor (7094108) and The Private Pain of Techno Destructo (6965207) come from an account whose other uploads are machine-made. Bonesnapper's drum track is "(regenerated)".

**Arrangement.** Every song plays the record's sections in order, intro to outro, within 32 slots and at most 32 distinct bars. Long sections are shortened, and each song's comment says by how much.

**No cowbell.** He keeps a cowbell on the bass-drum hoop "for a couple of old tunes" (Another Rundown, 2025), but none of the eleven tabs writes one, so no song has a percussion part.

**Sources**

- Wikipedia, "Jizmak Da Gusha": https://en.wikipedia.org/wiki/Jizmak_Da_Gusha
- Wikipedia, "List of Gwar members": https://en.wikipedia.org/wiki/List_of_Gwar_members
- Wikipedia, "Gwar": https://en.wikipedia.org/wiki/Gwar
- Wikipedia, album pages: _Scumdogs of the Universe_, _America Must Be Destroyed_, _This Toilet Earth_, _Violence Has Arrived_, _War Party_, _Lust in Space_
- Another Rundown, "GWAR's Bloodiest Drumset EVER ft. Jizmak Da Gusha" (21 November 2025): https://www.youtube.com/watch?v=TdPG5I2TxMk
- Paiste, JiZMak Da Gusha artist page: https://www.paiste.com/en/musicians/jizmak-da-gusha
- Drummerszone, Brad "Jizmak Da Gusha" Roberts: https://drummerszone.com/artists/profile/2855/brad-jizmak-da-gusha-roberts
- maubrecht, "All Hail Jizmak Da Gusha" (2017): https://maubrecht.wordpress.com/2017/08/18/all-hail-jizmak-da-gusha/
- Equipboard, Jizmak Da Gusha (Brad Roberts): https://equipboard.com/pros/jizmak-da-gusha-brad-roberts
- Spotlight Report interview (14 August 2025): https://spotlightreport.net/featured/interview-gwars-jizmak-da-gusha-promises-chaos-at-good-things-2025
- Defenders of the Faith interview (23 May 2025): https://defendersofthefaithmetal.com/jizmak-da-gusha-gwar-interview/
- Crash Bang Boom Podcast, episode 167 (13 January 2020), description: https://podcasts.apple.com/us/podcast/167-brad-roberts-aka-jizmak-da-gusha-gwar/id1130523092?i=1000462309044
- Gwar, "Maggots" drum-cam (2019): https://www.youtube.com/watch?v=dth6wcyaMFs
- Gwar Bandcamp, "Biledriver": https://gwar.bandcamp.com/track/biledriver
- Songsterr (human tabs): 8180, 8070, 688675, 417139, 37068, 688679, 1411203, 742105; machine-made, leads only: 708802, 652960 (https://www.songsterr.com/a/wa/song?id=…)

## AU. II of Sleep Token (2026-10-18)

The `sleeptoken` style plays **songs**, as `downey` (AQ) does: each New picks
one of his records, and its tempo, meter and grooves come with it. His record
is new, written from this section:

- `drummer-model/drummers/ii-sleep-token.json`, schema 1.5;
- four Sleep Token albums under `recordings/`;
- `sources/ii-sleep-token.json`;
- a new genre, `styles/drum-and-bass.json`, the target of a tradition link.
  It names no family because no record lists it as a genre.
  `style:alternative-metal`, his main genre, was already in the tree.

**Identity.** II is a masked persona, and the record carries
`real_identity_policy: "private_do_not_research"`: no name, no birth, no
death. Klek de Poitrine (the existing case) is the model. Nothing was searched
or read about who plays II. Pages whose subject is unmasking members were not
opened, and where a page read for something else (Wikipedia) carried
speculation, it was not read for or copied. Everything below is the persona,
the costume, the records and the playing.

**Which records are his.** Sleep Token formed in London in 2016. Its members
are anonymous and say they are united by worship of an ancient deity called
"Sleep" (Wikipedia). II has been on drums and percussion from 2016 to today,
and is "the only member besides Vessel credited with songwriting". He is the
credited drummer on the four albums:

| Album                            | Year | Label     | Producer(s), studio                                                            | Notes                                                                                                         |
| -------------------------------- | ---- | --------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Sundowning                       | 2019 | Spinefarm | George Lever; G1 Productions (Wells) and VADA Studios                          | "II is listed as a writer for some songs, that is referring to the drum tracks, which he wrote and performed" |
| This Place Will Become Your Tomb | 2021 | Spinefarm | George Lever; G1 Productions; mixed by Sky van Hoff                            | UK Rock & Metal No. 1                                                                                         |
| Take Me Back to Eden             | 2023 | Spinefarm | Vessel and Carl Bown; Treehouse Studios, Chesterfield                          | UK 3, Billboard 200 16                                                                                        |
| Even in Arcadia                  | 2025 | RCA       | Carl Bown; Adam "Nolly" Getgood (additional), drum editing by Sebastian Sendon | "all music is composed by Vessel and II"; No. 1 in the US and UK                                              |

The EPs _One_ (2016) and _Two_ (2017) came before. Live:

- first shows in 2017;
- the St Pancras Old Church headline in October 2018;
- the Download Pilot headline in 2021;
- Wembley Arena in December 2023, where new masks were revealed;
- arena tours from 2025.

II also played drum festivals in Europe in 2024 and 2025. MixWave released a
sampled library of his touring kit in June 2025 (Wikipedia).

**How he played.** The band's first recorded interview was II's, with
Brandon Toews for Drumeo, released 19 December 2023. He gave it in costume,
with his voice altered (Louder), and played twelve songs through. His own
words, from its captions and Drumeo's article:

- **Metal first:** "I grew up primarily playing metal". When he started he
  was "heavily into drummers such as Joey Jordison", the drummer of Mudvayne,
  "as well as the more extreme speed players such as Derek Roddy".
- **Gospel:** "I was very much obsessed with the gospel style of playing". He
  spent most of his early adulthood studying Tony Royster Jr., Eric Moore and
  Thomas Pridgen, "slowing down YouTube videos in a feeble attempt to
  understand their concepts, their stickings". And "I've always been a big
  Eric Moore fan ... a couple of Eric's licks find their way into my playing".
- **Drum and bass:** "I've always personally taken a lot of inspiration from
  the UK dance music scene ... listening to various sub genres of drum and
  bass specifically allowed me to incorporate stylistic traits from those
  genres into my vocabulary as a drummer".
- **R&B and pop:** "I'm also a big fan of R&B and pop which has worked its
  way into my playing ... the next obvious step for me was to blend these
  other styles in amongst heavier playing to add versatility to my drum
  parts".
- **Now:** "a mixture of that signature Abe Cunningham, Deftones inspired,
  heavier sort of grooving", with a gospel influence.
- **Across the records:** "my stylistic approach and goals have generally
  stayed the same; my vocabulary on the kit has expanded". He tries not to
  use the same phrases, or the same phrases in the same voicing, "a continual
  work in progress".

How the parts are made:

- **The vocal:** "I try to pay close attention to the vocals and figure out
  any specific syllables that can benefit from accents on the kit", and uses
  the vocal line "as a guide of sorts to dance in between what's being sung".
  Songs "don't start from a particular drum part".
- **Syncopations the drums must match:** "a pattern on the guitar, a
  breakdown of sorts, something electronic".
- **Live:** "most of the parts that I tend to play in a live setting vary
  drastically to what was tracked on the record". The parts that "must remain
  true to the original" are one doubling a guitar part, or "an electronic
  part on the pads that serves more of a supporting role".
- **Favourites:** Like That's parts are "to this day my favorite that I've
  written". Higher's parts "have always felt very interactive". The Summoning
  is his favourite of the new songs for its live solo, which gives him "a
  little more creative freedom".

His vocabulary, as he names it:

- **An eight-note linear phrase** after Eric Moore: R L R L K R L K.
- **A nine-note triplet phrase:** R L R K R L R K K. "What I particularly
  like about this phrasing is that it's three notes short of resolving ... so
  as a drummer you're forced to be creative with those last three notes".
- **The paradiddle,** "as a chop starter ... an organic way to prepare the
  listener for a slightly busier section".
- **The six-stroke roll,** "whether it's groove or fill based".

Drumeo then published three short films, "The Iconic Drumming Behind…", in
which he explains a passage and plays it:

- **The Summoning (February 2024):** he "added a live addition of a drum solo"
  where the record has no drums. In it, "a group of three notes played as
  right left kick ... I'm effectively counting this as 16th notes, so I'm
  playing series and groups of three over a field of four, which gives the
  illusion of the voicing itself modulating". The eight-note phrase follows,
  "twice through, and the voicing changes with each repeat".
- **Hypnosis (September 2024):** the intro fill is "a simple five note
  sticking ... right left right kick and ending with a flam". In the final
  breakdown, "the first half of this groove is played as straight eighth
  notes, then during the second half I switch to a dotted eighth note or
  dotted quaver lead hand ... after that it resolves itself and you land back
  on the one again".
- **The Offering (November 2024):** in the last eight bars of the final
  breakdown, a figure between the china and the floor tom. His usual is
  R L L K, but here he takes away the left-hand double and plays single
  strokes, R L R K, in sixteenths.

A live review: "one of the most technically skilled in hard rock right now,
playing complicated patterns without forgetting to lock in on the 2s and 4s",
and "ii tagged 'The Summoning' with an impressive drum solo" (RIFF, Oakland
Arena, 10 October 2025).

**The tabs.** I read seven human Songsterr tabs (`aiGenerated` false through
the meta API) with the tab reader. The drum track is chosen by name, never
the "Extras", synth-drum or SPD-SX tracks.

- **The Summoning (530080):** 173 throughout. The riffs, verses and solo cycle
  bars of 3/4, 6/4, 6/4 and 4/4, closed by a 5/4 or 7/4. The choruses are 4/4
  with the snare on 3, then the "Soul" sections close the song.
- **Hypnosis (514988):** 148, the snare on 3. The breakdown (bars 169 to 176)
  has the china in quarters with ghosted snares, then crashes six of the
  tab's sixteenths apart (177 to 184), exactly as he describes it.
- **The Offering (467739):** 135, the snare on 3, the china in quarters, two
  ghosted sixteenths into the next bar.
- **Alkaline (501521):** 74, then 148 from bar 25. Crashes in quarters over
  eighths on the double pedal.
- **Emergence (1139195):** 63. In the second verse the hat is in threes of
  thirty-seconds from beats 1 and 3, a trap figure.
- **Vore (549853):** 152, crashes in quarters with the snare on 3, seven bars
  of sixteenths on the double pedal, and **no blast beat**.
- **Chokehold (556542) and Granite (580324):** read for their top bars only.

A scan of fourteen tabs for bars with seven or more snare hits found almost
none. The "blast beats" a ranking hears in Vore are not in its tab, and the
style does not play them there. The one blast-like bar read is Caramel's
breakdown (1245108, read for the songs after this scan): china and snare in
unison over the feet, a texture of two bars, which the style plays as the tab
writes it.

**Kit.** A DW Collector's Series kit with exotic hybrid shells, four pieces:

- a 22x18 kick;
- 10x7 and 12x8 rack toms and a 16x16 floor tom;
- 13-inch snares (a Craviotto steam-bent cherry, a DW maple and walnut, a DW
  steel);
- Istanbul Agop cymbals: 13-inch Traditional hats; Traditional Dark, OM, Xist
  Ion and Xist Dry Dark Brilliant crashes; an Idris Muhammad ride; a Turk
  China; two stacks; splashes; a Trash Hit.

That is the kit in MixWave's library. Equipboard adds a DW 9000-series XF
double pedal, a Roland SPD-SX Pro with BT-1 triggers, Remo heads and Wincent
signature sticks (a 5A). In 2022 he played a 13x7 PA Lovetone snare at
Bloodstock, and a copper-finish DW kit in the band's own "offering" videos.
In the Drumeo film the shells are an amber burl with chrome hardware, the
bass drum's front head black with a moon. The MixWave library is commercial,
so its samples cannot ship.

**Devices (schema 1.5).** Three groupings, two of them in his own words.
None is a polyrhythm by the vocabulary.

1. **The Summoning's live solo:** R L K threes counted as sixteenths, "groups
   of three over a field of four" (`solos`, verified: the Drumeo film). The
   pattern is an archetype: which drums the R and the L play is not given.
2. **Hypnosis's final breakdown:** the lead hand in dotted eighths, 3+3+3+3,
   then a 4, back to the one (`groove`, verified: the Drumeo film and
   Songsterr 514988).
3. **Emergence's second verse:** the hat in threes of thirty-seconds,
   restarting on beat 3 (`groove`, likely: one human tab).

The leads that did not hold:

- **The Summoning's 3/4, 6/4 and 4/4 bars:** odd meter, not a device. The
  drums play the bars as written, with no second cycle against them.
- **The Offering's R L R K:** a linear sticking in sixteenths, not a grouping.
  It is a four-note cell on a four-step beat.
- **The nine-note phrase:** a lick that finishes the bar its own way, not a
  cell repeated over the bar.

**What the style should encode.**

- **Meter and tempo by song:** at the record's tempo, 135 to 173 for the
  heavy songs with the snare on 3 (half time, written as the tabs mark it).
  Hypnosis's breakdown is written at its half time, 74, so the snare is on 2
  and 4. The Summoning plays its 3/4, 6/4, 6/4, 4/4 cycle as sections in
  those meters. Emergence and the R&B songs run at 60 to 95, the hat on a
  thirty-second grid where the tab has it.
- **Feel:** straight, Swing at zero; no song read swings.
- **Ghosts:** `ghostBias` moderate, about 0.3. The tabs have ghosted pickups
  (two sixteenths into the next bar in The Offering, ghosts round the
  backbeat in Hypnosis), but the heavy grooves are mostly crash, kick and
  backbeat.
- **Cymbals:** a china or crash on every beat in the choruses; the hat open
  in quarters or eighths in the verses.
- **Fills, in his habit:** at phrase ends and at the end of each odd-length
  riff cycle. Linear phrases with the kick inside (R L R L K R L K, R L R K),
  paradiddles to start a busier section, six-stroke rolls, the flam at the
  end, threes over sixteenths for builds.
- **Double bass:** a double pedal on one kick, in eighths under half-time
  crashes (Alkaline) and in bursts of sixteenths (Vore). Not continuous, and
  no blasts.
- **Kit:** `crocell`, as `lombardo`, `haake` and `jordison` play it. A
  re-tuned row (snare up about 6%, crashes down about 5%, for his 13-inch
  snares and dark Istanbul Agop cymbals) is worth trying by ear; see
  `likeness/KIT.md`. Claps and snaps from his pads go on the percussion
  lanes, not a drum machine.

**Patterns in the record.** Six in all. Five are `approximation`, `draft`,
from human Songsterr tabs:

- The Summoning's chorus (530080).
- Hypnosis's breakdown (514988), at its half time.
- The Offering's chorus (467739).
- Alkaline's chorus (501521).
- Emergence's second verse (1139195), on a thirty-second grid.

The sixth, The Summoning solo's threes, is a `stylistic_archetype` from his
description.

**The songs.**

| Song                             | Year | Tempo (quarter) and evidence                                                                     | Meter                                       | What defines it                                                                                                                                                               | Source of the bars                                           |
| -------------------------------- | ---- | ------------------------------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| The Night Does Not Belong to God | 2019 | 153: tab; record acf 101.96 (its dotted quarter), length 304 s = tab                             | 4/4                                         | hat foot on the beat, snare on 3, crash and kick in dotted quarters across three bars (a `crossRhythms`), then chinas                                                         | Songsterr 583825 (human, rev 5432070)                        |
| The Offering                     | 2019 | 135: tab; acf 135.25; 350 s vs 348.4 s                                                           | 4/4                                         | chinas in quarters, two ghosts into the bar, rack toms in eighths, tom buildup, R L R K (II, Drumeo)                                                                          | Songsterr 467739 (human, rev 8707612)                        |
| Higher                           | 2019 | 175: record acf 174.7–175.1 and 87.5 throughout; the tab says 168 (its 230 bars too long at 168) | 4/4                                         | ghosted snare figures (post-chorus), ride in quarters, snare once in two bars, crashes in half notes                                                                          | Songsterr 483338 (human, rev 9622205), at the record's tempo |
| Hypnosis                         | 2021 | 148: tab; acf 147.9 and 73.96                                                                    | 4/4                                         | half time, crashes in quarters, sixteenth-hat verse with a ghost on 2's "a", R L R K + flam pickup, dotted-eighth lead hand 3+3+3+3+4 in the breakdown (II, Drumeo)           | Songsterr 514988 (human, rev 9753487)                        |
| Alkaline                         | 2021 | 148 (opening 74, drums out): tab; acf 148.00                                                     | 4/4                                         | crashes in quarters over double-pedal eighths, floor tom against the feet                                                                                                     | Songsterr 501521 (human, rev 5269841)                        |
| Like That                        | 2021 | 148: tab; acf 148.05                                                                             | 4/4                                         | cross-stick R&B verse, hat foot + floor tom/kick unisons, linear sixteenth hats (his favourite parts)                                                                         | Songsterr 577223 (human, rev 8697819)                        |
| The Summoning                    | 2023 | 173: tab; acf 173.0 in the riffs and the outro                                                   | 3/4, 6/4, 4/4, 5/4, 7/4, 4/4-8; outro at ×½ | odd-meter riff cycles (3/4 + 6/4, 6/4, 4/4), half-time 6/4 with the snare on 4, chorus crashes in quarters, double bass, the slow Soul outro; live-solo threes as a poly fill | Songsterr 530080 (human, rev 9210431)                        |
| Granite                          | 2023 | 120: tab; acf 120.23; 226 s = tab                                                                | 4/4                                         | verses programmed (Synth Drums); his kit from the bridge: crashes and chinas, tom bar every eighth, push in the fourth                                                        | Songsterr 580324 (human, rev 4077643)                        |
| Vore                             | 2023 | 152 (tab; acf 151.6–152.3), written 148–150                                                      | 4/4                                         | crashes in quarters over bursts of eight sixteenths on the double pedal, rimshot on 3; no blasts                                                                              | Songsterr 549853 (human, rev 9251186)                        |
| Emergence                        | 2025 | 63: tab; acf 63.03 and 125.95; sections at ×2 (126)                                              | 4/4 at ×2                                   | hat in threes of 32nds from 1 and 3 (R&B/trap), ride bell figure, crashes on eighths over 32nd double bass                                                                    | Songsterr 1139195 (human, rev 9006381)                       |
| Caramel                          | 2025 | 94: tab; acf 188.0 (×2) and 62.8                                                                 | 4/4                                         | cross-stick R&B, drum-and-bass sixteenth hats, crash on the eighths, chinas and double bass, a unison blast texture                                                           | Songsterr 1245108 (human, rev 9434743)                       |
| Damocles                         | 2025 | 156: tab; acf 156.57                                                                             | 4/4                                         | half-time pop-rock: hats, ride, crashes in quarters with snare on 1's "and" and 3                                                                                             | Songsterr 1379128 (human, rev 4438123)                       |

Tried and not used: Chokehold (556542), Rain (598764), Levitate (615527),
The Love You Want (570980) and Look to Windward (1467792) all have human tabs
and were set aside only to keep three songs to an album; Like That and Higher
were preferred for II's own words about them.

| Song | Year | Tempo (quarter) | Meter | What defines it | Source of the bars |
| ---- | ---- | --------------- | ----- | --------------- | ------------------ |
|      |      |                 |       |                 |                    |

### Sources (AU)

- https://en.wikipedia.org/wiki/Sleep_Token
- https://en.wikipedia.org/wiki/Sundowning_(Sleep_Token_album)
- https://en.wikipedia.org/wiki/This_Place_Will_Become_Your_Tomb
- https://en.wikipedia.org/wiki/Take_Me_Back_to_Eden
- https://en.wikipedia.org/wiki/Even_in_Arcadia
- https://www.youtube.com/watch?v=FOQJTiIwwEA (Drumeo, An Offering From Drumeo, 19 December 2023)
- https://www.drumeo.com/beat/sleep-token-drummer-interview/
- https://www.youtube.com/watch?v=dh6IgOxDhcE (Drumeo, The Iconic Drumming Behind "The Summoning")
- https://www.youtube.com/watch?v=kj434KMS2eI (Drumeo, … "Hypnosis")
- https://www.youtube.com/watch?v=NhT-t5IXtU8 (Drumeo, … "The Offering")
- https://www.youtube.com/watch?v=nNZlxQmpV8g (Sleep Token, "Hypnosis" An offering from II, 2022)
- https://www.youtube.com/watch?v=TAkpofWA3Ak (Sleep Token, "Alkaline" An offering from II, 2022)
- https://www.loudersound.com/news/sleep-token-ii-interview-2023
- https://riffmagazine.com/reviews/sleep-token-20251010/
- https://mixwave.com/products/sleep-token-ii and https://support.mixwave.com/doc/sleep-token-ii-user-guide
- https://equipboard.com/pros/ii-sleep-token
- https://www.songsterr.com/api/meta/<id> for 530080, 514988, 467739, 501521, 1139195, 549853, 556542, 580324

## AV. The Nameless Ghoul on drums (Ghost) (2026-10-18)

The `ghoul` style plays **songs** the way `downey` (AQ) and `jordison` (AR) do: each New picks one
of the band's records, and its tempo, meter and grooves come with it. Its record
(`drummer-model/drummers/nameless-ghoul.json`, schema 1.5) is new and is written from this
section. It comes with seven Ghost recordings (the six studio albums and the _Rite Here Rite Now_
live soundtrack) and `sources/nameless-ghoul.json`. No new genre: every genre it names
(`hard-rock`, `metal`, `progressive-rock`, `psychedelic-rock`, `rock`) already has a row in
`GENRE_FAMILY`.

**The identity is private.** The record is a persona, as Klek de Poitrine's is (§ the Klek
section): `identity.persona.real_identity_policy` is `private_do_not_research`, and there is no
`full_name`, `born` or `died`. More than one person has played the drumming ghoul. Nobody who has
held the chair was searched for, and no name is stored. Where a source credits a drummer by name
(the session drummers on most of the albums, and the touring drummer on _Rite Here Rite Now_), the
record says only that a credit exists. Pages about unmasking the ghouls, and the 2017 lawsuit,
were not read. Search summaries that volunteered names were not copied anywhere.

**Which records are the ghoul's.** Ghost formed in Linköping in 2006 and played its first concert
on 23 October 2010, at the Hammer of Doom festival in Würzburg (Wikipedia). The persona is the
band's idea:

- **Anonymity.** "Anonymity is a major characteristic of Ghost." A ghoul said the aim was "to
  remove their personalities to allow their audiences to focus upon the artwork itself."
- **The elements.** From 2010 to 2017 the ghouls "each represented one of the five elements,
  typically attached to their instrumental role". Each wore their alchemical symbol on their
  instrument and stamped it at signings. For _Meliora_, "each Nameless Ghoul had all five
  elemental symbols embroidered on the right breast of their costumes."
- **Earth, then Mountain.** A 2016 review (Seattle Music Insider, read only through a search
  summary) lists Earth on drums. Songsterr's tabbers label the drum track of the early songs
  "Earth" and of the Prequelle and Impera songs "Mountain". After 2018 the element names were
  dropped (Wikipedia, citation needed). Both names are recorded as aliases, with
  `needs_verification` in the open questions. One low-quality page gives Ether to the drummer.

The studio credits mostly do not name the ghoul (each album's Wikipedia page):

| Record               | Year | Producer              | Drums credited to                                        |
| -------------------- | ---- | --------------------- | -------------------------------------------------------- |
| _Opus Eponymous_     | 2010 | a band member (alias) | a named session player                                   |
| _Infestissumam_      | 2013 | Nick Raskulinecz      | no named member in the main credits                      |
| _Meliora_            | 2015 | Klas Åhlund           | a Nameless Ghoul, and a session drummer as well          |
| _Prequelle_          | 2018 | Tom Dalgety           | a session drummer; the band "A Group of Nameless Ghouls" |
| _Impera_             | 2022 | Klas Åhlund           | a session drummer                                        |
| _Skeletá_            | 2025 | "Gene Walker" (Forge) | a session player                                         |
| _Rite Here Rite Now_ | 2024 | live, Kia Forum, 2023 | the touring drummer, among the "Ghouls and Ghoulettes"   |

So the style is the band's drumming as it is on the records and as the ghoul plays it live.
_Rite Here Rite Now_ is the one record of the ghoul's own playing: the Kia Forum shows of 11 and
12 September 2023, the last North American dates of the Re-Imperatour. _If You Have Ghost_ (2013)
was produced by Dave Grohl, who is credited as a guest on drums on its ABBA and Depeche Mode
covers.

Every album since _Meliora_ was mixed by Andy Wallace. The sound moved through three stages:

- **_Opus Eponymous_:** a basement record with a "Seventies vibe".
- **_Meliora_:** "black-souled retro doom-pop" (Classic Rock).
- **_Prequelle_ and after:** 1970s and 1980s influences: Blue Öyster Cult, Boston, ABBA and hair
  metal. AllMusic heard "irresistible arena rock excess" on _Prequelle_ and, on _Impera_, "the
  most unabashed exercise in exultant pop/rock sheen Ghost has issued to date".

**How the drumming goes.** No interview of the drummer was read, since the identity is private.
No drum lesson or transcription of Ghost's parts was found on Drumeo, MusicRadar or Modern
Drummer. The playing below is from eighteen human Songsterr tabs (`aiGenerated` false through the
meta API), read bar by bar. It is the plainest drumming of any style here: it serves the riff,
the hook and the theatre.

- **Ride or open hats in eighths, snare on 2 and 4, a crash on the one.** Ritual's commonest bar
  (23 of 149, at 132) has the ride in eighths and the kick on 1, the "and" of 2 and 3. Mary on a
  Cross plays the same kick under the ride bell (31 of 131, at 130). Square Hammer's chorus
  pushes the crash onto the "and" of 4 (18 of 128, at 130).
- **The snare on every beat.** From the Pinnacle to the Pit (90) puts the snare on all four
  beats under ride eighths, with an open hat on the "and" of 1 and 3 and the kick syncopated
  round it. Square Hammer's verse and Year Zero's ride section do the same.
- **Four on the floor.** Cirice (90) has open-hat eighths over the kick on every beat. Dance
  Macabre (126) has the kick and the hat foot together on every beat, under ride eighths.
- **Year Zero's hats** (122): sixteenths with a gap where the snare falls on 2 and 4.
- **Fast meters of three.**
  - Con Clavi Con Dio and Genesis are "sped-up waltzes" (Wikipedia); Con Clavi Con Dio's tab is
    in 6/8 throughout.
  - Secular Haze is in 6/8 at 100.
  - Satanized is in 12/8 (marked 170, presumably the quarter, a dotted quarter of about 113;
    unverified). The hats open on the dotted-quarter beats, the snare falls on the second and
    fourth, and the kick is on most eighths.
- **Kaisarion's gallop** (186): crash and snare on 1 and 3, ride on 2 and 4, and the kick on
  every off-beat eighth.
- **Stabs with the riff.** Rats (124) hits crash and snare together on the riff's accents, with
  two floor-tom notes at the end of the bar. Its verse has the kick in 3+3+2 under the ride's
  quarters.
- **Fills.** At phrase ends. From the Pinnacle to the Pit has seven sixteenths on snare and floor
  tom in unison into an open-hat push. Call Me Little Sunshine has snare-run pickups into the
  crash.
- **Ghost notes.** Few. A handful of ghosted snares appear in Cirice, Pinnacle, Rats and
  Kaisarion; most tabs have none.
- **Double bass.** None continuous in any tab read: only two bars with four kick sixteenths
  (Lachryma). The 2016 kit has one bass drum.

The only review comment on the drums that was found is on _Meliora_'s opener (Sputnikmusic): "one
incredibly demanding drum performance that makes sure your attention is held from start to
finish".

**Kit.** No rundown has been published, and none of the players was researched. The 2016
photographs and the Hellfest 2016 broadcast show:

- a **Tama** kit with black lacquered shells and chrome hoops, lugs and stands;
- **one** bass drum, its black front head with the TAMA logo and a port;
- one rack tom over the bass drum, and a floor tom;
- about six cymbals: hats, two crashes on the left, and a ride with crashes on the right. Their
  make cannot be read.

It sits on a black riser upstage, behind Papa. `KIT.md` in the likeness folder has the pack-kit
recommendation.

**Devices (schema 1.5).** None found. A `devices_search` is recorded instead: the eighteen tabs,
the Wikipedia pages and the searches for lessons. The leads that did not hold:

- **Odd bars.** Majesty's bars of 9/8, 3/4 and 3/8, Monstrance Clock's 5/4 bar and Kaisarion's
  6/4 bar are odd meter following the riff. Nothing cycles across the bar line.
- **3+3+2 kicks.** Ritual, Rats and Mary on a Cross keep the figure inside one bar of 4/4: the
  common rock figure, with no cross pulse.
- **6/8 and 12/8.** These songs are meter and feel, not devices.

**What the style should encode.**

- **Feel:** straight eighths, on the beat (`feel` centre, jitter about 0.012), Swing 0. The waltzes
  are written in 6/8 and 12/8 as their own meters, not as swung 4/4.
- **Ghosts:** `ghostBias` about 0.05. The tabs have almost none.
- **Hats and ride:** ride or open hats in eighths. Open hats (`opens` high) on Cirice and Lachryma.
  The hat foot on the beats under the ride for the dance songs. The ride bell for Mary on a Cross.
- **Snare:** 2 and 4, with rimshots for choruses. All four beats for a stomp section (a figure,
  not the default).
- **Kick:** with the riff, often 3+3+2 inside the bar; four to the bar for the dance songs; every
  off-beat under the fast gallop.
- **Crashes:** on every section's one, and pushed to the "and" of 4 into a chorus (Square Hammer,
  Cirice).
- **Fills:** at phrase ends (`midFills` low): sixteenths on snare and toms, or snare and floor tom
  in unison, landing on the crash.
- **Double bass:** none (`doubleKick` off).
- **Kit:** a big, polished arena-rock kit: one round, punchy kick, a fat snare with a little room,
  bright crashes. Not Lombardo's and Haake's clicky metal `crocell`, and not Klek's damped
  `teatowel`. `studioRock` is recommended, or a combination row on its pieces with more room; see
  `KIT.md`.

**Patterns in the record.** Ten bars, all `approximation`, `draft`, from the human tabs. Each keeps
the tab's commonest bar:

- Ritual (83366).
- Year Zero (392604).
- From the Pinnacle to the Pit (400636): the stomp and the unison run.
- Cirice (400667).
- Square Hammer (412647).
- Mary on a Cross (521463).
- Dance Macabre (442661).
- Kaisarion (505592).
- Satanized (1103383), on a 12/8 eighth grid with no tempo given.

**The songs.**

The `ghoul` style plays **songs** as `downey` (AQ) does: each New picks one of Ghost's records and plays
it in sections, intro to outro, in an `arrangement` that follows the record (at most 32 distinct bars and
32 slots). The studio drums are mostly credited to session players (one Nameless Ghoul is credited beside
a session drummer on _Meliora_), so the style is the band's drumming as recorded and as the ghoul plays
it live; every song here is in the live set. Section boundaries are the Songsterr tabs' own markers, read
with `tab.py --sections`. Every tempo was beat-tracked from the record (autocorrelation of the onset
envelope over 4, 8, 16 and 32 beats; all twelve records are on a click) and checked against the tab's
length at its marked tempo. All twelve follow human transcriptions (`aiGenerated: false` through the meta
API), one tab each (the only human drum tab of the song in every case but Lachryma and From the Pinnacle
to the Pit, whose alternatives were not compared).

**Grids.** Sixteenths in 4/4. Con Clavi Con Dio's tab is 6/8 at 100 in groups of three sixteenths; the
record's beat is that group (130 a minute), so it is written in 12/8 at a quarter of 195, one tab bar to
one bar. Secular Haze is a true 6/8. Satanized is 12/8 with 1-bar 6/8 sections where its 6/8 bars fall.
Majesty's chorus is 4/4, 9/8 and 15/8 (its two 3/4 bars and its 3/8 bar, BeatBreaker having no 3/8), its
bridge has a 3/4 bar. Cirice's chorus has its 2/4 bar; From the Pinnacle to the Pit's and Cirice's 4/4 +
2/4 pairs are bars of 6/4. Kaisarion at 186 is in sixteenths with everything in eighths, under 4/4's 190.

| Song                         | Year | Tempo (quarter)                                                                        | Meter                                     | What defines it                                                                                                                                                       | Source of the bars        |
| ---------------------------- | ---- | -------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Ritual                       | 2010 | 132 (tab; record 132.0; 270.0 s against 268.9)                                         | 4/4                                       | closed then open hats, the kick alternating 1 & &2 &3 / 1 & 3 &; the chorus on the ride, kick 1, &2, 3; a bridge with the snare on every beat and the kick on the e/a | Songsterr 83366 (human)   |
| Con Clavi Con Dio            | 2010 | 195 in 12/8 (record pulse 130.2, bar 1.847 s; the tab's 6/8 at 100 in groups of three) | 12/8                                      | a fast waltz: the snare on every pulse, the kick on the eighths between; a backbeat pre-chorus; quarter-note kicks across the pulses in the bridge                    | Songsterr 84010 (human)   |
| Secular Haze                 | 2013 | 100 (tab; record eighth 0.300 s, bar 1.800 s; 306.9 s against 307.9)                   | 6/8                                       | crashes in eighths over an oom-pah-pah; the ride with ghosted snares for the chorus                                                                                   | Songsterr 386459 (human)  |
| From the Pinnacle to the Pit | 2015 | 90 (tab; record 90.00; 241.3 s against 242.6)                                          | 4/4, a bar of 6/4                         | the snare on every beat under the ride, the hat opened on the "and"s; a snare and floor-tom unison; the stomp                                                         | Songsterr 400636 (human)  |
| Cirice                       | 2015 | 90 (tab; record 90.00; the record's fade longer)                                       | 4/4; a 2/4 bar in each chorus; a 6/4 bar  | open hats over four on the floor, the crash on the "and" of 4; a half-time intro riff; the ride chorus                                                                | Songsterr 400667 (human)  |
| Majesty                      | 2015 | 95 (tab; record 95.01; 319.6 s against 324)                                            | 4/4; the chorus 4/4, 9/8, 15/8; a 3/4 bar | the hats on the riff over four on the floor; the chorus's odd bars; crashes on 1, &2 and 4 in the bridge                                                              | Songsterr 401140 (human)  |
| Rats                         | 2018 | 124 (tab; record 124.00; 261.3 s against 261.7)                                        | 4/4                                       | the ride in quarters over the kick in 3+3+2, stabs on the riff every fourth bar; a china pre-chorus; a half-time solo                                                 | Songsterr 441770 (human)  |
| Dance Macabre                | 2018 | 126 (tab; record 126.0; 217.1 s against the single edit's 219.7)                       | 4/4                                       | four on the floor with the hat foot under the ride; half-open hats in the verse                                                                                       | Songsterr 442661 (human)  |
| Mary on a Cross              | 2019 | 130 (tab; record 130.0; 242.5 s against 244.8)                                         | 4/4                                       | the ride in eighths, the kick off the 1; the bell for the chorus; floor-tom turns                                                                                     | Songsterr 521463 (human)  |
| Kaisarion                    | 2022 | 186 (tab; record 186.0; 297.8 s against 302)                                           | 4/4                                       | the gallop (crash and snare on 1 and 3, the kick on every off-beat eighth); stabs in 3+3+2                                                                            | Songsterr 505592 (human)  |
| Satanized                    | 2025 | 172 in 12/8 (record bar 2.087 s, dotted quarter 115; tab 170)                          | 12/8, 1-bar 6/8 sections                  | open hats on the pulses, the snare on 2 and 4, the kick on most eighths; snare-and-tom chorus; half time on the ride                                                  | Songsterr 1103383 (human) |
| Lachryma                     | 2025 | 111 (tab; record 111.00; 272.4 s against 276.5)                                        | 4/4                                       | open hats in quarters then the ride, the kick on 1 and 3; snare runs into a crash on the "and" of 4                                                                   | Songsterr 1285917 (human) |

**Tried and not used.** Year Zero (392604), Monstrance Clock (389928), Mummy Dust (401585), Square
Hammer (412647, the _Popestar_ EP), Call Me Little Sunshine (500775), Spillways (505591) and Genesis
(391597) all have human tabs; they were left out to keep to twelve songs across the six albums, not for
the quality of their tabs.

**Sources.**

- Wikipedia: Ghost (Swedish band), read for the persona, records and costumes only:
  https://en.wikipedia.org/wiki/Ghost_(Swedish_band)
- Wikipedia: the six albums:
  - _Opus Eponymous_: https://en.wikipedia.org/wiki/Opus_Eponymous
  - _Infestissumam_: https://en.wikipedia.org/wiki/Infestissumam
  - _Meliora_: https://en.wikipedia.org/wiki/Meliora_(album)
  - _Prequelle_: https://en.wikipedia.org/wiki/Prequelle
  - _Impera_: https://en.wikipedia.org/wiki/Impera_(album)
  - _Skeletá_: https://en.wikipedia.org/wiki/Skelet%C3%A1
- Wikipedia: _If You Have Ghost_: https://en.wikipedia.org/wiki/If_You_Have_Ghost
- Wikipedia: _Rite Here Rite Now_: https://en.wikipedia.org/wiki/Rite_Here_Rite_Now
- Ghost at Hellfest, 19 June 2016, Arte Concert broadcast (YouTube mD0SbAPLlWE):
  https://www.youtube.com/watch?v=mD0SbAPLlWE
- Wikimedia Commons:
  - Ghost Rockavaria 2016, Munich, 29 May 2016 (CC BY-SA 3.0)
  - Ghost - Austin 2016 3-6, Emo's, 25 April 2016 (Ralph Arvesen, CC BY 2.0)
- Seattle Music Insider: Ghost holds its Black Mass at the Moore Theater (2016), read through a
  search summary only.
- Sputnikmusic: Ghost - _Meliora_, review by TheMoonchild (2019).
- Songsterr human drum tabs (ids as above): 83366, 84010, 392604, 386459, 389928, 400636, 400667,
  401140, 401585, 412647, 441770, 442661, 521463, 505592, 505591, 500775, 1103383, 1285917.

## AW. The Locust: Gabe Serbian (2026-10-18)

The `locust` style plays **songs** the way `skinny` (AS) and `jordison` (AR)
do: each New picks one of the band's songs, and its tempo, meter and grooves
come with it. Its record is one drummer, Gabe Serbian
(`drummer-model/drummers/gabe-serbian.json`, schema 1.5), new and written from
this section, with three of his Locust records, the 1998 album as Dave Astor's,
a new genre `style:grindcore`, and `sources/gabe-serbian.json`. The user asked
for "the Locust's drummers" as one entry. The band had two drummers, and the
evidence puts the songs the style plays with one of them, so the record is
his. Astor is a stub, joined by a `replaced` edge and a `bandmate` edge.

**Which records are whose.** The Locust formed in San Diego in 1994: Justin
Pearson, Dylan Scharf, Bobby Bray, Dave Warshaw and Dave Astor. It began as a
powerviolence project; its first release was a split with Man Is the Bastard
in 1995 (Wikipedia; VICE 2018). Astor was its drummer from 1994 to 2001. He
plays on:

- the splits with Man Is the Bastard (1995), Jenny Piccolo (1996) and Arab on
  Radar (2000);
- the 1997 EP;
- _The Locust_ (Gold Standard Laboratories, 1998), credited "David Astor –
  drums";
- _Flight of the Wounded Locust_ (2001), "the band's final recording as a
  five-piece (after which drummer David Astor left and was replaced by
  then-guitarist Gabe Serbian)" (Wikipedia, each record's page).

_Follow the Flock, Step in Shit_ (2003) gathers older Astor-era tracks.

Gabriel Serbian, born in San Diego on 1 May 1977 (Wikipedia), joined in 1998
as the second guitarist, on the debut album. He moved to the drums in 2001
(NME 2022). The Peel Session of 2001 (released 2010) "was the first time Gabe
Serbian had started playing drums for The Locust". It fixed the line-up of
Bray, Karam, Pearson and Serbian "for the rest of their time together"
(Wikipedia). His records, all but the first produced by Alex Newport:

- _Well I'll Be a Monkey's Uncle_ (2002);
- the Melt-Banana split (2002);
- _Plague Soundscapes_ (ANTI-, 2003): 23 songs in 21 minutes;
- _Safety Second, Body Last_ (2005): one ten-minute piece in movements;
- _New Erections_ (ANTI-, 2007): eleven songs in 23 minutes, the band's last
  album.

The two men swapped seats twice. Cattle Decapitation formed in 1996 with
"David Astor on bass and Gabe Serbian on drums – both of whom were then also
members of the Locust". When Travis Ryan joined, "Astor moved from bass to
drums, and Serbian moved from drums to guitar". Then Serbian "now plays drums
in the Locust, replacing Astor, who ironically had left the Locust so that he
could more fully devote himself to Cattle Decapitation" (Three One G's band
page). Astor later founded the death metal band Pathology. No source read
describes his drumming beyond Bray's remark below.

Serbian died on 30 April 2022, aged 44. The band announced it the next day and
gave no cause (NME; Wikipedia's infobox has 29 April). It then said it could
no longer be active.

**How he played.** Slayer made him a drummer: "When I was a kid and decided
that I wanted to play drums it was because of the first time I ever heard
Slayer ... Dave Lombardo was the reason I started playing drums" (Cheap
Curls, 2012). "When I first started playing it was Slayer and Dave Lombardo
... and stuff like Dale Crover. Growing up those were my main influences, and
various punk bands" (Big Wheel, 2011). He started at 13 in sixth-grade band,
after the clarinet. His stepfather, a jazz drummer, taught him a rock beat.
Otherwise he taught himself, and practised only on the kit: "It's always on
the set ... If you just play a lot your chops will be up and you will be able
to go fast when you need to" (Big Wheel). Of his speed: "I just did it – I
never had a plan on how to play like I play ... It just naturally evolves"
(Modern Drummer, 2008).

The songs are written, not jammed: "Even when the songs were under a minute,
it would take a tremendous amount of time for us to be satisfied with them
... We'll work out different movements and then we'll figure out how to tie
them together" (Modern Drummer). He writes fast parts at speed ("it's usually
easier for me to write stuff faster"), and his drum parts sometimes change
the others' riffs (Big Wheel).

The blast, in his words: "It's pretty much playing as fast as you can play on
everything at once ... I'm doing 16ths on the kick drum and on the snare drum,
and that varies with what I'm doing with my right hand and the cymbal." Bray:
"All you have to do is listen to how much better Gabe plays blast beats than
our old drummer Dave." Live in Tijuana, "the drums were like lines of
dialogue, clearly delineated bursts five seconds long ... muscling through
each 16th note like he was laying down a punch" (L.A. Weekly, 2003).

A drum teacher's account (Patrick Richardson, 2022) adds the hands:

- "jaunty punch-pause" and "cursive flow of rolls across rumbling toms and/or
  washing cymbals";
- crashes kept low and close for "abruptly choking cymbal-hits with the same
  hand that hits them";
- on stage he "conducts his band-mates through half-a-dozen songs, full of
  abrupt changes, stops, and signaling".

Lombardo returned the regard: "Their drummer is named Gabe Serbian, and their
music hits me now like D.R.I. hit me in the early '80s" (Wikipedia). On the
Fantômas tour Serbian, Lombardo and Ches Smith played together every night.
Each took a turn starting a beat while the others played over it and soloed
(Cheap Curls).

The two human Songsterr tabs show this:

- **Teenage Mustache** (1761834; 165 rising to 200):
  - the main bar: a crash on 1 and 3, two snare 16ths after each, and runs of
    five kick 16ths;
  - punk bars: a crash on every beat, the snare on 2 and 4, two or three rack
    tom 16ths into each backbeat;
  - at 200, crash and snare together on the beats and off-beats over
    continuous 16ths on the kick;
  - six tom 16ths running to the bar line.
- **The Half-Eaten Sausage Would Like to See You in His Office** (5426372;
  110–140): four bars of 4/4, then a run of 3/4 bars. Each has crash and kick
  on 1, snare and open hat on 2, a three-stroke ruff into 3, and kick and hat
  on 3.

The machine tabs agree in outline:

- AOTKPTA's commonest bars are a lone crash-and-kick and silence;
- the tempo and meter change almost every bar in Twenty-Three Lubed Up and
  Pickup Truck.

There are no ghost notes and no swing.

**Kit.** "An alarmingly simple four-piece Ludwig kit" (Modern Drummer, 2008);
"Serbian played Ludwig drums with Paiste cymbals" (Wikipedia, undated). In
2012: "a Ludwig kit from the early 90's ... when Ludwig was first starting to
replicate the drums they made in the 70's. Like the really big John Bonham
style drums ... my kick drum is a 28" concert bass drum that they use for
orchestras" (Cheap Curls). He used Pro-Mark Japanese oak sticks, 2B and later
5B (Big Wheel).

Footage adds the rest:

- **Hellfest 2003:** green lacquer shells, chrome and white coated heads, with
  Zildjian crashes.
- **2007 drum cam:** a metal snare and dark shells.
- **Che Café overhead (c. 2008):** the "obtuse trapezoid" Richardson
  describes. The big rack tom is far to his left and the ride in the centre,
  with toms and ride low and flat and the crashes low.

He played one bass drum. Whether its 16th runs were on one pedal or a double
is not settled.

**Devices (schema 1.5).** None found; a `devices_search` is recorded. It read
the two human tabs bar by bar, seven machine tabs, the interviews and the
footage. No lesson or transcription in a drum magazine was found. One lead did
not hold: a machine tab's single bar of crash and kick every three 16ths
across 4/4 (Twenty-Three Lubed Up). No human source repeats it. The
4/4-to-3/4 changes are mixed meter, and the five-16th kick runs resolve inside
the bar.

**What the style encodes.**

- **Feel:** straight 16ths, Swing 0. Tempo by song, from 110 to 200 and over.
  The tempo and meter change within a song: 4/4 broken by runs of 3/4 bars.
- **Ghosts:** `ghostBias` 0. Everything is loud.
- **Hands:** crash on the beats, or on 1 and 3, with the snare in unison or
  just after it. Blasts are 16ths on kick and snare under a crash on the
  beats. Little hi-hat; an open hat on the beats in the slower bars.
- **Kick:** runs of 16ths under the hands, continuous in the fastest
  sections. On one bass drum; if a double pedal is needed for playback,
  `doubleKick` may carry the runs, but no source says he used one.
- **Stops:** crash-and-kick stabs choked at once, then silence. Short
  sections that change abruptly.
- **Fills:** short. Two or three tom 16ths into the backbeat, a run of six
  to the bar line, a snare ruff, rolls round rack and floor tom. `midFills`
  high: the songs are mostly changes.
- **Kit:** the closest pack kit to a big Ludwig hit hard (see `KIT.md`).
  No freely licensed samples of his kit were found. The likeness's kit is
  green lacquer and chrome, as at Hellfest 2003.

**The songs.**

| Song                                                       | Year | Tempo (quarter)                                                                                                                                 | Meter                                                             | What defines it                                                                                                                                                                                          | Source of the bars                                                                                                 |
| ---------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Teenage Mustache                                           | 2003 | 165 → 180 → 200 → 190 (tab); 161, 174–179, 197–199, 189–191 (record autocorrelation); 52.7 s against 54.6 s. Plays at 165–190                   | 4/4                                                               | crash on 1 and 3 with two snare 16ths after; tom pickups into the backbeat; crash pairs; crash and snare together over the kick; six toms to the bar line                                                | Songsterr 1761834 (human), all 40 bars in order                                                                    |
| The Half-Eaten Sausage Would Like to See You in His Office | 2003 | 135/140, blasts 120–125, end 110–140 (tab); 126–132, 140, 122–124, 120 (record); 46.7 s, the record's length                                    | 4/4, a run of 3/4, an 11/8 (4/4 + 3/8), 2/4                       | open hats over a five-16th kick run; 3/4 with snare and open hat on 2 and a ruff into 3; snare and kick 16ths together (the blast); stop-start end in changing meters                                    | Songsterr 5426372 (human), checked against 6601113 and 4814590 (machine)                                           |
| Pickup Truck Full of Forty Minutes                         | 2003 | 155, 210, 120–105 (tab); 160 (and 210 for the threes), 208, 114–107 (record); 77.7 s against 80.9 s. Plays at 150 / 200 / 100                   | 15/8 (3/4 + 9/8 pairs) at ×¾; 4/4 in eighths; 4/4, 3/4, 2/4 at ×½ | linear 16ths in threes (crash-kick, snare, snare, tom); a fast beat of two snares after 1; crash stabs and real silences                                                                                 | Songsterr 5184654 (machine, the only tab), checked against the record (tempos; cymbal band through the empty bars) |
| Anything Jesus Does, I Can Do Better                       | 2003 | 112, 104, 148 (tab); pulses 152, 144, 99/151 (record) and 154, 142, 100 (drum cover); 94.7 s against 89.0 s. Plays at 108, the slow part at 144 | 6/8 (and 15/8 at ×2), 12/8, 12/8 at ×4/3                          | the snare on the 16th before each kick; the blast in threes (open hat and snare every three 16ths, kick on every 16th); a half-time 12/8; crashes every three eighths                                    | Songsterr 958696 (machine, the only tab), pulses checked against the record and a drum cover. The least certain    |
| AOTKPTA                                                    | 2007 | 160 / 180 / 140 (tab); 164–167 over bars 1–44 (record); 181.3 s against 181.7 s. Plays at 146–150                                               | 5/4, 4/4, 15/8 (7/8 + 4/4), 2/4, 7/8                              | a linear opening of snare, toms, open hats and the hat's foot in mixed meters; tom pickups over a running kick; open hats every dotted eighth over the kick; a two-minute coda of lone stabs and silence | Songsterr 2454468 (machine, the only tab), checked against the record (tempo and length of bars 1–44)              |
| God Wants Us All to Work in Factories                      | 2007 | 110–115, 140–145 (tab); 113, 109, 136–149, 103 (record); 116.8 s against 119.7 s. Plays at 108–110, the fast part at ×4/3                       | 4/4; 6/4, 7/4 (3/4 + neighbour), 3/4, 5/4                         | crash and snare on 1 and 4 over kick 16ths; toms between the kicks; floor tom over the kick; china and snare on the "and"s in 3/4; a blast; triplet ruffs on snare and toms                              | Songsterr 1688467 (machine, the only tab), checked against the record (tempos and length)                          |

**Tried but not used.**

- **Twenty-Three Lubed Up Schizophrenics with Delusions of Grandeur**
  (Songsterr 958697, machine, the only tab). Its tempo changes on nearly
  every bar (120, 170, 120, 140, 150, 160, 170, 150 …), with bars of 15/16
  and 11/16.
  - The record agrees with it only at the start (129) and the end (125); in
    between it gives 175, 151 and 121, which do not match the tab bar for
    bar.
  - The research had already found its one lead, crash and kick every three
    16ths, unconfirmed.
- **Safety Second, Body Last** (2005), one ten-minute piece. It has no tab
  anywhere, and the beat tracker cannot read the drums through the mix:
  - checked on Teenage Mustache, its snare band is flat and its kick band
    noisy against the human tab;
  - so no song could be taken from the 2005 record.
- **No other Songsterr tab of a Serbian-era song exists.** A search for 26
  titles from _Plague Soundscapes_ and _New Erections_ found none.
- Pain Reliever, Brand New Set of Teeth, Nice Tranquil Thumb in Mouth and
  Hairspray Suppository have tabs, but they are from the 1998 album, which is
  Dave Astor's.

**Arrangement.** Every song plays its tab's bars in the record's order,
within 32 slots and 32 distinct bars.

- Teenage Mustache and The Half-Eaten Sausage are complete.
- The others shorten repeated passages and silences, and each song's comment
  says by how much.

| Song | Year | Tempo (quarter) | Meter | What defines it | Source of the bars |
| ---- | ---- | --------------- | ----- | --------------- | ------------------ |
| …    | …    | …               | …     | …               | …                  |

**Sources** (in `sources/gabe-serbian.json`):

- Wikipedia: _The Locust_; _Gabe Serbian_; _The Locust_ (album); _Flight of
  the Wounded Locust_; _Plague Soundscapes_; _Safety Second, Body Last_; _New
  Erections_; _Cattle Decapitation_.
- NME, _The Locust drummer Gabe Serbian has died, aged 44_, 2 May 2022.
- Waleed Rashidi, _Gabriel Serbian of The Locust_, Modern Drummer, April 2008.
- Mindiana Jones, _Interview with Drummer Gabe Serbian_, Big Wheel Magazine, 8
  April 2011 (Internet Archive).
- _INTERVIEW – Gabe Serbian_, Cheap Curls, 12 July 2012.
- Alec Hanley Bemis, _A Day With The Locust_, L.A. Weekly, 18 September 2003
  (Internet Archive).
- David Anthony, _The Locust's Bugged-Out Debut Made Hardcore Way Weirder_,
  VICE, 26 November 2018.
- Three One G, _Cattle Decapitation_ (artist page); Pathology, _Dave Astor -
  Drums_ (band biography).
- Patrick Richardson, _RIP Gabe Serbian_, 3 May 2022.
- Footage:
  - _Teenage Mustache (Live @ Hellfest 2003)_;
  - _Live at London Forum 2004_ (Three One G);
  - _2007 New Erections Tour full set drum cam_;
  - _The Locust at the Che Cafe_ (2008).
- Photo: Gleis 22, Münster, 4 December 2005 (Wikimedia Commons, CC BY 2.0).
- Songsterr drum tabs:
  - human (`aiGenerated` false): 1761834, 5426372;
  - machine, for comparison: 958696, 958697, 2454468, 1688467, 5184654,
    4814590, 6601113.
- Not heard: _The Trap Set_ with Joe Wong, episode 96 (9 November 2016).

## AX. Buddy Rich (2026-10-18)

The `buddyrich` style plays **songs** the way `downey` (AQ) and `roach` (AG)
do: each New picks one of his records, and its tempo, meter and grooves come
with it. His record (`drummer-model/drummers/buddy-rich.json`, schema 1.5) is
new, written from this section, with eight recordings and
`sources/buddy-rich.json`. Seventeen references to `drummer:buddy-rich`
already stood in other records: Bonham, Cobham, Collins, Gadd, Purdie,
Shrieve, Prieto, Downey, Jordison and Jizmak all cite him as an influence.
The record agrees with all of them and repeats Bonham's and Collins's from
his side.

**Which records are his.** Bernard "Buddy" Rich was born on 30 September 1917
in Sheepshead Bay, Brooklyn, and died in Los Angeles on 2 April 1987, after
surgery for a brain tumour (Wikipedia). He was on stage in his parents'
vaudeville act at 18 months, in a sailor suit. By four he was headlining on
Broadway as "Baby Traps the Drum Wonder", and by fifteen he was the
second-highest-paid child entertainer of the 1930s.

His bands, in order (Wikipedia):

- Joe Marsala (1937), then Bunny Berigan and Artie Shaw.
- Tommy Dorsey, 1939–42, 1945 and 1954–55, with Frank Sinatra in the band.
- The Marines, 1942–44.
- His own orchestra, 1945–48, with Sinatra's backing.
- Jazz at the Philharmonic and its drum battles with Gene Krupa; Charlie
  Parker (_Bird and Diz_, 1950); Lester Young; Les Brown; Count Basie.
- Harry James, 1953–62, 1964 and 1965.
- The Buddy Rich Big Band, from 1966 until his death.

The records in his file:

- **Quiet Please** (Tommy Dorsey, 1940): Fidyk's example of his early tom and
  snare soloing. Eric Fischer transcribed the filmed _Not So Quiet Please_
  and _The Trombone Man Is the Best Man in the Band_ (Modern Drummer, 2010).
- **_Krupa and Rich_** (Clef, recorded 1 November 1955): each leads two
  tracks with the JATP stars, and they play together on Bernie's Tune.
- **_Rich Versus Roach_** (Mercury, April 1959): two quintets, Rich's on the
  left channel and Roach's on the right.
- **_Swingin' New Big Band_** (Pacific Jazz, 1966): the new band's first
  record, with Bill Reddie's West Side Story medley.
- **_Big Swing Face_** (Pacific Jazz, recorded live at the Chez, Hollywood,
  February–March 1967): Norwegian Wood, Big Swing Face, Love for Sale,
  Mexicali Nose.
- **_Mercy, Mercy_** (Pacific Jazz, recorded live at Caesars Palace, 7 July
  1968), the band's "finest all-round recording" (Wikipedia): Channel One
  Suite, and Chelsea Bridge on the CD.
- **_The Roar of '74_** (Groove Merchant, October 1973): Nutville, Big Mac,
  Time Check. DownBeat noted that he takes no solos on it: "a very tight,
  hard-driving band".
- **The North Sea Jazz Festival, The Hague, 14 July 1978**, filmed in colour
  for Dutch television. It is the source of two of Drumeo's five Buddy licks,
  and the likeness is taken from it.

He never read music. Bobby Shew: "He'd only have to listen to a chart once
and he'd have it memorized" (Wikipedia).

**How he played.** He learned from no teacher: "I never felt there was anybody
qualified to teach me" (Les Tomkins, Jazz Professional). Henry Adler, who
co-wrote _Buddy Rich's Modern Interpretation of Snare Drum Rudiments_ (1942),
said Rich "came along after he had already acquired his technique" and
"didn't practice" (Wikipedia). His influences were Gene Krupa, Jo Jones, Chick
Webb, Ray McKinley, Ray Bauduc and Sid Catlett (Wikipedia), and Webb above
all: "The greatest soloist I ever heard on drums was Chick Webb"; "the
greatest drummer that ever lived"; "He had fantastic speed" (Tomkins).

- **Time.** "The whole basic point of drumming is to keep time." "I
  rush—and there's a purpose for rushing"; "Rushing is part of the excitement
  of playing"; "if the tempo is absolutely perfect, it's so mechanical that it
  can't possibly swing" (Tomkins). To his bassist Chuck Bergeron he pointed at
  his heart: "I want it RIGHT HERE, right down the middle" (Todd Bishop,
  2018). Steve Fidyk also hears it "right down the middle of the beat", and
  passes on Jim Chapin's view that Rich had the most accurate beat-to-beat
  time he ever heard (Modern Drummer, 2012). Ray Brown heard it
  "on-top-of-the beat" (Ed Soph, 2023). The record says centre, with Brown's
  as the alternative.
- **The hi-hat.** Two bass drums are "a gimmick, that's all. If you're
  playing two bass drums, you can't play the hi-hat", which means "leaving
  off one of the most important sounds in drumming" (Crescendo, March 1968).
  That view made Phil Collins drop his second bass drum. Fidyk points to
  Chelsea Bridge for his hi-hat phrasing.
- **The band.** Fidyk: "listen to the way he interprets section and ensemble
  figures" to hear "a supreme, articulate accompanist", his sound cutting
  through each section "like a razor blade". Ray Brown's story (through Ed
  Soph): at a Dorsey rehearsal a singer complained that the drummer was not
  reading the charts; at the show Rich played figures the singer had not
  known could be played. Jazzfuel: "playing along with a lot of the melodies,
  as opposed to playing around them".
- **Hands.** Traditional grip, matched for crossings over the floor toms;
  speed, power, single strokes; "the stick-trick, a fast roll performed by
  slapping two drumsticks together in a circular motion" (Wikipedia). In one
  solo he played a single-stroke roll that moved toward the rim as it got
  quieter, then "slowly move[d] towards the center of the snare while
  increasing power" (Wikipedia). Drumeo's lesson on his licks (Nekrutman, 2022) gives:
  - a single-stroke roll (1982);
  - paradiddles, paradiddle-diddles, doubles and singles (Tokyo, 1964);
  - a ride-cymbal lick in singles, landing with the bass drum (The Hague,
    1978);
  - a "one-handed roll" that is "a group of three strokes on the left hand"
    then the bass drum or floor tom (The Hague, 1978);
  - the Love for Sale break (Copenhagen, 1968).
- **Snare and bass drum.** Todd Bishop's Big Mac solo (93 bpm): the denser
  stuff "mostly singles", "extremely aggressive with his accents", "lots of
  rim shots", "more unisons between the snare drum and bass drum than perhaps
  with other drummers", "Very little left foot activity". Modern Drummer
  (1977): "The left hand, always active, interacting with astonishing bass
  drum work."
- **What others said.** Krupa: "the greatest drummer ever to have drawn
  breath" (Wikipedia). Shelly Manne: "a stupendous drummer", but "He only
  reaches my head. He doesn't reach my heart and soul" (Down Beat, 1973).
  Bishop: "a powerful sound but kind of crude"; "His rock thing doesn't sound
  fully formed".

**Kit.** Fidyk lists a 14x24 bass drum with a moleskin patch and a wooden
beater, a 9x13 rack tom, two 16x16 floor toms and a 5x14 snare, all with Remo
Coated Diplomat heads. The cymbals are Avedis Zildjian: a 20-inch ride, two
18-inch crashes, 14-inch hi-hats and a 6-inch splash. Wikipedia's list is the
same, with a 5.5-inch snare, 14-inch New Beat hats, a 20-inch medium ride and
an 8-inch splash. He liked "a very tight drum", with front and back heads on
the bass drum (Tomkins).

The makes, from Wikipedia:

- Slingerland in the 1960s and 70s, sometimes with a Fibes snare.
- "Exclusively" Ludwig from "the late 1970s through the early 1980s".
- From 1983 to his death, a 1940s Slingerland Radio King.
- Rogers at some point, undated.

At The Hague in July 1978 the kit is white marine pearl with chrome hardware,
a white front head with a "BR" monogram, one tom on the bass drum and a towel
on the floor tom. Its badge cannot be read in the footage.

**Devices (schema 1.5).** None found. A `devices_search` is recorded instead.
It read Wikipedia (Rich and eight of his albums), Fidyk and three more Modern
Drummer pieces, Bishop's Big Mac transcription and his other Rich posts,
Drumeo's licks, three Tomkins interviews, Soph and Ray Brown, jazz.com and
Jazzfuel, and searched for a hemiola, three over four, or groups of five in
his solos. The leads that did not hold:

- **The Hague "one-handed roll":** three left-hand strokes and the bass drum,
  a sticking of four. The lesson's text gives no note values, so it cannot be
  called a grouping against the beat.
- **jazz.com's "difficult rhythmic devices":** names none.
- **_Rich à la Rakha_:** the track titles name talas (Khanda Kafi, Duet in
  Dadra, Tal Sawari). That is meter, and no source read says what he plays.
- **Big Mac's double time:** thirty-seconds and sextuplets are subdivision,
  with no cross pulse.

**What the style encodes.**

- **Feel:** swing in triplets on the swing charts, with the ride in a firm
  swing and the eighths evening out at his fastest tempos. Straight eighths
  on the rock and soul charts (Norwegian Wood, Mercy, Mercy, Mercy, Big
  Mac). The time is in the middle of the beat, with no lay-back.
- **Ghosts:** `ghostBias` low, about 0.1–0.15. His comping is accents with
  the band, not a ghosted pocket.
- **Hat and bass drum:** the hi-hat foot on 2 and 4 always, and one bass
  drum. The kick is soft under the time and loud with the snare on the band's
  figures.
- **Fills, his habit:** they are the band's figures.
  - A snare set-up, then the bass drum and a crash on the hit, often the last
    triplet of the bar, ringing over the bar line.
  - Accents doubled on snare and kick, with rimshots.
  - In longer breaks, single strokes on the snare, swelled and faded, then
    round the toms and the two floor toms.
  - `fillChance` high and `midFills` up: a big band's arrangement puts hits
    inside phrases, not only at their ends.
- **Kit:** a big jazz kit tuned tight, with bright Zildjian A cymbals. No
  freely licensed samples of his sound were found. The nearest pack kit is
  `virtuosity` (the jazz styles' kit: real toms, foot hat, a ride worth
  riding); see the likeness's KIT.md for the recommendation and a re-tuned
  row.
- **Avoid:** two bass drums, a ghost-note funk pocket, polyrhythmic comping
  (that is Elvin or Haynes), laid-back time.

**Patterns in the record.** Four, all `stylistic_archetype`, `archetype`:

- Big band time: the ride, the hat on 2 and 4, the bass drum feathered.
- A set-up: snare on 4, then kick and crash on the last triplet.
- A single-stroke swell on the snare.
- The Hague "one-handed roll": left-hand threes and the bass drum.

No published transcription's bars were read: Fidyk's West Side Story PDFs,
Caroline Scott's three, Atkinson's two (paywalled) and Fischer's Dorsey
solos are open questions in the record.

**The songs.**

| Song           | Year | Tempo (quarter)                                                  | Meter                                                | What defines it                                                                                                                                  | Source of the bars                                                                                             |
| -------------- | ---- | ---------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Leap Frog      | 1950 | 324 (record beat-tracked 323.9; Town Topics "330")               | 4/4 in eighths, swing curve                          | four-bar intros on the stick hi-hat, open and closed; swing-era time at 330; the drums trading fours with Bird and Diz                           | Todd Bishop, "11 Buddy Intros" (the intro, takes 1–11); the time a reconstruction; the form from the record    |
| Big Swing Face | 1967 | 188 (record 188.3; length 262 bars matches Scott's six pages)    | 4/4 in sextuplets (swung)                            | ride and foot under ghosted comps; ensemble unisons; crash on the "and" of 4 tied over; a 2-and-4 trumpet chorus; the roll stop                  | Caroline Scott's transcription (human, 6 pp.); Songsterr 4703167 (**AI**, of a cover) rejected                 |
| Love for Sale  | 1967 | 220 (record 220.5; Hal Leonard's 244 is its sound-alike)         | 4/4 in eighths, swing curve                          | the intro and head on the stick hi-hat, open on the beats, no foot; the ride for the bridge and solos; kicks and stops                           | Caroline Scott's transcription (human, 6 pp.); intro checked against Hal Leonard Drum Play-Along vol. 35 p. 44 |
| Mexicali Nose  | 1967 | 219 (record 218.7; 157 bars against Scott's 154)                 | 4/4 in eighths, swing curve; Latin and solo straight | a Latin bell and a cowbell; the head on half-open hats with the snare on the melody; dotted-quarter accents in the drum solos and the ensemble   | Caroline Scott's transcription (human, 4 pp.)                                                                  |
| Nutville       | 1974 | 142 (record beat-tracked; tab 140, 169 bars = 290 s against 287) | 4/4 (straight)                                       | ride eighths, the snare on every "and", bass drum on 1, its "a" and the "and" of 2; ensemble crashes; a half-time solo; the drum solo to the end | Songsterr 682345 (human), checked against the record; 6104103 (**AI**) rejected                                |

**Tried and dropped.**

- **Groovin' Hard** (_Keep the Customer Satisfied_, 1970): Songsterr 4086451 is marked
  human, but it writes straight eighths for a record whose hats swing (autocorrelation
  peak at two thirds of the beat at 140). Its 189 bars do not match the record's 177, and
  its intro (16 bars of drums before the band) does not match the record's tonal energy
  (horns from bar 13). It also repeats identical five-bar blocks.
- **Willowcrest** (_Big Swing Face_): Songsterr 3834886 (human) and 2356137 (AI) are both
  3/4 sketches that are not the record's part. 2356137 has 147 empty bars out of 157.
- **West Side Story medley, Channel One Suite, Time Check, Just in Time, Birdland**: only
  machine-made tabs exist (3013468, 4729985, 3819668, 4050150, 3834887, 6095329). They
  have empty stretches, four- and six-bar blocks repeated, straight eighths for swing,
  and tempo maps that jump.
  - West Side Story: Modern Drummer's 2012 transcription of its solo (Steve Fidyk) is
    no longer online, and the Wayback Machine has only 404s.
  - Birdland: a published transcription exists only for its first 18 bars (Hal
    Leonard's free page). Its sixteenth hats would also hold the song to 150 against the
    record's 181.
- **Big Mac** (_The Roar of '74_): Todd Bishop's transcription covers the drum solo only.
  Its bars are dense sixteenths and thirty-seconds on the snare, which the critic refuses
  almost bar for bar.
- **Mercy, Mercy, Mercy** (1968): no transcription found. The record (122) does not fold
  into a clear kick and snare with the bass guitar in the same band.
- **Tommy Dorsey and Artie Shaw features** (Quiet Please, Well, Git It!, Traffic Jam):
  no transcription found. Eric Fischer's Modern Drummer pieces are videos.

So five songs, not eight: these are the records whose drum part could be read from a
human source.

**Sources** (in `sources/buddy-rich.json`):

- Wikipedia: _Buddy Rich_; _Swingin' New Big Band_; _Big Swing Face_ (Buddy
  Rich album); _Mercy, Mercy_ (Buddy Rich album); _Rich Versus Roach_;
  _Krupa and Rich_; _The Roar of '74_; _Rich à la Rakha_; _Burning for Buddy_.
- Steve Fidyk, _Buddy Rich: Style & Analysis_, Modern Drummer, 17 October 2012.
- Jim Warchol, _Buddy Rich_, Modern Drummer, January 1977 (the opening only).
- _Slightly Offbeat: Buddy Rich, Meet Eric Fischer_, Modern Drummer, April 2010.
- Les Tomkins's interviews with Buddy Rich: Crescendo, March 1968; and two
  from Jazz Professional (National Jazz Archive), dated 1980 and 1981 by the
  archive, 1968 and 1971 by their copyright notices.
- Todd Bishop, Cruise Ship Drummer: _Transcription: Buddy Rich – Big Mac_
  (18 February 2023); _Buddy's time_ (Chuck Bergeron, 3 March 2018); _Shelly
  on Buddy_ (Down Beat, March 1973; posted 28 January 2026).
- Greyson Nekrutman, _5 Impossible Buddy Rich Licks_, Drumeo, 4 February 2022.
- Scott K. Fish, _Ed Soph – Buddy Rich Was a Genius_, 11 July 2023.
- David Ingamells, _10 of The Best Buddy Rich Albums in Jazz History_,
  Jazzfuel.
- _Buddy Rich – Bernard Rich_, jazz.com encyclopedia.
- Footage:
  - the North Sea Jazz Festival, The Hague, 14 July 1978 (World of Jazz,
    AVROTROS): Channel One Suite and the full concert;
  - TV studio, Copenhagen, 1968 (black and white).

## AY. Carlton Barrett (2026-10-18)

The `carltonbarrett` style plays **songs** the way `downey` (AQ) does: each
New picks one of his records, and its tempo, meter and grooves come with it.
His record (`drummer-model/drummers/carlton-barrett.json`, schema 1.5) is new,
written from this section, with eleven recordings and
`sources/carlton-barrett.json`. Yussef Dayes' record already named him as a
stub (`drummer:carlton-barrett`, `cites_as_influence`); the new record keeps
that id and agrees with it.

**Which records are his.** Carlton "Carly" Barrett was born in Kingston on 17
December 1950, the second son of Wilfred and Violet Barrett (Wikipedia). His
first kit was empty paint tins. His brother Aston "Family Man" Barrett
remembers it: "He make a little platform and he get some different sizes of
empty paint tins ... hitting the floor with his right heel as the foot drum".
One found cymbal, nailed to a piece of wood, "was both his crash and his
after-beat hi hat" (Obrecht, 2011). The brothers played as the Soul Mates, the
Rhythm Force and the Hippy Boys (Wikipedia). Aston: "The band is called first
the Hippy Boys, then The Upsetters, then the Youths Professionals" (Obrecht).
As Lee "Scratch" Perry's Upsetters they "backed Bob Marley on a full-time
basis, especially on the albums Soul Rebels and Soul Revolution Part II".
"By 1972 the Barrett brothers had joined the Wailers" (Wikipedia, The
Upsetters). Barrett himself, in 1983: "Scratch Perry and the Upsetter band and
before that the Hippy Boys in the '60s. When I first start to play drums I
think I played on some gospel records too" (Modern Drummer, July 1983).

He is the only kit drummer credited on these records:

- _Catch a Fire_ (1973).
- _Burnin'_ (1973).
- _Natty Dread_ (1974), "drums, percussion".
- _Live!_ (the Lyceum, July 1975).
- _Rastaman Vibration_ (1976).
- _Exodus_ (1977).

Other drummers share three albums:

- **_Kaya_ (1978):** Winston Grennan is credited on drums as well.
- **_Survival_ (1979):** Carlton "Santa" Davis on Africa Unite and Mikey "Boo"
  Richards on Wake Up and Live. Barrett's own account is broader: "One side of
  the LP is the Wailers, but the other side is not ... Mikey Boo played drums"
  (MD 1983).
- **_Uprising_ (1980):** Santa Davis is credited on drums, on tracks not given.

The fan site adds that Sly Dunbar plays Punky Reggae Party. Outside the
Wailers, he drums on Augustus Pablo's _King Tubbys Meets Rockers Uptown_
(1976), and on Bunny Wailer's _Blackheart Man_ and Peter Tosh's _Legalize It_
and _Equal Rights_ (Wikipedia; not modelled here). The Wailers' site gives the
brothers "over 90 per cent" of Marley's Island songs. He co-wrote Them Belly
Full (But We Hungry), Talkin' Blues, Who the Cap Fit and War (album pages).
After Marley died he stayed with the Wailers Band (_Out of Exile_). He was shot
dead outside his home in Kingston on 17 April 1987, aged 36 (Wikipedia).

**How he played.** The one drop came first: kick and cross-stick together on
3, nothing on 1 (Wikipedia, One drop rhythm). He is credited with taking it
round the world: Rolling Stone, No. 29 of its 100 Greatest Drummers (2016),
"popularised" it (via Wikipedia and bonedo). Who invented it is disputed:

- **Aston Barrett** (2011), asked if Carly invented it: "Accurate. That's da
  man." How they made it: "we in-graft that kind of Nyabinghi communal and mix
  it with the Jamaica mento and then we decide to create that beat and feel it
  on the one-drop".
- **The Guardian** (via Wikipedia) and the **Jamaica Observer** credit Winston
  Grennan, who also drums on _Kaya_.

Geoff Nicholls' obituary (Making Music, June 1987) is the best short account
of the playing:

- "Carlton Barrett defined reggae drumming all over the world."
- The one drop on No Woman, No Cry; the "four-to-the-bar 'steppers'" on Exodus
  and Jamming.
- "The stumbling hi-hat figures heard on many Wailers tracks eg 'Heathen' are
  a Barrett trademark", giving "a sinuous twist to the loping reggae
  half-time feel".
- "a characteristically high and resonant snare drum tuning. This gave him a
  penetrating rim side-stick click and a very sharp rim-shot sound."

Wikipedia calls the hat "a highly syncopated, broken triplet pattern" and
notes his "dazzling drum introductions". LargeUp (2014) has "complex triplet
hi-hat variations" (Running Away), "a dry-tuned kit" and a "tight,
high-pitched snare". Adam Osmianski's Three Little Birds transcription (2025;
its text only read) says the hat varies bar to bar, "sometimes you'll hear
1e&a, while other times only 1&a". He adds: "There are NO crashes. None."
and "Use open hi-hats instead." Legendary Reggae: "drum fills often do not end
with a climactic cymbal".

In his own words (Robert Santelli, "The Reggae Drummers", Modern Drummer, July
1983, read in the archive.org scan):

- **The rhythm section:** "Fams and I, we always had a special pattern for
  playing, a cool drive that everybody take notice of". Santelli calls it "the
  exceptionally tightfisted drumming of brother Carly".
- **Why he plays:** "it's a spiritual vibe that I try and get from my drums to
  the music. Because drums come from the slavery days and from Africa, it comes
  from a lot of history."
- **Arrangements:** "Bob never interfere with his musicians. He always leave
  the basic parts for his musicians to figure out."
- **His best drumming:** "I think it Kaya ... So I got to play deep; more
  within."
- **His reggae hall of fame:** "Sly Dunbar and Lloyd Nibbs. And then Hugh
  Malcom and Winston Graham of Soul Vendors. And one more—Carlton Barrett."
  Wikipedia has him "heavily influenced by Lloyd Knibb" of the Skatalites.

Aston, on the pair: "That's where we lock – the drummer and the bass", and
"the drum, it is the heartbeat, and the bass, it is the backbone". On
discipline: the first night taped for _Babylon by Bus_ was "too exact like the
LP", and the band were told to "loosen up a little" (Obrecht).

A fan's analysis (David McDavitt's "The Drums of Carlton Barrett", which cites
Mark Miller, the Wailers' stage manager, and John Masouri) adds:

- The snare as a "repeater" drum, as in Nyabinghi.
- Few crashes, a rimshot instead; timbale-style rimshot ruffs to mark a
  section.
- The "and" of 4 opened on the hat or hit on a tom.
- Half-bar hat syncopations that resolve to straight time (The Heathen, Crazy
  Baldhead, Exodus).
- Fills only to signal a section.

It is an analysis, not a transcription, and the record weights it so.

**Who he passed it to.** Yussef Dayes names him among his ten favourite
drummers (Stamp the Wax, 2017; already in Dayes' record). totaldrumsets.com,
quoted by the Jamaica Observer (2015), says his "broken triplet hi-hat style
was copied wholesale by The Police drummer Stewart Copeland". Copeland was not
found saying so. The edge is `influenced`, marked `speculative`, which
Copeland's record does not contradict (its open question asks which reggae
drummers he cites).

**Kit.**

- **Before 1979:** rental and studio kits, Ludwig when he could ("You once told
  me Ludwig and Rogers were the drumkits you preferred", MD 1983). The Wailers'
  touring Ludwig was rented until Marley bought it, "Today it's in the Tuff
  Gong studio like a shrine". A kit Marley bought in Delaware and gave him
  burned in a fire at the Green Mist in Kingston; Marley then bought him a new
  kit at Manny's in New York.
- **From 1979:** Yamaha. "The first time the Wailers go to Japan, the Yamaha
  people want me to endorse their drums. So they give me a kit" (MD 1983).

The fan site, from photographs and Miller, adds:

- **The 1976 Ludwig:** natural finish, a 22x14 bass drum, 12x8, 13x9 and
  16x16 toms with their bottom heads off, and a 14x6.5 Ludwig 402 snare with a
  coated Ambassador, tuned "high & dry" and sometimes played with the snares
  off.
- **The Yamaha 9000s (birch):** a yellow kit from Japan, and a cobalt blue one
  for North America with extra 8, 10 and 14 or 15-inch toms. The blue is
  plain in the Santa Barbara film of November 1979.
- **Snares on the Yamahas:** a 402 on most nights; a Yamaha steel snare at
  Dortmund, 1980.
- **Cymbals:** Zildjian hollow-logo, 14-inch New Beat hats, medium crashes of
  14, 16 and 18 inches.
- **Extras:** a cowbell; one towel between the hats at the Rainbow, 1977.
- **Later:** a half-Simmons kit after Marley, and Simmons drums on his last
  session in 1985.

**Devices (schema 1.5).** None found. A `devices_search` is recorded instead.
It read:

- Thirteen human Songsterr tabs, bar by bar.
- Modern Drummer issues 30 to 50 (1982 and 1983) in archive.org's text.
- The Aston Barrett interview, Nicholls, Osmianski's text and the fan site.
- LargeUp, the Jamaica Observer, Legendary Reggae and the Wikipedia pages.

No readable Drumeo, MusicRadar or Modern Drummer transcription of his parts
was found. The leads that did not hold:

- **The broken triplet hat:** the swing of the grid. Its notes fall on the
  last triplet of a beat, with no cross pulse.
- **The one drop and the steppers:** grooves, not devices.
- **The fan site's "African clave polyrhythms" and its triplet figure at
  phrase ends** (One Love, War, Zion Train): no transcription read bears them
  out. The One Love tab (27219) has no quarter-note triplets, and no tab of
  War or Zion Train was read.

**What the style encodes.**

- **Notation first.** The human tabs write the one drop two ways:
  - **The drop on 3, once a bar:** Three Little Birds and Stir It Up at 146.
  - **The drop on 2 and 4, at half that speed:** Concrete Jungle at 95, I Shot
    the Sheriff at 94, Get Up, Stand Up at 78.

  The tabs' lengths match the records (Concrete Jungle: 100 bars at 95 is 253
  s, the track's 4:13; Three Little Birds: 111 bars at 146 is 182 s against
  3:00). So a drop comes every 1.26 to 1.64 s. The record writes every pattern
  a drop to a bar, the drop on 3, at 122 to 190. The catalogue's `reggae`
  genre style plays the drop on 3 at 68 to 88, a drop every 2.7 to 3.5 s,
  which is half the records' rate. The songs should beat-track each record and
  choose one reading; the drop-on-3 bar at the records' rate is the one that
  keeps the cross-stick where every source puts it.

- **Feel:** the hat on a triplet grid in the stumbling songs (Concrete Jungle,
  I Shot the Sheriff, Get Up, Stand Up), straight eighths in Stir It Up and
  Three Little Birds, quarters under Jamming's steppers. Swing at zero with
  the triplets in the grid, as AQ does for the shuffles.
- **Kick:** on 3 only in the one drop, never on 1. Every beat in the steppers
  (Exodus, Jamming).
- **Snare:** the cross-stick on 3 with the kick, never a plain backbeat on 2
  and 4. A rimshot for accents and fills.
- **Hat:** the lead voice, usually silent on the drop. Vary the number of hat
  notes bar to bar ("1e&a" or "1&a"); open it on an off-beat (the "and" of 4)
  instead of crashing.
- **Ghosts:** `ghostBias` low to moderate, about 0.2. The tabs have almost no
  snare ghosts; the quiet notes are on the hat.
- **Fills:** rare, at section changes only. Rimshots, a ruff, the toms high
  and dry. End on an open hat or on nothing, not on a crash. `midFills` near
  zero.
- **Kit:** see `likeness/KIT.md`. No freely licensed samples of his sound were
  found. The closest pack kit is `police`: the DRS kit with its snare played
  faster, so it sits high and tight. It has a real cross-stick sample, which
  `sixties` (SM Drums' Ludwig) lacks.

**Patterns in the record.** Six, all `approximation` and `draft`, from human
Songsterr tabs (`aiGenerated` false through the meta API), each written a drop
to a bar:

- Concrete Jungle (12459), on a triplet grid.
- I Shot the Sheriff (13578), on a triplet grid.
- Get Up, Stand Up (415804), on a triplet grid.
- Stir It Up (1390846).
- Three Little Birds (19635).
- Jamming (371539), the steppers.

Each keeps the tab's most common bar. The Heathen's hat is a described lick,
`to_transcribe`.

**The songs.**

**Which records are his.** Carlton Barrett (17 December 1950 – 17 April 1987), Kingston;
with his brother Aston "Family Man" Barrett in the Soul Mates, the Rhythm Force and the
Hippy Boys, then Lee Perry's Upsetters, and from 1969–70 the Wailers' rhythm section
(Wikipedia). Credited on drums on _Catch a Fire_, _Burnin'_, _Natty Dread_, _Live!_,
_Rastaman Vibration_, _Exodus_, _Kaya_ (with Winston Grennan), _Survival_ (Santa Davis on
"Africa Unite", Mikey "Boo" Richards on "Wake Up and Live") and _Uprising_ (with Santa
Davis, no tracks named) — Wikipedia, each album's personnel. In Modern Drummer (July 1983,
Robert Santelli) he said one side of _Survival_ was not the Wailers: "The side with the
song 'Africa Unite' … Mikey Boo played drums" — which takes in "One Drop".

**How he played, in his words** (Modern Drummer, July 1983): "Fams and I, we always had a
special pattern for playing, a cool drive that everybody take notice of"; "it's a
spiritual vibe that I try and get from my drums … The reggae drummer carries that history
more than the guitarist or keyboards player"; "Bob never interfere with his musicians. He
always leave the basic parts for his musicians to figure out"; his best drumming is on
_Kaya_, "things that hurt and feel, y'know? So I got to play deep; more within." Wikipedia:
"a highly syncopated, broken triplet pattern on the hi-hat, and … dazzling drum
introductions"; "credited with popularising the one drop rhythm".

| Song                     | Year | Tempo (quarter) and evidence                                   | Meter                                | What defines it                                                                                    | Source of the bars                                          |
| ------------------------ | ---- | -------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Concrete Jungle          | 1973 | 95 (tab; 252.6 s vs 253); record 96.0; songbpm 96              | 4/4 in sextuplets                    | the drop on 2 and 4, a triplet pickup on the hat; four on the floor, no snare, for the intro       | Songsterr 12459 (human)                                     |
| Stir It Up               | 1973 | 146 (tab; 337 s vs 334.7); record 147.2; songbpm 150           | 4/4                                  | the kick alone on 3, then the rim, then a crash on the drop, in sixes; a passage of the rim alone  | Songsterr 1390846 (human)                                   |
| Get Up, Stand Up         | 1973 | 78 (tab; 196.9 s vs 198.4); record 78.1; songbpm 78            | 4/4                                  | the drop on 2 and 4 under the hat's `1.21`; the rim walking later; floor-tom triplets; the roll in | Songsterr 415804 (human)                                    |
| No Woman, No Cry (Live!) | 1975 | 78 (tab; 427.7 s vs 428); record 78.3; songbpm 78              | 4/4                                  | kick 1 and 3, snare 2 and 4; the hat's sixteenth pickups, then open on the "and"s for the outro    | Songsterr 115 (human)                                       |
| Positive Vibration       | 1976 | 133 (tab; 209.3 s vs 213 with fade); record 131.9; songbpm 132 | 4/4                                  | a roll in; the one drop, the hat opened on the "and" of 4; quarters; a cymbal alone on the beats   | Songsterr 1423905 (human)                                   |
| Jamming                  | 1977 | 122 (tab; 212.5 s vs 211); record 123.6; songbpm 124           | 4/4; the break in sextuplets         | steppers: kick on every beat, hat on the beats, rim on 3 and the "and" of 4; a triplet break       | Songsterr 371539 (human), checked against 3604035 and 12709 |
| Three Little Birds       | 1977 | 146 (tab; 182.5 s vs 180); record (video) 148.5; songbpm 149   | 4/4                                  | a two-bar figure: rim on the "and" of 1, the hat half-opened on 4, then on 2 with accents          | Songsterr 19635 (human)                                     |
| Waiting in Vain          | 1977 | 78 (tab, to the fade); record 78.9; songbpm 78                 | 4/4 in sextuplets; the bridge in 4/4 | the drop on 2 and 4, a triplet on the hat before each drop, opened into the 1; bridge stabs        | Songsterr 27217 (human)                                     |
| We and Dem               | 1980 | 142 (tab; 196 s vs 193; at 144, 193.3); record 143.4           | 4/4                                  | a crash on the drop, the high tom on the "and" of 4; the kick on the 1 for a passage               | Songsterr 2968929 (human); drummer not certain              |

**Tried and dropped.**

- _One Drop_ (Survival, 1979): a detailed human tab (530215), but by Barrett's own account
  (MD 1983) the side of _Survival_ with "Africa Unite" — "One Drop" is on it — was cut with
  Mikey Boo on drums. Wikipedia names Boo only on "Wake Up and Live"; the doubt is too
  large for a song filed under his name.
- The Upsetters era (_Soul Rebels_, 1970): only machine-made tabs (358961 Soul Rebel: 70
  empty bars of 77; 5122553 Soul Rebel Dub; 3877336 Return of Django, whose drummer is not
  established). Nothing human to check them against.
- _Them Belly Full_ (415810, human, 76 distinct bars in 81): an improvised live part,
  bar by bar different, with kick runs the critic refuses; no second source.
- _Crazy Baldhead_ (1700544): the drums and percussion are confused (no snare, a "crash"
  row that is a shaker's).
- _Is This Love_, _Sun Is Shining_, _Misty Morning_, _Crisis_ (Kaya): mostly empty bars,
  skeletons, bars without a backbeat, or a length that does not match the record (Crisis
  68 bars at 123 = 133 s against 3:54); _Kaya_ also credits Winston Grennan.
- _Could You Be Loved_ (1980): two human tabs that disagree (27215: kick 1 and 3, the hat
  on the "e" and "and"; 1489458: kick on every beat, hats in eighths), on the album with
  Santa Davis's uncertain share.
- _I Shot the Sheriff_ (13578): 75 bars at 94 = 191 s against 4:41; _Burnin' and Lootin'_
  (27214): 21 bars; _So Jah Seh_ (3784491): bars of 6/4 and 2/4 and a part not checked;
  _Trench Town Rock_ (288017): drums regenerated by machine.

Sources: Songsterr meta and tabs (each `aiGenerated` read from the meta API); Wikipedia
(Carlton Barrett; Catch a Fire; Burnin'; Natty Dread; Live!; Rastaman Vibration; Exodus;
Kaya; Survival; Uprising; No Woman, No Cry; Waiting in Vain); Modern Drummer July 1983
(Robert Santelli, Barrett interview, pp. 18–19, 82); songbpm.com; the records (official
Bob Marley uploads) beat-tracked with `beats.py`.

**Found on the way, not changed.**

- **The year he joined:** Wikipedia's Barrett page says the brothers joined
  the Wailers in 1969, meaning the Perry sessions. The Upsetters page and
  Santelli put the permanent move at about 1972, and the record follows them.
- **"Winston Graham of Soul Vendors":** printed so in his 1983 hall of fame.
  It may be a mishearing of Winston Grennan, who played with the Supersonics,
  not the Soul Vendors. No edge is drawn.
- **Not read:** Jeff Potter's "Bob Marley's Carlton Barrett" (Modern Drummer, 2018) is paywalled; only its first line was read. The 1982 Modern Drummer
  interview the fan site cites was not found in issues 30 to 50.
- **Grip:** no source read says which grip he used.

Sources: Wikipedia —
[Carlton Barrett](https://en.wikipedia.org/wiki/Carlton_Barrett),
[One drop rhythm](https://en.wikipedia.org/wiki/One_drop_rhythm),
[The Upsetters](https://en.wikipedia.org/wiki/The_Upsetters),
[Soul Rebels](https://en.wikipedia.org/wiki/Soul_Rebels),
[Catch a Fire](https://en.wikipedia.org/wiki/Catch_a_Fire),
[Burnin'](<https://en.wikipedia.org/wiki/Burnin%27_(Bob_Marley_and_the_Wailers_album)>),
[Natty Dread](https://en.wikipedia.org/wiki/Natty_Dread),
[Live!](<https://en.wikipedia.org/wiki/Live!_(Bob_Marley_and_the_Wailers_album)>),
[Rastaman Vibration](https://en.wikipedia.org/wiki/Rastaman_Vibration),
[King Tubbys Meets Rockers Uptown](https://en.wikipedia.org/wiki/King_Tubbys_Meets_Rockers_Uptown),
[Exodus](<https://en.wikipedia.org/wiki/Exodus_(Bob_Marley_and_the_Wailers_album)>),
[Kaya](<https://en.wikipedia.org/wiki/Kaya_(album)>),
[Survival](<https://en.wikipedia.org/wiki/Survival_(Bob_Marley_and_the_Wailers_album)>),
[Uprising](<https://en.wikipedia.org/wiki/Uprising_(Bob_Marley_and_the_Wailers_album)>);
[Robert Santelli, The Reggae Drummers, Modern Drummer, July 1983 (issue 45)](https://archive.org/details/modern-drummer-issue-45);
[Jas Obrecht, Interview with Aston "Family Man" Barrett, 2011](https://legendaryreggae.com/wp-content/uploads/2011/10/interview-with-aston4.pdf);
[Geoff Nicholls, Drum Hum, Making Music, June 1987](http://www.muzines.co.uk/articles/drum-hum/11444);
[David McDavitt, The Drums of Carlton Barrett](https://carltonbarrett.weebly.com/)
([Cym/Snare](https://carltonbarrett.weebly.com/cymsnare.html),
[Playing](https://carltonbarrett.weebly.com/playing.html));
[LargeUp, Reggae's Ten Greatest Drummers, 2014](https://www.largeup.com/2014/04/29/toppa-top-10-reggaes-greatest-drummers/9/);
[Howard Campbell, Jamaica Observer, 2015](https://jamaicaobserver.com/2015/02/21/sly-dunbar-and-carlton-barrett-among-100-most-influential-drummers);
[bonedo.de on Rolling Stone's 100 Greatest Drummers, 2016](https://www.bonedo.de/artikel/rolling-stone-magazine-veroeffentlicht-liste-der-100-wichtigsten-drummer/);
[The Wailers, Carlton Barrett](https://www.thewailers.com/?p=4217);
[Legendary Reggae, Feel It in the One Drop, 2011](https://legendaryreggae.com/2011/10/23/feel-it-in-the-one-drop/);
[Adam Osmianski, Three Little Birds transcription, That Drum Blog, 2025](http://thatdrumblog.blogspot.com/2025/10/groove-transcription-carlton-barrett.html);
[Stamp the Wax, Yussef Dayes' 10 favourite drummers, 2017](https://www.stampthewax.com/?p=31866);
the Santa Barbara County Bowl film, 25 November 1979
([YouTube i6cRXFs6BzI](https://www.youtube.com/watch?v=i6cRXFs6BzI)) and
Rockpalast, Dortmund, 13 June 1980
([YouTube f1ROu4mlMWI](https://www.youtube.com/watch?v=f1ROu4mlMWI),
[taEl5Gt20yA](https://www.youtube.com/watch?v=taEl5Gt20yA));
Songsterr tabs 12459, 13578, 415804, 1390846, 19635, 371539 (patterns) and
115, 27219, 12614, 530215, 1700544, 27214, 288017 (read)
(`https://www.songsterr.com/api/meta/<id>` for the `aiGenerated` flag).

## AZ. Al Jackson Jr. (2026-10-18)

The `aljackson` style plays **songs**, the way `downey` (AQ) and `collins` (X)
do: each New picks one of his records, and its tempo, meter and grooves come
with it. His record (`drummer-model/drummers/al-jackson-jr.json`, schema 1.5)
is new, written from this section. It comes with ten recordings,
`sources/al-jackson-jr.json`, and a new genre, `style:southern-soul`, which
belongs in `GENRE_FAMILY` as `funk-soul`. No earlier record named him; the
id is `drummer:al-jackson-jr`.

**Which records are his.** Albert J. Jackson Jr. was born in Memphis on 27
November 1935 and was shot dead at home there on 1 October 1975, by an
intruder who was never identified (Wikipedia). His father, Al Jackson Sr., led
a jazz and swing dance band, and the boy was on its stage in 1940, at five.
By his teens he was in Willie Mitchell's band and Ben Branch's. Mitchell: "Al
Junior was about 14 years old then", and by the time his father arrived he was
"swinging that damn band like a pro" (Wikipedia). Steve Cropper and Duck Dunn
heard him with Mitchell at the Flamingo Room. Booker T. Jones told them "You
guys need to know about Al." He joined Stax as its first salaried session
player, because a guaranteed wage beat club money, and kept playing Mitchell's
Hi sessions (Wikipedia).

He is the drummer on:

- **Booker T. & the M.G.'s**, from _Green Onions_ (1962, a jam during a Billy
  Lee Riley session) to _Melting Pot_ (1971). Lewie Steinberg played bass until
  Dunn replaced him in 1965 (Wikipedia, Booker T. & the M.G.'s).
- **The Stax house band**: Otis Redding (_Otis Blue_, 1965; _Dictionary of
  Soul_, 1966, with Try a Little Tenderness), Sam & Dave (Soul Man; Hold On,
  I'm Comin'), Wilson Pickett's In the Midnight Hour (Stax, 12 May 1965),
  Eddie Floyd's Knock on Wood, Albert King's _Born Under a Bad Sign_ (1967).
  The album pages credit him alone.
- **Al Green at Hi**, from _Green Is Blues_ (1969) to _Livin' for You_ (1973).
  He co-wrote Let's Stay Together and I'm Still in Love with You. The albums
  credit Howard Grimes and Jackson together, with no split by track. Grimes's
  obituary in Salvation South gives Let's Stay Together's drums to Jackson,
  with "the little gallop" Grimes's, and I Can't Stand the Rain (Ann Peebles)
  to Jackson. By Grimes's own account Love and Happiness is his.
- **Sessions** for Aretha Franklin (_Young, Gifted and Black_, shared with
  Purdie and Ray Lucas), Bill Withers, Eric Clapton (_461 Ocean Boulevard_),
  Rod Stewart (_Atlantic Crossing_), Elvis Presley and others (Wikipedia).

He played Monterey Pop with the M.G.'s on 17 June 1967: their own set, then
Redding's (Wikipedia; D.A. Pennebaker's film).

**How he played.** No interview with him was found. Everything here is
bandmates, singers and writers.

- **Time.** "The Human Timekeeper" (Wikipedia; Memphis Music Hall of Fame).
  Sam Moore: "This man was like a human metronome. He had tempo", and to
  singers: "You don't count! Al is doing that for you!" (Doerschuk, _Traps_,
  2007).
- **Placement.** Dunn: "With Al you just had to kind of wait on him and wait
  till he'd come down on the beat to catch him ... He'd just keep it right where
  he thought it should be and he'd make you look like a fool. But he was right
  ninety per cent of the time" (Memphis Music Hall of Fame). In the Midnight
  Hour has the "delayed backbeat": Jerry Wexler danced the Jerk in the studio,
  "they were putting the accent on two", where the band had been
  "one-beat-accenters with an afterbeat" (Cropper, Wikipedia).
- **Economy.** Modern Drummer (2010, read through a summary) calls him
  "deceptively simple": few fills, no crash that would wash out the
  arrangement, each groove tailored to its song, and a spacious, clean, strong
  sound. Vinnie Sperrazza on Green Onions: "Jackson's elemental beat is slick,
  clean, and perfectly in time. No fills, no variations, just subtle dynamics
  and intense focus" (On Backbeats, 2024). Doerschuk: "his knowledge of where
  to drop that rare fill".
- **The singer first.** Moore: "Al could lay down a pattern, and he would
  follow you wherever you wanted to go"; "He was the best setup man you could
  ever find". Cropper: "He defined the groove, the beat, the mood, everything.
  You listen to Al Jackson and you played accordingly" (Hall of Fame).
- **Exacting.** Booker T. Jones: "He would hit you over the head with the
  drumstick if one eighth note or a sixteenth note was off" (Hall of Fame).
  Moore: When Something Is Wrong with My Baby "took sixty-five takes".
- **Jazz under it.** Willie Mitchell (to _Drum!_): "He could play Gene Krupa
  and all that stuff. And he was reading charts when he was 12 years old".
  Sperrazza hears his and Benny Benjamin's "deep jazz background plain as day".
- **The softened backbeat.** Sperrazza on Let's Stay Together: "On the
  verses, Jackson's left hand plays the backbeat on the snare as usual", the
  right hand moving "from the hi-hat to a muffled floor tom to play the backbeat
  in unison with the snare", "softening the backbeat".
- **One foot, one hand.** Moore: "He's got his foot on the sock, holding it
  down, and he's playing the snare with one hand"; "Buddy Rich played double
  bass. Al played single."
- **When he was busier.** Todd Bishop's Over Easy transcription (2013) has the
  left hand on the hat while the ride goes on, the snare at three levels
  (accent, normal, ghost), sixteenth-note triplets and sextuplets "probably
  RRL", and a fill that "ends strongly with the bass drum only". On Crosscut
  Saw (Albert King) he plays "a sort of a blues rhumba groove" with no hat, the
  accents as rimshots, and the bass drum leaning on 2 and 4 (Bishop, 2014).

Al Green (_Rolling Stone_, 1973) said he would "stay back there for hours,
just beating the drums with his eyes closed". Cropper: "the greatest drummer to
ever walk the earth" (Wikipedia, Booker T. & the M.G.'s). Steve Jordan names
him, with Earl Palmer and others, among the backbeat's foundations (Ethan
Iverson, _The Nation_, 2024, read as quoted by Sperrazza).

**What the human tabs show.** Ten Songsterr drum tabs, each with
`aiGenerated: false` through the meta API, read bar by bar:

- Straight eighths in every one.
- Snare on 2 and 4.
- Kick on 1 and 3 with a push on the "and" of 3 (Midnight Hour, Let's Stay
  Together, Dock of the Bay, Born Under a Bad Sign). On the uptempo Sam & Dave
  records it follows Dunn's line through the bar.
- Four on the snare for a chorus (Knock on Wood, Let's Stay Together).
- No ghost notes written.
- Green Onions: the ride in quarters with a rimshot backbeat, at 136.
- Try a Little Tenderness: a cross-stick on every beat, then the build.

The tab of Let's Stay Together writes no floor tom. The record's pattern
takes the floor tom, and so the hat's gaps on 2 and 4, from Sperrazza, and
says so.

**Kit.** The accounts do not agree, and none is dated:

- **Drummer Cafe:** a black Rogers (20-inch bass drum, 8x12 tom, 16x16 floor
  tom) with a 5x14 Rogers Powertone wood snare; Zildjian 14-inch hats, a
  16-inch crash and an 18-inch ride; a 5x14 Ludwig Acrolite live in the
  1960s. "To dampen his snare drum, Jackson always used his wallet", and he
  "never changed the drumheads unless one broke".
- **American Songwriter (McDonough, 2016):** "a Rogers kit mostly, and a
  chrome-plated Ludwig Supraphonic 400 snare". Taping a wallet to the head is
  told as the Memphis trick. Stax had a small drum booth and few mics (a KM-84
  on the snare from up to eight inches, one overhead, perhaps an RE-20 on the
  bass drum), so there is little room on the records.
- **Wikipedia:** "combinations of Ludwig and Rogers drums and Zildjian
  cymbals". Two museum kits survive: a Ludwig with a Rogers Powertone from Stax,
  and a Rogers with a Ludwig Acrolite from Hi. Cropper recalled a grey pearl
  Rogers floor tom in the mix-and-match Stax kit (Jim Payne, _Give the Drummer
  Some!_).
- **The Monterey film:** a white-wrapped kit, chrome, one rack tom and a floor
  tom, a script "R" on the bass drum's head, three cymbals.

**Devices (schema 1.5).** None found. A `devices_search` is recorded instead.
It read:

- The ten human tabs above, and two machine tabs (Soul Limbo, Melting Pot) for
  leads only.
- Bishop's two transcriptions (text only).
- Sperrazza, Modern Drummer, Drummer Cafe, Doerschuk, the Hall of Fame page.

No Drumeo, MusicRadar or Rhythm lesson on his parts was found. The leads that
did not hold:

- **Crosscut Saw's "blues rhumba":** rimshot accents and the kick follow the
  riff inside one bar. That is a figure, with no second pulse.
- **Over Easy's sixteenth-note triplets and sextuplets:** a busier
  subdivision in a build, not a cross pulse.
- **The "delayed backbeat":** placement and accent, not displacement on the
  grid.
- **Soul Limbo's calypso and Melting Pot's funk:** read only in machine tabs:
  a plain backbeat, and a sixteenth-note bar.

**What the style encodes.**

- **Feel:** straight eighths. Swing 0 to a slight lilt (about 52%), not
  measured. The snare set a hair behind (Dunn's "wait on him"; the Midnight Hour
  "delayed backbeat"). The `feel` block should push the snare later than the
  kick and hats, as `soul`'s "Deep pocket" does.
- **Ghosts:** `ghostBias` low, about 0.1 to 0.15. The tabs have none, and the
  writers say "deceptively simple". Ghosts belong to the builds (Over Easy), so
  they come only in a song that has one.
- **Hat and ride:** eighths on a closed hat, even. A ride in quarters for the
  organ tunes (Green Onions), or in eighths for a lift. The hat foot on 2 and 4
  under a ride.
- **Snare:** 2 and 4, strong and even, a rimshot on the organ tunes. Four on
  the snare for a chorus. A cross-stick on every beat for a slow verse. The
  floor tom doubling the backbeat on the Hi ballads.
- **Kick:** 1 and 3 with the "and" of 3. With the bass line through the bar
  on the uptempo songs. One bass drum.
- **Fills:** rare (`fillChance` low, `midFills` near zero): short, at section
  ends, on the snare, or the kick alone. Crashes few, on section downbeats
  only.
- **Kit:** a dry, damped 1960s kit with a fat, short snare (the wallet), a
  20-inch kick, and little room. No freely licensed samples of his sound were
  found (Reverb's Stax pack is commercial). The style plays `funkSoul`: SM
  Drums' 1960s Ludwig with Frankensnare's fat, short 13-inch snare, as
  Purdie, Stubblefield and Starks do. `smdrums` keeps a ringing snare, which he
  damped, and `sixties` adds room that Stax's booth did not have. The
  likeness's kit is white gloss with chrome, as at Monterey.

**The songs.**

| Song                             | Year | Tempo (quarter)                                                                                         | Meter                                                          | What defines it                                                                                                                                            | Source of the bars                                                                               |
| -------------------------------- | ---- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Green Onions                     | 1962 | 136 (tab); 136.0 (record autocorrelation), 136.9 beat-tracked; length matches (173 s)                   | 4/4 in sextuplets (the band swings; the cymbal plays quarters) | ride quarters, a rimshot on 2 and 4, the kick on the swung "and" of 2; the hat foot alone for four bars; no fills                                          | Songsterr 27314 (human), checked against 4065458 (human) and 3487 (human)                        |
| I've Been Loving You Too Long    | 1965 | 74 (tab's quarter); record dotted quarter 50.7 = quarter 76                                             | 12/8                                                           | hats on every eighth, the snare on pulses 2 and 4, bars of snare triplets, a climax of crashes and snare runs                                              | Songsterr 16945 (human); the record's form from its loudness (36 bars to the tab's 30)           |
| In the Midnight Hour             | 1965 | 112 (tab); 112.4 (record); 70 bars (tab) against the record's fade at about 64                          | 4/4                                                            | the delayed backbeat (Dunn, Cropper, Wexler's Jerk); ride eighths, kick on 1, 3 and its "and"; the crash pushed onto the "and" of 4; a hat-foot horn break | Songsterr 15438 (human, no markers)                                                              |
| I Can't Turn You Loose           | 1965 | 136 (tab, too fast); 126–129 (record autocorrelation), 126.9 beat-tracked; 82 bars against the tab's 88 | 4/4                                                            | the snare roll in; ride eighths over the kick on 1 and 3; the stop on every "and"; the roll under the ride                                                 | Songsterr 49631 (human, no markers)                                                              |
| Hold On, I'm Comin'              | 1966 | 105 (tab); 107.7 (record), 106.8 beat-tracked; 69 bars match bar for bar                                | 4/4                                                            | eighth hats, the kick on the "a"s of 2 and 4 under Dunn's bass, 63 identical bars; the horn fanfare over the kick in eighths                               | Songsterr 52670 (human)                                                                          |
| Try a Little Tenderness          | 1966 | 104 (tab); record accelerates 97.5 → 101 → 103 → 106–108; length matches (221 s against 228)            | 4/4                                                            | the hat foot on 3; the cross-stick on every beat, no kick; the snare on every beat with the kick off the beat as it builds                                 | Songsterr 17176 (human)                                                                          |
| Soul Man                         | 1967 | 113 (tab); 112.4 (record); 73 bars (the tab leaves out a verse and chorus)                              | 4/4                                                            | the intro on the bell with the kick on 2 and 4; the kick on the "a"s in the verse and the "and"s in the chorus; stabs with the band                        | Songsterr 388766 (human); the third verse from the record                                        |
| (Sittin' On) The Dock of the Bay | 1968 | 104/105 (tabs); 103.4 (record); 68 bars against 67/70                                                   | 4/4                                                            | eighth hats, the kick on 1, 3 and its "and"; the kick on every "and" turning the chorus round; the snare in eighths ending the bridge                      | Songsterr 17070 (human), checked against 17021 (human)                                           |
| Hard to Handle                   | 1968 | 96 (tab); 97.5 (record), 96.1 beat-tracked; length matches (135 s against 137)                          | 4/4                                                            | one-hand sixteenths on the hats; the refrain's stop, ride bars and hits with a ruff                                                                        | Songsterr 16797 (human)                                                                          |
| Time Is Tight                    | 1969 | 136 (tab); 136.0 (record); length matches (194 s against 196)                                           | 4/4                                                            | eighth hats over four on the floor, then the kick on 1 and 3; stop-time choruses with crashes; the bell; the unison riff on snare and floor tom            | Songsterr 3496 (human), checked against 4001463 (human, bars 4–12) and the record's even eighths |
| Let's Stay Together              | 1971 | 102 (tab); 101.4 (record), 102.1 beat-tracked; length matches                                           | 4/4                                                            | Hi Records: eighth hats, the snare on every beat for the bridge, soft on 1 and 3 in the chorus; the intro on the bell; Grimes's congas left out            | Songsterr 24907 (human)                                                                          |

**Tried but not used.**

- **Not his records:**
  - Love and Happiness (1972) is Howard Grimes's. Salvation South; Grimes's memoir _Timekeeper_, read through a summary: "So, I played drums on that."
  - Tired of Being Alone (1971) is also Grimes's: "Howard's beat" (Salvation South).
  - Take Me to the River (1974) is also Grimes's.
- **No human tab** (only machine-made ones):
  - Otis Redding's Respect (232874);
  - Hip Hug-Her (3810947);
  - Melting Pot (642903);
  - Soul Limbo (4001640);
  - Hang 'em High (1700624);
  - Sam & Dave's I Thank You and When Something Is Wrong with My Baby.
- **Human tabs not used:**
  - My Girl (Otis Redding, 77920);
  - These Arms of Mine (597863): its 1962 drummer was not confirmed;
  - Soothe Me (5271533).
  - These were dropped to keep the eleven spread across Booker T., Otis, Sam & Dave, Pickett and Al Green; My Girl is the best candidate to add next.

**Arrangement.** Every song plays the record's sections in order within 32 slots and at most 32 distinct bars, intro to outro.

- Where a record's drums do not change between verse and chorus (Hold On, Green Onions), the sections say so rather than invent a difference.
- Stop bars and band hits that leave the 2 and 4 empty are sections of their own, never fills, because the critic wants a backbeat there.
- Drumless openings are not sections: Dock of the Bay, Try a Little Tenderness, Time Is Tight's first three bars.

**Still not modelled:** the late backbeat is a feel offset, not a grid
position. The floor tom's muffling and the wallet on the snare are the kit's
sound, not his. Howard Grimes's "gallop" on Let's Stay Together is a second
player.

**Sources** (in `sources/al-jackson-jr.json`):

- Wikipedia: _Al Jackson Jr._; _Booker T. & the M.G.'s_; _In the Midnight
  Hour_; _Green Onions_ and _Green Onions_ (album); _Otis Blue/Otis Redding
  Sings Soul_; _Complete & Unbelievable: The Otis Redding Dictionary of Soul_;
  _Born Under a Bad Sign_; _Soul Man_ (song); _Time Is Tight_; _Melting Pot_
  (Booker T album); _Let's Stay Together_ (Al Green album and song); _Shake!
  Otis at Monterey_; _Southern soul_.
- Memphis Music Hall of Fame, _Al Jackson Jr._ (quoting Booker T. Jones,
  Willie Mitchell to _Drum!_, Duck Dunn, Al Green to _Rolling Stone_ 1973,
  Steve Cropper).
- Modern Drummer, _Al Jackson_, 29 March 2010.
- Vinnie Sperrazza, _On Backbeats_, Chronicles, 8 August 2024 (quoting Ethan
  Iverson, _In Search of the Backbeat_, _The Nation_, August 2024).
- Robert Doerschuk, _Sam Moore Remembers Al Jackson Jr._, _Traps_, Spring 2007.
- Todd Bishop, Cruise Ship Drummer!: _Transcription: Al Jackson — Over Easy_
  (2013); _Groove o' the day: Al Jackson, Jr. — Crosscut Saw_ (2014).
- Drummer Cafe, _Al Jackson Jr._
- Andy McDonough, _Gearing Up: Inside The Stax Sound_, American Songwriter, 15
  July 2016.
- Alan Richard, _End of the Groove_, Salvation South, 4 March 2022; Allison
  Rapp, Howard Grimes obituary, Ultimate Classic Rock, 14 February 2022.
- Footage: Otis Redding at Monterey Pop, 17 June 1967 (Pennebaker; YouTube
  AqYWfxmAStU and NuJTUpJzLOw).
- Songsterr drum tabs:
  - human (`aiGenerated` false): 27314, 15438, 388766, 24907, 7846, 52670,
    3496, 17176, 881885, 17070;
  - machine, for leads only: 4001640, 642903.
- Not read: Jim Payne, _Give the Drummer Some!_; Rob Bowman, _Soulsville
  U.S.A._; Howard Grimes and Preston Lauterbach, _Timekeeper_.

## BA. Zigaboo Modeliste (2026-10-18)

The `zigaboo` style plays **songs** the way `downey` (AQ) and `baker` (T) do:
each New picks one of his records, and its tempo, meter and grooves come
with it. His record (`drummer-model/drummers/zigaboo-modeliste.json`, schema
1.5) is new, written from this section, with nine recordings,
`sources/zigaboo-modeliste.json`, and a new genre, `style:new-orleans-funk`.
No record named him before, under this id or any other. The catalogue's
`nolafunk` genre style already has "Zigaboo" in its hint; it is a genre, not
his style.

**Which records are his.** Joseph Modeliste was born on 28 December 1948 in
New Orleans and grew up in the 13th Ward, the eldest of six. His grandmother,
Lula Blouin, paid for his first kit, a three-piece (Wikipedia). A friend
named him Zigaboo at ten: "I was what you would call a jokester" (WWNO,
2018). As boys he and Cyril Neville "loved the drums so much, we'd practice
together", and he woodshedded for hours with George Porter Jr., whom KQED
calls his cousin (KQED, 2018).

He joined Art Neville's Hawketts, who had a regular gig at the Night Cap.
With Porter and Leo Nocentelli the band became the Neville Sounds, with a
French Quarter residency six nights a week: "We got tight just from
repetition" (Rhythm). Allen Toussaint heard them and hired them for the
studio, and then suggested they make their own record (Rhythm). The Meters
were formed in 1965 and were Toussaint's and Marshall Sehorn's house band
(Wikipedia, the Meters). "The original LP's by The Meters were all recorded
with Zigaboo at the drums" (zigaboo.com).

- **Josie, 1969–70:** _The Meters_ (May 1969: Sophisticated Cissy, Cissy
  Strut, Ease Back), _Look-Ka Py Py_ (December 1969), _Struttin'_ (1970).
  Instrumentals produced by Toussaint and Sehorn.
- **Reprise, 1972–77:** _Cabbage Alley_ (1972; he also plays cowbell, gourd
  and wood block), _Rejuvenation_ (1974; every song co-written by him, and
  he sings), _Fire on the Bayou_ (1975, Cyril Neville on congas), _Trick Bag_
  (1976), _New Directions_ (1977).
- **Sessions with the Meters:** Dr. John's _In the Right Place_ (1973) and
  _Desitively Bonnaroo_ (1974); Robert Palmer's _Sneakin' Sally Through the
  Alley_ (1974; the Meters on four tracks, Bernard Purdie on three);
  _The Wild Tchoupitoulas_ (1976). Lee Dorsey, Betty Harris, Labelle and Paul
  McCartney are named among the Meters' sessions; which tracks are his is not
  confirmed here, so they have no recordings.

The Meters opened for the Rolling Stones on their 1975 tour of the Americas
and their 1976 tour of Europe (Wikipedia, the Meters). The Nevilles left in
1977, and in 1979 he toured with Ron Wood's New Barbarians. Then he stopped
playing for a while over the band's legal settlement and moved to Los
Angeles, then to Oakland (Jambands, 2011; KQED). When the Meters reunited in
1989, Russell Batiste Jr. played drums. The four founders played together at
times from 2000 until 2017.

**How he played.** He learned by watching, and nobody taught him: "Nobody
wanted to teach me anything ... You had to go see other people play and
figure out how they fit into that universe" (KQED). The drummer he names is
Smokey Johnson: "He had this African feel about the way he played drums ...
he was so far more advanced than I was, I could only take bits and pieces
from what he played" (Rhythm). Wikipedia and WWOZ add Bob French. KQED lists
the others he studied "pretty much on his own": Idris Muhammad, Earl Palmer,
James Black, John Boudreaux and June Gardner. The older men he gigged with
"were into Coltrane, Ahmad Jamal, Clifford Brown and Max Roach ... before
you go into any other routine you had to play some jazz" (KQED). In
Modern Drummer (2013, through Wikipedia) he said: "Your biggest teachers were
those two things you got on the side of your head."

The parts were his own: "On about 98 percent of the songs that the Meters
played, I never had any instructions. I was never told what to play or how
to play it" (Modern Drummer, from his DrumChannel course). Of Cissy Strut:
"my concept would be to try to come up with something that there wasn't
anybody else doing. At the time I struck gold with the 'Cissy Strut' beat"
(Rhythm).

What others hear in it:

- **Two hands on the hi-hat.** "I found that I could give the hi-hat more
  justice when playing it with two hands instead of one. Guys with a lot of
  chops would rather [play] their hi-hat licks with one hand ... I tried to
  use the hi-hat with both hands in a more aggressive way to get more
  flavor" (Modern Drummer). Funklet: "Zigaboo used two hands on the hat when
  recording 'Cissy Strut.'" Stanton Moore's _Groove Alchemy_ says drummers
  "misinterpret" the beat by playing it one-handed (through the Boston
  Phoenix, 2010).
- **In the cracks.** Drumeo, after Moore: New Orleans funk is played "in
  between the cracks", between straight and swung, and "the only way to learn
  how to play this 'in between' feel is to simply listen to the master
  himself". Modern Drummer's 2013 sidebar: his grooves "fall in the cracks
  between straight and swung". DRUM! (Schlueter, 2012): "both active and laid
  back at once".
- **The attack.** Joe McEwen (Rolling Stone): "standard technique to the
  wind ... punching out rollicking ... rhythms with a stiff-armed attack".
  Tom Moon: "snappish drumming". Ted Drozdowski on _Look-Ka Py Py_: the drums
  "dry and up front".
- **Every bar different.** Bob Palmer (Rolling Stone, on _Cabbage Alley_):
  "more rhythmic variety to every bar than any American soul group has yet
  employed". Scott Amendola: "The way he danced around the two and four"
  (KQED). Christgau: his drumming is "the secret", "it's almost as if he's
  the lead".
- **Second line.** Rolling Stone's list (No. 18, 2016): "steeped in the
  second-line tradition ... a linear, almost melodic style of syncopation".
  Schlueter: "second-line clave was always implied in his syncopation",
  "linear fills were divided between the four limbs", "the unconventional
  relationship between his bass drum and snare on the turnarounds".
- **The line he ends.** Jack Stratton gave Toussaint a list, "Earl Palmer,
  Charlie Williams, John Boudreaux, Smokey Johnson, Zigaboo Modeliste".
  Toussaint answered: "most unique — and the biggest jump in it — I would
  say is Zigaboo" (Funklet).
- **Singing.** The Meters had no singer, and he wrote many of the lyrics, so
  he sang. He took the idea from Narada Michael Walden and Buddy Miles
  (OffBeat, 2015).

Who cites him: Mickey Hart studied _Desitively Bonnaroo_ "over and over just
to get the feeling that he lays down" ("in the world of the groove, he
rules"). Amendola "practiced to Zig for countless hours and weeks and years"
(both KQED). A Stanton Moore biography says Moore "absorbed" his work
(Qobuz), and Moore's book teaches his grooves. Hip-hop sampled the Meters'
drums for decades: Run-DMC, N.W.A, Public Enemy, A Tribe Called Quest,
Beastie Boys, Cypress Hill, Ice Cube, Queen Latifah, and Eminem on
"Berserk". Amerie's "1 Thing" is built on his drums (zigaboo.com). No source
read has Questlove or Dave Grohl naming him as an influence.

**Kit.** No interview read names his make, sizes or cymbals in the Meters
years. The 1974 Soundstage broadcast ("Dr. John's New Orleans Swamp", WTTW
Chicago) shows the following:

- Two rack toms and the bass drum in a dark red-brown wood-grain finish.
- A mismatched floor tom in a silver-white swirl.
- A chrome snare and chrome hardware.
- A large ride on his right, a crash high on his left, set up right-handed.

A forum poster noticed the same "white satin swirl mismatched concert tom"
in other footage. That is not evidence. In later years he endorsed DW,
Sabian and Vic Firth (Wikipedia).

**Devices (schema 1.5).** One holds: a **timeline**, the 3-2 son clave
implied in the groove. Three teachers describe it:

- Drumeo: on Fire on the Bayou, "The bass drum pattern and hi-hat accents in
  this beat outline the first part of the 3:2 son clave".
- Moore: the Cissy Strut beat is "3-2 clave-based".
- Schlueter: "second-line clave was always implied".

None of their notation could be read: Drumeo's images no longer load, Moore's
book was read through a review, and Schlueter's transcription is an image.
Funklet's Cissy Strut grids do not put the clave on any one voice. The
device is `likely`, and a `devices_search` records what was read. The leads
that did not hold:

- Drumeo's "rhythmic displacement" describes the genre, and its
  displaced-backbeat groove is not credited to him.
- The turnarounds and Cissy Strut's varied B section move figures inside
  the bar, with no second pulse.
- The linear fills are orchestration, not a device.

**What the style encodes.**

- **Feel:** sixteenths with a slight lilt, between straight and swung (a
  swing ratio of about 0.54–0.56; Funklet plays all four of its grids with a
  slight swing). Not a shuffle. Second-line songs (Hey Pocky A-Way, about 171
  on Drumeo's count) are faster, with the accents in the lead hand and flams.
- **Ghosts:** `ghostBias` high, about 1.2–1.3, like `nolafunk` (1.25).
  Funklet's grids use two of their four levels for quiet strokes: on the
  two-handed hat in Cissy Strut, and on the snare in Chug-A-Lug and
  Look-Ka Py Py.
- **Hat:** voiced differently in every song. Cissy Strut has the hands
  alternating on the hat, with ghosted strokes and accents off the beat.
  Look-Ka Py Py has eighths opened on the "and" of 3, and Chug-A-Lug pairs of
  sixteenths opened on the "and" of 4. In Cissy Strut's B section the hands
  leave the hat to 4 and its "and", and the foot closes it elsewhere.
- **Kick and snare:** the kick phrased with Porter's bass on the "e"s and
  "a"s, not a pulse. The snare answers it rather than marking time: in
  Cissy Strut on 2, 4 and the "and" of 4; in Look-Ka Py Py on the "e" of 1,
  on 2 and its "a", and on 3, its "and" and the "and" of 4. A high
  `displace`, so the backbeat moves or doubles.
- **Variation:** no two bars of a phrase alike (Bob Palmer, Amendola, the
  B section). `midFills` high and fills short: linear, one limb at a time,
  kick-snare turnarounds at the end of a phrase rather than tom runs.
- **Kit:** dry, close and up front, with a tight snappy snare, bright hats
  and a short kick. No freely licensed samples of his sound exist (the
  Meters' masters are not free). `funkSoul` (SM Drums' Ludwig with
  Frankensnare's 13-inch snare, so the ghosts speak) is the default, as for
  Stubblefield, Starks, Purdie and `nolafunk`. `london`, Gogodze's damped
  drums with the snare sped up, fits the dry, snappish Josie records (Cissy
  Strut, Look-Ka Py Py) better. The likeness's kit and what the 3D kit cannot
  show are in the likeness notes.

**Patterns in the record.** Four, all `approximation`, `draft`, from Jack
Stratton's Funklet grids, read from the machine's `vals` (four velocity
levels; 1–2 written as ghosts) and `mods` (an opened hat on a stroke, the
foot on a step the hands leave):

- Cissy Strut, the second A section (87).
- Cissy Strut, the first two of the B section's eight bars (91), marked
  improvised.
- Look-Ka Py Py, "Zig's second phrase" (88).
- Chug Chug Chug-A-Lug, Pt. I (89), the 1972 single on _Cabbage Alley_'s
  reissue.

Hey Pocky A-Way, Fire on the Bayou and his linear fills are
`licks_described`, waiting for a transcription that can be read.

**The songs.**

| Song                   | Year | Tempo (quarter)                                                                | Meter | What defines it                                                                                                   | Source of the bars                                                                  |
| ---------------------- | ---- | ------------------------------------------------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Cissy Strut            | 1969 | 90 (tabs); 89.5 (record, beat-tracked); 66 bars at 90 against 68.5 to the fade | 4/4   | two hands on the hats under the riff; the drum break, hats shut but for the open "4 and"; dotted-eighth snares    | Songsterr 3940844, 43288, 552645 (all human); Funklet (Stratton) A and b-section    |
| Look-Ka Py Py          | 1969 | 88 (Bishop, Funklet); 87.4 (record); the AI tab's 174 is double                | 4/4   | the snare on the "e" of 1, 2, the "a" of 2, 3, the "and" of 4; hat open on the "and" of 3                         | Bishop (pdxdrummer, 2016) and Funklet (human); form from Songsterr 2357597 (**AI**) |
| Funky Miracle          | 1969 | 97 (tab), 96 (Bishop); 96.0 (record); 58 bars against 58.5                     | 4/4   | hats open on 2 and 4; the snare running off the 1; crash hits; stop time with snare breaks                        | Songsterr 2977284 (human); Bishop                                                   |
| Little Old Money Maker | 1969 | 104 (tab), 107 (Bishop); 104.9 (record); 70 bars against 70                    | 4/4   | kick and snare in turn, the hat opened on the "e" of 2 and closed by the foot; a verse in eighths; unison eighths | Bishop; Songsterr 4932929 (human, drums "regenerated")                              |
| Just Kissed My Baby    | 1974 | 84 (tab); 85.2 (record); 101 bars against 100                                  | 4/4   | ghosts round a backbeat on 2 and 4; kick on the "and"s and every other 1; the hats opening from bar 29            | Songsterr 837283 (human; 2703604 a copy)                                            |
| People Say             | 1974 | 102 (tab); 100.7 (record); 134 bars against 133                                | 4/4   | half-swung; the backbeat moved to the "and" of 4, the foot on 4; the chorus on the crash                          | Bishop (Cruise Ship Drummer, 2012); form and chorus from Songsterr 1725904 (**AI**) |
| Jungle Man             | 1974 | 88 (tab); 88.8 (record); 74 bars against 75                                    | 4/4   | half-swung sixteenths on the hats, the snare on 4 alone; a chorus on 2 and 4                                      | Bishop (Cruise Ship Drummer, 2012); form and chorus from Songsterr 1725914 (**AI**) |
| Right Place Wrong Time | 1973 | 100 (tab); 100.4 (record); 74 bars against 72.5                                | 4/4   | a two-bar groove trading the backbeat on 4 for the hats; a bridge on four kicks; snare rolls                      | Songsterr 5775 (human)                                                              |

**Tried and dropped.**

- **Hey Pocky A-Way** (1974): the only tab (1725930, AI) writes kicks in dotted quarters and the snare in eighths, nothing like the record's groove; the one lesson found (Musicians Institute) describes it without notation.
- **Ease Back** (1969): two human tabs (3300252, 6012576; the first's drums "regenerated") written at 156, double the record's 77.8; which half of each pair of their bars is the record's downbeat could not be settled from the beat-tracked bands, so the bars cannot be placed.
- **Pungee** (1969): Bishop's groove fills fifteen of sixteen steps with kick or snare; the critic wants a quarter of the bar free.
- **Hand Clapping Song** (1970): the human tab (80630) is a percussion track ("Percussie"), not the drums.
- **Fire on the Bayou, Africa, Cardova, Chicken Strut, Sneakin' Sally Through the Alley** (Robert Palmer, 1974), **Working in the Coal Mine, Iko Iko**: only machine-made tabs, with no human transcription to check them against.
- **Sophisticated Cissy**: no tab or transcription found.

**Found on the way, not changed.**

- KQED is the only source read that calls Porter his cousin; the record's
  `family` edge is `likely`.
- The make of his kit is unsourced. The forum threads that guess (Ludwig,
  Gretsch) are guesses.
- _Look-Ka Py Py_ is dated 1969 (December) by its Wikipedia page and
  Funklet; the single charted in 1970.
- Drum! magazine's "50 Most Important Drummers of All Time" lists him
  (zigaboo.com); the list itself was not read.

Sources: Wikipedia —
[Zigaboo Modeliste](https://en.wikipedia.org/wiki/Zigaboo_Modeliste),
[The Meters](https://en.wikipedia.org/wiki/The_Meters),
[The Meters (album)](<https://en.wikipedia.org/wiki/The_Meters_(album)>),
[Cissy Strut](https://en.wikipedia.org/wiki/Cissy_Strut),
[Look-Ka Py Py](https://en.wikipedia.org/wiki/Look-Ka_Py_Py),
[Cabbage Alley](https://en.wikipedia.org/wiki/Cabbage_Alley),
[Rejuvenation](<https://en.wikipedia.org/wiki/Rejuvenation_(The_Meters_album)>),
[Fire on the Bayou](https://en.wikipedia.org/wiki/Fire_on_the_Bayou),
[In the Right Place](https://en.wikipedia.org/wiki/In_the_Right_Place),
[Desitively Bonnaroo](https://en.wikipedia.org/wiki/Desitively_Bonnaroo),
[Sneakin' Sally Through the Alley](https://en.wikipedia.org/wiki/Sneakin%27_Sally_Through_the_Alley),
[The Wild Tchoupitoulas](<https://en.wikipedia.org/wiki/The_Wild_Tchoupitoulas_(album)>);
[Rhythm, The Rhythm Interview (zigaboo.com reprint)](https://www.zigaboo.com/rhythm-magazine-the-rhythm-interview/);
[zigaboo.com biography](https://www.zigaboo.com/biography-joseph-zigaboo-modeliste/)
and [press biography](https://www.zigaboo.com/joseph-zigaboo-modeliste-bio/);
[Rolling Stone, 100 Greatest Drummers, No. 18 (zigaboo.com reprint)](https://www.zigaboo.com/rolling-stone-100-greatest-drummers-of-all-time/);
[Andrew Gilbert, KQED, 2018](https://www.kqed.org/arts/13847384/the-meters-zigaboo-modeliste-funk-luminary-celebrates-70-at-freight-salvage);
[WWOZ](https://www.wwoz.org/acts/zigaboo-modeliste);
[Nick Spitzer, WWNO American Routes, 2018](https://www.wwno.org/show/american-routes/2018-09-28/american-routes-shortcuts-zigaboo-modeliste);
[Modern Drummer, Zigaboo Modeliste on Cissy Strut](https://www.moderndrummer.com/article/zigaboo-modeliste-on-cissy-strut/);
[Modern Drummer, August 2013 cover story (standfirst)](https://www.moderndrummer.com/article/august-2013-zigaboo-modeliste/)
and [Zig's Signature Beats (standfirst)](https://www.moderndrummer.com/article/august-2013-zigs-signature-beats/);
[Brad Schlueter, DRUM!, 2012](https://drummagazine.com/zigaboo-modelistes-funk-workout/);
[Drumeo, The Ultimate Guide to Soul and Funk Drumming](https://www.drumeo.com/beat/the-ultimate-guide-to-soul-and-funk-drumming/);
Funklet (Jack Stratton):
[cissy-strut](https://goodhertz.com/funklet/cissy-strut),
[cissy-b](https://goodhertz.com/funklet/cissy-b),
[zig-look-ka](https://goodhertz.com/funklet/zig-look-ka),
[chug-chug-a-lug](https://goodhertz.com/funklet/chug-chug-a-lug)
and its machine script;
[Jon Garelick, Boston Phoenix, 2010](https://blog.thephoenix.com/Boston/music/108307-sonic-dna-stanton-moore-and-anthony-brown/);
[Stanton Moore, Qobuz biography](https://www.qobuz.com/gb-en/interpreter/stanton-moore/40189);
[Jambands, 2011](https://jambands.com/features/2011/10/19/a-new-life-for-zigaboo-modeliste/);
[Sam D'Arcangelo, OffBeat, 2015 (zigaboo.com reprint)](https://www.zigaboo.com/zigaboo-interview-offbeat/);
[New Barbarians (zigaboo.com)](https://www.zigaboo.com/new-barbarians/);
[Soundstage, Dr. John's New Orleans Swamp, 1974: the Meters' set](https://www.youtube.com/watch?v=p5IQ0y8wllk)
and [OffBeat on the taping](https://www.offbeat.com/news/video-new-orleans-swamp-dr-john-professor-longhair-meters-earl-king).

## BB. Questlove (2026-10-18)

The `questlove` style plays **songs** the way `downey` (AQ) does: each New
picks one of his records, and its tempo, meter and grooves come with it. His
record (`drummer-model/drummers/questlove.json`, schema 1.5) is new, written
from this section, with nine recordings and `sources/questlove.json`. Four
records already named him as a stub (Clyde Stubblefield, Jabo Starks and Tony
Allen `influenced` him; Yussef Dayes `cites_as_influence` him); the record
agrees with all four. It adds the genre `style:neo-soul`
(`styles/neo-soul.json`, a sub-genre of `rnb-soul`), which needs a
`GENRE_FAMILY` row: `'style:neo-soul': 'funk-soul'`.

**Which records are his.** Ahmir Khalib Thompson was born on 20 January 1971
in Philadelphia (Wikipedia). His father was Lee Andrews of the doo-wop group
Lee Andrews & the Hearts; his mother, Jacquelin, sang with Congress Alley. He
grew up on the road with them, running the lights at ten. At twelve he took
the drum chair in his father's band when its drummer broke an arm: "Well, you
know the show, you drum" (RBMA 2019). He played Radio City Music Hall with
them, and drummed for his father "from like 13 'till about 20-something"
(RBMA 2013). He founded the Roots with Tariq Trotter (Black Thought) in 1987,
while both were at the Philadelphia High School for the Creative and
Performing Arts (Wikipedia, The Roots).

He is the Roots' drummer on every album, from _Organix_ (1993) to the house
band records. The ones the record lists:

- _Do You Want More?!!!??!_ (DGC, 1995) and _Illadelph Halflife_ (1996).
- _Things Fall Apart_ (MCA, 1999), with "You Got Me" (the 2000 Grammy for Best
  Rap Performance by a Duo or Group) and "The Next Movement".
- _Phrenology_ (2002) and _How I Got Over_ (2010).
- _Dave Chappelle's Block Party_ (filmed 18 September 2004, released 2006),
  with the Roots as the day's house band.

With the Soulquarians at Electric Lady (D'Angelo, Erykah Badu, Common,
J Dilla, James Poyser, Q-Tip):

- D'Angelo's _Voodoo_ (Virgin, 25 January 2000): drums, four co-writes, and
  D'Angelo's "co-pilot". Most tracks were cut live to analog tape with no
  instrument overdubs; "Untitled (How Does It Feel)" is the exception
  (Wikipedia, Voodoo). He then assembled and directed the Soultronics for the
  Voodoo tour, from 1 March 2000.
- Common's _Like Water for Chocolate_ (MCA, 2000): executive producer, and
  drums on "Cold Blooded", "Geto Heaven Part Two" and "A Song for Assata".
  Karriem Riggins drums on track 16.

As a producer-drummer:

- Al Green's _Lay It Down_ (Blue Note, 2008), with James Poyser: drums on
  tracks 1 to 10.

The Roots have been the house band of _Late Night with Jimmy Fallon_ since 2
March 2009, and of _The Tonight Show_ since February 2014, with Questlove as
musical director. Badu's _Baduizm_ and _Mama's Gun_ and D'Angelo's _Black
Messiah_ (2014) have him on some tracks. Which tracks was not confirmed from
the credits, so the record has no recordings for them.

**How he played.** The first lesson was his father's. "People do not believe
this story, but my father's dream was for me to be a session drummer." "Keep
it in the pocket." "Even if he was wrong, he was still right." "I clocked in
my 10,000 hours as a kid, practicing" (RBMA 2013). His heroes were session
and soul drummers:

- **Steve Ferrone:** "my idol was a drummer named Steve Ferrone, from a band
  called The Average White Band", who "was actually from the Bernard Purdie
  school of drumming" (RBMA 2013).
- **James Gadson:** "one of my earlier drumming heroes, he used to drum for
  Bill Withers in the '70s" (RBMA 2013).
- **Bernard Purdie:** his father took him to hear Purdie explain "how he
  keeps food on the table": "The two and the four" (Lingan, _Backbeats_,
  2025).
- **The James Brown drummers:** he stands for "those drummers that you won't
  hear about in the Rock & Roll Hall of Fame", Purdie and Ferrone "and of
  course Stubblefield and Starks, but there's just a whole slew of cats from
  these independent mom-and-pop labels" (RBMA 2019). Of the two: "Jabo was
  the Beatles to Clyde's Stones. A clean shuffle drummer to Clyde's free-jazz
  left hand", and Starks was "a serious funk god" (uDiscover, quoting Rolling
  Stone and his tribute).
- **Tony Allen:** "one of my drumming idols: Tony Allen, Fela Kuti's
  drummer", on sitting in with him on Late Night (Yamaha All Access, c. 2010).

The early Roots were a band making sample-based hip-hop without samples. "We
knew we didn't want to sample, but we wanted to have the same gritty quality
you get from sample-based hip-hop" (Yamaha). Lingan: "His job was to
reverse-engineer a sampler, to play like a machine that was made to
replicate a human timekeeper ... The game was repetition, not improvisation."
Questlove on _Illadelph Halflife_: "I wanted to be the coldest, most
emotionless, just an absolute machine" (RBMA 2013). Later he called himself
"just a kind of super-metronome" (Slate 2013).

J Dilla changed that. On the Pharcyde, "it sounded like the kick drum was
played by like a drunk three-year-old" (RBMA 2013), and that moment "changed
everything" (RBMA 2019). "Dilla would program his drums non-quantized"
(Slate). "Now I got to undo all the education and all the hours of
preparation that I did" (RBMA 2013). On _Voodoo_, D'Angelo pushed him
further:

- "He wanted me to play as drunk and as slow and as dusted as I've ever
  played in my life."
- "I need you to keep the pocket but don't drag behind me, but play a little
  crooked" (Slate).
- "He wanted me to drag the beat, but then he'd drag the beat behind me"; "I
  want you to do it drunker than that" (RBMA 2013).

What came out is "this whole drunken-style-but-staying-on-beat thing", and
"most of my Voodoo stuff was just rimshot funk, not hitting the snare at all"
(RBMA 2013). Wikipedia notes double rimshots behind the beat on
"Greatdayndamornin' / Booty'", and calls "One Mo'Gin" a rocksteady rhythm.
Anne Danielsen measured "Left & Right": the drum kit and bass enter "around
50 (beats 1 and 3) to 80 (beats 2 and 4) ms" apart, 8 to 12% of a quarter at
92 bpm (Danielsen 2023). The part read does not say which layer is early.
Steve McPherson: the timing "can't be measured in beats or fractions of beats
in a meaningful way" (Wikipedia, Voodoo). On _Black Messiah_ he did "the
exact opposite of what I did on Voodoo": "The Charade" with the snare wires
off and the drums low and tribal (RBMA 2019).

For Al Green he played the Hi Records drummers: "for me I morphed into Al
Jackson, like I lowered the shit out of my snare ... Howard Grimes, yeah, and
Al Jackson" (RBMA 2019). That is the only Al Jackson Jr. source read. It is in
the record as an influence for one record, not as formative.

On fills and density: "Breakbeat drumming is just taking all the elements
away, and keeping it meat and potatoes" (RBMA 2019). On the click: "I would
use a click track sometimes. It was, like, half sampling myself, half using
click tracks" (RBMA 2013).

**Sound.** He is a sound man first. "I consider myself more of an engineer
than a musician or producer ... I'd drum for an hour with one mic combo, then
another, then another" (Yamaha). "I did every conceivable experiment until I
felt my drums were dirty and cold", including a blanket over the snare (RBMA
2013). Joe Tarsia told him to tape his drums, and to "stop playing so damn
hard" (RBMA 2019). On _Do You Want More_'s "Distortion to Static": "You
wouldn't know that Questlove's kit has any toms at all. His snare cracks
without any vibrations, and his bass drum is tuned low enough to feel
speaker-bumping" (Lingan). _Phrenology_ is Lingan's "masterpiece": "drums
boom like Led Zeppelin's John Bonham busting out of a broken boom box". By
_How I Got Over_ (2010): "extremely vintage sounding. They're dirty, gritty,
and raw—real gutbucket funk ... the drums just aren't that loud" on the '70s
records he loves (Yamaha).

**Kit.**

- **The 2000s, Yamaha.** "I was the guinea pig for the SubKick. They made it
  for me back during the D'Angelo tour in 2000." On Late Night he played "one
  of the first Yamaha drum sets ever made ... just like it was in 1967",
  Beech Customs "because they help me get an old, raggedy sound", and his
  favourite snare, the David Garibaldi signature, "because I get such a great
  snap out of it" (Yamaha). Equipboard, from DrummerWorld and undated, has a
  Maple Custom Absolute: a 22x18 bass drum, 14x5.5 and 14x3.5 brass snares,
  10 and 12-inch toms, 16 and 18-inch floor toms.
- **From 2013, Ludwig.** His signature Breakbeats kit: the retail four-piece
  is a 14x16 bass drum, 7x10 tom, 13x13 floor tom and 5x14 wood snare. His own
  kit at the Met has a 20-inch bass drum (read through a search summary
  only).
- **Cymbals:** Zildjian. A 24-inch K Light ride, 14-inch K Constantinople
  hats, a 20-inch FX Oriental "Crash of Doom" (Equipboard, from photos).
- **Heads and sticks:** Remo Ambassadors. A Vic Firth signature stick, long
  and as light as he could make it, held with mainly three fingers
  (Equipboard).
- **An open lead:** a 1976 Ludwig Cream Vistalite he says he used on "this
  record". Equipboard does not name the record, so it is an open question
  whether it is _Voodoo_.

At Chappelle's Block Party (2004) the kit is a gloss black snare with chrome
lugs, a polished metal drum to his right, chrome stands and brass-coloured
cymbals (the footage).

**Devices (schema 1.5).** None found. A `devices_search` is recorded instead.
It read:

- Five human Songsterr tabs (You Got Me, The Seed 2.0, Chicken Grease, One
  Mo Gin, Untitled), bar by bar.
- Both Red Bull Music Academy interviews, Slate, Yamaha All Access, Lingan.
- Danielsen 2023.
- The Wikipedia pages.

No Modern Drummer, Drumeo or MusicRadar transcription of his parts was found.
The leads that did not hold:

- **Danielsen's 50 to 80 ms:** microtiming, two placements of one pulse, with
  no second pulse against it.
- **The swung sixteenth pairs on the kick** (Chicken Grease, One Mo'Gin):
  swing inside a 4/4 bar.
- **Untitled:** tabbed in 3/4 and 6/8, a reading of a slow 12/8. That is
  meter.
- **You Got Me's outro:** sixteenths split between snare and kick, a linear
  burst with no cross pulse.

**What the style should encode.**

- **Feel:** laid back. The snare set late (a positive offset, larger than
  the kick's), the placement uneven bar to bar but the pocket kept: Dilla's
  "drunk" kick, D'Angelo's "a little crooked". The Voodoo songs swing their
  sixteenths: the tabs of Chicken Grease and One Mo'Gin sit on a sextuplet
  grid, a full 2:1 for the kick's pairs. The Roots songs (You Got Me, The
  Seed 2.0) are tabbed straight; give them a light lilt, not a shuffle.
  None of this was measured; the songs agent should beat-track the records.
- **Ghosts:** `ghostBias` low, about 0.3. The tabs read have almost none.
  The playing is a loop of hat, backbeat and a moving kick, not ghosted
  sixteenths. The catalogue's `neosoul` style ("the ghosts do the talking")
  is the wrong model for him.
- **Snare:** 2 and 4 every bar, often as a rimshot (Voodoo) or a cross-stick
  (One Mo'Gin); no backbeat displacement.
- **Kick:** the voice that moves. The hat and backbeat are fixed while the
  kick changes bar to bar, in swung sixteenth pairs on the Voodoo songs.
- **Hat:** closed and quiet, sixteenths (You Got Me) or eighths (Seed,
  Chicken Grease); opened in eighths only for a loud section.
- **Fills:** rare and short ("meat and potatoes"); few crashes, one at a
  section's start. No tom runs: "You wouldn't know that Questlove's kit has
  any toms at all".
- **Kit:** dry, dead and close, like a sampled break: a snare that cracks
  without ring, a low kick, quiet hats, no room. No freely licensed samples
  of his own kit were found. KIT.md recommends `teatowel` ("Damped and dead",
  Gogodze) for the Voodoo songs and a re-tuned Gogodze row (snare up, kick
  down) for the Roots songs, against `boomBap`.

**The songs.**

| Song                  | Year | Tempo (quarter)                                                                                   | Meter                            | What defines it                                                                                                                                                              | Source of the bars                                                                                                       |
| --------------------- | ---- | ------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Proceed               | 1995 | 88 (tab); 88.2 (record autocorrelation); the tab's 94 bars end at 254 s, in the record's fade     | 4/4, light 16th swing            | Eighth hats; a two-bar kick (1, the a of 3, the and of 4 / off the 1). A bar of snare on every beat to turn. No crash, no ghost. Malik's verse on the hat foot.              | Songsterr 6329751 (human, no markers); order from synced lyrics                                                          |
| Mellow My Man         | 1995 | 91 (tab); 92.0 (record); 105 bars run 274 s of 278                                                | 4/4, swung 16ths ("Swing")       | Hats opened on the and of 1, the foot on 2; three kicks after 3 on one foot (`heelToe`); the mute; a verse on the ride with the foot on 2 and 4                              | Roland, "Behind the Beat: Mellow My Man" (2024), five human transcriptions; form from Songsterr 7080018 (machine)        |
| You Got Me            | 1999 | 81 (tabs); 81.0 (record); drop-out at bars 70–72 and the end at 266 s match                       | 4/4; outro double time (×2, 162) | Pinched 16th hats; the kick off the 1 every other bar; a drum'n'bass outro on the snare, then the cross-stick                                                                | Songsterr 2370523 (machine drums under a human bass edit), checked against 1021604 (machine, same engine) and the record |
| Left & Right          | 2000 | 93 (tab); 92.1 (record)                                                                           | 4/4                              | One kick for the song (1, a of 2, 3, a of 4); the raps on the cross-stick, the choruses on the snare; shaker breakdowns with the kick on 1 and 3                             | Songsterr 6141822 (human)                                                                                                |
| Chicken Grease        | 2000 | 91 (tab); 91.1 (record); 102 bars run 269 s of 279                                                | 4/4 in sextuplets (`4/4-6`)      | Straight eighth hats over a kick in swung 16ths (1, a of 2, 3, its and, e of 4, and of 4) for 64 bars; the outro's kick off the 1                                            | Songsterr 1173485 (human, markers)                                                                                       |
| Spanish Joint         | 2000 | 112 (tab); 111.6 (record)                                                                         | 4/4                              | A baiao kick under the cross-stick on the and of 2 and 4; the chorus's cross-stick on a 1, e 2, a 3, and 4; stops with the horns; a 16th-hat breakdown; open hats to the end | Songsterr 432801 (human, markers; congas, cabasa and handclap left out)                                                  |
| Feel Like Makin' Love | 2000 | 89 (tabs); 87.5 (record); 140 bars run 384 s, the record's length                                 | 4/4                              | Eighth hats, kick on 1 and 3 with an and every other bar, 129 bars without a fill; the band drops to the hats; a vamp                                                        | Songsterr 2784934 rev 4153954 (a human clean-up of a machine tab), checked against 2416343 (machine)                     |
| The Seed (2.0)        | 2002 | 112 (tab); 111.2 (record); the human tab drops 8 outro bars, the machine tab has the record's 123 | 4/4                              | Rock eighths, kick 1, and of 2, 3, and of 4; "Break it down" in unison eighths; open hats to the end                                                                         | Songsterr 661137 rev 6635510 (human correction of a machine tab), checked against 671732 (machine)                       |

**Tried but not used.** See STYLE-BASE.md for each reason.

- **Not his drums:** Untitled (How Does It Feel) and Devil's Pie (Voodoo); The Light (Common); Bag Lady and Didn't Cha Know (_Mama's Gun_).
- **Credits in conflict or silent:** One Mo'Gin, Otherside of the Game, Dynamite!.
- **Only an unusable machine tab:** Playa Playa, The Next Movement, the _Mama's Gun_ tracks he plays, and Here I Come, Rising Down and How I Got Over.
- **No tab at all:** Game Theory, Undun.

**Patterns in the record.** Four tab patterns and one archetype. The four are
`approximation`, `draft`, from human Songsterr tabs (`aiGenerated` false
through the meta API):

- You Got Me (2370523): the two commonest bars, sixteenths on the hat.
- The Seed 2.0 (661137): eighths, the kick on 1, the "and" of 2, 3 and the
  "and" of 4.
- Chicken Grease (1173485): six per beat, the kick's swung sixteenth pairs.
- One Mo'Gin (1774031): six per beat, cross-stick on 2 and 4.

The archetype is the Voodoo pocket: a rimshot backbeat with guessed late
offsets, marked `inferred`.

### Sources

- Questlove, Wikipedia: https://en.wikipedia.org/wiki/Questlove
- The Roots, Wikipedia: https://en.wikipedia.org/wiki/The_Roots
- Questlove, Red Bull Music Academy lecture, New York, 2013 (transcript):
  https://www.redbullmusicacademy.com/lectures/questlove-new-york-2013
- J-Zone, "Give The Drummer Some: Questlove", RBMA Daily, 6 February 2019:
  https://daily.redbullmusicacademy.com/2019/02/give-the-drummer-some-questlove
- Jason King, Slate, 15 February 2013:
  https://www.slate.com/articles/arts/music_box/2013/02/behind_the_scenes_with_questlove_and_d_angelo_on_voodoo.html
- "Hip-Hop House Band", Yamaha All Access issue 20 (c. 2010):
  https://www.yamaha.com/allaccess/artists/pdf/issue20-questlove.pdf
- John Lingan, _Backbeats_ (2025), excerpt, Philadelphia Magazine, 14
  November 2025:
  https://www.phillymag.com/news/2025/11/14/questlove-roots-backbeats-excerpt/
- Anne Danielsen, "Shaping the Beat Bin in Computer-Based Grooves", in
  _Performing Time_ (OUP, 2023):
  https://academic.oup.com/book/56186/chapter/443057660
- uDiscover Music, "Jabo Starks dies at 79":
  https://www.udiscovermusic.com/news/john-jabo-starks-dies-79/
- Voodoo, Things Fall Apart, Like Water for Chocolate, Lay It Down and Neo
  soul on Wikipedia.
- Equipboard, Questlove: https://equipboard.com/pros/questlove; Ludwig
  Breakbeats listing: https://www.zzounds.com/item--LUDLC179XX
- Songsterr tabs 2370523, 661137, 1173485, 1774031, 4347114
  (https://www.songsterr.com/a/wa/song?id=…).
- Dave Chappelle's Block Party, "You Got Me" (YouTube nGRzizq4WWg).

## BC. Levon Helm (2026-10-18)

The `levonhelm` style plays **songs**, as `downey` (AQ) and `collins` (X) do:
each New picks one of his records, and its tempo, meter and grooves come
with it. His record (`drummer-model/drummers/levon-helm.json`, schema 1.5)
is new, written from this section. It comes with six recordings and
`sources/levon-helm.json`. Three files already named `drummer:levon-helm`:
Adrienne Davies's record, twice (she cites him), and the `americana` style
(its key drummer). The record agrees with both.

**Which records are his.** Mark Lavon Helm was born on 26 May 1940 in Elaine,
Arkansas. He grew up in Turkey Scratch, near Marvell, and died in New York on
19 April 2012 of throat cancer (Wikipedia). Hawkins's Canadian bandmates
mispronounced "Lavon", and it became "Levon".

He met Ronnie Hawkins at seventeen at the West Helena Delta Supper Club,
where Hawkins had no drummer (Encyclopedia of Arkansas). He joined the Hawks,
full time after high school in 1958, and went with them to Toronto. By 1961
the band had Rick Danko, Richard Manuel, Robbie Robertson and Garth Hudson.
They left Hawkins in late 1963 and became Levon and the Hawks. Helm had top
billing partly because he was the one in the musicians' union.

The Hawks backed Bob Dylan on his 1965 electric tour. Helm left after "a
little more than one month" (Wikipedia, The Band). Dylan's fans "booed at the
sight of my red sparkle ... drum kit" (Helm, Razor 2004). Bobby Gregg, Sandy
Konikoff and Mickey Jones followed him. He was back in Woodstock by October 1967.

He is the drummer on every Band album from _Music from Big Pink_ (1968) to
_Islands_ (1977), with two exceptions:

- Richard Manuel "would occasionally assume the drummer's stool when Helm
  played mandolin or guitar": Rag Mama Rag and Evangeline. His "loose,
  improvisatory drumming style was notably different from Helm's taut,
  soul-influenced approach" (Wikipedia, Richard Manuel).
- Manuel is credited with drums on _Rock of Ages_ and _Northern Lights_ too,
  on songs not named.

Helm sings lead on The Weight, Rag Mama Rag, The Night They Drove Old Dixie
Down, Up on Cripple Creek, Jemima Surrender and Ophelia (the album pages).
_The Last Waltz_ was filmed at Winterland on 25 November 1976. When its tapes
were overdubbed, John Simon says, "Only Levon's part was retained in its
entirety" (Wikipedia).

After the Band:

- The RCO All-Stars (1977) and solo records, and films (Coal Miner's
  Daughter, The Right Stuff).
- The Band without Robertson from 1983 to _Jubilation_ (1998). Randy
  Ciarlante played a second kit.
- Ringo Starr's first All-Starr Band (1989), as one of three drummers with
  Starr and Jim Keltner.
- Throat cancer in the late 1990s, and the Barn Burners.
- The Midnight Rambles in his Woodstock barn, singing again from 2005.
- _Dirt Farmer_ (2007), _Electric Dirt_ (2009) and _Ramble at the Ryman_
  (2011), each a Grammy.

**How he played.** He learned in "drum-poor" Arkansas. Only two people he
knew had a kit, Peck Curtis and Bubba Stewart, and he borrowed both (OffBeat
1998).

- **Peck Curtis.** James "Peck" Curtis drummed for Sonny Boy Williamson on
  KFFA's King Biscuit Time. "My first big hero was Pat [Peck] Curtis, with
  Sonny Boy". Curtis left the King Biscuit kit at the station, where the boy
  could use it (Razor 2004).
- **The Rabbit's Foot Minstrels.** F. S. Walcott's show "had a left-handed
  drummer with three tom-toms that was real good": "between their
  left-handed drummer and James 'Peck' Curtis ... I knew exactly where I
  wanted to sit."
- **His teachers.** Bubba Stewart, drummer in Ralph DeJarnette's band in a
  Marvell pool hall, "continued to coach me on playing the drums until he
  could pass me over to Jack Nance and Tommy 'Porkchop' Markham", two of
  Conway Twitty's drummers (Razor 2004).
- **On record.** "Listening to Earl [Palmer], and the Memphis records with
  D.J. Fontana" (OffBeat 1998). "D.J.'s drum parts changed Elvis, Scotty and
  Bill's good rockin' trio into one of the top notch rock'n' roll bands in
  the Memphis area." He names W.S. Holland, Carl Perkins's drummer, among
  those he learned from (Razor 2004).
- **Earl Palmer.** "Earl Palmer has got to be the greatest rock and roll
  drummer that's still around"; the Keep a Knockin' kick-off is "one of the
  greatest hooks in music" (OffBeat 1998).

His own account of where he lives (Classic Drummer, Girouard, 2008):
"Most of the things I play certainly have a street-beat-march to them. So,
it's between that and watching Peck Curtis play with Sonny Boy Williamson
and The King Biscuit Boys. That march and that shuffle is where I live most
of the time." Asked about playing behind the beat, he gives it to the
rhythm section: "Roger Hawkins and David Hood or Al Jackson and Duck Dunn
from Memphis".

From Earl Palmer he took the shuffle against the straight eighth (Modern
Drummer, Micallef and Steve Jordan, 2008): "if the song is in a street-beat
kind of a feel ... I'll sing in more of a shuffle rhythm. Then you get the
two rubbing against each other. That's what Earl taught us ... He would play
the shuffle and the straight 8th ... I kind of copied from Earl, I'm sure."
He sings "off those two beats mainly", the downbeat and the backbeat. In
his Homespun video (1992, read through automatic captions) he says:

- "if you center the bass drum more onto the one it'll steady the music ...
  You can still have lots of fun and be very loose with ... either hand".
- With two drummers, "one of us sort of holds down the triplicate feel" and
  "leaves the other one clear to go".

**The sound.**

- **Wood and skin.** "That wooden-sounding backbeat, with lots of stick and
  skin in the sound, not much metal" (OffBeat). "I love that wooden rim ...
  it actually knocks better if it's wood" (Classic Drummer).
- **Deadened.** His engineer Justin Guip, on _Dirt Farmer_: "Just when I
  thought they were dead, Levon would deaden them a little more ... He likes
  a deader sound." His own advice: "put some tape on them ... choke them
  down" (Homespun).
- **Loose heads on The Weight.** Robertson "had him loosen the heads so when
  he hit them, the sound would slide to another tonality" (WSJ 2016, via
  Scott K. Fish).
- **The tom hit.** Jim Keltner: "others like Levon who played one hit on the
  tom-tom, and it would go right through your body" (Drum Channel, 2025).

**Grip.** "In the old days I used traditional grip about 80% of the time. I
developed a habit of being overly busy with my left hand." After the cancer,
playing blues with the Barn Burners, "the backbeat became much more
important. By changing my grip to mallet-style it basically simplified
everything" (Classic Drummer).

**What others say.**

- Steve Jordan: "Levon plays the song. He was born with this beautiful
  rhythm." Micallef: "Perhaps the greatest singer/drummer to ever play a
  backbeat" (Modern Drummer 2008).
- Jon Carroll: "the only drummer who can make you cry".
- "Session drummer Jim Keltner admits to borrowing several of Helm's
  techniques" (Wikipedia, The Band).
- Springsteen on his drumming: "You can't replicate it."

**Kit.**

- **Before the Band.** Bubba Stewart lent him a white oyster pearl
  Slingerland for a Hawks gig. He played a red sparkle kit on Dylan's 1965
  tour (Razor).
- **The Band.** Old wood-hoop Ludwigs and a Gretsch. Which is on which
  record is a forum's recollection, not his.
- **The Last Waltz, on film.** A black pearl kit mottled grey, chrome, one
  tom on the bass drum and a floor tom, ride, crashes and hats. A Songsterr
  transcriber names it a Gretsch round badge in Black Diamond Pearl. The
  soundstage scenes are said to be the wood-hoop Ludwig.
- **2007 (Guip).** A 20x14 kick with a pillow and a ported head; a 14x6
  snare with a Zero Ring and tape; a 12x8 rack tom and a 14x14 floor, taped
  down.
- **2007 cymbals.** All A Zildjian: a riveted 17-inch medium crash on his
  left, a riveted 20-inch crash ride and an 18-inch thin crash on his right,
  14-inch New Beat hats. Guip: "a very distinctive bell tone".
- **The rest.** A cowbell, "the funny bone of the drum set", and a small
  "Jimmy Reed" crash-splash beside it. A 1960s Ludwig Speed King pedal.
  Slingerland, Yamaha before; Pro-Mark sticks, Blasticks and Hot Rods.

**Devices (schema 1.5).** None found. A `devices_search` is recorded instead.
It read:

- Six human Songsterr tabs bar by bar: The Weight, the Last Waltz Weight,
  Cripple Creek, Ophelia and both Dixies.
- Two machine tabs, looked at only.
- Classic Drummer (whole), the Modern Drummer preview, OffBeat and Razor.
- The Homespun clips.
- The Wikipedia pages.

No Drumeo, MusicRadar, Rhythm or Modern Drummer transcription of his parts
was found. The leads that did not hold:

- **"The shuffle against the straight 8th":** a shuffle in the voice, or
  in a second drummer, against straight eighths on the kit. That is a feel
  between players; no tab shows a cross pulse on the drums.
- **Dixie's bars of snare triplets:** the beat divided in three, not three
  against two.
- **Cripple Creek's kick and snare on the "a"s:** syncopation inside the
  bar.

**What the style encodes.**

- **Feel:** slow to mid tempos (The Weight and Cripple Creek at 72, Ophelia
  92, Dixie a half-time 127). Straight eighths on the hats; Cripple Creek in
  loose sixteenths. The backbeat fat and a little late, but nothing
  measured says how late. Swing at zero on the straight songs; a shuffle
  only where a record has one, on a triplet grid (he teaches the shuffle on
  Short Fat Fanny and Hang Up My Rock and Roll Shoes in the Homespun video,
  but no tab of either was read).
- **Ghosts:** `ghostBias` low, about 0.1. The tabs have almost no ghost notes;
  Cripple Creek's drags into the backbeat are the exception.
- **The kick:** centred on 1 and 3, pushed onto the "a" of 1 and 3 (Cripple
  Creek) or the "a" of 3 and "and" of 4 (Ophelia).
- **Chorus lifts:** the snare on every beat (The Weight's chorus, then the
  stop), or a bar of snare triplets and a press roll (Dixie), more than
  crashes.
- **Half time:** the snare on 3 and the hats in quarters for the ballads
  (Dixie's verses); the hat opened on 1 and closed by the foot on 3.
- **Fills:** short, at phrase ends, a tom or two and the snare; no long
  runs. `midFills` low.
- **Cowbell:** where a song has room for one.
- **Kit:** no freely licensed samples of his sound were found. The style
  plays `teatowel`: Gogodze's damped kick and toms played slower, no room,
  Big Rusty's cymbals, as Ringo's later songs and `gadd` do. A live song
  (Rock of Ages, The Last Waltz) may take `sixties`.
- **The likeness:** The Last Waltz, 25 November 1976. The film shows him
  lean, with wavy brown hair swept back to the collar, a short full beard,
  and a violet satin-sheened shirt open at its long collar points, the
  sleeves pushed up, no headphones. The kit is black oyster pearl with
  chrome.

**Patterns in the record.** Six, all `approximation`, `draft`, from human
Songsterr tabs (`aiGenerated` false through the meta API):

- The Weight's verse (1115507, bar 3, 48 of 83; the Last Waltz tab 23439
  agrees).
- The Weight's chorus and stop (1115507, bars 14 and 15).
- Up on Cripple Creek (922237, bar 3, the commonest of 59 distinct bars; the
  record autocorrelates at 143.6, its eighths, so a quarter of 72).
- Dixie's half-time verse (2285, bar 3).
- Dixie's chorus march, on a triplet grid (2285, bars 24 and 26).
- Ophelia's verse (751889, bar 6; the tempo is the tab's).

**The songs.**

| Song                                | Year                    | Tempo (quarter)                                                        | Meter                                   | What defines it                                                                                                                             | Source of the bars                                                                                       |
| ----------------------------------- | ----------------------- | ---------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| The Weight                          | 1968                    | 72 (tab); record 71.8 autocorrelated, 72.0 beat-tracked; 82 bars match | 4/4, straight                           | eighths, kick 1 and 3; the floor-tom pickup; the chorus's snare on every beat, the stop and a bar of silence; the last chorus on the "and"s | Songsterr 1115507 (human, rev 5279014)                                                                   |
| Chest Fever                         | 1968                    | 105 (tab, too fast); record 100.07 beat-tracked, steady                | 4/4, straight                           | eighths under the organ riff; the snare on every beat in the chorus; the riff on the toms over the kick in quarters; a kick-only interlude  | Songsterr 259774 (machine-made), checked against 5738687 (machine-made, live 1976) and the record's form |
| We Can Talk                         | 1968                    | 102–104 (tab); record 103.0                                            | 4/4, straight                           | kick 1, 3, its "and" and the "and" of 4; snare on every beat in the chorus; dotted-quarter hits with the band; a stop bar                   | Songsterr 5926066 (human)                                                                                |
| Across the Great Divide             | 1969                    | 108 (tab); record 110.3; 79 bars match                                 | 4/4 in sextuplets (swung)               | swung eighths; a crash and snare triplets ending every four bars; snare and kick triplets in turn                                           | Songsterr 259751 (human retranscription over a machine first rev)                                        |
| Up on Cripple Creek                 | 1969                    | 72 (tab); record 72.04; 81 bars match                                  | 4/4, straight sixteenths                | kick 1, the "a" of 1, 3 and its "a"; snare on 2, 4 and their "a"s; a break bar with the band; the 2/4 outro                                 | Songsterr 922237 (human-edited, over a machine first rev)                                                |
| The Night They Drove Old Dixie Down | 1969                    | 127 (tab); record 126.96, felt at 63.8; 111 bars match                 | 4/4 in sextuplets (triplets), half-time | quarter hats, kick 1, snare 3; a march chorus of snare triplets and rolls; crash on 3 for the bells                                         | Songsterr 2285 (human), compared with 773394 and 444780 (human)                                          |
| Don't Do It                         | 1971 (Rock of Ages run) | 80 (tab); audio 78.55                                                  | 4/4, straight                           | Cripple Creek's kin: kick 1, its "e" and "a", the "e" of 2, 3, its "and"; snare 2, 4 and the "a"s; horn choruses on the ride with tom bars  | Songsterr 6679108 (human), Academy of Music 1971 audio                                                   |
| Ophelia                             | 1975                    | 92 (tab); record 92.5; 81 bars match                                   | 4/4, straight                           | eighths, kick 1, 3, its "a" and the "and" of 4; the hit with the band on the "and" of 2                                                     | Songsterr 751889 (machine-made drums under human chord edits), checked against 613773 (machine-made)     |

**Tried but not used.**

- **Not his drumming:** Rag Mama Rag (Manuel on drums, Helm on mandolin).
- **Machine-made only, and not consistent with each other or the record:**
  - King Harvest (259755: 96 against the record's 107.5);
  - Stage Fright (3196754; 3453040 is empty);
  - The Shape I'm In (1397350, 5929836, 688058 disagree);
  - Life Is a Carnival (259750, a single machine tab; its length matches the record's 88 bars at 91, but nothing checks the bars).
- **Human but mechanical:** It Makes No Difference (Last Waltz, 3743075 and its copy 6507486), written in identical five-bar blocks.
- **Late records:** When I Go Away (_Electric Dirt_, 2529867, machine-made, single); nothing human for _Dirt Farmer_ or _Electric Dirt_.

**Not sourced, and left out.**

- **Jimmy Van Eaton**, Jerry Lee Lewis's drummer, is named as an early
  influence by an IMDb / Apple TV biography that could not be read.
- **Ringo Starr as an influence:** only a narrated YouTube video (Studio
  Number Six, 2025), whose quotes cite nothing, says so. Starr is in the
  record as a co-drummer (the Last Waltz finale, the All-Starr Band) and a
  friend who "later hired" him.
- **The Midnight Rambles' first year.**

Sources: Wikipedia —
[Levon Helm](https://en.wikipedia.org/wiki/Levon_Helm) (read to character
100,000 of 120,677),
[The Band](https://en.wikipedia.org/wiki/The_Band) (to 100,000 of 178,948),
[The Band (album)](<https://en.wikipedia.org/wiki/The_Band_(album)>),
[Music from Big Pink](https://en.wikipedia.org/wiki/Music_from_Big_Pink),
[Rock of Ages](<https://en.wikipedia.org/wiki/Rock_of_Ages_(The_Band_album)>),
[Northern Lights – Southern Cross](https://en.wikipedia.org/wiki/Northern_Lights_%E2%80%93_Southern_Cross),
[The Last Waltz](https://en.wikipedia.org/wiki/The_Last_Waltz),
[Dirt Farmer](https://en.wikipedia.org/wiki/Dirt_Farmer),
[Richard Manuel](https://en.wikipedia.org/wiki/Richard_Manuel),
[Ringo Starr & His All-Starr Band](https://en.wikipedia.org/wiki/Ringo_Starr_%26_His_All-Starr_Band);
[Bryan Rogers, Levon Helm, Encyclopedia of Arkansas](https://encyclopediaofarkansas.net/entries/levon-helm-628/);
[Bob Girouard, Levon Helm: The Classic Drummer Interview, Classic Drummer, 2008](https://theband.hiof.no/articles/CLASSIC_DRUMMER_8_08.pdf);
[Scott Jordan, Backtalk with Levon Helm, OffBeat, December 1998](http://theband.hiof.no/articles/interview_levon_offbeat_dec98.html);
[Levon Helm, The Music, Razor, February 2004](https://theband.hiof.no/articles/the_music_razor_february_2004.html);
[Ken Micallef, The Great Levon Helm, Modern Drummer, 2008](https://www.moderndrummer.com/2008/02/levon-helm/);
Homespun, Levon Helm on Drums and Drumming (1992): clips
[HXCt-yAv7Ns](https://www.youtube.com/watch?v=HXCt-yAv7Ns),
[1E0dm6YIZEw](https://www.youtube.com/watch?v=1E0dm6YIZEw),
[gRekuHyIgXU](https://www.youtube.com/watch?v=gRekuHyIgXU),
[dyrAwfc-FPg](https://www.youtube.com/watch?v=dyrAwfc-FPg) (automatic captions);
[Inside Jim Keltner's Drumming Style, Drum Channel, 2025](https://www.drumchannel.com/weekly-drops/inside-jim-keltners-drumming-style/);
[Marc Myers, The Weight, Wall Street Journal, 2016, via Scott K. Fish](https://scottkfish.com/2016/12/06/levons-drums-sliding-to-a-different-tonality/);
[Vintage Drum Forum, Levon Helm snare on Last Waltz](https://www.vintagedrumforum.com/thread/levon-helm-snare-on-last-waltz.27450);
The Last Waltz (Scorsese, 1978), the
[Up on Cripple Creek](https://www.youtube.com/watch?v=JsdUzN20Sow) and
[Dixie](https://www.youtube.com/watch?v=6dDbnwQlCek) scenes;
Songsterr tabs 1115507, 23439, 922237, 751889, 2285, 773394
(`https://www.songsterr.com/api/meta/<id>` for the `aiGenerated` flag).

## BD. Dave Grohl (2026-10-18)

The `grohl` style plays **songs**, as `downey` (AQ) and `collins` (X) do:
each New picks one of his records, and its tempo, meter and grooves come
with it. His record (`drummer-model/drummers/dave-grohl.json`, schema 1.5) is
new. It is written from this section, with ten recordings and
`sources/dave-grohl.json`. Five records already named him as a stub, and the
record agrees with each of them:

- Bonham `influenced` him.
- Ringo is `cited_by` him.
- Klek de Poitrine's band is `cited_by` him.
- Zigaboo's open questions and the Nameless Ghoul's sources mention him.

Two genres are new, `style:grunge` and `style:hardcore-punk`. Both need a
row in `GENRE_FAMILY`, and both belong in **rock**, where `style:punk` is.

**Which records are his.** David Eric Grohl was born on 14 January 1969 in
Warren, Ohio, and grew up in Springfield, Virginia (Wikipedia). He played
guitar first, from 12, and taught himself. He moved to drums when his band
Freak Baby lost its bassist and became Mission Impossible. At 17 he joined
the D.C. hardcore band Scream in place of Kent Stax, and lied about his age to
do it. He played on _No More Censorship_ (1988, RAS), _Live at Van Hall_
(1988), _Fumble_ (recorded before the 1990 break-up, released 1993) and
_Your Choice Live Series Vol. 10_ (Wikipedia, Scream).

Scream broke up mid-tour in 1990. Buzz Osborne of the Melvins told him that
Nirvana needed a drummer. Nirvana's drummers before him were:

- Aaron Burckhard.
- Dale Crover, who played the first demos (1988) and filled in on the August
  1990 tour.
- Dave Foster.
- Chad Channing, 1988 to 1990.
- Dan Peters of Mudhoney, on the _Sliver_ single.

Grohl joined in September 1990. Novoselic: "We knew in two minutes that he
was the right drummer" (Wikipedia, Nirvana). He is the drummer on these
Nirvana recordings:

- _Nevermind_: Sound City, May 1991, produced by Butch Vig, mixed by Andy
  Wallace. "Polly" keeps Channing's cymbals from the 1990 Smart Studios demo.
- _In Utero_: Pachyderm, February 1993, produced by Steve Albini.
- _MTV Unplugged in New York_ (1993).
- The live films _Live at the Paramount_ (Seattle, 31 October 1991; released 2011) and _Live at Reading_ (30 August 1992; released 2009).

_Bleach_ is Channing's record, with Crover on some of it.

After Nirvana he played drums for others as well as fronting his own band:

- **Foo Fighters** (1995): every instrument his except Greg Dulli's guitar on
  "X-Static", recorded in a week at Robert Lang Studios.
- **_The Colour and the Shape_** (1997): he re-recorded William Goldsmith's
  parts on all but two tracks. Goldsmith's drums stay on "Doll" and on the
  slow intro of "Up in Arms".
- **Queens of the Stone Age, _Songs for the Deaf_** (2002): he replaced Gene
  Trautmann, who plays on tracks 1 and 8. He toured with the band to July
  2002, when Joey Castillo replaced him.
- **Probot** (2004): all the drums.
- **Them Crooked Vultures** (2009), with Josh Homme and John Paul Jones.
- **Guest drums:** Killing Joke (2003), six tracks of Nine Inch Nails' _With
  Teeth_ (2005), Tenacious D, and Ghost's _If You Have Ghost_ (2013)
  (Wikipedia, each page).

**How he played.** He learned without a kit:

> "I learned to play on pillows on my bedroom floor. So I had a pair of
> marching drumsticks that were oversized ... playing on pillows that I would
> set up in the configuration of a drum set and listening to these really fast
> punk rock records. So it's almost like running in the sand."
> (Fresh Air, NPR, 2021)

On a real kit, "I would just destroy the thing". He had one lesson. The
teacher, a jazz drummer, told him he held the sticks backwards. He kept doing
it: "For loud, brash, dissonant, distorted punk rock, it absolutely works ...
if I hold it like a hammer, that might work ... I still do it to this day"
(Fresh Air). Live Nirvana's equipment guide has the same from his tech:
"held them upside-down".

His influences, in his own words:

- **Rush:** _2112_, at eight, "made me want to become a drummer" (Wikipedia).
- **John Bonham:** "I became obsessed with John Bonham: what he played and
  why". He tattooed Bonham's three rings on his arm "with a fucking sewing
  needle and some ink" (Guardian, 2021, through Ultimate Classic Rock).
- **Earl Hudson** (Bad Brains): "I would learn all of [his] licks verbatim"
  (Modern Drummer, quoted in Rolling Stone's 100 Greatest Drummers, 2016).
  Also: "there's little fills here and there that I took from Earl" on
  _Nevermind_ (_Bad Brains: A Band in D.C._, 2012, via Okayplayer).
- **Reed Mullin** (Corrosion of Conformity): "my drumming hero when I was 15
  or 16". Mullin: "he followed me around and learned how I did triplets and
  stuff like that. It took him, like, two weeks". The two met over a shared
  love of Chuck Biscuits (Rolling Stone, 2015).
- **The Beatles:** "The Beatles were my first teacher" (Fresh Air), on
  guitar.

Nirvana changed his playing. In his words: "if my drumming in the punk rock
band was 250 beats per minute, my drumming for Nirvana - I sometimes liken it
to, like, disco drumming and funk drumming. You know, a lot of those drum
riffs that I used in some of those songs come from some of my disco drumming
heroes" (Fresh Air). He named those heroes:

- "I pulled so much stuff from The Gap Band and Cameo, and Tony Thompson, on
  every one of those songs" (to Pharrell, _From Cradle to Stage_, through
  MusicRadar).
- "The big disco flam ... I told Tony Thompson that ... 'I've been ripping
  you off my whole life.' And he goes, 'I know.'"
- Of "Smells Like Teen Spirit": "a dance beat - the verses are like
  Cameo-disco drumming and the choruses are heavy-metal Sixties go-go"
  (Rolling Stone, 2001, through Okayplayer).
- The flam itself: "rather than hitting at the same time ... you stutter
  them", and "it comes from, like, the Gap Band or Cameo or Power Station"
  (Fresh Air).

He wanted the parts simple: "I didn't throw a bunch of drum fills in there. I
tried to keep it as simple as possible. That was kind of an unspoken rule. We
almost wanted them to be like children's songs" (_Classic Albums: Nevermind_,
through MusicRadar). His test of a great drummer is that "people that don't
play the drums air drum along to that song" (Fresh Air).

Stuart Williams's analysis of the Teen Spirit part (MusicRadar, 2026) hears
these things in it:

- The intro's flams have "groups of even 16th-notes between" them.
- In the chorus, "a foot-heavy first beat of every bar — accented with dual
  cymbal crashes", with Grohl "laying back beforehand".
- In the verse, the snare on 2 and 4, the kick in eighths with the bass, and
  the hats "closed spare a lift on '4&' every fourth time round".
- A machine-gun run of sixteenths on the snare into the chorus, with
  "Ringo-style continuity of the bass drum underneath".

Others on him:

- **Kurt Cobain**, on the tape he sent Vig: "We've got a new drummer, his
  name is Dave, he's the best drummer in the world!"
- **Butch Vig:** "one of the most kick-ass drummers in rock and roll".
- **Nick Oliveri** (Rolling Stone, 2002): "He's got a signature beat, and I
  don't know many drummers that have that, you know, the 'Teen Spirit' beat.
  That's Dave Grohl's beat as far as I'm concerned."
- **Rolling Stone (2016)** groups him with Matt Cameron as "grunge-era
  Zeppelin-ites". It ranks him 27th; his own entry was not read.

He in turn named other drummers. Of Dale Crover: "you can tell when Dale is
playing in Nirvana because he's the best drummer in the world". Of Matt
Cameron: "Nobody played drums like Matt." He told Homme that Jon Theodore
"really blows me away" (all in Rolling Stone, 2016).

**Kit.** The kits come from Live Nirvana's equipment guide (a fan archive
drawn from techs and photos), MusicRadar and Drumeo:

- **1990–91:** a Tama Granstar in Silky Yellow with a natural Superstar
  snare. It was "demolished at the Cabaret Metro, Chicago, 10/12/91".
- **_Nevermind_:** a Granstar ("not Artstar II, as commonly reported"), with
  gear hired from Drum Doctors. The hire included a Ludwig Black Beauty and
  a Tama Mastercraft Bell Brass snare (MusicRadar).
- **From late October 1991:** a Granstar II in Fire Storm Red with a black
  Artwood snare. This is the kit in the Paramount film: red gloss, chrome,
  one rack tom on the bass drum and one floor tom.
- **The _In Utero_ tour:** an Artstar II in Piano Black.

The sizes were the same throughout: a 16x24 bass drum, a 14x15 rack tom, a
16x18 floor tom and an 8x14 snare. The cymbals were Zildjian A Mediums only:

- 15-inch hats.
- 18 and 20-inch crashes.
- A 22-inch ride.
- With Scream, a 28-inch Paiste ride/crash.

The heads were these:

- Snare: Aquarian Hi-Energy, "the only brand that wouldn't break".
- Toms: Remo Pinstripes over clear Ambassadors, changed before every show.
- Kick: a clear Powerstroke II, with a black Ambassador front head that has a
  6-inch hole off centre.

The hardware was Tama Titan, with a Sonor hi-hat stand, "the only one tall
enough". He used a DW 5000 Turbo pedal, and three went on tour. His sticks
were Regal Tip 5B or Aquarian 2B.

Later kits and sessions:

- **Them Crooked Vultures:** a DW Jazz Series kit with a 9x13 rack tom,
  16x16 and 16x18 floor toms, a 16x20 gong drum and a 6.5x14 aluminium snare
  (Drumeo). He endorses DW.
- **Studio rooms:** at Sound City, Vig put two U87s 15–18 feet back in the
  room. At Pachyderm, Albini used about 30 mics and the room's own reverb,
  and recorded the drums for "Very Ape" and "Tourette's" in a kitchen.
- **_Songs for the Deaf_:** the drums were tracked in a small dead booth for
  a "tight, focused, punchy and kind of claustrophobic" sound. The cymbals
  were recorded in a second pass over a dummy snare and padded toms.

**Devices (schema 1.5).** None found. A `devices_search` is recorded instead.
It read:

- Ten human Songsterr tabs, bar by bar.
- MusicRadar's analysis.
- Fresh Air.
- Okayplayer.
- The equipment guide.
- The Wikipedia pages.

Every tab is in 4/4 on a straight sixteenth grid. The leads that did not hold:

- **The Teen Spirit chorus:** its kick (1, its "a", 3, its "and" and "a",
  the "and" of 4) follows the riff inside one bar, with no cross pulse.
- **The skank beat in "Territorial Pissings":** an off-beat kick, not a
  displacement.
- **"Scentless Apprentice":** its opening bars have notes off the sixteenth
  grid, probably triplets. They are unread, and a triplet in a 4/4 fill is
  not a device anyway.

**What the style should encode.**

- **Feel:** straight, no swing, on the beat. Tempos run from 78 (In Bloom)
  through 117 (Teen Spirit) and the 160s (Breed, This Is a Call, No One
  Knows) to 184 (Territorial Pissings).
- **Ghosts:** `ghostBias` very low, about 0.05. The tabs have essentially no
  ghost notes, and he plays everything loud ("ff").
- **Loud and quiet:** the verse is spare, on a closed hat in eighths with the
  kick on 1, its "and", 3 and its "and", or on Lithium's ride with a
  cross-stick. The chorus is on open hats or a crash in quarters, with the
  kick following the riff.
- **The Teen Spirit chorus figure:** the kick and two crashes on 1, open hats
  on 2, 3 and 4, and the snare on 2, its "a" and the "e" of 3. This is his
  signature.
- **Fills, in his habit:** few and short, at phrase ends ("I didn't throw a
  bunch of drum fills in there"). The ones he does play:
  - A big flam on the snare, with two crashes, to start a section.
  - A run of sixteenths on the snare into the chorus, with the kick keeping
    eighths underneath.
  - The floor tom with the snare at a phrase end (Breed).
  - A stop, then the crash.
- **Punk songs:** crash in quarters over a punk beat, or the skank (the snare
  on every beat, the kick on every "and"). Some disco: four on the floor
  under No One Knows.
- **Avoid:** swing, ghosted sixteenths, busy tom fills in a verse, double
  kick.
- **Kit:** no freely licensed samples of his sound exist. Only paid
  _Songs for the Deaf_ trigger packs and unlicensed stems of the record turn
  up. The closest pack kit is `bigrusty`: a damped 24-inch kick, a wooden
  snare, played hard, "thick, a bit rough, and with a big wash of cymbal",
  for the Nirvana songs. `bigRoom`, the same kit in a big room with rimshots,
  suits the _In Utero_ and live songs, and `studioRock` (tight, dry, close)
  suits _Songs for the Deaf_. No re-tuned row is needed. The likeness's kit
  is a red gloss Granstar II with chrome hardware (the Paramount, 1991).

**Patterns in the record.** There are twelve bars or bar pairs, all
`approximation` and `draft`, from human Songsterr tabs (`aiGenerated` false
through the meta API):

- Smells Like Teen Spirit, the chorus and the verse (269).
- In Bloom (295).
- Lithium, the verse and the chorus (34).
- Breed (10779).
- Territorial Pissings (12084).
- Scentless Apprentice (14636).
- Heart-Shaped Box (31).
- No One Knows (17108).
- This Is a Call (35563).
- Everlong (86505).

Each pattern keeps the tab's most common bar or bars.

**The songs.**

All bars come from human Songsterr tabs: `aiGenerated` is false through the meta API for every
tab used. Every tempo was beat-tracked from the record (`beats.py --tempo` and the
autocorrelation in `acf.py`) and checked against songbpm and against the tab's length at its
marked tempo.

| Song                    | Year | Tempo (quarter)                                                      | Meter                         | What defines it                                                                                                                                                                                    | Source of the bars                                      |
| ----------------------- | ---- | -------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Smells Like Teen Spirit | 1991 | 117 (tab; record 117.0; songbpm 117; 299 s against 301)              | 4/4                           | the chorus beat: crash on 1, open hat on 2-3-4, snare on 2, the "a" of 2 and the "e" of 3; closed-hat verses; crashes on every beat, then every eighth in the outro; rolls in                      | Songsterr 269 (human)                                   |
| In Bloom                | 1991 | 78 (tab; record 156.4 at the eighth, lag 77.5; 255 s against 254)    | 4/4                           | sixteenths on the hats, the kick doubled on 1 and 3; the riff with toms; off-beat open eighths in the chorus; a 32nd roll (written as buzz eighths)                                                | Songsterr 295 (human)                                   |
| Come as You Are         | 1991 | 120 (tab; record 120.4; songbpm 120)                                 | 4/4                           | the ride and a two-bar kick figure; refrains of snare sixteenths (ghosts and accents) over kick eighths; crashes on every beat in the solo                                                         | Songsterr 14 (human)                                    |
| Lithium                 | 1991 | 123 (tab; record 123.2; songbpm 123; 256 s against 257)              | 4/4                           | ride and cross-stick verse, the kick on the 1 then the "and" of 4; a four-bar ride chorus; the open-hat bridge                                                                                     | Songsterr 34 (human)                                    |
| Breed                   | 1991 | 159 (tab; record 159.0; songbpm 158; 183 s against 183)              | 4/4                           | the snare-sixteenth intro (in threes), open hats on the beat, ride chorus with crash pushes, the snare and floor tom together on 4                                                                 | Songsterr 10779 (human), checked against 443945 (human) |
| Territorial Pissings    | 1991 | 184 (tab; record 184.1; songbpm 183; 143 s against 143)              | 4/4                           | flat-out: open hats on the beat, crashes on every beat, the snare and crash on every beat with the kick on the "and"s to end                                                                       | Songsterr 12084 (human)                                 |
| Heart-Shaped Box        | 1993 | 100 (tab; record 99.7; songbpm 203 = ×2; 282 s against 282)          | 4/4                           | hats in eighths, cross-sticks on 2-3-4 every other bar; crashes and the toms with the kick in the chorus; rimshots and floor tom in eighths                                                        | Songsterr 31 (human)                                    |
| Scentless Apprentice    | 1993 | 85 (tab 83–87; record 85.0; songbpm 171 = ×2; 226 s against 228)     | 4/4                           | the open-and-closed hat intro; the kick in fours from 3 (single pedal; written with `doubleKick`); the ride-bell verse bar; crashes in eighths                                                     | Songsterr 14636 (human)                                 |
| This Is a Call          | 1995 | 162 (tab; record 162.4; songbpm 163; 231 s against 233)              | 4/4                           | open hats on the beat, a pushed snare in the crash chorus, flams across the bar in the bridge, then the punk beat                                                                                  | Songsterr 35563 (human)                                 |
| Monkey Wrench           | 1997 | 175 (tab; record 174.2; songbpm 174; 231 s against 231)              | 4/4                           | open eighths; a crash on 2 in the verse; crashes on the "and"s in the chorus; a bar of snare sixteenths (in threes) into every part                                                                | Songsterr 7754 (human)                                  |
| No One Knows            | 2002 | 170 (tab 169; record 170.2; songbpm 171, its 4:14 = 180 bars at 170) | 4/4 in sextuplets (a shuffle) | quarters on everything in the verse; the chorus's crashes over the kick on 1 and the swung "and"; eighth-note-triplet fills on the snare and toms; the kick in quarter-note triplets in the bridge | Songsterr 17108 (human); OnlineDrummer for the shuffle  |

**Tried and dropped:**

- **A Song for the Dead (2002).** Songsterr 78648 (human, rev 8590771) and 898427 (human): 205–219 with a half-time middle at 103–109.
  - The fast riff's bars carry sixteenths (pickups after 4, rolls). At 210 that is past the sixteenth grid's ceiling of 190.
  - In eighths (`4/4-8`) the sixteenths are lost.
  - The middle could be a ×½ section, but the fast parts could not be written honestly.
- **Everlong (1997).** Songsterr 86505 (human, rev 9490336), 158.
  - Its verse is sixteenths on the hats (`1111.1111111.111`). `playableBpm` holds any run of four notes to ten a second, which is 150 in sixteenths, so the song could not play at its record's tempo.
  - Thinning the hats would remove the song's defining part.
- **My Hero (1997).** Songsterr 7421 (human), 155.
  - The snare sits on 3 alone (a half-time feel), with drags and kicks on 32nd positions.
  - songbpm lists only a live version (134), so the tempo could not be confirmed.
  - Not attempted further.
- **Go with the Flow (2002).** Gene Trautmann drums on it (Wikipedia; the tab's own track name), so it is excluded.
- **Not attempted:** Drain You (11402), Aneurysm (14355, whose tempo map wanders 125–152: probably a live or BBC version), Serve the Servants (14003), Milk It (14626), New Fang (Them Crooked Vultures, 59897), and MTV Unplugged (brushes). Eleven songs were enough to span 1991–2002.
- **Later Foo Fighters records** (from _There Is Nothing Left to Lose_, 1999) have Taylor Hawkins on drums and are excluded. _But Here We Are_ (2023), which Grohl drummed, has no tab in the search results read.

**Sources.**

- Wikipedia: Dave Grohl; Nirvana; Nevermind; In Utero; Live at Reading; Live
  at the Paramount (video); Foo Fighters (album); The Colour and the Shape;
  Songs for the Deaf; Probot (album); Them Crooked Vultures (album); Scream
  (band). Accessed 2026-10-18.
- Terry Gross, "Dave Grohl retraces his life-affirming path from Nirvana to
  Foo Fighters", Fresh Air, NPR, 31 December 2021 (transcript).
- Stuart Williams, "'We've got a new drummer, his name is Dave, he's the best
  drummer in the world!': How Dave Grohl delivered the incredible Smells Like
  Teen Spirit drum track", MusicRadar, 3 July 2026.
- Kory Grow, "Dave Grohl, Reed Mullin Explain Punk Supergroup Teenage Time
  Killers", Rolling Stone, 28 July 2015.
- Hank Shteamer, "Reed Mullin, Corrosion of Conformity Drummer, Dead at 53",
  Rolling Stone, 28 January 2020.
- "100 Greatest Drummers of All Time", Rolling Stone, 31 March 2016 (entries
  100–51: Earl Hudson, Dale Crover, Matt Cameron, Jon Theodore, Jimmy
  Chamberlin).
- Elijah C. Watson, "How Black Drummers Influenced Nirvana's 'Smells Like
  Teen Spirit'", Okayplayer, 24 September 2021.
- Martin Kielty, "Dave Grohl Was 'Branded for Life' by John Bonham
  Obsession", Ultimate Classic Rock, 17 January 2021 (quoting the Guardian).
- Joe Rosenthal, "QOTSA Enjoying Life With Dave", Rolling Stone, 3 May 2002.
- Live Nirvana, Equipment Guide: Dave Grohl (livenirvana.com/equipment/dave.php).
- Drumeo, "Dave Grohl: Everything You Need To Know About The Nicest Guy In
  Rock" (updated 1 November 2023).
- Nirvana, _Live at the Paramount_ (16 mm film, 31 October 1991; YouTube
  GcuFXCKcMac and tGc8jL4dzao), watched for the kit and the likeness.
- Songsterr human drum tabs 269, 295, 34, 10779, 12084, 14636, 31, 17108,
  35563 and 86505.

## BE. Neil Peart (2026-10-18)

The `peart` style plays **songs** the way `baker` (T), `collins` (X) and
`downey` (AQ) do: each New picks one of his records, and its tempo, meter and
grooves come with it. His record (`drummer-model/drummers/neil-peart.json`,
schema 1.5) is new, written from this section, with twelve Rush recordings,
_Burning for Buddy_ and `sources/neil-peart.json`. Nine records already named
him as a stub (`drummer:neil-peart`), and the new one agrees with all of them:

- **Buddy Rich:** `covered_by` him, for Burning for Buddy.
- **Phil Collins:** `cited_by` him.
- **John Bonham:** `influenced` him.
- **Brian Downey:** `admired` him.
- **Cited as an influence by Tomas Haake, Joey Jordison, Antonio Sanchez and
  Danny Carey.**

**Which records are his.** Neil Ellwood Peart was born on 12 September 1952 in
Hamilton, Ontario. He died on 7 January 2020 in Santa Monica, of glioblastoma
(Wikipedia). For his 13th birthday he was given sticks, a practice pad and
lessons, with a kit promised if he kept at it for a year. At 14 he got a red
sparkle Stewart kit with a 20-inch bass drum (Wikipedia; Zulaica, DRUM! 2005).
He played in the Eternal Triangle, Mumblin' Sumpthin' and the Majority. He
then spent about 18 months in London from 18, and joined Hush when he came
home.

He joined Rush on 29 July 1974. John Rutsey had played his last gig on 25 July
(Wikipedia, Rush). Peart became the band's lyricist. He is the drummer on
every Rush album from _Fly by Night_ (1975) to _Clockwork Angels_ (2012), and
on the live records from _All the World's a Stage_ to the R40 tour of 2015.
Terry Brown produced the band for ten years from the debut. After him came:

- Peter Henderson (_Grace Under Pressure_).
- Peter Collins (_Power Windows_, _Hold Your Fire_, _Counterparts_, _Test for
  Echo_).
- Rupert Hine (_Presto_, _Roll the Bones_).
- Paul Northfield (_Vapor Trails_).
- Nick Raskulinecz (_Snakes & Arrows_, _Clockwork Angels_).

There was a hiatus from 1997 to 2001, after his daughter and his wife died
("consider me retired"). Outside Rush, he produced _Burning for Buddy_ (1994,
and a second volume in 1997) and plays "Cotton Tail" on it. He played the
Buddy Rich Memorial Scholarship Concerts of 1991 and 2008 (Wikipedia; Burning
for Buddy). His drum films are _A Work in Progress_ (1996) and _Anatomy of a
Drum Solo_ (2005).

**How he played.** Krupa came first. "My first inspiration to play drums was
the movie The Gene Krupa Story" (Peart, Rhythm 2014). "The first thing my
teacher played for me was a drum battle record between Buddy Rich and Gene
Krupa", and "I think Gene Krupa was a really important influence because of
the abandon with which he played" (Rhythm, Alexander, 1987).

Wikipedia names his teacher as Don George at the Peninsula Conservatory of
Music. In 1980 Peart called his first teacher "Paul" and could not recall the
surname. Paul taught him rudimental and flashy material such as crossovers
(Modern Drummer, Iero, 1980). The record keeps Don George and gives "Paul" as
an alternative.

Then came Moon. In 1987 Peart said: "I think his rock 'n' roll heir was
probably Keith Moon ... even though Keith Moon showed even more abandon and
was more sloppy. But he was a drummer who really captured my imagination
because he was so free and so exciting because of his freedom ... It opened
me up." In 1980 he said Moon "gave me a new idea of the freedom and that there
was no need to be a fundamentalist".

After Moon came the British progressive drummers: "Drummers like Michael Giles
of King Crimson, Bill Bruford with Yes, Carl Palmer with Emerson, Lake and
Palmer and Phil Collins with Genesis were all important drummers to me. They
set such a high standard of technical ability but with the excitement that
rock drumming has" (1987). Genesis gave him his first understanding of meter
(1980).

Wikipedia adds Ginger Baker and John Bonham as early influences, and Steve
Gadd, Stewart Copeland, Billy Cobham and Pete Thomas later. Peart's own line
from 1993 is "I am no one's disciple".

How he worked, in his own words:

- **Overplaying, on purpose.** "I think a lot of my appeal lies in the fact
  that I overplay like crazy and I'm allowed to, within the context of this
  band" (1987).
- **Parts written ahead of his hands.** "Sometimes I'll put a drum fill in a
  song that I really can't play at that moment ... I hope to practise it
  enough so that by the time we record it, I am able to play it" (1987).
- **Framing the vocal.** He listens to the vocal and punctuates or frames it,
  with Geddy Lee's phrasing as the guide. His fills "refresh" a song from
  night to night (1980).
- **Odd meters.** He works in 5, 7, 9, 11 and 13, with some bars of 21, and
  does not count except through rests (1980). "Let's try it in 7 or 11, or 9"
  (1987).
- **Time.** "Years and years went into searching for a better time sense and
  a more accurate tempo" (1987).
- **The kit as an orchestra.** "My own personal orchestra that I can
  orchestrate and conduct" (1987). In 1980: "I play with a lot of open drums,
  open concert toms". His cymbals "are chosen for the length of decay that I
  want".
- **Grip.** Traditional for rudimental work, "that's the way I learned it",
  but "not the best way"; matched otherwise (1980).

In 1994 he became Freddie Gruber's pupil and remade his playing with jazz and
swing. He moved to traditional grip on _A Work in Progress_ and _Test for
Echo_, then went back mainly to matched. In 2007 he took lessons from Peter
Erskine (Wikipedia). In 2014 he called Gruber "my late teacher". Of Rich he
said "back then I couldn't even understand what Buddy was doing" (Rhythm
2014).

**His solos.** In 1980 he built the solo "like a song": an introduction,
movements, "comic relief", and a build. On _Exit...Stage Left_ (1981) it is
an interlude inside YYZ (Wikipedia, YYZ). By 2014 it was built over Max Roach's
The Drum Also Waltzes: "it took a long time to get 'free' over the waltz time,
but now I can flail around at will, in any tempo or time signature". He also
used a Brazilian "xaxado ostinato" in the feet, and its elements were
"deliberately not allowed to become fixed" (Rhythm 2014).

**Kit.** By era, from Zulaica (DRUM! 2005), Drumspy and the 1980 interview:

- **1974:** a chrome Slingerland with two 22x14 bass drums, two 13x9 toms, a
  14x10 tom and a 16x16 floor tom. Zildjian 13-inch New Beat hats, 16, 18
  and 20-inch crashes and a 22-inch Ping ride. "Old Number One", a
  copper-finish 14x5.5 snare.
- **Caress of Steel:** single-headed concert toms, 6, 8, 10 and 12 inches.
- **2112 to Hemispheres:** black chrome Slingerland, "Vibrafibed", with 24x14
  bass drums. Temple blocks, tubular bells, brass timbales, wind chimes, bell
  tree, triangles and a glockenspiel. Crotales, chinas, a gong and a
  tympanum joined for the Hemispheres tour.
- **Permanent Waves and Moving Pictures:** Tama Superstar with brass-plated
  hardware. The finish is a mahogany stain: "I was trying to achieve a
  Rosewood". From Moving Pictures the timbales were wooden, and two
  single-headed gong bass drums (20 and 22 inches) replaced the tympanum.
- **Signals to Power Windows:** thin-shell Tama Artstar prototypes in candy
  apple red with brass hardware. The toms were the concert toms 6 to 12 and
  closed toms of 12, 13, 15 and 18 inches, with two 24-inch bass drums and
  the gong drums.
- **Grace Under Pressure tour:** four red Simmons pads behind him. The
  Julien's auction lists the red kit in the _Grace Under Pressure Tour 1984_
  film and in nine videos.
- **1987 on:** Ludwig in opalescent white, then plum, Blue Shadow and Black
  Cherry. A malletKAT replaced the tuned percussion, and from _Roll the
  Bones_ there was one 22-inch bass drum with a double pedal.
- **DW, blood red sparkle:** after Gruber.
- **Vapor Trails:** Roland V-Drums at the back.

His cymbals were Zildjian with Wuhan chinas until the early 2000s, then Sabian
Paragons (Wikipedia).

**Devices (schema 1.5).** One device holds:

- **Ostinato-independence in his solos** (verified). This is a foot ostinato
  in 3/4 after Roach's The Drum Also Waltzes: bass drum on 1, and Peart's
  hi-hat on 2 and 3 (BANG! The Drum School). His hands are free over it "in
  any tempo or time signature". Later the feet also played a xaxado
  ostinato (Rhythm 2014). Wikipedia calls "The Waltz" a typical ostinato of
  his solos.

  No transcription of a recorded solo was read, so whether the hands cross
  the waltz in another meter is not tagged.

A `devices_search` records what was read:

- Five human Songsterr tabs: Tom Sawyer, YYZ, Limelight, Subdivisions and The
  Spirit of Radio.
- The 1980, 1987 and 2014 interviews and articles, and DRUM! 2005.
- Wikipedia's pages for him, Rush, YYZ and Burning for Buddy.
- Drum Center NH on his fills, and Drumspy.

These leads did not hold:

- **YYZ's intro:** the Morse code for Y-Y-Z in 10/8. That is an odd meter.
- **Tom Sawyer's synth break and Subdivisions' intro:** both are 7/8.
  Subdivisions' hat is accented 2+2+2+1 eighths.
- **"Polyrhythmic thinking" (2014):** this is about cutting a solo into
  sections.
- **Tom Sawyer's "quadruplet with triplet" fill:** a change of subdivision in
  a fill, not a sustained cross pulse.

One caution for the song table: three Songsterr tabs by two authors share one
ride-bell and kick-snare cell. They are YYZ bar 36, Subdivisions bar 71 and
The Spirit of Radio bar 24. No pattern in the record uses that cell.

**What the style encodes.**

- **ghostBias:** low. The tabs read have a ghosted pair in Subdivisions' 7/8
  and almost nothing else.
- **Swing:** none on the Rush songs, which are straight eighths and
  sixteenths. Swing came after Gruber (Test for Echo, Cotton Tail), and no
  song here is from then.
- **Feel:** each song in its own meter. The meters are 4/4, 7/8 (Tom Sawyer's
  break, Subdivisions), 10/8 (YYZ's intro, written 5/4 as the tab has it),
  3/4 and 6/4 bars (Limelight). The hat or ride is in sixteenths, the hat
  opened and closed by the foot inside the bar. The kick sits on the
  sixteenths either side of the beat with the riff.
- **Fills:** often and long, in his habit. They run in single strokes down a
  long row of toms, placed to frame the vocal phrase. Two bass drums appear
  in fills, never as a metal double-kick under the groove.
- **Poly fills:** none (D56). His one device is a foot ostinato under
  improvised solos, not a fill on a record.
- **Kit:** `studioRock`. Its 24-inch Big Rusty kick suits his two 24-inch
  bass drums. It also has the DRS kit's cracking snare and Crocell's bright,
  big cymbals with a china and a splash. The likeness's `KIT.md` gives the
  reasons, and an optional re-tuned row to sign off by ear.

**The songs.**

Every song is written in sections in the record's order (A, B, C…, at most 32 distinct bars, an
arrangement of at most 32 slots). Every tab is human (`aiGenerated: false` through the meta API);
every tempo was checked against the record (beat-tracked with `beats.py`, or by onset
autocorrelation with `acf.py` where the tracker only follows its prior) and against the tab's
length at its marked tempo. Per-song notes are in `songs/<key>.md`.

| Song                | Year | Tempo (quarter)                                                                                 | Meter                               | What defines it                                                                                                            | Source of the bars                                          |
| ------------------- | ---- | ----------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Fly by Night        | 1975 | 139 (tab; record mean 139.2; length matches: 196.8 s against 197.5 s)                           | 4/4                                 | the hat open on the "and"s of 1 and 3; the chorus snare and crash on the "and" of 1; stops with tom runs; a bell interlude | Songsterr 22536 (human)                                     |
| 2112: Overture      | 1976 | 134 (tab); 135 (record, onset autocorrelation)                                                  | 4/4, 9/8, 7/8; 4/4 + 2/4 as 6/4     | band hits in odd bars; the kick in eighths under the toms; the march; the snare on 3; the bell riff                        | Songsterr 52539 (human, no markers)                         |
| Closer to the Heart | 1977 | 74 then 148 (tab: one pulse, the hat's sixteenths then quarters); record 148                    | 4/4, the first part at ×½           | sixteenths on the hat at 74; the hat in quarters at 148, the kick off the 1; ride and snare in unison eighths              | Songsterr 16578 (human)                                     |
| La Villa Strangiato | 1978 | 152, 144, 138, 132, 142 (tab); 138–153 (record, autocorrelation); one tempo in 140–150 here     | 4/4, 7/8, 9/8                       | the hat in threes over a 3+3+2 kick, the snare on 4 alone; 7/8 for the solo; the waltz in 9/8                              | Songsterr 16588 (human)                                     |
| The Spirit of Radio | 1980 | 131 for the body (tab; record lag 0.884 s = 136/2); the riff at 180 and the end at 154 left out | 4/4; 4/4 + 3/4 as 7/4 in the bridge | the ride's bell over ghosts; an "electronic" chorus on the kick alone; crashes on every beat                               | Songsterr 17179 (human)                                     |
| Tom Sawyer          | 1981 | 87 (tab; record mean 87.2; length matches: 272.8 s against 271 s of drums)                      | 4/4 and 7/8                         | the hat in sixteenths, open on the "e" of 1, the crash on 2; the riff in dotted eighths; 7/8 for the synth and solo        | Songsterr 287 (human); 533602 (human, a cover's tab)        |
| Red Barchetta       | 1981 | 144 (tab; record mean 144.5; length matches)                                                    | 4/4, 7/4; 4/4 + 3/4 as 7/4          | the hat and foot under the guitar; the bell over the foot; sixteenths on the hat; the solo in 7/4                          | Songsterr 22757 (human)                                     |
| YYZ                 | 1981 | 141 (tab; record 140.6); the intro's 5/4 at 106 left out                                        | 4/4                                 | the riff on the hat's quarters; the bell over ghosts; every fourth bar a stop or a tom run; the snare on 3                 | Songsterr 16981 (human)                                     |
| Limelight           | 1981 | 131 (tab; record mean 130.9; length matches)                                                    | 7/4, 6/4, 4/4, 3/4                  | the riff in 7/4; the verse in 6/4 with a 4/4 bar of hits; the chorus in 3/4 then 4/4 over a kick on every eighth           | Songsterr 17265 (human); 515175 (human, live) compared      |
| Subdivisions        | 1982 | 134 (tab; record mean 133.2)                                                                    | 7/8, 4/4, 6/4                       | the hat alone in 7/8; "that one beat": bell on the "and"s, hat between, snare on 3; the verse's 7/8; the chorus in 6/4     | Songsterr 17076 (human)                                     |
| Time Stand Still    | 1987 | 138 (tab; record 136–140)                                                                       | 4/4, 7/4                            | four on the floor under the bell, the snare on 4, timbales and a wood block; the hat in a figure; the bridge in 7/4        | Songsterr 52545 (human)                                     |
| Headlong Flight     | 2012 | 180 (tab); 178 (record)                                                                         | 4/4                                 | the hat open on every beat; the chorus snare on 2 alone with the toms on 4; a half time                                    | Songsterr 382071 (human, a plain transcription, no markers) |

Tried and dropped:

- **Working Man** (1974): John Rutsey's drums, not Peart's (excluded by the brief).
- **Freewill** (1980): Songsterr 16600 (human) has the verse alternating bars of 6/4 and 7/4 and an
  8/4, the chorus three bars of 4/4 and one of 3/4, and the solo in 12/8 (commonly cited as 13/8,
  not checked). A section has one meter and a two-bar figure holds 32 steps, so the verse would be
  a section per bar: eight slots a verse, the song past 32 slots. Left for a later pass.
- **Xanadu** (1977): Songsterr 52464 (human) listed, not read: 11 minutes of the same meter shifts
  and percussion (temple blocks, bells) the lanes do not hold; La Villa Strangiato stands for that
  period.
- **2112** as a whole: only the Overture is written.

Sources quoted in the notes: Modern Drummer, April/May 1980 (Cheech Iero; transcript at
2112.net "Power Windows"); Modern Drummer, February 1983 ("Notes on the Making of Moving Pictures",
the excerpt online); Rhythm, 2007 (via rushisaband.com); Modern Drummer, January 2016 (transcript at
2112.net); Wikipedia's album pages (credits, dates).

**Sources.**

- Wikipedia: Neil Peart; Rush (band); YYZ (instrumental); Burning for Buddy;
  Mike Portnoy.
- Cheech Iero, "Neil Peart Interview", Modern Drummer, April/May 1980
  (2112.net transcript).
- Susan Alexander, "Neil Peart: Rush Release", Rhythm, March 1987 (2112.net
  transcript).
- Neil Peart, "Neil Peart On Drum Solos", Rhythm, March and April 2014
  (2112.net transcript).
- Don Zulaica, "Mean Mean Stride: The Drums of Neil Peart", DRUM!, October
  2005 (2112.net transcript).
- Drumspy, "Neil Peart Drum Kit Setups".
- Rush is a Band, "Neil Peart's red Tama drum kit up for auction" (2012;
  Julien's lot 28533).
- Drum Center NH, "Neil Peart's Most Famous Drum Fills" (2019).
- BANG! The Drum School, "11 Steps to The Drum Also Waltzes Independence"
  (via the Max Roach record).
- Songsterr human drum tabs: Tom Sawyer (287), YYZ (16981), Limelight
  (17265), Subdivisions (17076), The Spirit of Radio (17179).
- Rush, _Grace Under Pressure Tour 1984_ (Maple Leaf Gardens, 21 September
  1984), YouTube FZABIWpPMzk, IBXAPgcOqy0, -rEhnlUGVi8: watched for the
  likeness.

## BF. Charlie Watts (2026-10-18)

The `watts` style plays **songs**, as `levonhelm` (BC) and `downey` (AQ) do:
each New picks one of his records, and its tempo, kit and grooves come with
it, section by section in the record's order. His record
(`drummer-model/drummers/charlie-watts.json`, schema 1.5) is new, written
from this section. It comes with eleven recordings and
`sources/charlie-watts.json`. Two files already named `drummer:charlie-watts`:
Phil Collins's record (an influence) and Joey Jordison's (admired, for his
restraint). The record agrees with both.

**Which records are his.** Charles Robert Watts was born on 2 June 1941 in
Bloomsbury and grew up in Wembley and Kingsbury; he died in London on 24
August 2021 (Wikipedia). His first records were jazz 78s, Jelly Roll Morton
and Charlie Parker. At about thirteen he took the neck off a banjo and played
its head on a stand as a snare; a GBP 12 kit came at Christmas 1955.

- **Blues Incorporated.** Alexis Korner asked him in, in 1961, beside Jack
  Bruce and Dick Heckstall-Smith. When he left for the Stones he "suggested
  Ginger Baker as his replacement" (Wikipedia, Blues Incorporated).
- **The Rolling Stones.** He took Tony Chapman's place in January 1963 and
  stayed until his death. Steve Jordan took his place on the 2021 tour.
- **His own bands.** Rocket 88 with Ian Stewart; the Charlie Watts Orchestra
  (1980s); the Quintet (_Warm and Tender_, 1993); the Tentet; the Charlie
  Watts Jim Keltner Project (2000), its tracks named for Blakey, Clarke,
  Williams, Roach and Elvin Jones; the ABC&D of Boogie Woogie.
- **Not his.** Jimmy Miller plays the coda of Tumbling Dice, "because Watts
  was having trouble" with it, and Watts overdubbed a second drum track over
  his own on that song, his only time (Wikipedia, Tumbling Dice). The coda is
  left out of the song here.

**How he played.**

- **Jazz first.** "The first thing I heard that I wanted to emulate was Chico
  Hamilton playing brushes on 'Walkin' Shoes' by Gerry Mulligan." "My love
  was rhythm brushes - wire brushes" (PAS, Mattingly). Of the drummers to
  follow: "If any young person asked me ... I'd say Roy Haynes"; Tony
  Williams "an extension of Roy"; Zigaboo "could play bebop but also could
  play second-line rhythms"; Jimmy Reed's Earl Phillips "kind of played like a
  jazz drummer" (Rolling Stone, Gilmore, 2013). "I'm not Buddy Rich."
- **The hand off the hat.** From about 1969 he left the hi-hat out on 2 and 4
  (Wikipedia). "I was never conscious of doing it until Jim Keltner mentioned
  it. But I do it a lot. It really comes, I think, from coming down heavy on
  the backbeat. I suppose I got in the habit of pulling the stick out of the
  way to get a louder sound" (PAS).
- **The late backbeat.** From about 1968 to the mid-1970s he often laid the
  snare slightly late on 2 and 4 ("Monkey Man", "Wild Horses"; Wikipedia).
- **Following Keith.** The band follows Richards, not the drums (Kakutani:
  what "makes the Stones impossible to copy"). Richards's amp sat by his
  hi-hat. Richards: "you suddenly realize that you're floating a few inches
  off the ground"; against a click, Watts would say "what it should do is come up a
  little bit in tempo here, and then it should pull back there" (PAS). He sped up,
  "especially in Honky Tonk Women" (Wikipedia): the record runs from 115 to 125.
- **No solos.** "I don't like drum solos ... generally I prefer drummers
  playing with the band." "My thing is to make it a dance sound; it should
  swing and bounce" (PAS). "The drummer is the engine" (Gilmore).
- **Grip.** Matched for a few years in the 1960s "because I thought it was
  popular"; Ian Stewart "virtually ordered me to go back to what he called
  the 'proper' way ... So I went back to the military grip" (PAS).

**Kit.** Ludwig in the 1960s (the tabs name a Super Classic in Sky Blue
Pearl and a Supraphonic snare); a Gretsch round badge in Black Nitron from
1968; from 1978 a late-1950s Gretsch round badge in natural maple, 22-inch
bass drum, 12x8 rack tom on its own stand, 16-inch floor tom, hi-hat and four
cymbals (Wikipedia). A four-piece throughout, usually a Gretsch, as the jazz drummers
he admired played them (PAS). No samples of his own are free to use: the
1960s songs play `sixties` (SM Drums' 1960s Ludwig, washy, as Ringo's early
songs do), the Jimmy Miller years `funkSoul` (the same Ludwig with a fat
snare, round and warm), Tumbling Dice `teatowel` (Nellcôte's basement, damped
and dead), Some Girls and Start Me Up `drs` (dry and even). The style's own
kit is `funkSoul`.

**The likeness.** Hyde Park, 5 July 1969, Granada's film: long straight hair
to the shoulders, clean-shaven, a lime-green knitted short-sleeved shirt, the
dark Gretsch with a white front head. Not the suited Watts of later years:
the film is dated, in colour, and at the start of the Gretsch years the songs
come from.

**Devices.** None. The transcription-level search (the twelve human tabs
below, Wikipedia, PAS, Gilmore and Deggans) found no cross-rhythm, hemiola
or accent cycle. The leads that did not hold: the hand off the hat is a gap in
the ostinato, not a second pulse; Tumbling Dice's sextuplet fills subdivide a
beat; Paint It Black's floor tom in eighths under the snare on every beat is
one pulse doubled. Recorded as a `devices_search`.

**What the style encodes.**

- `ghostBias` 0.1: the tabs write almost no ghost notes.
- `feel`: the snare 0.08 of a sixteenth late, the kick and hats near the
  beat; Tumbling Dice's song drags more (0.12 on the snare, the hats late).
- `weight` 0.55: traditional grip, from the wrist.
- Base figures from the songs, one of them with the hand off the hat on 2 and
  4; the songs keep their tabs' hats, with a lighter-weighted lifted bar in
  the songs from 1969 on (Honky Tonk Women, Gimme Shelter, Tumbling Dice,
  Beast of Burden, Start Me Up), since the tabs write the hats through.
- `fillChance` 0.4, `midFills` 0, the crash on 0.6 of the phrase marks: few
  fills, short (a few sixteenths on the snare, a pair of toms), no china.
- Runs of four or more sixteenths are written as threes (Get Off of My
  Cloud's run from 3 leaves out the "e"; Paint It Black's tom runs the same),
  so the songs stay inside the critic's limit at their tempos.

**The songs.** Every bar is from a human Songsterr tab (aiGenerated false),
read section by section with `tab.py`; every tempo is the record's, from an
autocorrelation of the audio (`acf.py`) over 40–120 s, and at both ends where
the tempo moves.

| Song                | Year | Tempo and evidence                                         | Meter | The groove                                                                                        | Bars from                                       |
| ------------------- | ---- | ---------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Satisfaction        | 1965 | 136 (record 136.3; 137.2 early, 135.3 late; tab 136)       | 4/4   | Eighths, the snare and the kick on every beat, no fills                                           | Songsterr 16453 (rev 7421771)                   |
| Get Off of My Cloud | 1965 | 126 (record 126.1–127.7; tab 125, the old tab's 140 wrong) | 4/4   | A two-bar call, a run on the snare from 3; the chorus on every beat; the outro's kick in eighths  | Songsterr 1186118 (rev 2913446); 17081 compared |
| Paint It Black      | 1966 | 160 (record 160.1, steady; tab 159)                        | 4/4   | The floor tom in eighths under the snare on every beat; open hats in the chorus; tom fills        | Songsterr 5 (rev 8989874), the kit track 11     |
| Jumpin' Jack Flash  | 1968 | 138 (record 137.6; tab 134)                                | 4/4   | One groove, the kick on 1, the "and" of 2 and 3                                                   | Songsterr 16426 (rev 8965807)                   |
| Honky Tonk Women    | 1969 | 115 to 125 (record 115.2 early, 124.8 late; tab 115)       | 4/4   | The kick on the "and"s of 3 and 4; the chorus on the "and" of 2; the stop                         | Songsterr 52278 (rev 6157230)                   |
| Gimme Shelter       | 1969 | 119 (record 118.6; tab 119)                                | 4/4   | The ride intro; the kick on 1, 3 and their "and"s; the chorus's tom bar                           | Songsterr 380 (rev 9289548)                     |
| Brown Sugar         | 1971 | 128 (record 128.2; tab 129)                                | 4/4   | The floor tom in eighths under an accented backbeat; the chorus answering the riff on the toms    | Songsterr 16360 (rev 7829128)                   |
| Tumbling Dice       | 1972 | 111 (record 111.6; tab 111)                                | 4/4   | A dragging straight eighth, the hat opened on the "and" of 3, the band dropping out at the chorus | Songsterr 16946 (rev 7916599), track 8          |
| Miss You            | 1978 | 110 (record 109.6; tab 108)                                | 4/4   | The kick on every beat, the hat opened on the "and"s, the snare out for the "ooh-ooh"s            | Songsterr 16458 (rev 8134399)                   |
| Beast of Burden     | 1978 | 101 (record 101.0; tab 103)                                | 4/4   | The kick on the "and"s of 2 and 4, the hat opened and closed; the chorus's kick in eighths        | Songsterr 52288 (rev 7829093)                   |
| Start Me Up         | 1981 | 122 (record 122.4; tab 122)                                | 4/4   | The push under the riff; the kick on 1 and 3 to the end; runs on the snare at the ends of lines   | Songsterr 16469 (rev 8134798)                   |

Tried and left out: Sympathy for the Devil (Songsterr 52286, human), whose
tab has only the kick in quarters and the hat foot on the "and"s, against
NPR's cross-stick with the snares off: not written until that is settled.

### Sources (BF)

- Wikipedia, "Charlie Watts", "Blues Incorporated", "Tumbling Dice", "Tony
  Chapman" (accessed 2026-10-18).
- Rick Mattingly, "In Memoriam: Charlie Watts", Percussive Arts Society.
- Mikal Gilmore, interview with Charlie Watts (2013), Rolling Stone, 2021.
- Eric Deggans, "Appreciating Charlie Watts", NPR / WBGO, 25 August 2021.
- Songsterr drum tabs 16453, 1186118, 17081, 5, 16426, 52278, 380, 16360,
  16946, 16458, 52288, 16469, 52286.
- "The Stones in the Park", Hyde Park, 5 July 1969 (YouTube gqtJELaLG5k).

## BG. Keith Moon (2026-10-18)

The `moon` style plays **songs**, as `grohl` (BD) and `downey` (AQ) do: each
New picks one of his records, and its tempo and grooves come with it. His
record (`drummer-model/drummers/keith-moon.json`, schema 1.5) is new. It is
written from this section, with six recordings and `sources/keith-moon.json`.
Three records already named him as a stub, and the record agrees with each:

- Phil Collins was `influenced_by` him.
- Neil Peart and Joey Jordison `cite_as_influence` him.

No genre is new: `style:rock`, `style:hard-rock`, `style:merseybeat` (British
beat, for the 1964–65 singles) and `style:progressive-rock` (the rock operas)
all have their `GENRE_FAMILY` rows.

**Which records are his.** Keith John Moon was born on 23 August 1946 at the
Central Middlesex Hospital, Wembley, and died on 7 September 1978 in Mayfair,
aged 32 (Wikipedia). He played the bugle in the Sea Cadet Corps band at twelve,
found it too hard and moved to drums, and took lessons from Carlo Little,
Screaming Lord Sutch's drummer, at ten shillings each. He auditioned for the
Who in April 1964, at 17, in place of Doug Sandom; by the usual account he
broke a bass drum pedal and two heads on a borrowed kit. He was the Who's
drummer until his death; Kenney Jones replaced him in November 1978.

He is the drummer on all the Who's records of those years. The ones the style
plays:

- _I Can't Explain_ (Brunswick, 15 January 1965; Pye, November 1964, Shel
  Talmy).
- _My Generation_ (Brunswick, 3 December 1965; IBC, April–November 1965,
  Talmy): the title track and _The Kids Are Alright_.
- _Tommy_ (Track/Decca, May 1969; IBC and Morgan, September 1968 to March
  1969, Kit Lambert), on a double bass drum kit owned by a roadie after Premier
  stopped lending him gear: _Pinball Wizard_.
- _Who's Next_ (Track/Decca, August 1971; Olympic and Stargroves, April–June
  1971, Glyn Johns associate producer): _Baba O'Riley_ and _Won't Get Fooled
  Again_, played to Townshend's organ and VCS3 tracks.
- _Quadrophenia_ (Track/MCA, October 1973; Olympic and Ramport, 1972–73):
  _5:15_.
- _Who Are You_ (Polydor/MCA, 18 August 1978; Ramport, Olympic and RAK,
  September 1977 to April 1978, Johns and Jon Astley): the title track. His
  playing had "noticeably deteriorated"; he could not play the 6/8 of "Music
  Must Change", whose drums were taken off; apart from the title track his
  drums were cut in the last two weeks at Ramport (Wikipedia, Who Are You).

**How he played.** In the words of the people round him:

- **Daltrey:** "he just instinctively put drum fills in places that other
  people would never have thought of putting them" (Wikipedia). And: "Pete and
  John as two knitting needles and Keith was the ball of wool" (Far Out).
- **Entwistle:** "he always played with the vocals" (Far Out). He "tended to
  play faster or slower according to his mood ... He'd play zig-zag. That's
  why he had two sets of tom-toms. He'd move his arms forward like a skier"
  (Wikipedia).
- **Jon Astley:** "You didn't think he was keeping time, but he was."
- **Mike Portnoy** (Modern Drummer): "controlled chaos": "the constant
  pulsating 8th notes on the kick drums", "the furious stampede of constant
  tom fills", "the steady whirlwind of crash cymbals".
- **Neil Peart** (Modern Drummer, 1980, through Far Out): he liked his way of
  "putting crash cymbals in the middle of a roll".
- **Moon himself** (Modern Drummer, October 1978): "You can't work out things
  too much"; "Sometimes I'll build up with timpani; sometimes I'll build up on
  a cymbal or with a roll around the kit." And (Melody Maker, 1970): "I suppose
  as a drummer, I'm adequate. I've got no real aspirations to be a great
  drummer."

His influences (Wikipedia): Gene Krupa, his favourite, "whose flamboyant style
he later copied"; jazz, American surf music and R&B, Hal Blaine as an example;
DJ Fontana, Tony Meehan of the Shadows and Viv Prince of the Pretty Things;
Motown; the Beach Boys. He disliked drum solos and would not play them ("Drum
solos are boring!", Madison Square Garden, 1974). With Ginger Baker he was one
of the first rock drummers on two bass drums. _Who's Next_ is the exception to
the busy Moon: Wikipedia calls his playing there "more formal and less reliant
on long drum fills", for the synthesiser tracks and Johns's production, and on
_Quadrophenia_ he "returned to his established drumming style". Tony Fletcher
counts _Who's Next_ his best.

**Kit.** Ludwig drums and Zildjian cymbals in 1964–65; Premier from late 1965,
first a red sparkle kit with two high toms; a larger kit without a hi-hat in
1966, the hat later reinstated; the "Pictures of Lily" kit (1967–69), two
22-inch bass drums, three mounted toms and two 16-inch floor toms (reissued in
2006 as the "Spirit of Lily"); from 1970 timbales, gongs and timpani
(Wikipedia). Far Out says he "completely excised the hi-hat"; the tabs read put
one on five of the eight songs, so the record keeps Wikipedia's account and
leaves the question open.

**Devices (schema 1.5).** None found. A `devices_search` is recorded. It read
eight human Songsterr tabs section by section (and skimmed three more),
Wikipedia, Modern Drummer and Far Out. Every song read is in 4/4. The leads
that did not hold:

- **My Generation's rolls** are eighth-note triplets inside a 4/4 fill, not a
  cross pulse.
- **I Can't Explain's push** (crashes in dotted quarters) lasts one bar and is
  the band's figure, not a sustained 3:2.
- **Who Are You's verse** is a half-time feel, not a metric modulation.

**What the style should encode.**

- **Feel:** straight, ahead and loose (`On top, loose`, jitter 0.025). Tempos
  from 118 (Baba O'Riley) to 135 and 156 (Who Are You), and My Generation at 192.
- **Ghosts:** `ghostBias` 0.04. The tabs have ghosts only in Pinball Wizard's
  chorus and Baba O'Riley's verse.
- **Fills everywhere:** `midFills` 0.45 on the base, so fills land inside the
  phrase as well as at its end: round the toms with the kick in eighths, snare
  threes, the floor tom with the snare.
- **Cymbals:** crashes on 1, on the "and"s and with the band's pushes; a crash
  ridden as a ride (Baba O'Riley's crash 2); the ride in eighths for the
  1965 songs.
- **Avoid:** swing, ghosted sixteenths, long stretches with no fill, solos.
- **Kit:** no freely licensed samples of his kits turn up. The 1965 and 1969
  songs play `sixties` (the 1960s Ludwig, ringing toms, thin crashes left to
  wash); the _Who's Next_ songs and the base play `bigRoom` (Big Rusty played
  hard in a big room, with big crashes: Johns's room at Olympic); _5:15_ and
  _Who Are You_ play `bigrusty`. No re-tuned row is needed. The likeness's kit
  is the chromed kit at Shepperton, May 1978.

**Patterns in the record.** Nine bars or bar pairs, all `approximation` and
`draft`, from the human tabs: I Can't Explain's verse pair; My Generation's
stop and its triplet rolls (in sextuplets); The Kids Are Alright's Motown on
the ride; Pinball Wizard's verse; Baba O'Riley's crash pair; Won't Get Fooled
Again's verse; 5:15's horn pushes; Who Are You's half-time verse.

**The songs.**

All bars come from human Songsterr tabs: `aiGenerated` is false through the
meta API for every tab used. Every tempo was beat-tracked from the record
(`beats.py --tempo` and the autocorrelation in `acf.py`) and checked against
the tab's length at its marked tempo.

| Song                   | Year | Tempo (quarter)                                                | Meter             | What defines it                                                                                                                                       | Source of the bars      |
| ---------------------- | ---- | -------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| I Can't Explain        | 1965 | 135 (tab; record 135.8; 126 s against 125)                     | 4/4               | eighths on the hat in a two-bar pair, a snare and floor tom fill every fourth bar, the band's push in dotted quarters on the crashes                  | Songsterr 21045 (human) |
| My Generation          | 1965 | 192 (tab; record 192.1); played at 186–190, the grids' ceiling | 4/4 in sextuplets | the ride in eighths, the band's chord and silence under Daltrey's line, eighth-note-triplet rolls on the snare and floor tom in the choruses and coda | Songsterr 17313 (human) |
| The Kids Are Alright   | 1965 | 134 (tab; record 134.5; 183 s against 181)                     | 4/4               | Motown: the snare on every beat under the ride; tom fills; the middle on the mid tom; crashes in dotted quarters over snare threes                    | Songsterr 21009 (human) |
| Pinball Wizard         | 1969 | 125 (tab; record 125.0)                                        | 4/4               | eighths on the hat, pairs on the floor and mid toms, open hats and ghost pairs in the chorus, the drums tacet for the acoustic intro and interlude    | Songsterr 364 (human)   |
| Baba O'Riley           | 1971 | 118 (tab; record 117.3)                                        | 4/4               | a crash 2 ridden in eighths over the organ, the crash on 1 and 4, the snare accented; the violin coda left out                                        | Songsterr 5197 (human)  |
| Won't Get Fooled Again | 1971 | 135 (tab 137; record 135.0; 287 bars run 510 s against 514)    | 4/4               | half-open hats in eighths, crash 2 on 4, little fills everywhere (no verse bar repeats), the re-entry and the scream after the organ                  | Songsterr 507 (human)   |
| 5:15                   | 1973 | 122 (tab; record 122.7)                                        | 4/4               | eighths on the hat, crashes with the horns on the "and"s, the band out under the chorus's voices, a roll back in                                      | Songsterr 90202 (human) |
| Who Are You            | 1978 | 156 (tab 158; record 156.4; 244 bars run 375 s against 381)    | 4/4               | a half-time verse, the snare on 3 alone, a china now and then; the chorus on 2 and 4, on the hat and then the ride; the break's floor tom             | Songsterr 58198 (human) |

Long snare runs in the tabs (five to sixteen sixteenths) are written in threes
everywhere: the critic stops four in a row. Sections are pools of a part's
commonest bars where he never plays the same bar twice (Won't Get Fooled Again,
5:15, Who Are You's verses).

**Tried and dropped:**

- **Substitute (1966).** Songsterr 23437 (human): an overdubbed tambourine in
  sixteenths shares the drum track, and the chorus has 2/4 bars. Not attempted.
- **I Can See for Miles (1967).** Songsterr 58209 (human, rev 73256, 2010):
  one unmarked section of 140 bars, with overdubbed percussion lanes, and the
  famous snare rolls run fourteen sixteenths. Not attempted.
- **The Real Me (1973).** Songsterr 20988 (human): its fills are the same few
  bars pasted throughout, identical to I Can See for Miles' tab; not trusted.
- **Baba O'Riley's coda** (84–86, then speeding up to 125): unbroken snare
  sixteenths, and a tempo the song's sections cannot share.
- **Who Are You's intro** (hats in sixteenths): four in a row hold the song to
  150, under the record's 156.
- **Not attempted:** The Seeker (52591), Love, Reign O'er Me (425032), Behind
  Blue Eyes (86358), Boris the Spider (21826), Magic Bus (21563).

**Sources.**

- Wikipedia: Keith Moon; Who's Next; I Can't Explain; My Generation (album);
  Tommy (The Who album); Quadrophenia; Who Are You. Accessed 2026-10-18.
- T. Bruce Wittet, "Keith Moon Elected to Hall of Fame in 1982", Modern
  Drummer (from the September 2003 issue; posted 10 January 2022).
- Tyler Golsen, "How to play drums like Keith Moon", Far Out, 23 August 2022.
- "Rolling Stone Readers Pick Best Drummers of All Time", Rolling Stone, 2011;
  "100 Greatest Drummers of All Time", Rolling Stone, 2016 (placings only).
- The Who, "Won't Get Fooled Again", Shepperton Studios, 25 May 1978 (YouTube
  UDfAdHBtK_Q), watched for the likeness and the kit.
- Songsterr human drum tabs 21045, 17313, 21009, 364, 5197, 507, 90202 and 58198.

## BH. Bill Bruford (2026-10-18)

The `bruford` style plays **songs** the way `peart` (BE) and `downey` (AQ) do:
each New picks one of his records, and its tempo, meters and grooves come with
it. His record (`drummer-model/drummers/bill-bruford.json`, schema 1.5) is new,
written from this section, with eight recordings and
`sources/bill-bruford.json`. Five records already named him as a stub
(`drummer:bill-bruford`), and the new one agrees with all of them:

- **Neil Peart:** `cites_as_influence` him ("Bill Bruford with Yes ... were all
  important drummers to me", Rhythm 1987). His record says `cited_by` Peart.
- **Danny Carey:** `cites_as_influence` him. His record says `cited_by` Carey.
- **Phil Collins:** `co_drummer_with` him, Genesis on tour in 1976. The same
  claim from his side.
- **Max Roach:** `influenced` him. His record says `influenced_by` Roach.
- **Billy Cobham:** `influenced` him. Not repeated; not contradicted.

**Which records are his.** William Scott Bruford was born on 17 May 1949 in
Sevenoaks, Kent, and went to Tonbridge School (Wikipedia). He took up the drums
at 13 after watching American jazz drummers on BBC2's _Jazz 625_. A
schoolfriend gave him a Jim Chapin tutor and lessons in improvisation, and he
had a few lessons from Lou Pocock of the Royal Philharmonic. He practised with
brushes on album sleeves, "a perfect education".

After the Breed (1966–67) he joined Yes in June 1968 and played on its first
five albums, to _Close to the Edge_. He left on 19 July 1972, after those
sessions, for King Crimson and more improvisation; Alan White learned the parts
in three days (Wikipedia, Close to the Edge). King Crimson had him three
times:

- **1972–74:** _Larks' Tongues in Aspic_ (with Jamie Muir's percussion),
  _Starless and Bible Black_, _Red_. Fripp called Wetton and Bruford "a flying
  brick wall" (Wikipedia, Red).
- **1981–84:** _Discipline_, _Beat_, _Three of a Perfect Pair_, with Belew,
  Fripp and Levin, on a hybrid kit.
- **1994–97:** the double trio (_Vrooom_, _Thrak_).

Between them: Gong (late 1974), National Health (1975–77), Genesis's concert
drummer on the _A Trick of the Tail_ tour (March–July 1976, while Collins
sang), U.K. (1978) with John Wetton, Eddie Jobson and Allan Holdsworth, and his
own band Bruford (_Feels Good to Me_ 1978, _One of a Kind_ 1979, _Gradually
Going Tornado_ 1980). Then Moraz/Bruford, Earthworks (1986–93 and 1997–2008)
and Anderson Bruford Wakeman Howe (1988–90). He retired on 1 January 2009,
after 2,885 gigs, and took a PhD at Surrey in 2016 on the kit drummer's
creativity.

**How he played.** Jazz came first: "I had stacks of Blue Note records ... I
borrowed somebody else's roots" (Modern Drummer, Fish, July 1983). The
drummers he names are Max Roach, Joe Morello and Art Blakey (Wikipedia; Far
Out, 2022, from his interview): Roach "all the great jazz drummers of the day,
such as Max Roach"; "Joe Morello from Dave Brubeck Quartet"; and of Blakey, "the
music didn't go anywhere until the drummer said so". Wikipedia adds Ginger
Baker. DRUM! (2012) places his polyrhythms after Tony Williams and Elvin Jones.

In his own words:

- **Meter over tempo.** "I always had considerable interest in time signatures
  and meters, much less in metronomic tempo" (Pienemmät Purot, 2019). King
  Crimson was the band "where you could play in 17/16 and still stay in decent
  hotels".
- **The snare's placement.** Listeners know his snare, he says, not "so much
  [from] the sound of the snare drum as its typically unusual placement in the
  measure" (2019). In Yes, Squire's high bass lines pushed him to unusual beat
  placement (Wikipedia).
- **Simple and complex at once.** "One is always trying to present the simple
  and the complex at the same time", "perhaps in a multiple meter over the
  dance groove in the feet" (1983). "The complex becomes simple when you can do
  it: the art is to conceal the art" (2019).
- **The hybrid kit.** "A hybrid kit of half electric/half acoustic", "an
  'internal' acoustic kit which is fairly conventional", about eleven Simmons
  pads, "pitchable", "dictating some of the way King Crimson is going". "The
  sticks that used to be between two sound sources of cymbal and snare,
  perhaps are now between four" (1983).

DRUM! (Natelli, 2012) on the sound and the hands:

- **The snare.** "A sort of dry, punchy bonk" on _Fragile_: rimshots about
  halfway between the centre and the rim, the head "fairly tight", Ludwig
  Supra-Phonics and Supersensitives; "I just let my drums ring, and those
  harmonics are part of the music." His own page: the snare tight, the bottom
  head a little tighter than the top.
- **The kick** a sixteenth before the backbeat; ghosted breakbeat grooves in
  Yours Is No Disgrace and Siberian Khatru.
- **Paradiddles** for 7/4 phrases; the paradiddle-diddle in Heart of the
  Sunrise and Easy Money; Beelzebub in 9/8. Single-stroke sextuplets as fill
  texture.

**Kit.** From his own equipment page, by era:

- **1971–72:** Hayman in "natural pine", a Ludwig Supraphonic or a wood Hayman
  snare, Paiste Giant Beat hats and 602s, a cowbell.
- **1972–75:** Ludwig and Hayman in natural wood, a 14x6.5 Ludwig
  Supersensitive, Paiste 2002 and 602, tuned gongs, woodblock, cowbells, metal
  plates.
- **1977–80:** Remo Roto Toms beside the Hayman and Ludwig, a 20-inch 2002
  China.
- **1981–84:** a Tama Superstar (light blue, then natural birch) inside a frame
  of Simmons pads (SDS5, then SDS7), a 14-inch Roto Tom, a 22-inch Tama gong
  drum, octobans ("Dragon Drums actually", 1983), a slit drum.
- **Later:** Simmons SDX with Earthworks to 1998; Tama Starclassic; Paiste.

**Devices (schema 1.5).** Four hold:

- **Polymeter, in the groove** (verified): Long Distance Runaround's verse, the
  hat in eighths and the snare on every fifth of them, round to the 1 every
  five bars. "A half-time groove with a snare backbeat every fifth hi-hat
  stroke" (Nate Brown's transcription at OnlineDrummer); "quintuple snare above
  quadruple time" (Society for Music Theory forum). The human tab spells it bar
  for bar.
- **Polymeter, in the groove** (verified): Discipline's phrase of 17
  sixteenths against quarter notes on the bass drum (DRUM!), "the flag tune of
  that idea" (1983).
- **Cross-rhythm 3:2, in fills** (likely): a single-stroke sextuplet figure
  orchestrated round the toms and ride on Red and One More Red Nightmare
  (DRUM!, Ex. 5). The text does not say groove or fill, and Ex. 5's notation
  was not read; it is filed under fills because DRUM! calls his sextuplets fill
  material.
- **Displacement, in the groove** (verified): the backbeat moved a couple of
  times in a row in Sample and Hold (New York radio, 1979), and his own word for
  his snare, "placement".

A `devices_search` records what was read and the leads that did not hold:

- **Siberian Khatru:** the backbeat kept on 2 and 4 through a riff of fifteen
  quarters. An odd meter, with the backbeat kept.
- **Larks' Tongues Part Two's 8/8 bars:** the snare on the dotted quarters,
  3+3+2 inside one bar. A grouping that does not cross the bar.
- **Frame by Frame's "polymeter"** (the tab's own marker): the guitars' 7/8
  against 13/8; the drums are in 7/8 with the band.
- **Heart of the Sunrise:** sextuplets against sixteenths, a change of
  subdivision.

**What the style encodes.**

- **ghostBias:** low (0.3). The tabs write his ghosts where he plays them, on
  the "a" of 2 and 4 and between the accents; Thela Hun Ginjeet takes none,
  because its hands already fill every sixteenth.
- **rimshot:** 0.35, for the off-centre rimshot.
- **Swing:** none. Every rock and fusion record here is straight.
- **Feel:** each song in its own meters: 4/4, 6/4, 3/4, 10/8 (as 5/4), 5/8,
  6/8, 7/8, 7/4. The snare placed: the backbeat moved to the "and" or the "e",
  or every fifth eighth.
- **Fills:** short, at the phrase's end, as the tabs have them. The tabs' rolls
  of four sixteenths or more on the snare are held to threes (a note left out),
  as the critic holds a snare run, and In the Dead of Night's tom rolls too, to
  play at the record's 154.
- **Poly fills:** none (D56). The 3:2 is sourced only from DRUM!'s text, its
  notation unread: a fill written from it would be guessed. His other devices
  are in the groove, and the songs write them as figures (Long Distance
  Runaround's fives as a `crossRhythms` cycle every ten sixteenths).
- **Kit:** `police`, the DRS kit with its snare played faster: tight and
  ringing like the Supersensitive and the Tama steel snare, with its Paiste
  ride and crash. Every song is on it; no song is on a synthesised kit. The
  Simmons pads of the 1980s are not here: on Discipline the groove's kick,
  snare and hat foot were acoustic, and only Thela Hun Ginjeet's second hand
  voice may have been a pad (not settled).

**The songs.**

Every song is written in sections in the record's order (A, B, C…, at most 32
distinct bars, an arrangement of at most 32 slots). Every tab is human
(`aiGenerated: false` through the meta API); every tempo was checked against
the record by onset autocorrelation (`acf.py`; `beats.py` only followed its
prior here) and, where the tab has a tempo map, against its length.

| Song                              | Year | Tempo (quarter)                                                            | Meter                     | What defines it                                                                                                  | Source of the bars                  |
| --------------------------------- | ---- | -------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Roundabout                        | 1971 | 133 (tab; record 133.9 and 133.8)                                          | 4/4, 6/4                  | the hat in eighths, a ghost on the "a" of 2 and 4; the chorus in quarters; the middle's ghosts against an agogo  | Songsterr 20807 (human)             |
| Long Distance Runaround           | 1971 | 88, the ride parts at 176 (tab; record 90/180, length 212.7 s against 210) | 4/4, two sections at ×2   | the snare on every fifth eighth over the hat, five bars round; the ride on the quarters, the backbeat moved      | Songsterr 21367 (human)             |
| Siberian Khatru                   | 1972 | 108→132 (tab map); record 121 rising to 132.5; one tempo 118–126           | 4/4 and 3/4 (15 quarters) | the backbeat kept through the riff's fifteen quarters; the hat foot on every beat; a tambourine in sixteenths    | Songsterr 21345 (human, no markers) |
| Larks' Tongues in Aspic, Part Two | 1973 | 113 (tab); record 110.5–114.6                                              | 10/8 as 5/4, 8/8 as 4/4   | the riff in 10/8, the snare on its accents, ride and hat foot on the quarters; the hat foot alone; the floor tom | Songsterr 469026 (human)            |
| Red                               | 1974 | 90 then 88 (tab); record 87.1, 86.6                                        | 5/8, 6/8, 4/4, 7/8        | the intro in 5/8 and 6/8 with tom runs; the ride in eighths; the china over 7/8; the bell in sixteenths          | Songsterr 40562 (human)             |
| In the Dead of Night              | 1978 | 154 (tab; record 154.8)                                                    | 7/4, 4/4, 5/8             | the hat on the "and"s and the snare moved round 7/4; the chorus's 4/4 and 5/8; the solo's snare on 2, 5 and 7    | Songsterr 453581 (human)            |
| Thela Hun Ginjeet                 | 1981 | 130 (tab; record 65.5 = 131/2)                                             | 4/4                       | four on the floor, the hands in sixteenths between snare and a tom, no cymbal                                    | Songsterr 574351 (human)            |

What each song leaves out, in its comment: Roundabout's 2/4 bars in the
pre-chorus and chorus (a figure holds 32 steps, so neither cycle of 14 quarters
fits), its prelude, interludes and outro; Long Distance Runaround's 3/4 bar;
Siberian Khatru's 7/8 and 2/4 bars and its solo fills; Larks' Tongues' middle
part (8/4, 13/8, 7/8) and its 11/8 bars; Red's second pass of each pre-chorus
and the cello interlude; In the Dead of Night's last two chorus rounds of five
and its guiro; Thela Hun Ginjeet's 2/4 bar.

Tried and dropped:

- **Heart of the Sunrise** (1971): Songsterr 21366 (human), 372 bars that run
  through 4/4, 6/8, 5/4, 6/4, 3/4 and 9/8, the intro's sixteenths regrouped
  bar by bar. The arrangement's 32 slots hold a fraction of it in order; left
  for a later pass.
- **Frame by Frame** (1981): Songsterr 40549 (human). Its chorus is linear
  sixteenths at 157 (record 156.6), and a run of four or more sixteenths holds
  a song to 150; thinning the groove would not be the groove.
- **One More Red Nightmare** (1974): Songsterr 40564 (human), listed, not read;
  Red stands for that record.
- **Hell's Bells, Beelzebub, Sample and Hold, Gothic 17** (Bruford, 1978–80):
  only machine tabs. **Joe Frazier** (1980): a human tab with no markers, an
  unnamed track and a plain backbeat throughout, not trusted.
- **Earthworks:** no tab and no transcription read.

**Sources.**

- Wikipedia: Bill Bruford; Fragile; Close to the Edge; Larks' Tongues in Aspic;
  Red; Discipline; U.K. (album) (through a search summary).
- Bill Bruford, "Equipment", billbruford.com.
- John Natelli, "10 Ways To Sound Like Bill Bruford", DRUM!, 22 November 2012.
- Scott K. Fish, "Bill Bruford", Modern Drummer, July 1983 (Elephant Talk
  transcript).
- Saku Mantere, "A Conversation With Bill Bruford. Part One: Drumming",
  Pienemmät Purot, 11 May 2019.
- Eoghan Lyng, "King Crimson's Bill Bruford names his favourite drummers", Far
  Out, 28 April 2022.
- Nate Brown, "Long Distance Runaround" drum sheet music (OnlineDrummer), its
  description; the Society for Music Theory forum on the same song.
- Songsterr human drum tabs: Roundabout (20807), Long Distance Runaround
  (21367), Siberian Khatru (21345), Larks' Tongues in Aspic Pt. Two (469026),
  Red (40562), In the Dead of Night (453581), Thela Hun Ginjeet (574351); read
  and dropped: Heart of the Sunrise (21366), Frame by Frame (40549).
- The records, for tempo: Yes, 2008 remasters (YouTube LuGAWR2eRyQ,
  ZS-k02hf-hI, 2mTPwM4nFw0); King Crimson (jX0caf1HvNs, aXTCDB70Qgo,
  nOrYTBaT1z0, 2HL-gGLu8Jo); U.K. (MAzm-nQTw9g).
- King Crimson at the Arènes de Fréjus, 27 August 1982 (_The Noise_), YouTube
  JrwXnhAUtnk: watched for the likeness.

## BI. Ian Paice (2026-10-18)

The `paice` style plays **songs** the way `downey` (AQ) and `peart` (BE) do:
each New picks one of his records, and its tempo, meter and grooves come with
it. His record (`drummer-model/drummers/ian-paice.json`, schema 1.5) is new,
written from this section, with seven Deep Purple recordings and
`sources/ian-paice.json`. One record already named him as a stub
(`drummer:ian-paice`), and the new one agrees with it:

- **Buddy Rich:** `influenced` him (Rich's record, from Wikipedia). Paice's own
  words say the same (below).

**Which records are his.** Ian Anderson Paice was born on 29 June 1948 in
Nottingham, spent his early years in Germany and grew up in Bicester, near
Oxford (Wikipedia). He began on the violin, which he could not play: "I
flogged the violin and found a tom-tom and some old biscuits tins" (Melody
Maker, 1971, quoted by uDiscover). A £32 kit at 15, and he played along with
his father, a pianist, in waltzes and quicksteps, "a wee bit insipid, but it
was a start", then in his father's dance band. Then Georgie and the
Rave-Ons (later the Shindigs) and, from 1966, the Maze (first called MI5)
with Rod Evans; Ritchie Blackmore knew him from the Maze's Hamburg gigs.

In early 1968, at 19, he was chosen on the spot to replace Bobby Woodman in
the new Deep Purple (Wikipedia, Shades of Deep Purple). He is the only member
in every line-up and on every record:

- **Mark I** (1968–1969, Evans and Nick Simper): _Shades of Deep Purple_
  (Pye Studios, 11–13 May 1968; Hush, No. 4 in the US).
- **Mark II** (1969–1973, Ian Gillan and Roger Glover): _In Rock_ (1970),
  the single Black Night (No. 2 in the UK), _Fireball_ (1971), _Machine Head_
  (Montreux, December 1971), _Made in Japan_.
- **Mark III and IV** (1973–1976, David Coverdale and Glenn Hughes, then
  Tommy Bolin): _Burn_ (November 1973), _Stormbringer_, _Come Taste the Band_.
- Between Purples: Paice Ashton Lord (1976–1978), Whitesnake (1979–1982),
  Gary Moore (1982–1984); sessions for the Velvet Underground's _Squeeze_,
  George Harrison and Paul McCartney's _Run Devil Run_.
- **From 1984**: Mark II again on _Perfect Strangers_, and Deep Purple since.
  The Rock and Roll Hall of Fame with the band in 2016; a transient ischaemic
  attack that June, with no lasting damage.

**How he played.** His own account, in two interviews thirty years apart:

- **Big band in a rock band.** "I'm playing big band music in a rock 'n'
  roll context. That inherent swing and feel harkens back to those days"
  (Modern Drummer, Micallef, 2020). His influences were "mainstream and big
  band jazz", and "Buddy Rich was a big influence on me; of all the big band
  drummers he stood out head and shoulders" (Rhythm, Welch, c. 1995).
- **Push and pull.** "My bass drum is on the beat, or maybe even slightly
  ahead, but my backbeat—the snare drum—is behind it" (2020). The style's
  `feel` says it: the kick a hair early, the snare later.
- **Singles.** "If you can play singles right, everything else comes easy.
  Doubles are a doddle." Of Rich's single-stroke roll: "I can do that roll
  at the same speed, but I can't keep it going anywhere near as long." "Go on
  threes." "All my knowledge of rudiments is self taught" (c. 1995).
  Wikipedia: "extremely fast and smooth single and double-stroke rolls".
- **The head, not the rim.** "Sometimes you can play quieter in the middle of
  the head, which gives a much bigger impression than slamming a rimshot";
  "I want the cymbals to ring" (2020). So `rimshot` is low (0.2).
- **Left-handed.** "Primarily left-handed", on a mirrored kit, matched grip
  (Wikipedia; Bonedo). The California Jam film shows the floor toms on his
  left. A mirrored kit leads his fills from the high tom as a right-hander's
  do, so the style needs no `fillOrder`; the 3D kit cannot mirror.
- **One bass drum.** He prefers one, a 26-inch on stage, and plays on it what
  others use two for. Fireball is the exception: "a rare instance of Ian Paice
  playing a double-bass drum", the encore live so the crew could add the
  second (Wikipedia, the song). Simon Poole (2025, abstract only) hears that
  intro as a template for Simon Phillips on _Sin After Sin_ and Phil Taylor on
  _Overkill_.

Wikipedia lists his influences as Gene Krupa, Buddy Rich, Bobby Elliott,
Ringo Starr and Charles Connor, later Carmine Appice, Ginger Baker and Mitch
Mitchell (Bonedo adds Bonham, and ties his 26-inch bass drum to Appice), and
those he influenced as Clive Burr, Mikkey Dee, Virgil Donati, Dave Grohl, Gary
James, Simon Phillips and Matt Starr; the record carries the drummers among
them, at `likely`, as Wikipedia's sources were not read. Lars Ulrich's Rock
Hall speech (2016) praises "little Ian Paice, a rock & roll cocktail of hair,
sweat, spit and position" wiping "the steam off his glasses", but does not
call him an influence; Ulrich is left out.

**Kit.** A Ludwig in Black Oyster Pearl to about 1971 (22x14, 13x9, 16x16 and
a 14x5 Supraphonic, later an 18x16 floor tom), Zildjian; a Ludwig in Silver
Sparkle from about 1971, on _Machine Head_, and Paiste from about then, the
2002 series his trademark; later a Ludwig with a 26x18 bass drum, 16x10, 18x16
and 20x18, and a 14x6.5 Supraphonic; Pearl from 1982 (Bonedo; Wikipedia). On
_Fireball_ and _Machine Head_ the kit was set up in a corridor, which he
thought sounded better than a studio (Wikipedia, Machine Head). The style's
kit is `bigrusty` (a damped 24-inch kick and a wooden snare played hard, a
wash of cymbal: the nearest pack kit to a big 1970s Ludwig and ringing
Paiste); Hush plays `sixties` (a 1960s Ludwig, as his Black Oyster Pearl
kit), Perfect Strangers `bigRoom` (the 1984 record's bigger room). No freely
licensed samples of his own kit were found.

**Devices (schema 1.5).** One holds: Black Night's riff turns on two bars of
quarter-note triplets, the kick and the hat by turns, six to the bar each,
under the snare on 1 and 3: a 3:2 cross-rhythm in the groove (Songsterr 23516,
read on a sextuplet grid). Not devices: Perfect Strangers' chorus, bars of
4/4 and 5/4 by turns (odd meter); Fireball's snare in 3+3+2 over the bass
drums inside one bar (a grouping with no cross pulse); Burn's accents on the
beat and the "a" (inside the beat). As the device is in the groove, the style
has no `polyFills`.

**What the style encodes.** Straight time (`swing: 0`) with the kick on top
and the backbeat behind; open hats in quarters under the riff (`hats: 8`,
`opens: 1`); few ghosts (`ghostBias: 0.3`, where Smoke on the Water has them);
the crash pushed onto the "and" of 4 (`anticipate: 0.15`); fills at phrase
ends and a quarter of the time inside it (`midFills: 0.25`); weight 0.85, a
heavy rock stroke.

**Fast singles and the critic.** BeatBreaker's critic calls four sixteenths
in a row on the snare unplayable, and `playableBpm` holds any figure or fill
with four notes on consecutive steps to ten notes a second (150 in sixteenths).
His fills at 171 and 188 are runs of sixteenths, so the songs write them in
threes, leaving out the "e" of each beat (the accent, the "and" and the "a"),
as Grohl's Breed and Territorial Pissings do (BD). Smoke on the Water's snare
under the solo, every sixteenth at 115, is written the same way. The record's
patterns keep the tabs' bars whole.

**The songs.** Eight, 1968 to 1984, from human Songsterr tabs read section by
section, each tab's length at its tempo checked against the record's.

| Song               | Year | Tempo (quarter)                                                          | Meter                           | What defines it                                                                                                                     | Source of the bars                  |
| ------------------ | ---- | ------------------------------------------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Hush               | 1968 | 109 (tab; 115 bars run 4:13 against 4:24 and the fade)                   | 4/4                             | open hats in quarters over a busy kick; the snare on every beat under the ride for the "na na na" bars; both toms in sixteenths     | Songsterr 6134 (human)              |
| Speed King         | 1970 | 196 (tab); the free intro left out                                       | 4/4 in eighths (4/4-8)          | the second crash in quarters at full tilt; the ride and a wandering cross-stick under the duel; open hats under the harmony guitars | Songsterr 5568 (human)              |
| Black Night        | 1970 | 136 (tab; 115 bars run 3:23)                                             | 4/4 in sextuplets (4/4-6)       | the kick with the riff in eighths; the riff's turn in quarter-note triplets, the snare on 1 and 3; triplets down the toms           | Songsterr 23516 (human)             |
| Fireball           | 1971 | 240 (tab; 202 bars run 3:22 against 3:24; the record beat-tracks at 120) | 4/4 in eighths (4/4-8)          | two bass drums in eighths; the ride's bell in quarters; the snare in 3+3+2 in the intro                                             | Songsterr 29173 (human)             |
| Highway Star       | 1972 | 171 (tab; 259 bars run 6:03 against 6:05)                                | 4/4                             | the snare in eighths over the hat foot; open hats in quarters; the crash pushed onto the "and" of 4; the ride under both solos      | Songsterr 490 (human)               |
| Smoke on the Water | 1972 | 114–117 (tab; 163 bars run 5:40, the album's length)                     | 4/4                             | the hats in sixteenths; the hat half open on the beats, the foot on the "and"s, ghosts; the snare in sixteenths under the solo      | Songsterr 329 (human)               |
| Burn               | 1974 | 188 (tab; about 6:10 against 6:00 and the closing ritardando)            | 4/4                             | the riff over the hat foot; a groove bar and a bar of the snare in sixteenths by turns in the verse; the ride under the solos       | Songsterr 6383 (human)              |
| Perfect Strangers  | 1984 | 98 (tab; 123 bars run 5:13 against 5:31 and the fade)                    | 4/4 and 5/4 (sections by turns) | open hats in eighths; a 5/4 bar after each 4/4 bar in the chorus, ending on the snare                                               | Songsterr 22502 (human, no markers) |

Each song is in sections in the record's order (intro, verse, chorus,
solos, outro) within 32 bars and 32 slots; a long solo is cut to a few
repeats of its section, as the song comments say.

Tried and left out:

- **Lazy** (1972): Songsterr 5465 (human) writes its solos' ride in straight
  eighths at 185, the organ intro over the hat foot alone; the record is
  heard as a fast shuffle. Measure its swing before writing it.
- **Pictures of Home** (1972): Songsterr 6132 (human, 2023) is unmarked and
  off the sixteenth grid in most bars; its drum intro was cut from the
  original release (Wikipedia, Machine Head).
- **Child in Time**, **Space Truckin'**, **Stormbringer**: not read this pass.

**Sources.**

- Wikipedia: Ian Paice; Shades of Deep Purple; Deep Purple in Rock; Fireball
  (Deep Purple song); Machine Head (album); Burn (Deep Purple album); Perfect
  Strangers (Deep Purple album).
- Ken Micallef, "Deep Purple's Ian Paice", Modern Drummer, 1 September 2020.
- Chris Welch, Ian Paice interview, Rhythm (c. late 1995), at The Highway
  Star.
- Lars-Oliver Horl, "Die besten Drummer der Welt: Ian Paice (Deep Purple)",
  Bonedo, 8 March 2026.
- Paul Sexton, "The Man Who Sets the Paice for Purple", uDiscover Music, 28
  June 2014.
- Simon Poole, "Speed King: Setting the Paice", in _Who Do We Think They
  Are? Deep Purple and Metal Studies_ (Equinox, 2025): the abstract.
- Lars Ulrich's Rock Hall induction of Deep Purple, deeppurple.com, 9 April 2016.
- Songsterr human drum tabs: Hush (6134), Speed King (5568), Black Night
  (23516), Fireball (29173), Highway Star (490), Smoke on the Water (329),
  Burn (6383), Perfect Strangers (22502).
- Deep Purple, "Burn", California Jam, 6 April 1974 (ABC In Concert), YouTube
  oxJT5PhP40k: watched for the likeness; "Highway Star", Copenhagen, 1972, YouTube
  uzOWAnyyJLU (black and white): the Silver Sparkle kit.

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
- https://en.wikipedia.org/wiki/Ari_Hoenig
- http://www.drummerworld.com/drummers/Ari_Hoenig.html
- https://www.moderndrummer.com/2012/10/metric-modulations-contracting-review/
- https://gspguitar.com/intro-to-polyrhythms-volume-1.html
- https://arihoenig.bandcamp.com/merch/book-metric-modulations-vol-2
- https://arihoenig.bandcamp.com/merch/book-intro-to-polyrhythms
- https://www.arihoenig.com/services-2
- https://news.allaboutjazz.com/ari-hoenig-set-to-release-berts-playground-in-september.php
- https://www.allaboutjazz.com/berts-playground-ari-hoenig-dreyfus-records-review-by-elliott-simon
- https://www.allaboutjazz.com/inversations-ari-hoenig-dreyfus-records-review-by-j-hunter
- https://www.popmatters.com/ari-hoenig-inversations-2495791474.html
- https://www.allaboutjazz.com/lines-of-oppression-ari-hoenig-self-produced-review-by-john-kelman
- https://jazztimes.com/reviews/albums/ari-hoenig-lines-of-oppression/
- https://arihoenig.bandcamp.com/album/lines-of-oppression
- http://diy-drummer.blogspot.com/2015/01/ari-hoenig-stuff-part-1.html
- https://www.freshsoundrecords.com/ari-hoenig-albums/6682-ny-standard.html
- https://www.allsolos.com/soloist/279/ari-hoenig
- https://www.freshsoundrecords.com/ari-hoenig-albums/46955-conner-s-days-digifile.html
- https://www.wbgo.org/post/checkout-ari-hoenigs-musical-magic-tricks
- https://news.allaboutjazz.com/hes-got-rhythm-of-every-variety.php
- https://www.allaboutjazz.com/the-solo-recordings-of-ari-hoenig-ari-hoenig-by-david-a-orthmann
- https://thisisjazz.com/interview-with-ari-hoenig/
- https://thedrumclick.com/2025/06/11/big-fat-five-ari-hoenig-drummer-educator-shares-his-most-influential-records/
- https://en.wikipedia.org/wiki/Max_Roach
- https://www.npr.org/2007/08/16/12862395/remembering-max-roach-rhythmic-innovator
- https://pas.org/max-roach/
- https://drummagazine.com/steve-smith-on-the-art-history-of-drum-soloing/
- https://bangthedrumschool.com/the-drum-also-waltzes-independence-exercises-part-1/
- https://bangthedrumschool.com/the-drum-also-waltzes-independence-part-3/
- https://webusers.imj-prg.fr/~antoine.chambert-loir/Musique/MaxRoach100.html
- https://rucore.libraries.rutgers.edu/rutgers-lib/65413/record/
- https://www.researchcatalogue.net/view/1059912/1059913
- https://www.learnjazzstandards.com/blog/learning-jazz/drums/learning-solo-style-max-roach/
- https://jazz.com/dozens/the-dozens-nasheet-waits-selects-classic-max-roach-tracks
- https://slate.com/culture/2007/08/why-max-roach-was-jazz-s-greatest-drummer.html
- https://steveboudreaumusic.com/blogs/boud-for-thought/posts/bud-powell-un-poco-loco
- https://practicingdrummer.com/max-roach-drum-clinic/
- https://scottkfish.com/2016/09/24/max-roach-the-quarter-note-is-the-common-denominator/
- https://cruiseshipdrummer.com/2022/05/16/max-on-the-bass-drum/
- https://cruiseshipdrummer.com/2012/07/07/transcription-blue-seven/
- https://cruiseshipdrummer.com/2023/05/02/transcription-max-comping/
- https://cruiseshipdrummer.com/2023/05/07/transcription-max-soloing/
- https://cruiseshipdrummer.com/2023/05/10/transcription-max-fours/
- https://cruiseshipdrummer.com/2020/03/18/transcription-max-roach-comping/
- https://cruiseshipdrummer.com/2013/10/13/how-to-play-jordu/
- https://shipdrummer.blogspot.com/2011/04/transcription-max-roach-garveys-ghost.html
- https://cruiseshipdrummer.com/2019/07/20/maxs-rubadub-transcribed-phrases/
- https://cruiseshipdrummer.com/2019/08/21/maxs-rubadub-cells/
- https://cruiseshipdrummer.com/2017/01/10/practice-loop-max-in-5/
- https://cruiseshipdrummer.com/2020/07/27/transcription-more-max-roach-comping/
- https://www.allsolos.com/solo/2514/max-roach-drums-solo-on-valse-hot
- https://drumsetsheetmusic.com/products/the-drum-also-waltzes-max-roach-full-drum-transcription-drum-sheet-music-drumeo
- https://en.wikipedia.org/wiki/Ko-Ko
- https://en.wikipedia.org/wiki/Clifford_Brown_%26_Max_Roach
- https://en.wikipedia.org/wiki/Clifford_Brown_and_Max_Roach_at_Basin_Street
- https://en.wikipedia.org/wiki/Sonny_Rollins_Plus_4
- https://en.wikipedia.org/wiki/Saxophone_Colossus
- https://en.wikipedia.org/wiki/Jazz_in_3/4_Time
- https://www.freshsoundrecords.com/sonny-clark-albums/3539-sonny-clark-trio.html
- https://en.wikipedia.org/wiki/The_Many_Sides_of_Max
- https://en.wikipedia.org/wiki/Drums_Unlimited
- https://en.wikipedia.org/wiki/We_Insist!
- https://bpb-us-e1.wpmucdn.com/sites.tufts.edu/dist/f/838/files/2012/01/Agbadza-Critical-Edition-final-DL1.pdf
- https://journal.iftawm.org/wp-content/uploads/2022/02/Locke_AAWM_Vol_1_1.pdf
- https://mtosmt.org/issues/mto.10.16.4/mto.10.16.4.locke.html
- https://mtosmt.org/issues/mto.10.16.4/mto.10.16.4.burns.html
- https://web.archive.org/web/20121123000209/https://home.comcast.net/~dzinyaladzekpo/SixFour.html
- https://en.wikipedia.org/wiki/Agbekor
- https://en.wikipedia.org/wiki/Ewe_music
- https://en.wikipedia.org/wiki/Ewe_drumming
- https://en.wikipedia.org/wiki/Bell_pattern
- https://web.uvic.ca/~aschloss/course_mat/MU320/Global%20Rhtyhm%20and%20Human%20Consciousness/quiz1.html
- https://www.shs-conferences.org/articles/shsconf/pdf/2021/13/shsconf_etltc2021_05001.pdf
- https://www.amazon.com/African-Rhythms-Drumset-Royal-Hartigan/dp/0897247329
- https://en.wikipedia.org/wiki/Mozambique_(music)
- https://commons.wikimedia.org/wiki/File:Mozambique_primary_bell_pattern.mid
- https://commons.wikimedia.org/wiki/File:Nyc_mozambique.tif
- https://commons.wikimedia.org/wiki/File:2-3_songo.tif
- https://cruiseshipdrummer.com/?p=2717
- https://cruiseshipdrummer.com/?p=1856
- https://www.notsomoderndrummer.com/not-so-modern-drummer/2019/4/18/outlining-a-simple-technical-trick
- https://www.alfred.com/afro-cuban-rhythms-for-drumset/p/00-MMBK0001CD/
- https://api.deezer.com/track/65040756
- https://api.deezer.com/track/65040748
- https://api.deezer.com/track/6599449
- https://en.wikipedia.org/wiki/Gavin_Harrison
- https://moderndrummer.com/2004/05/gavin-harrison-2/
- https://moderndrummer.com/2006/12/gavin-harrison/
- https://www.moderndrummer.com/?p=3340
- https://www.bonedo.de/artikel/schlagzeug-workshop-ungerade-metren-odd-meter-wwww-bonedo-de/
- https://www.drumeo.com/beat/?p=7919
- https://www.drumeo.com/beat/?p=7967
- https://pwrwindows.2112.net/transcripts/20140300rhythmiccomposition.htm
- https://drummerszone.com/music/release/9137/rhythmic-composition
- https://hudsonmusic.com/?p=1982
- https://popmatters.com/192918-the-rhythmic-redesign-of-porcupine-tree-an-interview-with-gavin-harr-2495535936.html
- https://www.guitarguitar.co.uk/news/140582
- https://www.mediatheque.be/collection/rhythmic-illusions-by-gavin-harrison-u%209767
- https://www.bonedo.de/artikel/interview-gavin-harrison-immer-wieder-neugierig
- https://www.bonedo.de/artikel/gavin-harrison-versteigert-sein-langjaehriges-porcupine-tree-tour-und-recording-schlagzeug-fuer-einen-guten-zweck/
- https://www.sonor.com/drums/artists/artists-detail/gavin-harrison
- https://www.songsterr.com/a/wa/song?id=15884
- https://www.songsterr.com/a/wa/song?id=16042
- https://www.songsterr.com/a/wa/song?id=15089
- https://www.songsterr.com/a/wa/song?id=15172
- https://www.songsterr.com/a/wa/song?id=644873
- https://www.songsterr.com/a/wa/song?id=50753
- https://www.songsterr.com/a/wa/song?id=50744
- https://www.songsterr.com/a/wa/song?id=581744
- https://www.songsterr.com/a/wa/song?id=50736
- https://www.songsterr.com/a/wa/song?id=50732
- https://taju.uniarts.fi/bitstreams/2143c5e6-322d-4d61-add5-e9257b759e63/download
- https://cruiseshipdrummer.com/2021/04/16/transcription-roy-haynes-its-time/
- https://cruiseshipdrummer.com/2017/02/26/transcription-roy-haynes-bad-news-blues/
- https://cruiseshipdrummer.com/2020/05/10/transcription-roy-haynes-comping/
- https://cruiseshipdrummer.com/?p=1168
- https://cruiseshipdrummer.com/2021/09/05/transcription-roy-haynes-feature/
- https://tedpanken.wordpress.com/2012/03/13/a-2007-jazziz-article-and-four-interviews-with-roy-haynes-who-turns-87-today/
- https://pas.org/roy-haynes/
- https://pas.org/pas-blog/pas-playlist-roy-haynes/
- https://www.moderndrummer.com/2004/05/roy-haynes/
- https://scottkfish.com/2020/05/14/roy-haynes-on-papa-jo-jones-1986/
- https://scottkfish.com/2020/09/23/drummers-shortcomings-lead-to-innovations-pt-2-roy-haynes/
- https://iverson.substack.com/p/tt-454-farewell-to-roy-haynes
- https://jazz.com/music/roy-haynes-snap-crackle
- https://en.wikipedia.org/wiki/Roy_Haynes
- https://en.wikipedia.org/wiki/Now_He_Sings,_Now_He_Sobs
- https://en.wikipedia.org/wiki/It%27s_Time!_(Jackie_McLean_album)
- https://en.wikipedia.org/wiki/Cracklin%27
- https://en.wikipedia.org/wiki/Cleopatra_Feelin%27_Jazzy
- https://en.wikipedia.org/wiki/Out_of_the_Afternoon
- https://songbpm.com/@chick-corea/windows
- https://zedem.ca/products/yamaha-ltd-roy-haynes-signature-hand-hammered-copper-snare-drum-5-5-inches-x-14-inches
- https://cruiseshipdrummer.com/2021/08/01/transcription-jack-dejohnette-directions
- https://cruiseshipdrummer.com/?p=940
- https://cruiseshipdrummer.com/2022/03/26/groove-o-the-day-jack-dejohnette-polar-ac/
- https://cruiseshipdrummer.com/2022/01/18/groove-o-the-day-jack-dejohnette-soft-blue/
- https://cruiseshipdrummer.com/?p=1764
- https://cruiseshipdrummer.com/2021/10/13/groove-o-the-day-jack-dejohnette-fiesta/
- https://cruiseshipdrummer.com/2022/08/08/transcription-jack-dejohnette-gentle-rain/
- https://cruiseshipdrummer.com/2025/08/28/transcription-jack-dejohnette-on-green-dolphin-st/
- https://cruiseshipdrummer.com/2025/01/13/groove-o-the-day-jack-dejohnette-47th-groove/
- https://cruiseshipdrummer.com/2018/09/20/transcription-jack-dejohnette-timeless/
- https://cruiseshipdrummer.com/2022/04/04/best-books-the-art-of-modern-jazz-drumming-dejohnette-perry/
- https://stfx.scholaris.ca/server/api/core/bitstreams/de017937-1d32-45c2-b022-13139804cf35/content
- https://stfx.scholaris.ca/server/api/core/bitstreams/6eb2d069-25be-4a14-85f0-d214612b556a/content
- https://pas.org/jack-dejohnette/
- https://www.wunc.org/2025-10-27/jack-dejohnette-dynamic-and-instantly-recognizable-jazz-drummer-dies-at-83
- https://en.wikipedia.org/wiki/Jack_DeJohnette
- https://en.wikipedia.org/wiki/Polar_AC
- https://jazzjournal.co.uk/2021/03/30/jj-03-81-jack-of-clubs-dejohnette-drum-clinic-at-ronnies/
- https://jazzjournal.co.uk/2025/10/28/jack-dejohnette-and-drumming-thats-what-i-came-here-to-do/
- https://www.berklee.edu/president/news/jack-dejohnette-influential-drummer-and-mentor-visits-berklee
- https://chordu.com/chords-tabs-antonio-sanchez-gathering-sky-lesson-id_hgElpSXNwK4
- https://www.creators.com/read/pop-talk/09/08/antonio-sanchezs-jazz-is-a-beat-or-two-ahead-of-the-pack
- https://www.moderndrummer.com/?p=3269
- https://www.moderndrummer.com/?p=59641
- https://hudsonmusic.com/product/master-series-antonio-sanchez/
- https://drummagazine.com/antonio-sanchez-talks-about-his-new-album-bad-hombre/
- https://drummagazine.com/5-pieces-of-gear-antonio-sanchezs-essential-cymbals/
- https://www.bonedo.de/artikel/interview-mit-antonio-sanchez-jeder-musiker-sollte-ein-bisschen-schlagzeug-spielen
- https://www.berklee.edu/berklee-today/spring-2003/antonio-sanchez
- https://15questions.net/interview/antonio-sanchez-about-drums-drumming/
- https://en.wikipedia.org/wiki/Antonio_S%C3%A1nchez_(drummer)
- https://en.wikipedia.org/wiki/Speaking_of_Now
- https://en.wikipedia.org/wiki/Migration_(Antonio_S%C3%A1nchez_album)
- https://www.songsterr.com/a/wa/song?id=3523898
- https://www.songsterr.com/a/wa/song?id=4251855
- https://www.songsterr.com/a/wa/song?id=3929744
- https://www.vinniecolaiuta.com/Interviews/ModernDrummer1993
- https://www.vinniecolaiuta.com/Interviews/ModernDrummer1982
- https://www.vinniecolaiuta.com/Interviews/ModernDrummer1987
- https://www.vinniecolaiuta.com/Interviews/Pas1995
- https://www.vinniecolaiuta.com/Interviews/Berklee2001
- https://www.vinniecolaiuta.com/Interviews/ModernDrummer2021
- https://en.wikipedia.org/wiki/Vinnie_Colaiuta
- https://en.wikipedia.org/wiki/Seven_Days_(Sting_song)
- https://www.bonedo.de/?p=202630
- https://www.bonedo.de/?p=2755934
- https://thedrumninja.com/how-to-play-love-is-stronger-than-justice-drums/
- https://www.moderndrummer.com/?p=126337
- https://www.songsterr.com/a/wa/song?id=422388
- https://www.songsterr.com/a/wa/song?id=3779971
- https://www.songsterr.com/a/wa/song?id=19407
- https://www.songsterr.com/a/wa/song?id=22055
- https://www.songsterr.com/a/wa/song?id=397226
- https://www.songsterr.com/a/wa/song?id=604777
- https://en.wikipedia.org/wiki/Terry_Bozzio
- https://en.wikipedia.org/wiki/The_Black_Page
- https://en.wikipedia.org/wiki/Spring_Session_M
- https://en.wikipedia.org/wiki/Danger_Money
- https://archive.org/stream/modern-drummer-issue-62/md62cs_djvu.txt
- https://drummercafe.com/featured/drummer-percussionist/terry-bozzio.html
- https://sabian.com/?p=2611
- https://drummagazine.com/terry-bozzio-an-interview-from-the-vault-part/
- https://scottkfish.com/2014/08/27/terry-bozzio-the-evolution-of-his-giant-sculpture/
- https://glassonyonpr.com/2014/08/29/rolling-stone-interview-with-terry-bozzio/
- https://cruiseshipdrummer.com/2017/02/06/transcription-terry-bozzio-dancin-fool-the-cool-parts/
- https://theprogressiveaspect.net/blog/2019/09/06/u-k-danger-money/
- https://www.alfred.com/terry-bozzio-melodic-drumming-and-the-ostinato-volumes-1-2-3/p/93-DV10029001/
- https://www.forsyths.co.uk/music/sheet-music/by-instrument-family/drums-percussion/drum-kit/75449-terry-bozzio-solo-drums-9780739040270.html
- https://hello.drumchannel.com/thecourses/rhythm-1/lessons/triplet-figures-right-hand-9-basic-permutations-right-foot-fig-5-as-ostinato
- https://www.drumchannel.com/?p=15451
- https://classicrockrevisited.com/show_concert.php?id=244
- https://www.songsterr.com/a/wsa/missing-persons-destination-unknown-drum-tab-s5343064
- https://www.songsterr.com/a/wsa/missing-persons-walking-in-la-drum-tab-s753414
- https://www.songsterr.com/a/wsa/frank-zappa-city-of-tiny-lites-drum-tab-s68251
- https://www.songsterr.com/a/wsa/frank-zappa-the-black-page-drum-tab-s1105085
- https://www.goldminemag.com/music-history/take-five/5-stellar-tracks-featuring-terry-bozzio-that-you-should-know/
- https://cruiseshipdrummer.com/2018/02/07/groove-o-the-day-ignacio-berroa-12-8/
- https://cruiseshipdrummer.com/2019/12/15/transcription-ignacio-berroa-fills/
- http://www.pdxdrummer.com/downloads/lessons_downloads/transcriptions/pdxdrummer.com_ignacio-berroa_fills.pdf
- https://tedpanken.wordpress.com/2017/07/08/for-drum-master-ignacio-berroas-64th-birthday-uncut-interviews-from-2014-and-2008/
- https://www.moderndrummer.com/2006/07/ignacio-berroa/
- https://www.moderndrummer.com/article/july-2012-swingin-the-clave/
- https://archive.org/details/newwayofgroovinc0000berr
- https://jazz.com/encyclopedia/berroa-ignacio
- https://en.wikipedia.org/wiki/Ignacio_Berroa
- https://en.wikipedia.org/wiki/Rainbow_People_(album
- https://hub.yamaha.com/?p=62796
- https://drummerszone.com/artists/profile/244/ignacio-berroa
- https://sabian.com/?p=3599
- https://www.gonbops.com/?p=1808
- https://worldmusiccentral.org/?p=63341
- https://www.alfred.com/ignacio-berroa-mastering-the-art-of-afro-cuban-drumming/p/00-VH0215/
- https://www.bluenote.com/?p=3286
- https://songbpm.com/@ignacio-berroa
- https://blogcritics.org/music-review-ignacio-berroa-straight-ahead-from-havana/
- https://mlwz.pl/recenzje/reviews-in-english/18816-berroa-ignacio-straight-ahead-from-havana
- https://en.wikipedia.org/wiki/Johnny_the_Fox
- https://en.wikipedia.org/wiki/Black_Rose:_A_Rock_Legend
- https://en.wikipedia.org/wiki/Vagabonds_of_the_Western_World
- https://en.wikipedia.org/wiki/Thin_Lizzy_(album
- https://en.wikipedia.org/wiki/Shades_of_a_Blue_Orphanage
- https://en.wikipedia.org/wiki/Chinatown_(Thin_Lizzy_album
- https://en.wikipedia.org/wiki/Brian_Downey_(drummer
- https://en.wikipedia.org/wiki/Thin_Lizzy
- https://en.wikipedia.org/wiki/Whiskey_in_the_Jar
- https://en.wikipedia.org/wiki/Fighting_(Thin_Lizzy_album
- https://en.wikipedia.org/wiki/Jailbreak_(album
- https://en.wikipedia.org/wiki/Bad_Reputation_(Thin_Lizzy_album
- https://en.wikipedia.org/wiki/Live_and_Dangerous
- https://hotpress.com/music/keeping-himself-lizzy-7492530
- https://www.hotpress.com/music/happy-birthday-brian-downey-revisiting-a-classic-hot-press-interview-23067116
- https://hotpress.com/music/brian-downey-on-thin-lizzy-and-vagabonds-of-the-western-world-nobody-could-really-label-us-23002096
- https://www.moderndrummer.com/?p=1984
- http://mikedolbear.com/british-drum-icons/drummer-brian-downey/
- https://www.onlinedrummer.com/shop/the-boys-are-back-in-town-thin-lizzy-drum-sheet-music/
- https://uber-rock.co.uk/?p=3975
- https://www.songsterr.com/api/meta/<id
