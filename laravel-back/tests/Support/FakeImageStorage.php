<?php

namespace Tests\Support;

use App\Services\ImageStorage;
use DateTimeInterface;
use Generator;
use Illuminate\Support\Carbon;
use RuntimeException;

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

    /** 置かれたことにするオブジェクト。最終更新日時を指定すれば古いオブジェクトを再現できる */
    public function put(string $key, ?DateTimeInterface $lastModified = null): static
    {
        $this->objects[$key] = $lastModified ?? Carbon::now();

        return $this;
    }

    /** 現在ストレージに残っているキー */
    public function keys(): array
    {
        $keys = array_keys($this->objects);
        sort($keys);

        return $keys;
    }

    public function move(string $from, string $to): void
    {
        if (! isset($this->objects[$from])) {
            throw new RuntimeException("移動元のオブジェクトがありません: {$from}");
        }

        $this->objects[$to] = $this->objects[$from];
        unset($this->objects[$from]);
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
            unset($this->objects[$key]);
        }
    }
}
