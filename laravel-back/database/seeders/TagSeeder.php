<?php

namespace Database\Seeders;

use App\Models\Tag;
use Illuminate\Database\Seeder;

class TagSeeder extends Seeder
{
    public function run(): void
    {
        $tags = ['Laravel', 'Vue.js', 'AWS', 'Docker', 'PHP', 'JavaScript'];

        foreach ($tags as $name) {
            Tag::create(['name' => $name]);
        }
    }
}
