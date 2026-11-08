<?php

namespace App\Services;

use Aws\S3\Exception\S3Exception;
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
     * 署名されるのは host だけで、ContentType と ContentLength は署名に含まれない（SDK が外す）。
     * そのため、申告と違う大きさ・種類のファイルも置けてしまう。置かれたものは、記事に添付して
     * 本置き場へ移す前に ArticleService が metadata() で確かめ、違えば消す（#129）
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
     * オブジェクトの大きさ（バイト）と種類（Content-Type）。無ければ null。
     * HEAD の応答には本文が無く、エラーの種類（NoSuchKey など）が分からないので、404 かどうかで決める。
     * 404 以外のエラー（権限など）は「無い」と取り違えないよう、そのまま投げる
     *
     * etag は中身の目印。move() に渡すと、確かめたときと中身が同じときだけ移す
     *
     * @return array{size: int, type: string, etag: string}|null
     */
    public function metadata(string $key): ?array
    {
        try {
            $result = $this->serverClient()->headObject([
                'Bucket' => $this->config('bucket'),
                'Key'    => $key,
            ]);

            return [
                'size' => (int) $result['ContentLength'],
                'type' => (string) $result['ContentType'],
                'etag' => (string) $result['ETag'],
            ];
        } catch (S3Exception $e) {
            if ($e->getStatusCode() === 404) {
                return null;
            }

            throw $e;
        }
    }

    /**
     * オブジェクトの先頭の数バイト。ファイルの種類をマジックナンバーで確かめるのに使う
     * （Content-Type は PUT した人が自由に決められるので、それだけでは種類を確かめられない）
     */
    public function readHead(string $key, int $length): string
    {
        $result = $this->serverClient()->getObject([
            'Bucket' => $this->config('bucket'),
            'Key'    => $key,
            'Range'  => 'bytes=0-' . ($length - 1),
        ]);

        return (string) $result['Body'];
    }

    /**
     * 一時置き場のオブジェクトを本置き場へ移す。
     * S3にはリネームが無いため、コピーしてから元を消す。
     *
     * $ifMatch（metadata() の etag）を渡すと、中身がそのときと同じときだけ移す
     * （確かめてから移すまでの間に、署名付きURLで差し替えられていないように）
     *
     * @throws ImageNotFoundException 移動元が無いとき（アップロードの失敗や、一時置き場の期限切れ）
     * @throws ImageChangedException  $ifMatch と中身が違うとき
     */
    public function move(string $from, string $to, ?string $ifMatch = null): void
    {
        $bucket = $this->config('bucket');

        $params = [
            'Bucket'     => $bucket,
            'Key'        => $to,
            'CopySource' => rawurlencode($bucket . '/' . $from),
        ];

        if ($ifMatch !== null) {
            $params['CopySourceIfMatch'] = $ifMatch;
        }

        try {
            $this->serverClient()->copyObject($params);
        } catch (S3Exception $e) {
            if ($e->getAwsErrorCode() === 'NoSuchKey') {
                throw new ImageNotFoundException($from);
            }

            if ($e->getStatusCode() === 412) {
                throw new ImageChangedException($from);
            }

            throw $e;
        }

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
            'use_path_style_endpoint' => (bool) $this->config('use_path_style_endpoint'),
        ];

        // キーが無ければcredentialsを渡さず、SDKの既定の探索（本番ではEC2のインスタンスロール）に任せる
        if ($this->config('key') && $this->config('secret')) {
            $config['credentials'] = [
                'key'    => $this->config('key'),
                'secret' => $this->config('secret'),
            ];
        }

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
