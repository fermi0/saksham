"use client";

import { Float, OrbitControls, Sparkles } from "@react-three/drei";
import ThreeCanvas from "@/components/three/ThreeCanvas";

function Blob() {
  return (
    <Float speed={1.6} rotationIntensity={0.8} floatIntensity={1.1}>
      <mesh>
        <icosahedronGeometry args={[1.55, 5]} />
        <meshStandardMaterial
          color="#22c55e"
          roughness={0.25}
          metalness={0.3}
          emissive="#16a34a"
          emissiveIntensity={0.35}
        />
      </mesh>
    </Float>
  );
}

function Rings() {
  return (
    <group rotation={[0.4, 0.2, 0]}>
      <mesh rotation={[0.3, 0.2, 0]}>
        <torusGeometry args={[2.2, 0.055, 16, 180]} />
        <meshStandardMaterial color="#86efac" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh rotation={[1.2, -0.4, 0.3]}>
        <torusGeometry args={[1.7, 0.04, 16, 180]} />
        <meshStandardMaterial color="#bbf7d0" roughness={0.5} metalness={0.5} />
      </mesh>
    </group>
  );
}

export default function HomeScene() {
  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_40%,rgba(34,197,94,0.20),rgba(0,0,0,0))]" />
      <ThreeCanvas className="absolute inset-0">
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 9, 16]} />

        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 4, 2]} intensity={1.2} color="#d1fae5" />
        <pointLight position={[-3, -1, 2]} intensity={1.1} color="#22c55e" />

        <Blob />
        <Rings />

        <Sparkles count={90} size={1.2} speed={0.35} opacity={0.55} scale={[10, 10, 10]} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.7} />
      </ThreeCanvas>
    </div>
  );
}

