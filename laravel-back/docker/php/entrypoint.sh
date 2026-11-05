#!/bin/sh
set -e

composer install --no-interaction --no-progress

if ! grep -q '^APP_KEY=.\+' .env; then
    php artisan key:generate --force
fi

php artisan migrate --force

exec php-fpm
