FROM php:8.4-fpm

# mbstring / curl / xml はphp:8.4-fpmに組み込み済みなのでビルド対象から除外している
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libzip-dev \
        libicu-dev \
        unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql exif pcntl bcmath gd zip intl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/php/php.ini /usr/local/etc/php/conf.d/local.ini

# 任意のUIDで実行するため、イメージに存在しないユーザーでもHOMEが書き込めるようにする
# （未設定だとHOME=/になり、composerやtinker(psysh)が設定ファイルを書けずに失敗する）
# ディレクトリはビルド時に作らない。/tmpは1777なので、実行時にcomposer自身が
# 実行ユーザー所有・755で作成する（ビルド時に作るとroot所有になり777が必要になる）
ENV HOME=/tmp
ENV COMPOSER_HOME=/tmp/composer

WORKDIR /var/www/html

EXPOSE 9000

ENTRYPOINT ["sh", "docker/php/entrypoint.sh"]
