<?php

use App\Models\User;

beforeEach(function () {
    $this->adminUser = User::factory()->create(['role' => 'admin']);
    $this->generalUser = User::factory()->create(['role' => 'user']);
    useMinioStorage();
});

test('adminユーザーはブラウザから到達可能なアップロードURLを取得できる', function () {
    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/images/upload-url', [
            'file_name'  => 'photo.png',
            'media_type' => 'image/png',
            'file_size'  => 1024,
        ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['upload_url', 'image_url']);

    $uploadUrl = $response->json('upload_url');
    $imageUrl = $response->json('image_url');

    // ブラウザ向けエンドポイント（AWS_PUBLIC_ENDPOINT）とパススタイルで組み立てられる
    expect($uploadUrl)->toStartWith('http://localhost:9002/test-bucket/images/');
    expect($imageUrl)->toStartWith('http://localhost:9002/test-bucket/images/');

    // 署名付きURLであること
    expect($uploadUrl)->toContain('X-Amz-Signature=');
    expect($uploadUrl)->toContain('X-Amz-Expires=900');

    // 表示用URLは署名を含まず、キーはアップロード用URLと一致する
    expect($imageUrl)->not->toContain('X-Amz-Signature=');
    expect(parse_url($uploadUrl, PHP_URL_PATH))->toBe(parse_url($imageUrl, PHP_URL_PATH));
    expect($imageUrl)->toEndWith('.png');
});

test('一般ユーザーはアップロードURLを取得できない', function () {
    $response = $this->actingAs($this->generalUser)
        ->postJson('/api/images/upload-url', [
            'file_name'  => 'photo.png',
            'media_type' => 'image/png',
            'file_size'  => 1024,
        ]);

    $response->assertForbidden();
});

test('本番相当の設定では実S3の仮想ホストスタイルのURLが返る', function () {
    useProductionS3Storage();

    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/images/upload-url', [
            'file_name'  => 'photo.png',
            'media_type' => 'image/png',
            'file_size'  => 1024,
        ]);

    $response->assertStatus(200);

    $uploadUrl = $response->json('upload_url');
    $imageUrl = $response->json('image_url');
    $expectedHost = 'https://prod-bucket.s3.ap-northeast-1.amazonaws.com';

    // エンドポイント未設定時はSDKがバケット名をホストに含めたURLを組み立てる
    expect($uploadUrl)->toStartWith($expectedHost . '/images/');
    expect($imageUrl)->toStartWith($expectedHost . '/images/');
    expect($uploadUrl)->toContain('X-Amz-Signature=');
    expect(parse_url($uploadUrl, PHP_URL_PATH))->toBe(parse_url($imageUrl, PHP_URL_PATH));
});

test('許可されていないmedia_typeはバリデーションエラーになる', function () {
    $response = $this->actingAs($this->adminUser)
        ->postJson('/api/images/upload-url', [
            'file_name'  => 'malware.exe',
            'media_type' => 'application/octet-stream',
            'file_size'  => 1024,
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['media_type']);
});
