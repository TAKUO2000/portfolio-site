# portfolio-site

ポートフォリオサイト

## 構成

| ディレクトリ | 内容 |
| --- | --- |
| `laravel-back` | API（Laravel 13 / PHP 8.4） |
| `nextjs-front` | フロントエンド（Next.js 16 / Node 22） |

## セットアップ（Docker）

ホストに PHP や Node を入れる必要はありません。

```bash
make setup      # 足りない .env を .env.example からコピーする
make docker-up  # 起動（初回は composer install / npm install で約2分かかる）
```

`make docker-up` は `docker compose up -d` を実行します。イメージが無い初回は compose が自動でビルドするため、通常はこのコマンドだけで足ります。Dockerfile や PHP 拡張を変更したときだけ `make docker-build`（`--build` 付き）を使ってください。

起動後のアクセス先は次の通りです。

| 用途 | URL |
| --- | --- |
| フロントエンド | http://localhost:3000 |
| API | http://localhost:8000 |
| MinIO コンソール | http://localhost:9003 （`minioadmin` / `minioadmin`） |
| MySQL | `localhost:3307` |

初回起動時に以下は自動で実行されます。

- `APP_KEY` の生成
- マイグレーション
- 画像用バケット（`portfolio-images`）の作成と公開設定、`tmp/` の自動削除ルール設定

停止は `make docker-down` です。DB と MinIO のデータは volume に残るため、完全に消すには `docker compose down -v` を実行します。

### ポートが衝突する場合

他のプロジェクトが 8000 番や 3000 番を使っている場合は、ルートの `.env` でポートを変更します。

```bash
BACKEND_PORT=8001
FRONTEND_PORT=3001
```

`BACKEND_PORT` を変えたときは `nextjs-front/.env` の `NEXT_PUBLIC_API_BASE_URL` も合わせてください。

### 公開範囲

各サービスのポートはホストの `127.0.0.1` にのみバインドしています。開発用の認証情報（`.env.example` の値）をそのまま使う前提のため、同一ネットワークの第三者から MySQL や MinIO に到達できないようにしています。

スマホ実機など LAN 経由で開発サーバーを確認したい場合は、`docker-compose.yml` の該当サービスから `127.0.0.1:` を外してください。その場合は接続元が限定されたネットワークであることを確認し、`.env` の認証情報も変更することを推奨します。

### UID / GID

コンテナはホストと同じ UID / GID で動きます（`vendor` や `node_modules` を共有しているため）。`id -u` が 1000 以外の環境では、ルートの `.env` の `UID` / `GID` を実際の値に変更してください。

## よく使うコマンド

```bash
make docker-up                                # 起動（ビルドなし）
make docker-build                             # 再ビルドして起動
make docker-down                              # 停止
make migrate                                  # マイグレーション
make test                                     # テスト
docker compose exec app composer require x/y  # 依存の追加（ホストの vendor にも反映される）
docker compose exec next npm install x        # 同上（node_modules）
docker compose logs -f app                    # ログ
```

テストは開発用とは別の MySQL データベース（`laravel_back_testing`）に対して実行されるため、開発用の DB や MinIO には影響しません。このデータベースは MySQL の初回起動時に自動作成され、`make test` でも作成されていなければ作られます。

`make test` を使わず直接実行する場合も同じ設定が効きます。

```bash
docker compose exec app php artisan test
```

## セットアップ（Docker を使わない場合）

ホストに PHP 8.4 以上と Node 22（`nextjs-front/.nvmrc` 参照）、MySQL が必要です。

```bash
make setup
cd laravel-back && composer install && php artisan migrate
cd ../nextjs-front && npm install
cd .. && make dev   # API と フロントエンドを同時に起動
```

この場合 `laravel-back/.env` の `DB_*` はホストの MySQL に合わせて設定してください（Docker 利用時は compose 側が上書きするため変更不要です）。

ホストでテストを実行する場合は、`laravel_back_testing` データベースが必要です。Docker の MySQL を使うなら `laravel-back/.env` の接続先を `127.0.0.1:3307` に向けてください。

## 画像ストレージ（MinIO / S3）

画像は署名付き URL でブラウザから直接ストレージへアップロードします。ローカルは MinIO、本番は AWS S3 を使いますが、**処理は共通で設定値だけが変わります**（`app/Services/ImageStorage.php`）。

| 設定 | ローカル（MinIO） | 本番（AWS S3） |
| --- | --- | --- |
| `AWS_ENDPOINT` | `http://minio:9000`（コンテナ内から見たMinIO） | 空 |
| `AWS_PUBLIC_ENDPOINT` | `http://localhost:9002`（ブラウザから見たMinIO） | 空 |
| `AWS_USE_PATH_STYLE_ENDPOINT` | `true` | `false` |
| 発行される URL | `http://localhost:9002/<bucket>/images/xxx.png` | `https://<bucket>.s3.<region>.amazonaws.com/images/xxx.png` |

ローカルの値は `docker-compose.yml` が注入するため設定は不要です。デプロイ時は上記の本番列のとおり、2つのエンドポイントを空にして実 S3 の認証情報・バケットを設定してください。テストも MinIO 構成で実行されます（`tests/Pest.php` の `useMinioStorage()`）。

仕組みの詳細は [docs/image-management.md](docs/image-management.md) にまとめています。

### 画像の置き場所とライフサイクル

DB（`article_images.object_key`）が持つのは**オブジェクトキーだけ**で、表示用 URL は実行時に組み立てます（`ArticleImage::url`）。エンドポイントやバケットを変更しても既存レコードに手を入れずに済みます。

オブジェクトは用途で 2 つのプレフィックスに分かれます。

| プレフィックス | 中身 | 消え方 |
| --- | --- | --- |
| `tmp/` | アップロード直後の一時置き場 | ストレージのライフサイクルルールで 1 日後に自動削除 |
| `images/` | 記事に添付された本置き場 | `images:prune` が未参照のものを削除 |

記事を保存した時点で `tmp/` から `images/` へ移し、本文中の参照も書き換えます。記事を保存せずにブラウザを閉じた分は `tmp/` に残り、そのまま自動削除されます。

### 未使用画像の削除

どの記事からも参照されなくなった画像は、次のコマンドで削除します（スケジューラに登録済みで、毎日 4:00 に自動実行されます）。

```bash
docker compose exec app php artisan images:prune --dry-run  # 対象の確認のみ
docker compose exec app php artisan images:prune            # 実際に削除
```

猶予期間は `config/images.php` で調整できます。

| 設定 | 既定値 | 意味 |
| --- | --- | --- |
| `IMAGE_DELETED_ARTICLE_RETENTION_DAYS` | 30 | 論理削除された記事の画像を残す日数。この期間内に記事を復元すれば画像も元通りになる |
| `IMAGE_ORPHAN_GRACE_HOURS` | 24 | アップロード直後のオブジェクトを削除対象外にする時間。保存処理中のものを消さないための安全域 |

本番では以下が別途必要です。

- スケジューラの起動（`php artisan schedule:work`、または cron から `schedule:run` を毎分実行）
- S3 バケットに `tmp/` プレフィックスの有効期限 1 日のライフサイクルルールを設定（未設定でも `images:prune` が回収しますが、実行間隔のぶん滞留します）

## 開発時の注意

- **ホストとコンテナの開発サーバーを同時に起動しないでください。** `vendor` / `node_modules` / `.next` をホストと共有しているため競合します。
- 依存が壊れた場合は削除して入れ直せば復旧します。
  ```bash
  rm -rf laravel-back/vendor && docker compose restart app
  rm -rf nextjs-front/node_modules nextjs-front/.next && docker compose restart next
  ```
