"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Model } from "./PointingHand";

type Props = {
  className?: string;
  /** 手首の位置。カメラは[0, 0, 1.5]から原点を見ている */
  modelPosition?: [number, number, number];
  /** カーソルがCanvasの外にあるときの手の角度（ラジアン）。[0, 0, 0]で指先が画面の手前を向く */
  modelRotation?: [number, number, number];
};

/** カーソルを指さす手の3Dモデル。大きさは親要素かclassNameで決める */
export default function PointingHandCanvas({
  className,
  modelPosition,
  modelRotation,
}: Props) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 1.6] }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 3, 3]} />
        <Suspense fallback={null}>
          <Model position={modelPosition} rotation={modelRotation} />
        </Suspense>
      </Canvas>
    </div>
  );
}
