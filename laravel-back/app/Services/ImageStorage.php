<?php

namespace App\Services;

use Aws\S3\S3Client;
use DateTimeInterface;
use Generator;

/**
 * 画像の保存先ストレージ（S3互換）へのアクセスをまとめたクラス。
 *
 * ローカル開発ではMinIO、本番では実AWS S3を使うが、扱いはどちらもS3互換のため
 * 処理を分けず、filesystems.disks.s3の設定値だけで切り替わるようにしている。
 *
 * - AWS_ENDPOINT        : サーバー(コンテナ内)から見たエンドポイント
 * - AWS_PUBLIC_ENDPOINT : ブラウザから見たエンドポイント（署名付きURL・表示URL用）
 * どちらも未設定なら実AWS S3のエンドポイントがSDKによって使われる。
 *
 * オブジェクトは用途で2つのプレフィックスに分かれる。
 * - tmp/    : アップロード直後の一時置き場。記事が保存されなかった分はここに残り、
 *             ストレージ側のライフサイクルルールで自動削除される
 * - images/ : 記事に紐付いた本置き場。参照されなくなった分はPruneUnusedImagesが削除する
 */
class ImageStorage
{
    public const TMP_PREFIX = 'tmp/';

    public const IMAGE_PREFIX = 'images/';

    private const UPLOAD_URL_EXPIRES = '+15 minutes';

    /** DeleteObjectsが一度に受け付ける上限 */
    private const DELETE_CHUNK_SIZE = 1000;

    /** 署名付きURL・表示用URLの組み立てに使う、ブラウザ視点のクライアント */
    private ?S3Client $publicClient = null;

    /** コピー・列挙・削除など、サーバーから実際にAPIを叩くためのクライアント */
    private ?S3Client $serverClient = null;

    /**
     * ブラウザから直接PUTさせるための署名付きURLを発行する。
     *
     * ContentLengthを署名対象に含めることで、バリデーション済みのサイズと異なる
     * ファイルをPUTしようとすると署名不一致で拒否される。
     */
    public function uploadUrl(string $key, string $mediaType, int $size): string
    {
        $client = $this->publicClient();

        $command = $client->getCommand('PutObject', [
            'Bucket'        => $this->config('bucket'),
            'Key'           => $key,
            'ContentType'   => $mediaType,
            'ContentLength' => $size,
        ]);

        return (string) $client
            ->createPresignedRequest($command, self::UPLOAD_URL_EXPIRES)
            ->getUri();
    }

    /**
     * アップロード済みオブジェクトの表示用URL。
     * パススタイル(MinIO)と仮想ホストスタイル(実S3)の差はSDKが吸収する。
     */
    public function objectUrl(string $key): string
    {
        return $this->publicClient()->getObjectUrl($this->config('bucket'), $key);
    }

    /**
     * 一時置き場のオブジェクトを本置き場へ移す。
     * S3にはリネームが無いため、コピーしてから元を消す。
     */
    public function move(string $from, string $to): void
    {
        $bucket = $this->config('bucket');

        $this->serverClient()->copyObject([
            'Bucket'     => $bucket,
            'Key'        => $to,
            'CopySource' => rawurlencode($bucket . '/' . $from),
        ]);

        $this->serverClient()->deleteObject(['Bucket' => $bucket, 'Key' => $from]);
    }

    /**
     * 指定プレフィックス配下のオブジェクトを、キーと最終更新日時の組で列挙する。
     *
     * 件数が増えても memory を食い潰さないよう、ページャの結果をそのまま逐次返す。
     *
     * @return Generator<string, DateTimeInterface> キー => 最終更新日時
     */
    public function each(string $prefix): Generator
    {
        $pages = $this->serverClient()->getPaginator('ListObjectsV2', [
            'Bucket' => $this->config('bucket'),
            'Prefix' => $prefix,
        ]);

        foreach ($pages as $page) {
            foreach ($page['Contents'] ?? [] as $object) {
                yield $object['Key'] => $object['LastModified'];
            }
        }
    }

    /**
     * 複数オブジェクトをまとめて削除する。
     *
     * @param  list<string>  $keys
     */
    public function delete(array $keys): void
    {
        foreach (array_chunk($keys, self::DELETE_CHUNK_SIZE) as $chunk) {
            $this->serverClient()->deleteObjects([
                'Bucket' => $this->config('bucket'),
                'Delete' => [
                    'Objects' => array_map(fn (string $key) => ['Key' => $key], $chunk),
                ],
            ]);
        }
    }

    /**
     * ブラウザが到達できるエンドポイントを向いたクライアント。
     * ここで組み立てたURLはそのままブラウザに渡るため、AWS_PUBLIC_ENDPOINTを優先する。
     */
    private function publicClient(): S3Client
    {
        return $this->publicClient ??= $this->makeClient(
            $this->config('public_endpoint') ?: $this->config('endpoint')
        );
    }

    /**
     * サーバー（コンテナ内）から到達できるエンドポイントを向いたクライアント。
     * ローカル開発ではブラウザ向けのlocalhostではコンテナ間通信ができないため、
     * AWS_ENDPOINTを優先する。
     */
    private function serverClient(): S3Client
    {
        return $this->serverClient ??= $this->makeClient(
            $this->config('endpoint') ?: $this->config('public_endpoint')
        );
    }

    private function makeClient(?string $endpoint): S3Client
    {
        $config = [
            'version'                 => 'latest',
            'region'                  => $this->config('region'),
            'credentials'             => [
                'key'    => $this->config('key'),
                'secret' => $this->config('secret'),
            ],
            'use_path_style_endpoint' => (bool) $this->config('use_path_style_endpoint'),
        ];

        // 未設定の場合はSDKが実AWS S3のエンドポイントを組み立てる
        if ($endpoint) {
            $config['endpoint'] = $endpoint;
        }

        return new S3Client($config);
    }

    private function config(string $key): mixed
    {
        return config("filesystems.disks.s3.{$key}");
    }
}
