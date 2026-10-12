export interface Tag {
  id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
}

export interface Category {
  id: number;
  name: string;
}

export interface PendingImage {
  blobUrl: string;
  file: File;
}

/** 記事の保存API(POST/PUT)が返す、編集フォームを復元できる形の記事 */
export interface ArticleEdit {
  id: number;
  title: string;
  summary: string;
  body: string;
  status: "draft" | "published";
  published_at: string | null;
  category: Category;
  tags: Tag[];
  /** 本置き場のヘッダー画像キー。次の更新でそのまま送り返す */
  header_image_key: string | null;
  header_image_url: string | null;
}

/** 記事一覧APIが返す記事。本文は含まれない */
export interface ArticleSummary {
  id: number;
  title: string;
  summary: string;
  header_image: string | null;
  published_at: string;
  /** idは著者ページに飛ぶ際に使用予定。現在は不要だが取得している */
  user: Pick<User, "id" | "name">;
  category: Category;
  tags: Tag[];
  like_count: number;
}

/** 記事管理画面の一覧APIが返す記事。下書きも含み、本文は含まれない */
export interface MyArticle {
  id: number;
  title: string;
  summary: string;
  status: "draft" | "published";
  /** 一度も公開していない下書きはnull */
  published_at: string | null;
  updated_at: string;
  category: Category;
  tags: Tag[];
  header_image: string | null;
}

export interface PaginationLinks {
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** 記事管理画面のステータス別の件数。keywordは反映し、statusでは絞らない */
export interface MyArticleStatusCounts {
  all: number;
  published: number;
  draft: number;
}

export interface MyArticleIndexResponse {
  data: MyArticle[];
  links: PaginationLinks;
  meta: PaginationMeta & { status_counts: MyArticleStatusCounts };
}

export interface ArticleIndexResponse {
  data: ArticleSummary[];
  links: PaginationLinks;
  meta: PaginationMeta;
}
