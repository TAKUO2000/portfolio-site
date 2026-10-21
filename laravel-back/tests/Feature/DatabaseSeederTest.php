<?php

use App\Models\Article;
use App\Models\Category;
use App\Models\Tag;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\MasterDataSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    // デモ記事の画像はバケットへ置かれるので、実際のストレージには触れない
    Storage::fake('s3');
});

/**
 * 本番の手順と同じく、確認を飛ばしてシーダーを実行する。
 * 本番環境の db:seed は --force が無いと確認を求めて止まるため。
 */
function runSeeder(string $class): void
{
    test()->artisan('db:seed', ['--class' => $class, '--force' => true]);
}

test('本番環境では DatabaseSeeder が何も入れずに中断する', function () {
    app()['env'] = 'production';

    expect(fn () => runSeeder(DatabaseSeeder::class))->toThrow(RuntimeException::class);

    expect(User::count())->toBe(0)
        ->and(Category::count())->toBe(0)
        ->and(Article::count())->toBe(0);
});

test('本番環境では UserSeeder を直接指定しても固定のパスワードのユーザーを作らない', function () {
    app()['env'] = 'production';

    expect(fn () => runSeeder(UserSeeder::class))->toThrow(RuntimeException::class);

    expect(User::count())->toBe(0);
});

test('本番環境でもマスタは入れられ、何度実行しても重複しない', function () {
    app()['env'] = 'production';

    runSeeder(MasterDataSeeder::class);
    runSeeder(MasterDataSeeder::class);

    expect(Category::count())->toBe(4)
        ->and(Tag::count())->toBe(6)
        ->and(User::count())->toBe(0);
});

test('ステージングでは固定のユーザーを作らず、作っておいた管理者をデモ記事の作者にする', function () {
    app()['env'] = 'staging';
    $admin = User::factory()->create(['role' => 'admin']);

    runSeeder(DatabaseSeeder::class);

    expect(User::count())->toBe(1)
        ->and(Article::count())->toBeGreaterThan(0)
        ->and(Article::where('user_id', '!=', $admin->id)->exists())->toBeFalse();
});

test('ステージングで管理者がいないと、デモ記事を入れずに中断する', function () {
    app()['env'] = 'staging';

    expect(fn () => runSeeder(DatabaseSeeder::class))->toThrow(RuntimeException::class);

    expect(Article::count())->toBe(0);
});

test('local では固定のユーザーとデモ記事を入れる', function () {
    app()['env'] = 'local';

    runSeeder(DatabaseSeeder::class);

    expect(User::where('email', 'admin@example.com')->value('role'))->toBe('admin')
        ->and(User::where('email', 'user@example.com')->exists())->toBeTrue()
        ->and(Article::count())->toBeGreaterThan(0);
});
