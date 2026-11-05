<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * 開発・ステージング用のサンプルデータを入れる。本番ではマスタだけを
     * MasterDataSeeder で入れ、管理者は user:create-admin で作る。
     */
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException(
                '本番ではサンプルデータを入れません。マスタは db:seed --class=MasterDataSeeder で入れてください。'
            );
        }

        // 固定のパスワードのユーザーは、外から触れない環境でだけ作る。ステージングは
        // 公開されるので、先に user:create-admin で管理者を作ってから実行する
        if (app()->environment('local', 'testing')) {
            $this->call(UserSeeder::class);
        }

        $this->call([
            MasterDataSeeder::class,
            ArticleImageSeeder::class,
        ]);
    }
}
