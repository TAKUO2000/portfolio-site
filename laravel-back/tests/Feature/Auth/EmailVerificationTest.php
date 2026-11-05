<?php

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;

beforeEach(function () {
    // 期待値をconfig()から作ると実装と同じ値を読むだけになるため、既知の値を入れて比較する
    config(['app.frontend_url' => 'https://fe.example.com']);
});

function verificationUrl(User $user, ?string $hash = null, int $minutes = 60): string
{
    return URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes($minutes),
        ['id' => $user->id, 'hash' => $hash ?? sha1($user->email)]
    );
}

test('ログインしていなくても、メールのリンクからメールアドレスを確認できる', function () {
    // メールアプリなど、ログインしたのとは別のブラウザで開かれることがあるため
    $user = User::factory()->unverified()->create();
    Event::fake();

    $response = $this->get(verificationUrl($user));

    Event::assertDispatched(Verified::class);
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    $response->assertRedirect('https://fe.example.com/auth/email-verified?status=verified');
});

test('確認済みのリンクを開き直しても、確認済みとして扱う', function () {
    $user = User::factory()->create();
    Event::fake();

    $this->get(verificationUrl($user))
        ->assertRedirect('https://fe.example.com/auth/email-verified?status=verified');

    Event::assertNotDispatched(Verified::class);
});

test('メールアドレスと合わないリンクでは確認されず、無効として FE に戻す', function () {
    $user = User::factory()->unverified()->create();

    $this->get(verificationUrl($user, sha1('wrong-email')))
        ->assertRedirect('https://fe.example.com/auth/email-verified?status=invalid');

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('期限切れや改ざんされたリンクでは確認されず、無効として FE に戻す', function () {
    $user = User::factory()->unverified()->create();

    $this->get(verificationUrl($user, minutes: -1))
        ->assertRedirect('https://fe.example.com/auth/email-verified?status=invalid');
    $this->get(verificationUrl($user).'tampered')
        ->assertRedirect('https://fe.example.com/auth/email-verified?status=invalid');

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('確認メールを再送できる', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->postJson(route('verification.send'))
        ->assertOk()
        ->assertExactJson(['status' => 'verification-link-sent']);

    Notification::assertSentTo($user, VerifyEmail::class);
});

test('確認済みなら再送せず、確認済みであることを返す', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('verification.send'))
        ->assertOk()
        ->assertExactJson(['status' => 'already-verified']);

    Notification::assertNothingSent();
});
