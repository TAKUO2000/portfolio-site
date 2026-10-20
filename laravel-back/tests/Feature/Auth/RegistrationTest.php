<?php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;

function registrationPayload(string $email = 'test@example.com'): array
{
    return [
        'name' => 'Test User',
        'email' => $email,
        'password' => 'password',
        'password_confirmation' => 'password',
    ];
}

test('new users can register', function () {
    $response = $this->post(route('register'), registrationPayload());

    $this->assertAuthenticated();
    $response->assertNoContent();
});

test('登録すると、メールアドレスの確認メールが送られる', function () {
    Notification::fake();

    $this->post(route('register'), registrationPayload());

    $user = User::where('email', 'test@example.com')->firstOrFail();
    expect($user->hasVerifiedEmail())->toBeFalse();
    Notification::assertSentTo($user, VerifyEmail::class);
});

test('登録は同じ IP から1分に6回までに制限される', function () {
    foreach (range(1, 6) as $i) {
        $this->postJson(route('register'), registrationPayload("user{$i}@example.com"))
            ->assertNoContent();
        auth()->guard('web')->logout();
    }

    $this->postJson(route('register'), registrationPayload('user7@example.com'))
        ->assertTooManyRequests();
});
