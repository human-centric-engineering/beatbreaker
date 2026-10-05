import * as THREE from 'three';

import { ball, type Materials, rod } from '@/components/app/studio/drummer/parts';
import {
  BOARD_LENGTH,
  BELL,
  HAT_PEDAL,
  KICK_PEDAL,
  type Piece,
  type PieceId,
  PIECES,
  type V3,
  cymbalY,
} from '@/lib/app/breaks/drummer/kit-layout';
import { HAT_CLOSED_GAP, type Pose } from '@/lib/app/breaks/drummer/pose';

/**
 * The kit, built from primitives and laid out by `kit-layout.ts`
 * (experiment: the drummer view): shells with hoops and lugs, lathed cymbals
 * on stands, both pedals. `update` moves what a performance moves — the
 * beater, the boards, the top hat — and swings each cymbal after it is struck.
 */

export interface KitModel {
  root: THREE.Group;
  /** `percussion`: which percussion pieces to put up. */
  update: (pose: Pose, percussion: ReadonlySet<PieceId>) => void;
}

const vec = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);

/** A piece's frame: at its centre, turned by its tilt (`XYZ`, as `onPiece` reads it). */
function frame(p: Piece): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(vec(p.centre));
  g.rotation.set(p.tilt[0], 0, p.tilt[1], 'XYZ');
  return g;
}

function drum(p: Piece, m: Materials, lugs: number, hoop: THREE.Material = m.chrome): THREE.Group {
  const r = p.radius;
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, p.depth, 48, 1, true), m.shell);
  shell.position.y = -p.depth / 2;
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);

  const head = new THREE.Mesh(new THREE.CircleGeometry(r * 0.99, 48), m.head);
  head.rotation.x = -Math.PI / 2;
  head.position.y = 0.001;
  head.receiveShadow = true;
  g.add(head);
  const reso = new THREE.Mesh(new THREE.CircleGeometry(r * 0.99, 48), m.black);
  reso.rotation.x = Math.PI / 2;
  reso.position.y = -p.depth;
  g.add(reso);

  for (const y of [0.004, -p.depth - 0.004]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.004, 0.0065, 8, 64), hoop);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.castShadow = true;
    g.add(ring);
  }
  const lugGeo = new THREE.BoxGeometry(0.014, Math.min(0.07, p.depth * 0.4), 0.02);
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2 + 0.3;
    const lug = new THREE.Mesh(lugGeo, m.chrome);
    lug.position.set(Math.cos(a) * (r + 0.01), -p.depth / 2, Math.sin(a) * (r + 0.01));
    lug.rotation.y = -a;
    g.add(lug);
  }
  return g;
}

function cymbal(radius: number, m: Materials): THREE.Mesh {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 48; i++) {
    const rho = (i / 48) * radius;
    pts.push(new THREE.Vector2(Math.max(rho, 0.0005), cymbalY(rho, radius)));
  }
  const geo = new THREE.LatheGeometry(pts, 64);
  // the lathe's u runs round the cymbal: map v to radius so the grooves ring it
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    uv.setXY(i, 0.5 + (x / radius) * 0.5, 0.5 + (z / radius) * 0.5);
  }
  const mesh = new THREE.Mesh(geo, m.bronze);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A tripod stand from the floor up to `top`, legs splayed. */
function stand(top: THREE.Vector3, m: Materials, spread = 0.22): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Vector3(top.x, 0.32, top.z);
  g.add(rod(base, top, 0.009, m.chrome));
  g.add(rod(new THREE.Vector3(top.x, 0, top.z), base, 0.013, m.chrome));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const foot = new THREE.Vector3(
      top.x + Math.cos(a) * spread,
      0.01,
      top.z + Math.sin(a) * spread
    );
    g.add(rod(new THREE.Vector3(top.x, 0.3, top.z), foot, 0.007, m.chrome));
    const f = ball(0.014, m.black, 8);
    f.position.copy(foot);
    g.add(f);
  }
  return g;
}

interface Swinger {
  id: PieceId;
  group: THREE.Group;
  /** Radians per unit of strength, how fast it dies, and how fast it rocks. */
  amp: number;
  decay: number;
  freq: number;
}

export function buildKit(m: Materials): KitModel {
  const root = new THREE.Group();
  root.name = 'kit';
  const shakers: { id: PieceId; group: THREE.Group }[] = [];
  const swingers: Swinger[] = [];

  /* ---- drums --------------------------------------------------------- */
  const lugCount: Partial<Record<PieceId, number>> = { snare: 10, tom1: 6, tom2: 6, floor: 8 };
  for (const id of ['snare', 'tom1', 'tom2', 'floor'] as const) {
    const p = PIECES[id];
    const f = frame(p);
    const body = drum(p, m, lugCount[id] ?? 6);
    f.add(body);
    shakers.push({ id, group: body });
    root.add(f);
  }
  // snare stand, tom mounts off the kick, floor tom legs
  const snare = PIECES.snare;
  root.add(
    stand(
      new THREE.Vector3(snare.centre[0], snare.centre[1] - snare.depth - 0.02, snare.centre[2]),
      m,
      0.2
    )
  );
  const kick = PIECES.kick;
  const kickTop = new THREE.Vector3(
    kick.centre[0],
    kick.centre[1] + kick.radius,
    kick.centre[2] + 0.02
  );
  for (const id of ['tom1', 'tom2'] as const) {
    const p = PIECES[id];
    const under = new THREE.Vector3(
      p.centre[0] * 0.6,
      p.centre[1] - p.depth * 0.6,
      p.centre[2] - 0.05
    );
    root.add(rod(kickTop, under, 0.011, m.chrome));
  }
  const floor = PIECES.floor;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.9;
    const top = new THREE.Vector3(
      floor.centre[0] + Math.cos(a) * (floor.radius + 0.02),
      floor.centre[1] - 0.06,
      floor.centre[2] + Math.sin(a) * (floor.radius + 0.02)
    );
    const foot = new THREE.Vector3(top.x + Math.cos(a) * 0.06, 0.01, top.z + Math.sin(a) * 0.06);
    root.add(rod(top, foot, 0.008, m.chrome));
  }

  /* ---- kick ---------------------------------------------------------- */
  const kickGroup = new THREE.Group();
  kickGroup.position.copy(vec(kick.centre));
  // the drum's own frame has its batter head facing +z, toward the drummer
  const kickBody = drum({ ...kick, centre: [0, 0, 0] }, m, 10, m.wood);
  kickBody.rotation.x = Math.PI / 2;
  kickBody.position.z = kick.depth / 2;
  // a white batter head facing the drummer, a black reso with a port out front
  kickGroup.add(kickBody);
  for (const side of [-1, 1]) {
    const spur = rod(
      new THREE.Vector3(side * kick.radius * 0.8, -kick.radius * 0.3, -0.05),
      new THREE.Vector3(side * (kick.radius + 0.1), -kick.centre[1] + 0.01, -0.1),
      0.007,
      m.chrome
    );
    kickGroup.add(spur);
  }
  shakers.push({ id: 'kick', group: kickBody });
  root.add(kickGroup);

  // kick pedal: base plate, board hinged at the heel, beater on its axle
  const kp = vec(KICK_PEDAL.heel);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.36), m.black);
  plate.position.set(kp.x, 0.006, kp.z - 0.16);
  root.add(plate);
  const kickBoard = new THREE.Group();
  kickBoard.position.copy(kp);
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.012, BOARD_LENGTH), m.chrome);
  kb.position.z = -BOARD_LENGTH / 2;
  kb.castShadow = true;
  kickBoard.add(kb);
  root.add(kickBoard);
  const axle = vec(KICK_PEDAL.axle);
  for (const side of [-1, 1])
    root.add(
      rod(
        new THREE.Vector3(axle.x + side * 0.05, 0.01, axle.z),
        new THREE.Vector3(axle.x + side * 0.05, axle.y + 0.03, axle.z),
        0.008,
        m.chrome
      )
    );
  const beater = new THREE.Group();
  beater.position.copy(axle);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0035, 0.0035, KICK_PEDAL.beater, 8),
    m.chrome
  );
  shaft.position.y = KICK_PEDAL.beater / 2;
  beater.add(shaft);
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 20), m.felt);
  felt.rotation.z = Math.PI / 2;
  felt.position.y = KICK_PEDAL.beater;
  felt.castShadow = true;
  beater.add(felt);
  root.add(beater);

  /* ---- hats ---------------------------------------------------------- */
  const hat = PIECES.hat;
  const hatCentre = vec(hat.centre);
  root.add(stand(new THREE.Vector3(hatCentre.x, hatCentre.y - 0.03, hatCentre.z), m, 0.2));
  const hatRod = rod(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.2, 0), 0.004, m.chrome);
  const hatTop = new THREE.Group();
  const hatTopTilt = frame(hat);
  hatTopTilt.position.set(0, 0, 0);
  const topCym = cymbal(hat.radius, m);
  hatTopTilt.add(topCym);
  hatTop.add(hatTopTilt);
  hatTop.add(hatRod);
  hatTop.position.copy(hatCentre);
  root.add(hatTop);
  const bottom = frame(hat);
  const bottomCym = cymbal(hat.radius, m);
  bottomCym.rotation.x = Math.PI; // the bottom cymbal faces up into the top one
  // edge to edge with the top one: each bow falls 7.5% of the radius
  bottomCym.position.y = -2 * 0.075 * hat.radius - HAT_CLOSED_GAP;
  bottom.add(bottomCym);
  root.add(bottom);
  // hat pedal
  const hp = vec(HAT_PEDAL.heel);
  const hatBoard = new THREE.Group();
  hatBoard.position.copy(hp);
  hatBoard.rotation.order = 'YXZ';
  hatBoard.rotation.y = Math.atan2(-HAT_PEDAL.toward[0], -HAT_PEDAL.toward[2]);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, BOARD_LENGTH), m.chrome);
  hb.position.z = -BOARD_LENGTH / 2;
  hb.castShadow = true;
  hatBoard.add(hb);
  root.add(hatBoard);
  const pedalTop = hp.clone().addScaledVector(vec(HAT_PEDAL.toward).normalize(), BOARD_LENGTH);
  root.add(
    rod(
      new THREE.Vector3(pedalTop.x, 0.01, pedalTop.z),
      new THREE.Vector3(hatCentre.x, 0.05, hatCentre.z),
      0.006,
      m.chrome
    )
  );

  /* ---- cymbals ------------------------------------------------------- */
  const swing: Partial<Record<PieceId, [number, number, number]>> = {
    ride: [0.05, 1.4, 1.6],
    crash: [0.16, 1.6, 2.1],
  };
  for (const id of ['ride', 'crash'] as const) {
    const p = PIECES[id];
    const f = frame(p);
    const swingGroup = new THREE.Group();
    swingGroup.add(cymbal(p.radius, m));
    const nut = ball(0.012, m.black, 10);
    nut.position.y = BELL.height + 0.008;
    swingGroup.add(nut);
    f.add(swingGroup);
    root.add(f);
    const [amp, decay, freq] = swing[id] ?? [0.05, 1.5, 2];
    swingers.push({ id, group: swingGroup, amp, decay, freq });
    // a straight stand, then a short boom out to the cymbal
    const under = new THREE.Vector3(
      p.centre[0] + 0.1 * Math.sign(p.centre[0]),
      p.centre[1] - 0.12,
      p.centre[2] - 0.12
    );
    root.add(stand(under, m));
    root.add(rod(under, vec(p.centre).add(new THREE.Vector3(0, -0.01, 0)), 0.007, m.chrome));
  }

  /* ---- percussion: a cowbell off the kick, a block off the hat stand -- */
  const cowbell = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.048, 0.13, 4, 1), m.black);
  cowbell.rotation.set(Math.PI / 2 - 0.2, Math.PI / 4, 0);
  const pc1 = PIECES.perc1;
  cowbell.position.set(pc1.centre[0], pc1.centre[1], pc1.centre[2] - 0.03);
  cowbell.castShadow = true;
  const perc1 = [
    cowbell,
    rod(vec(pc1.centre).add(new THREE.Vector3(0, -0.02, -0.08)), kickTop, 0.007, m.chrome),
  ];
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.06), m.wood);
  const pc2 = PIECES.perc2;
  block.position.set(pc2.centre[0], pc2.centre[1], pc2.centre[2]);
  block.rotation.x = 0.2;
  block.castShadow = true;
  const perc2 = [
    block,
    rod(
      vec(pc2.centre).add(new THREE.Vector3(0, -0.03, 0)),
      new THREE.Vector3(hatCentre.x - 0.02, 0.6, hatCentre.z),
      0.006,
      m.chrome
    ),
  ];
  root.add(...perc1, ...perc2);

  /* ---- throne and rug ------------------------------------------------ */
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.08, 32), m.black);
  seat.position.set(0, 0.51, 0.26);
  seat.castShadow = true;
  seat.receiveShadow = true;
  root.add(seat);
  root.add(stand(new THREE.Vector3(0, 0.47, 0.26), m, 0.26));
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.35, 64), m.rug);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.002, -0.25);
  rug.receiveShadow = true;
  root.add(rug);

  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.receiveShadow = true;
  });

  return {
    root,
    update(pose: Pose, percussion: ReadonlySet<PieceId>) {
      for (const o of perc1) o.visible = percussion.has('perc1');
      for (const o of perc2) o.visible = percussion.has('perc2');
      kickBoard.rotation.x = pose.legs.kickFoot.board;
      hatBoard.rotation.x = pose.legs.hatFoot.board;
      beater.rotation.x = pose.beater;
      hatTop.position.y = hatCentre.y + pose.hatGap - HAT_CLOSED_GAP;

      for (const s of shakers) {
        const h = pose.hits[s.id];
        const give = h ? h.strength * Math.exp(-h.since * 28) : 0;
        s.group.position.y = s.id === 'kick' ? 0 : -0.0025 * give;
        if (s.id === 'kick') s.group.scale.setScalar(1 + 0.004 * give);
      }
      for (const s of swingers) {
        const h = pose.hits[s.id];
        if (!h || h.since > 6) {
          s.group.rotation.set(0, 0, 0);
          continue;
        }
        const e = h.strength * s.amp * Math.exp(-h.since * s.decay);
        s.group.rotation.x = -e * Math.cos(h.since * Math.PI * 2 * s.freq);
        s.group.rotation.z = 0.3 * e * Math.sin(h.since * Math.PI * 2 * s.freq * 1.3);
      }
      // an open hat rattles on its clutch when it is struck; a closed one is held still
      const ht = pose.hits.hat;
      const open = (pose.hatGap - HAT_CLOSED_GAP) / 0.024;
      const rattle = ht ? 0.05 * open * ht.strength * Math.exp(-ht.since * 4) : 0;
      hatTopTilt.rotation.x = hat.tilt[0] + rattle * Math.cos((ht?.since ?? 0) * Math.PI * 6);
    },
  };
}
