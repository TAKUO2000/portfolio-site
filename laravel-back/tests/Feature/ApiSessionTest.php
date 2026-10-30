<?php

use App\Models\User;

test('SPA 以外からの呼び出しでは、セッションを作らず Set-Cookie も返さない', function () {
    $response = $this->getJson('/api/tags');

    $response->assertOk();
    expect($response->headers->getCookies())->toBeEmpty();
    // SESSION_DRIVER が database のときだけ意味がある。今は docker の .env の値が使われているため効いているが、
    // テストを phpunit.xml の array ドライバで動かすようにしたら（#108）、行が増えないことは確かめられなくなる
    $this->assertDatabaseCount('sessions', 0);
});

test('SPA からはログインでき、そのセッションの Cookie で /api/user を取得できる', function () {
    $user = User::factory()->create();

    $loginResponse = asSpa()->post(route('login'), [
        'email'    => $user->email,
        'password' => 'password',
    ]);
    $loginResponse->assertNoContent();

    // テスト中のアプリはログインしたユーザーをガードに持ち続けるので、
    // それを捨てて、ログインで発行されたセッションの Cookie からユーザーを読み直させる
    app('auth')->forgetGuards();

    $this->withUnencryptedCookie(
        config('session.cookie'),
        encryptedCookieValue($loginResponse, config('session.cookie')),
    )
        ->getJson('/api/user')
        ->assertOk()
        ->assertJsonPath('id', $user->id);
});
