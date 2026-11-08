<?php

namespace Tests\Support;

use App\Http\Requests\GetImageUploadUrlRequest;
use App\Services\ImageNotFoundException;
use App\Services\ImageStorage;
use DateTimeInterface;
use Generator;
use Illuminate\Support\Carbon;

/**
 * ストレージの中身をメモリ上に持つImageStorage。
 *
 * URLの組み立て（uploadUrl/objectUrl）は設定値だけで完結し通信しないため、
 * 実際にS3へ問い合わせるコピー・列挙・削除だけを差し替えている。
 */
class FakeImageStorage extends ImageStorage
{
    /** @var array<string, DateTimeInterface> キー => 最終更新日時 */
    private array $objects = [];

    /** @var array<string, array{size: int, type: string}> キー => 大きさと種類 */
    private array $metadata = [];

    /**
     * 置かれたことにするオブジェクト。最終更新日時を指定すれば古いオブジェクトを再現できる。
     * 大きさと種類を省くと、キーの拡張子に合った小さな画像が置かれたことにする
     */
    public function put(string $key, ?DateTimeInterface $lastModified = null, int $size = 1000, ?string $type = null): static
    {
        $this->objects[$key] = $lastModified ?? Carbon::now();
        $this->metadata[$key] = [
            'size' => $size,
            'type' => $type ?? (string) array_search(pathinfo($key, PATHINFO_EXTENSION), GetImageUploadUrlRequest::EXTENSIONS_BY_MEDIA_TYPE, true),
        ];

        return $this;
    }

    /** 現在ストレージに残っているキー */
    public function keys(): array
    {
        $keys = array_keys($this->objects);
        sort($keys);

        return $keys;
    }

    public function metadata(string $key): ?array
    {
        return isset($this->objects[$key]) ? $this->metadata[$key] : null;
    }

    public function move(string $from, string $to): void
    {
        if (! isset($this->objects[$from])) {
            throw new ImageNotFoundException($from);
        }

        $this->objects[$to] = $this->objects[$from];
        $this->metadata[$to] = $this->metadata[$from];
        unset($this->objects[$from], $this->metadata[$from]);
    }

    public function each(string $prefix): Generator
    {
        foreach ($this->objects as $key => $lastModified) {
            if (str_starts_with($key, $prefix)) {
                yield $key => $lastModified;
            }
        }
    }

    public function delete(array $keys): void
    {
        foreach ($keys as $key) {
            unset($this->objects[$key], $this->metadata[$key]);
        }
    }
}
