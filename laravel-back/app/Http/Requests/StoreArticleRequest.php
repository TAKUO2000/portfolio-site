<?php

namespace App\Http\Requests;

use App\Rules\AllowedImageHost;
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
            'header_image_url' => ['nullable', 'string', 'url', 'max:2048', new AllowedImageHost],
            'body_image_urls' => ['nullable', 'array'],
            'body_image_urls.*' => ['string', 'url', 'max:2048', new AllowedImageHost],
        ];
    }
}
