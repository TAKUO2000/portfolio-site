"use client";

import Pencil from "@/public/Pencil.svg";
import Plus from "@/public/Plus.svg";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { tv } from "tailwind-variants";

import { API_BASE_URL, getCsrfToken, getCurrentUser } from "../auth/authClient";
import type { User } from "@/app/types/models";

// 黒いヘッダーの上に置く、白い 2px 枠のボタン。枠は外側にはみ出すので、隣とは 4px より広く空ける
const headerButton = tv({
  base: "pixel-border-2 pixel-press-sm flex shrink-0 items-center px-3.5 py-2.5 text-sm leading-5 whitespace-nowrap [--pixel-c:#fff]",
  variants: {
    filled: {
      true: "bg-white text-foreground",
      false: "text-white",
    },
  },
  defaultVariants: {
    filled: false,
  },
});

export default function HeaderAuthStatus() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isActive = true;

    getCurrentUser().then((currentUser) => {
      if (!isActive) return;
      setUser(currentUser);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const xsrfToken = await getCsrfToken();
      const response = await fetch(`${API_BASE_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrfToken,
        },
      });

      if (response.ok) {
        setUser(null);
        router.push("/");
        router.refresh();
      }
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (isLoading) {
    return <div className="min-h-10 min-w-32" aria-hidden="true" />;
  }

  if (user) {
    return (
      <div className="flex flex-col items-start gap-4.5 md:min-w-0 md:flex-row md:items-center md:gap-5">
        {/* 幅が足りないときは、名前を先に省略する（ボタンは縮めない）。
            管理者はボタンが2つ増えて md〜lg では名前が1文字ほどしか残らないので、その幅では出さない */}
        <span
          className={`max-w-36 truncate text-sm md:min-w-0 ${user.role === "admin" ? "md:max-lg:hidden" : ""}`}
        >
          {user.name}
        </span>
        {user.email_verified === false && (
          <Link
            href="/auth/verify-email"
            className="shrink-0 text-sm underline decoration-2 underline-offset-4"
          >
            メールを確認
          </Link>
        )}
        <button
          className="shrink-0 cursor-pointer font-pixel text-sm hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          Sign out
        </button>

        {user.role === "admin" && (
          <>
            <Link
              href="/articles/new"
              className={headerButton({ filled: true })}
            >
              <Plus className="mr-2 size-4 shrink-0 bg-foreground text-white" />
              <span>記事投稿</span>
            </Link>
            <Link href="/articles/manage" className={headerButton()}>
              <Pencil className="mr-2 size-4 shrink-0" />
              <span>記事管理</span>
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    // 管理者向けの記事投稿・記事管理ボタンと同じ形にそろえ、新規登録の方を塗りで目立たせる
    <ul className="flex flex-col items-start gap-4.5 md:flex-row md:items-center md:gap-4">
      <li>
        <Link
          href="/auth/sign-up"
          className={headerButton({ filled: true, className: "font-pixel" })}
        >
          Sign up
        </Link>
      </li>
      <li>
        <Link
          href="/auth/sign-in"
          className={headerButton({ className: "font-pixel" })}
        >
          Sign in
        </Link>
      </li>
    </ul>
  );
}
