import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  SWAY_CENTER_YAW,
  SWAY_PERIODS_SECONDS,
  SWAY_PITCH,
  SWAY_YAW,
  swayQuaternion,
} from "@/app/components/PointingHand";

const base = new THREE.Quaternion();
/** 揺れの中心（最初の角度から、横に SWAY_CENTER_YAW だけ回した向き） */
const center = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(0, SWAY_CENTER_YAW, 0),
);

/** 揺れの中心からどれだけ回っているか（ラジアン） */
function angleFromCenter(seconds: number) {
  return swayQuaternion(base, seconds, new THREE.Quaternion()).angleTo(center);
}

describe("swayQuaternion", () => {
  it("0秒のときは、揺れの中心を向く", () => {
    expect(angleFromCenter(0)).toBeCloseTo(0, 6);
  });

  // 人差し指がモデルの右寄りにあるので、最初の角度のまま揺らすと右上で8の字を書いて見える
  it("揺れの中心は、最初の角度より左（画面の-X）に寄っている", () => {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
      swayQuaternion(base, 0, new THREE.Quaternion()),
    );

    expect(forward.x).toBeLessThan(0);
  });

  it("時間がたつと、中心から離れる（揺れている）", () => {
    expect(angleFromCenter(1)).toBeGreaterThan(0.05);
  });

  it("揺れの大きさは、決めた幅を超えない", () => {
    const max = Math.hypot(SWAY_YAW, SWAY_PITCH) + 1e-6;
    for (let t = 0; t < 30; t += 0.25) {
      expect(angleFromCenter(t)).toBeLessThanOrEqual(max);
    }
  });

  it("縦と横の周期の公倍数で、同じ角度に戻る", () => {
    const [pitchPeriod, yawPeriod] = SWAY_PERIODS_SECONDS;
    const cycle = (pitchPeriod * yawPeriod) / gcd(pitchPeriod, yawPeriod);
    const at = (t: number) => swayQuaternion(base, t, new THREE.Quaternion());

    expect(at(1.3).angleTo(at(1.3 + cycle))).toBeCloseTo(0, 6);
  });

  it("書き込み先の quaternion を返す（毎フレーム new しない）", () => {
    const out = new THREE.Quaternion();

    expect(swayQuaternion(base, 2, out)).toBe(out);
  });
});

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
