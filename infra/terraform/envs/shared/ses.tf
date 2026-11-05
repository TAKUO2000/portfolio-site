# パスワード再設定とメールアドレスの確認のメールを SES から送る（infra/design.md の「メール送信（SES）」）。
# 送信元ドメインの ID は本番とステージングで共有し、環境を作り直しても DKIM が変わらないよう shared に置く。
# 送信の権限（ses:SendRawEmail）は、使う環境のインスタンスロールに付ける（Resource と条件は infra/design.md）
locals {
  mail_domain      = "takuosblog.com"
  mail_from_domain = "mail.${local.mail_domain}"
}

resource "aws_sesv2_email_identity" "domain" {
  email_identity = local.mail_domain

  # Easy DKIM。鍵は SES が作り、定期的に入れ替える
  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }

  # 本番とステージングの両方のメール送信が使う。作り直すと DKIM のトークンが変わり、DNS が行き渡るまで
  # 送ったメールの DKIM が通らなくなるうえ、サンドボックスの解除もやり直しになりうる。消すときはこの行を外してから
  lifecycle {
    prevent_destroy = true
  }
}

# Easy DKIM の公開鍵を指す CNAME。トークンは SES の ID を作るまで決まらず for_each のキーにできないので、
# 常に3つ返ることを使って count にする
resource "cloudflare_dns_record" "ses_dkim" {
  count = 3

  zone_id = var.cloudflare_zone_id
  name    = "${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${local.mail_domain}"
  type    = "CNAME"
  content = "${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"
  ttl     = 1 # 自動
  proxied = false
  comment = "SES の DKIM（Terraform envs/shared）"
}

# Return-Path（エンベロープの送信元）を自分のドメインのサブドメインにし、SPF を DMARC に合わせる。
# ルートの MX と SPF は Cloudflare の Email Routing（contact@ の転送）が使っているので、サブドメインに分ける
resource "aws_sesv2_email_identity_mail_from_attributes" "domain" {
  email_identity   = aws_sesv2_email_identity.domain.email_identity
  mail_from_domain = local.mail_from_domain

  # MX が引けないときは、SES の既定の MAIL FROM（amazonses.com）で送る。送信は止めない。
  # そうなると SPF が DMARC の From と揃わず DKIM だけで通る状態になり、気づきにくいので、レコードを先に作る
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"

  depends_on = [
    cloudflare_dns_record.ses_mail_from_mx,
    cloudflare_dns_record.ses_mail_from_spf,
  ]
}

# バウンスと苦情の通知を SES が受け取るための MX。1つだけ置く
resource "cloudflare_dns_record" "ses_mail_from_mx" {
  zone_id  = var.cloudflare_zone_id
  name     = local.mail_from_domain
  type     = "MX"
  content  = "feedback-smtp.ap-northeast-1.amazonses.com"
  priority = 10
  ttl      = 1
  comment  = "SES の MAIL FROM（Terraform envs/shared）"
}

resource "cloudflare_dns_record" "ses_mail_from_spf" {
  zone_id = var.cloudflare_zone_id
  name    = local.mail_from_domain
  type    = "TXT"
  content = "\"v=spf1 include:amazonses.com ~all\""
  ttl     = 1
  comment = "SES の MAIL FROM の SPF（Terraform envs/shared）"
}

# まずは p=none でレポートだけ受け取る。SPF・DKIM が通り続けるのを確かめてから quarantine などに上げる
resource "cloudflare_dns_record" "dmarc" {
  zone_id = var.cloudflare_zone_id
  name    = "_dmarc.${local.mail_domain}"
  type    = "TXT"
  content = "\"v=DMARC1; p=none; rua=mailto:${var.dmarc_report_email}\""
  ttl     = 1
  comment = "DMARC（Terraform envs/shared）"
}
