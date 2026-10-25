<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

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
     * 一時的な失敗で1時間待たないよう、つながらないときと5xxのときだけ2回まで送り直す。
     * 応答後（defer）でもその間はPHP-FPMのワーカーを使い続けるため、タイムアウトは短くし、
     * 全部失敗しても10秒ほどで終わるようにしている。
     */
    public function revalidateArticles(): void
    {
        $secret = config('services.frontend.revalidate_secret');

        // ローカルなど、再検証の受け口を用意していない環境では何もしない。
        // 本番・ステージングで未設定なのは設定漏れなので、気づけるよう警告を残す
        if (empty($secret)) {
            if (app()->environment('production', 'staging')) {
                Log::warning('FRONTEND_REVALIDATE_SECRETが未設定のため、フロントエンドの記事一覧のキャッシュを捨てられません。');
            }

            return;
        }

        try {
            Http::withToken($secret)
                ->acceptJson()
                ->connectTimeout(2)
                ->timeout(3)
                ->retry(3, 200, fn (Throwable $e) => $e instanceof ConnectionException
                    || ($e instanceof RequestException && $e->response->serverError()))
                ->post(config('app.frontend_url').'/api/revalidate')
                ->throw();
        } catch (ConnectionException|RequestException $e) {
            Log::warning('フロントエンドの記事一覧のキャッシュを捨てられませんでした。', [
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
