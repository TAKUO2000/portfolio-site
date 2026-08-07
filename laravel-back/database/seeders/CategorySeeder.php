<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = ['技術', '趣味', 'ビジネス', 'その他'];

        foreach ($categories as $name) {
            Category::create(['name' => $name]);
        }
    }
}
