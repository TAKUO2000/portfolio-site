terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.28"
    }
  }

  backend "s3" {
    bucket       = "takuosblog-tfstate"
    key          = "prod/terraform.tfstate"
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
      Env       = "prod"
      ManagedBy = "terraform"
    }
  }
}

# API トークンは環境変数 CLOUDFLARE_API_TOKEN で渡す（infra/setup.md の「Cloudflare の API トークンを作る」）
provider "cloudflare" {}
