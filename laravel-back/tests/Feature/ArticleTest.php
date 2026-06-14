<?php

use App\Models\Category;
use App\Models\Reaction;
use App\Models\Tag;
use App\Models\User;

beforeEach(function () {
    $this->adminUser = User::factory()->create(['role' => 'admin']);
    $this->subAdminUser = User::factory()->create(['role' => 'admin']);
    $this->generalUser = User::factory()->create(['role' => 'user']);
    $this->category = Category::create(['name' => 'テスト']);
    $this->tags = Tag::insert([
        ['name' => 'Laravel', 'created_at' => now(), 'updated_at' => now()],
        ['name' => 'PHP',     'created_at' => now(), 'updated_at' => now()],
    ]);
});

test('adminユーザーが記事を投稿できる', function () {
    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title'       => 'テスト記事',
            'summary'     => 'テスト概要',
            'body'        => 'テスト本文',
            'status'      => 'published',
            'tags'        => Tag::pluck('id')->toArray(),
        ]);

    $response->assertStatus(201)
        ->assertJsonFragment(['title' => 'テスト記事'])
        ->assertJsonFragment(['status' => 'published']);

    $this->assertDatabaseHas('articles', [
        'title'   => 'テスト記事',
        'user_id' => $this->adminUser->id,
    ]);
});

test('adminユーザーがdraftで記事を投稿できる', function () {
    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title'       => '下書き記事',
            'summary'     => 'テスト概要',
            'body'        => 'テスト本文',
            'status'      => 'draft',
        ]);

    $response->assertStatus(201)
        ->assertJsonFragment(['status' => 'draft']);

    $this->assertDatabaseHas('articles', [
        'title'        => '下書き記事',
        'published_at' => null,
    ]);
});

test('一般ユーザーは記事を投稿できない', function () {
    $response = $this->actingAs($this->generalUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title'       => '記事',
            'summary'     => '概要',
            'body'        => '本文',
            'status'      => 'published',
        ]);

    $response->assertStatus(403);
});

test('未認証ユーザーは記事を投稿できない', function () {
    $response = $this->postJson('/api/articles', [
        'category_id' => $this->category->id,
        'title'       => '記事',
        'summary'     => '概要',
        'body'        => '本文',
        'status'      => 'published',
    ]);

    $response->assertStatus(401);
});

test('必須項目が欠けている場合はバリデーションエラーになる', function () {
    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['category_id', 'title', 'summary', 'body', 'status']);
});

test('存在しないcategory_idはバリデーションエラーになる', function () {
    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => 9999,
            'title'       => '記事',
            'summary'     => '概要',
            'body'        => '本文',
            'status'      => 'published',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['category_id']);
});

// index
test('記事一覧が取得できる', function () {
    $this->adminUser->articles()->create([
        'category_id'  => $this->category->id,
        'title'        => '公開記事',
        'summary'      => '概要',
        'body'         => '本文',
        'status'       => 'published',
        'published_at' => now(),
    ]);

    $response = $this->getJson('/api/articles');

    $response->assertStatus(200)
        ->assertJsonStructure(['data', 'current_page', 'total'])
        ->assertJsonFragment(['title' => '公開記事']);
});

test('draft記事は一覧に含まれない', function () {
    $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title'       => '下書き記事',
        'summary'     => '概要',
        'body'        => '本文',
        'status'      => 'draft',
    ]);

    $response = $this->getJson('/api/articles');

    $response->assertStatus(200)
        ->assertJsonMissing(['title' => '下書き記事']);
});

test('keywordでタイトル検索できる', function () {
    $this->adminUser->articles()->createMany([
        ['category_id' => $this->category->id, 'title' => 'Laravel入門', 'summary' => '概要', 'body' => '本文', 'status' => 'published', 'published_at' => now()],
        ['category_id' => $this->category->id, 'title' => 'PHP基礎',    'summary' => '概要', 'body' => '本文', 'status' => 'published', 'published_at' => now()],
    ]);

    $response = $this->getJson('/api/articles?keyword=Laravel');

    $response->assertStatus(200)
        ->assertJsonFragment(['title' => 'Laravel入門'])
        ->assertJsonMissing(['title' => 'PHP基礎']);
});

test('categoriesで絞り込める', function () {
    $other = Category::create(['name' => '別カテゴリ']);

    $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '対象記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);
    $this->adminUser->articles()->create([
        'category_id' => $other->id,
        'title' => '別カテゴリ記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->getJson('/api/articles?categories[]=' . $this->category->id);

    $response->assertStatus(200)
        ->assertJsonFragment(['title' => '対象記事'])
        ->assertJsonMissing(['title' => '別カテゴリ記事']);
});

test('tagsで絞り込める', function () {
    $tags = Tag::all();

    $articleWithTag = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => 'タグあり記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);
    $articleWithTag->tags()->sync([$tags->first()->id]);

    $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => 'タグなし記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->getJson('/api/articles?tags[]=' . $tags->first()->id);

    $response->assertStatus(200)
        ->assertJsonFragment(['title' => 'タグあり記事'])
        ->assertJsonMissing(['title' => 'タグなし記事']);
});

test('author_idで絞り込める', function () {
    $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '管理者の記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);
    $this->generalUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '一般ユーザーの記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->getJson('/api/articles?author_id=' . $this->adminUser->id);

    $response->assertStatus(200)
        ->assertJsonFragment(['title' => '管理者の記事'])
        ->assertJsonMissing(['title' => '一般ユーザーの記事']);
});

test('sort=latestで公開日降順になる', function () {
    $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '古い記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now()->subDay(),
    ]);
    $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '新しい記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->getJson('/api/articles?sort=latest');

    $titles = collect($response->json('data'))->pluck('title');
    expect($titles->first())->toBe('新しい記事');
});

test('sort=popularでreaction数降順になる', function () {
    $articleA = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => 'reaction少ない記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);
    $articleB = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => 'reaction多い記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now()->subDay(),
    ]);

    Reaction::create(['user_id' => $this->generalUser->id, 'article_id' => $articleB->id, 'type' => 'like']);

    $response = $this->getJson('/api/articles?sort=popular');

    $titles = collect($response->json('data'))->pluck('title');
    expect($titles->first())->toBe('reaction多い記事');
});

//削除用テスト
test('自分の投稿記事を削除', function () {
    $article = $this->adminUser->articles()->create([
        'category_id'  => $this->category->id,
        'title'        => '削除する記事',
        'summary'      => '概要',
        'body'         => '本文',
        'status'       => 'published',
        'published_at' => now(),
    ]);

    $response = $this->actingAs($this->adminUser)
        ->deleteJson('/api/articles/' . $article->id);

    $response->assertStatus(204);
    $this->assertSoftDeleted('articles', ['id' => $article->id]);
});

test('他ユーザの記事は削除できない', function () {
    $article = $this->subAdminUser->articles()->create([
        'category_id'   => $this->category->id,
        'title'        => 'subAdominUserが作った記事',
        'summary'      => '概要',
        'body'         => '本文',
        'status'       => 'published',
        'published_at' => now(),
    ]);

    $response = $this->actingAs($this->adminUser)
        ->deleteJson('/api/articles/' . $article->id);

    $response->assertStatus(403);
    $this->assertDatabaseHas('articles', ['id' => $article->id]);
});

test('未認証ユーザーは記事を削除できない', function () {
    $article = $this->adminUser->articles()->create([
        'category_id'  => $this->category->id,
        'title'        => '削除できない記事',
        'summary'      => '概要',
        'body'         => '本文',
        'status'       => 'published',
        'published_at' => now(),
    ]);

    $response = $this->deleteJson('/api/articles/' . $article->id);

    $response->assertStatus(401);
    $this->assertDatabaseHas('articles', ['id' => $article->id]);
});

//記事表示show（記事ページ）
test('未認証でも表示可能', function () {
    $article = $this->adminUser->articles()->create([
        'category_id'  => $this->category->id,
        'title'        => '公開記事',
        'summary'      => '概要',
        'body'         => '本文',
        'status'       => 'published',
        'published_at' => now(),
    ]);

    $response = $this->getJson('/api/articles/' . $article->id);

    $response->assertStatus(200)
        ->assertJsonFragment(['title' => '公開記事'])
        ->assertJsonStructure(['id', 'title', 'summary', 'body', 'status', 'user', 'category', 'tags']);
});

test('記事が非公開の場合表示不可', function () {
    $article = $this->adminUser->articles()->create([
        'category_id'  => $this->category->id,
        'title'        => '非表示記事',
        'summary'      => '概要',
        'body'         => '本文',
        'status'       => 'draft',
        'published_at' => null,
    ]);

    $response = $this->getJson('/api/articles/' . $article->id);

    $response->assertStatus(404);
});

test('記事が削除されている場合も非表示', function () {
    $article = $this->adminUser->articles()->create([
        'category_id'  => $this->category->id,
        'title'        => '非表示記事',
        'summary'      => '概要',
        'body'         => '本文',
        'status'       => 'published',
        'published_at' => now(),
    ]);
    $article->delete();

    $response = $this->getJson('/api/articles/' . $article->id);

    $response->assertStatus(404);
});

test('そもそも記事がない場合も非表示', function () {
    $response = $this->getJson('/api/articles/1');

    $response->assertStatus(404);
});
