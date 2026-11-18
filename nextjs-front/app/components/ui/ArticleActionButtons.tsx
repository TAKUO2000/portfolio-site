"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EmailNotVerifiedError,
  fetchLikeStatus,
  setLike,
  type LikeStatus,
} from "@/app/lib/articleLike";

interface ArticleActionButtonsProps {
  articleId: number;
  likeCount: number;
  className?: string;
}

// Bad・保存ボタンはAPIが無く押しても何も起きないため、実装されるまで出さない
export default function ArticleActionButtons({
  articleId,
  likeCount,
  className,
}: ArticleActionButtonsProps) {
  const [like, setLikeState] = useState<LikeStatus>({
    liked: false,
    like_count: likeCount,
  });
  // 自分がいいね済みか分かるまでは押せない。未ログインはnull
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<"login" | "verify" | "error" | null>(
    null,
  );

  useEffect(() => {
    let isActive = true;

    fetchLikeStatus(articleId)
      .then((status) => {
        if (!isActive) return;
        setIsLoggedIn(status !== null);
        if (status) setLikeState(status);
      })
      .catch(() => {
        // 状態が取れなくても件数はSSRの値で出せるので、押せる状態にだけしておく
        if (isActive) setIsLoggedIn(true);
      });

    return () => {
      isActive = false;
    };
  }, [articleId]);

  async function handleLike() {
    if (isLoggedIn === false) {
      setMessage("login");
      return;
    }

    const previous = like;
    const nextLiked = !previous.liked;
    // 押した手応えを返すため、APIの応答を待たずに画面を先に変える
    setLikeState({
      liked: nextLiked,
      // 件数は他の人の操作でずれ得るので、先に変える値は0未満にしない
      like_count: Math.max(0, previous.like_count + (nextLiked ? 1 : -1)),
    });
    setMessage(null);
    setIsSending(true);

    try {
      setLikeState(await setLike(articleId, nextLiked));
    } catch (error) {
      setLikeState(previous);
      setMessage(error instanceof EmailNotVerifiedError ? "verify" : "error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    // md未満は画面下のバーに入るので、枠と見出しを外して小さく出す
    <div
      className={clsx(
        "text-sm text-gray-500 md:pixel-border-2 md:p-4 md:[--pixel-c:var(--color-gray-500)]",
        className,
      )}
    >
      <p className="hidden md:block font-semibold mb-3 text-center text-xs">
        この記事は？
      </p>
      <div className="flex justify-around items-center">
        <button
          type="button"
          className="group flex cursor-pointer flex-row items-center gap-2.5 disabled:cursor-wait md:flex-col md:gap-2"
          onClick={handleLike}
          disabled={isLoggedIn === null || isSending}
          aria-pressed={like.liked}
          aria-label={like.liked ? "いいねを取り消す" : "いいねする"}
        >
          <span
            className={clsx(
              // 枠の色は --pixel-c で決める（globals.css の pixel-border-2）
              "pixel-border-2 flex size-10 items-center justify-center",
              like.liked
                ? "bg-blue-50 text-blue-500 [--pixel-c:var(--color-blue-400)]"
                : "bg-white text-gray-400 [--pixel-c:var(--color-gray-300)] group-hover:bg-blue-50 group-hover:text-blue-500 group-hover:[--pixel-c:var(--color-blue-400)]",
            )}
          >
            {/* ドット絵の「いいね」（11マス四方）。線がにじまないよう crispEdges で描く */}
            <svg
              viewBox="0 0 11 11"
              shapeRendering="crispEdges"
              className="size-5"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M5 0h2v2h-2zM4 2h3v1h-3zM4 3h2v1h-2zM0 4h2v6h-2zM3 4h7v1h-7zM3 5h8v2h-8zM3 7h7v2h-7zM3 9h6v1h-6z"
              />
            </svg>
          </span>
          <span
            className={clsx(
              "font-pixel text-xs",
              like.liked
                ? "text-blue-500"
                : "text-gray-400 group-hover:text-blue-500",
            )}
          >
            good:{like.like_count}
          </span>
        </button>
      </div>

      {message === "login" && (
        <p className="mt-3 text-center text-xs">
          いいねするには
          <Link href="/auth/sign-in" className="text-blue-500 underline">
            ログイン
          </Link>
          してください
        </p>
      )}
      {message === "verify" && (
        <p className="mt-3 text-center text-xs">
          いいねするには
          <Link href="/auth/verify-email" className="text-blue-500 underline">
            メールアドレスを確認
          </Link>
          してください
        </p>
      )}
      {message === "error" && (
        <p className="mt-3 text-center text-xs text-red-500" role="alert">
          いいねできませんでした。時間をおいてもう一度お試しください。
        </p>
      )}
    </div>
  );
}
