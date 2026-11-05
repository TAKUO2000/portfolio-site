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
      <p className="text-7xl font-extrabold mb-3">404</p>
      <h1 className="text-2xl font-bold mb-3">ページが見つかりませんでした</h1>
      <p className="text-lg text-[#010101] mb-8">
        URLが間違っているか、ページが移動・削除された可能性があります。
      </p>
      <div className="mt-12 flex flex-wrap justify-center gap-4 sm:gap-10">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-black text-white text-base px-6 sm:px-10 py-4 hover:opacity-70 transition-opacity"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
