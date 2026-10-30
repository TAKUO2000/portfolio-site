import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import Footer from "@/app/components/Footer";

vi.mock("@/public/X.svg", () => ({ default: () => null }));
vi.mock("@/public/Qiita.svg", () => ({ default: () => null }));
vi.mock("@/public/GitHub.svg", () => ({ default: () => null }));

afterEach(() => {
  cleanup();
});

describe("Footer", () => {
  it("メールアドレスをmailtoのリンクで出す", () => {
    render(<Footer />);

    const link = screen.getByRole("link", { name: "contact@takuosblog.com" });
    expect(link.getAttribute("href")).toBe("mailto:contact@takuosblog.com");
  });

  it.each([
    ["X（@TAKUO2000）", "https://x.com/TAKUO2000"],
    ["Qiita（@TAKUO2000）", "https://qiita.com/TAKUO2000"],
    ["GitHub（@TAKUO2000）", "https://github.com/TAKUO2000"],
  ])("%s へのリンクを、新しいタブで開くように出す", (name, href) => {
    render(<Footer />);

    const link = screen.getByRole("link", { name });
    expect(link.getAttribute("href")).toBe(href);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
