# アカウント全体の月の予算。通知するだけで、リソースは止めない（infra/design.md の「CPU クレジットと費用の監視」）
resource "aws_budgets_budget" "monthly" {
  name         = "portfolio-monthly"
  budget_type  = "COST"
  limit_amount = "20"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # クレジットを差し引く前の金額で比べる。クレジットで請求が $0 の間も、使いすぎに気づけるように
  cost_types {
    include_credit = false
  }

  # 実績が 80% を超えたら
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  # 月末の予測が 100% を超えそうなら
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
}
