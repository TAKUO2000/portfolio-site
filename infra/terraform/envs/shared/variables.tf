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

variable "cloudflare_zone_id" {
  description = "Cloudflare の takuosblog.com ゾーンの ID（ダッシュボードの Overview の右下）。トークンにゾーンを読む権限を与えないため、名前から引かずに直接渡す"
  type        = string

  validation {
    condition     = can(regex("^[0-9a-f]{32}$", var.cloudflare_zone_id))
    error_message = "cloudflare_zone_id は32桁の16進数で指定してください。"
  }
}

variable "dmarc_report_email" {
  description = "DMARC の集計レポート（rua）を受け取るアドレス。DNS に公開される"
  type        = string

  # DMARC の TXT にそのまま埋め込むので、区切りの ; や , 、空白、" が入るとレコードが壊れる
  validation {
    condition     = can(regex("^[^\\s;,\"@]+@[^\\s;,\"@]+\\.[^\\s;,\"@]+$", var.dmarc_report_email))
    error_message = "dmarc_report_email はメールアドレスを1つだけ指定してください。"
  }
}
