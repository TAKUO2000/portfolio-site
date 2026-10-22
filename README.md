# 個人ブログサイト

TAKUO2000 が日々の技術的な学びや趣味をまとめる個人ブログサイトです。Laravel・Next.js・AWS を実践で身につけるために、設計から実装・インフラ構築まで一人で開発しています。

## 主な機能

### 実装済み

- **記事の作成・編集・削除**（管理者）：Markdown エディタで書き、下書きと公開を切り替えられる
- **画像のアップロード**：署名付き URL でブラウザからストレージ（S3 / MinIO）へ直接アップロードする。使われなくなった画像は定期的に削除する
- **記事管理画面**：ステータス別の件数表示とタイトル検索
- **記事の閲覧**：新着順・人気順の一覧、目次付きの記事詳細ページ
- **会員登録・ログイン**：閲覧ユーザーと管理者の認証（Laravel Sanctum）
- **いいね**：ログインしたユーザーが記事にいいねできる
- **トップページ**：Three.js を使ったアニメーション

### 今後の予定

- 本番環境の構築とデプロイ（設計は完了。下の[インフラ構成](#インフラ構成)を参照）
- カテゴリ・タグでの記事の絞り込み（API は実装済みで、画面が未実装）
- コメント機能

## 技術スタック

| 分類 | 技術 |
| --- | --- |
| フロントエンド | TypeScript、Next.js 16（App Router）、React 19、Tailwind CSS 4、Three.js（React Three Fiber）、react-markdown |
| バックエンド | PHP 8.4、Laravel 13、Laravel Sanctum、Pest |
| データベース・ストレージ | MySQL、Amazon S3（ローカルは MinIO） |
| 開発環境 | Docker Compose |
| CI | GitHub Actions（Claude Code による PR の自動レビュー） |
| インフラ（構築予定） | Vercel、AWS（EC2・S3・ECR・SSM・CloudWatch）、Cloudflare、Terraform |

## インフラ構成

フロントエンド（Next.js）を Vercel、API（Laravel）と MySQL を AWS の EC2 1台（Docker Compose）に置き、DNS は Cloudflare で管理する構成です。設計は済んでおり、構築は #53 で行う予定です。

![本番環境の構成図](infra/architecture-prod.png)

設計で重視した点は次の通りです。

- **月額を約 $15 に抑える**：RDS・ECS・ALB・NAT Gateway は使わず、EC2 は 1GB の t4g.micro に収める。Next.js を Vercel に任せることで、EC2 にはバックエンドだけを載せる
- **AWS の基本を学べる構成にする**：Lightsail ではなく EC2 を選び、VPC・セキュリティグループ・IAM・EBS・SSM を自分で組む
- **安全にデプロイする**：GitHub Actions から OIDC でロールを引き受け（長期のアクセスキーを置かない）、ECR に push したイメージを SSM Run Command で EC2 に反映する。SSH のポートは開けず、Session Manager で接続する
- **データを守る**：データ用 EBS の日次スナップショットと `mysqldump` の S3 への保存を併用し、EC2 の権限からはバックアップを削除できないようにする
- **ステージングは必要なときだけ作る**：`develop` の確認用環境を Terraform で作って確認後に消すことで、常時の費用をかけない

比較した構成や費用の見積もりなど、設計の詳細は [infra/design.md](infra/design.md)、図の見方やステージング環境の図は [infra/architecture.md](infra/architecture.md) にまとめています。

## ディレクトリ構成

| ディレクトリ | 内容 |
| --- | --- |
| `laravel-back` | API（Laravel） |
| `nextjs-front` | フロントエンド（Next.js） |
| `infra` | インフラの設計書と構成図 |
| `docs` | 開発環境や仕組みの解説 |

## 開発環境

Docker があれば、ホストに PHP や Node を入れずに動かせます。

```bash
make setup      # 足りない .env を .env.example からコピーする
make docker-up  # 起動（初回は依存のインストールで約2分かかる）
make test       # テスト
make docker-down  # 停止
```

起動すると、フロントエンドは http://localhost:3000 、API は http://localhost:8000 で開けます。

ポートの変更や Docker を使わない場合の手順などは [docs/development.md](docs/development.md) に、画像管理の仕組みは [docs/image-management.md](docs/image-management.md) にまとめています。

## 本番の初期設定

本番では、固定のパスワードの管理者やサンプルの記事を作らないよう、シーダーをそのまま流しません（`php artisan db:seed` は本番では中断します）。最初に次の順で実行します。

```bash
php artisan migrate --force                                  # テーブルを作る
php artisan db:seed --class=MasterDataSeeder --force          # カテゴリ・タグのマスタを入れる（何度実行しても重複しない）
php artisan user:create-admin                                 # 管理者を作る（名前・メールアドレス・パスワードを対話的に聞く）
```

`user:create-admin` のパスワードは対話入力でだけ受け取ります（シェルの履歴やプロセス一覧に残さないため）。作った管理者はメールアドレスを確認済みになります。ステージングでの手順は [infra/design.md](infra/design.md#ステージング環境) にまとめています。
