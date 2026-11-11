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

  # github-terraform-stg のロールは、このキー（stg/）だけを読み書きできる
  backend "s3" {
    bucket       = "takuosblog-tfstate"
    key          = "stg/terraform.tfstate"
    region       = "ap-northeast-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "ap-northeast-1"

  # ほかのアカウント（別のプロジェクトの認証情報など）に誤って apply しないようにする
  allowed_account_ids = [var.aws_account_id]

  # github-terraform-stg のロールは、Env=stg のタグが付いた EC2 のリソースだけを変えられる。
  # このタグを外したり変えたりすると、作れなくなる（envs/shared の terraform_stg.tf）
  default_tags {
    tags = {
      Project   = "portfolio"
      Env       = "stg"
      ManagedBy = "terraform"
    }
  }
}

# API トークンは環境変数 CLOUDFLARE_API_TOKEN で渡す（GitHub の Environment「staging」のシークレット）
provider "cloudflare" {}
