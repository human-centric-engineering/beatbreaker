import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { buildDrummer, type DrummerModel } from '@/components/app/studio/drummer/drummer-model';
import { buildKit } from '@/components/app/studio/drummer/kit-model';
import {
  disposeMaterials,
  disposeTree,
  makeMaterials,
  type Materials,
  styleKit,
} from '@/components/app/studio/drummer/parts';
import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import { type CameraView, cameraFor } from '@/lib/app/breaks/drummer/camera';
import { type Persona, otherThan } from '@/lib/app/breaks/drummer/personas';
import { type Grips, MATCHED_GRIPS, poseAt } from '@/lib/app/breaks/drummer/pose';
import { StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';

/**
 * The 3D drummer's renderer, scene and loop (experiment), as one object a
 * component mounts into a box and disposes of when it goes.
 *
 * Time comes from the audio clock, less the output latency, so a stick meets
 * the head when the speakers sound it rather than when it was scheduled.
 * Stopped, the drummer idles on the page's own clock: breathing, sticks
 * resting over the hats and the snare.
 *
 * A new stage seats a player at random, unless one is given; another can
 * take their place at any time without stopping the music.
 */

export interface StageClock {
  /** The audio clock now, seconds. */
  now: () => number;
  /** Seconds between the audio clock and the speakers. */
  latency: () => number;
}

const BACKDROP = '#121318';

export class DrummerStage {
  readonly timeline = new StrokeTimeline();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly rig = new THREE.Group();
  private readonly kit;
  private readonly kitMaterials: Materials;
  private drummer: DrummerModel;
  /** The drummer's own materials, made in their colours and freed with them. */
  private dress: Materials;
  private who: Persona;
  private readonly env: THREE.Texture;
  private readonly resize: ResizeObserver | null;
  private raf = 0;
  private last = 0;
  private groove = 0;
  private playing = false;
  private lefty = false;
  private grips: Grips = MATCHED_GRIPS;
  private view: CameraView = 'front';
  private flight: {
    from: THREE.Vector3;
    to: THREE.Vector3;
    aimFrom: THREE.Vector3;
    aimTo: THREE.Vector3;
    t: number;
  } | null = null;

  constructor(
    private readonly host: HTMLElement,
    private readonly clock: StageClock,
    persona: Persona = otherThan(undefined)
  ) {
    this.who = persona;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.03, 40);
    const shot = cameraFor(this.view, this.lefty);
    this.camera.position.set(...shot.position);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.25;
    this.controls.maxDistance = 7;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.zoomToCursor = true;
    this.controls.target.set(...shot.target);
    // a drag takes the camera off its shot: stop flying it there
    this.controls.addEventListener('start', this.cancelFlight);

    // reflections from a room built in code: the CSP will not fetch an HDRI
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.env = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.5;
    this.scene.background = new THREE.Color(BACKDROP);
    this.scene.fog = new THREE.Fog(BACKDROP, 7, 16);

    this.kitMaterials = makeMaterials(persona);
    this.kit = buildKit(this.kitMaterials);
    this.dress = makeMaterials(persona);
    this.drummer = buildDrummer(this.dress, persona);
    this.rig.add(this.kit.root, this.drummer.root);
    this.scene.add(this.rig);
    this.addLights();

    this.resize =
      typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.fit()) : null;
    this.resize?.observe(host);
    this.fit();
    this.raf = requestAnimationFrame(this.frame);
  }

  private addLights(): void {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#cfd8ff', '#2b2420', 0.55));
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(1.6, 3.6, -2.0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, {
      left: -1.8,
      right: 1.8,
      top: 1.8,
      bottom: -1.8,
      near: 0.5,
      far: 9,
    });
    s.add(key);
    // a warm back light and a cool fill, as off a stage wash
    const warm = new THREE.SpotLight('#ffb47a', 14, 0, 0.7, 0.9);
    warm.position.set(-1.8, 2.8, 1.8);
    s.add(warm, warm.target);
    const cool = new THREE.SpotLight('#7aa8ff', 6, 0, 0.8, 1);
    cool.position.set(2.2, 2.4, 1.2);
    s.add(cool, cool.target);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshStandardMaterial({ color: '#1b1d22', roughness: 0.92 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);
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

  private cancelFlight = (): void => {
    this.flight = null;
  };

  /** Hear a scheduled step. */
  ingest = (step: ScheduledStep): void => {
    this.timeline.ingest(step);
  };

  setPlaying(playing: boolean): void {
    if (this.playing && !playing) this.timeline.reset();
    this.playing = playing;
  }

  /** A left-handed kit is the right-handed one in a mirror, drummer and all. */
  setLefty(lefty: boolean): void {
    if (lefty === this.lefty) return;
    this.lefty = lefty;
    this.rig.scale.x = lefty ? -1 : 1;
    this.flyTo(this.view);
  }

  /** How each hand holds its stick, from the next frame. */
  setGrips(grips: Grips): void {
    this.grips = grips;
  }

  get persona(): Persona {
    return this.who;
  }

  /**
   * Seat someone else at the kit, mid-groove if need be, and repaint it in
   * their colours: the kit, the timeline and the camera carry on.
   */
  setPersona(who: Persona): void {
    if (who === this.who) return;
    this.who = who;
    this.rig.remove(this.drummer.root);
    disposeTree(this.drummer.root);
    disposeMaterials(this.dress);
    this.dress = makeMaterials(who);
    this.drummer = buildDrummer(this.dress, who);
    this.rig.add(this.drummer.root);
    // the same kit, repainted in theirs
    styleKit(this.kitMaterials, who);
  }

  flyTo(view: CameraView): void {
    this.view = view;
    const shot = cameraFor(view, this.lefty);
    this.flight = {
      from: this.camera.position.clone(),
      to: new THREE.Vector3(...shot.position),
      aimFrom: this.controls.target.clone(),
      aimTo: new THREE.Vector3(...shot.target),
      t: 0,
    };
  }

  private frame = (ms: number): void => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = this.last ? Math.min((ms - this.last) / 1000, 0.1) : 0;
    this.last = ms;
    this.groove += ((this.playing ? 1 : 0) - this.groove) * Math.min(1, dt * 2.5);
    const now = this.playing ? this.clock.now() - this.clock.latency() : ms / 1000;
    const pose = poseAt(this.timeline, now, this.groove, this.grips);
    this.kit.update(pose, this.timeline.percussion);
    this.drummer.update(pose, this.camera.position, dt);

    const f = this.flight;
    if (f) {
      f.t = Math.min(1, f.t + dt / 0.9);
      const e = f.t * f.t * (3 - 2 * f.t);
      this.camera.position.lerpVectors(f.from, f.to, e);
      this.controls.target.lerpVectors(f.aimFrom, f.aimTo, e);
      if (f.t >= 1) this.flight = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.resize?.disconnect();
    this.controls.removeEventListener('start', this.cancelFlight);
    this.controls.dispose();
    disposeTree(this.scene);
    disposeMaterials(this.kitMaterials);
    disposeMaterials(this.dress);
    this.env.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
