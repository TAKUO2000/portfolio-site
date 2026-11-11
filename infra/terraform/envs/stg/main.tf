# ステージング（infra/design.md の「ステージング環境」）。必要なときだけ GitHub Actions（.github/workflows/staging.yml）で
# apply し、確かめ終わったら destroy する。本番との違い：
#   - Elastic IP を使わず、自動で割り当てられるパブリック IP を api.stg に登録する（作るたびに変わる）
#   - データ用 EBS を作らず、ルートの /data に置く（作るたびに DB は空）
#   - 画像バケットは destroy のときに中身ごと消す
#   - バックアップと監視は作らない
locals {
  availability_zone = "ap-northeast-1a"

  # フロントエンドのドメイン（Vercel の Preview の develop）。API・CORS・Cookie・Sanctum の値はここから組み立てる
  site_domain     = "stg.takuosblog.com"
  api_domain      = "api.${local.site_domain}"
  frontend_origin = "https://${local.site_domain}"

  image_bucket_name = "takuosblog-images-stg"
  # SES の送信元ドメインの ID（envs/shared）は環境によらず takuosblog.com
  mail_from_address = "no-reply@takuosblog.com"

  # envs/shared で作ったもの。github-terraform-stg のロールに読む権限を足さないよう、data で引かずに ARN を組み立てる
  ecr_repository_arn       = "arn:aws:ecr:ap-northeast-1:${var.aws_account_id}:repository/portfolio/app"
  deploy_bucket_arn        = "arn:aws:s3:::takuosblog-deploy"
  permissions_boundary_arn = "arn:aws:iam::${var.aws_account_id}:policy/portfolio-stg-boundary"
}

module "app" {
  source = "../../modules/app"

  env                = "stg"
  vpc_cidr           = "10.1.0.0/16"
  public_subnet_cidr = "10.1.1.0/24"
  availability_zone  = local.availability_zone
  instance_type      = "t4g.micro"

  image_bucket_name          = local.image_bucket_name
  image_bucket_force_destroy = true
  frontend_origin            = local.frontend_origin
  ecr_repository_arn         = local.ecr_repository_arn
  deploy_bucket_arn          = local.deploy_bucket_arn
  mail_from_address          = local.mail_from_address
  permissions_boundary_arn   = local.permissions_boundary_arn

  # .env（compose の変数の置き換え）。秘密の DB_PASSWORD は /portfolio/stg/ に AWS CLI で入れる
  compose_config = {
    API_DOMAIN  = local.api_domain
    DB_DATABASE = "portfolio"
    DB_USERNAME = "portfolio"
  }

  # .env.production（Laravel の設定）。envs/prod と同じで、違うのは APP_ENV・ドメイン・Cookie の名前・バケットだけ。
  # 秘密の APP_KEY・FRONTEND_REVALIDATE_SECRET は /portfolio/stg/ に AWS CLI で入れる
  app_config = {
    APP_NAME                 = "TAKUO_Log"
    APP_ENV                  = "staging"
    APP_DEBUG                = "false"
    APP_URL                  = "https://${local.api_domain}"
    FRONTEND_URL             = local.frontend_origin
    APP_LOCALE               = "ja"
    APP_FALLBACK_LOCALE      = "en"
    LOG_CHANNEL              = "stderr"
    LOG_LEVEL                = "warning"
    DB_CONNECTION            = "mysql"
    DB_HOST                  = "mysql"
    DB_PORT                  = "3306"
    SANCTUM_STATEFUL_DOMAINS = local.site_domain
    SESSION_DRIVER           = "database"
    SESSION_DOMAIN           = ".${local.site_domain}"
    SESSION_SECURE_COOKIE    = "true"
    # 本番の Cookie（.takuosblog.com）は stg にも送られるので、名前を変えて取り違えないようにする
    SESSION_COOKIE              = "portfolio_stg_session"
    CACHE_STORE                 = "database"
    QUEUE_CONNECTION            = "database"
    FILESYSTEM_DISK             = "s3"
    AWS_DEFAULT_REGION          = "ap-northeast-1"
    AWS_BUCKET                  = local.image_bucket_name
    AWS_USE_PATH_STYLE_ENDPOINT = "false"
    MAIL_MAILER                 = "ses"
    MAIL_FROM_ADDRESS           = local.mail_from_address
    MAIL_FROM_NAME              = "TAKUO_Log"
  }
}

# api.stg.takuosblog.com の向き先。作るたびに IP が変わるので、apply のたびに登録し直す（短い TTL）。
# certbot が HTTP-01 で証明書を取れるよう、プロキシは使わない
resource "cloudflare_dns_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = local.api_domain
  type    = "A"
  content = module.app.public_ip
  ttl     = 60
  proxied = false
  comment = "ステージングの API（Terraform envs/stg。destroy で消える）"
}
