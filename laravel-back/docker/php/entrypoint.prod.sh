#!/bin/sh
set -e

# 本番用の entrypoint。開発用（entrypoint.sh）と違い、composer install と key:generate はしない
# （vendor はイメージに含め、APP_KEY は環境変数で渡す）

# マイグレーションは app（php-fpm）でだけ流す。同じイメージの scheduler では流さない。
# 起動（再起動を含む）のたびに流れ、デプロイがそのまま本番の DB の変更になる。前のイメージに戻しても動くよう、
# 列の削除や名前の変更のような破壊的な変更は2回のデプロイに分ける（infra/design.md の「デプロイ」）
if [ "$1" = "php-fpm" ]; then
    php artisan migrate --force
fi

# 環境変数を実行時に渡すので、config のキャッシュはビルド時ではなく起動時に作る
php artisan optimize

exec "$@"
