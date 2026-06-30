import Link from "next/link";
import HeaderAuthStatus from "./HeaderAuthStatus";

export default function Header() {
  return (
    <header className="w-full bg-black text-white">
      <nav className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <ul className="flex gap-8">
          <li>
            <Link
              href="/"
              className="text-sm hover:opacity-70 transition-opacity"
            >
              ホーム
            </Link>
          </li>
          <li>
            <Link
              href="#"
              className="text-sm hover:opacity-70 transition-opacity"
            >
              投稿テキスト
            </Link>
          </li>
          <li>
            <Link
              href="#"
              className="text-sm hover:opacity-70 transition-opacity"
            >
              投稿テキスト
            </Link>
          </li>
          <li>
            <Link
              href="#"
              className="text-sm hover:opacity-70 transition-opacity"
            >
              投稿テキスト
            </Link>
          </li>
        </ul>
        <HeaderAuthStatus />
      </nav>
    </header>
  );
}
