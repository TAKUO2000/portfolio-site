<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 編集者向けの記事表現。編集フォームをそのまま復元できる形で返す。
 * 読者向けの公開記事はArticleDetailResourceを使う
 */
class ArticleEditResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'title'        => $this->title,
            'summary'      => $this->summary,
            'body'         => $this->body,
            'status'       => $this->status,
            'published_at' => $this->published_at,
            'category'     => ['id' => $this->category->id, 'name' => $this->category->name],
            'tags'         => $this->tags->map(fn($tag) => ['id' => $tag->id, 'name' => $tag->name]),
            // リクエストのheader_image_url / body_image_urlsと対になる形で返す。
            // ロード済みのimagesから振り分けるので追加クエリは発生しない
            'header_image_url' => $this->images->firstWhere('type', 'header')?->url,
            'body_image_urls'  => $this->images->where('type', 'body')->pluck('url')->values(),
        ];
    }
}
