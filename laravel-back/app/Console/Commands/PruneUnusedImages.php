<?php

namespace App\Console\Commands;

use App\Models\ArticleImage;
use App\Services\ImageStorage;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * どの記事からも参照されなくなった画像をストレージから削除する。
 *
 * 画像が不要になる経路は複数あり（記事を保存せず離脱した、記事を削除した など）、
 * そのすべてを発生時点で捕まえることはできない。特に「アップロードしたがブラウザを
 * 閉じた」ケースはサーバー側から検知しようがないため、ストレージの実体とDBの参照を
 * 突き合わせて後から回収する方式にしている。
 */
class PruneUnusedImages extends Command
{
    protected $signature = 'images:prune {--dry-run : 削除せず対象の一覧だけを表示する}';

    protected $description = 'どの記事からも参照されていない画像をストレージから削除する';

    public function handle(ImageStorage $storage): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $now = Carbon::now();

        // 保存処理が終わっていないオブジェクトを巻き込まないための安全域
        $graceThreshold = $now->copy()->subHours(config('images.orphan_grace_hours'));

        $referenced = $this->referencedKeys($now);
        $targets = [];

        // 本置き場：DBから参照されていないものが対象
        foreach ($storage->each(ImageStorage::IMAGE_PREFIX) as $key => $lastModified) {
            if (isset($referenced[$key]) || $lastModified > $graceThreshold) {
                continue;
            }

            $targets[] = $key;
        }

        // 一時置き場：記事に添付されなかった分。ストレージ側のライフサイクルルールでも
        // 消えるが、ルールが未設定の環境でも溜まらないようにここでも回収する
        foreach ($storage->each(ImageStorage::TMP_PREFIX) as $key => $lastModified) {
            if ($lastModified <= $graceThreshold) {
                $targets[] = $key;
            }
        }

        if ($targets === []) {
            $this->info('削除対象の画像はありません。');

            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->line(implode(PHP_EOL, $targets));
            $this->info(count($targets) . ' 件が削除対象です（--dry-run のため削除していません）。');

            return self::SUCCESS;
        }

        $storage->delete($targets);
        $this->info(count($targets) . ' 件の未使用画像を削除しました。');

        return self::SUCCESS;
    }

    /**
     * まだ削除してはいけないキーの集合。
     *
     * 記事や画像が論理削除されていても、猶予期間内なら復元される可能性があるため残す。
     * 存在確認しかしないので、キーを配列のキー側に置いて引けるようにする。
     *
     * @return array<string, true>
     */
    private function referencedKeys(Carbon $now): array
    {
        $retentionThreshold = $now->copy()->subDays(config('images.deleted_article_retention_days'));

        $keys = ArticleImage::withTrashed()
            ->join('articles', 'articles.id', '=', 'article_images.article_id')
            ->where(fn ($query) => $query
                ->whereNull('article_images.deleted_at')
                ->orWhere('article_images.deleted_at', '>', $retentionThreshold))
            ->where(fn ($query) => $query
                ->whereNull('articles.deleted_at')
                ->orWhere('articles.deleted_at', '>', $retentionThreshold))
            ->pluck('article_images.object_key');

        return array_fill_keys($keys->all(), true);
    }
}
