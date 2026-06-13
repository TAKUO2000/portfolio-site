<?php

namespace App\Services;

use App\Models\Article;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
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


    public function index(array $data): LengthAwarePaginator
    {
        $query = Article::query()->where('status', 'published');

        if (!empty($data['keyword'])) {
            //記事件数が増えたら検索エンジンの導入検討
            $query->where('title', 'like', '%' . $data['keyword'] . '%');
        }

        if (!empty($data['categories'])) {
            $query->whereIn('category_id', $data['categories']);
        }

        if (!empty($data['tags'])) {
            $query->whereHas('tags', fn($q) => $q->whereIn('tags.id', $data['tags']));
        }

        if (!empty($data['author_id'])) {
            $query->where('user_id', $data['author_id']);
        }

        // nullの場合最近
        //最近、人気、以外のソートタイプ追加するかも
        if (empty($data['sort']) || $data['sort'] === 'latest') {
            $query->orderByDesc('published_at');
        } else if ($data['sort'] === 'popular') {
            $query->withCount('reactions')->orderByDesc('reactions_count');
        }

        return $query->with(['user', 'category', 'tags'])
            ->paginate($data['per_page'] ?? 15);
    }
}
