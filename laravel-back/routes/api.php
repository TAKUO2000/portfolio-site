<?php

use App\Models\Category;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\ArticleLikeController;
use App\Http\Controllers\ImageController;

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    // 画面で使う項目だけを返す（日時や削除状態は出さない）
    return [
        ...$request->user()->only(['id', 'name', 'email', 'role']),
        'email_verified' => $request->user()->hasVerifiedEmail(),
    ];
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

// いいねは連打されてもDBを叩き続けないよう、1分あたりの回数を絞る
Route::middleware(['auth:sanctum', 'throttle:60,1'])
    ->prefix('articles/{id}/like')
    ->whereNumber('id')
    ->group(function () {
        Route::get('/', [ArticleLikeController::class, 'show']);
        // いいねできるのは、メールアドレスを確認したユーザーだけ（確認前は409）
        Route::middleware('verified')->group(function () {
            Route::post('/', [ArticleLikeController::class, 'store']);
            Route::delete('/', [ArticleLikeController::class, 'destroy']);
        });
    });

Route::prefix('articles')->group(function () {
    Route::get('/', [ArticleController::class, 'index']);
    Route::get('/{id}', [ArticleController::class, 'show'])->whereNumber('id');
});

Route::get('/categories', fn() => Category::all(['id', 'name']));
Route::get('/tags', fn() => Tag::all(['id', 'name']));

require __DIR__ . '/auth.php';
