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
                'body'         => <<<'MD'
## はじめに

LaravelをAWS上でサーバーレス構成として動かすことで、インフラ管理コストを大幅に削減できます。
この記事では、**Bref**を使ってLaravelをAWS Lambdaにデプロイし、S3・RDSと連携する構成を紹介します。

## 構成図

- **AWS Lambda** : Laravelアプリの実行環境
- **Amazon RDS (MySQL)** : データベース
- **Amazon S3** : ファイルストレージ
- **API Gateway** : HTTPリクエストのルーティング

## 事前準備

以下をインストールしておいてください。

- PHP 8.2以上
- Composer
- AWS CLI
- Serverless Framework

```bash
npm install -g serverless
composer require bref/bref bref/laravel-bridge
```

## Brefの設定

`serverless.yml` をプロジェクトルートに作成します。

```yaml
service: laravel-api

provider:
  name: aws
  region: ap-northeast-1

functions:
  web:
    handler: public/index.php
    runtime: php-82-fpm
    events:
      - httpApi: '*'
```

## デプロイ

```bash
serverless deploy
```

デプロイが完了するとAPI GatewayのエンドポイントURLが表示されます。

## S3との連携

`.env` にS3の設定を追加します。

```
FILESYSTEM_DISK=s3
AWS_BUCKET=your-bucket-name
AWS_DEFAULT_REGION=ap-northeast-1
```

## まとめ

サーバーレス構成にすることで、トラフィックが少ない個人開発では**コストをほぼゼロ**に抑えられます。
スケールも自動で対応してくれるため、突発的なアクセス増にも強い構成です。
MD,
                'category'     => '技術',
                'tags'         => ['Laravel', 'AWS'],
                'published_at' => Carbon::now()->subDays(1),
                'image_url'    => "{$s3}/test.png",
            ],
            [
                'title'        => 'DockerでLaravel開発環境を構築する',
                'summary'      => 'Docker ComposeでLaravel + MySQL + Nginxの開発環境をゼロから作る手順を紹介します。',
                'body'         => <<<'MD'
## はじめに

Dockerを使うことで、チームメンバー全員が同じ環境でLaravelを動かせます。
「自分のPCでは動いた」という問題をなくすために、Docker Composeで環境を統一しましょう。

## ディレクトリ構成

```
project/
├── docker/
│   ├── nginx/
│   │   └── default.conf
│   └── php/
│       └── Dockerfile
├── src/           # Laravelプロジェクト
└── docker-compose.yml
```

## docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: ./docker/php
    volumes:
      - ./src:/var/www/html
    depends_on:
      - db

  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./src:/var/www/html
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - app

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: laravel
      MYSQL_USER: laravel
      MYSQL_PASSWORD: password
    ports:
      - "3306:3306"
```

## PHP Dockerfile

```dockerfile
FROM php:8.2-fpm

RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev libxml2-dev zip unzip

RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
```

## 起動手順

```bash
docker compose up -d
docker compose exec app composer install
docker compose exec app cp .env.example .env
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
```

## まとめ

- **nginx** : Webサーバー
- **php-fpm** : PHPの実行
- **MySQL** : データベース

この3つをDockerで管理することで、環境構築の手順を `docker compose up -d` の1コマンドに集約できます。
MD,
                'category'     => '技術',
                'tags'         => ['Laravel', 'Docker', 'PHP'],
                'published_at' => Carbon::now()->subDays(3),
                'image_url'    => "{$s3}/penguin.jpg",
            ],
            [
                'title'        => 'Vue.jsとLaravelでSPAを作る',
                'summary'      => 'フロントエンドにVue.js、バックエンドにLaravelを使ったSPA構成の実装例を紹介します。',
                'body'         => <<<'MD'
## はじめに

LaravelをAPIサーバー、Vue.jsをフロントエンドとして分離したSPA構成は、
モダンなWebアプリ開発の定番パターンです。

## バックエンド（Laravel）の準備

### APIルートの設定

`routes/api.php` にエンドポイントを定義します。

```php
Route::get('/articles', [ArticleController::class, 'index']);
Route::post('/articles', [ArticleController::class, 'store'])->middleware('auth:sanctum');
```

### CORS設定

`config/cors.php` でフロントエンドのオリジンを許可します。

```php
'allowed_origins' => ['http://localhost:5173'],
```

## フロントエンド（Vue.js）の準備

```bash
npm create vue@latest frontend
cd frontend
npm install
npm install axios
```

### axiosの設定

```js
// src/lib/axios.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Accept': 'application/json',
  },
  withCredentials: true,
})

export default api
```

### 記事一覧の取得

```vue
<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/axios'

const articles = ref([])

onMounted(async () => {
  const { data } = await api.get('/articles')
  articles.value = data.data
})
</script>

<template>
  <div v-for="article in articles" :key="article.id">
    <h2>{{ article.title }}</h2>
  </div>
</template>
```

## 認証にはSanctumを使う

Laravel SanctumはSPA向けのCookieベース認証を提供しています。

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

## まとめ

- Laravel側はAPIのみに集中できる
- Vue.js側はUIのみに集中できる
- フロントとバックを独立してデプロイできる

分離構成はチーム開発でも効果を発揮します。
MD,
                'category'     => '技術',
                'tags'         => ['Vue.js', 'Laravel', 'JavaScript'],
                'published_at' => Carbon::now()->subDays(5),
            ],
            [
                'title'        => 'エンジニアの生産性を上げる習慣',
                'summary'      => '毎日の小さな習慣がエンジニアとしての成長を加速させます。実践している習慣を紹介します。',
                'body'         => <<<'MD'
## はじめに

エンジニアとしての生産性は、ツールの習熟度よりも**日々の習慣**に左右されることが多いです。
この記事では、実際に取り入れて効果を感じた習慣を紹介します。

## 朝のルーティン

### タスクの優先順位を決める

朝イチでその日やることをリストアップし、**重要度×緊急度**で並び替えます。

- 重要かつ緊急 → 午前中に片付ける
- 重要だが緊急でない → 時間を確保して取り組む
- 緊急だが重要でない → 可能なら委譲する

### ポモドーロテクニック

25分集中→5分休憩のサイクルを繰り返す手法です。

```
作業 25分
↓
休憩 5分
↓
（4セット後に長休憩 15〜30分）
```

## コードを書く習慣

### 毎日少しでもコードを書く

たとえ30分でも、毎日コードに触れることが大切です。
GitHubのコントリビューションを草で埋めることを目標にすると続けやすいです。

### 読書・アウトプット

- 週1冊技術書を読む
- 読んだ内容をブログ記事にまとめる（このブログがその実践です）

## 健康管理

生産性は体調に直結します。

- **睡眠** : 7時間以上確保する
- **運動** : 週3回30分のウォーキング
- **食事** : 昼食後の眠気対策として炭水化物を減らす

## まとめ

| 習慣 | 効果 |
|------|------|
| タスク整理 | 迷いがなくなる |
| ポモドーロ | 集中力が上がる |
| 毎日コーディング | スキルが落ちない |
| 健康管理 | 午後も集中できる |

小さな習慣の積み重ねが、半年後・1年後の大きな差につながります。
MD,
                'category'     => 'ライフスタイル',
                'tags'         => [],
                'published_at' => Carbon::now()->subDays(7),
            ],
            [
                'title'        => 'フリーランスエンジニアとして独立するには',
                'summary'      => 'フリーランスとして独立するまでの準備や注意点をまとめました。',
                'body'         => <<<'MD'
## はじめに

フリーランスエンジニアへの転向を考えている方に向けて、
独立前の準備から案件獲得までの流れをまとめました。

## 独立前の準備

### スキルの棚卸し

まず自分のスキルセットを整理します。

- 使える言語・フレームワーク
- 得意な領域（バックエンド・フロント・インフラなど）
- これまでの実績・ポートフォリオ

### 貯金の確保

最低でも**6ヶ月分の生活費**を確保してから独立することをおすすめします。
最初の数ヶ月は案件が安定しないことも多いためです。

### 開業届の提出

独立したら税務署に開業届を提出しましょう。
青色申告を選択することで、最大65万円の控除が受けられます。

## 案件の獲得方法

### クラウドソーシング

- **Lancers**
- **クラウドワークス**
- **Upwork**（英語案件）

最初は単価が低くても、実績を積むことを優先しましょう。

### エージェント活用

- **レバテックフリーランス**
- **Midworks**
- **ITプロパートナーズ**

エージェント経由だと高単価案件に繋がりやすいです。

### SNS・ポートフォリオ

GitHubやTwitterで技術発信を続けることで、
DMで直接依頼が来るケースも増えています。

## 単価の目安

| スキル | 月単価の目安 |
|--------|------------|
| PHP/Laravel | 60〜80万円 |
| React/Next.js | 70〜90万円 |
| AWS | 80〜100万円 |
| フルスタック | 90〜120万円 |

## 注意点

- **社会保険** : 国民健康保険・国民年金に自分で加入が必要
- **確定申告** : 毎年2〜3月に行う
- **税金** : 消費税は年収1000万円超で課税事業者になる

## まとめ

フリーランスは自由な反面、すべて自己責任です。
準備をしっかり整えたうえで、計画的に独立することが成功の鍵です。
MD,
                'category'     => 'ビジネス',
                'tags'         => [],
                'published_at' => Carbon::now()->subDays(10),
            ],
        ];

        foreach ($articles as $data) {
            $article = Article::updateOrCreate(
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
