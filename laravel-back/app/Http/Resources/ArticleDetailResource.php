<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ArticleDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'title'        => $this->title,
            'summary'      => $this->summary,
            'body'         => $this->body,
            'published_at' => $this->published_at,
            'user'         => ['id' => $this->user->id, 'name' => $this->user->name],
            'category'     => ['id' => $this->category->id, 'name' => $this->category->name],
            'tags'         => $this->tags->map(fn($tag) => ['id' => $tag->id, 'name' => $tag->name]),
            'like_count'   => $this->like_count,
            'images'       => $this->images->map(
                fn($img) => ['id' => $img->id, 'url' => $img->url, 'type' => $img->type]
            ),
        ];
    }
}
