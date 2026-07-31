<?php

namespace App\Services;

use App\Models\Article;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
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
                // 全角スペースを半角に正規化してからtrim（trim()は全角スペースを除去しないため）
                $normalizedNames = array_map(
                    fn (string $name) => trim(str_replace('　', ' ', $name)),
                    $data['new_tags']
                );

                // new_tags内での重複（大文字小文字・全角スペース差異込み）を正規化して除去
                $uniqueNamesByLower = [];
                foreach ($normalizedNames as $name) {
                    $uniqueNamesByLower[mb_strtolower($name)] ??= $name;
                }
                $trimmedNames = array_values($uniqueNamesByLower);
                $lowerNames = array_keys($uniqueNamesByLower);

                // 大文字小文字を無視して既存タグ（論理削除済み含む）を一括取得（N+1回避）
                // lower_nameはDB側のLOWER()の結果をそのままキーに使う。PHPのmb_strtolower()で
                // 取得後に再計算すると、非ASCII文字でLOWER()の結果とズレてマップから引けなくなる
                // 恐れがあるため（DBのcollationは大文字小文字を区別しないutf8mb4_unicode_ci）
                $placeholders = implode(',', array_fill(0, count($lowerNames), '?'));
                $existingByLower = Tag::withTrashed()
                    ->selectRaw('*, LOWER(name) AS lower_name')
                    ->whereRaw("LOWER(name) IN ({$placeholders})", $lowerNames)
                    ->get()
                    ->keyBy('lower_name');

                foreach ($trimmedNames as $name) {
                    $lowerName = mb_strtolower($name);
                    $tag = $existingByLower[$lowerName] ?? null;

                    if ($tag === null) {
                        try {
                            // 見つからなければ入力された表記のまま新規作成
                            $tag = Tag::create(['name' => $name]);
                        } catch (UniqueConstraintViolationException) {
                            // 一括取得後に別リクエストが同名タグを先に作成した場合（TOCTOU）は再取得して使う
                            $tag = Tag::withTrashed()
                                ->whereRaw('LOWER(name) = ?', [$lowerName])
                                ->firstOrFail();
                        }

                        $existingByLower[$lowerName] = $tag;
                    }

                    // 論理削除済みタグが同名で再登録された場合は復活させる
                    if ($tag->trashed()) {
                        $tag->restore();
                    }

                    // 大文字小文字違いで既存タグに一致した場合は今回の表記に更新する
                    if ($tag->name !== $name) {
                        $tag->update(['name' => $name]);
                    }

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
