# How drummers move: wrist, forearm, fingers and body, sourced

Prepared 2026-10-17 for the drummer view's strokes and groove (`lib/app/breaks/drummer/strokes.ts`, `rebound.ts`, `pose.ts`, `expression.ts`). It covers which joint starts a stroke and which keeps it going, how the forearm comes in and when, how that changes with how heavily a style is hit, and what the head and body do. Where the model takes a number from here, the code cites it. The stick's own physics is [`rebound-research.md`](./rebound-research.md); the grips are [`grip-research.md`](./grip-research.md).

**Evidence tags** (as in [`grip-research.md`](./grip-research.md))

- **[S]**: stated by a paper or a drum educator's published method.
- **[S-weak]**: secondary press, or a description of one player.
- **[V]**: seen in footage of drummers playing, frame by frame (list below). Qualitative: no camera was calibrated.
- **[I]**: my own synthesis or estimate. A reasoned default, not a measurement.

**Sources, abbreviated below**

- **DahlAST**: S. Dahl, "Striking movements: a survey of motion analysis of percussionists", _Acoust. Sci. & Tech._ 32(5), 2011. <https://vbn.aau.dk/ws/files/65339564/Dahl_J_AST_review_submi.pdf>
- **Trappe**: Altenmüller, Trappe & Jabusch, _Front. Psychol._ 2020 (experts vs beginners, 300 Hz mocap). <https://www.frontiersin.org/articles/10.3389/fpsyg.2020.538958>
- **DahlFriberg**: Dahl & Friberg, _Music Perception_ 2007 (what conveys expression in a percussionist's movement). <https://vbn.aau.dk/ws/portalfiles/portal/65338170/DahlFriberg07_MusPerc.pdf>
- **Loria**: Loria et al., _Front. Psychol._ 2021 (marimba players' movement styles). <https://www.frontiersin.org/articles/10.3389/fpsyg.2021.725016/full>
- **Bachman**: B. Bachman, _Modern Drummer_, Feb 2010 (free, down, up strokes; Moeller). <https://www.moderndrummer.com/wp-content/uploads/Bachman_February-2010.pdf>
- **ChadSmith**: Drum Channel, Chad Smith workbook. <https://www.drumchannel.com/wp-content/uploads/2020/06/CSmithMC_Wkbk-1.pdf>
- **Armey**: L. Armey, Halftime Magazine, stick heights and wrist angles. <https://halftimemag.com/sectionals/going-to-new-heights.html>
- **Footage [V]**: a Moeller stroke in slow motion, front and side (YouTube D8Xgo4sb-4w); Lars Ulrich in slow motion and on a drum cam (ZwrfkV7tGQM, t0cDBuEOdIA); Taylor Hawkins live (DMaofil4xO4); Chad Smith, "Give It Away" (zV7tNP0H_M8); Questlove, close up (1yRmBiAWc78); Steve Gadd, "50 Ways" (w10EvTgxb-s); John Bonham, Royal Albert Hall 1970 (IOb8otk7Y0U); Elvin Jones (0YVOd1hK0_w).

---

## 0. What the model takes from here

| Claim                                                                        | Tag   | Source               | In the code                                         |
| ---------------------------------------------------------------------------- | ----- | -------------------- | --------------------------------------------------- |
| The wrist starts every stroke; the stick lags it, then is flicked through    | S     | DahlAST              | `strokes.ts` `pullOf`; `rebound.ts` `WRIST_AT_HEAD` |
| The fingers never throw a raised stick; they keep the rebound going          | S / I | Bachman; DahlAST; §1 | `fingersOf` (the rebound), `letGo`                  |
| …except a note too close for the wrist to throw again: the pull of push-pull | S     | Bachman; §1          | `PULL_GAP`                                          |
| Experts use the wrist more and the elbow less than beginners, at speed       | S     | Trappe               | `armShare` (small for taps, `ARM_SIZE`)             |
| Accents and rock backbeats are the forearm's, the wrist loose behind it      | S     | ChadSmith; Bachman   | `ARM_BIG`, `HEAVY_ARM`                              |
| The forearm leads the downstroke; it never rises ahead of the hand           | S / V | DahlAST; Bachman; §2 | `armSource`, `ARM_LEAD`, `led` in `arm`             |
| The forearm turns up about the elbow, which stays by the ribs                | V     | §2                   | `hinged`                                            |
| On the hats, the beat is a downstroke from up high, the "and" a tap off it   | S     | ChadSmith            | `HAND.pulse`, `pulseOf`                             |
| Height ↔ wrist angle: 3" 10°, 6" 20°, 9" 30°, 12" 45°, 15" 60°               | S     | Armey                | (the heights in `HAND.height`, `HAND.heavy`)        |
| Expression is carried by the head and upper body more than by the hands      | S     | DahlFriberg          | `backbeatAt`, `GROOVE_NOD`, `BACKBEAT_*`            |
| Light players sway side to side; heavy ones heave front to back              | S / I | Loria; §3            | `SWAY_ROLL`, `SWAY_TILT`; `HEAVY_NOD`, `HEAVY_DIP`  |
| Head down into the 2 and 4, deepest just after the stroke                    | V / I | §3                   | `BACKBEAT_FROM`, `BACKBEAT_PEAK`                    |

## 1. Who starts a stroke, and who keeps it going

Dahl's survey of motion capture puts it plainly [S]: "the movement is initiated from the wrist… the hand lead the upward movement with the stick lagging behind, tip pointing down. As the stick approaches the maximum vertical displacement… the hand initiates the downstroke, flicking the stick down." The hand going first gives the stick a runway to speed up at little cost.

Trappe's mocap [S] of fast single strokes on a pad found experts using the wrist and the knuckles with "minimal" elbow and a near-still shoulder, a "whip-lash-like motion". Beginners did the opposite, making up for a weak wrist with the elbow. That is speed on a pad. On a kit the forearm does more (§2), but the lesson for taps holds: a tap is the wrist's, with the forearm hardly in it.

The fingers do strike, but never from a stick held still and raised [S, I]. In each case the stick is already moving off the head:

- The second note of a double is "played mainly with the fingers" (Modern Drummer).
- Push-pull's "pull" is the fingers closing on a stick already coming up (Jojo Mayer).
- After a Moeller accent, the taps "bounce" off its rebound until "finger control will become necessary" (Bachman).

So the rule the model plays by is: **every throw is the wrist's (and the forearm's, for a big one); the fingers keep the rebound**, letting the stick fly up in them and holding it there on fast notes so the wrist need only turn a little, and they let go of it before the throw. The one exception is a note too close behind for the wrist to throw again, roughly a 16th at 120 bpm in one hand, where the fingers' pull plays it (`PULL_GAP`, 0.12–0.2 s).

The owner put the same rule in their own words, from watching the drummer: "the fingers shouldn't trigger the initial hit — the fingers should only be used to take advantage of the rebound."

## 2. The forearm, and how heavily a style is hit

**Accents and backbeats.** "The power for playing an accented note or rim shot comes from the forearm… wrist and grip are relaxed so the stick and wrist literally bounce off the drum" (Chad Smith [S]). Bachman's Moeller [S]: the forearm lifts "only on the last tap preceding the accent", and the upstroke is "where the stick taps the drum as the forearm lifts and the hand drops".

**Order.** The joints go out from the body: the forearm starts down while the wrist is still cocked back, then the wrist snaps through [S: DahlAST; V: the Moeller slow-motion side view]. On the way up the hand rises with the stick.

The model first had the forearm lead the hand up as well (Moeller's "the hand drops"). Rendered, that read as an arm held up with the hand dangling off it, "like a heron ready to catch a fish" (the owner, 2026-10-17). So the forearm now leads only the downstroke, and on the way up it rises with the hand (`led` = the lesser of the hand now and the hand a moment ahead).

**The elbow stays down.** In every clip [V] the big stroke is the forearm turning up about the elbow, which stays near the ribs. The hand comes up and in toward the chest. The upper arm moves little except reaching for a crash. An earlier model swung the elbow out and raised the shoulder with the lift, which reads as the whole arm hoisted from the shoulder. It now hinges at the elbow (`hinged`), stopping short of the elbow's range (`HINGE_MOST`, 138° of its 145°).

**Shares [I]**, synthesised from the above (no source publishes percentages):

| Stroke                   | Forearm share of the tip's height | In the code                        |
| ------------------------ | --------------------------------- | ---------------------------------- |
| Tap, ghost (≤ 6 cm)      | ~15%                              | `ARM_TAP`                          |
| Medium (~15 cm)          | ~30%                              | between, by `ARM_SIZE`             |
| Accent (≥ 30 cm)         | ~50%                              | `ARM_BIG`                          |
| The same, heaviest style | ~75% (capped at 70% and 26 cm)    | `HEAVY_ARM`, `ARM_MOST`, `ARM_TOP` |

**Weight by style.** A style's `weight` (0–1, `StyleAttrs.weight`) says how heavily it is hit: about 0.1–0.3 for jazz and Latin, 0.35–0.55 for soul, funk and the backbeat grooves, about 0.5–0.6 for rock, 1 for metal. Every style but brushes says one (2026-10-17: before then most said none and played from the fingers and wrist alone, which undersold the arm in a downstroke everywhere but jazz). Drummers by how they hit: Gadd 0.25, Copeland 0.6, Cobham 0.7, Klek 0.75. In the footage [V]:

- Gadd keeps the sticks low and the arms close; nearly all of it is wrist.
- Questlove brings the forearm well up for every backbeat, the stick near vertical by his face, even in a laid-back groove.
- Chad Smith takes the stick past vertical on the backbeat, the hand near his chin.
- Lars Ulrich and Taylor Hawkins play from the whole arm, sticks overhead into crashes.
- Bonham reaches out with long, full strokes.

Measured on the model, the forearm on a backbeat lifts about 6–8 cm at weight 0, about 15 cm in rock and about 25 cm in metal.

**Speed.** "Preparatory height decreases with increasing tempo… at faster tempi the rebound becomes the lift for the next stroke" [S: DahlAST]. Blast beats are wrists and fingers, small and fast. Slow metal backbeats are huge. The model's arm lead and share both shrink with the gap between notes (`ARM_LEAD_SHARE`, `ARM_RISE_SHARE`).

## 3. The body

Dahl & Friberg [S]: in a percussionist's movement, hand and mallet motion were "of minor importance" for conveying expression. The "head and upper part of the body played a more prominent role". Large and fast reads as happy, larger, faster and jerky as angry, and small, slow and smooth as sad.

Loria [S] found three clusters among marimba players: expressive (vertical limb movement), postural sway (rocking front to back), and energy-efficient (side to side only).

No study measures a kit drummer's head or torso [I]. From the footage [V] and those findings, the model plays:

- **Into the backbeat.** The head drops with each loud snare stroke of the groove, deepest a moment after it sounds, and comes back up before the next. The torso dips and leans with it, and the shoulder of the hand that played it goes down. About 14° of head at weight 0, about 26° in rock, and about 35° in metal, which is a headbang (Hawkins's hair flying on every 2 and 4; Lars's chin coming down). Strokes in a fill don't count: the head is following the sticks round the kit then.
- **On every beat.** The ordinary nod and bob grow with the weight.
- **Light styles sway** side to side over two beats instead of heaving (Loria's energy-efficient players; Gadd and Elvin Jones rock sideways more than they bob).

## 4. The time-keeping hand

Chad Smith [S]: on rock eighths "the motion of his arm is going down with each quarter note beat, playing the 'an' on the upstroke… on the wind-up the wrist drops and the stick makes contact… then the follow through is on each beat". The model plays a stroke on the beat about 30% taller than its strength alone gives, the "and" about 10% lower and a 16th about 20% lower (`HAND.pulse`). It never does this to a ghost, which stays an inch wherever it falls, nor to an accent, which is already tall (`PULSE_TO`).

## Known gaps

- No published millisecond lags between joints: the forearm's lead (`ARM_LEAD`, 50 ms at most, a fifth of the gap) is an estimate.
- No measured head-bob or torso amplitudes for kit drummers: §3's sizes are from watching the footage.
- No per-drummer kinematics: a style's `weight` stands in for how heavily it is hit, not for any one player's habits.
