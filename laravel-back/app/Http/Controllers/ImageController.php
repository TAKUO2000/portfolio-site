<?php

namespace App\Http\Controllers;

use App\Http\Requests\GetImageUploadUrlRequest;
use App\Services\ImageStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ImageController extends Controller
{
    public function getUploadUrl(GetImageUploadUrlRequest $request, ImageStorage $storage): JsonResponse
    {
        // アップロード先は一時置き場。記事に添付された時点で本置き場へ移す。
        // 記事が保存されずに終わった分はここに残り、ライフサイクルルールで自動削除される
        $key = ImageStorage::TMP_PREFIX . Str::uuid() . '.' . $request->extension();

        return response()->json([
            'upload_url' => $storage->uploadUrl(
                $key,
                $request->input('media_type'),
                (int) $request->input('file_size'),
            ),
            // 記事に添付するときはこのキーを送ってもらう
            'object_key' => $key,
            // 入力中のプレビュー表示用。添付後は本置き場のURLに変わる
            'image_url'  => $storage->objectUrl($key),
        ]);
    }
}
