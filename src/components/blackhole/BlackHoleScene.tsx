"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type BlackHoleStage =
  | "pre-intro"
  | "intro"
  | "entering"
  | "expanding"
  | "greeting"
  | "home";

type BlackHoleSceneProps = {
  stage: BlackHoleStage;
  onEntered: () => void;
};

// ─── timing ──────────────────────────────────────────────────────────────────
const ENTER_SECONDS = 11;    // longer = smoother suck-in transition
const ENTER_TRIGGER = 0.82;  // when onEntered fires (just before void snap)

// Pointer → particle coupling (user asked ~5× more responsive)
const INTERACTION_GAIN = 5;

// ─── easing ──────────────────────────────────────────────────────────────────
function easeInCubic(t: number) { return t * t * t; }
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeInOutQuint(t: number) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}
function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4); }

// ─── disk points shader (per-particle size: tiny at spiral edges) ───────────
const DISK_POINT_VERT = `
attribute float size;
attribute vec3 color;
varying vec3 vColor;
uniform float uPointScale;
void main() {
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float d = -mvPosition.z;
  float s = size * uPointScale * (420.0 / max(d, 0.75));
  gl_PointSize = clamp(s, 1.0, 128.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;
const DISK_POINT_FRAG = `
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  float edge = smoothstep(1.0, 0.25, r2);
  gl_FragColor = vec4(vColor, 0.86 * edge);
}
`;

// ─── nebula canvas ───────────────────────────────────────────────────────────
function makeNebulaTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 360);
  g.addColorStop(0,    "rgba(40, 20, 80, 0.35)");
  g.addColorStop(0.35, "rgba(8, 12, 40, 0.20)");
  g.addColorStop(0.65, "rgba(2,  4, 12, 0.12)");
  g.addColorStop(1,    "rgba(0,  0,  0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── radial‑blur / speed‑streak overlay (CSS canvas, 2‑D) ───────────────────
function makeSpeedCanvas() {
  const cvs = document.createElement("canvas");
  cvs.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;";
  return cvs;
}

function drawSpeedOverlay(
  cvs: HTMLCanvasElement,
  intensity: number,   // 0→1
  voidPull: number,    // 0→1 (near‑end black crush)
) {
  const W = cvs.width; const H = cvs.height;
  const ctx = cvs.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  if (intensity <= 0 && voidPull <= 0) return;

  const cx = W / 2; const cy = H / 2;
  const maxR = Math.max(1, Math.hypot(cx, cy));

  // ── radial streak lines (optimized: no gradients, no per-frame Math.random) ──
  const streakMax = 160;
  const streaks = Math.max(1, Math.round(intensity * streakMax));
  const r0 = intensity * 30;
  const r1 = 0.72 * maxR;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgb(254,128,25)";

  for (let i = 0; i < streaks; i++) {
    const angle = (i / streaks) * Math.PI * 2;
    const x0 = cx + Math.cos(angle) * r0;
    const y0 = cy + Math.sin(angle) * r0;
    const x1 = cx + Math.cos(angle) * r1;
    const y1 = cy + Math.sin(angle) * r1;

    // deterministic variation so we still look “alive” without allocations
    const u = (i * 0.61803398875) % 1; // pseudo-random in [0,1)
    const alpha = intensity * (0.06 + u * 0.10) * (0.35 + voidPull * 0.65);
    const lw = 0.7 + u * 1.2;

    ctx.globalAlpha = alpha;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();

  // ── single speed ring (cheap) ───────────────────────────────────────────────
  if (intensity > 0.22) {
    const ca = (intensity - 0.22) / 0.78;
    const rr = (maxR * 0.22 + 20) * ca + maxR * 0.02;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = ca * 0.15 * (0.4 + voidPull * 0.6);
    ctx.strokeStyle = "rgba(80,200,255,1)";
    ctx.lineWidth = 1.2 + ca * 2.0;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── centre bright hot-spot (approaching singularity) ─────────────────────
  if (intensity > 0.4) {
    const hot = (intensity - 0.4) / 0.6;
    const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160 * hot);
    hg.addColorStop(0, `rgba(255,255,240,${hot * 0.55})`);
    hg.addColorStop(0.3, `rgba(254,200,80,${hot * 0.25})`);
    hg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(cx, cy, 160 * hot, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── void black crush (final pull into darkness) ───────────────────────────
  if (voidPull > 0) {
    const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cx, cy) * 1.5);
    vg.addColorStop(0,   `rgba(0,0,0,0)`);
    vg.addColorStop(0.3, `rgba(0,0,0,${voidPull * 0.5})`);
    vg.addColorStop(1,   `rgba(0,0,0,${voidPull})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}

// ─── CSS blur helper ──────────────────────────────────────────────────────────
function setRendererBlur(el: HTMLCanvasElement, px: number) {
  // Avoid spamming style changes every frame (reduces GPU churn/lag)
  const anyEl = el as any;
  const last = typeof anyEl._lastBlurPx === "number" ? (anyEl._lastBlurPx as number) : -1;
  if (Math.abs(last - px) < 0.15) return;
  anyEl._lastBlurPx = px;
  el.style.filter = px > 0.25 ? `blur(${px}px)` : "";
}

export function BlackHoleScene({ stage, onEntered }: BlackHoleSceneProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const stageRef      = useRef(stage);
  const onEnteredRef  = useRef(onEntered);

  useEffect(() => { stageRef.current = stage; },      [stage]);
  useEffect(() => { onEnteredRef.current = onEntered; }, [onEntered]);

  useEffect(() => {
    if (!containerRef.current) return;

    // ── renderer ────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020208);
    scene.fog = new THREE.FogExp2(0x030510, 0.028);

    const camera = new THREE.PerspectiveCamera(
      55, window.innerWidth / Math.max(window.innerHeight, 1), 0.1, 500,
    );
    camera.position.set(0, 3, 15);

    const renderer = new THREE.WebGLRenderer({
      alpha: true, antialias: false, powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // cap pixel ratio for buttery smooth motion
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    containerRef.current.appendChild(renderer.domElement);

    // ── 2‑D speed overlay canvas ────────────────────────────────────────────
    const speedCvs = makeSpeedCanvas();
    containerRef.current.appendChild(speedCvs);
    const sizeOverlay = () => {
      speedCvs.width  = window.innerWidth;
      speedCvs.height = window.innerHeight;
    };
    sizeOverlay();

    // ── scene objects ────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.08));

    const horizon = new THREE.Mesh(
      new THREE.SphereGeometry(2.45, 72, 72),
      new THREE.MeshBasicMaterial({ color: 0x000000 }),
    );
    scene.add(horizon);

    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#fe8019"),
      transparent: true, opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.52, 2.78, 96), ringMat);
    ring.rotation.x = Math.PI / 2 + 0.18;
    scene.add(ring);

    const palette = [
      new THREE.Color("#d65d0e"), new THREE.Color("#fe8019"),
      new THREE.Color("#fb4934"), new THREE.Color("#fabd2f"),
      new THREE.Color("#b16286"),
    ];

    // accretion disk — 5× prior density; outer spiral particles are much smaller
    const diskCount = 460_000;
    const R_DISK_MIN = 2.65;
    const R_DISK_MAX = 12.15;
    const dPos = new Float32Array(diskCount * 3);
    const dCol = new Float32Array(diskCount * 3);
    const dSeed = new Float32Array(diskCount);
    const dRespawnR = new Float32Array(diskCount);
    const dRespawnA = new Float32Array(diskCount);
    const dSize = new Float32Array(diskCount);
    for (let i = 0; i < diskCount; i++) {
      // bias samples toward outer radii so the spiral edge feels “filled”
      const u = Math.pow(Math.random(), 0.52);
      const r = R_DISK_MIN + u * (R_DISK_MAX - R_DISK_MIN);
      const a = Math.random() * Math.PI * 2;
      dPos[i*3]   = Math.cos(a) * r;
      dPos[i*3+1] = (Math.random() - 0.5) * 0.28 * (1 / Math.max(r, 0.6));
      dPos[i*3+2] = Math.sin(a) * r;
      const c = palette[Math.floor(Math.random() * palette.length)];
      dCol[i*3]=c.r; dCol[i*3+1]=c.g; dCol[i*3+2]=c.b;
      dSeed[i] = Math.random() * Math.PI * 2;
      dRespawnR[i] = 9 + Math.random() * 7;
      dRespawnA[i] = Math.random() * Math.PI * 2;
      const edge = (r - R_DISK_MIN) / (R_DISK_MAX - R_DISK_MIN);
      // inner bright specks → outer dust (much tinier)
      dSize[i] = THREE.MathUtils.lerp(0.026, 0.0028, Math.pow(edge, 0.95));
    }
    const diskGeo = new THREE.BufferGeometry();
    diskGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    diskGeo.setAttribute("color",    new THREE.BufferAttribute(dCol, 3));
    diskGeo.setAttribute("size",     new THREE.BufferAttribute(dSize, 1));
    const diskMat = new THREE.ShaderMaterial({
      uniforms: { uPointScale: { value: 1.05 } },
      vertexShader: DISK_POINT_VERT,
      fragmentShader: DISK_POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const disk = new THREE.Points(diskGeo, diskMat);
    scene.add(disk);

    // inner mist — 5× prior count, slightly smaller points
    const mistCount = 130_000;
    const mPos = new Float32Array(mistCount * 3);
    const mCol = new Float32Array(mistCount * 3);
    const mRespawnR = new Float32Array(mistCount);
    const mRespawnA = new Float32Array(mistCount);
    for (let i = 0; i < mistCount; i++) {
      const r = 2.55 + Math.random() * 3.2;
      const a = Math.random() * Math.PI * 2;
      mPos[i*3]=Math.cos(a)*r; mPos[i*3+1]=(Math.random()-0.5)*0.12; mPos[i*3+2]=Math.sin(a)*r;
      const c = palette[Math.floor(Math.random()*palette.length)];
      mCol[i*3]=c.r*1.1; mCol[i*3+1]=c.g*1.1; mCol[i*3+2]=c.b*1.1;
      mRespawnR[i] = 4.5 + Math.random() * 2;
      mRespawnA[i] = Math.random() * Math.PI * 2;
    }
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute("position", new THREE.BufferAttribute(mPos, 3));
    mistGeo.setAttribute("color",    new THREE.BufferAttribute(mCol, 3));
    const mistMat = new THREE.PointsMaterial({
      size: 0.012, vertexColors: true, transparent: true, opacity: 0.52,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    const mist = new THREE.Points(mistGeo, mistMat);
    scene.add(mist);

    // stars
    const starsTotal = 26_000;
    const sPos = new Float32Array(starsTotal * 3);
    const sCol = new Float32Array(starsTotal * 3);
    for (let i = 0; i < starsTotal; i++) {
      const r = 45 + Math.pow(Math.random(), 0.55) * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      sPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      sPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      sPos[i*3+2] = r * Math.cos(phi);
      const warm = Math.random() > 0.55;
      const c = warm
        ? new THREE.Color().setHSL(0.08 + Math.random()*0.04, 0.35, 0.55 + Math.random()*0.25)
        : new THREE.Color().setHSL(0.58 + Math.random()*0.12, 0.25, 0.45 + Math.random()*0.35);
      sCol[i*3]=c.r; sCol[i*3+1]=c.g; sCol[i*3+2]=c.b;
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    starsGeo.setAttribute("color",    new THREE.BufferAttribute(sCol, 3));
    const starsMat = new THREE.PointsMaterial({
      size: 0.055, vertexColors: true, transparent: true, opacity: 0.92,
      sizeAttenuation: true, depthWrite: false,
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // nebula sky
    const nebulaTex = makeNebulaTexture();
    let nebula: THREE.Mesh | null = null;
    if (nebulaTex) {
      nebula = new THREE.Mesh(
        new THREE.SphereGeometry(180, 32, 32),
        new THREE.MeshBasicMaterial({
          map: nebulaTex, side: THREE.BackSide,
          transparent: true, opacity: 0.55,
          depthWrite: false, blending: THREE.AdditiveBlending,
        }),
      );
      scene.add(nebula);
    }

    // ── animation state ──────────────────────────────────────────────────────
    const timer = new THREE.Timer();
    if (typeof document !== "undefined") timer.connect(document);

    let rafId = 0;
    let hasEntered = false;
    let enterAccum = 0;

    // Interaction / shaking state
    let prevStage = stageRef.current;
    let enteringKick = 0; // 0→1 right after cross event horizon
    let touchNx = 0;      // -1→1 (last pointer — mouse hover or touch)
    let touchNy = 0;
    let touchStrength = 0; // press / drag strength
    let mouseHover = 0;    // mouse “pointing” near centre (no click)
    let pointerActive = false;
    let pointerId: number | null = null;

    const animate = (timestamp: number) => {
      rafId = requestAnimationFrame(animate);
      timer.update(timestamp);

      const s = stageRef.current;
      if (s !== prevStage) {
        if (s === "entering") enteringKick = 1;
        prevStage = s;
      }
      if (s === "pre-intro" || s === "home") return;
      if (s !== "intro" && s !== "entering") return;

      const delta   = timer.getDelta();
      const elapsed = timer.getElapsed();
      // smooth decay so motion stays flowy
      touchStrength = Math.max(0, touchStrength - delta * 1.9);
      mouseHover    = Math.max(0, mouseHover - delta * 1.35);

      // ── passive orbit (intro) ──────────────────────────────────────────────
      stars.rotation.y -= delta * 0.012;
      stars.rotation.x -= delta * 0.004;

      // ── disk / mist physics ────────────────────────────────────────────────
      const posAttr  = diskGeo.attributes.position as THREE.BufferAttribute;
      const mistAttr = mistGeo.attributes.position as THREE.BufferAttribute;

      // sucking speed multiplier (ramps up sharply at the end)
      let suckMult = 1;
      if (s === "entering") {
        const t = Math.min(1, enterAccum / ENTER_SECONDS);
        suckMult = 1 + easeInCubic(t) * 18; // 1× → 19× pull rate
      }

      // combined pointer influence: hover (mouse) + press/drag — scaled by INTERACTION_GAIN
      const influence = Math.max(mouseHover, touchStrength);

      for (let i = 0; i < diskCount; i++) {
        let x = posAttr.array[i*3], z = posAttr.array[i*3+2];
        let r = Math.sqrt(x*x + z*z);
        let angle = Math.atan2(z, x);
        const omega = (0.52 + 1.35 / Math.max(r, 0.45)) * (s === "entering" ? suckMult * 0.68 : 1);
        angle += delta * omega;
        r -= delta * (0.22 + r * 0.018) * suckMult;
        if (r < 2.58) {
          r = dRespawnR[i];
          angle = dRespawnA[i] + dSeed[i] * 0.08;
        }
        let cosA = Math.cos(angle);
        let sinA = Math.sin(angle);

        if (influence > 0.0001) {
          const align = Math.max(0, touchNx * cosA + touchNy * sinA);
          const tf = influence * align * INTERACTION_GAIN;
          angle += delta * tf * 0.88; // tangential flow (gain applied via INTERACTION_GAIN)
          r     -= delta * tf * (s === "entering" ? 0.072 : 0.048);
          // `angle` changed above; recompute for correct final position
          cosA = Math.cos(angle);
          sinA = Math.sin(angle);
        }
        const wave =
          Math.sin(angle*5 + elapsed*1.8 + dSeed[i]) *
          0.18 *
          (1 / Math.max(r, 1)) *
          (1 + influence * 0.22);
        const y = wave + Math.cos(angle*3 + elapsed*1.2 + dSeed[i]*2) * 0.08;
        posAttr.array[i*3]   = cosA * r;
        posAttr.array[i*3+1] = y;
        posAttr.array[i*3+2] = sinA * r;
      }
      posAttr.needsUpdate = true;

      for (let i = 0; i < mistCount; i++) {
        let x = mistAttr.array[i*3], z = mistAttr.array[i*3+2];
        let r = Math.sqrt(x*x + z*z);
        let angle = Math.atan2(z, x);
        angle += delta * (0.86 + 2.1 / Math.max(r, 0.35)) * (s === "entering" ? suckMult * 0.78 : 1);
        r -= delta * (0.35 + r * 0.04) * suckMult;
        if (r < 2.52) {
          r = mRespawnR[i];
          angle = mRespawnA[i];
        }
        let cosA = Math.cos(angle);
        let sinA = Math.sin(angle);

        if (influence > 0.0001) {
          const align = Math.max(0, touchNx * cosA + touchNy * sinA);
          const tf = influence * align * INTERACTION_GAIN;
          angle += delta * tf * 0.72;
          r     -= delta * tf * (s === "entering" ? 0.060 : 0.042);
          // `angle` changed above; recompute for correct final position
          cosA = Math.cos(angle);
          sinA = Math.sin(angle);
        }
        const y = Math.sin(angle*8 + elapsed*2.5 + i*0.01) * 0.06 * (1 / Math.max(r, 1));
        mistAttr.array[i*3]   = cosA * r;
        mistAttr.array[i*3+1] = y;
        mistAttr.array[i*3+2] = sinA * r;
      }
      mistAttr.needsUpdate = true;

      disk.rotation.y  += delta * 0.31;
      disk.rotation.z  += delta * 0.065;
      mist.rotation.y  -= delta * 0.48;
      mist.rotation.z  += delta * 0.10;
      ring.rotation.z  -= delta * 0.68;
      if (nebula) nebula.rotation.y += delta * 0.003;

      // ── camera / effects for entering ─────────────────────────────────────
      if (s === "entering") {
        enterAccum += delta;
        const t  = Math.min(1, enterAccum / ENTER_SECONDS);
        const e  = easeInOutQuint(t);
        const kickT = Math.max(0, 1 - t / 0.88);
        const kick  = enteringKick * kickT;

        // ── camera pull: smoother spiral + softer late snap ─────────────────
        const phase2 = Math.max(0, (t - 0.52) / 0.48);
        const snapE  = easeInOutCubic(phase2);

        const tz = easeInOutQuint(t);
        camera.position.z = THREE.MathUtils.lerp(15, 0.18, easeOutQuart(tz));
        camera.position.x =
          Math.sin(t * Math.PI * 3.1) * 1.25 * (1 - snapE * 0.85) * (1 - easeOutQuart(t) * 0.55);
        camera.position.y =
          THREE.MathUtils.lerp(3, 0.05, e) +
          Math.cos(t * Math.PI * 3.6) * 0.42 * (1 - snapE);

        // ── subtle camera shake (always gentle) ─────────────────────────────
        const interact = Math.max(mouseHover, touchStrength);
        const shakeBase =
          kick * 0.038 +
          interact * 0.032;
        if (shakeBase > 0.00005) {
          const sx = Math.sin(elapsed * 7.1);
          const sy = Math.cos(elapsed * 8.4);
          camera.position.x += (sx * 0.11 + touchNx * 0.09) * shakeBase;
          camera.position.y += (sy * 0.10 + touchNy * 0.08) * shakeBase;
        }

        // ── FOV warp (fish-eye suck effect) ────────────────────────────────
        camera.fov = 55 + easeInOutCubic(t) * 42; // smoother than cubic-in only
        camera.updateProjectionMatrix();

        camera.lookAt(0, 0, 0);

        // ── radial blur / speed overlay ─────────────────────────────────────
        // Make the “rush” peak earlier so the void snap is visible before
        // `onEntered` fires and the canvas fades out.
        const blurRamp = Math.max(0, Math.min(1, (t - 0.06) / 0.62));

        // void pull: align with longer ENTER_SECONDS
        const voidPull = Math.max(0, Math.min(1, (t - 0.68) / Math.max(1e-6, ENTER_TRIGGER - 0.68)));

        const intensity = easeInOutCubic(blurRamp) * (0.62 + 0.48 * voidPull);

        drawSpeedOverlay(speedCvs, intensity, Math.pow(voidPull, 1.15));

        // CSS blur — capped so transitions stay smooth (heavy blur = jank)
        const cssBlur = Math.min(7.2, intensity * 6.2 * (0.38 + 0.62 * voidPull));
        setRendererBlur(renderer.domElement, cssBlur);

        renderer.toneMappingExposure = 1.05 + intensity * 1.55 + voidPull * 0.55;

        if (t >= ENTER_TRIGGER && !hasEntered) {
          hasEntered = true;
          onEnteredRef.current();
        }
      } else {
        // ── passive orbit (intro phase) ────────────────────────────────────
        enterAccum = 0; hasEntered = false;
        camera.position.x = Math.sin(elapsed * 0.45) * 3.1;
        camera.position.y = 2 + Math.cos(elapsed * 0.28) * 1.4;
        camera.position.z = 15;
        camera.fov = 55;
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, 0);
        renderer.toneMappingExposure = 1.05;
        drawSpeedOverlay(speedCvs, 0, 0);
        setRendererBlur(renderer.domElement, 0);
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    const handleResize = () => {
      camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      sizeOverlay();
    };
    window.addEventListener("resize", handleResize);

    const setPointerFromClient = (e: PointerEvent) => {
      const nx = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      const ny = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
      const near = Math.max(0, 1 - Math.hypot(nx, ny) / 0.85);
      touchNx = nx;
      touchNy = ny;
      // mouse “pointing” — no click required
      if (e.pointerType === "mouse") {
        mouseHover = Math.max(mouseHover, near * 0.58);
      }
      if (pointerActive && (pointerId === null || e.pointerId === pointerId)) {
        touchStrength = Math.max(touchStrength, near * 1.18);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (stageRef.current !== "intro" && stageRef.current !== "entering") return;
      pointerActive = true;
      pointerId = e.pointerId;
      setPointerFromClient(e);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (stageRef.current !== "intro" && stageRef.current !== "entering") return;
      setPointerFromClient(e);
    };

    const onPointerUpOrCancel = (e: PointerEvent) => {
      if (pointerId !== null && e.pointerId !== pointerId) return;
      pointerActive = false;
      pointerId = null;
    };

    renderer.domElement.style.touchAction = "none";
    containerRef.current.addEventListener("pointerdown", onPointerDown, { passive: true });
    containerRef.current.addEventListener("pointermove", onPointerMove, { passive: true });
    containerRef.current.addEventListener("pointerup", onPointerUpOrCancel, { passive: true });
    containerRef.current.addEventListener("pointercancel", onPointerUpOrCancel, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      containerRef.current?.removeEventListener("pointerdown", onPointerDown);
      containerRef.current?.removeEventListener("pointermove", onPointerMove);
      containerRef.current?.removeEventListener("pointerup", onPointerUpOrCancel);
      containerRef.current?.removeEventListener("pointercancel", onPointerUpOrCancel);
      cancelAnimationFrame(rafId);
      timer.dispose();
      if (nebulaTex) nebulaTex.dispose();
      // dispose geometries / materials
      [diskGeo, mistGeo, starsGeo].forEach(g => g.dispose());
      [diskMat, mistMat, starsMat, ringMat].forEach(m => m.dispose());
      horizon.geometry.dispose(); (horizon.material as THREE.Material).dispose();
      ring.geometry.dispose();
      if (nebula) { nebula.geometry.dispose(); (nebula.material as THREE.Material).dispose(); }
      renderer.dispose();
      renderer.domElement.remove();
      speedCvs.remove();
    };
  }, []);

  return (
    // pointer events are enabled for touch-driven particle pushing/shaking
    // (no cursor-pointer styling; keep normal cursor)
    <div ref={containerRef} className="relative h-full w-full cursor-default" />
  );
}
