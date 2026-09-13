<?php

use App\Models\Article;
use App\Models\Category;
use App\Models\User;

beforeEach(function () {
    useMinioStorage();
    $this->storage = fakeImageStorage();

    $this->adminUser = User::factory()->create(['role' => 'admin']);
    $this->subAdminUser = User::factory()->create(['role' => 'admin']);
    $this->generalUser = User::factory()->create(['role' => 'user']);
    $this->category = Category::create(['name' => 'テスト']);
});

// ---------------------------------------------------------------- 一覧 GET /articles/mine

test('自分の記事を下書きも含めて取得できる', function () {
    Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '公開記事']);
    Article::factory()->for($this->adminUser)->for($this->category)->draft()->create(['title' => '下書き記事']);

    $response = $this->actingAs($this->adminUser)->getJson('/api/articles/mine');

    $response->assertStatus(200);
    expect($response->json('data.*.title'))->toContain('公開記事', '下書き記事');
});

test('他ユーザーの記事は一覧に含まれない', function () {
    Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '自分の記事']);
    Article::factory()->for($this->subAdminUser)->for($this->category)->create(['title' => '他人の記事']);

    $response = $this->actingAs($this->adminUser)->getJson('/api/articles/mine');

    expect($response->json('data.*.title'))->toBe(['自分の記事']);
});

test('論理削除した記事は一覧から消える', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '削除する記事']);
    Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '残る記事']);

    $article->delete();

    $response = $this->actingAs($this->adminUser)->getJson('/api/articles/mine');

    expect($response->json('data.*.title'))->toBe(['残る記事']);
});

test('一覧は最終更新が新しい順に並ぶ', function () {
    $old = Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '古い記事']);
    $new = Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '新しい記事']);

    // 書きかけを見つけやすいよう、公開日ではなく更新日で並べている
    $old->forceFill(['updated_at' => now()->subDays(3)])->saveQuietly();
    $new->forceFill(['updated_at' => now()])->saveQuietly();

    $response = $this->actingAs($this->adminUser)->getJson('/api/articles/mine');

    expect($response->json('data.*.title'))->toBe(['新しい記事', '古い記事']);
});

test('statusで絞り込める', function () {
    Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '公開記事']);
    Article::factory()->for($this->adminUser)->for($this->category)->draft()->create(['title' => '下書き記事']);

    $response = $this->actingAs($this->adminUser)->getJson('/api/articles/mine?status=draft');

    expect($response->json('data.*.title'))->toBe(['下書き記事']);
});

test('keywordでタイトルを絞り込める', function () {
    Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => 'Laravelの記事']);
    Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => 'Vueの記事']);

    $response = $this->actingAs($this->adminUser)->getJson('/api/articles/mine?keyword=Laravel');

    expect($response->json('data.*.title'))->toBe(['Laravelの記事']);
});

test('一覧は本文を返さない', function () {
    Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '記事']);

    $response = $this->actingAs($this->adminUser)->getJson('/api/articles/mine');

    $response->assertJsonStructure([
        'data' => [['id', 'title', 'summary', 'status', 'published_at', 'updated_at', 'category', 'header_image']],
    ]);
    expect($response->json('data.0'))->not->toHaveKey('body');
});

test('一般ユーザーは一覧を取得できない', function () {
    $this->actingAs($this->generalUser)->getJson('/api/articles/mine')->assertStatus(403);
});

test('未認証ユーザーは一覧を取得できない', function () {
    $this->getJson('/api/articles/mine')->assertStatus(401);
});

test('mineは公開側の記事詳細ルートに飲み込まれない', function () {
    Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '記事']);

    // /articles/{id} と形が重なるため、数値に限定して取り違えを防いでいる
    $this->actingAs($this->adminUser)->getJson('/api/articles/mine')->assertStatus(200);
    $this->getJson('/api/articles/abc')->assertStatus(404);
});

// ---------------------------------------------------------------- 単体 GET /articles/{article}/edit

test('下書き記事も編集用に取得できる', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->draft()->create(['title' => '下書き記事']);

    $response = $this->actingAs($this->adminUser)->getJson("/api/articles/{$article->id}/edit");

    $response->assertStatus(200)
        ->assertJsonFragment(['title' => '下書き記事', 'status' => 'draft'])
        // 更新APIのレスポンスと同じ形（編集フォームをそのまま復元できる）
        ->assertJsonStructure([
            'data' => [
                'id', 'title', 'summary', 'body', 'status', 'published_at',
                'category' => ['id', 'name'], 'tags', 'header_image_key', 'header_image_url',
            ],
        ]);
});

test('編集用取得では他ユーザーの記事は403になる', function () {
    $article = Article::factory()->for($this->subAdminUser)->for($this->category)->create(['title' => '他人の記事']);

    $this->actingAs($this->adminUser)
        ->getJson("/api/articles/{$article->id}/edit")
        ->assertStatus(403);
});

test('存在しない記事の編集用取得は404になる', function () {
    $this->actingAs($this->adminUser)->getJson('/api/articles/999999/edit')->assertStatus(404);
});

test('論理削除済み記事の編集用取得は404になる', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '削除済み記事']);
    $article->delete();

    $this->actingAs($this->adminUser)
        ->getJson("/api/articles/{$article->id}/edit")
        ->assertStatus(404);
});

test('一般ユーザーは編集用取得ができない', function () {
    $article = Article::factory()->for($this->generalUser)->for($this->category)->create(['title' => '一般ユーザーの記事']);

    $this->actingAs($this->generalUser)
        ->getJson("/api/articles/{$article->id}/edit")
        ->assertStatus(403);
});

// ---------------------------------------------------------------- ステータス変更 PATCH /articles/{article}/status

test('公開記事を下書きに戻せる', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '公開記事']);

    $response = $this->actingAs($this->adminUser)
        ->patchJson("/api/articles/{$article->id}/status", ['status' => 'draft']);

    $response->assertStatus(200)->assertJsonFragment(['status' => 'draft']);
    expect($article->fresh()->status)->toBe('draft');
});

test('下書きを公開するとpublished_atが入る', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->draft()->create(['title' => '下書き記事']);

    $this->actingAs($this->adminUser)
        ->patchJson("/api/articles/{$article->id}/status", ['status' => 'published'])
        ->assertStatus(200);

    expect($article->fresh()->published_at)->not->toBeNull();
});

test('下書きに戻して再公開してもpublished_atは初回公開日のまま', function () {
    $firstPublishedAt = now()->subDays(5);
    $article = Article::factory()->for($this->adminUser)->for($this->category)->published($firstPublishedAt)->create(['title' => '公開記事']);

    // 更新APIと同じ扱い（編集のたびに一覧の並び順が変わらないようにするため）
    $this->actingAs($this->adminUser)
        ->patchJson("/api/articles/{$article->id}/status", ['status' => 'draft'])->assertStatus(200);
    $this->actingAs($this->adminUser)
        ->patchJson("/api/articles/{$article->id}/status", ['status' => 'published'])->assertStatus(200);

    expect($article->fresh()->published_at->timestamp)->toBe($firstPublishedAt->timestamp);
});

test('本文やタイトルを送らなくてもステータスだけ変えられる', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '元のタイトル']);

    $this->actingAs($this->adminUser)
        ->patchJson("/api/articles/{$article->id}/status", ['status' => 'draft'])
        ->assertStatus(200);

    // 一覧画面は本文やヘッダー画像キーを持たないため、statusだけで通る必要がある
    expect($article->fresh()->title)->toBe('元のタイトル');
    expect($article->fresh()->body)->toBe($article->body);
});

test('許可されていないstatusはバリデーションエラーになる', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '記事']);

    $this->actingAs($this->adminUser)
        ->patchJson("/api/articles/{$article->id}/status", ['status' => 'archived'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
});

test('他ユーザーの記事のステータスは変更できない', function () {
    $article = Article::factory()->for($this->subAdminUser)->for($this->category)->create(['title' => '他人の記事']);

    $this->actingAs($this->adminUser)
        ->patchJson("/api/articles/{$article->id}/status", ['status' => 'draft'])
        ->assertStatus(403);

    expect($article->fresh()->status)->toBe('published');
});

test('存在しない記事のステータス変更は404になる', function () {
    $this->actingAs($this->adminUser)
        ->patchJson('/api/articles/999999/status', ['status' => 'draft'])
        ->assertStatus(404);
});

test('未認証ユーザーはステータスを変更できない', function () {
    $article = Article::factory()->for($this->adminUser)->for($this->category)->create(['title' => '記事']);

    $this->patchJson("/api/articles/{$article->id}/status", ['status' => 'draft'])
        ->assertStatus(401);
});
