import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AboutSite from "@/app/components/AboutSite";
import { SITE_DATA } from "@/app/constants/siteData";

/**
 * 要素のクラスを1つずつの配列にする。className の文字列に toContain を使うと部分一致になり、
 * 「text-end」が「md:text-end」でも通ってしまうので、配列にして完全一致で比べる
 */
function classesOf(element: Element | null | undefined): string[] {
  return element ? Array.from(element.classList) : [];
}

afterEach(() => {
  cleanup();
});

function renderAbout(about: "site" | "me") {
  render(
    <AboutSite
      about={about}
      icon="/icon.png"
      title={["About", "TAKUO2000"]}
      text="本文"
    />,
  );
  return {
    image: screen.getByRole("img"),
    heading: screen.getByRole("heading", { level: 2 }),
    text: screen.getByText("本文"),
  };
}

describe("AboutSite", () => {
  it("見出しを、渡した行ごとに分けて出す", () => {
    const { heading } = renderAbout("site");

    expect(
      Array.from(heading.querySelectorAll("span")).map((s) => s.textContent),
    ).toEqual(["About", "TAKUO2000"]);
  });

  // 縦長の写真（犬の写真は1108x1477）も、楕円にならず丸く切り抜く
  it("画像は、どの幅でも正方形に切り抜いてから丸くする", () => {
    const { image } = renderAbout("me");

    expect(classesOf(image)).toContain("aspect-square");
    expect(classesOf(image)).toContain("object-cover");
    expect(classesOf(image)).toContain("rounded-full");
  });

  // md未満は、小さな画像と見出しを横に並べ、文章をその下に置く（スマホで画像が消えないように）
  it("md未満では画像を小さくし、md以上で大きくする", () => {
    const { image } = renderAbout("site");

    expect(classesOf(image)).toContain("size-26");
    expect(classesOf(image)).toContain("md:w-full");
    expect(classesOf(image)).toContain("md:h-auto");
  });

  it("サイトの紹介は、md未満で見出しを左に、md以上で右に寄せる", () => {
    const { heading } = renderAbout("site");

    expect(classesOf(heading)).toContain("text-start");
    expect(classesOf(heading)).toContain("md:text-end");
  });

  it("自己紹介は、md未満で見出しを右に（画像の左に）、md以上で左に寄せる", () => {
    const { heading } = renderAbout("me");

    expect(classesOf(heading)).toContain("text-end");
    expect(classesOf(heading)).toContain("md:text-start");
  });
});

describe("AboutSite の文章の大きさ", () => {
  // パソコンの幅では、見出し（48px）に対して14pxだと小さく見えるので、16pxにする。スマホの幅は14pxのまま
  it("説明文は、md未満で14px、md以上で16px", () => {
    const { text } = renderAbout("site");

    expect(classesOf(text)).toContain("text-sm");
    expect(classesOf(text)).toContain("md:text-base");
  });
});

describe("サイトの紹介の見出し", () => {
  // 「This」と「Site」を別の行にすると、スマホの幅で3行になり、間延びする
  it("「About」と「This Site」の2行にする", () => {
    expect(SITE_DATA.aboutSite.title).toEqual(["About", "This Site"]);
  });
});

describe("AboutSite の説明文の折り返し", () => {
  // 日本語はほぼ1文字ごとに折り返せるので、「気づ／き」のように言葉の途中で切れ、最後の行に「す。」だけが残ることがある
  it("文節の切れ目で折り返し、最後の行が短くなりすぎないようにする", () => {
    const { text } = renderAbout("site");

    expect(classesOf(text)).toContain("[word-break:auto-phrase]");
    expect(classesOf(text)).toContain("text-pretty");
  });

  // 複数行の日本語を右寄せにすると、行の始まりがばらばらになり、折り返しの不揃いが目立つ
  it("説明文は、どの幅でも左寄せにする（見出しの右寄せは残す）", () => {
    const { text, heading } = renderAbout("site");

    expect(classesOf(text)).not.toContain("text-end");
    expect(classesOf(text)).not.toContain("md:text-end");
    expect(classesOf(heading)).toContain("md:text-end");
  });
});

describe("AboutSite の見出しの大きさ", () => {
  // 30pxの「TAKUO2000」（約173px）は、360px未満の幅だと画像（104px）の横に収まらず、画像に重なる
  it("見出しは、360px未満で24px、360px以上で30px、md以上で48px", () => {
    const { heading } = renderAbout("me");

    expect(heading.classList.contains("text-2xl")).toBe(true);
    expect(heading.classList.contains("min-[360px]:text-3xl")).toBe(true);
    expect(heading.classList.contains("md:text-5xl")).toBe(true);
  });
});
