<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ArticleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'title'        => $this->title,
            'summary'      => $this->summary,
            'header_image' => $this->headerImage?->url ?? 'https://takuo-portfolio-develop-bucket-533267285352-ap-northeast-1-an.s3.ap-northeast-1.amazonaws.com/test.png',
            'published_at' => $this->published_at,
            'user'         => ['id' => $this->user->id, 'name' => $this->user->name],
            'category'     => ['id' => $this->category->id, 'name' => $this->category->name],
            'tags'         => $this->tags->map(fn($tag) => ['id' => $tag->id, 'name' => $tag->name]),
            'like_count'   => $this->like_count,
        ];
    }
}
