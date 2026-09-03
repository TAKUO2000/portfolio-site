<?php

namespace App\Services;

use Aws\S3\S3Client;

/**
 * 画像の保存先ストレージ（S3互換）へのアクセスをまとめたクラス。
 *
 * ローカル開発ではMinIO、本番では実AWS S3を使うが、扱いはどちらもS3互換のため
 * 処理を分けず、filesystems.disks.s3の設定値だけで切り替わるようにしている。
 *
 * - AWS_ENDPOINT        : サーバー(コンテナ内)から見たエンドポイント
 * - AWS_PUBLIC_ENDPOINT : ブラウザから見たエンドポイント（署名付きURL・表示URL用）
 * どちらも未設定なら実AWS S3のエンドポイントがSDKによって使われる。
 */
class ImageStorage
{
    private const UPLOAD_URL_EXPIRES = '+15 minutes';

    private ?S3Client $client = null;

    /**
     * ブラウザから直接PUTさせるための署名付きURLを発行する。
     *
     * ContentLengthを署名対象に含めることで、バリデーション済みのサイズと異なる
     * ファイルをPUTしようとすると署名不一致で拒否される。
     */
    public function uploadUrl(string $key, string $mediaType, int $size): string
    {
        $client = $this->client();

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
        return $this->client()->getObjectUrl($this->config('bucket'), $key);
    }

    /**
     * 画像URLとして許可するホスト。表示用URLと同じ組み立て方から導出する。
     */
    public function host(): ?string
    {
        return parse_url($this->objectUrl('probe'), PHP_URL_HOST) ?: null;
    }

    private function client(): S3Client
    {
        if ($this->client !== null) {
            return $this->client;
        }

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
        $endpoint = $this->config('public_endpoint') ?: $this->config('endpoint');

        if ($endpoint) {
            $config['endpoint'] = $endpoint;
        }

        return $this->client = new S3Client($config);
    }

    private function config(string $key): mixed
    {
        return config("filesystems.disks.s3.{$key}");
    }
}
