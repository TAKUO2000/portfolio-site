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
            // ヘッダー画像はリクエストのheader_image_keyと対になるキーと、表示用URLの両方を返す。
            // 本文画像はbodyにURLが含まれているため別途返さない
            'header_image_key' => $this->images->firstWhere('type', 'header')?->object_key,
            'header_image_url' => $this->images->firstWhere('type', 'header')?->url,
        ];
    }
}
