/**
 * 認証の6ページ（ログイン・サインアップ・パスワードの再設定・メールアドレスの確認）で共有する見た目。
 * 枠は box-shadow で描く（globals.css の pixel-*）。Tailwindはソース中の文字列からクラスを拾うため、組み立てずに書き切る
 */

export const AUTH_FORM = "flex flex-col gap-5.5";

export const AUTH_LABEL = "flex flex-col gap-2.5 text-sm text-neutral-800";

/** 入力欄。フォーカス中は枠の色を濃くする（リングは枠と同じ box-shadow を使うので併用できない） */
export const AUTH_INPUT =
  "pixel-border-2 h-11 bg-white px-3 text-base outline-none [--pixel-c:var(--color-neutral-300)] focus:[--pixel-c:var(--color-neutral-950)]";

/** 送信のボタンと、同じ見た目のリンク。黒地 + 茶色の影で、ホバーで押し込む（無効のときは動かさない） */
export const AUTH_SUBMIT =
  "pixel-card pixel-press flex h-11 cursor-pointer items-center justify-center bg-neutral-950 px-4 text-sm text-white [--pixel-c:var(--color-neutral-950)] disabled:cursor-not-allowed disabled:bg-neutral-400 disabled:[--pixel-c:var(--color-neutral-400)]";

export const AUTH_ERROR =
  "pixel-border-2 bg-red-50 px-3 py-2 text-sm text-red-700 [--pixel-c:var(--color-red-200)]";

export const AUTH_SUCCESS =
  "pixel-border-2 bg-green-50 px-3 py-2 text-sm text-green-700 [--pixel-c:var(--color-green-200)]";

/** 文中や下に置くリンク。狭い幅でも、リンクの途中では折り返さない（「ログ／イン」のように切れないように） */
export const AUTH_LINK =
  "whitespace-nowrap text-neutral-950 underline decoration-2 underline-offset-4";
