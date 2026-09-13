<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\HasArticleValidationRules;
use App\Models\Article;
use Illuminate\Foundation\Http\FormRequest;

class UpdateArticleRequest extends FormRequest
{
    use HasArticleValidationRules;

    public function authorize(): bool
    {
        // 記事の存在チェックはルートモデルバインディングが担う（未存在・論理削除済みは404）。
        // 所有者かどうかの判定はArticlePolicyに集約している（不一致は403）
        $article = $this->route('article');

        return $article instanceof Article && $this->user()->can('update', $article);
    }
}
