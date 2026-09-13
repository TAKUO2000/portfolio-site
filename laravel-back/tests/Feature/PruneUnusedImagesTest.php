<?php

use App\Models\Article;
use App\Models\Category;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    useMinioStorage();
    $this->storage = fakeImageStorage();
    $this->user = User::factory()->create(['role' => 'admin']);
    $this->category = Category::create(['name' => 'テスト']);
});

/** 指定したキーの画像を持つ記事を作る */
function articleWithImage(string $key): Article
{
    $article = test()->user->articles()->create([
        'category_id'  => test()->category->id,
        'title'        => '記事',
        'summary'      => '概要',
        'body'         => '本文',
        'status'       => 'published',
        'published_at' => now(),
    ]);

    $article->images()->create(['object_key' => $key, 'type' => 'header']);

    return $article;
}

test('記事から参照されている画像は削除されない', function () {
    $key = 'images/11111111-1111-4111-8111-111111111111.png';
    articleWithImage($key);
    $this->storage->put($key, Carbon::now()->subDays(30));

    $this->artisan('images:prune')->assertExitCode(0);

    expect($this->storage->keys())->toBe([$key]);
});

test('どの記事からも参照されていない本置き場の画像は削除される', function () {
    $usedKey = 'images/11111111-1111-4111-8111-111111111111.png';
    $unusedKey = 'images/22222222-2222-4222-8222-222222222222.png';
    articleWithImage($usedKey);
    $this->storage->put($usedKey, Carbon::now()->subDays(30));
    $this->storage->put($unusedKey, Carbon::now()->subDays(30));

    $this->artisan('images:prune')->assertExitCode(0);

    expect($this->storage->keys())->toBe([$usedKey]);
});

test('アップロード直後の画像は参照が無くても削除されない', function () {
    $key = 'images/22222222-2222-4222-8222-222222222222.png';
    // 記事の保存処理が進行中の可能性があるため、猶予時間内のものは対象外になる
    $this->storage->put($key, Carbon::now()->subHour());

    $this->artisan('images:prune')->assertExitCode(0);

    expect($this->storage->keys())->toBe([$key]);
});

test('記事に添付されずに一時置き場へ残った画像は削除される', function () {
    $staleKey = 'tmp/33333333-3333-4333-8333-333333333333.png';
    $freshKey = 'tmp/44444444-4444-4444-8444-444444444444.png';
    $this->storage->put($staleKey, Carbon::now()->subDays(2));
    $this->storage->put($freshKey, Carbon::now());

    $this->artisan('images:prune')->assertExitCode(0);

    // アップロード中の可能性がある直近のものは残る
    expect($this->storage->keys())->toBe([$freshKey]);
});

test('論理削除された記事の画像は猶予期間内なら削除されない', function () {
    $key = 'images/11111111-1111-4111-8111-111111111111.png';
    $article = articleWithImage($key);
    $this->storage->put($key, Carbon::now()->subDays(60));

    Carbon::setTestNow(Carbon::now()->subDays(29));
    $article->delete();
    Carbon::setTestNow();

    $this->artisan('images:prune')->assertExitCode(0);

    expect($this->storage->keys())->toBe([$key]);
});

test('論理削除された記事の画像は猶予期間を過ぎると削除される', function () {
    $key = 'images/11111111-1111-4111-8111-111111111111.png';
    $article = articleWithImage($key);
    $this->storage->put($key, Carbon::now()->subDays(60));

    Carbon::setTestNow(Carbon::now()->subDays(31));
    $article->delete();
    Carbon::setTestNow();

    $this->artisan('images:prune')->assertExitCode(0);

    expect($this->storage->keys())->toBe([]);
});

test('dry-runでは対象を表示するだけで削除しない', function () {
    $unusedKey = 'images/22222222-2222-4222-8222-222222222222.png';
    $this->storage->put($unusedKey, Carbon::now()->subDays(30));

    $this->artisan('images:prune --dry-run')
        ->expectsOutputToContain($unusedKey)
        ->assertExitCode(0);

    expect($this->storage->keys())->toBe([$unusedKey]);
});
