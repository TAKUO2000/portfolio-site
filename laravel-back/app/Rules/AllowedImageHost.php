<?php

namespace App\Rules;

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

    private function allowedHosts(): array
    {
        $bucket = config('filesystems.disks.s3.bucket');
        $region = config('filesystems.disks.s3.region');

        return [
            "{$bucket}.s3.{$region}.amazonaws.com",
        ];
    }
}
