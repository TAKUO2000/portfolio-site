import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  SWAY_CENTER_YAW,
  SWAY_PERIOD_SECONDS,
  SWAY_RADIUS,
  swayQuaternion,
} from "@/app/components/PointingHand";

const base = new THREE.Quaternion();
/** 揺れの中心（最初の角度から、横に SWAY_CENTER_YAW だけ回した向き） */
const center = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(0, SWAY_CENTER_YAW, 0),
);

function at(seconds: number) {
  return swayQuaternion(base, seconds, new THREE.Quaternion());
}

/** 指先（+Z）が向いている方向 */
function forward(seconds: number) {
  return new THREE.Vector3(0, 0, 1).applyQuaternion(at(seconds));
}

describe("swayQuaternion", () => {
  it("いつも中心から同じだけ離れている（円を描く）", () => {
    for (let t = 0; t < SWAY_PERIOD_SECONDS; t += 0.25) {
      expect(at(t).angleTo(center)).toBeCloseTo(SWAY_RADIUS, 2);
    }
  });

  it("縦と横の両方に動く（線の往復ではない）", () => {
    const quarter = SWAY_PERIOD_SECONDS / 4;
    const xs = [0, quarter, 2 * quarter, 3 * quarter].map((t) => forward(t).x);
    const ys = [0, quarter, 2 * quarter, 3 * quarter].map((t) => forward(t).y);

    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(SWAY_RADIUS);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(SWAY_RADIUS);
  });

  it("1周の時間がたつと、同じ向きに戻る", () => {
    expect(at(1.3).angleTo(at(1.3 + SWAY_PERIOD_SECONDS))).toBeCloseTo(0, 6);
  });

  // 人差し指がモデルの右寄りにあるので、最初の角度のまま回すと右上で円を描いて見える
  it("円の中心は、最初の角度より左（画面の-X）に寄っている", () => {
    let sumX = 0;
    const steps = 40;
    for (let i = 0; i < steps; i++) {
      sumX += forward((SWAY_PERIOD_SECONDS * i) / steps).x;
    }

    expect(sumX / steps).toBeLessThan(0);
  });

  it("書き込み先の quaternion を返す（毎フレーム new しない）", () => {
    const out = new THREE.Quaternion();

    expect(swayQuaternion(base, 2, out)).toBe(out);
  });
});
