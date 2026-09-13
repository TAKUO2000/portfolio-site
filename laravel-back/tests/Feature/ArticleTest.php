<?php

use App\Models\Article;
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
            'title' => 'テスト記事',
            'summary' => 'テスト概要',
            'body' => 'テスト本文',
            'status' => 'published',
            'tags' => Tag::pluck('id')->toArray(),
        ]);

    $response->assertStatus(201)
        ->assertJsonFragment(['title' => 'テスト記事'])
        ->assertJsonFragment(['status' => 'published']);

    $this->assertDatabaseHas('articles', [
        'title' => 'テスト記事',
        'user_id' => $this->adminUser->id,
    ]);
});

test('adminユーザーがdraftで記事を投稿できる', function () {
    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title' => '下書き記事',
            'summary' => 'テスト概要',
            'body' => 'テスト本文',
            'status' => 'draft',
        ]);

    $response->assertStatus(201)
        ->assertJsonFragment(['status' => 'draft']);

    $this->assertDatabaseHas('articles', [
        'title' => '下書き記事',
        'published_at' => null,
    ]);
});

test('new_tagsで新規タグが作成される', function () {
    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title' => '新規タグ記事',
            'summary' => 'テスト概要',
            'body' => 'テスト本文',
            'status' => 'published',
            'new_tags' => ['Vue'],
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
            'title' => '復活タグ記事',
            'summary' => 'テスト概要',
            'body' => 'テスト本文',
            'status' => 'published',
            'new_tags' => ['Vue'],
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
            'title' => '表記統一記事',
            'summary' => 'テスト概要',
            'body' => 'テスト本文',
            'status' => 'published',
            'new_tags' => ['React'],
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
            'name' => 'Rust',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    });

    try {
        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/articles', [
                'category_id' => $this->category->id,
                'title' => '競合タグ記事',
                'summary' => 'テスト概要',
                'body' => 'テスト本文',
                'status' => 'published',
                'new_tags' => ['Rust'],
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
            'title' => '全角スペース記事',
            'summary' => 'テスト概要',
            'body' => 'テスト本文',
            'status' => 'published',
            'new_tags' => ['　Vue'], // 先頭に全角スペース
        ]);

    $response->assertStatus(201)
        ->assertJsonFragment(['name' => 'Vue']);

    expect(Tag::withTrashed()->where('name', 'Vue')->count())->toBe(1);
});

test('new_tags内で表記ゆれが重複している場合は1件にまとめられる', function () {
    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title' => '重複タグ記事',
            'summary' => 'テスト概要',
            'body' => 'テスト本文',
            'status' => 'published',
            'new_tags' => ['React', 'react', '　React', ' React '],
        ]);

    $response->assertStatus(201);

    expect(Tag::withTrashed()->whereRaw('LOWER(name) = ?', ['react'])->count())->toBe(1);

    $article = Article::where('title', '重複タグ記事')->first();
    expect($article->tags)->toHaveCount(1);
});

test('一般ユーザーは記事を投稿できない', function () {
    $response = $this->actingAs($this->generalUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title' => '記事',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
        ]);

    $response->assertStatus(403);
});

test('未認証ユーザーは記事を投稿できない', function () {
    $response = $this->postJson('/api/articles', [
        'category_id' => $this->category->id,
        'title' => '記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
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
            'title' => '記事',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['category_id']);
});

test('new_tagsが空白のみの場合はバリデーションエラーになる', function () {
    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title' => '記事',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
            'new_tags' => [' ', '　', ''],
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['new_tags.0', 'new_tags.1', 'new_tags.2']);
});

test('header_image_keyと本文中の画像が記事画像として保存される', function () {
    useMinioStorage();
    $storage = fakeImageStorage();
    $headerKey = 'tmp/11111111-1111-4111-8111-111111111111.png';
    $bodyKey = 'tmp/22222222-2222-4222-8222-222222222222.png';
    $storage->put($headerKey)->put($bodyKey);

    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title' => '画像付き記事',
            'summary' => 'テスト概要',
            'body' => "テスト本文 ![](http://localhost:9002/test-bucket/{$bodyKey})",
            'status' => 'published',
            'header_image_key' => $headerKey,
        ]);

    $response->assertStatus(201);

    $article = Article::where('title', '画像付き記事')->first();

    // 一時置き場から本置き場へ移されたキーが保存される
    $this->assertDatabaseHas('article_images', [
        'article_id' => $article->id,
        'object_key' => 'images/11111111-1111-4111-8111-111111111111.png',
        'type' => 'header',
    ]);
    $this->assertDatabaseHas('article_images', [
        'article_id' => $article->id,
        'object_key' => 'images/22222222-2222-4222-8222-222222222222.png',
        'type' => 'body',
    ]);

    // 本文中の参照も本置き場のURLに書き換わる
    expect($article->body)->toBe(
        'テスト本文 ![](http://localhost:9002/test-bucket/images/22222222-2222-4222-8222-222222222222.png)'
    );

    // ストレージ側も一時置き場には残らない
    expect($storage->keys())->toBe([
        'images/11111111-1111-4111-8111-111111111111.png',
        'images/22222222-2222-4222-8222-222222222222.png',
    ]);
});

test('同じ本文画像が複数回貼られていても一度だけ移動して保存される', function () {
    useMinioStorage();
    $storage = fakeImageStorage();
    $bodyKey = 'tmp/33333333-3333-4333-8333-333333333333.png';
    $storage->put($bodyKey);

    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title' => '同じ画像を2回貼った記事',
            'summary' => 'テスト概要',
            'body' => "![](/{$bodyKey}) と ![](/{$bodyKey})",
            'status' => 'published',
        ]);

    $response->assertStatus(201);

    $article = Article::where('title', '同じ画像を2回貼った記事')->first();
    expect($article->images)->toHaveCount(1);
    expect($article->body)->not->toContain('tmp/');
});

test('アプリが発行した形式でないheader_image_keyはバリデーションエラーになる', function () {
    useMinioStorage();

    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title' => '記事',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
            'header_image_key' => '../images/secret.png',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['header_image_key']);
});

test('本文に他の記事の画像キーを書いても自分の記事の画像にはならない', function () {
    useMinioStorage();
    fakeImageStorage();
    $otherKey = 'images/44444444-4444-4444-8444-444444444444.png';

    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title' => '他人の画像を書いた記事',
            'summary' => '概要',
            'body' => "本文 ![](http://localhost:9002/test-bucket/{$otherKey})",
            'status' => 'published',
        ]);

    // 本文の見た目は変えない（コードブロック内の例示などを壊さないため）が、
    // この記事の画像としては登録しないので images:prune の保護対象にもならない
    $response->assertStatus(201);

    $article = Article::where('title', '他人の画像を書いた記事')->first();
    expect($article->images)->toHaveCount(0);
    expect($article->body)->toContain($otherKey);
});

test('本置き場のキーを直接指定するheader_image_keyは拒否される', function () {
    useMinioStorage();
    fakeImageStorage();

    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title' => '記事',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
            // 他人の記事が使っている本置き場のキーを横取りできないこと
            'header_image_key' => 'images/44444444-4444-4444-8444-444444444444.png',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['header_image_key']);
});

// index
test('記事一覧が取得できる', function () {
    $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '公開記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
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
        'category_id' => $this->category->id,
        'title' => '構造確認記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);
    $article->headerImage()->create(['object_key' => 'images/66666666-6666-4666-8666-666666666666.png', 'type' => 'header']);
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
                    'user' => ['id', 'name'],
                    'category' => ['id', 'name'],
                    'tags' => [['id', 'name']],
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
        'title' => '下書き記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'draft',
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

    $response = $this->getJson('/api/articles?categories[]='.$this->category->id);

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

    $response = $this->getJson('/api/articles?tags[]='.$tags->first()->id);

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

    $response = $this->getJson('/api/articles?author_id='.$this->adminUser->id);

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

// 削除用テスト
test('自分の投稿記事を削除', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '削除する記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->actingAs($this->adminUser)
        ->deleteJson('/api/articles/'.$article->id);

    $response->assertStatus(204);
    $this->assertSoftDeleted('articles', ['id' => $article->id]);
});

test('他ユーザの記事は削除できない', function () {
    $article = $this->subAdminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => 'subAdominUserが作った記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->actingAs($this->adminUser)
        ->deleteJson('/api/articles/'.$article->id);

    $response->assertStatus(403);
    $this->assertDatabaseHas('articles', ['id' => $article->id]);
});

test('未認証ユーザーは記事を削除できない', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '削除できない記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->deleteJson('/api/articles/'.$article->id);

    $response->assertStatus(401);
    $this->assertDatabaseHas('articles', ['id' => $article->id]);
});

// 記事表示show（記事ページ）
test('未認証でも表示可能', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '公開記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->getJson('/api/articles/'.$article->id);

    $response->assertStatus(200)
        ->assertJsonFragment(['title' => '公開記事'])
        ->assertJsonStructure(['data' => ['id', 'title', 'body', 'published_at', 'user', 'category', 'tags', 'like_count', 'images']]);
});

test('記事が非公開の場合表示不可', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '非表示記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'draft',
        'published_at' => null,
    ]);

    $response = $this->getJson('/api/articles/'.$article->id);

    $response->assertStatus(404);
});

test('記事が削除されている場合も非表示', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '非表示記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);
    $article->delete();

    $response = $this->getJson('/api/articles/'.$article->id);

    $response->assertStatus(404);
});

test('そもそも記事がない場合も非表示', function () {
    $response = $this->getJson('/api/articles/1');

    $response->assertStatus(404);
});

// 記事更新update
test('自分の投稿記事を更新できる', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '更新前タイトル',
        'summary' => '更新前概要',
        'body' => '更新前本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => '更新後タイトル',
            'summary' => '更新後概要',
            'body' => '更新後本文',
            'status' => 'published',
        ]);

    $response->assertStatus(200)
        ->assertJsonFragment(['title' => '更新後タイトル'])
        ->assertJsonStructure([
            'data' => [
                'id',
                'title',
                'summary',
                'body',
                'status',
                'published_at',
                'category' => ['id', 'name'],
                'tags',
                'header_image_key',
                'header_image_url',
            ],
        ]);

    $this->assertDatabaseHas('articles', [
        'id' => $article->id,
        'title' => '更新後タイトル',
        'body' => '更新後本文',
    ]);
});

test('draft記事も本人であれば更新できる', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '下書き記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => '下書きのまま更新',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'draft',
        ]);

    $response->assertStatus(200)
        ->assertJsonFragment(['status' => 'draft']);

    $this->assertDatabaseHas('articles', [
        'id' => $article->id,
        'title' => '下書きのまま更新',
        'published_at' => null,
    ]);
});

test('draftからpublishedへの更新でpublished_atが設定される', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '公開する記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => '公開する記事',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
        ]);

    $response->assertStatus(200);
    expect($article->fresh()->published_at)->not->toBeNull();
});

test('公開済み記事を更新してもpublished_atは初回公開日のまま維持される', function () {
    $publishedAt = now()->subDays(3);
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '公開済み記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => $publishedAt,
    ]);

    $response = $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => '公開済み記事を編集',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
        ]);

    $response->assertStatus(200);
    expect($article->fresh()->published_at->timestamp)->toBe($publishedAt->timestamp);
});

test('更新時にリクエストへ含めなかったタグは外れる', function () {
    $tags = Tag::all();
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => 'タグ付き記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);
    $article->tags()->sync($tags->pluck('id')->toArray());

    $response = $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => 'タグ付き記事',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
            'tags' => [$tags->first()->id],
        ]);

    $response->assertStatus(200);
    expect($article->fresh()->tags->pluck('id')->toArray())->toBe([$tags->first()->id]);
});

test('更新時にtagsを空で送ると全てのタグが外れる', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => 'タグ付き記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);
    $article->tags()->sync(Tag::pluck('id')->toArray());

    $response = $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => 'タグ付き記事',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
        ]);

    $response->assertStatus(200);
    expect($article->fresh()->tags)->toHaveCount(0);
});

test('更新時のnew_tagsで新規タグが作成され記事に紐づく', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => 'タグ追加記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => 'タグ追加記事',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
            'new_tags' => ['Svelte'],
        ]);

    $response->assertStatus(200)
        ->assertJsonFragment(['name' => 'Svelte']);

    $this->assertDatabaseHas('tags', ['name' => 'Svelte']);
    expect($article->fresh()->tags->pluck('name')->toArray())->toBe(['Svelte']);
});

test('更新時にヘッダー画像が差し替えられ、旧画像は論理削除される', function () {
    useMinioStorage();
    $storage = fakeImageStorage();
    $oldKey = 'images/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
    $newTmpKey = 'tmp/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png';
    $newKey = 'images/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png';
    $storage->put($oldKey)->put($newTmpKey);

    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '画像差し替え記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);
    $oldImage = $article->images()->create(['object_key' => $oldKey, 'type' => 'header']);

    $response = $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => '画像差し替え記事',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
            'header_image_key' => $newTmpKey,
        ]);

    $response->assertStatus(200)
        ->assertJsonFragment(['header_image_key' => $newKey]);

    $this->assertSoftDeleted('article_images', ['id' => $oldImage->id]);
    $this->assertDatabaseHas('article_images', [
        'article_id' => $article->id,
        'object_key' => $newKey,
        'type' => 'header',
        'deleted_at' => null,
    ]);

    // 旧画像の実体は消さない（参照が外れた分は images:prune が回収する）
    expect($storage->keys())->toBe([$oldKey, $newKey]);
});

test('更新時にヘッダー画像を据え置くと同じキーのまま行も増えない', function () {
    useMinioStorage();
    $storage = fakeImageStorage();
    $headerKey = 'images/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
    $storage->put($headerKey);

    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '据え置き記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);
    $image = $article->images()->create(['object_key' => $headerKey, 'type' => 'header']);

    $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => '据え置き記事（更新後）',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
            // 変更しない場合はGETで返ってきた本置き場のキーがそのまま送られてくる
            'header_image_key' => $headerKey,
        ]);

    expect($article->images()->count())->toBe(1);
    expect($article->images()->first()->id)->toBe($image->id);
});

test('更新で本文から画像を消すと参照が外れる', function () {
    useMinioStorage();
    $storage = fakeImageStorage();
    $keptTmp = 'tmp/cccccccc-cccc-4ccc-8ccc-cccccccccccc.png';
    $removedTmp = 'tmp/dddddddd-dddd-4ddd-8ddd-dddddddddddd.png';
    $kept = 'images/cccccccc-cccc-4ccc-8ccc-cccccccccccc.png';
    $removed = 'images/dddddddd-dddd-4ddd-8ddd-dddddddddddd.png';
    $storage->put($keptTmp)->put($removedTmp);

    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '本文画像の記事',
        'summary' => '概要',
        'body' => "![](/{$keptTmp}) ![](/{$removedTmp})",
        'status' => 'published',
        'published_at' => now(),
    ]);
    $article->images()->createMany([
        ['object_key' => $kept, 'type' => 'body'],
        ['object_key' => $removed, 'type' => 'body'],
    ]);
    // 作成時の移動を再現しておく
    $storage->move($keptTmp, $kept);
    $storage->move($removedTmp, $removed);

    $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => '本文画像の記事',
            'summary' => '概要',
            // 片方だけ残した本文を送る
            'body' => "![](http://localhost:9002/test-bucket/{$kept})",
            'status' => 'published',
        ])->assertStatus(200);

    expect($article->images()->pluck('object_key')->all())->toBe([$kept]);
    $this->assertSoftDeleted('article_images', ['object_key' => $removed]);
});

test('更新で本文に画像を足すと一時置き場から移されて参照が増える', function () {
    useMinioStorage();
    $storage = fakeImageStorage();
    $tmpKey = 'tmp/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.png';
    $key = 'images/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.png';
    $storage->put($tmpKey);

    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '画像を足す記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => '画像を足す記事',
            'summary' => '概要',
            'body' => "本文 ![](http://localhost:9002/test-bucket/{$tmpKey})",
            'status' => 'published',
        ])->assertStatus(200);

    expect($article->images()->pluck('object_key')->all())->toBe([$key]);
    // 本文中の参照も本置き場に書き換わる
    expect($article->fresh()->body)->toContain($key);
    expect($article->fresh()->body)->not->toContain('tmp/');
    expect($storage->keys())->toBe([$key]);
});

test('他ユーザの記事は更新できない', function () {
    $article = $this->subAdminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => 'subAdminUserが作った記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => '乗っ取りタイトル',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
        ]);

    $response->assertStatus(403);
    $this->assertDatabaseHas('articles', ['id' => $article->id, 'title' => 'subAdminUserが作った記事']);
});

test('存在しない記事の更新は404になる', function () {
    $response = $this->actingAs($this->adminUser)
        ->putJson('/api/articles/9999', [
            'category_id' => $this->category->id,
            'title' => '記事',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
        ]);

    $response->assertStatus(404);
});

test('論理削除済み記事の更新は404になる', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '削除済み記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);
    $article->delete();

    $response = $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => '復活させたいタイトル',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
        ]);

    $response->assertStatus(404);
});

test('一般ユーザーは記事を更新できない', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '更新されない記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->actingAs($this->generalUser)
        ->putJson('/api/articles/'.$article->id, [
            'category_id' => $this->category->id,
            'title' => '更新後タイトル',
            'summary' => '概要',
            'body' => '本文',
            'status' => 'published',
        ]);

    $response->assertStatus(403);
    $this->assertDatabaseHas('articles', ['id' => $article->id, 'title' => '更新されない記事']);
});

test('未認証ユーザーは記事を更新できない', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '更新されない記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->putJson('/api/articles/'.$article->id, [
        'category_id' => $this->category->id,
        'title' => '更新後タイトル',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
    ]);

    $response->assertStatus(401);
    $this->assertDatabaseHas('articles', ['id' => $article->id, 'title' => '更新されない記事']);
});

test('更新時に必須項目が欠けている場合はバリデーションエラーになる', function () {
    $article = $this->adminUser->articles()->create([
        'category_id' => $this->category->id,
        'title' => '記事',
        'summary' => '概要',
        'body' => '本文',
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->actingAs($this->adminUser)
        ->putJson('/api/articles/'.$article->id, []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['category_id', 'title', 'summary', 'body', 'status']);
});

test('保存済みのキーは実行時の設定に従った表示用URLになる', function () {
    useMinioStorage();
    $storage = fakeImageStorage();
    $tmpKey = 'tmp/55555555-5555-4555-8555-555555555555.png';
    $storage->put($tmpKey);

    $this->actingAs($this->adminUser)
        ->postJson('/api/articles', [
            'category_id' => $this->category->id,
            'title' => '画像付き記事',
            'summary' => 'テスト概要',
            'body' => 'テスト本文',
            'status' => 'published',
            'header_image_key' => $tmpKey,
        ])->assertStatus(201);

    $article = Article::where('title', '画像付き記事')->first();
    $key = 'images/55555555-5555-4555-8555-555555555555.png';

    // DBはキーだけを持つので、同じレコードでも設定を変えればURLが切り替わる
    expect($this->getJson("/api/articles/{$article->id}")->json('data.images.0.url'))
        ->toBe("http://localhost:9002/test-bucket/{$key}");

    // 本番相当の設定に差し替える（クライアントはインスタンス内で使い回されるため作り直す）
    useProductionS3Storage();
    fakeImageStorage();

    expect($this->getJson("/api/articles/{$article->id}")->json('data.images.0.url'))
        ->toBe("https://prod-bucket.s3.ap-northeast-1.amazonaws.com/{$key}");
});
