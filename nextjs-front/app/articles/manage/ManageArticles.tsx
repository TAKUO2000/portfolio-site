"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import CategoryBox from "@/app/components/ui/CategoryBox";
import ConfirmDeleteModal from "@/app/components/ui/ConfirmDeleteModal";
import FittedTagList from "@/app/components/ui/FittedTagList";
import NormalButton from "@/app/components/ui/NormalButton";
import Pagination from "@/app/components/ui/Pagination";
import Toast, { type ToastNotice } from "@/app/components/ui/Toast";
import { getCurrentUser } from "@/app/auth/authClient";
import { formatPublishedDate } from "@/app/lib/formatDate";
import type { MyArticle, MyArticleIndexResponse } from "@/app/types/models";
import {
  MyArticleApiError,
  deleteMyArticle,
  fetchMyArticles,
  updateMyArticleStatus,
} from "@/app/lib/myArticles";

/** 1ページに並べる件数。APIにはper_pageとして渡す */
const PER_PAGE = 5;

type StatusFilter = "all" | MyArticle["status"];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "published", label: "公開" },
  { value: "draft", label: "非公開" },
];

/** 絞り込み・検索・ページ。リロードや戻る操作でも残るよう、URLのクエリを正とする */
interface ListQuery {
  status: StatusFilter;
  keyword: string;
  page: number;
}

/** 手で書き換えられたURLでも壊れないよう、知らない値は既定値に倒す */
function parseListQuery(params: URLSearchParams): ListQuery {
  const status = params.get("status");
  const page = Number(params.get("page"));

  return {
    status: status === "published" || status === "draft" ? status : "all",
    keyword: params.get("keyword")?.trim() ?? "",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** 既定値のものはクエリに載せず、URLを短く保つ */
function toQueryString({ status, keyword, page }: ListQuery): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (keyword) params.set("keyword", keyword);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * APIが返した失敗は画面向けの文言をそのまま出す。通信自体の失敗（TypeError）などは
 * ブラウザの英語の文言になるため、呼び出し側の文言に置き換える。
 */
function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof MyArticleApiError ? error.message : fallback;
}

/**
 * 通知を出すときのstate更新。idを前の通知から数え上げ、同じ文言が続いても
 * 出し直したと分かるようにする（Toastが自動で消すまでの時間を数え直す）
 */
function nextNotice(type: ToastNotice["type"], message: string) {
  return (prev: ToastNotice | null): ToastNotice => ({
    type,
    message,
    id: (prev?.id ?? 0) + 1,
  });
}

/** 別のタブで削除済みなど、対象がもう無いときは一覧が古いので取り直す */
function isGone(error: unknown): boolean {
  return error instanceof MyArticleApiError && error.status === 404;
}

export default function ManageArticles() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = parseListQuery(searchParams);
  const { status, keyword, page } = query;

  const [isAuthorized, setIsAuthorized] = useState(false);

  const [response, setResponse] = useState<MyArticleIndexResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // 切り替え・削除のあとに一覧を取り直すためのきっかけ。値そのものに意味はない
  const [reloadKey, setReloadKey] = useState(0);

  // 通信中の行。同じ行への操作が重ならないようにする
  const [busyArticleId, setBusyArticleId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MyArticle | null>(null);

  const [notice, setNotice] = useState<ToastNotice | null>(null);
  // 初回の取得に失敗したとき、一覧の欄を「読み込み中」のまま残さないために持つ
  const [hasLoadFailed, setHasLoadFailed] = useState(false);

  // ログイン済みかつroleがadminのユーザーのみアクセス可能。それ以外はトップへ戻す
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

  useEffect(() => {
    if (!isAuthorized) return;
    let isActive = true;

    (async () => {
      setIsLoading(true);
      try {
        const result = await fetchMyArticles({
          status: status === "all" ? undefined : status,
          keyword,
          page,
          perPage: PER_PAGE,
        });
        if (!isActive) return;

        // 削除で件数が減り、今いるページが無くなったときは最後のページへ移る
        if (result.data.length === 0 && page > result.meta.last_page) {
          router.replace(
            `/articles/manage${toQueryString({ status, keyword, page: result.meta.last_page })}`,
          );
          return;
        }
        setResponse(result);
        setHasLoadFailed(false);
      } catch (error) {
        if (!isActive) return;
        setHasLoadFailed(true);
        setNotice(
          nextNotice(
            "error",
            toErrorMessage(
              error,
              "記事一覧の取得に失敗しました。ページを再読み込みしてください。",
            ),
          ),
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    })();

    // 絞り込みを素早く切り替えたとき、古い応答で一覧を上書きしないようにする
    return () => {
      isActive = false;
    };
  }, [isAuthorized, status, keyword, page, reloadKey, router]);

  /** 絞り込み・検索・ページの変更。履歴に残し、戻る操作で前の一覧に戻れるようにする */
  function changeQuery(next: Partial<ListQuery>) {
    // ページ以外を変えたときは、結果の件数が変わるので1ページ目から出す
    const merged = { ...query, page: 1, ...next };
    router.push(`/articles/manage${toQueryString(merged)}`);
  }

  async function handleToggleStatus(target: MyArticle) {
    if (busyArticleId !== null) return;

    const nextStatus = target.status === "published" ? "draft" : "published";
    setBusyArticleId(target.id);
    try {
      await updateMyArticleStatus(target.id, nextStatus);
      setNotice(
        nextNotice(
          "success",
          `「${target.title}」を${nextStatus === "published" ? "公開" : "非公開にし"}ました`,
        ),
      );
      // 絞り込み中の一覧から外れたり件数が変わったりするため、手元で直さず取り直す
      setReloadKey((key) => key + 1);
    } catch (error) {
      setNotice(
        nextNotice(
          "error",
          toErrorMessage(error, "公開状態の切り替えに失敗しました。"),
        ),
      );
      if (isGone(error)) setReloadKey((key) => key + 1);
    } finally {
      setBusyArticleId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || busyArticleId !== null) return;

    setBusyArticleId(deleteTarget.id);
    try {
      await deleteMyArticle(deleteTarget.id);
      setNotice(
        nextNotice("success", `「${deleteTarget.title}」を削除しました`),
      );
      setReloadKey((key) => key + 1);
    } catch (error) {
      setNotice(
        nextNotice(
          "error",
          toErrorMessage(error, "記事の削除に失敗しました。"),
        ),
      );
      if (isGone(error)) setReloadKey((key) => key + 1);
    } finally {
      setBusyArticleId(null);
      // 失敗したときも閉じて、モーダルの裏に出たエラーの通知を見えるようにする
      setDeleteTarget(null);
    }
  }

  if (!isAuthorized) {
    return null;
  }

  const articles = response?.data ?? [];
  const counts = response?.meta.status_counts;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">記事管理</h1>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex gap-2"
          role="group"
          aria-label="ステータスで絞り込む"
        >
          {STATUS_FILTERS.map(({ value, label }) => (
            <NormalButton
              key={value}
              color={status === value ? "green" : "white"}
              buttonLabel={counts ? `${label} (${counts[value]})` : label}
              onClick={() => changeQuery({ status: value })}
            />
          ))}
        </div>
        {/* 入力のたびにAPIを叩かないよう、Enterか検索ボタンで確定したときだけ検索する。
            戻る操作でURLのkeywordが変わったときに入力欄も揃うよう、keyで作り直している */}
        <form
          key={keyword}
          role="search"
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const input = new FormData(e.currentTarget).get("keyword");
            changeQuery({ keyword: String(input ?? "").trim() });
          }}
        >
          <input
            type="search"
            name="keyword"
            defaultValue={keyword}
            placeholder="タイトルで検索"
            aria-label="タイトルで検索"
            className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm sm:w-64"
          />
          {/* NormalButtonはtype未指定のbuttonなので、form内ではsubmitとして働く */}
          <NormalButton buttonLabel="検索" />
        </form>
      </div>

      {/* 取り直している間も前の一覧は残し、薄くして操作中であることだけ示す */}
      <div
        aria-busy={isLoading}
        className={`transition-opacity ${isLoading ? "opacity-60" : ""}`}
      >
        {response === null ? (
          <p className="py-16 text-center text-sm text-gray-500">
            {hasLoadFailed ? "記事一覧を表示できませんでした" : "読み込み中..."}
          </p>
        ) : articles.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {articles.map((article) => (
              <li key={article.id}>
                <ManageArticleRow
                  article={article}
                  isBusy={busyArticleId === article.id}
                  onToggleStatus={() => handleToggleStatus(article)}
                  onDelete={() => setDeleteTarget(article)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-white py-16 text-center text-sm text-gray-500 ring-1 ring-black/5">
            該当する記事がありません
          </p>
        )}
      </div>

      {response && (
        <div className="mt-8">
          <Pagination
            currentPage={response.meta.current_page}
            lastPage={response.meta.last_page}
            onChange={(next) => changeQuery({ page: next })}
          />
        </div>
      )}

      <Toast notice={notice} onClose={() => setNotice(null)} />

      <ConfirmDeleteModal
        targetTitle={deleteTarget?.title ?? null}
        isDeleting={deleteTarget !== null && busyArticleId === deleteTarget.id}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}

interface ManageArticleRowProps {
  article: MyArticle;
  /** この行の操作が通信中か。二重に送らないよう、その間はボタンを止める */
  isBusy: boolean;
  onToggleStatus: () => void;
  onDelete: () => void;
}

/**
 * 記事管理画面の1行。
 *
 * 行の中に公開切り替えや削除のボタンを置くため、行全体をリンクにはせず
 * サムネイルとタイトルだけを編集画面へのリンクにしている（リンクの中にボタンは置けない）。
 */
function ManageArticleRow({
  article,
  isBusy,
  onToggleStatus,
  onDelete,
}: ManageArticleRowProps) {
  const editHref = `/articles/${article.id}/edit`;
  const isPublished = article.status === "published";

  return (
    // 概要は省略せず全文を出すため、行の高さは中身に合わせて伸びる。
    // 伸びたときにサムネイルが縦中央へ浮かないよう上揃えにしている
    <article className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:flex-row sm:items-start">
      <Link
        href={editHref}
        className="relative aspect-16/10 w-full shrink-0 overflow-hidden rounded-lg bg-black transition-opacity hover:opacity-80 sm:w-36"
        tabIndex={-1}
        aria-hidden
      >
        {article.header_image && (
          <Image
            src={article.header_image}
            alt=""
            fill
            sizes="144px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        {/* CategoryBoxとTagBoxは自前で右マージンを持つので、gapは付けない */}
        <div className="mb-1.5 flex items-center">
          <CategoryBox
            category={article.category.name}
            id={article.category.id}
          />
          <FittedTagList tags={article.tags} />
        </div>
        <h2 className="truncate text-lg font-bold leading-snug">
          <Link href={editHref} className="hover:underline">
            {article.title}
          </Link>
        </h2>
        {/* 概要が空でも1行分の高さは確保し、行の最低の高さを保つ */}
        <p className="mt-1 min-h-[1lh] text-sm break-words whitespace-pre-line text-gray-700">
          {article.summary}
        </p>
        <p className="mt-1.5 text-xs text-gray-500">
          {[
            `更新 ${formatPublishedDate(article.updated_at)}`,
            article.published_at &&
              `公開 ${formatPublishedDate(article.published_at)}`,
          ]
            .filter(Boolean)
            .join(" ・ ")}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-gray-100 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
        <StatusToggle
          isPublished={isPublished}
          disabled={isBusy}
          onToggle={onToggleStatus}
        />
        <div className="flex gap-2">
          <NormalButton buttonLabel="編集" href={editHref} />
          <NormalButton
            color="red"
            buttonLabel="削除"
            onClick={onDelete}
            disabled={isBusy}
          />
        </div>
      </div>
    </article>
  );
}

/**
 * 公開状態の表示と切り替えを兼ねるボタン。押した時点で公開⇔非公開(下書き)が切り替わる。
 *
 * 状態のバッジとスイッチを別々に置くと、同じ情報が2か所に出て視線が散るため1つにまとめている。
 */
function StatusToggle({
  isPublished,
  disabled,
  onToggle,
}: {
  isPublished: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPublished}
      aria-label="公開"
      title={isPublished ? "押すと非公開にします" : "押すと公開します"}
      onClick={onToggle}
      disabled={disabled}
      className={`flex cursor-pointer items-center disabled:cursor-not-allowed disabled:opacity-50 gap-2 rounded-full py-1 pr-3 pl-1 text-xs font-semibold transition-colors ${
        isPublished
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "border border-dashed border-gray-400 text-gray-600 hover:bg-gray-100"
      }`}
    >
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${isPublished ? "bg-green-600" : "bg-gray-300"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPublished ? "translate-x-4" : ""}`}
        />
      </span>
      {/* 幅が状態で変わると隣のボタンがずれるため、長い方の「非公開」に揃える */}
      <span className="min-w-[3em] text-left">
        {isPublished ? "公開" : "非公開"}
      </span>
    </button>
  );
}
