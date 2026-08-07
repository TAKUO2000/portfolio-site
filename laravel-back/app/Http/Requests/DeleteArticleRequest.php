<?php

namespace App\Http\Requests;

use App\Models\Article;
use Illuminate\Foundation\Http\FormRequest;

class DeleteArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $article = Article::find($this->route('id'));

        return $article && $article->user_id === $this->user()->id;
    }

    public function rules(): array
    {
        return [
            'id' => ['required', 'integer', 'exists:articles,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['id' => $this->route('id')]);
    }
}
