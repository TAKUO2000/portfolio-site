"use client";

import { useLayoutEffect, useRef, useState } from "react";

import ThreeDots from "@/public/ThreeDots.svg";
import TagBox from "@/app/components/ui/TagBox";
import type { Tag } from "@/app/types/models";

interface FittedTagListProps {
  tags: Tag[];
  /** 並べる上限。超えた分は「…」にまとめる */
  max?: number;
}

/**
 * タグを1行に収まる分だけ並べ、入りきらない分と上限を超えた分は「…」で省略する。
 *
 * 何個入るかはタグ名の長さと置き場所の幅で変わるため、CSSだけでは決められない。
 * 見えない行に上限までのタグを並べて幅を測り、収まる個数だけを表の行に出している。
 */
export default function FittedTagList({ tags, max = 5 }: FittedTagListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const ellipsisRef = useRef<HTMLSpanElement>(null);

  const candidates = tags.slice(0, max);
  const [visibleCount, setVisibleCount] = useState(candidates.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    const ellipsis = ellipsisRef.current;
    if (!container || !measure || !ellipsis) return;

    function fit() {
      const available = container!.clientWidth;
      const ellipsisWidth = ellipsis!.offsetWidth;
      // 測定用の行は絶対配置なので、子のoffsetLeftはその行の左端からの距離になる
      // 「…」はタグの右マージンの外側に並ぶので、マージン込みの右端で測る
      const rightEdges = Array.from(
        measure!.children as HTMLCollectionOf<HTMLElement>,
      ).map(
        (el) =>
          el.offsetLeft +
          el.offsetWidth +
          parseFloat(getComputedStyle(el).marginRight),
      );

      let count = rightEdges.length;
      // 末尾から1つずつ減らし、「…」を付けても収まる個数を探す
      while (count > 0) {
        const needsEllipsis = count < tags.length;
        const width =
          rightEdges[count - 1] + (needsEllipsis ? ellipsisWidth : 0);
        // 末尾のタグの右マージンははみ出しても見えないので、「…」が無ければ数えない
        const margin = needsEllipsis
          ? 0
          : parseFloat(
              getComputedStyle(measure!.children[count - 1]).marginRight,
            );
        if (width - margin <= available) break;
        count--;
      }
      setVisibleCount(count);
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);

    return () => observer.disconnect();
  }, [tags]);

  if (tags.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap"
    >
      <div
        ref={measureRef}
        aria-hidden
        className="invisible absolute top-0 left-0 flex items-center whitespace-nowrap"
      >
        {candidates.map((tag) => (
          <TagBox key={tag.id} tag={tag.name} id={tag.id} />
        ))}
      </div>
      <span
        ref={ellipsisRef}
        aria-hidden
        className="invisible absolute flex items-center text-gray-500"
      >
        <ThreeDots className="h-5 w-5" />
      </span>

      {candidates.slice(0, visibleCount).map((tag) => (
        <TagBox key={tag.id} tag={tag.name} id={tag.id} />
      ))}
      {visibleCount < tags.length && (
        // 省略したタグ名はホバーで確認できるようにする
        <span
          className="flex shrink-0 items-center text-gray-500"
          title={tags
            .slice(visibleCount)
            .map((tag) => tag.name)
            .join(", ")}
        >
          <ThreeDots className="h-5 w-5" />
        </span>
      )}
    </div>
  );
}
