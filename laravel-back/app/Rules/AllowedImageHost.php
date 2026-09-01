<?php

namespace App\Rules;

use App\Services\ImageStorage;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class AllowedImageHost implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $host = parse_url((string) $value, PHP_URL_HOST);

        if ($host === null || $host === false || ! in_array($host, $this->allowedHosts(), true)) {
            $fail('画像URLのホストが許可されていません。');
        }
    }

    /**
     * 表示用URLを組み立てているストレージ自身に許可ホストを問い合わせる。
     * MinIOでも実S3でも同じ経路で導出されるため、環境ごとの分岐は不要。
     */
    private function allowedHosts(): array
    {
        return array_filter([app(ImageStorage::class)->host()]);
    }
}
