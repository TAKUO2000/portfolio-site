<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\HasArticleValidationRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreArticleRequest extends FormRequest
{
    use HasArticleValidationRules;

    public function authorize(): bool
    {
        // 投稿できるロールかどうかはrouteのミドルウェア(role:admin)が見る
        return true;
    }
}
