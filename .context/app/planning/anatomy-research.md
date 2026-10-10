# Anatomy reference for a seated-drummer skeleton (three.js, metres, radians)

Target subject: **healthy adult male, stature H = 1.78 m**. All lengths are given in mm (divide by 1000 for metres); all angles in degrees with radians where they matter (rad = deg × π/180; a generated constants block is at the end).

## How to read the confidence marks

| Mark | Meaning                                                                                                                                                                                                                                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓    | I read the number in this session, in the primary source's text or its PubMed/Europe PMC abstract, or computed it from the primary dataset (ANSUR II raw data).                                                                                                       |
| †    | A standard value from the cited textbook or paper (AAOS, Kapandji, Neumann, White & Panjabi, Inman, osteology texts) that I did **not** re-fetch in this session. These are widely reproduced, but check them against the original before freezing them as constants. |
| ≈    | Derived or estimated by me from the sources shown (the arithmetic is stated).                                                                                                                                                                                         |
| ⚠    | Weak or contested value. The note says why.                                                                                                                                                                                                                           |

Convention used throughout: joint angle 0 = anatomical position (standing, arms at sides, palms forward). Flexion is positive. "Total" means flexion plus extension, or the full arc.

---

## 0. Headline numbers for the model (my picks for a 1.78 m male)

| Quantity                                      | Pick (mm)     | Range across sources                                          | Basis                                                                                 |
| --------------------------------------------- | ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Shoulder JC → elbow JC                        | **300**       | 288 (de Leva, scaled) – 313 (from humerus length)             | ≈ midpoint. See §2 note A.                                                            |
| Elbow JC → wrist JC                           | **280**       | 275 (de Leva) – 289 (ANSUR radiale–stylion + de Leva offsets) | ≈                                                                                     |
| Wrist JC → 3rd MCP                            | **88**        | 86–90                                                         | de Leva ✓, scaled                                                                     |
| Wrist crease → middle fingertip (hand length) | **196**       | 192–196                                                       | ANSUR II 1.76–1.80 m band ✓                                                           |
| Hip JC → knee JC                              | **435**       | 432 (de Leva) – 444 (from femur)                              | ≈                                                                                     |
| Knee JC → ankle JC                            | **440**       | 437–450                                                       | de Leva ✓ / Drillis & Contini †                                                       |
| Foot length (heel–toe tip)                    | **270**       | 264–275                                                       | ANSUR ✓ / de Leva ✓                                                                   |
| Biacromial breadth                            | **419**       | 413–461                                                       | ANSUR band ✓. Drillis & Contini 0.259H (461) is closer to deltoid breadth; reject it. |
| Shoulder JC ↔ shoulder JC                     | **≈ 380–390** | —                                                             | ≈ biacromial minus 2 × 15–20 mm (the acromion sits lateral to the head centre)        |
| Hip JC ↔ hip JC                               | **≈ 185**     | 170–195                                                       | ≈ Bell/Harrington regression on bispinous breadth 256 mm ✓ (§5)                       |
| Sitting height                                | **927**       | 918–927                                                       | ANSUR ✓ (0.523 H)                                                                     |
| Popliteal height (sitting)                    | **437**       | —                                                             | ANSUR ✓                                                                               |
| Humeral head radius                           | **24**        | 19–28                                                         | Iannotti 1992 ✓                                                                       |

---

## 1. Skeleton inventory

### 1.1 Counts

| Region              | Bones                                                                                                                                                             | Notes / source |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Shoulder girdle     | clavicle ×2, scapula ×2                                                                                                                                           | Gray's †       |
| Arm                 | humerus, radius, ulna (×2)                                                                                                                                        |                |
| Carpus (8 per side) | **Proximal row** (radial→ulnar): scaphoid, lunate, triquetrum, pisiform (a sesamoid in FCU). **Distal row**: trapezium, trapezoid, capitate, hamate               | Gray's †       |
| Hand                | 5 metacarpals and 14 phalanges per side (thumb: proximal + distal only; fingers: proximal, middle, distal). Plus 2 constant thumb MCP sesamoids                   | †              |
| Vertebral column    | C7, T12, L5, sacrum (5 fused), coccyx (3–5 fused, usually 4). That is 33 elements, of which 24 are mobile presacral vertebrae                                     | Gray's †       |
| Ribs                | 12 pairs: **1–7 true** (vertebrosternal), **8–10 false** (vertebrochondral, joining the costal cartilage above), **11–12 floating**                               | Gray's †       |
| Sternum             | manubrium, body, xiphoid. Length ≈ 170 mm in males †                                                                                                              |                |
| Pelvis              | 2 hip bones (ilium + ischium + pubis fused) + sacrum + coccyx                                                                                                     |                |
| Skull               | 22 bones (8 neurocranial, 14 facial, including the **mandible**, the only freely mobile one) + 6 ossicles; hyoid separate                                         | Gray's †       |
| Lower limb          | femur, patella, tibia, fibula; **7 tarsals** (talus, calcaneus, navicular, cuboid, medial/intermediate/lateral cuneiform); 5 metatarsals; 14 phalanges (hallux 2) | Gray's †       |

### 1.2 Spine geometry

| Quantity                                                   | Value                                                                                | Source                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Presacral + sacrococcygeal column length, adult male       | ≈ **710 mm**: cervical 125, thoracic 280, lumbar 180, sacrum + coccyx 125            | Gray's Anatomy (1918) ✓ (quoted via search)                                             |
| Mean height per level including disc (from the line above) | C ≈ 18 mm/level (125/7); T ≈ 23 (280/12); L ≈ 36 (180/5)                             | ≈                                                                                       |
| Scaled to 1.78 m (×≈1.03)                                  | C 129, T 288, L 185                                                                  | ≈ ⚠ Gray's population was shorter; the scaling is crude                                 |
| Thoracic kyphosis (T3–T12, Cobb)                           | mean ≈ 36°, range ≈ 9–53°                                                            | Bernhardt & Bridwell 1989 † (the abstract confirms the method; the mean is from memory) |
| Lumbar lordosis, standing (L1–S1, Cobb)                    | **49°**                                                                              | Lord et al. 1997 ✓                                                                      |
| Lumbar lordosis, **sitting** (L1–S1)                       | **34°**. Sitting removes about 1/3 of the lordosis. L4–S1 31° → 22°; L5–S1 18° → 15° | Lord et al. 1997 ✓                                                                      |
| Thoracolumbar junction                                     | essentially straight; lordosis begins at L1–2 and increases caudally                 | Bernhardt & Bridwell 1989 ✓                                                             |
| Cervical lordosis (C2–C7)                                  | ≈ 15–25° (highly variable; can be 0 in healthy people)                               | † ⚠                                                                                     |
| Pelvic incidence / sacral slope / pelvic tilt, standing    | ≈ 53° / 41° / 12°                                                                    | Legaye et al. 1998 †                                                                    |
| Pelvis on sitting                                          | posterior pelvic rotation of roughly 20–30°, with lumbar flattening as above         | † ⚠ The size depends on the seat; the direction is robust                               |

**For the drummer (≈):** model the seated lumbar spine at ≈ 34° total lordosis spread caudally, for example L1–2 3°, L2–3 5°, L3–4 7°, L4–5 9°, L5–S1 10° (Lord's L4–S1 and L5–S1 seated values anchor the lower segments). Use thoracic kyphosis ≈ 35–40°, rising slightly when the player leans in.

### 1.3 Long bones for H = 1.78 m

Bone lengths come from inverting the Trotter & Gleser (1952) white-male stature equations (stature in cm, bone maximum length in cm) ✓ (coefficients confirmed in a secondary reproduction).

| Bone                 | T&G equation          | Length (mm) | /H                                                                                                         |
| -------------------- | --------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| Humerus (max length) | 3.08·L + 70.45 ± 4.05 | **349**     | 0.196                                                                                                      |
| Radius               | 3.78·L + 79.01 ± 4.32 | **262**     | 0.147                                                                                                      |
| Ulna                 | 3.70·L + 74.05 ± 4.32 | **281**     | 0.158                                                                                                      |
| Femur (max length)   | 2.38·L + 61.41 ± 3.27 | **490**     | 0.275                                                                                                      |
| Tibia                | 2.52·L + 78.62 ± 3.37 | **394**     | 0.222 ⚠ T&G's tibia excluded the medial malleolus (a known measurement error). Add ≈ 10 mm for full length |
| Fibula               | 2.68·L + 71.78 ± 3.29 | **396**     | 0.223                                                                                                      |

Other bones and cross-sections are typical adult-male osteometric values (†, standard osteology references such as White & Folkens, Bass, and Gray's). Use them to size meshes, not to set kinematics.

| Bone                 | Length                                                                                   | Key diameters                                                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Clavicle             | ≈ 150–155                                                                                | S-shaped. Medial 2/3 convex forward, lateral 1/3 concave. Mid-shaft ≈ 12–14                                                                                              |
| Scapula              | height (superior→inferior angle) ≈ 155–165; breadth (glenoid→vertebral border) ≈ 100–110 | Glenoid 39 × 29 mm ✓ (Iannotti 1992: superior–inferior × lower-half AP)                                                                                                  |
| Humerus              | 349                                                                                      | Head radius **24 ± 2.1 (19–28)** ✓ (Iannotti). Head "thickness" 19 ✓. Lateral humeral offset 56 ✓. Mid-shaft ≈ 22 × 18. Epicondylar breadth ≈ 63–66 †                    |
| Radius               | 262                                                                                      | Head Ø ≈ 21–23. Mid-shaft ≈ 14 × 11. Distal width ≈ 32–35 †                                                                                                              |
| Ulna                 | 281                                                                                      | Mid-shaft ≈ 15 × 13. Distal head Ø ≈ 15–17 †                                                                                                                             |
| Femur                | 490                                                                                      | Head Ø ≈ 48–50 (male; forensic sexing cut-off ≈ 45–47). Mid-shaft ≈ 28–30 AP × 27–28 ML. Bicondylar breadth ≈ 82–88. Neck-shaft angle ≈ 125–130°. Anteversion ≈ 10–15° † |
| Patella              | height ≈ 43–45                                                                           | width ≈ 45, thickness ≈ 23 †                                                                                                                                             |
| Tibia                | ≈ 400 (with malleolus)                                                                   | Plateau width ≈ 76–80. Mid-shaft ≈ 31 AP × 22 ML. Distal width ≈ 45–50 †                                                                                                 |
| Fibula               | 396                                                                                      | Shaft ≈ 13–15 †                                                                                                                                                          |
| Talus / calcaneus    | ≈ 55–60 / ≈ 80–88                                                                        | †                                                                                                                                                                        |
| Metatarsals I–V      | ≈ 64, 76, 71, 70, 68                                                                     | † ⚠ approximate male means                                                                                                                                               |
| Hallux phalanges P/D | ≈ 31 / 23                                                                                | †                                                                                                                                                                        |
| Carpals              | scaphoid ≈ 27–30 long; capitate ≈ 22–25 long                                             | †                                                                                                                                                                        |

Skull and head (ANSUR II, males 1.76–1.80 m, n = 913 ✓):

|                                       | mm  |
| ------------------------------------- | --- |
| head length (glabella–opisthocranion) | 200 |
| head breadth                          | 155 |
| tragion → vertex                      | 132 |
| menton → sellion                      | 123 |

Mandible (†): ramus height ≈ 55–60, bigonial ≈ 95–100, bicondylar ≈ 115–125 mm.

---

## 2. Segment lengths between joint centres

### 2.1 de Leva (1996): joint-centre based, the best match for a rig ✓

Reference subjects: 100 male Soviet military students, **mean stature 1.741 m, mass 73.0 kg** ✓. The values below were extracted from the paper's Table 4.

| Segment (endpoints)                   | Male mm @1.741 m | /H     | **@1.78 m** |
| ------------------------------------- | ---------------- | ------ | ----------- |
| Head, vertex → mid-gonion             | 203.3            | 0.1168 | 208         |
| Head, vertex → cervicale (C7)         | 242.9            | 0.1395 | 248         |
| Trunk, suprasternale → mid-hip-JC     | 531.9            | 0.3055 | 544         |
| Trunk, C7 → mid-hip-JC                | 603.3            | 0.3465 | 617         |
| Trunk, mid-shoulder-JC → mid-hip-JC   | 515.5            | 0.2961 | 527         |
| Upper trunk, suprasternale → xiphion  | 170.7            | 0.0980 | 175         |
| Upper trunk, C7 → xiphion             | 242.1            | 0.1391 | 248         |
| Mid trunk, xiphion → omphalion        | 215.5            | 0.1238 | 220         |
| Lower trunk, omphalion → mid-hip-JC   | 145.7            | 0.0837 | 149         |
| **Upper arm, SJC → EJC**              | 281.7            | 0.1618 | 288         |
| **Forearm, EJC → WJC**                | 268.9            | 0.1545 | 275         |
| Forearm, EJC → radial stylion         | 266.9            | 0.1533 | 273         |
| **Hand, WJC → 3rd metacarpale (MCP)** | 86.2             | 0.0495 | 88          |
| Hand, WJC → 3rd dactylion (tip)       | 187.9            | 0.1079 | 192         |
| **Thigh, HJC → KJC**                  | 422.2            | 0.2425 | 432         |
| Shank, KJC → lateral malleolus        | 434.0            | 0.2493 | 444         |
| **Shank, KJC → AJC**                  | 440.3            | 0.2529 | 450         |
| Foot, heel → toe tip                  | 258.1            | 0.1482 | 264         |

de Leva Table 2 joint-centre offsets from landmarks, males (positive = proximal) ✓:

| Joint centre | Offset                                       |
| ------------ | -------------------------------------------- |
| SJC          | **34.5 mm below acromion**                   |
| EJC          | **14.3–16.8 mm above radiale** (mean ≈ 15.6) |
| WJC          | **1.5–2.4 mm distal to stylion**             |
| HJC          | **3.2 mm above trochanterion**               |
| KJC          | **33.5–35.0 mm above tibiale**               |
| AJC          | **12.6 mm below sphyrion**                   |

Bispinous (ASIS–ASIS) breadth, males: **255.7 mm** ✓ (de Leva Table 3).

de Leva male segment mass fractions and CoM positions (from proximal end) ✓, for later physics:

| Segment   | Mass / body mass | CoM from proximal |
| --------- | ---------------- | ----------------- |
| head      | 0.0694           | 0.5976            |
| trunk     | 0.4346           | 0.4486            |
| upper arm | 0.0271           | 0.5772            |
| forearm   | 0.0162           | 0.4574            |
| hand      | 0.0061           | 0.790 (WJC→MET3)  |
| thigh     | 0.1416           | 0.4095            |
| shank     | 0.0433           | 0.4395            |
| foot      | 0.0137           | 0.4415            |

### 2.2 Drillis & Contini (1966) as reproduced by Winter: fractions of H

The arm, leg, foot and trunk ratios below are ✓ via the Winter-based toolbox source code (0.130, 0.186, 0.146, 0.108, 0.245, 0.246, 0.152, 0.039, 0.055, 0.520, 0.530). Widths and heights are †.

| Segment                                                       | ×H                                    | @1.78 m                       | Comment                                                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Upper arm                                                     | 0.186                                 | 331                           | Landmark-based (shoulder→elbow). Overestimates the JC–JC length. Wisner et al. 2006 ✓ also found Drillis & Contini mis-predicts arm segments |
| Forearm                                                       | 0.146                                 | 260                           |                                                                                                                                              |
| Hand (wrist→tip)                                              | 0.108                                 | 192                           | Agrees with de Leva 0.1079                                                                                                                   |
| Thigh                                                         | 0.245                                 | 436                           |                                                                                                                                              |
| Shank                                                         | 0.246                                 | 438                           |                                                                                                                                              |
| Foot length / height / width                                  | 0.152 / 0.039 / 0.055                 | 271 / 69 / 98                 |                                                                                                                                              |
| Head + neck (chin→vertex)                                     | 0.130                                 | 231                           |                                                                                                                                              |
| Shoulder width                                                | 0.259                                 | 461                           | † Too wide for biacromial; use ANSUR                                                                                                         |
| Hip width                                                     | 0.191                                 | 340                           | †                                                                                                                                            |
| Chest width                                                   | 0.174                                 | 310                           | †                                                                                                                                            |
| Sitting height                                                | ≈ 0.52                                | 926                           |                                                                                                                                              |
| Heights: shoulder / elbow / wrist / greater trochanter / knee | 0.818 / 0.630 / 0.485 / 0.530 / 0.285 | 1456 / 1121 / 863 / 943 / 507 | †                                                                                                                                            |

### 2.3 ANSUR II (2012 US Army survey; 4,082 men) computed from the raw data ✓

"All" = all men (mean stature 1756 mm). "Band" = the 913 men with stature 1.76–1.80 m (mean 1779 mm), which is the column to use.

| Dimension                                 | Mean all (SD) | /H    | **Band 1.76–1.80 m** |
| ----------------------------------------- | ------------- | ----- | -------------------- |
| Sitting height                            | 918 (36)      | 0.523 | **927**              |
| Eye height, sitting                       | 805           | 0.458 | 812                  |
| Acromial height (standing)                | 1441          | 0.820 | 1461                 |
| Cervicale height                          | 1517          | 0.864 | 1538                 |
| Suprasternale height                      | 1439          | 0.819 | 1458                 |
| Iliocristale height                       | 1062          | 0.604 | 1078                 |
| Trochanterion height                      | 901           | 0.513 | 914                  |
| Lateral femoral epicondyle height         | 492           | 0.280 | 499                  |
| Tibiale height                            | 468           | 0.267 | 476                  |
| Lateral malleolus height                  | 73            | 0.042 | 74                   |
| Wrist height                              | 848           | 0.483 | 859                  |
| **Biacromial breadth**                    | 416 (19)      | 0.237 | **419**              |
| Bideltoid breadth                         | 510           | 0.291 | 514                  |
| Chest breadth / depth                     | 289 / 254     |       | 291 / 255            |
| Hip breadth (standing)                    | 346           | 0.197 | 349                  |
| Hip breadth, sitting                      | 379           | 0.216 | 383                  |
| Bicristal (iliac crest) breadth           | 275           | 0.157 | 278                  |
| Acromion → radiale (upper arm, landmarks) | 335           | 0.191 | 340                  |
| Radiale → stylion (forearm, landmarks)    | 268           | 0.153 | 272                  |
| Shoulder → elbow length                   | 364           | 0.207 | 368                  |
| Forearm–hand length                       | 480           | 0.273 | 487                  |
| Forearm centre-of-grip length             | 349           | 0.199 | 354                  |
| **Hand length**                           | 193 (10)      | 0.110 | **196**              |
| Palm length                               | 117           | 0.066 | 118                  |
| Hand breadth (metacarpale II–V)           | 88            | 0.050 | 89                   |
| Foot length / breadth                     | 271 / 102     | 0.154 | 275 / 103            |
| Bimalleolar breadth                       | 75            |       | 76                   |
| **Buttock–knee length**                   | 618           | 0.352 | 627                  |
| **Buttock–popliteal length**              | 503           | 0.286 | 511                  |
| **Knee height, sitting**                  | 554           | 0.316 | 563                  |
| **Popliteal height**                      | 430 (25)      | 0.245 | **437**              |
| Thigh clearance                           | 181           |       | 182                  |
| Elbow rest height (above seat)            | 245           |       | 246                  |
| Span                                      | 1814          | 1.033 | 1836                 |
| Mass                                      | 85.5 kg       |       | 87.5 kg              |

### 2.4 Notes on the picks

**A — Upper arm.** The sources disagree by about 25 mm:

- de Leva (scaled): 288.
- ANSUR acromion–radiale 340 minus de Leva's offsets (34.5 + 15.6): ≈ 290.
- Bone route, humerus 349 − head radius 24 − (trochlear lip below EJC ≈ 12–20): ≈ 305–313.
- Drillis & Contini: 331, which is landmark-based and too long.

**Pick 300 mm.** The first two routes are internally consistent. The bone route says the true JC–JC is a little longer.

**B — Forearm.** de Leva 275. ANSUR radiale–stylion 272 + 15.6 + 2 ≈ 289. Radius 262 + ≈ 15 ≈ 277. **Pick 280.**

**C — Thigh.** de Leva 432. Femur 490 − head radius 24 − condyle radius ≈ 25 ≈ 441. Drillis & Contini 436. **Pick 435.**

**D — Shank.** de Leva KJC–AJC 450. ANSUR (tibiale 476 + 35 − malleolus 74 − ~5) ≈ 432–440. Drillis & Contini 438. **Pick 440.**

**E — Proportion check for a seated drummer.** Popliteal height 437 + shoe ≈ 25 gives a floor-to-thigh-underside of ≈ 460–465. HJC sits ≈ 90–100 mm above the seat surface (≈ the thigh-clearance height minus soft tissue).

---

## 3. The hand

### 3.1 Bone lengths: measured radiographic "interarticular" lengths (joint space to joint space)

Source: Buryanov & Kotiuk 2010 (_Int J Morphol_ 28:755), AP radiographs of 66 adults aged 19–78, mixed sex, right hands; mean ± SD in mm ✓ (read from the paper's Table I). The model column scales by ×1.05 to a male whose hand length is 196 mm (the mixed adult mean hand length is ≈ 185) ≈. The ratio is to hand length 196.

| Digit        | Metacarpal                    | Proximal phalanx              | Middle phalanx                | Distal phalanx                | Tip soft tissue |
| ------------ | ----------------------------- | ----------------------------- | ----------------------------- | ----------------------------- | --------------- |
| I (thumb)    | 46.2 ± 3.9 → **48.5** (0.248) | 31.6 ± 3.1 → **33.1** (0.169) | —                             | 21.7 ± 1.6 → **22.8** (0.116) | 5.7 → 6.0       |
| II (index)   | 68.1 ± 6.3 → **71.5** (0.366) | 39.8 ± 4.9 → **41.8** (0.214) | 22.4 ± 2.5 → **23.5** (0.120) | 15.8 ± 2.3 → **16.6** (0.085) | 3.8 → 4.0       |
| III (middle) | 64.6 ± 5.4 → **67.8** (0.347) | 44.6 ± 3.8 → **46.9** (0.240) | 26.3 ± 3.0 → **27.6** (0.141) | 17.4 ± 1.9 → **18.3** (0.093) | 4.0 → 4.1       |
| IV (ring)    | 58.0 ± 5.1 → **60.9** (0.311) | 41.4 ± 3.9 → **43.4** (0.222) | 25.7 ± 3.3 → **26.9** (0.138) | 17.3 ± 2.2 → **18.2** (0.093) | 4.0 → 4.1       |
| V (little)   | 53.7 ± 4.4 → **56.4** (0.288) | 32.7 ± 2.8 → **34.4** (0.176) | 18.1 ± 2.5 → **19.0** (0.097) | 16.0 ± 2.5 → **16.8** (0.086) | 3.7 → 3.9       |

Also from Buryanov ✓: the MCP joint spaces of II–IV lie **15–25 % of finger length proximal to the web**.

Cross-check from Hamilton & Dunsmuir 2002 (radiographic), as reproduced in PMC6339214 (Table 2) ✓:

| Digit | proximal / middle | middle / distal |
| ----- | ----------------- | --------------- |
| II    | 1.86              | 1.24            |
| III   | 1.72              | 1.36            |
| IV    | 1.70              | 1.29            |
| V     | 1.91              | 1.06            |

Thumb proximal / distal ≈ 0.98.

### 3.2 Buchholz, Armstrong & Goldstein 1992 kinematic segment coefficients (× hand length)

⚠ I could not retrieve the original table (Ergonomics 35:261) in this session. The values below are the ones commonly reproduced in the hand-modelling literature, from memory, so they are †⚠ and must be verified before use. They are _kinematic_ lengths (joint centre to joint centre, and DP to the fingertip surface), which is why they run longer than the bone lengths in §3.1.

| Digit  | MC    | PP    | MP    | DP    | @HL 196 mm        |
| ------ | ----- | ----- | ----- | ----- | ----------------- |
| Thumb  | 0.251 | 0.196 | —     | 0.158 | 49 / 38 / — / 31  |
| Index  | 0.374 | 0.265 | 0.143 | 0.097 | 73 / 52 / 28 / 19 |
| Middle | 0.373 | 0.277 | 0.170 | 0.108 | 73 / 54 / 33 / 21 |
| Ring   | 0.336 | 0.259 | 0.165 | 0.107 | 66 / 51 / 32 / 21 |
| Little | 0.295 | 0.206 | 0.117 | 0.093 | 58 / 40 / 23 / 18 |

**Recommendation:**

- Use the §3.1 values (×1.05) for bone meshes and joint spacing.
- For the distal segment's _kinematic_ length to the pulp, add the tip soft tissue.
- Treat Buchholz as an upper bound.
- A newer paper (Tsakonas et al. 2026, PMC13058727 ✓) reports that Buchholz's equations consistently _under_-predicted ring distal segment length in living hands, by up to 7.5 mm. This is a reminder that soft-tissue and landmark definitions matter.

### 3.3 Palm geometry: MCP positions, arches, splay

| Quantity                                                              | Value                                                                                    | Source                                                                                                                                        |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Transverse (distal) metacarpal arch angle, 4-segment metacarpal model | **22.0° ± 3.3° neutral → 32.1° ± 3.7° in cap grip**                                      | Cocchiarella et al. 2016 ✓                                                                                                                    |
| Arch angle by a different definition (motion capture, typing)         | 10.1° ± 5.5° relaxed                                                                     | Baker et al. 2013 ✓. Definitions differ; use Cocchiarella for a 4-segment rig                                                                 |
| MCP joint pronation/supination                                        | typically < 10°                                                                          | Cocchiarella 2016 citing radiology ✓                                                                                                          |
| CMC flexion–extension, 2nd / 3rd / 4th / 5th                          | **11° / 7° / 20° / 27°**                                                                 | El-Shennawy et al. 2001 ✓                                                                                                                     |
| CMC radial–ulnar deviation, 2nd / 3rd / 4th / 5th                     | 2° / 4° / 7° / 13°                                                                       | El-Shennawy 2001 ✓                                                                                                                            |
| CMC pronation–supination, 2nd / 3rd / 4th / 5th                       | 5° / 5° / 27° / 22°                                                                      | El-Shennawy 2001 ✓                                                                                                                            |
| 5th CMC when the 4th is immobilised                                   | flexion–extension falls 40 % to 28°. The 4th and 5th are coupled, so drive them together | El-Shennawy 2001 ✓                                                                                                                            |
| CMC flexion–extension axes                                            | lie within the base of each metacarpal                                                   | El-Shennawy 2001 ✓                                                                                                                            |
| Textbook "cupping" values                                             | 2nd–3rd CMC ≈ 0–3°, 4th ≈ 10–15°, 5th ≈ 20–30° flexion                                   | Kapandji / Neumann †. Smaller than El-Shennawy's _total_ arcs because these count flexion only                                                |
| MCP centre spacing (index→little, centre to centre)                   | ≈ 20–23 mm between adjacent MCPs, ≈ 65–70 mm index–little                                | ≈ hand breadth 89 ✓ minus 2 × ≈ 10 mm condylar inset                                                                                          |
| Distal stagger of MCP heads (the "metacarpal cascade")                | middle most distal; index ≈ 2–5 mm, ring ≈ 4–8 mm, little ≈ 12–18 mm proximal to middle  | ≈ from MC lengths ✓ and carpal base levels †⚠                                                                                                 |
| Palmar drop of MCP heads relative to middle (arch)                    | index ≈ 2 mm, ring ≈ 3 mm, little ≈ 6–8 mm palmar                                        | ≈ consistent with a 22° arch over ≈ 65 mm ⚠                                                                                                   |
| Metacarpal splay (coronal-plane angle to MC3)                         | index ≈ +5–8° radial, ring ≈ −5°, little ≈ −8–12° ulnar                                  | †⚠. One robot-hand design derived from human proportions used +7.0 / 0 / −5.1 / −7.3° (arXiv 1504.01151 ✓, a design value, not a measurement) |
| Cylinder axis in a power grasp                                        | oblique, 10–30° to the hand's transverse axis, from index MCP to the hypothenar base     | Buchholz 1992, Kapandji, via PMC8721892 ✓                                                                                                     |

---

## 4. Joint ranges of motion and degrees of freedom

The "AAOS" column is the American Academy of Orthopaedic Surgeons norm (1965 handbook / Greene & Heckman 1994) †. "Functional" means the range needed for activities of daily living (ADL). The "Use as" column is my suggested **anatomical hard limit / comfortable soft range**.

### 4.1 Shoulder complex

| Joint, motion                                               | Normative value                                                                                                                                   | Source                                  | Use as (hard / soft)                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| **SC**, elevation / depression                              | ≈ 45° / ≈ 10°                                                                                                                                     | Neumann †                               | 45 / 30 ; 10 / 5                                          |
| SC, protraction / retraction                                | ≈ 15–30° each                                                                                                                                     | Neumann †                               | 25 / 15 each                                              |
| SC, posterior axial rotation                                | ≈ 20–35° anatomical. **31° average during arm elevation** (dominant SC motion)                                                                    | Ludewig 2009 ✓ / Neumann †              | 40 / 30                                                   |
| SC during humeral elevation                                 | clavicle **elevates, retracts and rotates posteriorly**                                                                                           | Ludewig 2009 ✓                          | coupling rule                                             |
| **AC**, during elevation                                    | scapula **posterior tilt ≈ 19°** (dominant AC motion), plus upward rotation ≈ 10–16° and small internal rotation relative to the clavicle         | Ludewig 2009 ✓ (19°) / † (other values) |                                                           |
| **Scapulothoracic**, scapular-plane elevation               | upward rotation **50° ± 4.8°**, posterior tilt **30° ± 13°**, external rotation **24° ± 12.8°**                                                   | McClure et al. 2001 ✓                   |                                                           |
| Scapula at rest                                             | internally rotated ≈ 30–40° (the scapular plane is ≈ 30–40° anterior to the frontal plane), upward rotation ≈ 5°, anterior tilt ≈ 10°             | †                                       |                                                           |
| **Scapulohumeral rhythm**                                   | Inman 1944: 2:1 overall (no abstract; classic value †). Poppen & Walker 1976: **5:4 after ≈ 30°** ✓ (≈ 4:1 below). McClure 2001: **1.7:1** ✓      |                                         | Use **≈ 2:1 overall, ≈ 1.25:1 above 30°**                 |
| **Glenohumeral (GH)** centre                                | within **6 mm** of the geometric centre of the humeral head throughout scapular-plane abduction                                                   | Poppen & Walker 1976 ✓                  | Treat as a ball joint at the head centre                  |
| Humerothoracic flexion / extension                          | 180 / 60                                                                                                                                          | AAOS †                                  | 175 / 150 ; 55 / 40                                       |
| Humerothoracic abduction / adduction                        | 180 / ≈ 0 (≈ 30–45 across the front with flexion)                                                                                                 | AAOS †                                  |                                                           |
| Pure GH elevation                                           | ≈ 120° (the remaining ≈ 60° is scapulothoracic)                                                                                                   | Inman †; rhythm                         |                                                           |
| Horizontal adduction / abduction (from 90° abduction)       | ≈ 135 / ≈ 45                                                                                                                                      | AAOS / Norkin †                         | 130 / 110 ; 40 / 30                                       |
| **Internal / external rotation**, measured at 90° abduction | IR **70**, ER **90**                                                                                                                              | AAOS †                                  |                                                           |
| IR/ER at 0° abduction                                       | ER ≈ 60–80. IR limited by the trunk, ≈ 70–90 with the forearm behind the back                                                                     | Kapandji / Norkin † ⚠                   |                                                           |
| Rotation arc vs abduction                                   | total arc ≈ 150–180°. Shifts toward **ER as abduction increases**; **ER is required for full elevation** (GH externally rotates during elevation) | Ludewig 2009 ✓ (qualitative) / †        | e.g. ER_max = 70 + 0.2 × abd, IR_max = 80 − 0.1 × abd ≈ ⚠ |

### 4.2 Elbow and forearm

| Motion                           | Value                                                                                                                  | Source                                                                               | Use as                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- |
| Flexion                          | 0–150 (AAOS 1965); ≈ 140–146 measured in men                                                                           | AAOS † / Boone & Azen 1979 †                                                         | 145 hard / 30–130 functional                |
| Hyperextension                   | 0–10° normal; more common in women                                                                                     | †                                                                                    | −5                                          |
| **Functional arc**               | **30–130° flexion; 50° pronation, 50° supination**                                                                     | Morrey et al. 1981 ✓                                                                 | soft range                                  |
| Flexion axis                     | single axis through the centres of the **trochlear sulcus and capitellum** arcs; sliding motion except at the extremes | London 1981 ✓                                                                        | hinge                                       |
| Axis orientation                 | ≈ 4–8° valgus to the perpendicular of the humeral shaft; ≈ 3–8° internally rotated relative to the epicondylar line    | Morrey / An †                                                                        |                                             |
| **Carrying angle**, men vs women | 11.6° ± 3.2° vs 16.7° ± 2.6° (electromagnetic tracking)                                                                | Van Roy 2005 ✓                                                                       | **≈ 11°** for the male model                |
| Carrying angle, large sample     | right dominant arm 11.25° ± 3.73°                                                                                      | Yilmaz 2005 ✓                                                                        |                                             |
| Carrying angle through flexion   | decreases with flexion, ending in ≈ 1.8° **varus** at full flexion                                                     | Van Roy 2005 ✓ (London 1981 claimed it is constant ✓; modern 3D data supersede that) | interpolate 11° → −2° from 0 → 140° flexion |
| Pronation / supination           | 80 / 80                                                                                                                | AAOS † (Soucie 2011 ✓: women > men, especially in pronation and supination)          | 80 / 85 hard ; 50 / 50 functional           |
| Forearm rotation axis            | through the **centre of the radial head** proximally and the **fovea of the ulnar head** distally                      | Hollister et al. 1994 †                                                              | oblique axis, not the bone axis             |

### 4.3 Wrist

| Motion           | AAOS † | Functional ✓                       | Notes                                                                                             |
| ---------------- | ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| Flexion          | 80     | **54** (Ryu 1991); 5 (Palmer 1985) | Ryu: 70 % of maximum covers most ADL, i.e. 40 flexion / 40 extension / 40 combined radial–ulnar ✓ |
| Extension        | 70     | **60** (Ryu); 30 (Palmer)          |                                                                                                   |
| Radial deviation | 20     | **17** (Ryu); 10 (Palmer)          |                                                                                                   |
| Ulnar deviation  | 30     | **40** (Ryu); 15 (Palmer)          | Ulnar deviation exceeds radial; the limits are asymmetric                                         |
| Rotation         | —      | 3rd DoF reported                   | Palmer 1985 ✓                                                                                     |

| Wrist constraint                                | Value                                                                                                                                     | Source                                                                           |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Radiocarpal vs midcarpal share in **flexion**   | **40 % RC / 60 % MC**                                                                                                                     | Sarrafian 1977 ✓                                                                 |
| Radiocarpal vs midcarpal share in **extension** | **66.5 % RC / 33.5 % MC**                                                                                                                 | Sarrafian 1977 ✓                                                                 |
| Wrist centre                                    | both axes pass through the **head of the capitate**                                                                                       | Youm et al. 1978 †. de Leva puts WJC ≈ 2 mm distal to the radial stylion level ✓ |
| Dart-thrower's motion (DTM)                     | ADL take place along an oblique plane from radial-extension to ulnar-flexion. The intact wrist's ROM envelope is oriented along this path | Kane/Crisco 2018 ✓; Kaufman-Cohen 2020 ✓                                         |
| DTM plane angle                                 | ≈ 30–45° from pure flexion–extension                                                                                                      | †                                                                                |
| Carpus in DTM                                   | during DTM, motion is concentrated at the midcarpal joint (scaphoid and lunate move little)                                               | Crisco †; ligament strain, Rainbow 2015 ✓                                        |

**For the rig:** a 2-DoF wrist. Clamp flexion–extension and radial–ulnar deviation with an **elliptical / coupled limit**, not a box: combined extension + radial deviation and flexion + ulnar deviation are freer than extension + ulnar deviation or flexion + radial deviation.

### 4.4 Fingers II–V

| Joint                            | AAOS †                   | Active (Hume 1990) † | Functional ✓                                                | Notes                                                                                                                                                                       |
| -------------------------------- | ------------------------ | -------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP flexion                      | 0–90                     | ≈ 100                | **61°** mean flexion posture (Hume); **19–71°** (Bain 2015) | Ulnar digits have more active and functional range than radial ones (Bain ✓). Little ≈ 95–100, index ≈ 85–90                                                                |
| MCP hyperextension               | up to 45 (passive)       |                      |                                                             | Model −30 active / −45 passive                                                                                                                                              |
| MCP abduction / adduction        | ≈ 20 each side           |                      |                                                             | **Shrinks toward 0 as MCP flexion approaches 90°**: the collateral ligaments tighten over the cam-shaped metacarpal head (Kapandji †). Use abd_max(θ) = 20 · cos²(θ_flex) ≈ |
| PIP flexion                      | 0–100 (≈ 110 achievable) | ≈ 105                | **60°** (Hume); **23–87°** (Bain)                           | Hyperextension ≈ 0–5                                                                                                                                                        |
| DIP flexion                      | 0–90                     | ≈ 85                 | **39°** (Hume); **10–64°** (Bain)                           | Hyperextension ≈ 5–10 (to 20 passive)                                                                                                                                       |
| Functional share of active range | —                        | —                    | MCP 48 %, PIP 59 %, DIP 60 % (Bain ✓)                       | soft-range scale factors                                                                                                                                                    |

### 4.5 Thumb

| Joint, motion                              | Value                                                                                                                                                                                      | Source                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **CMC (trapeziometacarpal)**, saddle joint | total flexion–extension **53°**, abduction–adduction **42°**, axial rotation (pronation) **17°**                                                                                           | Cooney 1981 ✓                                                                        |
| CMC, AAOS convention                       | flexion 15, extension 20, palmar abduction 70                                                                                                                                              | AAOS †                                                                               |
| CMC resting frame                          | the trapezium's reference axes are offset from MC3 by **48° flexion, 38° abduction, 80° pronation**                                                                                        | Cooney 1981 ✓ (use this to orient the thumb base)                                    |
| CMC axes                                   | **flexion–extension axis in the trapezium; abduction–adduction axis in the 1st metacarpal**. They are fixed, **not perpendicular** to each other or to the bones, and **do not intersect** | Hollister 1992 ✓                                                                     |
| CMC axis numbers                           | angle between the axes ≈ 80° (non-orthogonal), offset ≈ 5–10 mm                                                                                                                            | ⚠ † (Giurintano-type models). Implement as 2 hinges with an offset, not a ball joint |
| Opposition                                 | CMC flexion + abduction + pronation combined; MCP adds rotation                                                                                                                            | Cooney 1981 ✓                                                                        |
| Thumb MCP flexion                          | AAOS 0–50; very variable (≈ 30–90) and **bimodal** in the population                                                                                                                       | AAOS † / Hume 1990 ✓ (bimodal)                                                       |
| Thumb MCP abduction–adduction              | ≈ 10–20 total                                                                                                                                                                              | †                                                                                    |
| Thumb IP flexion / hyperextension          | 80 / 20 (passive hyperextension can be 30–40)                                                                                                                                              | AAOS †                                                                               |
| Functional thumb postures                  | MCP **21°**, IP **18°**, about 32 % of available flexion                                                                                                                                   | Hume 1990 ✓                                                                          |

### 4.6 Spine: White & Panjabi (1990) representative segmental values †

Flexion + extension are combined. Lateral bend and axial rotation are **one side**.

| Level        | Flex+ext | Lat. bend (one side) | Axial rotation (one side) |
| ------------ | -------- | -------------------- | ------------------------- |
| Occ–C1       | 25       | 5                    | 5                         |
| C1–C2        | 20       | 5                    | **40**                    |
| C2–C3        | 10       | 10                   | 3                         |
| C3–C4        | 15       | 11                   | 7                         |
| C4–C5        | 20       | 11                   | 7                         |
| C5–C6        | 20       | 8                    | 7                         |
| C6–C7        | 17       | 7                    | 6                         |
| C7–T1        | 9        | 4                    | 2                         |
| T1–T2        | 4        | 6                    | 9                         |
| T2–T6 (each) | 4        | 5                    | 8                         |
| T6–T7        | 5        | 6                    | 8                         |
| T7–T8        | 6        | 6                    | 8                         |
| T8–T9        | 6        | 6                    | 7                         |
| T9–T10       | 6        | 6                    | 4                         |
| T10–T11      | 9        | 7                    | 2                         |
| T11–T12      | 12       | 9                    | 2                         |
| T12–L1       | 12       | 8                    | 2                         |
| L1–L2        | 12       | 6                    | 2                         |
| L2–L3        | 14       | 6                    | 2                         |
| L3–L4        | 15       | 8                    | 2                         |
| L4–L5        | 16       | 6                    | 2                         |
| L5–S1        | 17       | 3                    | 1                         |

⚠ These are cadaver-derived and generous. Summed thoracic rotation (≈ 70° per side) exceeds in-vivo thoracic rotation (≈ 30–40° per side). Scale the thoracic rotation entries by ≈ 0.5 for an active, seated person.

Regional active norms:

| Region                        | Flexion                                                                                     | Extension | Lateral flexion (each side) | Rotation (each side) | Source            |
| ----------------------------- | ------------------------------------------------------------------------------------------- | --------- | --------------------------- | -------------------- | ----------------- |
| Cervical                      | 45                                                                                          | 45        | 45                          | 60                   | AAOS †            |
| Cervical, young men, measured | ≈ 60–65                                                                                     | ≈ 75–85   | ≈ 40–45                     | ≈ 70–75              | Youdas 1992 †⚠    |
| Thoracolumbar                 | 80                                                                                          | 25        | 35                          | 45                   | AAOS †            |
| Upper-cervical split          | about half of cervical rotation is at C1–C2; about 1/3 of flexion–extension is at Occ–C1–C2 |           |                             |                      | White & Panjabi † |

### 4.7 Hip, knee, ankle, foot, jaw

| Joint, motion                             | Value                                                                                                                                                   | Source                                                                                               | Notes for the drummer                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Hip flexion                               | 120 (AAOS); ≈ 121 measured                                                                                                                              | AAOS † / Roach & Miles 1991 (abstract: textbook values differ from population means by up to 18°) ✓† | Seated ≈ 80–100°. Leaning in adds 10–20°                 |
| Hip extension                             | 30 (AAOS); ≈ 20 measured                                                                                                                                | †                                                                                                    | irrelevant when seated                                   |
| Hip abduction / adduction                 | 45 / 30                                                                                                                                                 | AAOS †                                                                                               | the hi-hat and kick legs splay ≈ 15–30° abduction        |
| Hip IR / ER                               | 45 / 45 (AAOS, measured **seated**: hip and knee at 90°); population means ≈ 32 / 32                                                                    | AAOS † / Roach & Miles † ⚠                                                                           | seated values apply directly                             |
| Knee flexion                              | 135 (AAOS); ≈ 132 measured                                                                                                                              | †                                                                                                    | seated ≈ 70–110°                                         |
| Knee hyperextension                       | 0–5 (≤ 10)                                                                                                                                              | †                                                                                                    |                                                          |
| Tibial axial rotation at 90° knee flexion | IR ≈ 30, ER ≈ 40. Zero when the knee is fully extended (screw-home)                                                                                     | Kapandji † ⚠                                                                                         | scale rotation with knee flexion: 0 at 0°, full at ≥ 90° |
| Ankle dorsiflexion / plantarflexion       | 20 / 50                                                                                                                                                 | AAOS † (Soucie 2011 ✓: women > men, especially plantarflexion)                                       | heel-up pedalling ranges ≈ −10 to 40 PF ≈                |
| Subtalar inversion / eversion             | rearfoot ≈ 30 / 10; whole-foot AAOS 35 / 15                                                                                                             | Norkin & White / AAOS †                                                                              |                                                          |
| **Hallux MTP extension / flexion**        | **70 / 45** (AAOS). Normal walking uses ≈ 50–65 extension                                                                                               | AAOS † / Nawoczenski 2008 ✓ (post-cheilectomy 31° in gait was still "less than normative")           | heel-up pedalling needs ≈ 40–60° MTP extension ≈         |
| Lesser-toe MTP extension                  | ≈ 40–60                                                                                                                                                 | †                                                                                                    |                                                          |
| Jaw (TMJ) opening                         | interincisal ≈ 40–60 mm (male mean ≈ 50–55). Hinge rotation ≈ 25–30° plus anterior condylar translation **past the articular eminence** at full opening | † / Muto 1994 ✓ (condyle translates beyond the eminence)                                             | rotation + translation, not a pure hinge                 |

### 4.8 Functional ("comfortable") vs anatomical limits: summary

| Joint                          | Anatomical (AAOS-ish) | Functional / ADL                       | Source of functional |
| ------------------------------ | --------------------- | -------------------------------------- | -------------------- |
| Elbow flexion                  | 0–150                 | 30–130                                 | Morrey 1981 ✓        |
| Forearm pronation / supination | 80 / 80               | 50 / 50                                | Morrey 1981 ✓        |
| Wrist flexion / extension      | 80 / 70               | 54 / 60 (max ADL); 40 / 40 (70 % rule) | Ryu 1991 ✓           |
| Wrist radial / ulnar deviation | 20 / 30               | 17 / 40                                | Ryu 1991 ✓           |
| MCP                            | 0–90 (+)              | 19–71                                  | Bain 2015 ✓          |
| PIP                            | 0–100                 | 23–87                                  | Bain 2015 ✓          |
| DIP                            | 0–90                  | 10–64                                  | Bain 2015 ✓          |
| Thumb MCP / IP                 | 50 / 80               | 21 / 18 (mean postures)                | Hume 1990 ✓          |

---

## 5. Joint centres, axes and types

| Joint                             | Type and DoF                                                                          | Centre / axis relative to landmarks                                                                                                                                         | Source                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Sternoclavicular                  | saddle, functionally ball-like, 3 DoF                                                 | at the medial clavicle end on the manubrial notch                                                                                                                           | †                                                              |
| Acromioclavicular                 | plane, 3 small DoF                                                                    | lateral clavicle–acromion                                                                                                                                                   | †                                                              |
| Scapulothoracic                   | not a true joint; the scapula glides on the thorax (closed chain via the clavicle)    | constrain the scapula to an ellipsoid over the ribs                                                                                                                         | †                                                              |
| Glenohumeral                      | ball and socket, 3 DoF                                                                | humeral head centre (radius 24 mm ✓). Stays within 6 mm of the geometric centre during motion ✓. SJC ≈ 34.5 mm below acromion ✓                                             | Iannotti 1992; Poppen & Walker 1976; de Leva 1996              |
| Humeroulnar / humeroradial        | hinge, 1 DoF                                                                          | single axis through the centres of the trochlear sulcus and capitellum ✓; valgus ≈ 4–8°, internally rotated ≈ 3–8° to the epicondylar line †. EJC ≈ 15.6 mm above radiale ✓ | London 1981; de Leva                                           |
| Proximal + distal radioulnar      | pivot, 1 DoF combined                                                                 | axis from the radial head centre to the ulnar fovea                                                                                                                         | Hollister 1994 †                                               |
| Radiocarpal + midcarpal           | condyloid / ellipsoid, 2 DoF                                                          | axes through the capitate head; WJC ≈ 2 mm distal to stylion ✓                                                                                                              | Youm 1978 †; de Leva ✓                                         |
| CMC II–III                        | plane, almost rigid (7–11° flexion–extension total)                                   | axes in the metacarpal bases                                                                                                                                                | El-Shennawy 2001 ✓                                             |
| CMC IV–V                          | modified saddle, 2–3 DoF (20–27° flexion–extension, 22–27° pronation–supination)      | axes in the metacarpal bases; radial–ulnar deviation axis in the hamate                                                                                                     | El-Shennawy 2001 ✓                                             |
| Thumb CMC                         | saddle, 2 non-orthogonal, non-intersecting axes (+ coupled rotation)                  | flexion–extension axis in the trapezium, abduction–adduction axis in the MC1 base                                                                                           | Hollister 1992 ✓                                               |
| MCP II–V                          | condyloid, 2 DoF (+ small passive rotation)                                           | centre in the metacarpal head (cam-shaped: radius larger palmarly, so the collateral ligaments tighten in flexion)                                                          | Kapandji †; Buchholz 1992 (centres from cadaver radiographs) ✓ |
| Thumb MCP                         | condyloid, mostly hinge + small abduction–adduction                                   | MC1 head                                                                                                                                                                    | †                                                              |
| PIP, DIP, thumb IP                | hinge, 1 DoF                                                                          | centre in the head of the proximal bone (≈ the condylar radius from its articular surface)                                                                                  | Buchholz 1992 ✓                                                |
| Hip                               | ball and socket, 3 DoF                                                                | from the inter-ASIS midpoint: ≈ 30 % pelvic width (PW) distal, 14 % PW posterior, 36 % PW lateral. With PW = 256 mm: ≈ 77 down, 36 back, 92 lateral                         | Bell et al. 1990 † (Harrington 2007 refines this)              |
| Knee                              | modified hinge, 1 DoF + rotation when flexed                                          | flexion axis ≈ transepicondylar / cylindrical axis through the posterior femoral condyles; KJC ≈ 35 mm above tibiale ✓                                                      | † / de Leva                                                    |
| Patellofemoral                    | gliding                                                                               |                                                                                                                                                                             |                                                                |
| Ankle (talocrural)                | hinge                                                                                 | axis just below the malleolar tips; ≈ 82.7° ± 3.7° to the tibial axis in the frontal plane (descending laterally), externally rotated ≈ 20–30° relative to the knee axis    | Inman 1976 †                                                   |
| Subtalar                          | hinge on an oblique axis                                                              | ≈ 42° above horizontal and ≈ 23° medial to the foot's long axis (wide range: 20–68° and 4–47°)                                                                              | Inman 1976 †                                                   |
| MTP                               | condyloid                                                                             | metatarsal heads                                                                                                                                                            | †                                                              |
| Intervertebral                    | 3 DoF per motion segment (disc + facets); the facet orientation sets the dominant DoF | cervical: coupled lateral bend + rotation; thoracic: rotation (rib-limited); lumbar: flexion–extension, almost no rotation                                                  | White & Panjabi †                                              |
| Atlanto-occipital / atlanto-axial | condyloid / pivot                                                                     |                                                                                                                                                                             | †                                                              |
| TMJ                               | hinge + glide                                                                         |                                                                                                                                                                             | †                                                              |

---

## 6. Coupled motions and soft constraints

| #   | Constraint                                                                                                                                                                      | Rule for the rig                                                                                                                         | Source                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | **DIP–PIP coupling**: FDP and the oblique retinacular ligament mean the DIP cannot flex much without the PIP                                                                    | θ_DIP ≈ ⅔ θ_PIP (soft; let 0.5–0.8 vary)                                                                                                 | Rijpkema & Girard 1991 †; Lin, Wu & Huang 2000 †       |
| 2   | **Flexion cascade**: in a natural fist the joints close roughly together, and resting tone increases ulnarly (index least flexed, little most)                                  | rest posture: index MCP ≈ 20–30°, increasing ≈ 5–10° per digit ulnarly ⚠                                                                 | Kapandji †; Bain 2015 ✓ (ulnar digits have more range) |
| 3   | **Convergence**: each finger, flexed alone, points toward the scaphoid tubercle                                                                                                 | add MCP adduction/rotation toward the radial side as flexion increases (index ≈ 0°, little ≈ 10–15° radial pull) ⚠                       | Kapandji †                                             |
| 4   | **MCP abduction falls with flexion** (collateral ligaments)                                                                                                                     | abd_max = 20° · cos²(θ_MCP) ≈                                                                                                            | Kapandji †                                             |
| 5   | **Tenodesis**: wrist extension passively flexes the fingers; wrist flexion opens them                                                                                           | relaxed-hand finger flexion ≈ baseline + k · wrist_extension (k ≈ 0.3–0.5) ⚠                                                             | †                                                      |
| 6   | **Finger independence**: the middle and ring fingers are the least individuated; the thumb, index and little are the most                                                       | moving one finger drags its neighbours, the ring most                                                                                    | Häger-Ross & Schieber 2000 ✓                           |
| 7   | Mechanical coupling limits index/middle/ring most and the thumb negligibly; neural control limits ring/little in large arcs                                                     | coupling matrix with ring ↔ middle/little strongest                                                                                      | Lang & Schieber 2004 ✓                                 |
| 8   | **Juncturae tendinum** link the EDC tendons (mainly middle–ring and ring–little)                                                                                                | the ring cannot extend independently when its neighbours are flexed: limit ring MCP extension to ≈ 0–20° if middle or little MCP > 60° ⚠ | von Schroeder & Botte 1990 †                           |
| 9   | **4th/5th CMC coupled**                                                                                                                                                         | 5th CMC flexion ≤ f(4th); cup both together when gripping                                                                                | El-Shennawy 2001 ✓                                     |
| 10  | **Thumb opposition** = CMC flexion + abduction + pronation together (plus MCP rotation)                                                                                         | drive with one "opposition" parameter                                                                                                    | Cooney 1981 ✓                                          |
| 11  | **Pronation/supination vs elbow**: with the elbow extended, humeral rotation adds to forearm rotation (hand rotation ≈ 360° total); at 90° flexion forearm rotation is isolated | when the elbow is extended, let the IK distribute hand roll across the shoulder and forearm                                              | Kapandji †                                             |
| 12  | **Carrying angle disappears with flexion**                                                                                                                                      | valgus 11° → ≈ −2° over 0 → 140° flexion                                                                                                 | Van Roy 2005 ✓                                         |
| 13  | **Scapulohumeral rhythm**                                                                                                                                                       | scapular upward rotation ≈ (elevation − 30°) · 0.45 above 30° (≈ 5:4 GH:ST), capped at ≈ 50–60°                                          | Poppen & Walker ✓; McClure ✓                           |
| 14  | Clavicle follows the arm: elevation + retraction + **≈ 31° posterior rotation** over full elevation                                                                             |                                                                                                                                          | Ludewig 2009 ✓                                         |
| 15  | **Humeral ER needed overhead**: GH externally rotates during elevation (greater-tuberosity clearance)                                                                           | require ER ≳ 30–40° when elevation > 120° ⚠                                                                                              | Ludewig 2009 ✓ (direction) / †                         |
| 16  | **Forward reach protracts the scapula**: it internally rotates and slides laterally on the thorax, with clavicular protraction                                                  | reaching for cymbals or a far tom moves the scapula, not just the GH                                                                     | Neumann †                                              |
| 17  | **Sitting flattens the lumbar spine**: 49° → 34° L1–S1 lordosis                                                                                                                 | posterior pelvic tilt + lumbar flattening when seated                                                                                    | Lord 1997 ✓                                            |
| 18  | **Cervical coupling**: lateral bend and rotation go together (same side) in C2–C7                                                                                               |                                                                                                                                          | White & Panjabi †                                      |
| 19  | **Knee screw-home**: no tibial rotation in full extension                                                                                                                       |                                                                                                                                          | Kapandji †                                             |
| 20  | **Wrist DTM**: radial-extension ↔ ulnar-flexion is the low-effort path                                                                                                          | bias wrist IK along a ≈ 30–45° oblique plane                                                                                             | Crisco / Kane 2018 ✓                                   |

---

## 7. Drumming biomechanics

### 7.1 What the measured literature says

| Finding                                       | Numbers                                                                                                                                                                                                                                                   | Source                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Stick–head contact time                       | **5–8 ms** (mezzo-forte, tom or snare)                                                                                                                                                                                                                    | Dahl 2011 review ✓                                     |
| Stroke kinematics                             | Preparatory lift: the **hand leads upward, stick tip lags pointing down**. The downstroke is a "whip": wrist leads, stick follows                                                                                                                         | Dahl 2011 ✓                                            |
| Preparatory height vs loudness                | strong monotonic relation between preparatory height and impact velocity. Figure axes ≈ 0–600 mm height vs 0–12 m/s velocity                                                                                                                              | Dahl 2011 ✓                                            |
| Stick vertical travel by tempo                | ≈ 0.4 m at 50 bpm; much smaller at 120 and 300 bpm. The rebound is absorbed into the next preparation at higher tempi                                                                                                                                     | Dahl 2011 ✓                                            |
| Accents                                       | accented stroke ≈ **2× striking velocity**. The stroke _before_ an accent is softer (early lift). The interval after the accent is lengthened                                                                                                             | Dahl 2004 via Dahl 2011 ✓                              |
| Fulcrum                                       | stick free to rotate about a **fulcrum between thumb and index finger**; the other fingers stabilise or lock (e.g. to damp the rebound)                                                                                                                   | Dahl 2011 ✓; Altenmüller 2020 ✓                        |
| Experts vs beginners                          | experts and students: highly self-similar strokes, **predominant use of low-mass distal joints** → whiplash-like motion. Beginners use proximal joints more                                                                                               | Altenmüller, Trappe & Jabusch 2020 ✓                   |
| Joint angles in an expert (pad, 76 bpm forte) | **elbow ≈ constant 90°** through the cycle. Wrist and stick–hand angle swing about extension; impact occurs near the stick–hand–wrist "straight" (180°) configuration after dorsiflexion. Fulcrum ≈ at index MCP                                          | Altenmüller 2020 ✓                                     |
| Wrist posture on a kit                        | drummers spent **≈ 90 % of song time outside neutral wrist flexion–extension**, and **95–96 % in extension** (Xsens IMU, 9 drummers, 3 songs)                                                                                                             | Flammia & Azar 2021, described in Azar 2022 ✓          |
| Maximal single-hand tapping rate              | **10 Hz** (100 ms inter-tap interval) in the "world's fastest drummer", vs the assumed human limit of 5–7 Hz; reciprocal flexor carpi ulnaris / extensor carpi radialis activation                                                                        | Fujii et al. 2009 ✓                                    |
| Drummers vs non-drummers                      | lower timing variability and less antagonist co-contraction                                                                                                                                                                                               | Fujii et al. 2009 ✓                                    |
| Grip effect (timpani mocap)                   | **French grip: stick-tip vertical range ≈ 434 mm, mean height ≈ 1133 mm. German grip: ≈ 179 mm range, ≈ 909 mm mean.** German-grip player had a near-stationary elbow (2–7× less shoulder ROM). French uses elbow flexion more; German uses wrist "twist" | Bouënard, Wanderley & Gibet 2008 ✓ (only 2 subjects ⚠) |
| Restrained rebound ("controlled" strokes)     | gripping tighter to stop the stick changes the contact and the sound (rated "less full")                                                                                                                                                                  | Dahl & Altenmüller via Dahl 2011 ✓                     |
| Hand-arm vibration                            | exposures above the ACGIH action limit of 2.5 m/s² in 6 drummers, 4 above the 5.0 m/s² threshold limit value                                                                                                                                              | Azar 2022 (prelim.) ✓                                  |
| Moeller technique                             | **no peer-reviewed kinematic study found.** Pedagogy describes a whip: forearm/elbow lifts and leads, wrist lags, then the stick is "thrown" and the next upstroke is taken from the rebound                                                              | pedagogy only ⚠                                        |

### 7.2 Derived stroke numbers for animation (≈, labelled as estimates)

| Quantity                                                                    | Estimate                                                                                      | Derivation                                                                             |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Stick tip impact speed                                                      | pp ≈ 1–2 m/s, mf ≈ 3–5 m/s, ff ≈ 7–10 m/s                                                     | Dahl 2011 Fig. 2 and 4 ranges                                                          |
| Wrist angular velocity at impact (wrist-dominant stroke)                    | ≈ 15–30 rad/s (≈ 900–1700 °/s)                                                                | tip speed ÷ wrist-to-tip radius ≈ 0.36 m (hand 0.08 + stick beyond the fulcrum ≈ 0.28) |
| Wrist flexion–extension excursion per stroke                                | ≈ 20–60° (larger for loud or slow strokes)                                                    | stick-tip travel 0.1–0.4 m ÷ radius ≈ 0.36 m                                           |
| Stick rotation about the fulcrum relative to the hand (finger contribution) | ≈ 10–30° in finger/rebound strokes ⚠                                                          | Altenmüller ω1 angle swing (figure, qualitative)                                       |
| Elbow                                                                       | quasi-static ≈ 80–100° flexion in fast wrist strokes; contributes in loud and Moeller strokes | Altenmüller ✓; Bouënard ✓                                                              |

### 7.3 Grip geometry (practitioner sources; no measured anatomy studies exist)

| Grip                    | Forearm rotation (0 = palm down, fully pronated) | Fulcrum                                                                                                                                        | Primary mover                                                                |
| ----------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| German (matched)        | ≈ 0° (palms facing floor)                        | thumb pad vs index middle phalanx                                                                                                              | wrist flexion–extension, large elbow involvement                             |
| American (matched)      | ≈ 30–45° supinated                               | as above                                                                                                                                       | wrist + some forearm rotation                                                |
| French (matched)        | ≈ 80–90° (thumbs up)                             | thumb vs index                                                                                                                                 | fingers (MCP/PIP flexion pulling the butt) + forearm rotation                |
| Traditional (left hand) | forearm ≈ 90° supinated from German, thumb up    | stick sits in the **thumb–index web** (the fulcrum), rests across the ring finger's distal phalanx/cuticle; index and middle curl over the top | **forearm pronation/supination** ("turning a doorknob"), plus thumb pressure |

Practitioner fulcrum and stick facts (†, manufacturer/pedagogy):

- Fulcrum ≈ 1/3 of stick length from the butt, i.e. ≈ 120–150 mm on a 406 mm (16") stick.
- 5A ≈ 406 mm × 14.4 mm diameter, ≈ 45–50 g; 7A ≈ 394 × 13.7; 5B ≈ 406 × 15.1.
- In the matched grips the middle, ring and little fingers wrap loosely. A gap between stick and palm lets the stick pivot.

### 7.4 Seated posture at the kit

⚠ No peer-reviewed measurement of throne height or hip/knee angles exists. The DRUMMER Lab (Azar) studies upper-limb posture. Throne advice below is practitioner consensus, mapped onto ANSUR.

| Quantity                | Value                                                                                                                                                  | Basis                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Throne seat height      | slightly **above** knee/popliteal height. "Hip slightly above the knee", thighs sloping down. Popliteal height 437 + shoe ≈ 25 ⇒ seat **≈ 480–540 mm** | practitioner sources (drumcenternh, Modern Drummer ergonomics series, Brandon Green 2018 [paywalled]) ⚠; ANSUR ✓ |
| Thigh slope             | ≈ 5–15° downward from hip to knee                                                                                                                      | ≈                                                                                                                |
| Hip angle (trunk–thigh) | ≈ 95–115° (seated upright with lumbar flattening); smaller when leaning to toms                                                                        | ≈                                                                                                                |
| Knee angle (internal)   | ≈ 100–120° (≈ 60–80° flexion), more open for heel-down                                                                                                 | practitioners: "slightly greater than 90°" ⚠                                                                     |
| Ankle                   | heel-down: ≈ 0–20° plantarflexion swing. Heel-up: plantarflexion ≈ 20–40° with MTP extension ≈ 40–60°                                                  | ≈ from ROM norms                                                                                                 |
| Lumbar                  | ≈ 34° L1–S1 lordosis seated                                                                                                                            | Lord 1997 ✓                                                                                                      |
| Trunk lean              | ≈ 5–20° forward of vertical at the snare                                                                                                               | ≈ ⚠                                                                                                              |
| Elbows                  | ≈ 80–100° flexion at the snare; upper arms ≈ 10–30° abducted and slightly forward                                                                      | Altenmüller 2020 ✓ (elbow ≈ 90°) / ≈                                                                             |
| Wrists                  | mostly extended (see §7.1)                                                                                                                             | Flammia & Azar 2021 ✓                                                                                            |

---

## 8. Constants block (degrees → radians; anatomical hard limits; rest = 0)

```js
// Units: metres, radians. Male, H = 1.78 m. Picks from §0–§4.
const D = Math.PI / 180;
export const SEG = {
  upperArm: 0.3,
  forearm: 0.28,
  wristToMCP3: 0.088,
  handLength: 0.196,
  thigh: 0.435,
  shank: 0.44,
  footLength: 0.27,
  biacromial: 0.419,
  shoulderJCSep: 0.385,
  hipJCSep: 0.185,
  sittingHeight: 0.927,
  poplitealHeight: 0.437,
  humeralHeadR: 0.024,
  sjcBelowAcromion: 0.0345,
  ejcAboveRadiale: 0.0156,
  wjcBelowStylion: 0.002,
};
// [digit]: [MC, PP, MP, DP] in metres (Buryanov & Kotiuk 2010 × 1.05)
export const HAND = {
  thumb: [0.0485, 0.0331, null, 0.0228],
  index: [0.0715, 0.0418, 0.0235, 0.0166],
  middle: [0.0678, 0.0469, 0.0276, 0.0183],
  ring: [0.0609, 0.0434, 0.0269, 0.0182],
  little: [0.0564, 0.0344, 0.019, 0.0168],
};
export const ROM = {
  // [min, max] radians
  elbowFlex: [-5 * D, 145 * D], // functional 30–130
  pronSup: [-80 * D, 85 * D], // + = supination; functional ±50
  wristFlexExt: [-70 * D, 80 * D], // + = flexion
  wristRadUln: [-20 * D, 35 * D], // + = ulnar
  mcpFlex: [-30 * D, 90 * D], // little up to ~100
  mcpAbd: [-20 * D, 20 * D], // scale by cos^2(mcpFlex)
  pipFlex: [0, 105 * D],
  dipFlex: [-10 * D, 85 * D], // couple ≈ 2/3 PIP
  cmc4Flex: [0, 20 * D],
  cmc5Flex: [0, 27 * D],
  thumbCmcFE: [-25 * D, 30 * D],
  thumbCmcAA: [-10 * D, 45 * D],
  thumbMcpFlex: [-10 * D, 55 * D],
  thumbIpFlex: [-20 * D, 80 * D],
  shFlex: [-60 * D, 180 * D],
  shAbd: [-30 * D, 180 * D],
  shRot: [-70 * D, 90 * D], // + = ER (at 90° abd)
  hipFlex: [-20 * D, 120 * D],
  hipAbd: [-30 * D, 45 * D],
  hipRot: [-40 * D, 40 * D],
  kneeFlex: [-5 * D, 135 * D],
  ankleDF: [-50 * D, 20 * D], // + = dorsiflexion
  halluxMtpExt: [-45 * D, 70 * D],
};
```

---

## 9. Sources

Primary or near-primary, read in this session (✓):

- de Leva P. 1996. Adjustments to Zatsiorsky-Seluyanov's segment inertia parameters. _J Biomech_ 29:1223–30. Tables 1–4 read from the PDF: https://ebm.ufabc.edu.br/wp-content/uploads/2013/12/Leva-1996.pdf
- ANSUR II (2012) male public dataset, 4,082 men; statistics computed here: https://calmcode.io/datasets/ergonomics (and ph.health.mil ANSUR II overview)
- Trotter & Gleser 1952 coefficients, via https://en.wikipedia.org/wiki/Estimation_of_stature
- Gray's Anatomy (1918), vertebral column lengths: https://pubannotation.org/docs/sourcedb/GrayAnatomy/sourceid/25
- Buryanov A, Kotiuk V. 2010. Proportions of hand segments. _Int J Morphol_ 28:755–8: https://scielo.conicyt.cl/pdf/ijmorphol/v28n3/art15.pdf
- Hume MC et al. 1990. Functional ROM of the joints of the hand. _J Hand Surg Am_ (PMID 2324451)
- Bain GI et al. 2015. The functional range of motion of the finger joints. _J Hand Surg Eur_ 40:406–11
- Ryu J et al. 1991, _J Hand Surg Am_ (PMID 1861019); Palmer AK et al. 1985 (PMID 3968403)
- Sarrafian SK et al. 1977. _Clin Orthop_ (PMID 598105)
- Kane PM, Crisco JJ et al. 2018 (PMC5837914); Rainbow MJ et al. 2015 (PMC4844243); Kaufman-Cohen Y et al. 2020 (PMID 31359843)
- El-Shennawy M et al. 2001. 2nd–5th CMC kinematics. _J Hand Surg Am_ (PMID 11721246)
- Cocchiarella DM et al. 2016 (PMID 26158485); Baker NA et al. 2013 (PMID 23549206)
- Cooney WP et al. 1981. Kinesiology of the thumb trapeziometacarpal joint. _JBJS Am_ (PMID 7320028)
- Hollister A et al. 1992. Axes of rotation of the thumb CMC joint. _J Orthop Res_ (PMID 1569508)
- Iannotti JP et al. 1992. The normal glenohumeral relationships. _JBJS Am_ (PMID 1583043)
- Poppen NK, Walker PS 1976 (PMID 1254624); McClure PW et al. 2001 (PMID 11408911); Ludewig PM et al. 2009 (PMC2657311)
- London JT 1981 (PMID 7217119); Morrey BF et al. 1981 (PMID 7240327); Van Roy P et al. 2005 (PMID 16338730); Yilmaz E et al. 2005 (PMID 16295195)
- Häger-Ross C, Schieber MH 2000 (PMC6773164); Lang CE, Schieber MH 2004 (PMID 15212429)
- Lord MJ et al. 1997. Lumbar lordosis, sitting vs standing. _Spine_ (PMID 9383867); Bernhardt M, Bridwell KH 1989 (PMID 2772721)
- Soucie JM et al. 2011 (PMID 21070485); Roach KE, Miles TP 1991 (PMID 1881956); Boone DC, Azen SP 1979 (PMID 457719)
- Nawoczenski DA et al. 2008 (PMID 18348821); Muto T et al. 1994 (PMID 7965330)
- Dahl S. 2011. Striking movements: a survey of motion analysis of percussionists. _Acoust Sci Tech_ 32:168: https://vbn.aau.dk/ws/files/65339564/Dahl_J_AST_review_submi.pdf
- Altenmüller E, Trappe W, Jabusch H-C. 2020. Expertise-related differences in cyclic motion patterns in drummers. _Front Psychol_ (PMC7693443)
- Takiyama K, Hirashima M, Fujii S. 2022. _Front Sports Act Living_ (PMC9361045)
- Fujii S et al. 2009. _Neurosci Lett_ 459:69–73, world's fastest drummer (via https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8343458/)
- Azar NR. 2022. Injury prevention considerations for drum kit performance. _Front Psychol_ (PMC9128529), describing Flammia & Azar 2021
- Bouënard A, Wanderley MM, Gibet S. 2008. Analysis of percussion grip for physically based character animation (ENACTIVE08): https://idmil.org/wp-content/uploads/2022/06/Bouenard_ENACTIVE08.pdf
- Winter/Drillis & Contini ratios, via https://github.com/eladsimantov/anthropometric-model and Wisner et al. 2006 ISBS: https://ojs.ub.uni-konstanz.de/cpa/article/view/292
- Hand-segment ratio reproductions: PMC6339214 (Hamilton & Dunsmuir 2002 ratios), PMC13058727 (Tsakonas 2026, on Buchholz bias), arXiv 1504.01151 (robot-hand finger-base angles)
- Practitioner throne guidance: https://drumcenternh.com/news/how-to-position-your-drum-throne-for-ergonomic-use ; https://en.wikipedia.org/wiki/Grip_(percussion)

Standard references used for † values, not re-fetched:

- AAOS. _Joint Motion: Method of Measuring and Recording_ (1965); Greene & Heckman (1994)
- Kapandji, _The Physiology of the Joints_ (vols 1–3)
- Neumann, _Kinesiology of the Musculoskeletal System_
- White & Panjabi, _Clinical Biomechanics of the Spine_ (1990)
- Inman, _The Joints of the Ankle_ (1976); Inman, Saunders & Abbott 1944
- Youm et al. 1978; Hollister et al. 1994 (forearm axis); Bell et al. 1990 (hip JC); Legaye et al. 1998
- Buchholz, Armstrong & Goldstein 1992, _Ergonomics_ 35:261 (ratios ⚠, see §3.2)
- Rijpkema & Girard 1991; Lin, Wu & Huang 2000; von Schroeder & Botte 1990
- Youdas et al. 1992; Norkin & White
