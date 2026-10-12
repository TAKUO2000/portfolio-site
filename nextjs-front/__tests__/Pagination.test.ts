import { describe, expect, it } from "vitest";
import { getPageItems } from "@/app/components/ui/Pagination";

describe("getPageItems", () => {
  it("先頭にいるときは先頭3ページと最終ページを出す", () => {
    expect(getPageItems(1, 12)).toEqual([1, 2, 3, "ellipsis", 12]);
  });

  it("途中にいるときは前後1ページを出し、両側を詰める", () => {
    expect(getPageItems(6, 12)).toEqual([
      1,
      "ellipsis",
      5,
      6,
      7,
      "ellipsis",
      12,
    ]);
  });

  it("末尾にいるときは先頭ページと末尾3ページを出す", () => {
    expect(getPageItems(12, 12)).toEqual([1, "ellipsis", 10, 11, 12]);
  });

  it("1ページ分しか隠さない「…」は番号にする", () => {
    expect(getPageItems(3, 12)).toEqual([1, 2, 3, 4, "ellipsis", 12]);
  });

  it("ページが少ないときは全ページを出す", () => {
    expect(getPageItems(1, 1)).toEqual([1]);
    expect(getPageItems(1, 2)).toEqual([1, 2]);
    expect(getPageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});
