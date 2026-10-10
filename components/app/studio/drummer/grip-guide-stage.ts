import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { type ArmRig, buildArm, poseArm } from '@/components/app/studio/drummer/drummer-model';
import { buildSnare } from '@/components/app/studio/drummer/kit-model';
import {
  type Materials,
  disposeMaterials,
  disposeTree,
  makeMaterials,
} from '@/components/app/studio/drummer/parts';
import { type GuideGrip, guideAt, lessonLength } from '@/lib/app/breaks/drummer/grip-guide';
import type { Hand } from '@/lib/app/breaks/drummer/kit-layout';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';

/**
 * The grip guide's picture (experiment): two arms, their hands and sticks,
 * and a snare, playing a grip's lesson (`grip-guide.ts`) as a film. The arms
 * are the drummer's own (`buildArm`, `poseArm`), so the hands bend exactly as
 * the drummer's at the kit do. Drag to turn round the hands; the film keeps
 * its own time, which the guide plays, pauses and moves through.
 */

export interface GuideStageOptions {
  grip: GuideGrip;
  /** Called each frame with the time into the lesson, seconds. */
  onTime?: (seconds: number) => void;
}

/** Where the camera looks from and at: in front of the drummer and to the right, down on the hands. */
const SHOT = {
  position: new THREE.Vector3(0.42, 1.18, -0.78),
  target: new THREE.Vector3(-0.05, 0.76, -0.16),
};

const BACKDROP = '#1d1f25';

export class GripGuideStage {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly scene = new THREE.Scene();
  private readonly materials: Materials;
  private readonly arms: Record<Hand, ArmRig>;
  private readonly env: THREE.Texture;
  private readonly resize: ResizeObserver | null;
  private raf = 0;
  /** The last frame's timestamp, ms (`null` before the first). */
  private last: number | null = null;
  private time = 0;
  private playing = true;
  private grip: GuideGrip;
  private readonly onTime?: (seconds: number) => void;

  constructor(
    private readonly host: HTMLElement,
    options: GuideStageOptions
  ) {
    this.grip = options.grip;
    this.onTime = options.onTime;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.02, 20);
    this.camera.position.copy(SHOT.position);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 0.3;
    this.controls.maxDistance = 2.5;
    this.controls.target.copy(SHOT.target);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.env = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.55;
    this.scene.background = new THREE.Color(BACKDROP);

    const who = PERSONAS[0];
    this.materials = makeMaterials(who);
    this.scene.add(buildSnare(this.materials));
    this.arms = {
      lead: buildArm('lead', this.materials, who),
      other: buildArm('other', this.materials, who),
    };
    for (const a of Object.values(this.arms)) {
      // only the arms from the elbow down matter here: the shoulder and sleeve would float
      this.scene.add(a.upper, a.elbow, a.forearm, a.wrist, a.hand.group, a.stick, a.bead);
    }
    this.addLights();
    this.pose();

    this.resize =
      typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.fit()) : null;
    this.resize?.observe(host);
    this.fit();
    this.raf = requestAnimationFrame(this.frame);
  }

  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight('#dfe6ff', '#2b2420', 0.7));
    const key = new THREE.DirectionalLight('#ffffff', 2.6);
    key.position.set(1.2, 2.8, -1.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, {
      left: -0.8,
      right: 0.8,
      top: 0.8,
      bottom: -0.8,
      near: 0.5,
      far: 6,
    });
    this.scene.add(key);
    const warm = new THREE.PointLight('#ffb47a', 3, 4);
    warm.position.set(-1, 1.5, 0.8);
    this.scene.add(warm);
  }

  private fit = (): void => {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  /** Pose both arms for the lesson where it is. */
  private pose(): void {
    const { arms } = guideAt(this.grip, this.time);
    poseArm(this.arms.lead, arms.lead);
    poseArm(this.arms.other, arms.other);
  }

  private frame = (now: number): void => {
    const dt = this.last === null ? 0 : Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.playing) this.time = (this.time + dt) % lessonLength(this.grip);
    this.pose();
    this.onTime?.(this.time);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.frame);
  };

  /** Teach another grip, from its first step. */
  setGrip(grip: GuideGrip): void {
    if (grip === this.grip) return;
    this.grip = grip;
    this.time = 0;
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
  }

  /** Go to `seconds` into the lesson. */
  seek(seconds: number): void {
    this.time = Math.max(0, seconds);
  }

  /** Back to where the camera started. */
  recentre(): void {
    this.camera.position.copy(SHOT.position);
    this.controls.target.copy(SHOT.target);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.resize?.disconnect();
    this.controls.dispose();
    disposeTree(this.scene);
    disposeMaterials(this.materials);
    this.env.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
