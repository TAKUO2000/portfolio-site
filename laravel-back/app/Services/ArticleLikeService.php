<?php

namespace App\Services;

use App\Models\Article;
use App\Models\Reaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ArticleLikeService
{
    /** @return array{liked: bool, like_count: int} */
    public function status(User $user, int $articleId): array
    {
        return $this->result($user, $this->findPublished($articleId));
    }

    /**
     * 既にいいね済みでもエラーにしない。連打や二重送信で
     * 複合主キーの重複になっても、結果は「いいね済み」で同じため
     *
     * @return array{liked: bool, like_count: int}
     */
    public function like(User $user, int $articleId): array
    {
        $article = $this->findPublished($articleId);

        Reaction::insertOrIgnore([
            'user_id'    => $user->id,
            'article_id' => $article->id,
            'type'       => Reaction::TYPE_LIKE,
            'created_at' => now(),
        ]);

        return $this->result($user, $article);
    }

    /**
     * いいねしていない記事を取り消してもエラーにしない
     *
     * @return array{liked: bool, like_count: int}
     */
    public function unlike(User $user, int $articleId): array
    {
        $article = $this->findPublished($articleId);

        $this->likes($article)->where('user_id', $user->id)->delete();

        return $this->result($user, $article);
    }

    /** 記事詳細と同じく、下書き・論理削除済みの記事は存在しない扱い(404)にする */
    private function findPublished(int $articleId): Article
    {
        return Article::query()->where('status', 'published')->findOrFail($articleId);
    }

    private function likes(Article $article): Builder
    {
        return Reaction::query()
            ->where('article_id', $article->id)
            ->where('type', Reaction::TYPE_LIKE);
    }

    /** @return array{liked: bool, like_count: int} */
    private function result(User $user, Article $article): array
    {
        return [
            'liked'      => $this->likes($article)->where('user_id', $user->id)->exists(),
            'like_count' => $this->likes($article)->count(),
        ];
    }
}
