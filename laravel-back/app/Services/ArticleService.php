<?php

namespace App\Services;

use App\Models\Article;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ArticleService
{
    public function store(User $user, array $data): Article
    {
        return DB::transaction(function () use ($user, $data) {
            $article = $user->articles()->create([
                'category_id'  => $data['category_id'],
                'title'        => $data['title'],
                'summary'      => $data['summary'],
                'body'         => $data['body'],
                'status'       => $data['status'],
                'published_at' => $data['status'] === 'published' ? Carbon::now() : null,
            ]);

            $tagIds = $data['tags'] ?? [];

            if (!empty($data['new_tags'])) {
                $trimmedNames = array_map('trim', $data['new_tags']);
                $lowerNames = array_map('mb_strtolower', $trimmedNames);

                // 大文字小文字を無視して既存タグを一括取得（N+1回避）
                $placeholders = implode(',', array_fill(0, count($lowerNames), '?'));
                $existingByLower = Tag::whereRaw("LOWER(name) IN ({$placeholders})", $lowerNames)
                    ->get()
                    ->keyBy(fn (Tag $tag) => mb_strtolower($tag->name));

                foreach ($trimmedNames as $name) {
                    $lowerName = mb_strtolower($name);
                    // 見つからなければ入力された表記のまま新規作成し、以降の重複はメモリ上のマップで解決
                    $tag = $existingByLower[$lowerName] ??= Tag::create(['name' => $name]);
                    $tagIds[] = $tag->id;
                }
            }

            if (!empty($tagIds)) {
                $article->tags()->sync($tagIds);
            }

            if (!empty($data['header_image_url'])) {
                $article->images()->create([
                    'url'  => $data['header_image_url'],
                    'type' => 'header',
                ]);
            }

            if (!empty($data['body_image_urls'])) {
                foreach ($data['body_image_urls'] as $url) {
                    $article->images()->create([
                        'url'  => $url,
                        'type' => 'body',
                    ]);
                }
            }

            return $article->load('tags');
        });
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
            $query->orderByDesc('like_count');
        }

        return $this->withLikeCount($query->with(['user', 'category', 'tags', 'headerImage']))
            ->paginate($data['per_page'] ?? 15);
    }

    public function show(int $id): Article
    {
        return $this->withLikeCount(
            Article::with(['user', 'category', 'tags', 'images'])->where('status', 'published')
        )->findOrFail($id);
    }

    private function withLikeCount(Builder $query): Builder
    {
        return $query->withCount(['reactions as like_count']);
    }

    public function delete(int $id): void
    {
        Article::findOrFail($id)->delete();
    }
}
