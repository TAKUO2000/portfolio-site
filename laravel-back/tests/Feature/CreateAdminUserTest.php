<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('role が admin で、メールアドレスを確認済みの管理者を作れる', function () {
    $this->artisan('user:create-admin', ['email' => 'admin@example.com', 'name' => '管理者'])
        ->expectsQuestion('パスワード', 'secret-password')
        ->expectsQuestion('パスワード（確認）', 'secret-password')
        ->assertExitCode(0);

    $user = User::where('email', 'admin@example.com')->firstOrFail();
    expect($user->name)->toBe('管理者')
        ->and($user->role)->toBe('admin')
        ->and($user->hasVerifiedEmail())->toBeTrue()
        ->and(Hash::check('secret-password', $user->password))->toBeTrue();
});

test('引数を省くと、メールアドレスと名前も対話的に聞く', function () {
    $this->artisan('user:create-admin')
        ->expectsQuestion('メールアドレス', 'admin@example.com')
        ->expectsQuestion('名前', '管理者')
        ->expectsQuestion('パスワード', 'secret-password')
        ->expectsQuestion('パスワード（確認）', 'secret-password')
        ->assertExitCode(0);

    expect(User::where('email', 'admin@example.com')->value('role'))->toBe('admin');
});

test('同じメールアドレスのユーザーがいると作れない', function () {
    User::factory()->create(['email' => 'admin@example.com']);

    $this->artisan('user:create-admin', ['email' => 'admin@example.com', 'name' => '管理者'])
        ->expectsQuestion('パスワード', 'secret-password')
        ->expectsQuestion('パスワード（確認）', 'secret-password')
        ->assertExitCode(1);

    expect(User::count())->toBe(1)
        ->and(User::where('role', 'admin')->exists())->toBeFalse();
});

test('退会（論理削除）したユーザーと同じメールアドレスでも作れない', function () {
    // メールアドレスのユニーク制約は論理削除した行にも効くため、検証で先に止める
    User::factory()->create(['email' => 'admin@example.com'])->delete();

    $this->artisan('user:create-admin', ['email' => 'admin@example.com', 'name' => '管理者'])
        ->expectsQuestion('パスワード', 'secret-password')
        ->expectsQuestion('パスワード（確認）', 'secret-password')
        ->assertExitCode(1);

    expect(User::withTrashed()->count())->toBe(1);
});

test('確認のパスワードが一致しないと作れない', function () {
    $this->artisan('user:create-admin', ['email' => 'admin@example.com', 'name' => '管理者'])
        ->expectsQuestion('パスワード', 'secret-password')
        ->expectsQuestion('パスワード（確認）', 'other-password')
        ->assertExitCode(1);

    expect(User::count())->toBe(0);
});

test('会員登録と同じく、短いパスワードでは作れない', function () {
    $this->artisan('user:create-admin', ['email' => 'admin@example.com', 'name' => '管理者'])
        ->expectsQuestion('パスワード', 'short')
        ->expectsQuestion('パスワード（確認）', 'short')
        ->assertExitCode(1);

    expect(User::count())->toBe(0);
});
