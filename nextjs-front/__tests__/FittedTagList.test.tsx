import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import FittedTagList from "@/app/components/ui/FittedTagList";
import type { Tag } from "@/app/types/models";

vi.mock("@/public/ThreeDots.svg", () => ({ default: () => null }));

/**
 * jsdom はレイアウトをしないので、幅と位置を決め打ちで返す。
 * - タグ：幅 50px、右の余白 10px（1つあたり 60px 進む）
 * - 「…」：幅 20px
 * - 置き場所：左の余白（タグの枠の分）2px。幅はテストごとに変える
 */
const TAG_WIDTH = 50;
const TAG_MARGIN_RIGHT = 10;
const ELLIPSIS_WIDTH = 20;
const PADDING_LEFT = 2;

let containerWidth = 0;

const tags: Tag[] = [
  { id: 1, name: "Laravel" },
  { id: 2, name: "Docker" },
  { id: 3, name: "PHP" },
];

const LAYOUT_PROPERTIES = ["clientWidth", "offsetWidth", "offsetLeft"] as const;

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => containerWidth,
  });
  // タグ（TagBox）は div、「…」は span
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return this.tagName === "SPAN" ? ELLIPSIS_WIDTH : TAG_WIDTH;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
    configurable: true,
    get(this: HTMLElement) {
      const index = Array.from(this.parentElement?.children ?? []).indexOf(
        this,
      );
      return index * (TAG_WIDTH + TAG_MARGIN_RIGHT);
    },
  });
  vi.stubGlobal("getComputedStyle", () => ({
    paddingLeft: `${PADDING_LEFT}px`,
    marginRight: `${TAG_MARGIN_RIGHT}px`,
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const property of LAYOUT_PROPERTIES) {
    // プロトタイプに足した分を消すと、jsdom の元の定義（親のプロトタイプ）に戻る
    Reflect.deleteProperty(HTMLElement.prototype, property);
  }
});

/** 見える行に出ているタグの名前。タグは幅を測る行にも必ず1つずつあるので、2つあれば見えている */
function visibleTagNames(): string[] {
  return tags
    .map((tag) => tag.name)
    .filter((name) => screen.getAllByText(name).length === 2);
}

/** 省略した分をまとめる「…」。省略したタグの名前を title に持つ */
function ellipsisTitle(): string | null {
  return document.querySelector("[title]")?.getAttribute("title") ?? null;
}

describe("FittedTagList", () => {
  // 3つを並べるのに要る幅：3つ目の右端 180px − 末尾の余白 10px = 170px。
  // タグを置けるのは、置き場所の幅から左の余白 2px を引いた分
  it("左の余白を引いた幅にちょうど収まるなら、すべてのタグを出す", () => {
    containerWidth = 172;
    render(<FittedTagList tags={tags} />);

    expect(visibleTagNames()).toEqual(["Laravel", "Docker", "PHP"]);
    expect(ellipsisTitle()).toBeNull();
  });

  // 余白を引かないと 171px ≥ 170px で3つとも出して、最後のタグの右が切れる
  it("左の余白を引くと 1px 足りないなら、最後のタグを「…」にまとめる", () => {
    containerWidth = 171;
    render(<FittedTagList tags={tags} />);

    expect(visibleTagNames()).toEqual(["Laravel", "Docker"]);
    expect(ellipsisTitle()).toBe("PHP");
  });

  it("タグが無ければ、何も出さない", () => {
    containerWidth = 172;
    const { container } = render(<FittedTagList tags={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
