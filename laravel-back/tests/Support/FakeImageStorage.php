<?php

namespace Tests\Support;

use App\Http\Requests\GetImageUploadUrlRequest;
use App\Services\ImageChangedException;
use App\Services\ImageNotFoundException;
use App\Services\ImageStorage;
use Closure;
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

    /** @var array<string, array{size: int, type: string, etag: string, head: string}> キー => 大きさ・種類・中身の目印・先頭のバイト */
    private array $metadata = [];

    /** 先頭のバイト（マジックナンバー）。種類を省いたときに、それらしい中身にする */
    private const HEADS = [
        'image/png'  => "\x89PNG\r\n\x1a\n\0\0\0\0",
        'image/jpeg' => "\xFF\xD8\xFF\xE0\0\0\0\0\0\0\0\0",
        'image/gif'  => 'GIF89a\0\0\0\0\0\0',
        'image/webp' => 'RIFF\0\0\0\0WEBP',
    ];

    private int $version = 0;

    /** move() の直前に呼ばれる。確かめてから移すまでの間の差し替えを再現する */
    public ?Closure $beforeMove = null;

    /**
     * 置かれたことにするオブジェクト。最終更新日時を指定すれば古いオブジェクトを再現できる。
     * 大きさ・種類・先頭のバイトを省くと、キーの拡張子に合った小さな画像が置かれたことにする。
     * 置き直すたびに中身の目印（ETag）が変わる
     */
    public function put(string $key, ?DateTimeInterface $lastModified = null, int $size = 1000, ?string $type = null, ?string $head = null): static
    {
        $type ??= (string) array_search(pathinfo($key, PATHINFO_EXTENSION), GetImageUploadUrlRequest::EXTENSIONS_BY_MEDIA_TYPE, true);

        $this->objects[$key] = $lastModified ?? Carbon::now();
        $this->metadata[$key] = [
            'size' => $size,
            'type' => $type,
            'etag' => '"etag-' . (++$this->version) . '"',
            'head' => $head ?? (self::HEADS[$type] ?? ''),
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
        if (! isset($this->objects[$key])) {
            return null;
        }

        ['size' => $size, 'type' => $type, 'etag' => $etag] = $this->metadata[$key];

        return ['size' => $size, 'type' => $type, 'etag' => $etag];
    }

    public function readHead(string $key, int $length): string
    {
        return substr($this->metadata[$key]['head'], 0, $length);
    }

    public function move(string $from, string $to, ?string $ifMatch = null): void
    {
        if ($this->beforeMove !== null) {
            ($this->beforeMove)($from);
        }

        if (! isset($this->objects[$from])) {
            throw new ImageNotFoundException($from);
        }

        if ($ifMatch !== null && $this->metadata[$from]['etag'] !== $ifMatch) {
            throw new ImageChangedException($from);
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
