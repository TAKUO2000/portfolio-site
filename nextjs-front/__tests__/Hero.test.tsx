import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Hero from "@/app/components/Hero";

// 3Dの手はWebGLを使うので、テストでは描かない
vi.mock("next/dynamic", () => ({ default: () => () => null }));

beforeEach(() => {
  render(<Hero />);
});

afterEach(() => {
  cleanup();
});

describe("Hero", () => {
  it("3つのボタンが、それぞれの節を指す", () => {
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));

    expect(hrefs).toEqual([
      "#latest-article",
      "#popular-articles",
      "#about-site",
    ]);
  });

  // スマホの幅（md未満）では3つを横に並べるので、長い文言だけ短くして1行に収める
  it("「このサイトについて」は、md未満では「サイトについて」と表示する", () => {
    const link = screen.getAllByRole("link")[2];
    const short = Array.from(link.querySelectorAll("span")).find(
      (span) => span.textContent === "サイトについて",
    );
    const full = Array.from(link.querySelectorAll("span")).find(
      (span) => span.textContent === "このサイトについて",
    );

    expect(short?.className).toContain("md:hidden");
    expect(full?.className).toContain("hidden");
    expect(full?.className).toContain("md:inline");
  });

  it("短くしない文言は、どの幅でもそのまま表示する", () => {
    const [latest, popular] = screen.getAllByRole("link");

    expect(latest.textContent).toBe("最新記事");
    expect(popular.textContent).toBe("人気記事");
    expect(latest.querySelector("span")).toBeNull();
  });
});

describe("Hero の短い文言の折り返し", () => {
  // 「サイトについて」は390px未満の幅では1行に収まらない。言葉の途中（「サイトについ／て」）で切れないよう、文節で折り返す
  it("短い文言は、収まらないときに文節の切れ目で折り返す", () => {
    const link = screen.getAllByRole("link")[2];
    const short = Array.from(link.querySelectorAll("span")).find(
      (span) => span.textContent === "サイトについて",
    );

    expect(short?.classList.contains("[word-break:auto-phrase]")).toBe(true);
  });
});
