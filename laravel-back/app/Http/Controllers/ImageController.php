<?php

namespace App\Http\Controllers;

use App\Http\Requests\GetImageUploadUrlRequest;
use App\Services\ImageStorage;
use Illuminate\Support\Str;

class ImageController extends Controller
{
    public function getUploadUrl(GetImageUploadUrlRequest $request, ImageStorage $storage)
    {
        // 拡張子のみ抜きだして、一意のファイル名（キー名）を作成
        $extension = pathinfo($request->input('file_name'), PATHINFO_EXTENSION);
        $key = 'images/' . Str::uuid() . '.' . $extension;

        // アップロード用URLとアプロードされた場合の表示用URLを返す
        return response()->json([
            'upload_url' => $storage->uploadUrl(
                $key,
                $request->input('media_type'),
                (int) $request->input('file_size'),
            ),
            'image_url'  => $storage->objectUrl($key),
        ]);
    }
}
