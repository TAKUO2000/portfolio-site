<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\ArticleImage;
use App\Models\Category;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class ArticleImageSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        $categories = Category::pluck('id', 'name');
        $tags = Tag::pluck('id', 'name');

        $s3 = 'https://takuo-portfolio-develop-bucket-533267285352-ap-northeast-1-an.s3.ap-northeast-1.amazonaws.com';

        $articles = [
            [
                'title'        => 'LaravelとAWSで作るサーバーレスAPI',
                'summary'      => 'LaravelをAWS Lambda上で動かし、S3やRDSと連携するサーバーレス構成を解説します。',
                'body'         => 'LaravelとAWSを組み合わせたサーバーレスAPIの構築手順を紹介します。',
                'category'     => '技術',
                'tags'         => ['Laravel', 'AWS'],
                'published_at' => Carbon::now()->subDays(1),
                'image_url'    => "{$s3}/test.png",
            ],
            [
                'title'        => 'DockerでLaravel開発環境を構築する',
                'summary'      => 'Docker ComposeでLaravel + MySQL + Nginxの開発環境をゼロから作る手順を紹介します。',
                'body'         => 'Docker Composeを使ったLaravel開発環境の構築手順を解説します。',
                'category'     => '技術',
                'tags'         => ['Laravel', 'Docker', 'PHP'],
                'published_at' => Carbon::now()->subDays(3),
                'image_url'    => "{$s3}/penguin.jpg",
            ],
            [
                'title'        => 'Vue.jsとLaravelでSPAを作る',
                'summary'      => 'フロントエンドにVue.js、バックエンドにLaravelを使ったSPA構成の実装例を紹介します。',
                'body'         => 'Vue.jsとLaravelを組み合わせたSPAの実装について解説します。',
                'category'     => '技術',
                'tags'         => ['Vue.js', 'Laravel', 'JavaScript'],
                'published_at' => Carbon::now()->subDays(5),
            ],
            [
                'title'        => 'エンジニアの生産性を上げる習慣',
                'summary'      => '毎日の小さな習慣がエンジニアとしての成長を加速させます。実践している習慣を紹介します。',
                'body'         => 'エンジニアとして生産性を高めるための習慣について書きます。',
                'category'     => 'ライフスタイル',
                'tags'         => [],
                'published_at' => Carbon::now()->subDays(7),
            ],
            [
                'title'        => 'フリーランスエンジニアとして独立するには',
                'summary'      => 'フリーランスとして独立するまでの準備や注意点をまとめました。',
                'body'         => 'フリーランスエンジニアとして独立するためのステップを解説します。',
                'category'     => 'ビジネス',
                'tags'         => [],
                'published_at' => Carbon::now()->subDays(10),
            ],
        ];

        foreach ($articles as $data) {
            $article = Article::firstOrCreate(
                ['title' => $data['title']],
                [
                    'user_id'      => $user->id,
                    'category_id'  => $categories[$data['category']],
                    'summary'      => $data['summary'],
                    'body'         => $data['body'],
                    'status'       => 'published',
                    'published_at' => $data['published_at'],
                ]
            );

            if (!empty($data['tags'])) {
                $tagIds = array_map(fn($name) => $tags[$name], $data['tags']);
                $article->tags()->sync($tagIds);
            }

            $imageUrl = $data['image_url'] ?? "{$s3}/test.png";
            ArticleImage::firstOrCreate(
                ['article_id' => $article->id, 'type' => 'header'],
                ['url' => $imageUrl]
            );
        }
    }
}
