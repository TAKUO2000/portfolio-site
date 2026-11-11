import { describe, expect, it } from "vitest";
import { nextAutoTarget } from "@/app/components/PointingHand";

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

/** 中心が(cx, cy)になる40x20のボタン */
function button(cx: number, cy: number) {
  const element = document.createElement("a");
  element.getBoundingClientRect = () => rect(cx - 20, cy - 10, 40, 20);
  return element;
}

const CANVAS = rect(0, 0, 400, 400);

describe("nextAutoTarget", () => {
  const first = button(100, 300);
  const second = button(200, 300);
  const third = button(300, 300);
  const buttons = [first, second, third];

  it("まだ何も指していなければ、最初のボタンを返す", () => {
    expect(nextAutoTarget(buttons, CANVAS, null)).toBe(first);
  });

  it("今指しているボタンの次を返す", () => {
    expect(nextAutoTarget(buttons, CANVAS, first)).toBe(second);
    expect(nextAutoTarget(buttons, CANVAS, second)).toBe(third);
  });

  it("最後まで指したら、最初に戻る", () => {
    expect(nextAutoTarget(buttons, CANVAS, third)).toBe(first);
  });

  it("Canvasの外にあるボタンは飛ばす（指せないため）", () => {
    const outside = button(200, 600);

    expect(nextAutoTarget([first, outside, third], CANVAS, first)).toBe(third);
  });

  it("今指しているボタンがCanvasの外に出たら、最初のボタンから指し直す", () => {
    const scrolledOut = button(200, 600);

    expect(nextAutoTarget([first, second], CANVAS, scrolledOut)).toBe(first);
  });

  it("指せるボタンが無ければnullを返す", () => {
    expect(nextAutoTarget([], CANVAS, null)).toBeNull();
    expect(nextAutoTarget([button(200, 600)], CANVAS, null)).toBeNull();
  });
});
