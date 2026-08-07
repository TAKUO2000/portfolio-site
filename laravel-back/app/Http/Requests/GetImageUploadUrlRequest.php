<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GetImageUploadUrlRequest extends FormRequest
{
    // フロントエンドのALLOWED_IMAGE_TYPES/MAX_IMAGE_FILE_SIZE_BYTESと同じ値
    public const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file_name'  => ['required', 'string'],
            'media_type' => ['required', 'in:image/jpeg,image/png,image/webp,image/gif'],
            'file_size'  => ['required', 'integer', 'min:1', 'max:' . self::MAX_FILE_SIZE_BYTES],
        ];
    }
}
