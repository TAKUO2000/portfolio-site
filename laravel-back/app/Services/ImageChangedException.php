<?php

namespace App\Services;

use RuntimeException;

/**
 * 確かめたあとに、画像の中身が変わった（ETag が違う）。
 * 署名付きURLは有効なあいだ何度でも PUT できるので、確かめてから移すまでの間に差し替えられうる
 */
class ImageChangedException extends RuntimeException
{
    public function __construct(public readonly string $key)
    {
        parent::__construct("確かめたあとに画像が変わりました: {$key}");
    }
}
