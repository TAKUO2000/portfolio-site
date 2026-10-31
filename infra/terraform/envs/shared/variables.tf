variable "aws_account_id" {
  description = "このプロジェクト専用の AWS アカウントの ID。公開リポジトリに書かないよう terraform.tfvars で渡す"
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "aws_account_id は12桁の数字で指定してください。"
  }
}

variable "alert_email" {
  description = "AWS Budgets の通知を受け取るメールアドレス"
  type        = string
}
