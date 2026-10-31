terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # このバケット自体を作るので、初回は backend_override.tf でローカルに置き、
  # 作ったあとで -migrate-state でこのバケットへ移す（infra/setup.md）
  backend "s3" {
    bucket       = "takuosblog-tfstate"
    key          = "bootstrap/terraform.tfstate"
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
