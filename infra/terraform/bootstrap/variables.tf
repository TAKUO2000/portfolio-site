variable "aws_account_id" {
  description = "このプロジェクト専用の AWS アカウントの ID。公開リポジトリに書かないよう terraform.tfvars で渡す"
  type        = string
}
