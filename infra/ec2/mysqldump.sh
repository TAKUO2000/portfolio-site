#!/bin/bash
# MySQL のバックアップ（infra/design.md の「バックアップと監視」）。portfolio-mysqldump.timer が毎日1回実行する（本番だけ）。
# mysql のコンテナの中で、アプリ用のユーザー（root のパスワードは誰も持たない）で mysqldump を取り、gzip して
# バックアップ用のバケットに日付入りのキーで置く。EC2 は置くことしかできない（読む・消すはできない）。
# ログは journalctl -u portfolio-mysqldump で見る
set -euo pipefail

DIR=/opt/portfolio
COMPOSE=(docker compose -f "$DIR/docker-compose.prod.yml" --project-directory "$DIR")
. /etc/portfolio-env
BUCKET=takuosblog-backup-$PORTFOLIO_ENV

TOKEN=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
REGION=$(curl -fsS -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)

NOW=$(date -u +%Y%m%dT%H%M%SZ)
KEY="mysql/$(date -u +%Y/%m/%d)/portfolio-$NOW.sql.gz"

# いったんファイルに書き、最後まで取れたのを確かめてから置く（途中で失敗した不完全なファイルを置かないように）
umask 077
TMP=$(mktemp /var/tmp/portfolio-mysqldump.XXXXXX.sql.gz)
trap 'rm -f "$TMP"' EXIT

# パスワードはコマンドの引数に書かない（MYSQL_PWD で渡す。コンテナの中の ps に出ないように）
"${COMPOSE[@]}" exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump -u"$MYSQL_USER" --single-transaction --no-tablespaces "$MYSQL_DATABASE"' |
  gzip > "$TMP"

gzip -t "$TMP"
if ! zcat "$TMP" | tail -n 1 | grep -q '^-- Dump completed'; then
  echo "mysqldump の出力が最後まで書かれていません" >&2
  exit 1
fi

aws s3 cp --region "$REGION" --only-show-errors "$TMP" "s3://$BUCKET/$KEY"
echo "uploaded s3://$BUCKET/$KEY ($(stat -c %s "$TMP") bytes)"

# 取れたことを CloudWatch に送る。届かない日があれば、アラームで知らせる（失敗しても journal に残るだけで気づけないため）
aws cloudwatch put-metric-data --region "$REGION" --namespace Portfolio/Backup --metric-name MysqlDumpSucceeded \
  --dimensions "Env=$PORTFOLIO_ENV" --unit Count --value 1
