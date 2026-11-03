terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    # DNS は Cloudflare にある（infra/design.md の「DNS（Cloudflare）」）
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.28"
    }
  }

  backend "s3" {
    bucket       = "takuosblog-tfstate"
    key          = "shared/terraform.tfstate"
    region       = "ap-northeast-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "ap-northeast-1"

  # ほかのアカウント（別のプロジェクトの認証情報など）に誤って apply しないようにする
  allowed_account_ids = [var.aws_account_id]

  default_tags {
    tags = {
      Project   = "portfolio"
      Env       = "shared"
      ManagedBy = "terraform"
    }
  }
}

# API トークンは環境変数 CLOUDFLARE_API_TOKEN で渡す（takuosblog.com ゾーンの DNS 編集権限だけのもの。infra/setup.md）
provider "cloudflare" {}
