<?php

use App\Models\Category;
use App\Models\Tag;

test('カテゴリ一覧をid・nameのみで取得できる', function () {
    Category::create(['name' => '技術']);
    Category::create(['name' => '趣味']);

    $response = $this->getJson('/api/categories');

    $response->assertStatus(200)
        ->assertJsonStructure(['*' => ['id', 'name']])
        ->assertJsonFragment(['name' => '技術'])
        ->assertJsonFragment(['name' => '趣味']);

    expect(array_keys($response->json()[0]))->toHaveCount(2);
});

test('論理削除済みのカテゴリは一覧に含まれない', function () {
    $category = Category::create(['name' => '削除済み']);
    $category->delete();

    $response = $this->getJson('/api/categories');

    $response->assertStatus(200)
        ->assertJsonMissing(['name' => '削除済み']);
});

test('未認証でもカテゴリ一覧を取得できる', function () {
    Category::create(['name' => '技術']);

    $this->getJson('/api/categories')->assertStatus(200);
});

test('タグ一覧をid・nameのみで取得できる', function () {
    Tag::create(['name' => 'Laravel']);
    Tag::create(['name' => 'PHP']);

    $response = $this->getJson('/api/tags');

    $response->assertStatus(200)
        ->assertJsonStructure(['*' => ['id', 'name']])
        ->assertJsonFragment(['name' => 'Laravel'])
        ->assertJsonFragment(['name' => 'PHP']);

    expect(array_keys($response->json()[0]))->toHaveCount(2);
});

test('論理削除済みのタグは一覧に含まれない', function () {
    $tag = Tag::create(['name' => '削除済み']);
    $tag->delete();

    $response = $this->getJson('/api/tags');

    $response->assertStatus(200)
        ->assertJsonMissing(['name' => '削除済み']);
});

test('未認証でもタグ一覧を取得できる', function () {
    Tag::create(['name' => 'Laravel']);

    $this->getJson('/api/tags')->assertStatus(200);
});
