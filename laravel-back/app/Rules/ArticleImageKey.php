<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * 記事に添付する画像のオブジェクトキーの形式を検証する。
 *
 * 受け付けるのは2種類。
 * - tmp/{uuid}.{拡張子}      : /api/images/upload-url が払い出した一時キー
 * - images/{名前}.{拡張子}   : 既に記事に添付されている本置き場のキー（更新時に据え置く場合）
 *
 * 本置き場のキーは形式さえ合えば通るため、「その記事のものか」はArticleService側で
 * 照合する。ここで弾けるのはあくまで形式だけで、ストレージのホスト名には依存しない。
 */
class ArticleImageKey implements ValidationRule
{
    /**
     * 本文からキーを抜き出すときにも使うため、前後の固定なしで公開する。
     * 本置き場の名前に「.」を含めないのは、拡張子の切れ目を曖昧にしないため。
     */
    public const PATTERN = '(?:tmp\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|images\/[0-9A-Za-z_-]+)\.(?:jpg|png|webp|gif)';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || preg_match('/^' . self::PATTERN . '$/', $value) !== 1) {
            $fail('画像の指定が不正です。');
        }
    }
}
