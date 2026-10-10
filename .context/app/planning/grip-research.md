# Drumstick grip, stroke and stick-trick biomechanics

Prepared 2026-10-10 for the 3D drummer's grips and stick tricks (`lib/app/breaks/drummer/grips.ts`, `pose.ts`, `anatomy/hand.ts`; see [`../anatomy.md`](../anatomy.md)). Written for turning into joint angles for a rigged drummer: per-finger joints, wrist flexion/extension and radial/ulnar deviation, forearm pronation/supination, elbow, shoulder. Where the model takes a number from here, the code cites the section.

**Evidence tags used throughout**

- **[S]**: stated by a cited source (paper, teaching packet, or educator article).
- **[S-weak]**: stated only by a low-authority source (forum, SEO blog, or Wikipedia without a strong citation).
- **[I]**: my own inference or geometric derivation. Treat it as a reasonable default, not a fact.

**Conventions**

- **Forearm rotation (P/S):** measured from the neutral "thumb-up" (handshake) position.
  - +90° = fully pronated (palm down).
  - −90° = fully supinated (palm up).
  - Normal adult range is about 90° each way ([wikem ROM table](https://wikem.org/wiki/Range_of_motion_by_joint)).
- **Wrist:** extension (back of hand toward forearm) is positive.
  - Normal range is about 70° extension, 80–90° flexion, 20° radial deviation and 30–50° ulnar deviation ([wikem](https://wikem.org/wiki/Range_of_motion_by_joint)).
- **Stick:** reference stick is 16 in / 406 mm (5A/5B class).
  - "Fulcrum fraction" is the distance from the butt divided by the length.
- **Heights:** stick height is the height of the bead (tip) above the head, the convention used by drumline packets.

---

## 0. The ten numbers to build the rig around

| Quantity                              | Value                                                                                                                                                     | Tag / source                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fulcrum position (matched)            | **~1/3 of length from the butt** (about 135 mm on a 406 mm stick). One teacher says 2/5 at the "centre of balance".                                       | [S] [UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf), [SUU packet](https://www.suu.edu/pva/music/marching-band/pdf/drumline-packet.pdf), [Yamaha](https://hub.yamaha.com/music-educators/instruments/perc/a-guide-to-proper-stick-grips/); 2/5 from [percussionclinic](https://www.percussionclinic.com/lessons/01lesson.htm)                                                              |
| Fulcrum contact (matched)             | Thumb pad (flat, along the stick, pointing to the tip) against the index finger at its first (DIP) joint or middle (PIP) joint, on the side of the finger | [S] [Yamaha](https://hub.yamaha.com/music-educators/instruments/perc/a-guide-to-proper-stick-grips/) ("pad of thumb and 2nd joint of index"); [percussionclinic](https://www.percussionclinic.com/lessons/01lesson.htm) ("behind the middle knuckle … on the side of the finger"); [Thomann](https://www.thomann.co.uk/onlineexpert_page_snare_drums_hand_position_and_grip.html) ("thumb … pointing towards the tip … flat on the stick") |
| Height to wrist-turn mapping          | 3 in = 10°, 6 in = 20°, 9 in = 30°, 12 in = 45°, 15 in = 60°, then vertical                                                                               | [S] [Lane Armey, Halftime](https://halftimemag.com/sectionals/going-to-new-heights.html)                                                                                                                                                                                                                                                                                                                                                   |
| Dynamic heights (drumline)            | ppp 1 in, pp 2 in, p 3 in, mp 6 in, mf 9 in, f 12 in, ff 16 in (stick vertical); arm is added above 20 in                                                 | [S] [UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf). SUU is near-identical: pp 1, p 3, mp 6, mf 9, f 12, ff 15 ("full wrist rotation"), fff 18 ("with arm") ([SUU](https://www.suu.edu/pva/music/marching-band/pdf/drumline-packet.pdf))                                                                                                                                                  |
| Effective lever, wrist to bead        | **~0.41–0.43 m (16–17 in)**                                                                                                                               | [I] Derived from the two rows above: 12 in at 45° gives R = 17 in, and "ff 16 in = vertical" gives R = 16 in                                                                                                                                                                                                                                                                                                                               |
| Elbow during expert strokes           | **~90°, nearly constant**. At impact the wrist and the hand–stick line are both about straight (180°).                                                    | [S] [Trappe/Altenmüller/Jabusch 2020](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.538958/full)                                                                                                                                                                                                                                                                                                             |
| Pronation by grip                     | German ~+80…90°; American ~+45°; French ~0…+15°; traditional left hand −30…−90° (supinated)                                                               | German and French: [S] [Wikipedia](<https://en.wikipedia.org/wiki/Grip_(percussion)>). American 45°: [S] [SUU](https://www.suu.edu/pva/music/marching-band/pdf/drumline-packet.pdf), [Wikipedia](<https://en.wikipedia.org/wiki/Grip_(percussion)>). Traditional left-hand range: [I]                                                                                                                                                      |
| Angle between sticks (matched, snare) | ~90° (German; drumline "^" slightly acute); American is often quoted as ~45° in kit pedagogy; French is close to parallel                                 | [S] [UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf), [Yamaha](https://hub.yamaha.com/music-educators/instruments/perc/a-guide-to-proper-stick-grips/); [S-weak] [drumcenternh](https://drumcenternh.com/blogs/news/how-to-hold-drum-sticks-learn-the-proper-technique) for 45° and parallel. **The sources conflict.**                                                                    |
| Tempo vs height                       | Preparatory height falls as tempo rises. In one player, the bead's vertical travel was up to ~0.35–0.4 m at 50 bpm and much smaller at 300 bpm.           | [S] [Dahl review, Fig. 3](https://vbn.aau.dk/ws/files/65339564/Dahl_J_AST_review_submi.pdf); [Dahl et al. 2011](https://vbn.aau.dk/ws/files/56213806/DahlGrossbachAltenmueller2011_ISPS.pdf)                                                                                                                                                                                                                                               |
| Single-hand rate ceiling              | 5–7 Hz is the usual human limit; the "World's Fastest Drummer" reached 10 Hz (100 ms between taps) with stick in hand                                     | [S] Fujii et al., summarised in [Dahl review](https://vbn.aau.dk/ws/files/65339564/Dahl_J_AST_review_submi.pdf) and [PMC7393804](https://pmc.ncbi.nlm.nih.gov/articles/PMC7393804)                                                                                                                                                                                                                                                         |

---

## 1. Grips

### 1.1 Matched grip: what all three variants share

**Fulcrum [S]**

- Thumb pad, lying flat along the stick, opposes the index finger. Contact on the index is at the first joint (DIP), or on some accounts the second joint (PIP), on the side of the finger.
- Position is about 1/3 from the butt ([UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf); [SUU](https://www.suu.edu/pva/music/marching-band/pdf/drumline-packet.pdf); [Yamaha](https://hub.yamaha.com/music-educators/instruments/perc/a-guide-to-proper-stick-grips/)).
- Variant: the fulcrum is taken between the thumb and the **middle** finger. This is the Moeller / "back fulcrum" school ([virtualdrumming](https://www.virtualdrumming.com/drums/rudiments-fundamentals/moeller-technique.html)).
- Variant: thumb, index and middle together make a three-point fulcrum ([SUU](https://www.suu.edu/pva/music/marching-band/pdf/drumline-packet.pdf)).

**Back fingers (middle, ring, little) [S]**

- They curl loosely around the stick and stay in contact at all times ([UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf): "never completely leaving the stick").
- The butt runs diagonally across the palm toward the fleshy heel on the little-finger side (hypothenar) ([Yamaha](https://hub.yamaha.com/music-educators/instruments/perc/a-guide-to-proper-stick-grips/)).
- The butt is "slightly visible out the back of the hand", so roughly 1–3 cm protrudes past the heel of the hand ([UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf); [Hawkeye](https://hawkeyemarchingband.uiowa.edu/sites/hawkeyemarchingband.uiowa.edu/files/2020-03/hawkeye_drumline_snare_2019_1_0.pdf)).
- UAB says the stick's weight "generally sits in the middle of the right hand (between the middle and ring fingers)". The rotation feel sits further back than the front fulcrum.

**Finger joint angles in the rest grip [I]**

| Finger | MCP            | PIP    | DIP    |
| ------ | -------------- | ------ | ------ |
| Index  | 40–60° flexion | 60–80° | 20–40° |
| Middle | ~50°           | ~70°   | ~30°   |
| Ring   | ~60°           | ~80°   | ~40°   |
| Little | ~60–70°        | ~80°   | ~40°   |

- The back fingers wrap progressively more toward the little finger, because the stick runs diagonally across the palm.
- Thumb: CMC opposed. MCP 10–20° flexion. IP 0–20° (flat pad, slightly bent, "no tension").

**Stick vs forearm in plan view (horizontal plane)**

- The stick "follows the line of the forearm" ([Hawkeye](https://hawkeyemarchingband.uiowa.edu/sites/hawkeyemarchingband.uiowa.edu/files/2020-03/hawkeye_drumline_snare_2019_1_0.pdf)).
- In practice it bends inward toward the midline by about 10–25° at the wrist (ulnar deviation plus the diagonal lay across the palm) [I].
- With the forearms converging toward the snare, this gives the ~90° "^" between the two sticks.

**Stick vs head in side view (vertical plane) at rest**

- Beads ½ in above the head and butts "two fingers above the rim" ([UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf)). So the stick slopes down toward the tip by only about 3–8° [I].
- At impact the forearm–hand–stick chain is about straight ([Trappe 2020](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.538958/full): hand–stick and wrist angles "at about 180 degrees").
- The forearm slopes down "downhill from shoulder to bead" ([UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf)), typically about 10–20° below horizontal on a kit [I].

#### The three matched variants

|                      | German                                                | American                         | French                                 |
| -------------------- | ----------------------------------------------------- | -------------------------------- | -------------------------------------- |
| Back of hand         | Palm down, parallel to the head [S]                   | About 45° to the head [S]        | Palms facing each other, thumbs up [S] |
| P/S from thumb-up    | **+80…+90°**                                          | **+45°**                         | **0…+15°**                             |
| Angle between sticks | ~90° [S], elbows out                                  | ~45–90° (sources conflict)       | Nearly parallel [S-weak]               |
| Primary motor        | Wrist flexion/extension; arm added for power          | Wrist plus fingers ("hybrid")    | Fingers, with forearm rotation         |
| Use                  | Power, bass drum, wide dynamics; base for Moeller [S] | General kit and drumline default | Timpani, jazz ride, fast light playing |
| Elbow                | Out from the body                                     | Hanging naturally                | Close to the body                      |

Sources for the table: [Wikipedia "Grip (percussion)"](<https://en.wikipedia.org/wiki/Grip_(percussion)>), [SUU](https://www.suu.edu/pva/music/marching-band/pdf/drumline-packet.pdf), [UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf), [drumcenternh](https://drumcenternh.com/blogs/news/how-to-hold-drum-sticks-learn-the-proper-technique).

UAB explicitly recommends between German and French: "not completely flat … nor rotated completely vertical". Its stated reason is that German limits finger motion and French limits wrist motion.

**Key point for the rig [I]: the lift axis turns with the forearm.**

- The axis that raises the stick is the wrist's flexion/extension axis, rotated by however much the forearm is pronated.
- **German (palm down):** the stick rises by pure **wrist extension**. A 70° extension range covers heights up to ~15 in.
- **French (thumb up):** pure wrist extension would swing the stick sideways. Raising the tip has to come from **radial deviation (only ~20° available) plus the fingers opening**, together with some supination. This is why French grip is "finger-driven" and suits low heights.
- **American (45°):** the lift is a blend of about 0.7 extension and 0.7 radial deviation, with fingers for fast notes.
- **Recommendation:** drive "stick lift" as a single rotation about the hand's local axis, and let the pronation angle decide how it maps onto the anatomical axes.

#### Back-finger / dual-fulcrum variants

**Dual fulcrum [S]**

- A front fulcrum (thumb plus index) and a back fulcrum (thumb plus middle finger, or the back fingers/palm) are both active.
- The Moeller whip uses both ([Wikipedia: Drum stroke](https://en.wikipedia.org/wiki/Drum_stroke); [Moeller method](https://en.wikipedia.org/wiki/Moeller_method); [virtualdrumming](https://www.virtualdrumming.com/drums/rudiments-fundamentals/moeller-technique.html)).
- For loud strokes the pivot shifts back into the hand. For finger strokes it sits at the front thumb–index fulcrum ([UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf): "weight/rotation points further back in the hand … fuller sound").

**Back-finger fulcrum [S]**

- Some players hold the stick mainly with the ring and little fingers.
- Tony Williams is cited for a "four-finger" approach on ride rhythms ([notsomoderndrummer "Putting your finger on it"](https://notsomoderndrummer.com/not-so-modern-drummer/2020/12/18/putting-your-finger-on-it-part-i-regular-grip)).

### 1.2 Traditional (orthodox) grip: left hand

Sources: [Hawkeye](https://hawkeyemarchingband.uiowa.edu/sites/hawkeyemarchingband.uiowa.edu/files/2020-03/hawkeye_drumline_snare_2019_1_0.pdf), [UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf), [SUU](https://www.suu.edu/pva/music/marching-band/pdf/drumline-packet.pdf), [Wikipedia](<https://en.wikipedia.org/wiki/Grip_(percussion)>), [notsomoderndrummer "Traditional grip from the ground up"](https://www.notsomoderndrummer.com/not-so-modern-drummer/2024/8/27/traditional-grip-from-the-ground-up).

**Contacts [S], digit by digit**

- **Fulcrum:** the web (first web space) between thumb and index. The butt passes through it and the stick sits in this crotch. Contact is about 1/3 up the stick ([UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf)).
- **Thumb:** lies on top of the stick, with its pad pressing onto the index finger "just to the left of the first knuckle". The thumb and index stay connected throughout; Wikipedia says "thumb atop the index at the first knuckle". In the Scottish pipe-band variant the thumb alone presses on top ([Wikipedia](<https://en.wikipedia.org/wiki/Grip_(percussion)>)).
- **Index:** curls over the top of the stick. Its role is downward pressure and the down-stroke throw.
- **Middle:** "rests along the stick, relaxed, never straight". On Wikipedia's account only the side of the fingertip touches the top side of the stick.
- **Ring:** the stick lies **on the cuticle (nail base) of the ring finger**, underneath the stick. The ring finger lifts and stabilises.
- **Little:** "rides underneath the ring finger", supporting it and touching it.
- So the stick passes **under the index and middle fingers and over the ring finger**. Phrasings like "stick between the middle and ring fingers" describe the same thing ([Thomann](https://www.thomann.co.uk/onlineexpert_page_snare_drums_hand_position_and_grip.html)).

**Hand shape [S]**

- The relaxed hanging-arm curvature is kept, and the hand is "a C from above".
- "If it were to rain on the hand, water should land in the palm and roll off" ([UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf)). In other words, the palm faces obliquely upward.
- The back of the hand slopes outward, so the forearm continues in a straight line to the thumb tip. The hand is not flush with the forearm.

**Pronation/supination [I, built from the sourced descriptions]**

- At tap height the forearm is supinated about **−30 to −50°** from thumb-up (palm tilted up and toward the midline).
- **Stick rises with supination ("rotate the forearm outward and the stick rises"), and the down-stroke is pronation back toward thumb-up ("throw the stick down by turning the forearm inward")** [S] ([notsomoderndrummer](https://www.notsomoderndrummer.com/not-so-modern-drummer/2024/8/27/traditional-grip-from-the-ground-up)). This is the "doorknob" motion [S] ([Hawkeye](https://hawkeyemarchingband.uiowa.edu/sites/hawkeyemarchingband.uiowa.edu/files/2020-03/hawkeye_drumline_snare_2019_1_0.pdf), [UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf), [SUU](https://www.suu.edu/pva/music/marching-band/pdf/drumline-packet.pdf)).
- SUU adds: "rotation is initiated at the elbow. Some upper-arm rotation may be required."

**Rotation range for a stroke [I]**

- The bead is about 0.28–0.30 m from the forearm's rotation axis. So:
  - a 3 in tap needs about **10–15°** of rotation;
  - 6 in needs about **20–30°**;
  - 9–12 in needs about **40–60°** of supination plus about 15–25° of wrist extension/radial deviation and a little forearm lift.
- A full stroke therefore swings from about −35° at impact to about −85…−90° (palm fully up) at the top.
- Traditional-grip left-hand heights are usually lower than the right hand's at the same dynamic. That is an inference from the geometry, and it is also commonly observed.

**Stick direction [I]**

- In plan view the left stick leaves the web pointing toward the drum centre, roughly **70–90° to the left forearm**. Matched grip, by contrast, is roughly in line with the forearm.
- In side view it slopes down toward the head; historically the drum was tilted toward the right.
- The Hawkeye packet sets drum tilt from the left stick: **10°** ([Hawkeye](https://hawkeyemarchingband.uiowa.edu/sites/hawkeyemarchingband.uiowa.edu/files/2020-03/hawkeye_drumline_snare_2019_1_0.pdf)). Kit players often tilt the snare away from them for traditional grip ([Wikipedia](<https://en.wikipedia.org/wiki/Grip_(percussion)>)).

**How the sticks cross [I]**

- The left stick comes in from the left at a shallow, flatter angle under the right hand's path. The right stick is matched (American). The left bead lands left of centre.
- On kit the right hand is usually over the hi-hat, so the arms cross with the right forearm above the left. The left stick stays low and flat, and its tip points to the right and forward.

**Why underhand? [S]** It comes from the slung military snare. The drum rode on the hip and tilted, so an overhand left hand would put the elbow in an awkward position ([Wikipedia](<https://en.wikipedia.org/wiki/Grip_(percussion)>)).

**Finger strokes in traditional grip [S]**

- The thumb, index or middle can each throw the stick, and the ring finger lifts it ([notsomoderndrummer](https://www.notsomoderndrummer.com/not-so-modern-drummer/2024/8/27/traditional-grip-from-the-ground-up)).
- Moeller's left-hand motion in traditional grip is "flicking water off the fingertips" ([Moeller method](https://en.wikipedia.org/wiki/Moeller_method)). Thomann uses a similar image ("shaking water from your fingertips").
- Rudimental players keep "the back of the hand fairly parallel to the floor … middle finger fairly straight" ([Thomann](https://www.thomann.co.uk/onlineexpert_page_snare_drums_hand_position_and_grip.html)). This is a flatter, more supinated variant: P/S close to −80…−90°.

**Traditional right hand:** the right hand plays matched (American, about 45° pronation) ([SUU](https://www.suu.edu/pva/music/marching-band/pdf/drumline-packet.pdf)). Drumline right-stroke paths follow the tilted head ([Hawkeye](https://hawkeyemarchingband.uiowa.edu/sites/hawkeyemarchingband.uiowa.edu/files/2020-03/hawkeye_drumline_snare_2019_1_0.pdf)).

**Buddy Rich vs Steve Gadd.** I found no reliable written source comparing their finger placement. The trad-grip literature describes variations in finger usage only in general terms ([Wikipedia](<https://en.wikipedia.org/wiki/Grip_(percussion)>)). Animate a generic modern kit trad grip and do not attempt to differentiate these two.

### 1.3 Moeller technique (whip)

Sources: [Moeller method](https://en.wikipedia.org/wiki/Moeller_method), [virtualdrumming](https://www.virtualdrumming.com/drums/rudiments-fundamentals/moeller-technique.html), [Bachman, MD Feb 2010](https://www.moderndrummer.com/wp-content/uploads/Bachman_February-2010.pdf), [Dahl review](https://vbn.aau.dk/ws/files/65339564/Dahl_J_AST_review_submi.pdf).

**History [S]**

- Sanford Moeller observed Civil War-era drummers and published _The Art of Snare Drumming_ (1925; reissued as "The Moeller Book", 1954 per Wikipedia).
- Jim Chapin studied with him in 1938–39 and promoted the method until 2009.
- Gene Krupa is traditionally named as a Moeller student. Dom Famularo is a prominent modern teacher; I found no direct source text from him.

**The whip [S]**

- "First you move the back of the drum stick, then you bow your wrist, the elbow comes to the front, the hand and the forearm form for a moment a 90 degrees corner" (the "Cobra position").
- Moeller's fulcrum is **thumb plus middle finger** ([virtualdrumming](https://www.virtualdrumming.com/drums/rudiments-fundamentals/moeller-technique.html)).
- Dahl's motion capture shows the same shape in skilled players generally: "the hand leads the upward movement with the stick lagging behind, tip pointing down … [then] the hand initiates the downstroke, flicking the stick" ([Dahl review](https://vbn.aau.dk/ws/files/65339564/Dahl_J_AST_review_submi.pdf)).

**Moeller as Bachman teaches it [S]**

- Accents come "more through velocity than stick height".
- Moeller upstroke: "the stick taps the drum as the forearm lifts and the hand drops".
- Taps bounce. The forearm lifts only on the last tap before the accent.
- Groups of four or more need finger control as the accent's energy dissipates.

**Keyframe sequence for one accent (downstroke) followed by taps and an upstroke [I, from the sourced descriptions]**

1. **Upstroke (the tap before the accent).** The elbow and forearm lift about 5–15 cm through shoulder flexion/abduction (about 5–15°). The wrist stays relaxed, so it **flexes** about 20–40° and the tip trails downward, playing a soft tap as the hand rises. Many players also supinate the forearm slightly (about 10–20°) on the lift.
2. **Top: the "Cobra".** The forearm starts dropping while the hand is still rising. The wrist passes through neutral into extension, about 50–70°. Hand and forearm briefly form roughly a right angle. The stick is near vertical.
3. **Whip down.** The forearm leads downward. The wrist then snaps from extension into neutral or slight flexion just before impact, and the fingers close. Forearm pronation returns. The stick is the fastest segment, consistent with Dahl's observation that the "magnitude of the movement is largest for the stick".
4. **Downstroke stop.** The stick is caught about 1–2 in above the head ([notsomoderndrummer](https://www.notsomoderndrummer.com/not-so-modern-drummer/2018/9/11/different-strokes-part-i-and-ii); [Wikipedia: Drum stroke](https://en.wikipedia.org/wiki/Drum_stroke)). In fast Moeller the accent is allowed to bounce somewhat (Bachman).
5. **Taps.** 1–3 in strokes from the wrist (about 5–10°) or the fingers. The arm is quiet.

**Disputed [S]:** Chapin said Moeller "does not rely on rebound". Weckl says it does ([Moeller method](https://en.wikipedia.org/wiki/Moeller_method)).

### 1.4 Gladstone technique

- **Billy Gladstone (1893–1961)** taught Joe Morello, Shelly Manne and Buddy Rich. The "Gladstone technique" is described as using **the fingers to control rebound**, as opposed to Moeller's whip ([Wikipedia: Billy Gladstone](https://en.wikipedia.org/wiki/Billy_Gladstone)) [S].
- **Conflict [S]:** Buddy Rich said Gladstone used "a wrist motion" and was "opposed to all that talk about finger control" ([Wikipedia](https://en.wikipedia.org/wiki/Billy_Gladstone)).
- **Tiger Bill's teaching version [S]** ([tigerbill.com](https://tigerbill.com/drumlessons/buildingmonsterchopsgladstone_part1.htm)):
  - **"only one motion: Down"**. The stick is thrown down "fast, not hard", the rebound brings it back, and "your hands follow your sticks".
  - Volume comes from height, not grip pressure.
  - Grip is just tight enough not to drop the stick, at the balance point.
- **Animation [I]:** a free-stroke wrist motion in American/German grip, with the fingers lightly closing on the rebound to meter it. Gladstone is not visually distinctive.

### 1.5 Push-pull / open-close, finger control, and Freehand (one-handed roll)

**Names [S]**

- "Push-pull" and "open/close" are the same idea. Jojo Mayer (_Secret Weapons for the Modern Drummer_) calls it "Buddy Rich's secret weapon".
- Gordy Knudtson wrote books on the "Open/Close Technique" ([bonedo](https://www.bonedo.de/artikel/spieltechnik-fuer-drummer-gordy-knudtson-the-openclose-technique)).
- Dave Weckl's _How to Develop Technique_ features Freddie Gruber ([Grant Collins](https://grantcollins.com/post/conquering-the-push-pull-technique-a-journey-of-discovery); search summaries).
- The user's guess "Gilbert" did not turn up; the names are Knudtson and Mayer.

**Mechanics [S + I]**

- Push-pull is "a wrist stroke followed by a finger stroke".
- The fulcrum is the thumb with index and middle, and the ring and little fingers stay attached. The third (ring) finger "is great for push-pull" ([notsomoderndrummer](https://notsomoderndrummer.com/not-so-modern-drummer/2020/12/18/putting-your-finger-on-it-part-i-regular-grip)).
- **Push:** the hand/wrist moves down. Fingers are open and the stick lightly "pushed" by the thumb and index, which plays note 1.
- **Pull:** as the hand rises (wrist extending), the back fingers close and pull the butt into the palm. The tip goes down and plays note 2 while the hand is still moving up.
- So there are 2 notes per wrist cycle. The stick oscillates at about twice the wrist frequency, with the stick-to-hand angle swinging about 10–25° (finger MCP/PIP flexing about 20–40°) [I].
- Alley-oop (Bachman) is related: the first note is wrist, the second is fingers ([Wikipedia: Drum stroke](https://en.wikipedia.org/wiki/Drum_stroke) quoting Bachman).

**Freehand technique (Johnny Rabb) and the one-handed roll [S]** ([drumlessons.com](https://www.drumlessons.com/drum-lessons/general-drum-lessons/one-handed-roll/); [Hal Leonard listing](https://www.halleonard.com/product/6620121/the-official-freehand-technique))

- "The rim of the snare drum [is used] as a pivoting point for pushing and pulling the stick against it with the combination of an upward and downward motion of the arm."
- Down motion: the stick strikes head and rim (note 1).
- Up motion: the shaft stays on the rim as a pivot, the hand rises, the butt lifts and the stick rocks over the rim, so the tip strikes the head again (note 2).
- The hand is palm down (about +70…+90°) and moves mostly from the forearm/elbow (about ±3–6 cm vertical) [I].

**Freddie Gruber [S]** (via Weckl and Peart): balance the stick on the open thumb–index fulcrum "without the hand trying to hold it" and "let the stick do the work" (search summary of [scottkfish](https://scottkfish.com/2021/10/29/how-freddie-gruber-helped-me/)).

### 1.6 The four basic strokes (free/full, down, tap, up)

Sources: [Wikipedia: Drum stroke](https://en.wikipedia.org/wiki/Drum_stroke), [Matt Dudley PDF](https://mattdudleydrumming.com/wp-content/uploads/2018/12/the-four-basic-stroke-types.pdf), [UAB](https://www.uab.edu/cas/uabbands/images/documents/drumline/snare-drum-technical-guide.pdf), [SUU](https://www.suu.edu/pva/music/marching-band/pdf/drumline-packet.pdf), [Bachman Apr 2009](https://www.moderndrummer.com/wp-content/uploads/Bachman_April2009.pdf).

| Stroke                    | Start         | End          | Mechanism                                                                                                                                                                        | Tag |
| ------------------------- | ------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| Full / free (legato)      | High          | High         | Throw down, let the rebound return the stick, no squeeze. "Rebound should be the same speed as the initial movement."                                                            | [S] |
| Down (staccato / marcato) | High          | Low, ~1–2 in | Same throw; the **wrist** stops the stick (UAB: "avoid squeezing the fingers"). SUU says "fingers flex slightly … catching the rebound". **Sources differ** on wrist vs fingers. | [S] |
| Tap                       | Low (~1–3 in) | Low          | Slight lift; the weight of the hand drops the stick                                                                                                                              | [S] |
| Up                        | Low           | High         | Tap, then lift with the wrist (or with the forearm in Moeller)                                                                                                                   | [S] |

**Grip tension [S]**

- Restraining the rebound (a "controlled" stroke) changes the sound: shorter contact, higher peak force, rated "less full" ([Dahl & Altenmüller via the acoustics.org summary](https://acoustics.org/pressroom/httpdocs/155th/dahl.htm); [Dahl review](https://vbn.aau.dk/ws/files/65339564/Dahl_J_AST_review_submi.pdf)).
- Stick–head contact lasts only "a few milliseconds".

### 1.7 Rock "hammer"/fist grip and reversed (butt-end) playing

**Fist / "death grip" [I, S-weak]**

- I found no educator source that names or endorses a fist grip. Educators uniformly warn against the white-knuckle "death grip" ([melodics](https://melodics.com/blog/how-to-hold-drumsticks)).
- For heavy-hitting players, animate it as German/American grip with all four fingers flexed tightly: MCP about 80–90°, PIP about 90–100°. The fulcrum moves back into the palm, and the motion comes more from the elbow and shoulder, with a larger forearm swing and less rebound.

**Butt-end ("butt-end out") playing [S]**

- **Neil Peart** played with the butt end until he studied with Freddie Gruber in the mid-1990s. It began as a youthful habit when the tips broke ([wknc](https://wknc.org/2020/02/01/artist-of-the-week-neil-peart/)).
- **Bernard Purdie** plays the left hand butt-end ("I beat on the butt with my left hand, because it gives me better control") ([vintagedrumforum](https://www.vintagedrumforum.com/post/457051)).
- MD recommends butt-end playing in the centre of the head for a "deep, fat thud" ([Modern Drummer](https://www.moderndrummer.com/2013/07/seeing-sounds-part-2-the-deep-fat-thud/)).
- **Bonham and Grohl as butt-end players: not verified.** I found no source. The common claim about Bonham concerns heavy sticks, not reversed ones.
- **Grip change when reversed [I]:** the fulcrum is now about 1/3 from the **tip**, so the hand sits nearer the old tip end and the bead end protrudes behind the hand.

### 1.8 Timpani / "thumbs-up" grip on kit

- This is French grip: palms facing, thumbs on top, P/S about 0…+15°. The motion is fingers plus forearm rotation ([Wikipedia](<https://en.wikipedia.org/wiki/Grip_(percussion)>)).
- **Bouënard, Wanderley & Gibet** (timpani, motion capture, one subject per grip) found **French grip used about twice the stick-tip vertical range of German grip** ([ENACTIVE'08 PDF](https://idmil.org/wp-content/uploads/2022/06/Bouenard_ENACTIVE08.pdf)) [S]:
  - Stick-tip vertical range: **434 mm vs 179 mm**. Mean tip height was about 20 cm higher for French.
  - Shoulder range: **27°, 22°, 22° (French) vs 8°, 3°, 12° (German)** about X, Y, Z.
  - Elbow travel: **98 / 134 / 69 mm vs 13 / 32 / 10 mm**.
  - The German-grip player "locked" the shoulder and drove the stroke with forearm/wrist **twist**. At impact the interior of the forearm "almost faces the timpani membrane", meaning strongly pronated.
  - The French-grip player drove the stroke with elbow and wrist **flexion** and an oscillating, continuous preparation.
  - Caveats: timpani, not kit; only one subject per grip.

### 1.9 Swiss / Basel

- Basel drumming (Basler Trommeln) is a distinct rudimental tradition ([Drum rudiment](https://en.wikipedia.org/wiki/Drum_rudiment); [MD / Claus Hessler Swiss rudiments video](https://www.moderndrummer.com/2016/08/video-lesson-swiss-rudiments-part-1-with-clauss-hessler/)). It is played traditionally with traditional grip on a slung drum.
- I found **no source describing a distinct "Basel grip"** different from traditional grip. Do not model one.

### 1.10 Rimshot and cross-stick

**Rimshot [S]** ([Wikipedia: Rimshot](https://en.wikipedia.org/wiki/Rimshot))

- The bead and the rim are struck at the same time.
- Variant "stick-on": the butt rests on the head and the shoulder of the stick hits the opposite rim.

**Rimshot animation [I]**

- For a 14 in snare with the bead near the centre, rim contact falls about 6–8 in back from the tip, near the middle of the stick.
- So the stick must be within about **3–8° of horizontal** at impact. The hand drops about 2–4 cm lower than for a normal stroke, and the forearm is flatter.
- Wrist extension at the top is the same as for a normal stroke of that dynamic.
- Rimshots are usually backbeats from 6–12 in heights.

**Cross-stick / rim click [S]** ([Wikipedia: Rimshot](https://en.wikipedia.org/wiki/Rimshot); [Drumeo](https://www.drumeo.com/beat/how-to-improve-your-cross-stick-sound/))

- One end rests on the head near the edge and the shaft clicks the opposite rim.
- Drumeo/Harry Miree: **flip the stick so the butt strikes the rim**. He aims at the middle of the "American Classic" logo, roughly 1/4–1/3 from the butt [I estimate].

**Cross-stick posture and motion [I]**

- Left hand palm down, P/S about +80…+90°. The stick lies under the palm across the head.
- The **heel of the hand (hypothenar) and/or the bead end rest on the head** about 2–5 cm in from the near-left edge. The butt end protrudes over the far rim at about the 2–3 o'clock position.
- Fingers are loosely closed on top. The thumb lies along or on the stick.
- The stroke is a rocking about the heel/bead contact: wrist extension of about 10–20° plus a little forearm supination lifts the far end 2–6 cm, then it drops.
- Switching between cross-stick and normal snare takes about one beat: lift, supinate about 30°, slide the stick through the fingers, re-grip.

### 1.11 Brushes

- French grip with the **thumb on top** ([BYU](https://percussion.byu.edu/brushes)). All four fingers stay on the handle for the right hand. In traditional left grip, the index and middle fingers are on top and the ring finger is underneath as a "bumper" (search summary of [MD Jazz Drummer's Workshop](https://moderndrummer.com/?p=28808)).
- Motion is lateral sweeps from the fingers, forearm and wrist.
- Common pattern: **the left hand stirs clockwise, starting at 9 o'clock**, while the right plays the swing pattern, and the hands swap places on beats 2 and 4. For ballads, the hands stir in opposite directions toward the inside ([BYU](https://percussion.byu.edu/brushes)).
- P/S about +30…+60°. The sweep is driven by shoulder internal/external rotation plus forearm rotation, about ±10–20 cm of brush travel per beat [I].

### 1.12 Who used what (verification)

| Drummer                                           | Grip                                                                                                                                                                | Confidence / source                                                                                                                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mitch Mitchell**                                | **Traditional**, "one of the few rock drummers of his era". Also "shifted between" traditional and matched.                                                         | [S] [Wikipedia](https://en.wikipedia.org/wiki/Mitch_Mitchell) and secondary sources in search results                                                                                                                               |
| **John Bonham**                                   | **Matched** in essentially all well-known footage. One forum claims he "used traditional grip for a while" early on. He did stick twirls "often in the early days". | Matched: high confidence (footage, [I]). Traditional claim: [S-weak] [vintagedrumforum](https://www.vintagedrumforum.com/post/335693)                                                                                               |
| **Clyde Stubblefield**                            | **Matched** (probable). David Stanoch says he "got more into matched grip … watching Clyde Stubblefield's legendary left hand".                                     | [S] indirect ([MD Education Team](https://www.moderndrummer.com/2012/09/md-education-team-traditional-grip/)). No direct statement found.                                                                                           |
| **Tony Williams**                                 | **Both**: traditional for straight-ahead jazz, matched for fusion/power playing. Also cited for the four-finger fulcrum on ride patterns.                           | [S] [Drumeo](https://www.drumeo.com/beat/traditional-grip-vs-matched-grip/), 1978 MD interview; [notsomoderndrummer](https://notsomoderndrummer.com/not-so-modern-drummer/2020/12/18/putting-your-finger-on-it-part-i-regular-grip) |
| **Ringo Starr**                                   | **Matched**. Credited with popularising it in rock after Ed Sullivan in 1964.                                                                                       | [S] (multiple secondary sources, e.g. [melodics](https://melodics.com/blog/the-drumming-genius-of-ringo-starr))                                                                                                                     |
| **Tony Allen**                                    | **Not verified.** The only sourced detail is that he **choked up, holding the sticks "in the middle, not at the end"**, for a softer attack.                        | [S] [Songlines](https://www.songlines.co.uk/content/features/remembering-tony-allen-his-sound-was-so-beautiful-so-sensual-so-chic-that-it-stood-out-immediately-1). Grip type unconfirmed: check footage.                           |
| **Stewart Copeland**                              | **Traditional** ("I prefer the traditional grip")                                                                                                                   | [S] [Thomann blog](https://www.thomann.de/blog/en/gear/hit-the-tone-dissecting-stewart-copeland)                                                                                                                                    |
| **Yussef Dayes**                                  | **Not verified in any written source.** My recollection of performance footage is matched grip.                                                                     | [I] low confidence. Check footage.                                                                                                                                                                                                  |
| Buddy Rich, Elvin Jones, Art Blakey, Kenny Clarke | Traditional                                                                                                                                                         | [S] [MD](https://www.moderndrummer.com/2012/09/md-education-team-traditional-grip/)                                                                                                                                                 |
| Max Roach                                         | Switched exclusively to matched                                                                                                                                     | [S] [MD](https://www.moderndrummer.com/2012/09/md-education-team-traditional-grip/)                                                                                                                                                 |
| Neil Peart                                        | Butt-end matched until the mid-1990s; then studied with Gruber. Widely reported to have adopted traditional grip afterwards (not sourced here).                     | [S] for butt-end ([wknc](https://wknc.org/2020/02/01/artist-of-the-week-neil-peart/))                                                                                                                                               |

---

## 2. Motion: how much each joint does, and how it changes with tempo

### 2.1 What the studies show

**Wrist leads, stick lags (a proximal-to-distal whip) [S]**

- In Dahl's motion capture (shoulder, elbow, wrist, index MCP and stick tip; 300–400 Hz), a single mf stroke at 50 bpm goes like this:
  1. the hand rises first while the stick lags with its tip down;
  2. at the preparatory height the hand starts the downstroke and "flicks" the stick;
  3. after impact the rebound makes a smaller second loop.
- The stick tip's displacement is far larger than the wrist's or the MCP's ([Dahl review](https://vbn.aau.dk/ws/files/65339564/Dahl_J_AST_review_submi.pdf); [acoustics.org](https://acoustics.org/pressroom/httpdocs/155th/dahl.htm)).

**Expert vs novice [S]** ([Trappe, Altenmüller & Jabusch 2020](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.538958/full))

- Experts use "distal low-mass parts" in a whiplash. The **elbow stays at about 90°**, and the shoulder and elbow contribute little.
- Beginners use pronounced elbow motion.
- At impact the hand–stick (MCP) angle and the wrist angle are both about 180°, so the chain is straight.
- Task: quarters and sixteenths at 76 bpm.
- Note: the search summary of this paper also says professionals generate motion "from more proximal parts (wrist rotation)" than novices, whose motion was more finger-only. Read that as "wrist-centred" rather than "arm-centred".

**Dynamics come from height [S]**

- Preparatory height correlates strongly with tip velocity at impact. In Dahl's Fig. 2 (120 bpm, p/mf/f), the height axis spans 0–600 mm and velocity rises to the order of 10 m/s ([Dahl review](https://vbn.aau.dk/ws/files/65339564/Dahl_J_AST_review_submi.pdf)).
- Accents are prepared by lifting higher, and the rebound after an accent also carries higher ([acoustics.org 137th](https://acoustics.org/pressroom/httpdocs/137th/dahl.html)).

**Tempo [S]** ([Dahl, Großbach & Altenmüller 2011](https://vbn.aau.dk/ws/files/56213806/DahlGrossbachAltenmueller2011_ISPS.pdf); [Dahl review](https://vbn.aau.dk/ws/files/65339564/Dahl_J_AST_review_submi.pdf))

- At 50 bpm (1200 ms between strokes), strokes start from greater heights and are louder. The rebound completes an extra loop before the next preparation.
- At 120 and 300 bpm the rebound is absorbed into the next stroke's preparation, and height shrinks a lot. In Fig. 3 the bead's vertical range is about 0.35–0.4 m at 50 bpm and much smaller at 300 bpm.
- The **wrist's lead over the stick decreases with tempo and becomes almost anti-phase at 300 bpm**. The MCP still leads the stick briefly.
- Dahl's analogy: bouncing a ball fast means getting closer to the ground.

**Grip and surface [S]**

- "Different wrist-to-finger ratios" depend on the surface: "many players … favor the fingers at high speeds, but finger technique won't work very well on a mushy surface like a floor tom" ([Bachman](https://www.moderndrummer.com/wp-content/uploads/Bachman_April2009.pdf)).
- "Faster playing emphasizes wrist and fingers, while slower playing engages larger muscle groups" ([Yamaha](https://hub.yamaha.com/music-educators/instruments/perc/a-guide-to-proper-stick-grips/)).

**Muscles [S]**

- Experts show less co-contraction, flexor-dominant and anti-phase wrist muscle activity. Tested at 40–200 bpm (inter-tap intervals of 750–150 ms) ([Beveridge et al. 2020](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.01360/full)).
- The fastest drummer reached 10 Hz with alternating FCU/ECR bursts ([Dahl review](https://vbn.aau.dk/ws/files/65339564/Dahl_J_AST_review_submi.pdf)).

**Individual variation [S]**

- Strategies differ a lot between players but stay consistent within a player ([Dahl](https://vbn.aau.dk/ws/files/65339564/Dahl_J_AST_review_submi.pdf)).
- Individual differences appear in the early and mid-flight phases. Near impact, players share common finger, wrist and elbow recruitment ([Takiyama, Hirashima & Fujii 2022](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.923180/full)).
- For animation: randomise the preparation shape per drummer, and converge toward a common shape at impact.

### 2.2 No published "% contribution per joint" exists. Working budget [I]

I found no study that reports the share of stick motion contributed by each joint. The table below is my synthesis of the sources above, for a matched (American) grip. Each row gives the approximate share of bead displacement.

| Situation                                          | Bead height                 | Shoulder            | Elbow / forearm lift          | Wrist (flex/ext and dev) | Fingers | Notes                                                       |
| -------------------------------------------------- | --------------------------- | ------------------- | ----------------------------- | ------------------------ | ------- | ----------------------------------------------------------- |
| Slow full strokes, f (≤ ~80 bpm 8ths)              | 12–16 in                    | 5–10%               | 15–25%                        | 55–65%                   | 5–10%   | Visible Moeller-ish arm wave. Wrist ext. up to ~45–70°.     |
| Medium, mf (~100–140 bpm 8ths)                     | 6–9 in                      | ~0–5%               | 5–15%                         | 70–80%                   | 5–15%   | Wrist turn ~20–30°                                          |
| Fast 16ths, mp (~120–160 bpm, 8–10 Hz alternating) | 2–4 in                      | ~0                  | ~0–5%                         | 50–60%                   | 35–50%  | Wrist ~5–12°; fingers open/close 10–25° at MCP              |
| Very fast single hand (≥ 7–10 Hz) or push-pull     | 1–3 in                      | 0                   | Hand bob ±1–3 cm in push-pull | 30–50%                   | 50–70%  | Rebound-dominant. Wrist and stick nearly anti-phase (Dahl). |
| Accents within taps (Moeller)                      | Accent 9–12 in; taps 2–3 in | 5–10% (accent only) | 20–30% (accent only)          | Most                     | Taps    | "Velocity more than height" (Bachman)                       |

**Wrist extension needed at the top of the stroke, German/American [I]**

| Bead height       | Approx. wrist turn | Notes                                                                          |
| ----------------- | ------------------ | ------------------------------------------------------------------------------ |
| ~1 in             | ~3°                |                                                                                |
| 3 in              | 10°                |                                                                                |
| 6 in              | 20°                |                                                                                |
| 9 in              | 30°                |                                                                                |
| 12 in             | 45°                |                                                                                |
| 15 in             | 60°                |                                                                                |
| Vertical (~16 in) | ~70–90°            | Near the 70° anatomical limit, so add 10–20° of forearm lift or finger opening |

The angles follow [Armey](https://halftimemag.com/sectionals/going-to-new-heights.html), with impact at a neutral wrist.

**Fingers at the top of a free stroke [I]:** the back fingers open slightly (MCP 10–20° less flexion) so the butt can swing toward the palm-heel. They close on the way down. The fulcrum (thumb–index contact) does not slide.

**Traditional left hand [I]:** see §1.2. Taps use about 10–15° of supination. A forte stroke uses about 40–60° supination plus 15–25° wrist.

**Rebound timing [I, from Dahl's figures]**

- A free stroke at mf is an approximately symmetric arc: the down half is slightly faster than the up half.
- Contact lasts about 2–5 ms ("a few milliseconds"), so in animation treat impact as a single-frame direction reversal.
- At slow tempo, after the rebound the stick rests or hovers before the next prep.
- At fast tempo it is a continuous sine-like oscillation.
- Prep lead: the wrist peaks before the stick by about 10–20% of the cycle at slow tempo, falling toward 0 or anti-phase at 300 bpm.

### 2.3 Default kit posture at impact [I]

| Joint           | Default                                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shoulder        | Flexion ~20–35°, abduction ~15–30°, mild internal rotation                                                                                            |
| Elbow           | Flexion ~80–100°                                                                                                                                      |
| Forearm         | Matched: per grip (German +85, American +45, French +10). Traditional left: −35…−45.                                                                  |
| Wrist (matched) | Neutral flex/ext; ulnar deviation ~10–15°. Traditional left: slight extension and radial deviation, so the line runs straight to the thumb tip (UAB). |
| Stick           | ~3–10° below horizontal toward the tip on snare; steeper on high toms and cymbals                                                                     |
| Bead            | ½ in above the head when "set" (UAB)                                                                                                                  |

---

## 3. Stick tricks

**Caveat.** Written sources on tricks are thin. Most of the web material on stick tricks is low-quality SEO copy. The descriptions below combine the better sources ([Drumeo/Glen Sobel](https://drumeo.com/beat/?p=22237), [drumhelper](https://drumhelper.com/?p=8488), [electronicdrumadvisor](https://www.electronicdrumadvisor.com/?p=3178), [devilstick.org flourishes](https://devilstick.org/General/handstick_flourishes.html)) with mechanics I have inferred. **All timings are [I].**

**Timing anchor [I, physics]**

- A toss that rises h metres is airborne for t = 2·√(2h/g).
  - h = 15 cm gives ~0.35 s.
  - h = 30 cm gives ~0.49 s.
  - h = 60 cm gives ~0.70 s.
- In-hand twirls are typically fitted to one beat, the gap between two quarter-note hi-hat hits ([Drumeo](https://drumeo.com/beat/?p=22237)). That is about **0.4–0.6 s per revolution at 100–150 bpm**. Fast show players manage about 3–4 rev/s in continuous spins.

### 3.1 The "rock twirl" / cigar-grip propeller: the most common mid-song kit trick

Sources: [Drumeo, Glen Sobel](https://drumeo.com/beat/?p=22237) [S]; [devilstick "Drummer's flourish"](https://devilstick.org/General/handstick_flourishes.html) [S].

**Start.** Slide the stick so its **midpoint** is clamped between the **index and middle fingers** at the proximal phalanges (the "cigar grip"). Release the thumb. **Turn the palm toward yourself**, i.e. supinate to about −30…−60° with the hand raised and fingers spread. The stick then spins in a plane roughly parallel to the palm, so the audience sees a propeller disk.

**Drive.** "Apply a bit of pressure between your second and third fingers, using your knuckles as a pivot point; the stick will start rocking back and forth" (Drumeo). Momentum then carries it into full rotation. The devilstick source says the spin comes from **forward-backward wrist motion**: small radial/ulnar deviation or flexion/extension oscillation at the spin frequency, about ±10–15° [I].

**Finger action [I]**

- The index and middle fingers act as a loose axle. They alternately squeeze and release (abduction/adduction about ±5–10°) once per half-revolution.
- The stick slides between them rather than being fixed.
- The ring and little fingers stay extended out of the way. The thumb is parked alongside.

**End.** As the butt end comes round toward the palm, the thumb closes on it. The fingers wrap and the hand slides back down to the 1/3 fulcrum (or simply re-grips at mid-stick and adjusts over the next stroke). Pronate back to the playing angle and play.

**Timing [I].** 1 revolution per beat at moderate tempo. Showmen do 2–4 continuous revolutions (about 0.25–0.4 s each).

**When [S].**

- "Playing a single stroke while doing a twirl in between hits", easiest in a rock groove where the hi-hat hand plays quarter notes.
- While one hand twirls, the other can cover its notes.
- Use at the end of songs and in sparse sections, not ballads ([Drumeo](https://drumeo.com/beat/?p=22237); [Long & McQuade](https://www.long-mcquade.com/blog/260/In-Defence-of-the-Stick-Spin.htm)).

### 3.2 Finger-to-finger twirl (the "shuffle" through the fingers)

[S] [electronicdrumadvisor](https://www.electronicdrumadvisor.com/?p=3178) and secondary sources; mechanics [I].

**Sequence.** The stick passes successively thumb/index → index/middle → (over the middle) middle/ring → ring/little, then wraps back to thumb/index.

**Per step [I]**

- The finger that currently has the stick on its far side flexes at the MCP (about 60–80°) and pushes the stick end around.
- The next finger abducts to open a gap, then adducts to capture it.
- Each transfer is a half revolution of the stick about an axis roughly along the fingers' length.
- Palm faces down or toward the drummer.

**Timing [I].** Each finger transfer takes about 0.08–0.15 s. A full cycle through four gaps takes about 0.4–0.6 s. This is more of a fidget/practice trick than a stage trick.

### 3.3 Thumb-around twirl (forward twirl, and the drumline "back twirl")

**Forward twirl around the thumb [I]**

- From playing grip, release the back fingers.
- The index finger flicks the butt end up and over the thumb, with the thumb pad acting as the axle at the fulcrum.
- The stick makes one revolution in the vertical plane of the forearm, tip going down, forward and up.
- The middle finger (sometimes the index) catches it and re-closes. The back fingers re-wrap.
- Wrist: a small flexion "dip" of about 10–20° to add momentum.
- Duration about 0.3–0.5 s.

**Back twirl [S]** ([drumhelper](https://drumhelper.com/?p=8488))

- "Hold the stick between your thumb and pointer finger … do a backward flipping motion … you need to do a bit of a dip with your hand to get backward momentum." It is used to finish with a cymbal hit.
- Mechanics [I]: the wrist flexes about 20° and the hand dips about 3–5 cm, then the wrist snaps into extension. The tip goes up and back toward the drummer. The stick rotates once around the thumb–index pinch, with the back fingers lifted clear. The middle, ring and little fingers recapture it.

**Horizontal thumb roll [S]** ([devilstick](https://devilstick.org/General/handstick_flourishes.html)): the stick held horizontally rotates around an upright thumb. Clockwise from above is the right hand's natural direction. It is driven by the wrist, not the arm, and it is easier around the outside of the thumb.

### 3.4 Flip / toss

[S] [drumhelper](https://drumhelper.com/?p=8488), [electronicdrumadvisor](https://www.electronicdrumadvisor.com/?p=3178).

**Front flip / toss**

- "Toss it in the air by pulling your arm toward your body … this will propel the stick forward". Alternatively, "push its bottom with your little finger over your index finger", which makes one full circle.
- Catch it "near the balance point" after one rotation.
- Mechanics [I]: a quick elbow flexion of about 20–40° plus wrist flexion, released at the top. The little finger and palm-heel give the butt a final push for spin.
- Flight about 0.35–0.5 s for a 15–30 cm toss. Catch with the palm facing the stick's descent, then re-grip.

**Back flip / half flip**

- Hold the stick near the bottom: the further down, the more leverage.
- Toss and catch after 180° (half flip) or 360°.
- **A half flip is used to swap to the butt end mid-song.**

**Around-the-back / over-the-shoulder toss:** entertainment only.

### 3.5 Fake twirl and palm spin

**Fake twirl ("scissor")** [S] ([drumhelper](https://drumhelper.com/?p=8488); [electronicdrumadvisor](https://www.electronicdrumadvisor.com/?p=3178))

- The stick is between the index and middle fingers. The fingers scissor alternately (flexion/extension about ±20–30°), so the stick wags in a cone.
- It looks like spinning without full rotation.
- It is cheap to animate and loopable at about 3–5 Hz [I].

**Palm spin** [S] ([electronicdrumadvisor](https://www.electronicdrumadvisor.com/?p=3178))

- Pinch the stick at its balance point between thumb and index, palm up (about −80°).
- Give it a sideways flick, open the hand so it spins flat across the palm, then close the fingers as it slows.

### 3.6 Showmanship context

- **Rikki Rockett** is cited for spins ([Long & McQuade](https://www.long-mcquade.com/blog/260/In-Defence-of-the-Stick-Spin.htm)).
- **Bonham** twirled often in early Zeppelin, using matched grip for it ([vintagedrumforum](https://www.vintagedrumforum.com/post/335693)) [S-weak].
- Glen Sobel (Alice Cooper) is a contemporary twirl teacher ([Drumeo](https://drumeo.com/beat/?p=22237)).
- **Not verified:** specific trick claims about Gene Krupa, Tommy Lee, Travis Barker and Steve Smith. Search results on these were SEO junk. Krupa's showmanship was mostly visual stroke flourishes and stick-throwing; that is general knowledge [I], not sourced here.
- **Stick clicks** [I, common practice]: the count-in "1-2-3-4" is clicked stick-on-stick overhead or in front of the face. One stick is held horizontal and the other strikes it near the shoulder. The forearms are about vertical and the hands at about face height. This is by far the most frequent "trick" any kit drummer performs.

### 3.7 Backsticking (drum corps and pipe band)

[S] [Wikipedia: Backsticking](https://en.wikipedia.org/wiki/Backsticking); [MD Rudimental Symposium 1979](https://www.moderndrummer.com/article/august-september-1979-rudimental-symposium-back-sticking/).

- The **butt end strikes the drum** as the stick swings over. "The most common method is executed simply by turning the right wrist upward sharply at a 90-degree angle".
- In effect the hand flips through about 180° so the butt end comes down. Practitioners include Jeff Queen (_Blast!_), and it may go back to A. R. Carrington in the 1870s.

**Mechanics [I]**

- From a tap, the wrist snaps up (extension plus supination). The fingers open and let the stick pivot about the thumb–index pinch until the butt points down at the head.
- The butt hits. The wrist pronates and flexes back, and the stick rotates back to normal.
- Each backstick takes about one 8th to one quarter note.
- It is not a kit technique.

### 3.8 Which trick to animate for a kit drummer mid-song [I]

1. **Count-in stick clicks**: before almost every song.
2. **One rock twirl (§3.1) in the hi-hat hand**, during a quarter-note groove or a bar of rest, often followed by a crash. One revolution, about 0.4–0.6 s, and the other hand may cover the backbeat.
3. **Half flip to butt end** for a heavy section, or a **toss** at a song's end.
4. During rests of a bar or more: **fake twirl / idle spins**.

Finger-to-finger and backsticking are rarely seen on kit.

---

## 4. Suggested keyframes

All values below are [I]. They are built from the sourced numbers above.

**American matched grip, right hand, mf full stroke at 100 bpm 8ths (300 ms per hand cycle)**

| Phase (% of cycle) | Shoulder flexion | Elbow flexion | P/S  | Wrist (+ext) | Ulnar deviation | Index MCP / PIP | Back fingers MCP | Bead height |
| ------------------ | ---------------- | ------------- | ---- | ------------ | --------------- | --------------- | ---------------- | ----------- |
| 0 impact           | 25°              | 90°           | +45° | 0°           | 12°             | 50 / 70         | 60°              | 0           |
| 15 rebound         | 25               | 90            | +45  | +15          | 10              | 50 / 70         | 50 (open)        | 4 in        |
| 45 top             | 27               | 88            | +45  | +30          | 8               | 50 / 68         | 45 (open)        | 9 in        |
| 70 accelerating    | 26               | 90            | +45  | +15          | 10              | 50 / 70         | 55               | 4 in        |
| 100 impact         | 25               | 90            | +45  | 0            | 12              | 50 / 70         | 60 (closed)      | 0           |

- Lag the stick relative to the wrist by about 5–10% of the cycle at this tempo (Dahl). The hand peaks slightly before the stick.
- At slow tempo, add a hover/rest after the rebound.

**Traditional left hand, same stroke:**

| Phase  | P/S  | Wrist (+ext) | Bead height |
| ------ | ---- | ------------ | ----------- |
| Impact | −35° | +5°          | 0           |
| Top    | −80° | +15°         | 9 in        |
| Back   | −35° | +5°          | 0           |

- The index curls more as the stick is "thrown" down. The ring finger lifts on the way up.

**German forte, slow (Moeller accent).** Use the §1.3 sequence:

| Phase       | Shoulder flexion | Elbow travel | Wrist                     | Stick                  |
| ----------- | ---------------- | ------------ | ------------------------- | ---------------------- |
| Up          | +10°             | Lift 10 cm   | −30° (flexed; tip trails) | Trailing               |
| Top / Cobra | —                | —            | +65°                      | Vertical               |
| Whip        | Down             | Drops        | Snaps to 0° at impact     | —                      |
| Stop        | —                | —            | —                         | Bead 1–2 in above head |
