<?php

use App\Services\ImageStorage;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 画像の参照先をフルURLからオブジェクトキーに置き換える。
 *
 * URLで保持しているとエンドポイントやバケット名を変えた時点で既存レコードが壊れ、
 * ストレージ側の実体との突き合わせ（未使用画像の削除）もできないため、
 * 環境に依存しないキーだけを持ち、表示用URLはモデル側で組み立てる。
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('article_images', function (Blueprint $table) {
            $table->string('object_key', 512)->after('article_id');
        });

        // このアプリがアップロードしたURLは末尾が images/{uuid}.{ext} の形なので、
        // そこから後ろを切り出せばオブジェクトキーになる
        DB::table('article_images')
            ->whereRaw("url LIKE '%/images/%'")
            ->update([
                'object_key' => DB::raw("SUBSTRING(url, LOCATE('/images/', url) + 1)"),
            ]);

        // 上の形に当てはまらないURL（別バケットを指していたシーダーの初期データなど）は
        // 自分のストレージ上の実体が無く、キーとして表現できないためレコードごと取り除く
        DB::table('article_images')->where('object_key', '')->delete();

        Schema::table('article_images', function (Blueprint $table) {
            $table->dropColumn('url');
        });
    }

    public function down(): void
    {
        Schema::table('article_images', function (Blueprint $table) {
            $table->string('url', 2048)->after('article_id');
        });

        // キーを捨てる前に、実行環境の設定で表示用URLへ戻しておく
        $storage = app(ImageStorage::class);

        DB::table('article_images')
            ->select('id', 'object_key')
            ->orderBy('id')
            ->chunk(500, function ($images) use ($storage) {
                foreach ($images as $image) {
                    DB::table('article_images')
                        ->where('id', $image->id)
                        ->update(['url' => $storage->objectUrl($image->object_key)]);
                }
            });

        Schema::table('article_images', function (Blueprint $table) {
            $table->dropColumn('object_key');
        });
    }
};
