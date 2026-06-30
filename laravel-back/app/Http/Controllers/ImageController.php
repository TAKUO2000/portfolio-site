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

        //S3クライアントオブジェクトを生成
        $s3Client = new S3Client([
            'version'     => 'latest',
            'region'      => config('filesystems.disks.s3.region'),
            'credentials' => [
                'key'    => config('filesystems.disks.s3.key'),
                'secret' => config('filesystems.disks.s3.secret'),
            ],
        ]);

        // 作成されたS3クライアントからPut用の命令を作成
        $command = $s3Client->getCommand('PutObject', [
            'Bucket'      => config('filesystems.disks.s3.bucket'),
            'Key'         => $key,
            'ContentType' => $request->input('media_type'),
        ]);
        // 認証情報を含めた送信用のURLを格納
        $presignedUrl = (string) $s3Client->createPresignedRequest($command, '+15 minutes')->getUri();

        // アップロード用URLとアプロードされた場合の表示用URLを返す
        return response()->json([
            'upload_url' => $presignedUrl,
            'image_url'  => 'https://' . config('filesystems.disks.s3.bucket') . '.s3.' . config('filesystems.disks.s3.region') . '.amazonaws.com/' . $key,
        ]);
    }
}
