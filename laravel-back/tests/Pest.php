<?php

use App\Services\ImageStorage;
use Illuminate\Support\Str;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\FakeImageStorage;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

/**
 * 以降のリクエストを、SPA（FE）からブラウザで呼んだときと同じ形にする。
 * Sanctum は stateful なドメインの Origin・Referer が付いたリクエストにだけセッションを使うため、
 * ログインのようにセッションが要る API はこれを通して呼ぶ。
 * FE と同じく先に /sanctum/csrf-cookie を呼び、受け取った Cookie と XSRF-TOKEN を付ける。
 */
function asSpa(): TestCase
{
    config(['sanctum.stateful' => ['localhost:3000']]);

    $testCase = test()->withHeaders([
        'Origin'  => 'http://localhost:3000',
        'Referer' => 'http://localhost:3000/',
    ]);

    $response = $testCase->get('/sanctum/csrf-cookie');
    $xsrfToken = $response->getCookie('XSRF-TOKEN', decrypt: false)->getValue();

    // レスポンスの Cookie は暗号化済みなので、ブラウザと同じくそのまま送り返す
    return $testCase->withHeader('X-XSRF-TOKEN', $xsrfToken)
        ->withUnencryptedCookies([
            'XSRF-TOKEN'             => $xsrfToken,
            config('session.cookie') => $response->getCookie(config('session.cookie'), decrypt: false)->getValue(),
        ]);
}

/**
 * 画像ストレージをローカル開発と同じMinIO構成にする。
 * 本番の実AWS S3はエンドポイントの設定値が違うだけで、通る処理は同じ。
 */
function useMinioStorage(): void
{
    config([
        'filesystems.disks.s3.key'                     => 'minioadmin',
        'filesystems.disks.s3.secret'                  => 'minioadmin',
        'filesystems.disks.s3.region'                  => 'ap-northeast-1',
        'filesystems.disks.s3.bucket'                  => 'test-bucket',
        'filesystems.disks.s3.endpoint'                => 'http://minio:9000',
        'filesystems.disks.s3.public_endpoint'         => 'http://localhost:9002',
        'filesystems.disks.s3.use_path_style_endpoint' => true,
    ]);
}

/**
 * 画像ストレージを本番相当（実AWS S3）の構成にする。
 * エンドポイントを設定しないため、SDKが仮想ホストスタイルのURLを組み立てる。
 */
function useProductionS3Storage(): void
{
    config([
        'filesystems.disks.s3.key'                     => 'prod-key',
        'filesystems.disks.s3.secret'                  => 'prod-secret',
        'filesystems.disks.s3.region'                  => 'ap-northeast-1',
        'filesystems.disks.s3.bucket'                  => 'prod-bucket',
        'filesystems.disks.s3.endpoint'                => null,
        'filesystems.disks.s3.public_endpoint'         => null,
        'filesystems.disks.s3.use_path_style_endpoint' => false,
    ]);
}

/**
 * 画像ストレージをメモリ上のフェイクに差し替える。
 * 返したインスタンスにオブジェクトを置いたり、残っているキーを確認したりできる。
 */
function fakeImageStorage(): FakeImageStorage
{
    $storage = new FakeImageStorage;

    app()->instance(ImageStorage::class, $storage);

    return $storage;
}

/**
 * ストレージにアップロード済みの一時キーを1つ用意して返す。
 * ヘッダー画像は必須なので、記事の作成・更新テストの大半で必要になる。
 */
function pendingImageKey(): string
{
    $key = App\Services\ImageStorage::TMP_PREFIX . Str::uuid() . '.png';

    $storage = app(ImageStorage::class);

    if ($storage instanceof FakeImageStorage) {
        $storage->put($key);
    }

    return $key;
}
