variable "aws_account_id" {
  description = "このプロジェクト専用の AWS アカウントの ID。公開リポジトリに書かないよう、GitHub のシークレット（TF_VAR_aws_account_id）で渡す"
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "aws_account_id は12桁の数字で指定してください。"
  }
}

variable "cloudflare_zone_id" {
  description = "Cloudflare の takuosblog.com ゾーンの ID（envs/shared と同じ値）。GitHub のシークレット（TF_VAR_cloudflare_zone_id）で渡す"
  type        = string

  validation {
    condition     = can(regex("^[0-9a-f]{32}$", var.cloudflare_zone_id))
    error_message = "cloudflare_zone_id は32桁の16進数で指定してください。"
  }
}
