<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ShowArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['required', 'integer', 'exists:articles,id'],
        ];
    }

    //ルートパラメータをバリデーションできるようにする設定
    protected function prepareForValidation(): void
    {
        $this->merge(['id' => $this->route('id')]);
    }
}
