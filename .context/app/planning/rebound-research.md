# Drumstick rebound: the physics, sourced

Prepared 2026-10-11 for the drummer view's stick bounce (`lib/app/breaks/drummer/rebound.ts`, used by `strokes.ts` and `pose.ts`; see [`../anatomy.md`](../anatomy.md#the-rebound)). It covers the stick as a rigid body, what happens at the head, the grip as a mechanical element, and the measured motion of drummers' hands and tips. Where the model takes a number from here, the code cites it.

**Evidence tags** (as in [`grip-research.md`](./grip-research.md))

- **[S]**: stated by a paper, thesis or patent.
- **[S-weak]**: a forum, a blog, pedagogy, or a search summary that could not be opened.
- **[I]**: my own derivation, with the arithmetic shown. Treat it as a reasoned default, not a measurement.

**Sources, abbreviated below**

- **Wagner**: A. Wagner, _Analysis of drumbeats – interaction between drummer, drumstick and instrument_, KTH MSc thesis, 2006. <https://www.speech.kth.se/publications/masterprojects/2006/AndreasWagner.pdf>
- **DahlFA11**: Dahl, Grossbach & Altenmüller, Forum Acusticum 2011. <http://www.sofiadahl.net/pdf/DahletalForumAcusticum2011.pdf>
- **DahlAST**: S. Dahl, "Striking movements: a survey of motion analysis of percussionists", _Acoust. Sci. & Tech._ 32(5), 2011. <https://vbn.aau.dk/ws/files/65339564/Dahl_J_AST_review_submi.pdf>
- **DahlThesis**: S. Dahl, PhD thesis, KTH, 2005. <https://kth.diva-portal.org/smash/get/diva2:11296/FULLTEXT01.pdf>
- **Yamaha**: patent US8916759B2. <https://patents.google.com/patent/US8916759B2/en>
- **Stillfried**: Stillfried et al., _Front. Neurorobot._ 2018. <https://epub.ub.uni-muenchen.de/66473/1/fnbot-12-00009.pdf>
- **Miura23**: Miura, Forum Acusticum 2023. <https://dael.euracoustics.org/confs/fa2023/data/articles/001235.pdf>

---

## 0. The numbers the model is built on

| Quantity                             | Value                                        | Tag   | Source                    | In the code                  |
| ------------------------------------ | -------------------------------------------- | ----- | ------------------------- | ---------------------------- |
| Stick mass (5B)                      | 53 g (60 g with strain gauges)               | S     | Wagner; DahlFA11          | `STICK_BODY.mass`            |
| Stick masses in general              | 40–70 g                                      | S     | Wagner                    |                              |
| Centre of mass from the butt         | 0.42–0.57 L; a tapered 5A ≈ 0.43 L (0.176 m) | S / I | US8977515; §1             | `STICK_BODY.com`             |
| Fulcrum from the butt                | ≈ L/3                                        | S     | Wagner                    | `STICK.grip` (kit-layout)    |
| Moment of inertia about the fulcrum  | ≈ 7 × 10⁻⁴ kg·m²                             | I     | §1                        | `I_STICK` (derived)          |
| Effective mass at the tip            | 9–13 g                                       | I     | §1                        |                              |
| Contact time, drums                  | 3.5–8 ms, shorter with force and tension     | S     | Wagner; DahlFA11          | (impact is instantaneous)    |
| Peak force                           | 2–107 N (mean 32 N); up to 200 N             | S     | DahlFA11; Wagner          |                              |
| Restitution, 12" tom at 6.3 m/s      | 0.73                                         | S     | Yamaha                    | `SURFACE` is anchored on it  |
| Restitution, other surfaces          | see §3: estimates against the tom            | I     |                           | `SURFACE`, `OPEN_HAT`, `RIM` |
| Grip as a torsional spring           | 0.5–7 N·m/rad                                | I     | §4, from roll rates       | `GRIP_LOOSE`, `GRIP_TIGHT`   |
| Back fingers / palm as a stop        | 5–20 N·m/rad                                 | I     | §4                        | `CATCH`                      |
| Spring–stick resonances (prosthesis) | 3.7–6.3 Hz; a stiff mount 27 Hz              | S     | Stillfried                |                              |
| Fastest roll                         | ~30 Hz                                       | S     | Hajian 1997               |                              |
| Fastest single strokes, one hand     | 6–7 Hz (the record 10 Hz)                    | S     | Fujii 2009 via Stillfried |                              |
| Bounces per roll stroke              | 3–9                                          | S     | Miura23; DahlAST          |                              |
| Tip speed at forte                   | 4–6 m/s in one player                        | S     | DahlFA11                  | `THROW`                      |
| Accent against an unaccented stroke  | struck ≈ 2× faster                           | S     | DahlAST                   |                              |
| Hand vs stick phase                  | hand leads; near anti-phase when fast        | S     | DahlAST; DahlThesis       | `wristLead`, `OPEN_GAP`      |

---

## 1. The stick as a rigid body

**Measured sticks [S]**

- Sticks in general are 38–42 cm long and weigh 40–70 g (Wagner §2.2).
- Vic Firth American Classic 5B, hickory: 406.4 mm long, 15.0 mm shaft, 53 g (Wagner §3.1). DahlFA11 gives the same stick as 60 g, but it carried strain gauges.
- Premier KP2, maple: 404 mm, 56 g (Wagner).
- A wooden stick's centre of gravity lies 42–57.3 % of its length from the butt (patent US8977515).
- Wagner puts the fulcrum "approximately one third of the stick length measured from the rear end".

**Moments of inertia [I]**, L = 0.406 m, m = 0.053 kg

- As a uniform rod: I_cm = mL²/12 = 7.28 × 10⁻⁴ kg·m², and about L/3 from the butt I = I_cm + m(L/6)² = 9.71 × 10⁻⁴.
- As a tapered 5A (14.5 mm shaft to 0.24 m, tapering to 8.5 mm at 0.385 m, then the neck and a 10 mm bead): the centre of mass is 0.176 m from the butt, I_cm = 6.04 × 10⁻⁴, and I about 0.135 m = 6.91 × 10⁻⁴.
- The model takes the centre of mass at 0.176 m and, for simplicity, a rod's I_cm. Its weight turns the stick tip-down about the fulcrum (the centre of mass is 4.6 cm on the tip side), and a loose stick flying up slows at the tip by about g.

**Why a third of the way up [I]**

- For a rod struck at one end, the point that feels no jolt is the conjugate of the centre of percussion: b = k²/a from the centre of mass, with k² = L²/12 and a = L/2. That gives b = L/6, which is **exactly L/3 from the butt** for a uniform rod, and 0.31 L for the tapered one (9 mm from the 1/3 fulcrum).
- So a stick held there is struck back up by the head without a blow reaching the hand: the rebound turns it about the fulcrum. That is what the model does at each impact: the head reverses the tip's speed, the stick takes all of it, and the hand none.
- **No source says this.** Practitioners call the grip point the "balance point", the "sweet spot" or the "nodal point" of least vibration (Workman, _Percussive Notes_ 2001 [S-weak]). A patent puts a null of the first bending mode (~400 Hz) where drummers hold the stick (US9852720 [S]). For a free–free beam that node is at 0.224 L, not L/3 [I]; taper and the hand both move it. The rigid-body coincidence is a derivation, not a cited fact.

---

## 2. At the head

**Contact time [S]**

- 5–8 ms for a mezzoforte stroke at the centre of a tom or snare (DahlAST §2); 5–10 ms (DahlThesis §1.4).
- 4.5–8 ms across p, mf and f on a 14" rototom; peak force is inversely related to contact time (DahlFA11 Fig. 4).
- On a snare batter head alone, 3–6 ms, the stick leaving at about 3.5 ms in a forte stroke, with re-contacts as waves come back from the rim (Wagner).
- Higher tension, and strokes nearer the rim, give shorter contact (Wagner).
- About 0.25 ms on a cymbal (Kaselouris et al., _Acoustics_ 2023, from a search summary; not verified) [S-weak].

At 60 frames a second a contact of a few milliseconds is a single instant, so the model makes impact instantaneous.

**Contact stiffness [I]**, treating the head as a linear spring with τ = π√(m_eff/k)

- For m_eff = 13.2 g: τ = 8 ms gives k ≈ 2.1 kN/m, τ = 5 ms gives 5.3 kN/m, and τ = 3.5 ms gives 10.7 kN/m.
- Check: peak force = v√(k·m_eff) = 4 m/s × √(5250 × 0.0132) ≈ 33 N, which matches Dahl's mean of 32.4 N.

**Contact model**

- Hunt–Crossley: F = k·xᵅ + λ·xᵅ·ẋ (Papetti, Avanzini & Rocchesso, IEEE TASLP 2011 [S]). At low speed its restitution falls about linearly with impact speed, e ≈ 1 − α·v [I: the paper cites it; the equation did not survive PDF extraction]. The model's `fade` is that α. No drum-specific value was found.

---

## 3. Restitution

**Measured**

- A 12" × 11" acoustic tom, struck at 6.3 m/s ("equivalent to mezzo forte") by a mechanical arm of stick-equivalent mass, with no hand: **e = 0.73**. With PET film dampers 0.67; fully bonded, 0.55 (Yamaha [S]). It is an upper bound for a held stick, since a hand adds damping.
- A steel ball dropped on drums and pads: the acoustic snare gives back more than a mesh pad, a rubber pad and a silicone pad, and spans the widest range between hard and soft tunings (Miura, _Acoust. Sci. Tech._ 33(3) 2012 [S, values not extractable]).
- A stick dropped about a fulcrum: a 14" floor tom matched a pneumatic pad at its lowest pressure, a 14" snare matched it at 0.15 psi, and tightly tuned rack toms matched 0.3 psi (Sheffield et al., NIME 2015 [S, qualitative]). So restitution rises with tension.
- Nothing measured was found for the kick, ride, crash, hats or rim.

**The model's values [I]**, set against the tom so a tom gives 0.73 at 6.3 m/s

| Surface     | e at low speed | Fall-off per m/s | Reasoning                                   |
| ----------- | -------------- | ---------------- | ------------------------------------------- |
| Snare       | 0.92           | 0.025            | tuned tightest: liveliest                   |
| Rack toms   | 0.87, 0.84     | 0.026, 0.028     | the measured tom                            |
| Floor tom   | 0.75           | 0.032            | slackest drum                               |
| Ride        | 0.78           | 0.025            | a stick bounces off the bow, as players say |
| Closed hats | 0.70           | 0.03             | two cymbals clamped                         |
| Crash       | 0.55           | 0.03             | swings away from the stick                  |
| Open hats   | 0.40           |                  | the cymbals apart give under it             |
| Rim         | 0.45           |                  | the stick's bending modes take the energy   |

---

## 4. The grip

**Observed [S]**

- In a "controlled" stroke, the stick stopped near the head, contact is shorter, peak force higher, and the stroke rated "less full" than a free one (Dahl & Altenmüller; DahlAST §5). No numbers in the accessible texts.
- A firmer grip resists forces up to 200 N but "would reduce the rebound" (Wagner).
- Drummers vary the hand's stiffness to set the bounce frequency, so a roll reaches about 30 Hz despite reaction times over 100 ms (Hajian, Sanchez & Howe, ICRA 1997, via abstract and citations). People grip harder to roll faster (Stillfried).
- A prosthetic cuff with leaf springs and a stick resonated at 3.7–6.3 Hz; a stiff mount at 27 Hz. Matching that resonance to the playing rate did not help (Stillfried).
- Robots: the Georgia Tech drumming prosthesis emulates grip tension with a motor to shape the bounce (Bretan & Weinberg); ZRob uses a passive non-linear spring gripper (Karbasi, NIME 2023), and in it the time between first and second bounce depends on the spring, not the stroke (Yamanaka et al. 2026). None publishes a stiffness.
- A physics-based virtual percussionist (Bouënard, Wanderley & Gibet, ICMC 2009) drives its joints as PD springs, τ = kₛ(S − T) − k_d·Ṡ, hand-tuned, values unpublished. The same group measured a timpani player's tip range at 434 mm in French grip against 179 mm in German.

**Grip stiffness [I]**, with I ≈ 7 × 10⁻⁴ kg·m²

- If the stick swings off the head as half of a torsional oscillation, T_half = π√(I/k), so k = I·π²/T²: 33 ms (30 Hz) needs about 6.3 N·m/rad, 50 ms about 2.8, and 100 ms about 0.7.
- So a grip of roughly 0.5 (loose) to 7 (a press roll) N·m/rad, and the back fingers and palm as a one-sided stop of perhaps 5–20 N·m/rad.

**Fingers at the top of a stroke** (from [`grip-research.md`](./grip-research.md) §2.2 and §1.5): the back fingers open 10–20° at the top of a free stroke, and in push-pull the stick swings 10–25° in the hand. The model's slack is 20°: with less, the fingers catch the rebound so soon that it carries the hand up with it straight off the head.

---

## 5. Several bounces: buzzes, rolls, doubles

**Measured [S]**

- Closed rolls have "clusters of up to six hits per stroke" (DahlAST §2.2).
- 3–5 bounces per arm motion at mf, up to 8–9 at p; the left–right interval is 250–350 ms for professionals and 200 ms for an amateur. Players soften a roll by spacing the strokes, adding bounces, or both (Miura23).
- Amplitude falls across successive bounces (Yamanaka et al. 2026).

**Derived [I]**

- Under a constant restoring acceleration the rebound speed falls as e^k·v₀ and the gaps between bounces as e·Δt: a geometric decay. Under a linear torsional spring the gaps stay nearly even, which fits the even intervals of a soft robot arm.
- From 1 m/s to 0.05 m/s at e = 0.7 takes ln(0.05)/ln(0.7) ≈ 8.4 bounces, inside Miura's 3–9.
- A double stroke played purely off the rebound comes back at about e of the first note's speed, so ≈ 0.7. Pedagogy says the second note is naturally "too close … and too soft" and must be "pulled" (Modern Drummer, Oct. 2015 [S-weak]). No measured ratio was found.

The model plays a buzz as one pressed stroke. The sound's repeats are already fixed — a quarter of a step apart (`BUZZ_REPEATS` in `perform.ts`), about 30 Hz at 120 bpm, inside the roll rates above — so rather than tune a spring and hope the bounces fall on them, the fingers press each bounce down just hard enough (a constant pull over its flight) to land it on the next repeat. Each bounce leaves at e of the speed it came in at, so the heights fall geometrically, as Yamanaka's do; the gaps are the repeats', even, as a soft arm's are. The last repeat is held on the head.

---

## 5a. The kick pedal [I]

No measured restitution was found for a felt beater on a kick head; the model
takes 0.6 at low speed, falling 3.5 % per m/s (§3's guess of 0.4–0.5 for a
forte stroke). The pedal's spring returns the board from the head in about a
tenth of a second (a 3 Hz spring on the board's travel), and the foot is a
stiff, one-sided stop: it can hold the board down, never pull it up. Whether a
note is buried — the beater held against the head — is a player's choice; the
model buries most loud lone heel-up notes, as rock players do, and lets soft
notes and the first of a run come off the head (the run's next note is played
off the rebound).

## 5b. The hi-hat pedal and the kick's front head [I]

Nothing measured was found for either. The hat stand's spring is taken as
5 Hz on the pedal's travel (the hats apart in about a twentieth of a second),
the sole as a 15 Hz one-sided stop that presses a little past where the foot
means the board, so a held pedal is shut against the spring rather than
sagging open, and the top cymbal comes off the bottom one at 0.3 (felt, a
clutch, two plates). The kick's front head would ring at about 52 Hz, a
low-tuned 22-inch reso, dying fast (ported or muffled); the model bows it out
in the shape of a membrane's (0,1) mode, J0(2.405 r/R), but draws it at
18 Hz, under half a 60 fps frame rate, so it is seen to shiver rather than
aliased into a drift, and shakes it across its face as well — a head seen
from the front barely shows a few millimetres toward the camera.

## 6. Speed, height and phase

**Speed and height [S]**

- Striking speed rises about linearly with preparatory height (DahlFA11 Fig. 3, axes 0–700 mm and 0–14 m/s). One player's forte strokes were 4–6 m/s, the same range another used for mf.
- Accents are struck about twice as fast as unaccented strokes, at every dynamic (DahlAST §4); marker-based speeds read about 30 % low.
- Players strike faster on soft surfaces and slower on hard ones (DahlThesis §2.3).

The model throws the stick from where it waits with an even acceleration of about 3½ g (`THROW`), so a stroke from 0.3 m lands at 4.5 m/s. Speed then goes as the square root of height, not linearly: from the plan's heights that keeps forte inside Dahl's 4–6 m/s and a ghost from an inch at about 1 m/s. Tying speed to the throw's duration instead slammed fast notes down and sent them back up higher than there was time for.

**Phase [S]**

- The wrist leads the upstroke with the stick lagging, tip down; then the stick is "flicked … and flung down", like a whip (DahlThesis Fig. 1.1; DahlAST §2.1).
- At faster tempi the rebound becomes part of the next upstroke, and the preparatory height shrinks (DahlAST Fig. 3, 50/120/300 bpm). At 300 bpm wrist and stick are nearly in anti-phase.
- Before an accent some players start the hand up before the hit before it, so hand and stick move in near anti-phase and that note comes out weaker (DahlThesis §2.3).

---

## Gaps

- No measured restitution for cymbals, hats, rim or kick; no measured hat-stand spring or kick reso motion.
- No measured grip stiffness: Hajian 1997 could not be reached.
- No measured ratio for the second note of a double.
- Dahl & Altenmüller's grip effects are qualitative only.
- Unreachable: Kaselouris 2023 (MDPI), Oss 2022 (_Phys. Educ._ 57 065021, a drumroll model), Hajian 1997 (IEEE), ResearchGate copies of Dahl 2004.
