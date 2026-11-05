<?php

use App\Models\User;

test('ログイン中のユーザー情報は画面で使う項目だけを返す', function () {
    $user = User::factory()->create(['role' => 'admin']);

    // 完全一致で比べるので、Userに列が増えても勝手にAPIへ出ていけば気づける
    $this->actingAs($user)
        ->getJson('/api/user')
        ->assertOk()
        ->assertExactJson([
            'id'             => $user->id,
            'name'           => $user->name,
            'email'          => $user->email,
            'role'           => 'admin',
            'email_verified' => true,
        ]);
});

test('メールアドレスを確認していないユーザーは email_verified が false になる', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->getJson('/api/user')
        ->assertOk()
        ->assertJsonPath('email_verified', false);
});

test('未ログインではユーザー情報を返さない', function () {
    $this->getJson('/api/user')->assertUnauthorized();
});
