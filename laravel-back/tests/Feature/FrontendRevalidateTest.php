<?php

use App\Models\Article;
use App\Models\Category;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Sleep;

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

test('バリデーションで弾かれた投稿では、フロントへは何も送らない', function () {
    Http::preventStrayRequests();
    Http::fake();

    $this->actingAs($this->adminUser)
        ->postJson('/api/articles', ['title' => 'タイトルだけ'])
        ->assertStatus(422);

    Http::assertNothingSent();
});

test('他人の記事を削除しようとして弾かれたときは、フロントへは何も送らない', function () {
    $otherAdmin = User::factory()->create(['role' => 'admin']);
    $article = Article::factory()->for($otherAdmin)->for($this->category)->create();
    Http::preventStrayRequests();
    Http::fake();

    $this->actingAs($this->adminUser)
        ->deleteJson('/api/articles/'.$article->id)
        ->assertStatus(403);

    Http::assertNothingSent();
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

test('本番・ステージングでシークレットが未設定なら、設定漏れとして警告を残す', function (string $environment) {
    config(['services.frontend.revalidate_secret' => null]);
    $this->app['env'] = $environment;
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create();
    Http::preventStrayRequests();
    Http::fake();
    Log::spy();

    $this->actingAs($this->adminUser)
        ->deleteJson('/api/articles/'.$article->id)
        ->assertStatus(204);

    Http::assertNothingSent();
    Log::shouldHaveReceived('warning')->once();
})->with(['production', 'staging']);

test('フロントが一時的に5xxを返したら送り直し、成功すれば警告は残さない', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create();
    Http::preventStrayRequests();
    Http::fake([REVALIDATE_URL => Http::sequence()
        ->push(['revalidated' => false], 503)
        ->push(['revalidated' => true])]);
    Sleep::fake();
    Log::spy();

    $this->actingAs($this->adminUser)
        ->deleteJson('/api/articles/'.$article->id)
        ->assertStatus(204);

    Http::assertSentCount(2);
    Log::shouldNotHaveReceived('warning');
});

test('5xxが続いて送り直しを使い切っても、記事の変更は成功として返し、警告を1回残す', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create();
    Http::preventStrayRequests();
    Http::fake([REVALIDATE_URL => Http::response(['revalidated' => false], 503)]);
    Sleep::fake();
    Log::spy();

    $this->actingAs($this->adminUser)
        ->deleteJson('/api/articles/'.$article->id)
        ->assertStatus(204);

    $this->assertSoftDeleted('articles', ['id' => $article->id]);
    Http::assertSentCount(3);
    Log::shouldHaveReceived('warning')->once();
});

test('フロントにつながらなくても送り直し、使い切ったら記事の変更は成功として返し、警告を1回残す', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create();
    Http::preventStrayRequests();
    Http::fake([REVALIDATE_URL => Http::failedConnection()]);
    Sleep::fake();
    Log::spy();

    $this->actingAs($this->adminUser)
        ->deleteJson('/api/articles/'.$article->id)
        ->assertStatus(204);

    $this->assertSoftDeleted('articles', ['id' => $article->id]);
    Sleep::assertSleptTimes(2);
    Log::shouldHaveReceived('warning')->once();
});

test('シークレットの食い違い（401）は送り直さず、記事の変更は成功として返し、警告を残す', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create();
    Http::preventStrayRequests();
    Http::fake([REVALIDATE_URL => Http::response(['revalidated' => false], 401)]);
    Log::spy();

    $this->actingAs($this->adminUser)
        ->deleteJson('/api/articles/'.$article->id)
        ->assertStatus(204);

    $this->assertSoftDeleted('articles', ['id' => $article->id]);
    Http::assertSentCount(1);
    Log::shouldHaveReceived('warning')->once();
});
