"use client";

import Plus from "@/public/Plus.svg";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { API_BASE_URL, getCsrfToken, getCurrentUser } from "../auth/authClient";
import type { User } from "@/app/types/models";

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
    return <div className="min-h-5 min-w-32" aria-hidden="true" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-6">
        <span className="max-w-36 truncate text-sm font-semibold">
          {user.name}
        </span>
        <button
          className="text-sm transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          ログアウト
        </button>

        {user.role === "admin" && (
          <Link
            href="/articles/new"
            className="text-sm transition-opacity hover:opacity-70 bg-white text-black rounded-4xl px-3 py-1 flex items-center"
          >
            <Plus className="h-4 w-4 shrink-0 border bg-black text-white rounded-2xl mr-2" />
            <span>記事投稿</span>
          </Link>
        )}
      </div>
    );
  }

  return (
    <ul className="flex gap-8">
      <li>
        <Link
          href="/auth/sign-up"
          className="text-sm transition-opacity hover:opacity-70"
        >
          サインアップ
        </Link>
      </li>
      <li>
        <Link
          href="/auth/sign-in"
          className="text-sm transition-opacity hover:opacity-70"
        >
          ログイン
        </Link>
      </li>
    </ul>
  );
}
