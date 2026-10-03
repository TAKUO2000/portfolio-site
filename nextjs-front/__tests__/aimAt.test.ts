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

/** 400x400のCanvasと、本番と同じ位置に置いた手 */
function setup() {
  const canvas = document.createElement("canvas");
  canvas.getBoundingClientRect = () => rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.set(0, 0, 1.6);
  camera.updateMatrixWorld();

  const hand = new THREE.Object3D();
  hand.position.set(0, 0.2, -0.6); // HeroのmodelPosition
  hand.updateMatrixWorld();

  return { canvas, camera, hand, scratch: createAimScratch() };
}

/** 指先（モデルの+Z）が向くワールド方向 */
function fingerDirection(quaternion: THREE.Quaternion) {
  return new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
}

/** 画面上の位置（NDC） */
function toNdc(point: THREE.Vector3, camera: THREE.Camera) {
  const p = point.clone().project(camera);
  return new THREE.Vector2(p.x, p.y);
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

  // 指の延長線は画面上でカーソルを通るはず。
  // 狙いの面を手の奥行きに合わせていないと、ここが画面の外側へずれて
  // 「ボタンの下に指がはみ出す」見え方になる
  it.each([
    ["中央より下", 200, 320],
    ["中央より上", 200, 80],
    ["右下", 330, 300],
  ])("指の延長線が画面上でカーソルを通る（%s）", (_name, cursorX, cursorY) => {
    const { canvas, camera, hand, scratch } = setup();
    const quaternion = aimAt(
      scratch,
      { x: cursorX, y: cursorY, target: null },
      canvas,
      camera,
      hand,
    );
    expect(quaternion).not.toBeNull();

    const handPosition = new THREE.Vector3();
    hand.getWorldPosition(handPosition);
    const along = handPosition
      .clone()
      .add(fingerDirection(quaternion!).multiplyScalar(0.9)); // 指先のあたり

    const handNdc = toNdc(handPosition, camera);
    const alongNdc = toNdc(along, camera);
    const cursorNdc = new THREE.Vector2(
      (cursorX / CANVAS_SIZE) * 2 - 1,
      -(cursorY / CANVAS_SIZE) * 2 + 1,
    );

    // 手 → 指先 と 手 → カーソル が画面上で同じ向きなら、外積が0になる
    const finger = alongNdc.sub(handNdc);
    const toCursor = cursorNdc.sub(handNdc);
    expect(
      finger.cross(toCursor) / (finger.length() * toCursor.length()),
    ).toBeCloseTo(0, 5);
  });
});
