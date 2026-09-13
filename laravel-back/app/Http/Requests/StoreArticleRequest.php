<?php

namespace App\Http\Requests;

use App\Rules\ArticleImageKey;
use Illuminate\Foundation\Http\FormRequest;

class StoreArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'title'       => ['required', 'string', 'max:255'],
            'summary'     => ['required', 'string'],
            'body'        => ['required', 'string'],
            'status'      => ['required', 'in:draft,published'],
            'tags'             => ['nullable', 'array'],
            'tags.*'           => ['integer', 'exists:tags,id'],
            'new_tags'         => ['nullable', 'array'],
            'new_tags.*'       => ['string', 'max:255', 'regex:/\S/u'],
            // 本文画像は本文から抽出するため受け取らない（本文が唯一の正）
            'header_image_key' => ['required', 'string', new ArticleImageKey],
        ];
    }
}
