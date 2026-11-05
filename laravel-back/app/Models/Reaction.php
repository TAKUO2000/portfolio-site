<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reaction extends Model
{
    /** 好評価。記事の「いいね数」はこの種別だけを数える */
    public const TYPE_LIKE = 'like';

    /** 低評価 */
    public const TYPE_BAD = 'bad';

    /** あとで読む */
    public const TYPE_BOOKMARK = 'bookmark';

    protected $primaryKey = null;
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = ['user_id', 'article_id', 'type'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
