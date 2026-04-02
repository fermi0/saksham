"use client";

/* Black hole intro inspired by a prior Figma/shadcn layout; scene code rewritten for this app. */

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

const ENTER_SECONDS = 7.5;
const ENTER_TRIGGER = 0.82;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function makeNebulaTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 360);
  g.addColorStop(0, "rgba(40, 20, 80, 0.35)");
  g.addColorStop(0.35, "rgba(8, 12, 40, 0.2)");
  g.addColorStop(0.65, "rgba(2, 4, 12, 0.12)");
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function BlackHoleScene({ stage, onEntered }: BlackHoleSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef(stage);
  const onEnteredRef = useRef(onEntered);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    onEnteredRef.current = onEntered;
  }, [onEntered]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020208);
    scene.fog = new THREE.FogExp2(0x030510, 0.028);

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / Math.max(window.innerHeight, 1),
      0.1,
      500,
    );
    camera.position.set(0, 3, 15);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    containerRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.08);
    scene.add(ambientLight);

    const horizonGeo = new THREE.SphereGeometry(2.45, 72, 72);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const horizon = new THREE.Mesh(horizonGeo, horizonMat);
    scene.add(horizon);

    const ringGeo = new THREE.RingGeometry(2.52, 2.78, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#fe8019"),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2 + 0.18;
    scene.add(ring);

    const palette = [
      new THREE.Color("#d65d0e"),
      new THREE.Color("#fe8019"),
      new THREE.Color("#fb4934"),
      new THREE.Color("#fabd2f"),
      new THREE.Color("#b16286"),
    ];

    const diskCount = 72_000;
    const pos = new Float32Array(diskCount * 3);
    const col = new Float32Array(diskCount * 3);
    const seed = new Float32Array(diskCount);

    for (let i = 0; i < diskCount; i++) {
      const r = 2.65 + Math.random() * 9.5;
      const angle = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] =
        (Math.random() - 0.5) * 0.35 * (1 / Math.max(r, 0.6));
      pos[i * 3 + 2] = Math.sin(angle) * r;
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      seed[i] = Math.random() * Math.PI * 2;
    }

    const diskGeo = new THREE.BufferGeometry();
    diskGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    diskGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));

    const diskMat = new THREE.PointsMaterial({
      size: 0.028,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const disk = new THREE.Points(diskGeo, diskMat);
    scene.add(disk);

    const mistCount = 18_000;
    const mistPos = new Float32Array(mistCount * 3);
    const mistCol = new Float32Array(mistCount * 3);
    for (let i = 0; i < mistCount; i++) {
      const r = 2.55 + Math.random() * 3.2;
      const angle = Math.random() * Math.PI * 2;
      mistPos[i * 3] = Math.cos(angle) * r;
      mistPos[i * 3 + 1] = (Math.random() - 0.5) * 0.12;
      mistPos[i * 3 + 2] = Math.sin(angle) * r;
      const c = palette[Math.floor(Math.random() * palette.length)];
      mistCol[i * 3] = c.r * 1.1;
      mistCol[i * 3 + 1] = c.g * 1.1;
      mistCol[i * 3 + 2] = c.b * 1.1;
    }
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute("position", new THREE.BufferAttribute(mistPos, 3));
    mistGeo.setAttribute("color", new THREE.BufferAttribute(mistCol, 3));
    const mistMat = new THREE.PointsMaterial({
      size: 0.018,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const mist = new THREE.Points(mistGeo, mistMat);
    scene.add(mist);

    const starsBright = 4_000;
    const starsDim = 22_000;
    const starsCount = starsBright + starsDim;
    const starsPos = new Float32Array(starsCount * 3);
    const starsCol = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      const r = 45 + Math.pow(Math.random(), 0.55) * 120;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      starsPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starsPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starsPos[i * 3 + 2] = r * Math.cos(phi);
      const warm = Math.random() > 0.55;
      const c = warm
        ? new THREE.Color().setHSL(0.08 + Math.random() * 0.04, 0.35, 0.55 + Math.random() * 0.25)
        : new THREE.Color().setHSL(0.58 + Math.random() * 0.12, 0.25, 0.45 + Math.random() * 0.35);
      starsCol[i * 3] = c.r;
      starsCol[i * 3 + 1] = c.g;
      starsCol[i * 3 + 2] = c.b;
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute("position", new THREE.BufferAttribute(starsPos, 3));
    starsGeo.setAttribute("color", new THREE.BufferAttribute(starsCol, 3));
    const starsMat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    const nebulaTex = makeNebulaTexture();
    let nebula: THREE.Mesh | null = null;
    if (nebulaTex) {
      const skyGeo = new THREE.SphereGeometry(180, 32, 32);
      const skyMat = new THREE.MeshBasicMaterial({
        map: nebulaTex,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      nebula = new THREE.Mesh(skyGeo, skyMat);
      scene.add(nebula);
    }

    const timer = new THREE.Timer();
    if (typeof document !== "undefined") {
      timer.connect(document);
    }

    let animationFrameId = 0;
    let hasEntered = false;
    let enterAccum = 0;

    const animate = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(animate);
      timer.update(timestamp);

      const s = stageRef.current;
      if (s === "pre-intro" || s === "home") {
        return;
      }
      if (s !== "intro" && s !== "entering") {
        return;
      }

      const delta = timer.getDelta();
      const elapsed = timer.getElapsed();

      stars.rotation.y -= delta * 0.012;
      stars.rotation.x -= delta * 0.004;

      const posAttr = diskGeo.attributes.position as THREE.BufferAttribute;
      const mistAttr = mistGeo.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < diskCount; i++) {
        let x = posAttr.array[i * 3];
        let y = posAttr.array[i * 3 + 1];
        let z = posAttr.array[i * 3 + 2];
        let r = Math.hypot(x, z);
        let angle = Math.atan2(z, x);
        const omega = 0.55 + 1.4 / Math.max(r, 0.45);
        angle += delta * omega;
        const inward = delta * (0.22 + r * 0.018);
        r -= inward;
        if (r < 2.58) {
          r = 9 + Math.random() * 7;
          angle = Math.random() * Math.PI * 2;
        }
        const wave =
          Math.sin(angle * 5 + elapsed * 1.8 + seed[i]) * 0.18 * (1 / Math.max(r, 1));
        y = wave + Math.cos(angle * 3 + elapsed * 1.2 + seed[i] * 2) * 0.08;
        posAttr.array[i * 3] = Math.cos(angle) * r;
        posAttr.array[i * 3 + 1] = y;
        posAttr.array[i * 3 + 2] = Math.sin(angle) * r;
      }
      posAttr.needsUpdate = true;

      for (let i = 0; i < mistCount; i++) {
        let x = mistAttr.array[i * 3];
        let z = mistAttr.array[i * 3 + 2];
        let r = Math.hypot(x, z);
        let angle = Math.atan2(z, x);
        angle += delta * (0.9 + 2.2 / Math.max(r, 0.35));
        r -= delta * (0.35 + r * 0.04);
        if (r < 2.52) {
          r = 4.5 + Math.random() * 2;
          angle = Math.random() * Math.PI * 2;
        }
        const y =
          Math.sin(angle * 8 + elapsed * 2.5 + i * 0.01) * 0.06 * (1 / Math.max(r, 1));
        mistAttr.array[i * 3] = Math.cos(angle) * r;
        mistAttr.array[i * 3 + 1] = y;
        mistAttr.array[i * 3 + 2] = Math.sin(angle) * r;
      }
      mistAttr.needsUpdate = true;

      disk.rotation.y += delta * 0.35;
      disk.rotation.z += delta * 0.08;
      mist.rotation.y -= delta * 0.55;
      mist.rotation.z += delta * 0.12;

      ring.rotation.z -= delta * 0.75;
      if (nebula) {
        nebula.rotation.y += delta * 0.003;
      }

      if (s === "entering") {
        enterAccum += delta;
        const t = Math.min(1, enterAccum / ENTER_SECONDS);
        const e = easeInOutCubic(t);
        camera.position.z = THREE.MathUtils.lerp(15, 0.32, e);
        camera.position.x =
          Math.sin(t * Math.PI * 2.8) * 0.55 * (1 - e * 0.85);
        camera.position.y =
          THREE.MathUtils.lerp(3, 0.15, e) +
          Math.cos(t * Math.PI * 3.2) * 0.22 * (1 - e);
        camera.lookAt(0, 0, 0);

        if (t >= ENTER_TRIGGER && !hasEntered) {
          hasEntered = true;
          onEnteredRef.current();
        }
      } else {
        enterAccum = 0;
        hasEntered = false;
        camera.position.x = Math.sin(elapsed * 0.45) * 3.1;
        camera.position.y = 2 + Math.cos(elapsed * 0.28) * 1.4;
        camera.position.z = 15;
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    const handleResize = () => {
      camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      timer.dispose();
      if (nebulaTex) nebulaTex.dispose();
      horizonGeo.dispose();
      horizonMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      diskGeo.dispose();
      diskMat.dispose();
      mistGeo.dispose();
      mistMat.dispose();
      starsGeo.dispose();
      starsMat.dispose();
      if (nebula) {
        nebula.geometry.dispose();
        (nebula.material as THREE.Material).dispose();
      }
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="pointer-events-none h-full w-full" />
  );
}
