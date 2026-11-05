<?php

namespace App\Policies;

use App\Models\Article;
use App\Models\User;

/**
 * 記事に対する操作の可否。
 *
 * 記事が存在するかどうかはここでは見ない。存在チェックはルートモデルバインディングが
 * 担い、見つからなければPolicyに到達する前に404になる。両方をここで判定すると、
 * 「権限がない(403)」と「そもそも存在しない(404)」を区別できなくなるため。
 *
 * 投稿できるロールかどうかはルートのミドルウェア(role:admin)が見る。ここが答えるのは
 * 「その記事の書き手本人か」だけ。
 */
class ArticlePolicy
{
    public function update(User $user, Article $article): bool
    {
        return $this->isAuthor($user, $article);
    }

    public function delete(User $user, Article $article): bool
    {
        return $this->isAuthor($user, $article);
    }

    private function isAuthor(User $user, Article $article): bool
    {
        return $article->user_id === $user->id;
    }
}
