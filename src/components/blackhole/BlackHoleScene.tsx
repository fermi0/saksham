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
const ENTER_SECONDS = 7.5;   // total flight duration
const ENTER_TRIGGER = 0.84;  // when onEntered fires (just before void snap)

// ─── easing ──────────────────────────────────────────────────────────────────
function easeInCubic(t: number) { return t * t * t; }
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4); }

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

  // ── radial streak lines ──────────────────────────────────────────────────
  const streaks = Math.floor(intensity * 220);
  for (let i = 0; i < streaks; i++) {
    const angle = (i / streaks) * Math.PI * 2;
    const r0 = intensity * 40;
    const r1 = 0.72 * Math.sqrt(cx * cx + cy * cy);
    const x0 = cx + Math.cos(angle) * r0;
    const y0 = cy + Math.sin(angle) * r0;
    const x1 = cx + Math.cos(angle) * r1;
    const y1 = cy + Math.sin(angle) * r1;

    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    // warm amber → orange streak
    const alpha = intensity * (0.12 + Math.random() * 0.08);
    g.addColorStop(0,   `rgba(254,128,25,${alpha})`);
    g.addColorStop(0.5, `rgba(214,93,14,${alpha * 0.6})`);
    g.addColorStop(1,   `rgba(0,0,0,0)`);

    ctx.strokeStyle = g;
    ctx.lineWidth = 0.8 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // ── chromatic aberration rings ────────────────────────────────────────────
  if (intensity > 0.25) {
    const ca = (intensity - 0.25) / 0.75;
    const numRings = 3;
    for (let r = 0; r < numRings; r++) {
      const rr = (80 + r * 55) * ca;
      const gring = ctx.createRadialGradient(cx, cy, rr * 0.85, cx, cy, rr * 1.1);
      gring.addColorStop(0, `rgba(251,72,196,0)`);
      gring.addColorStop(0.45, `rgba(251,72,196,${ca * 0.06})`);
      gring.addColorStop(0.55, `rgba(80,200,255,${ca * 0.06})`);
      gring.addColorStop(1, `rgba(80,200,255,0)`);
      ctx.fillStyle = gring;
      ctx.beginPath();
      ctx.arc(cx, cy, rr * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
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
  el.style.filter = px > 0.2 ? `blur(${px.toFixed(2)}px)` : "";
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
      alpha: true, antialias: true, powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    // accretion disk
    const diskCount = 72_000;
    const dPos = new Float32Array(diskCount * 3);
    const dCol = new Float32Array(diskCount * 3);
    const dSeed = new Float32Array(diskCount);
    for (let i = 0; i < diskCount; i++) {
      const r = 2.65 + Math.random() * 9.5;
      const a = Math.random() * Math.PI * 2;
      dPos[i*3]   = Math.cos(a) * r;
      dPos[i*3+1] = (Math.random() - 0.5) * 0.35 * (1 / Math.max(r, 0.6));
      dPos[i*3+2] = Math.sin(a) * r;
      const c = palette[Math.floor(Math.random() * palette.length)];
      dCol[i*3]=c.r; dCol[i*3+1]=c.g; dCol[i*3+2]=c.b;
      dSeed[i] = Math.random() * Math.PI * 2;
    }
    const diskGeo = new THREE.BufferGeometry();
    diskGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    diskGeo.setAttribute("color",    new THREE.BufferAttribute(dCol, 3));
    const diskMat = new THREE.PointsMaterial({
      size: 0.028, vertexColors: true, transparent: true, opacity: 0.85,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    const disk = new THREE.Points(diskGeo, diskMat);
    scene.add(disk);

    // inner mist
    const mistCount = 18_000;
    const mPos = new Float32Array(mistCount * 3);
    const mCol = new Float32Array(mistCount * 3);
    for (let i = 0; i < mistCount; i++) {
      const r = 2.55 + Math.random() * 3.2;
      const a = Math.random() * Math.PI * 2;
      mPos[i*3]=Math.cos(a)*r; mPos[i*3+1]=(Math.random()-0.5)*0.12; mPos[i*3+2]=Math.sin(a)*r;
      const c = palette[Math.floor(Math.random()*palette.length)];
      mCol[i*3]=c.r*1.1; mCol[i*3+1]=c.g*1.1; mCol[i*3+2]=c.b*1.1;
    }
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute("position", new THREE.BufferAttribute(mPos, 3));
    mistGeo.setAttribute("color",    new THREE.BufferAttribute(mCol, 3));
    const mistMat = new THREE.PointsMaterial({
      size: 0.018, vertexColors: true, transparent: true, opacity: 0.55,
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

    // shake offset
    let shakeX = 0, shakeY = 0;

    const animate = (timestamp: number) => {
      rafId = requestAnimationFrame(animate);
      timer.update(timestamp);

      const s = stageRef.current;
      if (s === "pre-intro" || s === "home") return;
      if (s !== "intro" && s !== "entering") return;

      const delta   = timer.getDelta();
      const elapsed = timer.getElapsed();

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

      for (let i = 0; i < diskCount; i++) {
        let x = posAttr.array[i*3], z = posAttr.array[i*3+2];
        let r = Math.hypot(x, z);
        let angle = Math.atan2(z, x);
        const omega = (0.55 + 1.4 / Math.max(r, 0.45)) * (s === "entering" ? suckMult * 0.7 : 1);
        angle += delta * omega;
        r -= delta * (0.22 + r * 0.018) * suckMult;
        if (r < 2.58) {
          r = 9 + Math.random() * 7;
          angle = Math.random() * Math.PI * 2;
        }
        const wave =
          Math.sin(angle*5 + elapsed*1.8 + dSeed[i]) * 0.18 * (1 / Math.max(r, 1));
        const y = wave + Math.cos(angle*3 + elapsed*1.2 + dSeed[i]*2) * 0.08;
        posAttr.array[i*3]   = Math.cos(angle) * r;
        posAttr.array[i*3+1] = y;
        posAttr.array[i*3+2] = Math.sin(angle) * r;
      }
      posAttr.needsUpdate = true;

      for (let i = 0; i < mistCount; i++) {
        let x = mistAttr.array[i*3], z = mistAttr.array[i*3+2];
        let r = Math.hypot(x, z);
        let angle = Math.atan2(z, x);
        angle += delta * (0.9 + 2.2 / Math.max(r, 0.35)) * (s === "entering" ? suckMult * 0.8 : 1);
        r -= delta * (0.35 + r * 0.04) * suckMult;
        if (r < 2.52) { r = 4.5 + Math.random() * 2; angle = Math.random() * Math.PI * 2; }
        const y = Math.sin(angle*8 + elapsed*2.5 + i*0.01) * 0.06 * (1 / Math.max(r, 1));
        mistAttr.array[i*3]   = Math.cos(angle) * r;
        mistAttr.array[i*3+1] = y;
        mistAttr.array[i*3+2] = Math.sin(angle) * r;
      }
      mistAttr.needsUpdate = true;

      disk.rotation.y  += delta * 0.35;
      disk.rotation.z  += delta * 0.08;
      mist.rotation.y  -= delta * 0.55;
      mist.rotation.z  += delta * 0.12;
      ring.rotation.z  -= delta * 0.75;
      if (nebula) nebula.rotation.y += delta * 0.003;

      // ── camera / effects for entering ─────────────────────────────────────
      if (s === "entering") {
        enterAccum += delta;
        const t  = Math.min(1, enterAccum / ENTER_SECONDS);
        const e  = easeInOutCubic(t);

        // ── camera pull: smooth spiral into singularity ────────────────────
        // phase 1 (0→0.6): graceful approach spiral
        // phase 2 (0.6→1): violent snap-in
        const phase2 = Math.max(0, (t - 0.6) / 0.4);
        const snapE  = easeInCubic(phase2);

        camera.position.z = THREE.MathUtils.lerp(15, 0.18, easeOutQuart(t));
        camera.position.x =
          Math.sin(t * Math.PI * 3.5) * 1.4 * (1 - snapE) * (1 - easeOutQuart(t) * 0.6);
        camera.position.y =
          THREE.MathUtils.lerp(3, 0.05, e) +
          Math.cos(t * Math.PI * 4)   * 0.5  * (1 - snapE);

        // ── camera shake ────────────────────────────────────────────────────
        if (t > 0.35) {
          const shakeAmt = easeInCubic((t - 0.35) / 0.65) * 0.22;
          shakeX = (Math.random() - 0.5) * shakeAmt;
          shakeY = (Math.random() - 0.5) * shakeAmt;
          camera.position.x += shakeX;
          camera.position.y += shakeY;
        }

        // ── FOV warp (fish-eye suck effect) ────────────────────────────────
        camera.fov = 55 + easeInCubic(t) * 45; // 55° → 100° as you get sucked
        camera.updateProjectionMatrix();

        camera.lookAt(0, 0, 0);

        // ── radial blur / speed overlay ─────────────────────────────────────
        // Make the “rush” peak earlier so the void snap is visible before
        // `onEntered` fires and the canvas fades out.
        const blurRamp = Math.max(0, Math.min(1, (t - 0.10) / 0.55));

        // void pull: 0 at t≈0.70 → 1 by the ENTER_TRIGGER (t≈0.84)
        const voidPull = Math.max(0, Math.min(1, (t - 0.70) / 0.14));

        // intensity: fast ramp, then keep adding energy as the void engages
        const intensity = easeInCubic(blurRamp) * (0.75 + 0.55 * voidPull);

        drawSpeedOverlay(speedCvs, intensity, Math.pow(voidPull, 1.25));

        // CSS motion blur on the 3-D canvas itself
        const cssBlur = intensity * 10 * (0.35 + 0.65 * voidPull);
        setRendererBlur(renderer.domElement, cssBlur);

        // tone mapping exposure pulse
        renderer.toneMappingExposure = 1.05 + intensity * 1.9 + voidPull * 0.7;

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

    return () => {
      window.removeEventListener("resize", handleResize);
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
    <div ref={containerRef} className="pointer-events-none relative h-full w-full" />
  );
}
