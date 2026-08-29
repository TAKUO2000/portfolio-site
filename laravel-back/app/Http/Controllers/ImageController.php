<?php

namespace App\Http\Controllers;

use App\Http\Requests\GetImageUploadUrlRequest;
use Aws\S3\S3Client;
use Illuminate\Support\Str;

class ImageController extends Controller
{
    //TODO:サービス層に切り出す
    public function getUploadUrl(GetImageUploadUrlRequest $request)
    {
        // 拡張子のみ抜きだして、一意のファイル名（キー名）を作成
        $extension = pathinfo($request->input('file_name'), PATHINFO_EXTENSION);
        $key = 'images/' . Str::uuid() . '.' . $extension;

        // ローカル開発ではMinIOなどS3互換ストレージを使うため、ブラウザから到達可能な
        // エンドポイント（AWS_PUBLIC_ENDPOINT）が設定されていればそちらを優先する。
        // 未設定（本番）の場合は従来通り実AWS S3にアクセスする。
        $publicEndpoint = config('filesystems.disks.s3.public_endpoint');

        //S3クライアントオブジェクトを生成
        $s3Client = new S3Client([
            'version'     => 'latest',
            'region'      => config('filesystems.disks.s3.region'),
            'credentials' => [
                'key'    => config('filesystems.disks.s3.key'),
                'secret' => config('filesystems.disks.s3.secret'),
            ],
            ...($publicEndpoint ? [
                'endpoint'               => $publicEndpoint,
                'use_path_style_endpoint' => config('filesystems.disks.s3.use_path_style_endpoint', false),
            ] : []),
        ]);

        // 作成されたS3クライアントからPut用の命令を作成
        // ContentLengthを署名対象に含めることで、バリデーション済みのfile_sizeと
        // 異なるサイズのファイルをPUTしようとすると署名不一致でS3に拒否される
        $command = $s3Client->getCommand('PutObject', [
            'Bucket'        => config('filesystems.disks.s3.bucket'),
            'Key'           => $key,
            'ContentType'   => $request->input('media_type'),
            'ContentLength' => (int) $request->input('file_size'),
        ]);
        // 認証情報を含めた送信用のURLを格納
        $presignedUrl = (string) $s3Client->createPresignedRequest($command, '+15 minutes')->getUri();

        $imageUrl = $publicEndpoint
            ? rtrim($publicEndpoint, '/') . '/' . config('filesystems.disks.s3.bucket') . '/' . $key
            : 'https://' . config('filesystems.disks.s3.bucket') . '.s3.' . config('filesystems.disks.s3.region') . '.amazonaws.com/' . $key;

        // アップロード用URLとアプロードされた場合の表示用URLを返す
        return response()->json([
            'upload_url' => $presignedUrl,
            'image_url'  => $imageUrl,
        ]);
    }
}
