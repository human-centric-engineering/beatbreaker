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
| `components/app/studio/drummer/skeleton-model.ts` | `buildSkeleton()`: the skeleton drummer, a `DrummerModel` like `buildDrummer()`'s, posed from the same `Pose`.                                                                                                                                 |

The skeleton is a persona, **Mister Bones** (`kind: 'skeleton'`), so it joins
the cast. `DrummerStage` builds it with `buildSkeleton` instead of
`buildDrummer`.

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
  forward on the seat bones for an estimated third of a lean. The chain is
  nudged so that T1, the ribs above it and the shoulder girdle land exactly
  where the pose's rigid torso put them.
- **The neck**: half of all head turning is at the atlas on the axis
  (C1–C2), and the nod is spread down the neck with the most at the skull.
- **The fingers** are a man's measured phalanx lengths (Buryanov & Kotiuk
  2010, ×1.05), and the dressed hands now use them too.

## What the sweep found

The stroke planner, run over a bar that plays every lane and articulation
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

- **The palm is 9 mm long.** The wrist centre to the middle knuckle is 97 mm
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
  the skeleton drummer, and the sweep's findings.
- **B. Constrain the arm.** The planner solves the forearm's turn and the
  wrist inside `ROM`, preferring the soft range. The wrist bends along the
  dart-thrower's plane. The elbow swings to keep the hand's frame within
  reach of the forearm, and the military hand sits near thumb-up. Done
  when the sweep holds pronation, wrist flexion and deviation inside `hard`
  for every grip.
- **C. Grips at the bone.** German, American and French matched grip, and
  traditional grip, as named grips with their forearm turn. The fingers
  are solved to touch the stick's real surface, and the fulcrum is the
  thumb's pad against the index finger's middle phalanx. The thumb's CMC
  becomes two offset, non-perpendicular hinges (Hollister 1992). Finger
  strokes and the Moeller whip are driven at the joints.
- **D. Close up on the hands.** A camera that follows one hand and zooms to
  the fingers, and the hand bones as signed-distance surfaces for close
  range.
- **E. Proportions, legs and feet.** Refit `BODY` to the anthropometry
  (forearm, palm, shoulder height, seat) with the kit following. Add the
  ankle's dorsi- and plantarflexion limits, toe extension for heel-up
  playing, and bare-foot contact on the boards.
- **F. Dress the skeleton.** The dressed drummers are skinned over this
  skeleton, so every drummer moves on the same bones.
