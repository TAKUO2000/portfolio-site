<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GetImageUploadUrlRequest extends FormRequest
{
    // フロントエンドのALLOWED_IMAGE_TYPES/MAX_IMAGE_FILE_SIZE_BYTESと同じ値
    public const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    /**
     * 許可するメディアタイプと、キーに付ける拡張子の対応。
     *
     * 拡張子をアップロード元のファイル名からではなくメディアタイプから決めることで、
     * キーの形式が常に一定になり、添付時のバリデーション(PendingImageKey)で
     * 形式チェックだけを見れば済むようにしている。
     */
    public const EXTENSIONS_BY_MEDIA_TYPE = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file_name'  => ['required', 'string'],
            'media_type' => ['required', Rule::in(array_keys(self::EXTENSIONS_BY_MEDIA_TYPE))],
            'file_size'  => ['required', 'integer', 'min:1', 'max:' . self::MAX_FILE_SIZE_BYTES],
        ];
    }

    public function extension(): string
    {
        return self::EXTENSIONS_BY_MEDIA_TYPE[$this->input('media_type')];
    }
}
