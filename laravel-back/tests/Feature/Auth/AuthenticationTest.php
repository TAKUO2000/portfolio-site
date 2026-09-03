<?php

use App\Models\User;

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertNoContent();
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('logout'));

    // auth:sanctumがデフォルトガードをsanctumに切り替え、そのRequestGuardは
    // リクエスト中に解決したユーザーを保持し続ける。セッションが破棄されたことは
    // webガードで確認する。
    $this->assertGuest('web');
    $response->assertNoContent();
});
