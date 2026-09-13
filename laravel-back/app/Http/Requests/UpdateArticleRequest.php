<?php

namespace App\Http\Requests;

use App\Models\Article;
use App\Rules\ArticleImageKey;
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
            // 本文画像は本文から抽出するため受け取らない（本文が唯一の正）。
            // ヘッダーは据え置く場合に本置き場のキーがそのまま返ってくる
            'header_image_key' => ['required', 'string', new ArticleImageKey],
        ];
    }
}
