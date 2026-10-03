"use client";
/*
gltfjsxの出力を元に手修正したファイル。
元コマンド: npx gltfjsx@6.5.3 public/models/pointing-hand.glb --types --root /models/ --output app/components/PointingHand.tsx
aimAt以下の追従ロジックは手書きなので、gltfjsxを再実行すると消える。
*/

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

type GLTFResult = GLTF & {
  nodes: {
    PointingHand_1: THREE.Mesh;
    PointingHand_2: THREE.Mesh;
  };
  materials: {
    Glove_White: THREE.MeshStandardMaterial;
    Glove_Inner: THREE.MeshStandardMaterial;
  };
};

// 指はモデルの+Z方向に伸びているので、+Zをカーソルへ向ければ指さしになる
const POINT_DEPTH = 0.5; // カーソル位置をどれだけ手前に浮かせて狙うか。小さいほど横を向きやすい
const FOLLOW_SPEED = 10; // 大きいほど素早く追従する
const HAND_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // 手首のあるz=0の面
const UP = new THREE.Vector3(0, 1, 0);
/** この属性を付けた要素にホバーしている間は、カーソルではなく要素の中心を指す */
export const POINT_TARGET_ATTR = "data-point-target";

/**
 * aimAtが毎フレーム使い回す作業用オブジェクト。
 * 毎フレームnewするとGCが走るので使い回すが、Modelが複数マウントされたときに
 * 上書きし合わないよう、インスタンスごとに1つ作る。
 */
export function createAimScratch() {
  return {
    raycaster: new THREE.Raycaster(),
    target: new THREE.Vector3(),
    handPosition: new THREE.Vector3(),
    lookMatrix: new THREE.Matrix4(),
    quaternion: new THREE.Quaternion(),
    pointer: new THREE.Vector2(),
  };
}

export type AimScratch = ReturnType<typeof createAimScratch>;

/** 最後に見たカーソル。targetはホバー中のdata-point-target要素 */
export type LastPointer = { x: number; y: number; target: Element | null };

/** カーソル（ホバー中なら要素の中心）を指す向きを返す。カーソルがCanvasの外ならnull */
export function aimAt(
  scratch: AimScratch,
  last: LastPointer | null,
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  object: THREE.Object3D,
): THREE.Quaternion | null {
  if (!last) return null;
  const rect = canvas.getBoundingClientRect();
  const isInside =
    last.x >= rect.left &&
    last.x <= rect.right &&
    last.y >= rect.top &&
    last.y <= rect.bottom;
  if (!isInside) return null;

  let x = last.x;
  let y = last.y;
  if (last.target) {
    const targetRect = last.target.getBoundingClientRect();
    x = targetRect.left + targetRect.width / 2;
    y = targetRect.top + targetRect.height / 2;
  }
  scratch.pointer.set(
    ((x - rect.left) / rect.width) * 2 - 1,
    -((y - rect.top) / rect.height) * 2 + 1,
  );

  scratch.raycaster.setFromCamera(scratch.pointer, camera);
  if (!scratch.raycaster.ray.intersectPlane(HAND_PLANE, scratch.target)) {
    return null;
  }
  scratch.target.z += POINT_DEPTH;

  object.getWorldPosition(scratch.handPosition);
  scratch.lookMatrix.lookAt(scratch.target, scratch.handPosition, UP); // 第1引数側へ+Zが向く
  return scratch.quaternion.setFromRotationMatrix(scratch.lookMatrix);
}

type Props = Omit<ThreeElements["group"], "rotation"> & {
  /** カーソルがCanvasの外にあるときの角度（ラジアン） */
  rotation?: [number, number, number];
};

export function Model({ rotation = [0, 0, 0], ...props }: Props) {
  const { nodes, materials } = useGLTF(
    "/models/pointing-hand.glb",
  ) as unknown as GLTFResult;
  const groupRef = useRef<THREE.Group>(null);
  const lastPointer = useRef<LastPointer | null>(null); // ウィンドウの外に出たらnull
  const scratch = useMemo(() => createAimScratch(), []);
  const gl = useThree((state) => state.gl);
  const [rx, ry, rz] = rotation;
  const initialQuaternion = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    [rx, ry, rz],
  );

  // Canvasはpointer-events-noneでボタンの下にいるので、R3Fのpointerではなくwindowのイベントを拾う
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      lastPointer.current = {
        x: e.clientX,
        y: e.clientY,
        target:
          e.target instanceof Element
            ? e.target.closest(`[${POINT_TARGET_ATTR}]`)
            : null,
      };
    };
    const handlePointerLeave = () => {
      lastPointer.current = null;
    };
    // タッチやペンは指を離すとpointermoveが止まり、pointerleaveも来ない。
    // 放っておくと手が最後のタップ位置を指したままになるのでここで消す
    const handlePointerEnd = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") {
        lastPointer.current = null;
      }
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    document.documentElement.addEventListener(
      "pointerleave",
      handlePointerLeave,
    );
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      document.documentElement.removeEventListener(
        "pointerleave",
        handlePointerLeave,
      );
    };
  }, []);

  useFrame(({ camera }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // スクロールでCanvasが動いても判定がずれないよう、位置は毎フレーム測り直す
    const goal = aimAt(
      scratch,
      lastPointer.current,
      gl.domElement,
      camera,
      group,
    );
    group.quaternion.slerp(
      goal ?? initialQuaternion,
      1 - Math.exp(-FOLLOW_SPEED * delta),
    );
  });

  return (
    <group ref={groupRef} rotation={rotation} {...props} dispose={null}>
      <mesh
        geometry={nodes.PointingHand_1.geometry}
        material={materials.Glove_White}
      />
      <mesh
        geometry={nodes.PointingHand_2.geometry}
        material={materials.Glove_Inner}
      />
    </group>
  );
}

useGLTF.preload("/models/pointing-hand.glb");
