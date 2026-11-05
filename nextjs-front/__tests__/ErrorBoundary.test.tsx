import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ErrorBoundary from "@/app/components/ui/ErrorBoundary";

function Boom(): never {
  throw new Error("描画に失敗しました");
}

afterEach(cleanup);

describe("ErrorBoundary", () => {
  it("例外がなければ子をそのまま描画する", () => {
    render(
      <ErrorBoundary>
        <p>中身</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("中身")).toBeDefined();
  });

  it("子が例外を投げたらfallbackを表示する", () => {
    // Reactが例外をコンソールに出すので、テスト出力を汚さないよう黙らせる
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<p>代わりの表示</p>}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText("代わりの表示")).toBeDefined();
    consoleError.mockRestore();
  });

  it("fallbackを渡さなければ何も描画しない", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { container } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(container.innerHTML).toBe("");
    consoleError.mockRestore();
  });
});
