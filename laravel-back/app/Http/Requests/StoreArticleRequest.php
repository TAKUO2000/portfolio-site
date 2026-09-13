<?php

namespace App\Http\Requests;

use App\Rules\PendingImageKey;
use Illuminate\Foundation\Http\FormRequest;

class StoreArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // ヘッダー画像と本文画像で同じルールインスタンスを使い回す
        $pendingImageKey = new PendingImageKey;

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
            'header_image_key' => ['nullable', 'string', $pendingImageKey],
            'body_image_keys' => ['nullable', 'array'],
            'body_image_keys.*' => ['string', $pendingImageKey],
        ];
    }
}
