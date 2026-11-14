"use client";

import { useEffect, useState } from "react";

/**
 * メディアクエリに当てはまるかどうか。画面の幅や端末の設定が途中で変わったら追いかける。
 *
 * SSRではmatchMediaが無いので、初期値はfalseにしてマウント後に確定させる
 * （falseのときの見た目・動きを、パソコンの既定に合わせておく）
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}
