<?php

namespace App\Http\Requests;

use App\Models\Article;
use App\Rules\AllowedImageHost;
use Illuminate\Foundation\Http\FormRequest;

class UpdateArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        // 記事の存在チェックはルートモデルバインディングが担う（未存在・論理削除済みは404）。
        // ここでは所有者かどうかだけを見る（不一致は403）
        $article = $this->route('article');

        return $article instanceof Article && $article->user_id === $this->user()->id;
    }

    public function rules(): array
    {
        // ヘッダー画像と本文画像で同じルールインスタンスを使い回す
        $allowedImageHost = new AllowedImageHost;

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
            'header_image_url' => ['nullable', 'string', 'url', 'max:2048', $allowedImageHost],
            'body_image_urls' => ['nullable', 'array'],
            'body_image_urls.*' => ['string', 'url', 'max:2048', $allowedImageHost],
        ];
    }
}
