<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GetImageUploadUrlRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file_name'  => ['required', 'string'],
            'media_type' => ['required', 'in:image/jpeg,image/png,image/webp,image/gif'],
        ];
    }
}
