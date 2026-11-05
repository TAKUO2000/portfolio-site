<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // パスワードが password の管理者ができるので、--class で直接指定されても
        // 公開される環境では作らない
        if (!app()->environment('local', 'testing')) {
            throw new RuntimeException('固定のパスワードのユーザーは local と testing でだけ作ります。管理者は user:create-admin で作ってください。');
        }

        User::factory()->create([
            'name'     => 'Admin User',
            'email'    => 'admin@example.com',
            'password' => Hash::make('password'),
            'role'     => 'admin',
        ]);

        User::factory()->create([
            'name'     => 'General User',
            'email'    => 'user@example.com',
            'password' => Hash::make('password'),
            'role'     => 'user',
        ]);
    }
}
