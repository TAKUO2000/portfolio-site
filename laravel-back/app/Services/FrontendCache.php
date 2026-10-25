<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * フロントエンド（Next.js）が持つキャッシュを捨てさせる。
 *
 * トップページなどの記事一覧は、Next.js側でキャッシュして静的なページとして返している。
 * 記事が変わったときにここから nextjs-front/app/api/revalidate を呼び、作り直させる。
 */
class FrontendCache
{
    /**
     * 記事一覧のキャッシュを捨てさせる。
     *
     * 記事の保存そのものは済んでいるため、届かなくても例外にはしない。
     * その場合もNext.js側の時間による作り直し（1時間）で追いつく。
     */
    public function revalidateArticles(): void
    {
        $secret = config('services.frontend.revalidate_secret');

        // ローカルなど、再検証の受け口を用意していない環境では何もしない
        if (empty($secret)) {
            return;
        }

        try {
            Http::withToken($secret)
                ->acceptJson()
                ->timeout(5)
                ->post(config('app.frontend_url').'/api/revalidate')
                ->throw();
        } catch (ConnectionException|RequestException $e) {
            Log::warning('フロントエンドの記事一覧のキャッシュを捨てられませんでした。', [
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
