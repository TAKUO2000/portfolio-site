<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 記事管理画面の一覧に並べる1件分。
 *
 * 本文は返さない。一覧では使わないうえ、件数が増えると転送量が大きくなるため。
 * 編集画面で必要になった時点でArticleEditResourceを取りに行く。
 */
class MyArticleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'title'        => $this->title,
            'summary'      => $this->summary,
            'status'       => $this->status,
            'published_at' => $this->published_at,
            'updated_at'   => $this->updated_at,
            'category'     => ['id' => $this->category->id, 'name' => $this->category->name],
            'header_image' => $this->headerImage?->url,
        ];
    }
}
