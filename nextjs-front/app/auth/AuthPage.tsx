interface AuthPageProps {
  /** 見出しの上に出す英字の小見出し（例：Sign in） */
  eyebrow: string;
  title: string;
  /** 見出しの下に出す説明 */
  description?: string;
  children: React.ReactNode;
}

/**
 * 認証のページの枠組み（余白・幅・見出し）。ヘッダーとフッターは置かない。
 * 入力欄やボタンの見た目は authStyles.ts にある
 */
export default function AuthPage({
  eyebrow,
  title,
  description,
  children,
}: AuthPageProps) {
  return (
    // 送信のボタンの枠と影は外側にはみ出す（右と下は 8px）ので、左右の余白はその分より広く取る
    <main className="min-h-screen bg-[#f4f1eb] px-7 py-16 sm:px-6">
      <section className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <div>
          <p className="mb-2 font-pixel text-sm text-neutral-600">{eyebrow}</p>
          <h1 className="text-3xl leading-tight font-bold text-neutral-950">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-neutral-600">{description}</p>
          )}
        </div>
        {children}
      </section>
    </main>
  );
}
