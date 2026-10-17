<?php

use App\Models\Article;
use App\Models\Reaction;
use App\Models\User;

beforeEach(function () {
    $this->author = User::factory()->create(['role' => 'admin']);
    $this->generalUser = User::factory()->create(['role' => 'user']);
    $this->article = Article::factory()->for($this->author)->create();
});

test('未ログインではいいねの取得・追加・取り消しができない', function () {
    $url = "/api/articles/{$this->article->id}/like";

    $this->getJson($url)->assertStatus(401);
    $this->postJson($url)->assertStatus(401);
    $this->deleteJson($url)->assertStatus(401);
    $this->assertDatabaseCount('reactions', 0);
});

test('一般ユーザーが公開記事にいいねできる', function () {
    $this->actingAs($this->generalUser)
        ->postJson("/api/articles/{$this->article->id}/like")
        ->assertOk()
        ->assertExactJson(['data' => ['liked' => true, 'like_count' => 1]]);

    $this->assertDatabaseHas('reactions', [
        'user_id' => $this->generalUser->id,
        'article_id' => $this->article->id,
        'type' => Reaction::TYPE_LIKE,
    ]);
    $this->getJson("/api/articles/{$this->article->id}")
        ->assertJsonPath('data.like_count', 1);
});

test('2回いいねしても1件のまま', function () {
    $url = "/api/articles/{$this->article->id}/like";

    $this->actingAs($this->generalUser)->postJson($url)->assertOk();
    $this->actingAs($this->generalUser)->postJson($url)
        ->assertOk()
        ->assertExactJson(['data' => ['liked' => true, 'like_count' => 1]]);

    $this->assertDatabaseCount('reactions', 1);
});

test('いいねを取り消せる', function () {
    Reaction::create(['user_id' => $this->generalUser->id, 'article_id' => $this->article->id, 'type' => Reaction::TYPE_LIKE]);
    Reaction::create(['user_id' => $this->author->id, 'article_id' => $this->article->id, 'type' => Reaction::TYPE_LIKE]);

    $this->actingAs($this->generalUser)
        ->deleteJson("/api/articles/{$this->article->id}/like")
        ->assertOk()
        ->assertExactJson(['data' => ['liked' => false, 'like_count' => 1]]);

    // 他人のいいねは消えない
    $this->assertDatabaseHas('reactions', ['user_id' => $this->author->id, 'article_id' => $this->article->id]);
});

test('いいねしていない記事の取り消しもエラーにならない', function () {
    $this->actingAs($this->generalUser)
        ->deleteJson("/api/articles/{$this->article->id}/like")
        ->assertOk()
        ->assertExactJson(['data' => ['liked' => false, 'like_count' => 0]]);
});

test('取り消しでlike以外のreactionは消えない', function () {
    Reaction::create(['user_id' => $this->generalUser->id, 'article_id' => $this->article->id, 'type' => Reaction::TYPE_LIKE]);
    Reaction::create(['user_id' => $this->generalUser->id, 'article_id' => $this->article->id, 'type' => Reaction::TYPE_BOOKMARK]);

    $this->actingAs($this->generalUser)
        ->deleteJson("/api/articles/{$this->article->id}/like")
        ->assertOk();

    $this->assertDatabaseHas('reactions', ['user_id' => $this->generalUser->id, 'type' => Reaction::TYPE_BOOKMARK]);
});

test('自分がいいね済みかと件数を取得できる', function () {
    Reaction::create(['user_id' => $this->author->id, 'article_id' => $this->article->id, 'type' => Reaction::TYPE_LIKE]);
    $url = "/api/articles/{$this->article->id}/like";

    $this->actingAs($this->generalUser)->getJson($url)
        ->assertOk()
        ->assertExactJson(['data' => ['liked' => false, 'like_count' => 1]]);
    $this->actingAs($this->author)->getJson($url)
        ->assertOk()
        ->assertExactJson(['data' => ['liked' => true, 'like_count' => 1]]);
});

test('下書き・削除済み・存在しない記事には404を返す', function () {
    $draft = Article::factory()->for($this->author)->draft()->create();
    $deleted = Article::factory()->for($this->author)->create();
    $deleted->delete();

    foreach ([$draft->id, $deleted->id, 999999] as $id) {
        $this->actingAs($this->generalUser)->getJson("/api/articles/{$id}/like")->assertNotFound();
        $this->actingAs($this->generalUser)->postJson("/api/articles/{$id}/like")->assertNotFound();
        $this->actingAs($this->generalUser)->deleteJson("/api/articles/{$id}/like")->assertNotFound();
    }
    $this->assertDatabaseCount('reactions', 0);
});
