# 開発環境の詳細

README の「開発環境」で触れていない設定や、困ったときの対処をまとめます。

## アクセス先

`make docker-up` で起動したあとのアクセス先は次の通りです。

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

`make docker-up` は `docker compose up -d` を実行します。イメージが無い初回は compose が自動でビルドするため、通常はこのコマンドだけで足ります。Dockerfile や PHP 拡張を変更したときだけ `make docker-build`（`--build` 付き）を使ってください。

停止は `make docker-down` です。DB と MinIO のデータは volume に残るため、完全に消すには `docker compose down -v` を実行します。

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

## テスト

テストは開発用とは別の MySQL データベース（`laravel_back_testing`）に対して実行されるため、開発用の DB や MinIO には影響しません。このデータベースは MySQL の初回起動時に自動作成され、`make test` でも作成されていなければ作られます。

`make test` を使わず直接実行する場合も同じ設定が効きます。

```bash
docker compose exec app php artisan test
```

## ポートが衝突する場合

他のプロジェクトが 8000 番や 3000 番を使っている場合は、ルートの `.env` でポートを変更します。

```bash
BACKEND_PORT=8001
FRONTEND_PORT=3001
```

`BACKEND_PORT` を変えたときは `nextjs-front/.env` の `NEXT_PUBLIC_API_BASE_URL` も合わせてください。

## 公開範囲

各サービスのポートはホストの `127.0.0.1` にのみバインドしています。開発用の認証情報（`.env.example` の値）をそのまま使う前提のため、同一ネットワークの第三者から MySQL や MinIO に到達できないようにしています。

スマホ実機など LAN 経由で開発サーバーを確認したい場合は、`docker-compose.yml` の該当サービスから `127.0.0.1:` を外してください。その場合は接続元が限定されたネットワークであることを確認し、`.env` の認証情報も変更することを推奨します。

## UID / GID

コンテナはホストと同じ UID / GID で動きます（`vendor` や `node_modules` を共有しているため）。`id -u` が 1000 以外の環境では、ルートの `.env` の `UID` / `GID` を実際の値に変更してください。

## Docker を使わない場合

ホストに PHP 8.4 以上と Node 24（`nextjs-front/.nvmrc` 参照）、MySQL が必要です。

```bash
make setup
cd laravel-back && composer install && php artisan migrate
cd ../nextjs-front && npm install
cd .. && make dev   # API と フロントエンドを同時に起動
```

この場合 `laravel-back/.env` の `DB_*` はホストの MySQL に合わせて設定してください（Docker 利用時は compose 側が上書きするため変更不要です）。

ホストでテストを実行する場合は、`laravel_back_testing` データベースが必要です。Docker の MySQL を使うなら `laravel-back/.env` の接続先を `127.0.0.1:3307` に向けてください。

## 画像ストレージ

ローカルは MinIO、本番は AWS S3 を使い、処理は共通で設定値だけが変わります。ローカルの値は `docker-compose.yml` が注入するため設定は不要です。設定値や未使用画像の削除（`images:prune`）、本番で必要な準備は [image-management.md](image-management.md) を参照してください。

## 開発時の注意

- **ホストとコンテナの開発サーバーを同時に起動しないでください。** `vendor` / `node_modules` / `.next` をホストと共有しているため競合します。
- 依存が壊れた場合は削除して入れ直せば復旧します。
  ```bash
  rm -rf laravel-back/vendor && docker compose restart app
  rm -rf nextjs-front/node_modules nextjs-front/.next && docker compose restart next
  ```
