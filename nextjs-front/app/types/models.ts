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

export interface ArticleIndexResponse {
  data: ArticleSummary[];
  links: PaginationLinks;
  meta: PaginationMeta;
}
