import { describe, expect, it } from "vitest";
import {
  toEditArticleHref,
  toManageArticlesHref,
} from "@/app/lib/manageArticlesHref";

/** 編集画面のURLから、戻り先の一覧のURLを作る */
function backFrom(editHref: string): string {
  return toManageArticlesHref(
    new URL(editHref, "http://localhost").searchParams,
  );
}

describe("toEditArticleHref", () => {
  it("既定の一覧から来たときは、編集画面のURLに何も付けない", () => {
    expect(toEditArticleHref(3, "")).toBe("/articles/3/edit");
  });

  it("一覧のクエリを1つのパラメータにまとめて預ける", () => {
    expect(toEditArticleHref(3, "status=draft&page=2")).toBe(
      "/articles/3/edit?list=status%3Ddraft%26page%3D2",
    );
  });
});

describe("toManageArticlesHref", () => {
  it("預かった絞り込み・検索・ページを付けて一覧へ戻る", () => {
    const editHref = toEditArticleHref(
      3,
      "status=draft&keyword=Next+%26+React&page=2",
    );

    expect(backFrom(editHref)).toBe(
      "/articles/manage?status=draft&keyword=Next+%26+React&page=2",
    );
  });

  it("何も預かっていなければ既定の一覧へ戻る", () => {
    expect(backFrom("/articles/3/edit")).toBe("/articles/manage");
  });

  it("書き換えられた値でも一覧以外へは飛ばない", () => {
    expect(backFrom("/articles/3/edit?list=%2F%2Fevil.example.com")).toBe(
      "/articles/manage?%2F%2Fevil.example.com=",
    );
  });
});
