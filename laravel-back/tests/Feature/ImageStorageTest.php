<?php

use App\Services\ImageStorage;

// 署名付きURLのX-Amz-Credentialにはアクセスキーが入るため、どの認証情報で署名したかが分かる

beforeEach(function () {
    $this->originalEnv = [
        'AWS_ACCESS_KEY_ID'     => getenv('AWS_ACCESS_KEY_ID'),
        'AWS_SECRET_ACCESS_KEY' => getenv('AWS_SECRET_ACCESS_KEY'),
    ];
});

afterEach(function () {
    foreach ($this->originalEnv as $name => $value) {
        putenv($value === false ? $name : "{$name}={$value}");
    }
});

test('キーが設定されていれば、その認証情報で署名する', function () {
    useProductionS3Storage();

    $url = app(ImageStorage::class)->uploadUrl('tmp/a.png', 'image/png', 1024);

    expect($url)->toContain('X-Amz-Credential=prod-key%2F');
});

test('キーが空なら、SDKの既定の探索で見つけた認証情報で署名する', function () {
    // 本番ではEC2のインスタンスロールから取るが、テストでは探索の最初に見る環境変数で確かめる
    useProductionS3Storage();
    config([
        'filesystems.disks.s3.key'    => null,
        'filesystems.disks.s3.secret' => null,
    ]);
    putenv('AWS_ACCESS_KEY_ID=key-from-sdk-chain');
    putenv('AWS_SECRET_ACCESS_KEY=secret-from-sdk-chain');

    $url = app(ImageStorage::class)->uploadUrl('tmp/a.png', 'image/png', 1024);

    expect($url)->toContain('X-Amz-Credential=key-from-sdk-chain%2F');
});
