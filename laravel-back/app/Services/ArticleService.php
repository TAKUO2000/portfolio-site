<?php

namespace App\Services;

use App\Models\Article;
use App\Models\User;
use Illuminate\Support\Carbon;

class ArticleService
{
    public function store(User $user, array $data): Article
    {
        $article = $user->articles()->create([
            'category_id'  => $data['category_id'],
            'title'        => $data['title'],
            'summary'      => $data['summary'],
            'body'         => $data['body'],
            'status'       => $data['status'],
            'published_at' => $data['status'] === 'published' ? Carbon::now() : null,
        ]);

        if (!empty($data['tags'])) {
            $article->tags()->sync($data['tags']);
        }

        return $article->load('tags');
    }
}
