import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import CategoryBox from "@/app/components/ui/CategoryBox";

// SVG はコンポーネントとして読み込むので、どのアイコンかが分かる目印に差し替える
vi.mock("@/public/Code.svg", () => ({
  default: () => <svg data-testid="icon-code" />,
}));
vi.mock("@/public/Controller.svg", () => ({
  default: () => <svg data-testid="icon-controller" />,
}));
vi.mock("@/public/Necktie.svg", () => ({
  default: () => <svg data-testid="icon-necktie" />,
}));
vi.mock("@/public/ThreeDots.svg", () => ({
  default: () => <svg data-testid="icon-three-dots" />,
}));

afterEach(() => {
  cleanup();
});

describe("CategoryBox", () => {
  it("カテゴリの名前と、カテゴリごとのアイコンを出す", () => {
    render(<CategoryBox category="技術" id={1} />);

    expect(screen.getByText("技術")).toBeDefined();
    expect(screen.getByTestId("icon-code")).toBeDefined();
  });

  it("知らないカテゴリは、「その他」のアイコンにする", () => {
    render(<CategoryBox category="新しいカテゴリ" id={999} />);

    expect(screen.getByTestId("icon-three-dots")).toBeDefined();
  });

  // 画像が小さくてアイコン付きが収まらない場所（スマホの幅の記事カード）で使う
  it("compact のときは、アイコンを出さず、名前だけの小さなラベルにする", () => {
    const { container } = render(
      <CategoryBox category="技術" id={1} compact />,
    );
    const box = container.firstElementChild;

    expect(screen.getByText("技術")).toBeDefined();
    expect(container.querySelector("svg")).toBeNull();
    expect(box?.classList.contains("px-2")).toBe(true);
    expect(box?.classList.contains("py-0.5")).toBe(true);
  });
});
