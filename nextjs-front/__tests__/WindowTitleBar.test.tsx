import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import WindowTitleBar from "@/app/components/ui/WindowTitleBar";

afterEach(() => {
  cleanup();
});

function renderBar(props: Parameters<typeof WindowTitleBar>[0] = {}) {
  const { container } = render(<WindowTitleBar {...props} />);
  const bar = container.firstElementChild as HTMLElement;
  return { bar, dots: Array.from(bar.children) };
}

describe("WindowTitleBar", () => {
  it("飾りなので、支援技術には読ませない", () => {
    const { bar } = renderBar();

    expect(bar.getAttribute("aria-hidden")).toBe("true");
  });

  it("四角を3つ並べる", () => {
    const { dots } = renderBar();

    expect(dots).toHaveLength(3);
  });

  it("何も渡さなければ、黒いバーに背景色の四角にする", () => {
    const { bar, dots } = renderBar();

    expect(bar.classList.contains("bg-foreground")).toBe(true);
    expect(dots[0].classList.contains("bg-background")).toBe(true);
  });

  it("brown は、茶色のバーにする", () => {
    const { bar } = renderBar({ color: "brown" });

    expect(bar.classList.contains("bg-pixel-shadow")).toBe(true);
    expect(bar.classList.contains("bg-foreground")).toBe(false);
  });

  // 小さいウィンドウ（スマホの幅の About の画像）では、バーと四角も小さくする
  it("responsive は、md未満で小さく、md以上で通常の大きさにする", () => {
    const { bar, dots } = renderBar({ size: "responsive" });

    expect(bar.classList.contains("h-4")).toBe(true);
    expect(bar.classList.contains("md:h-6")).toBe(true);
    expect(dots[0].classList.contains("size-1")).toBe(true);
    expect(dots[0].classList.contains("md:size-2")).toBe(true);
  });

  it("渡したクラスを、バーに足す", () => {
    const { bar } = renderBar({ className: "col-span-full" });

    expect(bar.classList.contains("col-span-full")).toBe(true);
  });
});
