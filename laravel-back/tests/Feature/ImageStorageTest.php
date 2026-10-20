<?php

use App\Services\ImageStorage;

// 署名付きURLのX-Amz-Credentialにはアクセスキーが入るため、どの認証情報で署名したかが分かる

// SDKの既定の探索が読む環境変数。手元の設定で結果が変わらないよう、テストの間は退避して空にする
const AWS_CREDENTIAL_ENV_NAMES = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_SESSION_TOKEN',
    'AWS_PROFILE',
    'AWS_SHARED_CREDENTIALS_FILE',
    'AWS_CONFIG_FILE',
];

beforeEach(function () {
    $this->originalEnv = [];
    foreach (AWS_CREDENTIAL_ENV_NAMES as $name) {
        $this->originalEnv[$name] = getenv($name);
        putenv($name);
    }
});

afterEach(function () {
    foreach ($this->originalEnv as $name => $value) {
        putenv($value === false ? $name : "{$name}={$value}");
    }
});

test('キーが設定されていれば、環境変数があってもその認証情報で署名する', function () {
    useProductionS3Storage();
    putenv('AWS_ACCESS_KEY_ID=key-from-sdk-chain');
    putenv('AWS_SECRET_ACCESS_KEY=secret-from-sdk-chain');

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
