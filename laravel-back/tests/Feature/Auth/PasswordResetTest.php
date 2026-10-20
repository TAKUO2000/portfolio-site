<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

test('reset password link can be requested', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post(route('password.email'), ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class);
});

test('reset password link points to the frontend', function () {
    config(['app.frontend_url' => 'https://fe.example.com']);
    Notification::fake();

    $user = User::factory()->create();

    $this->post(route('password.email'), ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function (object $notification) use ($user) {
        $url = $notification->toMail($user)->actionUrl;

        expect($url)->toBe("https://fe.example.com/auth/password-reset/{$notification->token}?email=".urlencode($user->email));

        return true;
    });
});

test('再設定メールの依頼は、登録の有無や再送の待ち時間にかかわらず同じ応答を返す', function () {
    // 応答の違いから、そのメールアドレスが登録済みかを判別できないようにする
    Notification::fake();
    $user = User::factory()->create();

    $registered = $this->postJson(route('password.email'), ['email' => $user->email]);
    $throttled = $this->postJson(route('password.email'), ['email' => $user->email]);
    $unknown = $this->postJson(route('password.email'), ['email' => 'nobody@example.com']);

    $registered->assertOk();
    expect($throttled->status())->toBe($registered->status())
        ->and($throttled->json())->toBe($registered->json())
        ->and($unknown->status())->toBe($registered->status())
        ->and($unknown->json())->toBe($registered->json());
    Notification::assertSentToTimes($user, ResetPassword::class, 1);
});

test('password can be reset with valid token', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post(route('password.email'), ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function (object $notification) use ($user) {
        $response = $this->post(route('password.store'), [
            'token' => $notification->token,
            'email' => $user->email,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertStatus(200);

        return true;
    });
});

test('未登録のメールアドレスでの再設定は、トークンが違うときと同じエラーを返す', function () {
    $user = User::factory()->create();

    $payload = fn (string $email) => [
        'token' => 'invalid-token',
        'email' => $email,
        'password' => 'password',
        'password_confirmation' => 'password',
    ];

    $wrongToken = $this->postJson(route('password.store'), $payload($user->email));
    $unknownEmail = $this->postJson(route('password.store'), $payload('nobody@example.com'));

    $wrongToken->assertUnprocessable();
    expect($unknownEmail->status())->toBe($wrongToken->status())
        ->and($unknownEmail->json())->toBe($wrongToken->json());
});
