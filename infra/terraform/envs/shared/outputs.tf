output "ecr_repository_url" {
  description = "バックエンドのイメージの push / pull 先"
  value       = aws_ecr_repository.app.repository_url
}

output "github_oidc_provider_arn" {
  description = "GitHub Actions 用のロール（#115・#116）の信頼ポリシーで指定する OIDC プロバイダー"
  value       = aws_iam_openid_connect_provider.github.arn
}

output "ses_identity_arn" {
  description = "送信元ドメインの SES の ID"
  value       = aws_sesv2_email_identity.domain.arn
}

output "deploy_role_arns" {
  description = "GitHub Actions のデプロイ用のロール（.github/workflows/deploy.yml が引き受ける）"
  value       = { for env, role in aws_iam_role.deploy : env => role.arn }
}

output "deploy_bucket_arn" {
  description = "デプロイの部品の置き場（EC2 のインスタンスロールに、自分の環境の分の読み取りを許可する）"
  value       = aws_s3_bucket.deploy.arn
}

output "terraform_stg_role_arn" {
  description = "ステージングを作る・消すロール（.github/workflows/staging.yml が引き受ける）"
  value       = aws_iam_role.terraform_stg.arn
}
