<?php

use App\Models\User;

test('SPA 以外からの呼び出しでは、セッションを作らず Set-Cookie も返さない', function () {
    $response = $this->getJson('/api/tags');

    $response->assertOk();
    expect($response->headers->getCookies())->toBeEmpty();
    $this->assertDatabaseCount('sessions', 0);
});

test('SPA からはログインでき、そのセッションの Cookie で /api/user を取得できる', function () {
    $user = User::factory()->create();

    $login = asSpa()->post(route('login'), [
        'email'    => $user->email,
        'password' => 'password',
    ]);
    $login->assertNoContent();

    // テスト中のアプリはログインしたユーザーをガードに持ち続けるので、
    // それを捨てて、ログインで発行されたセッションの Cookie からユーザーを読み直させる
    app('auth')->forgetGuards();

    $this->withUnencryptedCookie(
        config('session.cookie'),
        $login->getCookie(config('session.cookie'), decrypt: false)->getValue(),
    )
        ->getJson('/api/user')
        ->assertOk()
        ->assertJsonPath('id', $user->id);
});
