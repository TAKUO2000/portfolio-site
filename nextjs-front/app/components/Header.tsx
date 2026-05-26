export default function Header() {
  return (
    <header className="w-full bg-black text-white">
      <nav className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <ul className="flex gap-8">
          <li>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity">
              投稿テキスト
            </a>
          </li>
          <li>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity">
              投稿テキスト
            </a>
          </li>
          <li>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity">
              投稿テキスト
            </a>
          </li>
          <li>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity">
              投稿テキスト
            </a>
          </li>
        </ul>
        <ul className="flex gap-8">
          <li>
            <a href="#" className="text-sm hover:opacity-70 transition-opacity">
              サインイン
            </a>
          </li>
          <li>
            <a
              href="#"
              className="text-sm hover:opacity-70 transition-opacity "
            >
              ログイン
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
