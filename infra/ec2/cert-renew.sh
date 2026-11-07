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

# 残りの日数を CloudWatch に送る（14日を切ったらアラームで知らせる。#114）。
# サブシェルにまとめ、どこで失敗しても更新そのものは成功にする（届かなければ、アラームが「値が届かない」で知らせる）。
# `||` の左側で呼ぶと中の set -e が効かないので、失敗は1つずつ exit 1 で抜ける。
# 名前空間は環境ごとに分ける（ステージングの EC2 が、本番の値を送ってアラームを黙らせられないように）
publish_days_to_expiry() (
  . /etc/portfolio-env || exit 1
  TOKEN=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60') || exit 1
  REGION=$(curl -fsS -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region) || exit 1
  [ -n "$PORTFOLIO_ENV" ] && [ -n "$REGION" ] || exit 1
  for cert in /data/letsencrypt/live/*/cert.pem; do
    domain=$(basename "$(dirname "$cert")")
    end=$(openssl x509 -in "$cert" -noout -enddate | cut -d= -f2) || exit 1
    end_epoch=$(date -d "$end" +%s) || exit 1
    days=$(( (end_epoch - $(date +%s)) / 86400 ))
    echo "$domain: $end（残り $days 日）"
    aws cloudwatch put-metric-data --region "$REGION" --namespace "Portfolio/$PORTFOLIO_ENV/TLS" \
      --metric-name DaysToExpiry --dimensions "Domain=$domain" --unit Count --value "$days" || exit 1
  done
)
publish_days_to_expiry || echo "残りの日数を CloudWatch に送れませんでした" >&2
