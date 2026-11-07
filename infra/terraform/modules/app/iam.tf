# EC2 のインスタンスロール。自分の環境のものだけに絞る（ステージングから本番の秘密やバケットに届かないように）
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  # デプロイするイメージのタグの接頭辞（ブランチの名前）。部品も同じ接頭辞で置かれる
  deploy_tag_prefix  = var.env == "prod" ? "main" : "develop"
  parameter_path_arn = "arn:aws:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter/portfolio/${var.env}"
}

data "aws_iam_policy_document" "assume_ec2" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "portfolio-${var.env}-app"
  assume_role_policy = data.aws_iam_policy_document.assume_ec2.json
}

resource "aws_iam_instance_profile" "app" {
  name = "portfolio-${var.env}-app"
  role = aws_iam_role.app.name
}

# Session Manager で接続し、SSM Run Command（デプロイ）を受け取るため
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "app" {
  # 画像バケット。Laravel が tmp/ への署名付き URL の発行、images/ への移動（コピーと削除）、
  # images:prune での一覧と削除を行う
  statement {
    sid       = "ImageBucketObjects"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.images.arn}/*"]
  }

  statement {
    sid       = "ImageBucketList"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.images.arn]
  }

  # /portfolio/<env>/ の秘密（AWS CLI で入れる）と設定（config/。Terraform で作る）を読む。
  # 既定の鍵（aws/ssm）で暗号化した SecureString は、この権限だけで復号できる
  statement {
    sid       = "ReadOwnParameters"
    actions   = ["ssm:GetParametersByPath", "ssm:GetParameters", "ssm:GetParameter"]
    resources = [local.parameter_path_arn, "${local.parameter_path_arn}/*"]
  }

  # AmazonSSMManagedInstanceCore は ssm:GetParameter(s) を Resource "*" で許可しているので、そのままだと
  # ほかの環境（ステージングから本番など）の秘密も読めてしまう。自分の環境のパス以外は明示的に拒否する
  statement {
    sid    = "DenyOtherParameters"
    effect = "Deny"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
      "ssm:GetParameterHistory",
    ]
    not_resources = [local.parameter_path_arn, "${local.parameter_path_arn}/*"]
  }

  # デプロイのとき（SSM ドキュメント portfolio-deploy）に、自分の環境の部品を取る
  statement {
    sid       = "ReadOwnDeployBundles"
    actions   = ["s3:GetObject"]
    resources = ["${var.deploy_bucket_arn}/bundles/${local.deploy_tag_prefix}-*"]
  }

  # 証明書の残りの日数（infra/ec2/cert-renew.sh）と、mysqldump が取れたこと（infra/ec2/mysqldump.sh）を送る。
  # この名前空間にだけ送れる
  statement {
    sid       = "PutTlsMetric"
    actions   = ["cloudwatch:PutMetricData"]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "cloudwatch:namespace"
      values   = ["Portfolio/TLS", "Portfolio/Backup"]
    }
  }

  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid       = "EcrPull"
    actions   = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"]
    resources = [var.ecr_repository_arn]
  }

  # サンドボックスの中では宛先の ID（検証済みのアドレス）も認可の対象になるので、Resource は identity/* にし、
  # 送信元のアドレスで絞る（infra/design.md の「メール送信（SES）」）。
  # Laravel の SES のトランスポートは Source を `"名前" <アドレス>` の形で渡すので、両方の形を許可する
  statement {
    sid       = "SendMailAsApp"
    actions   = ["ses:SendRawEmail"]
    resources = ["arn:aws:ses:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:identity/*"]

    condition {
      test     = "StringLike"
      variable = "ses:FromAddress"
      values   = [var.mail_from_address, "*<${var.mail_from_address}>"]
    }
  }
}

resource "aws_iam_role_policy" "app" {
  name   = "portfolio-${var.env}-app"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app.json
}
