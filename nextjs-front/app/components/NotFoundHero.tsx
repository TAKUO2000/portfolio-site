import Link from "next/link";

/**
 * 存在しないURLに来た人を、Topページと同じ見た目のまま主要ページへ案内する。
 *
 * 早く別のページへ移ってもらうためのページなので、Heroにある3Dの手は置かず軽く保つ。
 */
export default function NotFoundHero() {
  const navLinks = [
    { href: "/", label: "トップへ戻る" },
    { href: "/articles", label: "記事一覧を見る" },
  ];

  return (
    <section className="bg-[#f4f1eb] text-center py-24 px-6 min-h-screen flex flex-col items-center justify-center">
      <p className="mb-4 font-pixel text-[80px] leading-none font-bold md:text-8xl">
        404
      </p>
      <h1 className="mb-3 text-[22px] leading-tight font-bold md:text-2xl">
        ページが見つかりませんでした
      </h1>
      <p className="text-lg text-[#010101] mb-8">
        URLが間違っているか、ページが移動・削除された可能性があります。
      </p>
      {/* ボタンの枠と影は外側にはみ出す（右と下は 8px）ので、その分より広く間を空ける */}
      <div className="mt-12 flex flex-wrap justify-center gap-x-5 gap-y-6 sm:gap-10">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="pixel-card pixel-press bg-foreground px-6 py-4 text-base text-white [--pixel-c:var(--color-foreground)] sm:px-10"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
