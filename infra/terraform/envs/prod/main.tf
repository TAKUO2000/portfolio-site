locals {
  availability_zone = "ap-northeast-1a"
  api_domain        = "api.takuosblog.com"
  frontend_origin   = "https://takuosblog.com"
  image_bucket_name = "takuosblog-images-prod"
  mail_from_address = "no-reply@takuosblog.com"
}

# envs/shared で作ったもの
data "aws_ecr_repository" "app" {
  name = "portfolio/app"
}

module "app" {
  source = "../../modules/app"

  env                = "prod"
  vpc_cidr           = "10.0.0.0/16"
  public_subnet_cidr = "10.0.1.0/24"
  availability_zone  = local.availability_zone
  instance_type      = "t4g.micro"

  image_bucket_name  = local.image_bucket_name
  frontend_origin    = local.frontend_origin
  ecr_repository_arn = data.aws_ecr_repository.app.arn
  mail_from_address  = local.mail_from_address

  extra_user_data = templatefile("${path.module}/mount-data.sh.tftpl", {
    volume_id = aws_ebs_volume.data.id
  })

  # .env（compose の変数の置き換え）。秘密の DB_PASSWORD・DB_ROOT_PASSWORD は Parameter Store に AWS CLI で入れる
  compose_config = {
    API_DOMAIN  = local.api_domain
    DB_DATABASE = "portfolio"
    DB_USERNAME = "portfolio"
  }

  # .env.production（Laravel の設定。laravel-back/.env.production.example と同じ内容）。
  # 秘密の APP_KEY・FRONTEND_REVALIDATE_SECRET は Parameter Store に AWS CLI で入れる。
  # 空にする変数（AWS_ACCESS_KEY_ID など）は書かない（未設定なら Laravel は既定の値を使う）
  app_config = {
    APP_NAME                    = "TAKUO_Log"
    APP_ENV                     = "production"
    APP_DEBUG                   = "false"
    APP_URL                     = "https://${local.api_domain}"
    FRONTEND_URL                = local.frontend_origin
    APP_LOCALE                  = "ja"
    APP_FALLBACK_LOCALE         = "en"
    LOG_CHANNEL                 = "stderr"
    LOG_LEVEL                   = "warning"
    DB_CONNECTION               = "mysql"
    DB_HOST                     = "mysql"
    DB_PORT                     = "3306"
    SANCTUM_STATEFUL_DOMAINS    = "takuosblog.com"
    SESSION_DRIVER              = "database"
    SESSION_DOMAIN              = ".takuosblog.com"
    SESSION_SECURE_COOKIE       = "true"
    SESSION_COOKIE              = "portfolio_session"
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

# MySQL のデータと証明書を置く。インスタンスを作り直しても残す（infra/design.md の「データの置き場所」）。
# prevent_destroy には変数を使えないので、ステージングと共有する modules/app には置かない
resource "aws_ebs_volume" "data" {
  availability_zone = local.availability_zone
  type              = "gp3"
  size              = 10
  encrypted         = true

  tags = { Name = "portfolio-prod-data" }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = module.app.instance_id

  # EC2 を作り直すときは、先にこのアタッチメントが消される。/data をマウントして MySQL が書き込んでいる最中に
  # 外すと、デタッチが終わらなかったり、データが壊れたりするので、EC2 を止めてから外す
  stop_instance_before_detaching = true
}

# api.takuosblog.com の向き先。インスタンスを作り直しても IP が変わらないようにする
resource "aws_eip" "app" {
  domain   = "vpc"
  instance = module.app.instance_id

  tags = { Name = "portfolio-prod" }
}

# certbot が HTTP-01 で証明書を取れるよう、プロキシは使わない（infra/design.md の「DNS（Cloudflare）」）
resource "cloudflare_dns_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = local.api_domain
  type    = "A"
  content = aws_eip.app.public_ip
  ttl     = 1
  proxied = false
  comment = "本番の API（Terraform envs/prod）"
}
