#!/bin/bash
# Let's Encrypt の証明書を更新し、nginx に読み込み直させる。portfolio-cert-renew.timer が1日2回実行する。
# certbot は、期限が残り30日を切った証明書だけを更新する。ログは journalctl -u portfolio-cert-renew で見る。
#
# - 初回は standalone で取るので、--webroot を必ず渡す（そのままだと certbot が 80 番を開こうとして nginx とぶつかる）
# - reload は certbot の --deploy-hook ではなく、ここで続けて行う（certbot はコンテナの中で動き、nginx のコンテナを操作できない）
set -euo pipefail

DIR=/opt/portfolio
COMPOSE=(docker compose -f "$DIR/docker-compose.prod.yml" --project-directory "$DIR")

if ! ls /data/letsencrypt/live/*/cert.pem >/dev/null 2>&1; then
  echo "証明書がまだ無いので、更新しません（portfolio-cert-init で取る）"
  exit 0
fi

# 実行の時刻は timer がずらすので、certbot の待ち（最大8分）は入れない
"${COMPOSE[@]}" run --rm certbot renew --webroot -w /var/www/certbot --no-random-sleep-on-renew
"${COMPOSE[@]}" exec -T nginx nginx -s reload

for cert in /data/letsencrypt/live/*/cert.pem; do
  echo "$cert: $(openssl x509 -in "$cert" -noout -enddate)"
done
