"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import GoodIcon from "@/public/good_outline.svg";
import {
  fetchLikeStatus,
  setLike,
  type LikeStatus,
} from "@/app/lib/articleLike";

interface ArticleActionButtonsProps {
  articleId: number;
  likeCount: number;
}

// Bad・保存ボタンはAPIが無く押しても何も起きないため、実装されるまで出さない
export default function ArticleActionButtons({
  articleId,
  likeCount,
}: ArticleActionButtonsProps) {
  const [like, setLikeState] = useState<LikeStatus>({
    liked: false,
    like_count: likeCount,
  });
  // 自分がいいね済みか分かるまでは押せない。未ログインはnull
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<"login" | "error" | null>(null);

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
    } catch {
      setLikeState(previous);
      setMessage("error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="border rounded p-4 text-sm text-gray-500">
      <p className="font-semibold mb-3 text-center text-xs">この記事は？</p>
      <div className="flex justify-around items-center">
        <button
          type="button"
          className="flex flex-col items-center gap-1.5 group cursor-pointer disabled:cursor-wait"
          onClick={handleLike}
          disabled={isLoggedIn === null || isSending}
          aria-pressed={like.liked}
          aria-label={like.liked ? "いいねを取り消す" : "いいねする"}
        >
          <span
            className={clsx(
              "w-10 h-10 flex items-center justify-center rounded-full border transition-all duration-150 active:scale-95",
              like.liked
                ? "border-blue-400 text-blue-500 bg-blue-50"
                : "border-gray-300 text-gray-400 group-hover:border-blue-400 group-hover:text-blue-500 group-hover:bg-blue-50",
            )}
          >
            <GoodIcon className="w-5 h-5" />
          </span>
          <span
            className={clsx(
              "text-xs transition-colors duration-150",
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
      {message === "error" && (
        <p className="mt-3 text-center text-xs text-red-500" role="alert">
          いいねできませんでした。時間をおいてもう一度お試しください。
        </p>
      )}
    </div>
  );
}
