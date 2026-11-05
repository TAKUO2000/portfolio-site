<?php

namespace Database\Factories;

use App\Models\Article;
use DateTimeInterface;
use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Article>
 */
class ArticleFactory extends Factory
{
    /**
     * 既定は公開済みの記事。
     *
     * 下書きは published() / draft() で切り替える。statusとpublished_atは
     * 対で決まる（下書きに公開日時は入らない）ため、個別に指定させず状態として扱う。
     */
    public function definition(): array
    {
        return [
            'user_id'      => User::factory(),
            'category_id'  => Category::factory(),
            'title'        => fake()->realText(30),
            'summary'      => fake()->realText(60),
            'body'         => fake()->realText(200),
            'status'       => 'published',
            'published_at' => now(),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => [
            'status'       => 'draft',
            'published_at' => null,
        ]);
    }

    /** 公開日時を明示したい場合（初回公開日の維持を確かめるテストなど） */
    public function published(DateTimeInterface|string|null $publishedAt = null): static
    {
        return $this->state(fn () => [
            'status'       => 'published',
            'published_at' => $publishedAt ?? now(),
        ]);
    }
}
