# 秘密でない設定。EC2 の上で render-env.sh が秘密の値と一緒に取り出して .env と .env.production に書く。
# 秘密（APP_KEY など）は tfstate に平文で残るので Terraform では作らず、AWS CLI で /portfolio/<env>/ に入れる（infra/setup.md）
resource "aws_ssm_parameter" "compose_config" {
  for_each = var.compose_config

  name  = "/portfolio/${var.env}/config/compose/${each.key}"
  type  = "String"
  value = each.value
}

resource "aws_ssm_parameter" "app_config" {
  for_each = var.app_config

  name  = "/portfolio/${var.env}/config/app/${each.key}"
  type  = "String"
  value = each.value
}
