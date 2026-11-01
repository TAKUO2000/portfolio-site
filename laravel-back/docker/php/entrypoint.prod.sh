#!/bin/sh
set -e

# 本番用の entrypoint。開発用（entrypoint.sh）と違い、composer install と key:generate はしない
# （vendor はイメージに含め、APP_KEY は環境変数で渡す）

# マイグレーションは app（php-fpm）でだけ流す。同じイメージの scheduler では流さない
if [ "$1" = "php-fpm" ]; then
    php artisan migrate --force
fi

# 環境変数を実行時に渡すので、config のキャッシュはビルド時ではなく起動時に作る
php artisan optimize

exec "$@"
