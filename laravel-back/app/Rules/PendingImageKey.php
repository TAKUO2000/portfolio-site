<?php

namespace App\Rules;

use App\Services\ImageStorage;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * 記事に添付するオブジェクトキーが、このアプリが発行した一時キーの形式かを検証する。
 *
 * キーは /api/images/upload-url が tmp/{uuid}.{拡張子} の形で払い出すため、
 * 形式そのものを検査すれば他所のオブジェクトを指定される余地がなくなる。
 * ストレージのホスト名に依存しないので、環境ごとの分岐も要らない。
 */
class PendingImageKey implements ValidationRule
{
    /** tmp/{uuid v4}.{許可された拡張子} */
    private const PATTERN = '/^' . 'tmp\/' . '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' . '\.(jpg|png|webp|gif)$/';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || preg_match(self::PATTERN, $value) !== 1) {
            $fail('画像の指定が不正です。');
        }
    }
}
