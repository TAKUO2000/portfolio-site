<?php

namespace App\Http\Requests;

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
            'header_image_url' => ['nullable', 'string', 'url'],
            'body_image_urls' => ['nullable', 'array'],
            'body_image_urls.*' => ['string', 'url'],
        ];
    }
}
