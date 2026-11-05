/**
 * 記事管理一覧と編集画面のあいだの行き来に使うURL。
 *
 * 一覧の絞り込み・検索・ページはURLのクエリに持っているため、編集画面へ移るときに
 * 一覧のクエリを預け、戻るときに付け直して同じ一覧を出す。
 */

const MANAGE_ARTICLES_PATH = "/articles/manage";

/** 編集画面のURLで、一覧のクエリを預けておくパラメータ名 */
const LIST_QUERY_PARAM = "list";

/**
 * 編集画面のURL。listQueryは一覧のクエリ（先頭の?は無し）。
 * 既定の一覧から来たときは何も預けず、URLを短く保つ
 */
export function toEditArticleHref(
  articleId: number,
  listQuery: string,
): string {
  const path = `/articles/${articleId}/edit`;
  if (!listQuery) return path;

  return `${path}?${new URLSearchParams({ [LIST_QUERY_PARAM]: listQuery })}`;
}

/**
 * 編集画面から一覧へ戻るURL。預かったクエリがあれば付け直す。
 *
 * 行き先のパスは固定し、預かった値はクエリとして読み直してから付けるので、
 * 書き換えられたURLでも一覧以外へは飛ばない
 */
export function toManageArticlesHref(
  editSearchParams: URLSearchParams,
): string {
  const listQuery = editSearchParams.get(LIST_QUERY_PARAM);
  if (!listQuery) return MANAGE_ARTICLES_PATH;

  const query = new URLSearchParams(listQuery).toString();
  return query ? `${MANAGE_ARTICLES_PATH}?${query}` : MANAGE_ARTICLES_PATH;
}
