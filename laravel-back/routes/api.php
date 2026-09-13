<?php

use App\Models\Category;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\ImageController;

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    // {article}を数値に限定する。そうしないと /articles/mine が他メソッドのルートに
    // 引っかかり、GETで405が返るなど紛らわしい応答になる
    Route::prefix('articles')->whereNumber('article')->group(function () {
        // 記事管理画面用。公開側の /articles/{id} より先に登録する
        Route::get('/mine', [ArticleController::class, 'mine']);
        Route::post('/', [ArticleController::class, 'store']);
        Route::get('/{article}/edit', [ArticleController::class, 'edit']);
        Route::put('/{article}', [ArticleController::class, 'update']);
        Route::patch('/{article}/status', [ArticleController::class, 'updateStatus']);
        Route::delete('/{article}', [ArticleController::class, 'destroy']);
    });
    Route::post('/images/upload-url', [ImageController::class, 'getUploadUrl']);
});

Route::prefix('articles')->group(function () {
    Route::get('/', [ArticleController::class, 'index']);
    Route::get('/{id}', [ArticleController::class, 'show'])->whereNumber('id');
});

Route::get('/categories', fn() => Category::all(['id', 'name']));
Route::get('/tags', fn() => Tag::all(['id', 'name']));

require __DIR__ . '/auth.php';
