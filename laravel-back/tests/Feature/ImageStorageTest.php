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

/**
 * S3 への応答を差し替えた ImageStorage。copyObject の結果を $result で決める
 */
function imageStorageRespondingWith(callable $result): ImageStorage
{
    config(['filesystems.disks.s3.bucket' => 'test-bucket']);

    $mock = new Aws\MockHandler;
    $mock->append($result);

    $client = new Aws\S3\S3Client([
        'region'      => 'ap-northeast-1',
        'version'     => 'latest',
        'credentials' => ['key' => 'test', 'secret' => 'test'],
        'handler'     => $mock,
    ]);

    $storage = new ImageStorage;
    (fn () => $this->serverClient = $client)->call($storage);

    return $storage;
}

test('移動元が無いとき（NoSuchKey）は ImageNotFoundException を投げる', function () {
    $storage = imageStorageRespondingWith(
        fn (Aws\CommandInterface $command) => new Aws\S3\Exception\S3Exception('Not Found', $command, ['code' => 'NoSuchKey'])
    );

    expect(fn () => $storage->move('tmp/a.png', 'images/a.png'))
        ->toThrow(App\Services\ImageNotFoundException::class);
});

test('移動元が無い以外の S3 のエラーは、そのまま投げる', function () {
    $storage = imageStorageRespondingWith(
        fn (Aws\CommandInterface $command) => new Aws\S3\Exception\S3Exception('Access Denied', $command, ['code' => 'AccessDenied'])
    );

    expect(fn () => $storage->move('tmp/a.png', 'images/a.png'))
        ->toThrow(Aws\S3\Exception\S3Exception::class);
});

test('headObject の応答から、大きさと種類を返す', function () {
    $storage = imageStorageRespondingWith(
        fn (Aws\CommandInterface $command) => new Aws\Result(['ContentLength' => 1234, 'ContentType' => 'image/png'])
    );

    expect($storage->metadata('tmp/a.png'))->toBe(['size' => 1234, 'type' => 'image/png']);
});

test('オブジェクトが無いとき（HEAD が 404）は metadata が null を返す', function () {
    $storage = imageStorageRespondingWith(
        fn (Aws\CommandInterface $command) => new Aws\S3\Exception\S3Exception(
            'Not Found', $command, ['response' => new GuzzleHttp\Psr7\Response(404)]
        )
    );

    expect($storage->metadata('tmp/a.png'))->toBeNull();
});

test('404 以外のエラーのときは、metadata は「無い」と取り違えずに投げる', function () {
    $storage = imageStorageRespondingWith(
        fn (Aws\CommandInterface $command) => new Aws\S3\Exception\S3Exception(
            'Forbidden', $command, ['response' => new GuzzleHttp\Psr7\Response(403)]
        )
    );

    expect(fn () => $storage->metadata('tmp/a.png'))->toThrow(Aws\S3\Exception\S3Exception::class);
});
