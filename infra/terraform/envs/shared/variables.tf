variable "aws_account_id" {
  description = "このプロジェクト専用の AWS アカウントの ID。公開リポジトリに書かないよう terraform.tfvars で渡す"
  type        = string
}

variable "alert_email" {
  description = "AWS Budgets の通知を受け取るメールアドレス"
  type        = string
}
