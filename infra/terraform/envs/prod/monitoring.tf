# 本番の監視（infra/design.md の「バックアップと監視」「CPU クレジットと費用の監視」）。
# 通知は SNS からメールに送る（購読の確認のメールを承認するまで届かない）

resource "aws_sns_topic" "alerts" {
  name = "portfolio-prod-alerts"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

locals {
  alert_actions = [aws_sns_topic.alerts.arn]
}

# AWS 側（ハードウェアなど）の故障。別の機械で EC2 を起動し直す（recover。IP・EBS・インスタンス ID はそのまま）
resource "aws_cloudwatch_metric_alarm" "status_check_system" {
  alarm_name          = "portfolio-prod-status-check-system"
  alarm_description   = "AWS 側の故障で EC2 のステータスチェックに失敗した。自動で recover する"
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed_System"
  dimensions          = { InstanceId = module.app.instance_id }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 2
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  alarm_actions       = concat(["arn:aws:automate:ap-northeast-1:ec2:recover"], local.alert_actions)
  ok_actions          = local.alert_actions
}

# EC2 の中（OS が応答しない、メモリが尽きたなど）の故障。知らせるだけ（再起動するかは見てから決める）
resource "aws_cloudwatch_metric_alarm" "status_check_instance" {
  alarm_name          = "portfolio-prod-status-check-instance"
  alarm_description   = "EC2 の中の問題でステータスチェックに失敗した"
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed_Instance"
  dimensions          = { InstanceId = module.app.instance_id }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 3
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  alarm_actions       = local.alert_actions
  ok_actions          = local.alert_actions
}

# Standard モードでは、クレジットを使い切ると CPU がベースライン（10%）に抑えられて遅くなる。その前に気づく。
# t4g.micro は毎時12クレジットたまり、最大288
resource "aws_cloudwatch_metric_alarm" "cpu_credit_balance" {
  alarm_name          = "portfolio-prod-cpu-credit-low"
  alarm_description   = "CPU クレジットの残高が少ない（使い切ると遅くなる）"
  namespace           = "AWS/EC2"
  metric_name         = "CPUCreditBalance"
  dimensions          = { InstanceId = module.app.instance_id }
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 3
  comparison_operator = "LessThanThreshold"
  threshold           = 30
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alert_actions
  ok_actions          = local.alert_actions
}

# TLS の証明書の残りの日数。portfolio-cert-renew（1日2回）が送る。Let's Encrypt は期限切れの通知を送らない。
# 値が届かないとき（timer が止まった、送る権限が無いなど）も知らせる
resource "aws_cloudwatch_metric_alarm" "tls_days_to_expiry" {
  alarm_name          = "portfolio-prod-tls-expiring"
  alarm_description   = "api の TLS の証明書の期限が14日を切った、または残りの日数が2日届いていない（更新の timer を確かめる）"
  namespace           = "Portfolio/TLS"
  metric_name         = "DaysToExpiry"
  dimensions          = { Env = "prod", Domain = local.api_domain }
  statistic           = "Minimum"
  period              = 86400
  evaluation_periods  = 2
  datapoints_to_alarm = 1
  comparison_operator = "LessThanThreshold"
  threshold           = 14
  treat_missing_data  = "breaching"
  alarm_actions       = local.alert_actions
  ok_actions          = local.alert_actions
}

# SES のバウンス率と苦情率（アカウント単位で SES が出す）。AWS が見直しを始める値（5% と 0.1%）を超えたら知らせる。
# 率が高いままだと、アカウントの送信が止められる
resource "aws_cloudwatch_metric_alarm" "ses_bounce_rate" {
  alarm_name          = "portfolio-ses-bounce-rate"
  alarm_description   = "SES のバウンス率が 5% を超えた（10% を超えると送信が止められうる）"
  namespace           = "AWS/SES"
  metric_name         = "Reputation.BounceRate"
  statistic           = "Maximum"
  period              = 3600
  evaluation_periods  = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0.05
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alert_actions
  ok_actions          = local.alert_actions
}

resource "aws_cloudwatch_metric_alarm" "ses_complaint_rate" {
  alarm_name          = "portfolio-ses-complaint-rate"
  alarm_description   = "SES の苦情率が 0.1% を超えた（0.5% を超えると送信が止められうる）"
  namespace           = "AWS/SES"
  metric_name         = "Reputation.ComplaintRate"
  statistic           = "Maximum"
  period              = 3600
  evaluation_periods  = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0.001
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alert_actions
  ok_actions          = local.alert_actions
}

# mysqldump が取れたこと。portfolio-mysqldump（毎日 UTC の 18時台）が、置けたときだけ送る。
# 1日届かなければ知らせる（失敗に気づかないまま30日たつと、バックアップがすべて消えるため）
resource "aws_cloudwatch_metric_alarm" "mysqldump_missing" {
  alarm_name          = "portfolio-prod-mysqldump-missing"
  alarm_description   = "mysqldump のバックアップが1日取れていない（journalctl -u portfolio-mysqldump を確かめる）"
  namespace           = "Portfolio/Backup"
  metric_name         = "MysqlDumpSucceeded"
  dimensions          = { Env = "prod" }
  statistic           = "Sum"
  period              = 86400
  evaluation_periods  = 1
  comparison_operator = "LessThanThreshold"
  threshold           = 1
  treat_missing_data  = "breaching"
  alarm_actions       = local.alert_actions
  ok_actions          = local.alert_actions
}

