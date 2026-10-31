# GitHub Actions が長期のアクセスキーを使わずに AWS のロールを引き受けるための OIDC プロバイダー。
# ロール（github-deploy-prod など）は、それぞれを使う子issue（#115・#116）で作る
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}
