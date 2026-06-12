<?php

use App\Models\Category;
use App\Models\Tag;
use App\Models\User;

beforeEach(function () {
    $this->adminUser = User::factory()->create(['role' => 'admin']);
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
