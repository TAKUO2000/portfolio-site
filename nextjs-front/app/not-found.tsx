import type { Metadata } from "next";

import NotFoundHero from "./components/NotFoundHero";

export const metadata: Metadata = {
  title: "ページが見つかりません",
};

/**
 * notFound()が呼ばれたときと、どのルートにも一致しないURLに来たときに表示する。
 *
 * 行き先はNotFoundHeroのボタンで足りるので、HeaderとFooterは置かない。
 * Headerはログイン状態をAPIに問い合わせるため、置かないぶん軽く壊れにくくなる。
 */
export default function NotFound() {
  return (
    <main>
      <NotFoundHero />
    </main>
  );
}
