<?php

namespace App\Models;

use App\Services\ImageStorage;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ArticleImage extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['article_id', 'object_key', 'type'];

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    /**
     * 表示用URLはDBに持たず、保存しているキーから実行時に組み立てる。
     * エンドポイントやバケットを変更しても既存レコードに手を入れずに済む。
     */
    protected function url(): Attribute
    {
        return Attribute::get(
            fn (): string => app(ImageStorage::class)->objectUrl($this->object_key)
        );
    }
}
