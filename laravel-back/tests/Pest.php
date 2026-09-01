<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
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
