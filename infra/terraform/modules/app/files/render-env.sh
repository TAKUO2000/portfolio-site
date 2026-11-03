#!/bin/bash
# Parameter Store から、compose と同じディレクトリ（/opt/portfolio）の .env と .env.production を作り直す。
#   portfolio-render-env <APP_IMAGE>
# 環境（prod / stg）は /etc/portfolio-env の PORTFOLIO_ENV（user_data が書く）。
#
# - .env            compose の変数の置き換え：APP_IMAGE、/portfolio/<env>/config/compose/*、DB_PASSWORD、DB_ROOT_PASSWORD
# - .env.production Laravel の設定：/portfolio/<env>/config/app/*、APP_KEY、FRONTEND_REVALIDATE_SECRET
# どちらもパーミッション 600。値は単一引用符で囲む（compose は中身を置き換えずにそのまま渡す）
set -euo pipefail

APP_IMAGE=${1:?usage: portfolio-render-env <APP_IMAGE>}
# shellcheck source=/dev/null
. /etc/portfolio-env
DIR=/opt/portfolio

TOKEN=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
REGION=$(curl -fsS -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)

# 名前（パスの最後の部分）と値を、タブ区切りで1行ずつ出す。値に / が入っていても、名前の列だけを削る
params_by_path() {
  aws ssm get-parameters-by-path --region "$REGION" --path "$1" --with-decryption \
    --query 'Parameters[].[Name,Value]' --output text | awk -F'\t' -v OFS='\t' '{ sub(/.*\//, "", $1); print }'
}

secret() {
  aws ssm get-parameter --region "$REGION" --name "/portfolio/$PORTFOLIO_ENV/$1" --with-decryption \
    --query Parameter.Value --output text
}

line() {
  case "$2" in
    *"'"*) echo "$1 の値に単一引用符が含まれています" >&2; exit 1 ;;
  esac
  printf "%s='%s'\n" "$1" "$2"
}

# 先にすべての値を変数に取り出す。`line X "$(secret X)"` のように引数の中で取り出すと、取り出しに失敗しても
# set -e が効かず、空の値で既存の .env を上書きしてしまうため（代入なら失敗した時点で止まる）
compose_config=$(params_by_path "/portfolio/$PORTFOLIO_ENV/config/compose")
app_config=$(params_by_path "/portfolio/$PORTFOLIO_ENV/config/app")
DB_PASSWORD=$(secret DB_PASSWORD)
DB_ROOT_PASSWORD=$(secret DB_ROOT_PASSWORD)
APP_KEY=$(secret APP_KEY)
FRONTEND_REVALIDATE_SECRET=$(secret FRONTEND_REVALIDATE_SECRET)

for name in compose_config app_config DB_PASSWORD DB_ROOT_PASSWORD APP_KEY FRONTEND_REVALIDATE_SECRET; do
  if [ -z "${!name}" ]; then
    echo "$name が空です。Parameter Store の値を確かめてください（既存の .env は変えません）" >&2
    exit 1
  fi
done

umask 077
tmp_env=$(mktemp "$DIR/.env.XXXXXX")
tmp_app=$(mktemp "$DIR/.env.production.XXXXXX")
trap 'rm -f "$tmp_env" "$tmp_app"' EXIT

{
  line APP_IMAGE "$APP_IMAGE"
  while IFS=$'\t' read -r name value; do line "$name" "$value"; done <<< "$compose_config"
  line DB_PASSWORD "$DB_PASSWORD"
  line DB_ROOT_PASSWORD "$DB_ROOT_PASSWORD"
} > "$tmp_env"

{
  while IFS=$'\t' read -r name value; do line "$name" "$value"; done <<< "$app_config"
  line APP_KEY "$APP_KEY"
  line FRONTEND_REVALIDATE_SECRET "$FRONTEND_REVALIDATE_SECRET"
} > "$tmp_app"

mv "$tmp_env" "$DIR/.env"
mv "$tmp_app" "$DIR/.env.production"
trap - EXIT
echo "wrote $DIR/.env and $DIR/.env.production"
