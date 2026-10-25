<?php

use App\Models\Article;
use App\Models\Category;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

const REVALIDATE_URL = 'https://front.test/api/revalidate';

beforeEach(function () {
    useMinioStorage();
    $this->storage = fakeImageStorage();

    config([
        'app.frontend_url' => 'https://front.test',
        'services.frontend.revalidate_secret' => 'secret',
    ]);

    $this->adminUser = User::factory()->create(['role' => 'admin']);
    $this->category = Category::create(['name' => 'テスト']);
});

/** 記事を変更する各APIのあとに、Next.jsへシークレット付きで再検証を頼んだか */
function assertRevalidateRequested(): void
{
    Http::assertSent(fn (Request $request) => $request->url() === REVALIDATE_URL
        && $request->method() === 'POST'
        && $request->hasHeader('Authorization', 'Bearer secret'));
}

test('記事を投稿すると、フロントの記事一覧のキャッシュを捨てさせる', function () {
    Http::preventStrayRequests();
    Http::fake([REVALIDATE_URL => Http::response(['revalidated' => true])]);

    $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title' => 'テスト記事',
            'summary' => 'テスト概要',
            'body' => 'テスト本文',
            'status' => 'published',
            'header_image_key' => pendingImageKey(),
        ])
        ->assertStatus(201);

    assertRevalidateRequested();
});

test('記事を更新すると、フロントの記事一覧のキャッシュを捨てさせる', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create();
    Http::preventStrayRequests();
    Http::fake([REVALIDATE_URL => Http::response(['revalidated' => true])]);

    $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => '更新後タイトル',
            'summary' => '更新後概要',
            'body' => '更新後本文',
            'status' => 'published',
            'header_image_key' => pendingImageKey(),
        ])
        ->assertStatus(200);

    assertRevalidateRequested();
});

test('記事の公開・下書きを切り替えると、フロントの記事一覧のキャッシュを捨てさせる', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->draft()->create();
    Http::preventStrayRequests();
    Http::fake([REVALIDATE_URL => Http::response(['revalidated' => true])]);

    $this->actingAs($this->adminUser)
        ->patchJson("/api/articles/{$article->id}/status", ['status' => 'published'])
        ->assertStatus(200);

    assertRevalidateRequested();
});

test('記事を削除すると、フロントの記事一覧のキャッシュを捨てさせる', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create();
    Http::preventStrayRequests();
    Http::fake([REVALIDATE_URL => Http::response(['revalidated' => true])]);

    $this->actingAs($this->adminUser)
        ->deleteJson('/api/articles/'.$article->id)
        ->assertStatus(204);

    assertRevalidateRequested();
});

test('シークレットが未設定なら、フロントへは何も送らない', function () {
    config(['services.frontend.revalidate_secret' => null]);
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create();
    Http::preventStrayRequests();
    Http::fake();

    $this->actingAs($this->adminUser)
        ->deleteJson('/api/articles/'.$article->id)
        ->assertStatus(204);

    Http::assertNothingSent();
});

test('フロントが再検証に失敗しても、記事の変更は成功として返し、警告を残す', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create();
    Http::preventStrayRequests();
    Http::fake([REVALIDATE_URL => Http::response(['revalidated' => false], 500)]);
    Log::spy();

    $this->actingAs($this->adminUser)
        ->deleteJson('/api/articles/'.$article->id)
        ->assertStatus(204);

    $this->assertSoftDeleted('articles', ['id' => $article->id]);
    Log::shouldHaveReceived('warning')->once();
});
