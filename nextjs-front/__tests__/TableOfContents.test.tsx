import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TableOfContents from "@/app/components/ui/TableOfContents";

const HEADINGS = [
  { id: "はじめに", text: "はじめに", depth: 1 as const },
  { id: "まとめ", text: "まとめ", depth: 2 as const },
];

const scrollIntoViewMock = vi.fn();

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches })),
  );
}

/** 目次と、その行き先になる本文の見出しを描く */
function renderWithHeadings() {
  render(
    <>
      <TableOfContents headings={HEADINGS} />
      <h2 id="はじめに">はじめに</h2>
    </>,
  );
}

beforeEach(() => {
  // jsdom には scrollIntoView が無い
  Element.prototype.scrollIntoView = scrollIntoViewMock;
  mockReducedMotion(false);
  history.replaceState(null, "", "/articles/1");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("TableOfContents", () => {
  it("見出しが無ければ何も出さない", () => {
    const { container } = render(<TableOfContents headings={[]} />);

    expect(container.innerHTML).toBe("");
  });

  it("押すと見出しまでなめらかにスクロールし、URL に見出しを残す", () => {
    renderWithHeadings();

    const notPrevented = fireEvent.click(
      screen.getByRole("link", { name: "はじめに" }),
    );

    expect(notPrevented).toBe(false);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
    expect(decodeURIComponent(window.location.hash)).toBe("#はじめに");
  });

  it("同じ見出しを続けて押しても、履歴は1つしか増えない", () => {
    renderWithHeadings();
    const pushState = vi.spyOn(history, "pushState");
    const link = screen.getByRole("link", { name: "はじめに" });

    fireEvent.click(link);
    fireEvent.click(link);

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it("動きを減らす設定のときは、すぐ移す", () => {
    mockReducedMotion(true);
    renderWithHeadings();

    fireEvent.click(screen.getByRole("link", { name: "はじめに" }));

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "instant" });
  });

  // 新しいタブで開く操作を横取りしない
  it("Ctrl を押しながらのクリックは、ブラウザに任せる", () => {
    renderWithHeadings();

    const notPrevented = fireEvent.click(
      screen.getByRole("link", { name: "はじめに" }),
      { ctrlKey: true },
    );

    expect(notPrevented).toBe(true);
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it("行き先の見出しが本文に無ければ、ブラウザに任せる", () => {
    renderWithHeadings();

    const notPrevented = fireEvent.click(
      screen.getByRole("link", { name: "まとめ" }),
    );

    expect(notPrevented).toBe(true);
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
