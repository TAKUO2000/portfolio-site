<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class IndexMyArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        // 自分の記事しか返さないため、記事単位の認可は不要。
        // 投稿できるロールかどうかはルートのミドルウェア(role:admin)が見る
        return true;
    }

    public function rules(): array
    {
        return [
            'status'   => ['nullable', 'in:draft,published'],
            'keyword'  => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page'     => ['nullable', 'integer', 'min:1'],
        ];
    }
}
