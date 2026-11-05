# バックエンドのデプロイ（infra/design.md の「デプロイ」）。本番とステージングで共有するものを置く。
#
#   GitHub Actions（github-deploy-<env>）
#     → ECR に <ブランチ>-<SHA> のイメージを push
#     → デプロイの部品（compose のファイル・nginx の設定・render-env.sh）を S3 に同じタグで置く
#     → EC2 に SSM ドキュメント portfolio-deploy を実行させる
#   EC2 → 同じタグの部品を S3 から取り、.env を作り直して docker compose up -d
#
# 部品を GitHub から直接取らずに S3 に置くのは、リポジトリを非公開にしても動くようにするため

locals {
  deploy_bucket_name = "takuosblog-deploy"
  github_repository  = "TAKUO2000/portfolio-site"

  # 環境ごとのデプロイ。ブランチの名前がそのままイメージのタグの接頭辞になる（ECR のライフサイクルルールと同じ）
  deploy_envs = {
    prod = { branch = "main" }
    stg  = { branch = "develop" }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# --- デプロイの部品の置き場 ---

resource "aws_s3_bucket" "deploy" {
  bucket = local.deploy_bucket_name
}

resource "aws_s3_bucket_public_access_block" "deploy" {
  bucket = aws_s3_bucket.deploy.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "deploy" {
  bucket = aws_s3_bucket.deploy.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

data "aws_iam_policy_document" "deploy_bucket" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.deploy.arn, "${aws_s3_bucket.deploy.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "deploy" {
  bucket = aws_s3_bucket.deploy.id
  policy = data.aws_iam_policy_document.deploy_bucket.json
}

# 部品は1回のデプロイで数 KB なので、消さずに残す（ECR に残っているイメージへ、いつでもロールバックできるように）

# --- デプロイ用の SSM ドキュメント ---
# SSM Run Command は EC2 の root でコマンドを実行できるので、AWS-RunShellScript（任意のコマンド）は許可せず、
# 決まった手順だけを実行するこのドキュメントだけを、デプロイ用のロールに許可する

resource "aws_ssm_document" "deploy" {
  name            = "portfolio-deploy"
  document_type   = "Command"
  document_format = "JSON"

  content = jsonencode({
    schemaVersion = "2.2"
    description   = "Deploy the backend: fetch the bundle for the image tag, render .env, docker compose pull and up -d."
    parameters = {
      imageTag = {
        type        = "String"
        description = "Image tag to deploy: main-<commit SHA> or develop-<commit SHA>"
        # この形以外は受け付けない（シェルにそのまま埋め込むので、コマンドを差し込まれないように）
        allowedPattern = "^(main|develop)-[0-9a-f]{40}$"
      }
    }
    mainSteps = [{
      action = "aws:runShellScript"
      name   = "deploy"
      inputs = {
        # app は起動のたびにマイグレーションを流し、healthcheck の start_period は300秒（docker-compose.prod.yml）
        timeoutSeconds = "900"
        runCommand = split("\n", templatefile("${path.module}/files/deploy.sh.tftpl", {
          region     = data.aws_region.current.region
          bucket     = aws_s3_bucket.deploy.bucket
          registry   = split("/", aws_ecr_repository.app.repository_url)[0]
          repository = aws_ecr_repository.app.name
        }))
      }
    }]
  })
}

# --- GitHub Actions のデプロイ用のロール（infra/design.md の「GitHub Actions のロール」） ---

data "aws_iam_policy_document" "deploy_assume" {
  for_each = local.deploy_envs

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # このブランチで動いたワークフローだけが引き受けられる（ほかのブランチや PR からは引き受けられない）
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${local.github_repository}:ref:refs/heads/${each.value.branch}"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  for_each = local.deploy_envs

  name                 = "github-deploy-${each.key}"
  assume_role_policy   = data.aws_iam_policy_document.deploy_assume[each.key].json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "deploy" {
  for_each = local.deploy_envs

  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  # ECR はタグで権限を絞れないので、リポジトリへの push を許可する。タグは上書きできない（IMMUTABLE）
  statement {
    sid = "EcrPush"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:DescribeImages",
    ]
    resources = [aws_ecr_repository.app.arn]
  }

  # 自分の接頭辞の部品だけを置ける・読める（ステージングのロールで本番の部品を置き換えられないように）
  statement {
    sid       = "DeployBundle"
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.deploy.arn}/bundles/${each.value.branch}-*"]
  }

  statement {
    sid       = "FindInstance"
    actions   = ["ec2:DescribeInstances"]
    resources = ["*"]
  }

  # デプロイ用のドキュメントだけを、自分の環境のタグが付いた EC2 にだけ実行できる
  statement {
    sid       = "RunDeployDocument"
    actions   = ["ssm:SendCommand"]
    resources = [aws_ssm_document.deploy.arn]
  }

  statement {
    sid       = "RunOnOwnInstances"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ec2:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:instance/*"]

    condition {
      test     = "StringEquals"
      variable = "ssm:resourceTag/Env"
      values   = [each.key]
    }
  }

  # 送ったデプロイの結果だけを読む。SSM の仕様で環境ごとには絞れないが、出力は GitHub Actions のログにも出している内容だけ
  statement {
    sid       = "ReadCommandResult"
    actions   = ["ssm:GetCommandInvocation"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  for_each = local.deploy_envs

  name   = "github-deploy-${each.key}"
  role   = aws_iam_role.deploy[each.key].id
  policy = data.aws_iam_policy_document.deploy[each.key].json
}
