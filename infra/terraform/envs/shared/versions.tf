terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
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
