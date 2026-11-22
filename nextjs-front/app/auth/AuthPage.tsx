import Image from "next/image";
import Link from "next/link";

import { AUTH_LINK } from "@/app/auth/authStyles";

interface AuthPageProps {
  /** 見出しの上に出す英字の小見出し（例：Sign in） */
  eyebrow: string;
  title: string;
  /** 見出しの下に出す説明 */
  description?: string;
  children: React.ReactNode;
}

/**
 * 認証のページの枠組み（余白・幅・見出し）。ヘッダーとフッターは置かず、トップへ戻るロゴだけを上に置く。
 * 入力欄やボタンの見た目は authStyles.ts にある
 */
export default function AuthPage({
  eyebrow,
  title,
  description,
  children,
}: AuthPageProps) {
  return (
    // 送信のボタンの枠と影は外側にはみ出す（右と下は 8px）ので、左右の余白はその分より広く取る。
    // 高さは、スマホのアドレスバーを除いた見えている範囲（dvh）に合わせる
    <main className="flex min-h-dvh flex-col bg-[#f4f1eb] px-7 py-3 sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-2 self-center font-pixel text-lg font-bold text-neutral-950"
      >
        {/* ヘッダーと同じドット絵のロゴ。20px の絵を2倍で出す */}
        <Image
          src="/HeaderIconPixel.png"
          alt="" // 隣のサイト名と同じ内容なので読み上げない
          width={40}
          height={40}
          unoptimized
          className="size-10 shrink-0 [image-rendering:pixelated]"
        />
        TAKUO_Log
      </Link>
      {/* 残りの高さの中央に置く。画面が低くて収まらないときは、上から順に並んでスクロールになる */}
      <section className="mx-auto my-auto flex w-full max-w-sm flex-col gap-5 py-3">
        <div>
          {/* ロゴがトップへのリンクだと気づかない人のために、見出しの左上に言葉でも導線を置く */}
          <Link className={`${AUTH_LINK} mb-3 inline-block text-sm`} href="/">
            トップへ戻る＞
          </Link>
          <p className="mb-2 font-pixel text-sm text-neutral-600">{eyebrow}</p>
          <h1 className="text-2xl leading-tight font-bold text-neutral-950">
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
