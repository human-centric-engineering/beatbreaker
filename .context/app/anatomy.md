# The drummer's anatomy

The 3D drummer moves on an anatomical model: the bones a seated drummer
plays with, the joints between them and how far each can move. This page is
the map of that model, what it found when it was first held against the
stroke planner, and the plan for making it the basis of every drummer's
movement. The numbers and their sources are in
[`planning/anatomy-research.md`](./planning/anatomy-research.md).

## Where it lives

| Module                                            | What it is                                                                                                                                                                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/app/breaks/drummer/anatomy/arm.ts`           | `armAngles()`: an `ArmPose` read as joint angles: shoulder elevation, plane and rotation, elbow flexion, forearm pronation, wrist flexion and deviation. `torsoOf()`, `twistAbout()`, `neutralForearm()`.                                      |
| `lib/app/breaks/drummer/anatomy/rom.ts`           | `ROM`: each motion's anatomical (`hard`) and everyday (`soft`) range, with its source. `splayLimit()` (a finger's fan closes as its knuckle bends), `scapularRotation()` (the scapulohumeral rhythm), `DIP_OF_PIP`, `beyond()`, `armStrain()`. |
| `lib/app/breaks/drummer/anatomy/hand.ts`          | The hand every figure bends: `DIGITS` (measured phalanx lengths), the grip tables, and `handSetOf()`, a hand's finger and thumb angles from its `ArmPose`. The dressed drummers and the skeleton both read it.                                 |
| `lib/app/breaks/drummer/anatomy/spine.ts`         | `SPINE` (L5 to C1 at rest, seated), `spineAt()` (the torso's lean, turn and tilt shared out between pelvis, lumbar and thoracic), and `neckTurns()` (the head's turn shared down the neck).                                                    |
| `components/app/studio/drummer/bones.ts`          | The bones as shapes, each built once at its real size in its own frame. The skull and jaw are signed-distance surfaces meshed by marching cubes, so the face is one bone rather than parts stuck together.                                     |
| `components/app/studio/drummer/skeleton-model.ts` | `buildSkeleton()`: the skeleton drummer, a `DrummerModel` like `buildDrummer()`'s, posed from the same `Pose`. `fitThumb()` fits its real thumb to the grip.                                                                                   |
| `components/app/studio/drummer/figure.ts`         | `buildFigure()`: whoever sits at the kit, dressed or bones, and what to free when they leave.                                                                                                                                                  |
| `components/app/studio/drummer/hand-pose.ts`      | `bendFingers()` and `placeStick()`: what every figure does with its hand each frame.                                                                                                                                                           |
| `lib/app/breaks/drummer/hold.ts`                  | The matched hold: `GRIP_IN_HAND` (the fulcrum, in the fingers), `STICK_IN_HAND` (the stick's line across the hand) and `handFrame()`. The planner, the shows and the guide all hold sticks with it.                                            |
| `lib/app/breaks/drummer/grips.ts`                 | The grips: German, American, French and traditional, and what each asks of the arm (`GRIP_STYLE`); the choices the drummer view offers (`GRIP_CHOICES`, `gripsFor()`).                                                                         |
| `lib/app/breaks/drummer/grip-guide.ts`            | The grip guide's lessons: each grip's steps (`lessonOf()`) and both arms at any moment of them (`guideAt()`).                                                                                                                                  |
| `components/app/studio/drummer/grip-guide.tsx`    | How to hold: the modal, a film per grip (`grip-guide-stage.ts`, mounted by `grip-guide-canvas.tsx`) with its steps' instructions under it.                                                                                                     |
| `lib/app/breaks/drummer/gesture.ts`               | The waiting drummer's show: `showAt()` (when one plays), `showPose()` (both arms, the head's look), `showOverlaps()` (so the stick twirls keep out of its way).                                                                                |

The skeleton is a persona, **Mister Bones** (`kind: 'skeleton'`), so it joins
the cast. `DrummerStage` seats whoever it is given through `buildFigure()`.

## Conventions

- **Model space** is the kit's (`kit-layout.ts`): metres, `+x` the drummer's
  right, `y` up, `-z` forward. The other arm is mirrored onto the lead's
  before its angles are read, so a left arm and a right arm give the same
  numbers.
- **Angles**: 0 is the clinical zero. Elbow 0 is straight. Pronation 0 is
  thumb-up, positive is palm-down. Wrist flexion is positive toward the palm;
  deviation is positive toward the thumb. Shoulder elevation 0 is the arm
  hanging. Its plane is 0 straight out to the side and π/2 straight forward.
  Its rotation is positive inward, measured from where the forearm would
  point had the arm swung straight up from hanging.
- **A limb bone's frame**: `y` runs down the bone from its proximal joint.
  `x` is lateral on the right side, and the bone is built for the right and
  mirrored for the left. `z = x × y`. A bone is placed whole every frame and
  never stretched. The radius and clavicle are the exceptions: each is
  scaled along its length by the few millimetres its span varies.
- **Joints are the pose's.** The skeleton never moves a joint the stroke
  planner solved. The humerus runs from the planner's shoulder to its elbow,
  and the stick's bead is the planner's tip. A test pins both
  (`skeleton-model.test.ts`). What the anatomy adds is between the joints:
  the radius rolling over the ulna, the scapula following the arm, the
  vertebrae sharing the torso's turn, the jaw counting.

## What the model holds

- **Bones**: 24 vertebrae with discs, sacrum and coccyx; 12 pairs of ribs
  with the costal cartilage of the true and false ribs; sternum; both hip
  bones; clavicles and scapulae; humerus, ulna and radius; each hand's 8
  carpals, 5 metacarpals and 14 phalanges; femur, patella, tibia and fibula;
  each foot's 7 tarsals, 5 metatarsals and 14 phalanges; the skull with its
  orbits, nasal aperture and zygomatic arches; the mandible; the teeth.
- **Finger joints** in every grip table stay inside their ranges. Each DIP
  keeps half to four fifths of its PIP's bend (the flexor and the oblique
  retinacular ligament), and a finger's fan closes as its knuckle bends (the
  collateral ligaments). `rom.test.ts` holds every hand the tables can make
  to all three rules.
- **The scapula** turns up with the arm by the scapulohumeral rhythm. It
  turns little in the first 30° and then 4 of every 9 degrees, to about 50°
  (Poppen & Walker 1976; McClure et al. 2001).
- **The spine** shares the torso's turn by each region's segmental range
  (White & Panjabi). The lumbar spine takes most of the bend and almost none
  of the turn. The thoracic spine takes most of the turn. The pelvis rolls
  forward on the seat bones for an estimated third of a lean, about the line
  through both hip joints, so its sockets stay on the femoral heads. It
  leaves the turn and the side bend to the spine. The chain is
  nudged so that T1, the ribs above it and the shoulder girdle land exactly
  where the pose's rigid torso put them.
- **The neck**: half of all head turning is at the atlas on the axis
  (C1–C2), and the nod is spread down the neck with the most at the skull.
- **The fingers** are a man's measured phalanx lengths (Buryanov & Kotiuk
  2010, ×1.05), and the dressed hands now use them too.
- **Hand shapes** (`SHAPES` in `anatomy/hand.ts`) are joint angles inside
  the ranges: open, with the resting cascade; a wave, the fingers straight
  and spread; a thumbs-up, a fist (knuckles above 80°, PIPs above 90°) with
  the thumb standing out of it; the cigar grip a propeller twirl spins the
  stick in. `ArmPose.shape` blends a hand into one, and on from it into
  another (`then`).

## The grips

Four grips, each hand its own (`grips.ts`; the research is
[`planning/grip-research.md`](./planning/grip-research.md)). The drummer view
offers American, German or French in both hands, or traditional in the hand
off the hats (the lead American) or in both.

A grip is a forearm turn, as anatomy has it, not an angle of the hand in the
room. Each matched grip holds its forearm at its own turn from thumb-up
(`GRIP_STYLE.pronation`), and the hand turns with the arm. Read at every snare
and tom stroke of the sweep:

| Grip        | Forearm at the head | Teachers give | Wrist at the head                    | The stroke                                    | Elbow       |
| ----------- | ------------------- | ------------- | ------------------------------------ | --------------------------------------------- | ----------- |
| German      | 57–70° pronated     | 80–90°        | within 10° of straight, 7–22° ulnar  | the wrist; the arm for big strokes            | out         |
| American    | 30–49° pronated     | about 45°     | within 10° of straight, 8–19° ulnar  | the wrist, a little forearm turn, the fingers | hanging     |
| French      | −5 to 18°           | 0–15°         | within 10° of straight, 11–13° ulnar | the fingers and the forearm's turn            | by the ribs |
| Traditional | 43–61° supinated    | 35–50°        | within 8° of straight                | the forearm's turn (65%), the wrist the rest  | hanging     |

German reads below the teachers' figure because theirs is the palm's angle to
the drum, which German's elbow, out from the body, makes up. Traditional's
forearm rolls on toward 80° of supination at the top of a full stroke.

- **The stick is held in the fingers.** The fulcrum (`GRIP_IN_HAND`) is inside
  the first finger's curl, against its middle and end bones at the first
  crease, a third of the way up the stick, the pad of the thumb on the
  stick's side (Packer; wikiHow). It was found as the place a stick is hugged
  by the first finger bent as the grip bends it. From there the stick runs
  about 51° across the hand to leave it at the heel by the little finger,
  tipped about 30° away from the palm (`STICK_IN_HAND`). There is a gap
  between the stick and the palm on the first finger's side, for it to pivot
  in.
- **The matched arm is one piece from the elbow to the bead.** The forearm
  is set at the grip's turn, the wrist at rest, 12° toward the little finger
  (Trappe 2020: near straight at impact; the research's 10–15° ulnar), and the
  stick fixed in the hand. The arm is solved as two bones, the upper arm and
  that piece (`armPiece()` in `pose.ts`). The stick comes in across the kit at
  whatever angle the arm gives it, rather than turning round in the palm to
  meet an aim. So it lies along the same line in the hand at every stroke.
  For a cymbal or the hats, whose bow a shallow stick would pass under, the
  elbow swings round the shoulder-to-bead line, up and out, until the stick
  comes down at the pitch it is aimed. It swings back if that would turn the
  humerus past its everyday range, and is found by damped steps, so the elbow
  never jumps. On a drum the elbow stays where the grip sets it. A cymbal
  turns the forearm toward thumb-up, so the ride is played toward French
  grip, as Packer does.
- **The fingers are fitted to the stick** each frame (`fitted()` in
  `anatomy/hand.ts`). A wrapping finger starts from the grip's own posture.
  Its knuckle and its curl are found together, as close to that posture as
  lets it lie on the stick's surface, round it. Being pressed into the stick
  costs more than a gap. The first finger curls over the top of the stick.
  The thumb lies along its side, by the fulcrum, pointing to the tip, as near
  as the dressed thumb reaches. The back fingers ease off by up to a fifth of
  their bend as the stick comes up, and close on it at the head. At every
  stroke of the sweep, every finger of every matched grip is within 4 mm of
  the stick's surface. In traditional grip the first finger lies over the
  stick and the ring finger is curled in under it, the stick on its cuticle.
- **Every arm joint stays inside its range** in every grip
  (`withinRange()` in `pose.ts`), with one exception: the cross-stick's wrist
  (below). Past the everyday range a joint is eased smoothly toward its end,
  starting no more than 15° short of it, the hand turning about the fulcrum.
  `armAngles()` has an inverse, `handFrameFor()`, to do it.

## The stick twirls

Waiting for Play, now and then a hand twirls its stick (`twirlAt()`), one of
the two twirls a kit drummer does:

- **Round the thumb.** The back fingers let go and the stick turns end over
  end about the pinch of thumb and first finger. Each turn takes about 0.42 s,
  and the wrist dips into it.
- **The propeller.** The stick slides up to its middle, clamped between the
  first two fingers (the cigar grip). The palm turns to the drummer, so the
  stick's disc faces you. The stick spins flat across the palm, about 0.5 s a
  turn, the wrist rocking ±11° with it. Then it slides back into the hand.

Every frame of every twirl is inside every joint's range, in every grip
(`grips.test.ts`). No study times either twirl; the timings are estimates
(research §3).

## The grip guide

How to hold opens a guide to each grip (`grip-guide.tsx`): a film of two arms,
their hands and a snare (`grip-guide-stage.ts`). It plays the grip's steps,
paraphrased from wikiHow's "How to Hold a Drumstick", and shows the step's
instruction under the film as it plays. It has a tab for each grip, steps
forward and back, and pauses. The lessons (`grip-guide.ts`) are built from the
drummer's own poses: each grip's hands at rest over the snare (`poseAt`), taken
apart and put back together a finger at a time. The guide uses
`ArmPose.unheld`, how far each finger and the thumb still is from the stick,
and the hand shapes `flat` and `pocket`. The last step is the drummer playing
the snare in that grip. So what the guide teaches is exactly what the drummer
at the kit does.

- **American**: make the pocket with the first finger; slide the stick into
  it; find the balance point, sliding it and letting it bounce; thumb along
  the side; curl the back fingers; the other hand the same; play.
- **German** and **French** start from American at the balance point. German
  turns the palms flat to the head and the elbows out. French turns the palms
  to face each other and the elbows in. Each then plays.
- **Traditional**: the off hand palm up; the stick in the crook of the thumb;
  thumb and first finger over; the middle finger along the side; the ring and
  little fingers under; the other hand overhand; play by turning the forearm.

Every frame of every lesson is inside every joint's range, and no joint moves
more than 2.5 cm from one frame to the next (`grip-guide.test.ts`).

## The waiting drummer's show

While the drummer waits for Play, now and then (a chance in each 18-second
window, seeded from the clock like the stick twirls), one hand passes its
stick to the other and the free hand waves at you or gives you a
thumbs-up, the head turned to look at you (`gesture.ts`). It never plays
near a note or a count, it is put away as Play comes in, and twirls keep out
of its way. The camera is passed to `poseAt()` in the kit's frame, so the
wave and the look are for wherever you are watching from.

It runs about 6½ seconds:

1. **The pass.** The keeping hand goes out in front, just over the middle,
   its stick forward and up. The giving hand offers its own stick butt
   first, alongside, so its butt lies in the keeper's palm beside the
   keeper's stick, with the giver's hand a hand's breadth further along it.
   Both hands are rolled toward thumb-up, as in American grip. The giver
   opens and lets go. The head nods down to watch.
2. **The gesture.** The keeper holds the pair lower, at ease. The free hand
   goes up by the head, palm to the camera, and waves: swung from the
   shoulder at 2.2 a second, the wrist trailing. Or it holds a fist out in
   front, forearm at neutral with the thumb up, pushed toward you with a
   wink. Either way the head turns to the camera, with a smile.
3. **The take.** The hand comes back, closes on its stick, and both settle
   home.

The layout of the pass was found by search, not by eye. Where both arms sit
inside their everyday ranges at once, the hands meet as described. Held
across to the keeper's side instead, the giver's wrist would need about
100° of flexion and deviation. A hand moving between two placements turns
against its forearm, not in the room, so the wrist and forearm angles go
from one in-range set to the other. `gesture.test.ts` reads every frame of
every show (both gestures from either hand) through `armAngles()` and holds
each joint inside its anatomical range. Nothing moves faster than a hand
can, and the passed stick never jumps as it changes hands.

## What the sweep found

This is what the first sweep found, before the grips were held to the ranges
(see "The grips" for where they stand now). The stroke planner, run over a bar
that plays every lane and articulation
(`tests/helpers/drummer-sweep.ts`) and read through `armAngles()`. Ranges are
in degrees. "Past hard" is the share of frames beyond the anatomical limit.
The bar is weighted toward unusual strokes (perc2, cross-stick), so read the
shares as "it happens", not as how often it happens in a groove.

| Arm             | Elbow  | Pronation   | Wrist flexion | Deviation | Past hard                                  |
| --------------- | ------ | ----------- | ------------- | --------- | ------------------------------------------ |
| Lead, matched   | 76–137 | −10–54      | −24–37        | −12–32    | deviation 2 %                              |
| Other, matched  | 40–128 | 8–77        | −85–36        | −9–83     | wrist extension 6 %, radial deviation 9 %  |
| Lead, military  | 39–127 | −105 to −28 | −67–3         | −16–15    | supination 14 %                            |
| Other, military | 14–108 | −115–77     | −85–107       | −3–106    | supination 49 %, deviation 19 %, wrist 8 % |

Shoulders and elbows stay inside their ranges throughout, and
`rom.test.ts` pins that. Wrists and forearms do not:

1. **Traditional grip is turned too far palm-up.** The planner's military
   hand rolls the back of the hand `ROLL_MILITARY` (2.2 rad, 126°) out from
   facing up, past thumb-up. Read at the forearm, that is 105–115° of
   supination against an 85° limit. Played, traditional grip sits near
   thumb-up: the forearm about 90° supinated from German grip, i.e. about 0
   here (research §7.3).
2. **The other hand's wrist bends past radial deviation** (to 83° against
   20°) and past extension (to −85° against −70°) on the far pieces and the
   cross-stick. The hand frame is aimed along the stick (`HAND_SPLAY`) and
   only part-turned toward the forearm (`alignHand`), so the wrist takes up
   whatever is left over.
3. **Matched grip plays between American and French.** Pronation runs
   −10–54°, where German grip is about 90°. That suits most players, but the
   planner has no grip type to choose.

## Known deviations from the anatomy

- **Traditional grip's fingers are not yet fitted as closely as matched
  grip's.** At the head the first finger lies within 4 mm of the stick, but
  the middle finger is up to 13 mm off it. The ring finger, which should
  carry the stick on its cuticle, passes up to 11 mm into it.
  `GRIP_MILITARY` and `STICK_MILITARY` want deriving from the curled fingers,
  as the matched fulcrum was.
- **The dressed thumb is short** (below), so it points down onto the stick's
  side by the fulcrum rather than lying flat along it.
- **The cross-stick's wrist is past its range.** With the heel and fingers
  both on the head, the drum sets the wrist: about 75° of extension and 40–70°
  of radial deviation, against 70° and 20°. Holding it in range tips the hand
  off the stick and into the head, so the cross-stick is left as it was until
  the shoulders come down (step E).

- **The dressed thumb is 3 cm short.** The grips were fitted to a two-bone
  thumb 74 mm long; a real one is a metacarpal and two phalanges, about
  105 mm. The skeleton fits its real thumb to the grip each frame
  (`fitThumb()`). The fit sits at the limits of the thumb's MCP and CMC,
  which is the measure of how short the dressed thumb is (plan step C).
- **The palm is 9 mm longer than measured.** The wrist centre to the middle knuckle is 97 mm
  (`KNUCKLE_Z`), against 88 mm (de Leva 1996, scaled). The grip's fulcrum
  was fitted to it, so it is kept until the grips are refitted (plan step C).
- **The forearm is 270 mm**, against the research's pick of 280. The
  shoulder joints are about 0.62 m above the hips, where the seated
  anthropometry (ANSUR II) puts them nearer 0.48–0.55. The kit layout is
  fitted to `BODY`, so these move together in step E.
- **The bare feet sit about 2 cm over the pedal boards.** The pose places a
  shod foot, and the skeleton keeps its ankle joint rather than its contact
  with the board.

## The plan

Each step is a PR. The joints stay the planner's until step B, and every
step's sweep test widens to the joints that step brings inside their ranges.

- **A. Anatomy and the skeleton.** Done: the research, the modules above,
  the skeleton drummer, the sweep's findings, and the waiting drummer's
  show to exercise the hands.
- **B. Constrain the arm.** Done, but for the cross-stick. Every joint is
  inside `hard` for every grip. The matched arm is solved from the anatomy
  out, one piece from the elbow to the bead, with the stick fixed in the hand.
- **C. Grips at the bone.** Mostly done. German, American, French and
  traditional are named grips with their forearm turn, elbow and stroke. The
  stick is held in the fingers, every finger is fitted to its surface, and a
  guide teaches each grip with the drummer's own hands. The twirls are the
  two a kit drummer does. Left: traditional's fingers fitted as matched
  grip's are, and the thumb's CMC as two offset, non-perpendicular hinges
  (Hollister 1992). Also left: the Moeller whip and push-pull, driven at the
  joints.
- **D. Close up on the hands.** A camera that follows one hand and zooms to
  the fingers, and the hand bones as signed-distance surfaces for close
  range.
- **E. Proportions, legs and feet.** Refit `BODY` to the anthropometry
  (forearm, palm, shoulder height, seat) with the kit following. Add the
  ankle's dorsi- and plantarflexion limits, toe extension for heel-up
  playing, and bare-foot contact on the boards.
- **F. Dress the skeleton.** The dressed drummers are skinned over this
  skeleton, so every drummer moves on the same bones.
