#!/bin/bash
# Let's Encrypt の証明書を初めて取る（infra/design.md の「証明書（certbot）」）。EC2 の中で root で1回だけ実行する。
#   portfolio-cert-init --staging <メールアドレス>   試験用の認証局で手順を通す（本物は同じドメインで週5回までしか発行できない）
#   portfolio-cert-init <メールアドレス>             本物を取る
# メールアドレスは Let's Encrypt のアカウントの連絡先。公開リポジトリに書かないよう、引数で渡す。
# 登録した内容は /data/letsencrypt/accounts に残り、更新（portfolio-cert-renew）では要らない。
#
# nginx は証明書が無いと 443 の設定で起動できないので、nginx を止めて certbot が自分で 80 番を開いて確認を受ける（standalone）。
# 取ったら nginx を起動し、ふだんの更新と同じ webroot で更新が通るかを --dry-run で確かめる
set -euo pipefail

STAGING=false
if [ "${1:-}" = "--staging" ]; then
  STAGING=true
  shift
fi
EMAIL=${1:?usage: portfolio-cert-init [--staging] <email>}

DIR=/opt/portfolio
COMPOSE=(docker compose -f "$DIR/docker-compose.prod.yml" --project-directory "$DIR")
DOMAIN=$(sed -n "s/^API_DOMAIN='\(.*\)'$/\1/p" "$DIR/.env")
if [ -z "$DOMAIN" ]; then
  echo "$DIR/.env に API_DOMAIN がありません。先にデプロイしてください" >&2
  exit 1
fi
CERT=/data/letsencrypt/live/$DOMAIN/cert.pem

# 途中で止まっても、nginx は起動し直しておく（証明書が無ければ、また起動を繰り返すだけ）
trap '"${COMPOSE[@]}" up -d nginx >/dev/null 2>&1 || true' EXIT

# 試験用の証明書が残っていたら、本物を取る前に消す（試験用のまま「まだ期限内」と判断されないように）
if [ "$STAGING" = false ] && [ -f "$CERT" ] && openssl x509 -in "$CERT" -noout -issuer | grep -q STAGING; then
  echo "試験用の証明書を消してから、本物を取ります"
  "${COMPOSE[@]}" run --rm certbot delete --cert-name "$DOMAIN" --non-interactive
fi

ARGS=(certonly --standalone -d "$DOMAIN" --cert-name "$DOMAIN"
  --email "$EMAIL" --agree-tos --no-eff-email --non-interactive --keep-until-expiring)
if [ "$STAGING" = true ]; then
  ARGS+=(--test-cert)
fi

echo "== nginx を止めて、$DOMAIN の証明書を取る（staging: $STAGING）"
"${COMPOSE[@]}" stop nginx
"${COMPOSE[@]}" run --rm -p 80:80 certbot "${ARGS[@]}"

echo "== nginx を起動する"
"${COMPOSE[@]}" up -d nginx
sleep 3

echo "== ふだんの更新（webroot）が通るかを確かめる"
"${COMPOSE[@]}" run --rm certbot renew --dry-run --webroot -w /var/www/certbot --cert-name "$DOMAIN"

echo "== https://$DOMAIN/up"
if [ "$STAGING" = true ]; then
  # 試験用の証明書は信頼されていないので、確かめずにつなぐ
  curl -sk -o /dev/null -w '%{http_code}\n' "https://$DOMAIN/up"
else
  curl -s -o /dev/null -w '%{http_code}\n' "https://$DOMAIN/up"
fi
openssl x509 -in "$CERT" -noout -issuer -enddate
