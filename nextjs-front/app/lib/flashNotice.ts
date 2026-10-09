"use client";

import type { ToastNotice } from "@/app/components/ui/Toast";

const STORAGE_KEY = "flashNotice";

/**
 * 画面を移ったあとに出す通知。
 *
 * 編集画面で記事を削除したら一覧へ戻るが、削除した結果は戻った先で伝えたい。
 * URLに載せるとリロードのたびに出てしまうため、sessionStorageに1回分だけ置く。
 */
export function setFlashNotice(type: ToastNotice["type"], message: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ type, message }));
  } catch {
    // プライベートモードなどで保存できなくても、通知が出ないだけで操作には響かない
  }
}

/** 置かれていた通知を取り出して消す。無ければnull */
export function takeFlashNotice(): ToastNotice | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);

    const { type, message } = JSON.parse(raw);
    if ((type !== "success" && type !== "error") || typeof message !== "string")
      return null;
    return { type, message, id: 1 };
  } catch {
    return null;
  }
}
