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

# ホストと同じUIDの非rootユーザで実行するため、HOMEに依存しない書き込み先を用意する
ENV COMPOSER_HOME=/tmp/composer
RUN mkdir -p /tmp/composer && chmod 777 /tmp/composer

WORKDIR /var/www/html

EXPOSE 9000

ENTRYPOINT ["sh", "docker/php/entrypoint.sh"]
