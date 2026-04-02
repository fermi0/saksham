"use client";

import { Canvas } from "@react-three/fiber";
import type { PropsWithChildren } from "react";

type ThreeCanvasProps = PropsWithChildren<{
  className?: string;
}>;

export default function ThreeCanvas({ className, children }: ThreeCanvasProps) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        {children}
      </Canvas>
    </div>
  );
}

