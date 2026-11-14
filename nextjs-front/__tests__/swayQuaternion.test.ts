import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  SWAY_PERIODS_SECONDS,
  SWAY_PITCH,
  SWAY_YAW,
  swayQuaternion,
} from "@/app/components/PointingHand";

const base = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, -0.2, 0));

/** baseからどれだけ回っているか（ラジアン） */
function angleFromBase(seconds: number) {
  return swayQuaternion(base, seconds, new THREE.Quaternion()).angleTo(base);
}

describe("swayQuaternion", () => {
  it("0秒のときは、最初の角度のまま", () => {
    expect(angleFromBase(0)).toBeCloseTo(0, 6);
  });

  it("時間がたつと、最初の角度から離れる（揺れている）", () => {
    expect(angleFromBase(1)).toBeGreaterThan(0.05);
  });

  it("揺れの大きさは、決めた幅を超えない", () => {
    const max = Math.hypot(SWAY_YAW, SWAY_PITCH) + 1e-6;
    for (let t = 0; t < 30; t += 0.25) {
      expect(angleFromBase(t)).toBeLessThanOrEqual(max);
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
