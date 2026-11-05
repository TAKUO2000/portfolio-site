"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Model } from "./PointingHand";
import ErrorBoundary from "./ui/ErrorBoundary";

const CAMERA_POSITION: [number, number, number] = [0, 0, 1.6];

type Props = {
  className?: string;
  /** 手首の位置。カメラはCAMERA_POSITIONから原点を見ている */
  modelPosition?: [number, number, number];
  /** カーソルがCanvasの外にあるときの手の角度（ラジアン）。[0, 0, 0]で指先が画面の手前を向く */
  modelRotation?: [number, number, number];
  /** 手の大きさ。奥に置くと小さく映るので、見た目を保つならここで補う */
  modelScale?: number;
};

/** 画面内に入っているかを監視する。IntersectionObserverが無い環境では常にtrue */
function useIsVisible(ref: React.RefObject<HTMLElement | null>) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) =>
      setIsVisible(entry.isIntersecting),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return isVisible;
}

/** OSの「視差効果を減らす」設定が有効かどうか */
function usePrefersReducedMotion() {
  // SSRではmatchMediaが無いので、初期値はfalseにしてマウント後に確定させる
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(query.matches);

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

/** カーソルを指さす手の3Dモデル。大きさは親要素かclassNameで決める */
export default function PointingHandCanvas({
  className,
  modelPosition,
  modelRotation,
  modelScale,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(containerRef);
  const prefersReducedMotion = usePrefersReducedMotion();

  // 画面外では描画を止める。視差効果を減らす設定なら初回だけ描画して静止させる
  const frameloop = !isVisible
    ? "never"
    : prefersReducedMotion
      ? "demand"
      : "always";

  return (
    // 背景の装飾なので支援技術には読ませない
    <div ref={containerRef} className={className} aria-hidden="true">
      {/* WebGLが使えない環境では何も表示しない */}
      <ErrorBoundary>
        <Canvas
          camera={{ position: CAMERA_POSITION }}
          dpr={[1, 2]} // 高精細ディスプレイで解像度が上がりすぎないよう上限を決める
          frameloop={frameloop}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 3, 3]} />
          <Suspense fallback={null}>
            <Model
              position={modelPosition}
              rotation={modelRotation}
              scale={modelScale}
            />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
