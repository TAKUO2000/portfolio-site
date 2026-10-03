import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { aimAt, createAimScratch } from "@/app/components/PointingHand";

const CANVAS_SIZE = 400;

function rect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

/** 400x400のCanvasと、原点に置いた手 */
function setup() {
  const canvas = document.createElement("canvas");
  canvas.getBoundingClientRect = () => rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.set(0, 0, 1.6);
  camera.updateMatrixWorld();

  const hand = new THREE.Object3D();
  hand.updateMatrixWorld();

  return { canvas, camera, hand, scratch: createAimScratch() };
}

/** 指先（モデルの+Z）が向くワールド方向 */
function fingerDirection(quaternion: THREE.Quaternion) {
  return new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
}

describe("aimAt", () => {
  it("カーソルを一度も見ていなければnullを返す", () => {
    const { canvas, camera, hand, scratch } = setup();

    expect(aimAt(scratch, null, canvas, camera, hand)).toBeNull();
  });

  it("カーソルがCanvasの外ならnullを返す", () => {
    const { canvas, camera, hand, scratch } = setup();
    const outside = { x: CANVAS_SIZE + 10, y: 200, target: null };

    expect(aimAt(scratch, outside, canvas, camera, hand)).toBeNull();
  });

  it("カーソルが右にあれば指先は右を向く", () => {
    const { canvas, camera, hand, scratch } = setup();
    const result = aimAt(
      scratch,
      { x: 300, y: 200, target: null },
      canvas,
      camera,
      hand,
    );

    expect(result).not.toBeNull();
    expect(fingerDirection(result!).x).toBeGreaterThan(0);
  });

  it("カーソルが上にあれば指先は上を向く", () => {
    const { canvas, camera, hand, scratch } = setup();
    const result = aimAt(
      scratch,
      { x: 200, y: 50, target: null },
      canvas,
      camera,
      hand,
    );

    expect(result).not.toBeNull();
    expect(fingerDirection(result!).y).toBeGreaterThan(0);
  });

  it("targetがあればカーソルではなく要素の中心を指す", () => {
    const { canvas, camera, hand, scratch } = setup();

    // 中心が(300, 200)の要素。カーソルは左上の隅に置く
    const button = document.createElement("a");
    button.getBoundingClientRect = () => rect(260, 180, 80, 40);
    const viaTarget = aimAt(
      scratch,
      { x: 10, y: 10, target: button },
      canvas,
      camera,
      hand,
    )!.clone(); // scratchを使い回すので、次の呼び出し前に控える

    const viaCursor = aimAt(
      scratch,
      { x: 300, y: 200, target: null },
      canvas,
      camera,
      hand,
    )!;

    expect(viaTarget.angleTo(viaCursor)).toBeCloseTo(0);
  });
});
