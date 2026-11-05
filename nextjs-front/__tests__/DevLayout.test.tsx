// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import DevLayout from "@/app/dev/layout";

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));
vi.mock("next/navigation", () => ({ notFound }));

afterEach(() => {
  vi.unstubAllEnvs();
  notFound.mockClear();
});

describe("DevLayout", () => {
  it("開発環境ではページをそのまま出す", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(DevLayout({ children: "dev" })).toBe("dev");
    expect(notFound).not.toHaveBeenCalled();
  });

  it.each(["production", "test"])("%s では404にする", (env) => {
    vi.stubEnv("NODE_ENV", env);

    expect(() => DevLayout({ children: "dev" })).toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });
});
