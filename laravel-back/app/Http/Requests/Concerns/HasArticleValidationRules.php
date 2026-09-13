<?php

namespace App\Http\Requests\Concerns;

use App\Rules\ArticleImageKey;

/**
 * 記事の入力値の検証ルール。
 *
 * 作成と更新で同じルールを使う。更新は全置換（リクエストに含めなかったタグは外れる）
 * なので、必須項目の扱いも作成と揃う。片方だけ変更して仕様がズレるのを防ぐため、
 * ここ1箇所に置いている。
 *
 * 認可（authorize）は作成と更新で違うため、各FormRequest側で定義する。
 */
trait HasArticleValidationRules
{
    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'title'       => ['required', 'string', 'max:255'],
            'summary'     => ['required', 'string'],
            'body'        => ['required', 'string'],
            'status'      => ['required', 'in:draft,published'],

            'tags'       => ['nullable', 'array'],
            'tags.*'     => ['integer', 'exists:tags,id'],
            'new_tags'   => ['nullable', 'array'],
            'new_tags.*' => ['string', 'max:255', 'regex:/\S/u'],

            // ヘッダー画像は必須（画像なしの記事は存在しない前提）。更新でキーごと送り忘れて
            // 既存の画像が黙って外れるのを防ぐため、nullableにはしない。
            // 据え置く場合は、GETで返る本置き場のキーがそのまま送られてくる。
            // 本文画像は本文から抽出するため受け取らない（本文が画像参照の唯一の正）
            'header_image_key' => ['required', 'string', new ArticleImageKey],
        ];
    }
}
