"use client";

import { Float, OrbitControls, Sparkles } from "@react-three/drei";
import ThreeCanvas from "@/components/three/ThreeCanvas";

function AboutCore() {
  return (
    <group>
      <Float speed={1.4} rotationIntensity={0.9} floatIntensity={0.9}>
        <mesh>
          <dodecahedronGeometry args={[1.25, 1]} />
          <meshStandardMaterial
            color="#60a5fa"
            roughness={0.22}
            metalness={0.35}
            emissive="#3b82f6"
            emissiveIntensity={0.25}
          />
        </mesh>
      </Float>
      <mesh rotation={[0.6, -0.4, 0.2]}>
        <torusKnotGeometry args={[1.8, 0.08, 220, 16]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}

export default function AboutScene() {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_90%_at_20%_30%,rgba(96,165,250,0.22),rgba(0,0,0,0))]" />
      <ThreeCanvas className="absolute inset-0">
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 4, 2]} intensity={1.2} color="#e0e7ff" />
        <pointLight position={[-3, -2, 3]} intensity={1.1} color="#60a5fa" />

        <AboutCore />
        <Sparkles count={60} size={1.0} speed={0.3} opacity={0.5} scale={[7, 7, 7]} />

        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.9} />
      </ThreeCanvas>
    </div>
  );
}

