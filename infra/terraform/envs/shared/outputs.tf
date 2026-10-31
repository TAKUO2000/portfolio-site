output "ecr_repository_url" {
  description = "バックエンドのイメージの push / pull 先"
  value       = aws_ecr_repository.app.repository_url
}

output "github_oidc_provider_arn" {
  description = "GitHub Actions 用のロール（#115・#116）の信頼ポリシーで指定する OIDC プロバイダー"
  value       = aws_iam_openid_connect_provider.github.arn
}
