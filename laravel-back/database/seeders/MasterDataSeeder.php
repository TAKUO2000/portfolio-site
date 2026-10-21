<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * 本番でも必要なマスタ（カテゴリ・タグ）を入れる。
 *
 * カテゴリとタグには管理画面が無く、ここで入れたものしか選べない。
 * 本番で何度実行しても重複しないよう、呼び出す側はどれも既存の行を作り直さない。
 */
class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CategorySeeder::class,
            TagSeeder::class,
        ]);
    }
}
