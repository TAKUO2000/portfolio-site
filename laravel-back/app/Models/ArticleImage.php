<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ArticleImage extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['article_id', 'url', 'type'];

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
