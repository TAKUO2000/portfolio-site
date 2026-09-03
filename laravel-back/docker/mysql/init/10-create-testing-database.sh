#!/bin/sh
# テスト専用データベースを作成する。
# MYSQL_DATABASE(開発用)はmysqlイメージが自動作成するが、2つ目以降は自分で作る必要がある。
# このスクリプトはvolumeが空の初回起動時のみ実行される（既存環境向けにはmake testが同じ処理を行う）。
set -e

mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_testing\`
    DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_testing\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL
