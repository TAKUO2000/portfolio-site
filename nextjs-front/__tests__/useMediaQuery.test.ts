import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useMediaQuery } from "@/app/lib/useMediaQuery";

/** matches を外から切り替えられる matchMedia の代わり */
function stubMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: initial,
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
  };
  const matchMedia = vi.fn(() => query);
  vi.stubGlobal("matchMedia", matchMedia);

  return {
    matchMedia,
    listeners,
    change(matches: boolean) {
      query.matches = matches;
      listeners.forEach((listener) => listener());
    },
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useMediaQuery", () => {
  it("マウントしたあと、今の結果を返す", () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useMediaQuery("(max-width: 639px)"));

    expect(result.current).toBe(true);
  });

  it("結果が変わったら追いかける（画面の幅を変えた、など）", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(max-width: 639px)"));

    act(() => media.change(true));

    expect(result.current).toBe(true);
  });

  it("渡したクエリで調べる", () => {
    const media = stubMatchMedia(false);

    renderHook(() => useMediaQuery("(hover: none)"));

    expect(media.matchMedia).toHaveBeenCalledWith("(hover: none)");
  });

  it("アンマウントしたら、監視をやめる", () => {
    const media = stubMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery("(hover: none)"));

    unmount();

    expect(media.listeners.size).toBe(0);
  });
});
