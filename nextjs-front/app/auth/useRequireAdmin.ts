"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getCurrentUser } from "@/app/auth/authClient";

/**
 * ログイン済みかつroleがadminのユーザーだけが開ける画面で使う。
 * それ以外のユーザーはトップへ戻し、確認が済むまではfalseを返す。
 */
export function useRequireAdmin(): boolean {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isActive = true;

    getCurrentUser().then((user) => {
      if (!isActive) return;
      if (user?.role === "admin") {
        setIsAuthorized(true);
      } else {
        router.replace("/");
      }
    });

    return () => {
      isActive = false;
    };
  }, [router]);

  return isAuthorized;
}
