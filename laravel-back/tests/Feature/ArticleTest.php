<?php

use App\Models\Category;
use App\Models\Reaction;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Support\Facades\DB;

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

test('new_tagsで新規タグが作成される', function () {
    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title'       => '新規タグ記事',
            'summary'     => 'テスト概要',
            'body'        => 'テスト本文',
            'status'      => 'published',
            'new_tags'    => ['Vue'],
        ]);

    $response->assertStatus(201)
        ->assertJsonFragment(['name' => 'Vue']);

    $this->assertDatabaseHas('tags', ['name' => 'Vue']);
});

test('論理削除済みタグと同名のnew_tagsを送ると復活して再利用される', function () {
    $tag = Tag::create(['name' => 'Vue']);
    $tag->delete();

    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title'       => '復活タグ記事',
            'summary'     => 'テスト概要',
            'body'        => 'テスト本文',
            'status'      => 'published',
            'new_tags'    => ['Vue'],
        ]);

    $response->assertStatus(201)
        ->assertJsonFragment(['id' => $tag->id, 'name' => 'Vue']);

    $this->assertDatabaseHas('tags', ['id' => $tag->id, 'name' => 'Vue', 'deleted_at' => null]);
    expect(Tag::withTrashed()->where('name', 'Vue')->count())->toBe(1);
});

test('大文字小文字違いで既存タグに一致した場合は表記が更新される', function () {
    $tag = Tag::create(['name' => 'rEact']);

    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title'       => '表記統一記事',
            'summary'     => 'テスト概要',
            'body'        => 'テスト本文',
            'status'      => 'published',
            'new_tags'    => ['React'],
        ]);

    $response->assertStatus(201)
        ->assertJsonFragment(['id' => $tag->id, 'name' => 'React']);

    $this->assertDatabaseHas('tags', ['id' => $tag->id, 'name' => 'React']);
    expect(Tag::withTrashed()->whereRaw('LOWER(name) = ?', ['react'])->count())->toBe(1);
});

test('タグ一括取得後に別プロセスが同名タグを先に作成していても一意制約違反にならず既存タグを使う（TOCTOU対策）', function () {
    // 一括SELECTでは見つからず、Tag::create()実行の直前に別リクエストが同名タグを作成した状況を再現
    Tag::creating(function () {
        DB::table('tags')->insert([
            'name'       => 'Rust',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    });

    try {
        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/articles', [
                'category_id' => $this->category->id,
                'title'       => '競合タグ記事',
                'summary'     => 'テスト概要',
                'body'        => 'テスト本文',
                'status'      => 'published',
                'new_tags'    => ['Rust'],
            ]);
    } finally {
        Tag::flushEventListeners();
    }

    $response->assertStatus(201)
        ->assertJsonFragment(['name' => 'Rust']);

    expect(Tag::withTrashed()->where('name', 'Rust')->count())->toBe(1);
});

test('new_tagsの全角スペースは正規化され既存タグと同一視される', function () {
    Tag::create(['name' => 'Vue']);

    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title'       => '全角スペース記事',
            'summary'     => 'テスト概要',
            'body'        => 'テスト本文',
            'status'      => 'published',
            'new_tags'    => ['　Vue'], // 先頭に全角スペース
        ]);

    $response->assertStatus(201)
        ->assertJsonFragment(['name' => 'Vue']);

    expect(Tag::withTrashed()->where('name', 'Vue')->count())->toBe(1);
});

test('new_tags内で表記ゆれが重複している場合は1件にまとめられる', function () {
    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title'       => '重複タグ記事',
            'summary'     => 'テスト概要',
            'body'        => 'テスト本文',
            'status'      => 'published',
            'new_tags'    => ['React', 'react', '　React', ' React '],
        ]);

    $response->assertStatus(201);

    expect(Tag::withTrashed()->whereRaw('LOWER(name) = ?', ['react'])->count())->toBe(1);

    $article = \App\Models\Article::where('title', '重複タグ記事')->first();
    expect($article->tags)->toHaveCount(1);
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

test('new_tagsが空白のみの場合はバリデーションエラーになる', function () {
    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title'       => '記事',
            'summary'     => '概要',
            'body'        => '本文',
            'status'      => 'published',
            'new_tags'    => [' ', '　', ''],
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['new_tags.0', 'new_tags.1', 'new_tags.2']);
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
        ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']])
        ->assertJsonFragment(['title' => '公開記事']);
});

test('記事一覧のレスポンス構造が正しい', function () {
    $tag = Tag::first();
    $article = $this->adminUser->articles()->create([
        'category_id'  => $this->category->id,
        'title'        => '構造確認記事',
        'summary'      => '概要',
        'body'         => '本文',
        'status'       => 'published',
        'published_at' => now(),
    ]);
    $article->headerImage()->create(['url' => 'https://example.com/image.png', 'type' => 'header']);
    $article->tags()->sync([$tag->id]);

    $response = $this->getJson('/api/articles');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'title',
                    'summary',
                    'header_image',
                    'published_at',
                    'user'     => ['id', 'name'],
                    'category' => ['id', 'name'],
                    'tags'     => [['id', 'name']],
                ],
            ],
            'meta' => ['current_page', 'last_page', 'total'],
        ])
        ->assertJsonMissing(['body' => '本文'])
        ->assertJsonMissing(['status' => 'published'])
        ->assertJsonMissing(['pivot']);
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
        ->assertJsonStructure(['data' => ['id', 'title', 'body', 'published_at', 'user', 'category', 'tags', 'like_count', 'images']]);
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
