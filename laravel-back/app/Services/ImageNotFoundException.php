<?php

namespace App\Services;

use RuntimeException;

/**
 * 移動しようとした画像がストレージに無い。
 * アップロードに失敗した、または一時置き場の期限（1日）が切れて消えたときに起きる
 */
class ImageNotFoundException extends RuntimeException
{
    public function __construct(public readonly string $key)
    {
        parent::__construct("画像がストレージにありません: {$key}");
    }
}
