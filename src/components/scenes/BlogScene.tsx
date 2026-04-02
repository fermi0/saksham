"use client";

import { Float, OrbitControls, Sparkles } from "@react-three/drei";
import ThreeCanvas from "@/components/three/ThreeCanvas";

function PostStack() {
  return (
    <group>
      <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.7}>
        <mesh position={[0, 0.2, 0]} rotation={[0.25, 0.5, 0]}>
          <boxGeometry args={[2.2, 1.35, 0.25]} />
          <meshStandardMaterial color="#34d399" roughness={0.35} metalness={0.25} />
        </mesh>
        <mesh position={[-0.25, -0.15, -0.55]} rotation={[-0.2, -0.35, 0.12]}>
          <boxGeometry args={[2.0, 1.2, 0.22]} />
          <meshStandardMaterial color="#a7f3d0" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0.2, -0.45, -1.05]} rotation={[0.1, 0.2, -0.08]}>
          <boxGeometry args={[1.85, 1.05, 0.2]} />
          <meshStandardMaterial color="#10b981" roughness={0.55} metalness={0.22} />
        </mesh>
      </Float>
    </group>
  );
}

export default function BlogScene() {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_90%_at_70%_30%,rgba(16,185,129,0.20),rgba(0,0,0,0))]" />
      <ThreeCanvas className="absolute inset-0">
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 4, 2]} intensity={1.1} color="#d1fae5" />
        <pointLight position={[-3, -2, 2]} intensity={1.0} color="#34d399" />

        <PostStack />
        <Sparkles count={55} size={1.0} speed={0.28} opacity={0.45} scale={[7, 7, 7]} />

        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
      </ThreeCanvas>
    </div>
  );
}

