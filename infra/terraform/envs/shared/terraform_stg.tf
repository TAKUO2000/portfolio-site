# ステージング（envs/stg）を GitHub Actions から作る・消すロール（infra/design.md の「GitHub Actions のロール」）。
#
# ステージングの EC2 はインターネットに公開され、本番より侵害されやすい。このロールを奪われても（ワークフローを
# 書き換えられても）、本番に届かないように、次のように絞る。
#   - 引き受けられるのは、Environment「staging」のジョブだけ（実行できるブランチは main だけ）
#   - 作れる IAM ロールは portfolio-stg-* だけで、権限の上限（portfolio-stg-boundary）を必ず付けさせる
#   - S3 は stg の画像バケットと、tfstate の stg/ のキーだけ。Parameter Store は /portfolio/stg/config/ だけ（秘密は読めない）
#   - EC2 のリソースは、Env タグが stg 以外のもの（本番）を変えられない。stg 以外の Env タグを付けて作ることもできない

locals {
  stg_name_prefix   = "portfolio-stg"
  stg_image_bucket  = "takuosblog-images-stg"
  tfstate_bucket    = "takuosblog-tfstate"
  account_id        = data.aws_caller_identity.current.account_id
  region            = data.aws_region.current.region
  stg_parameter_arn = "arn:aws:ssm:${local.region}:${local.account_id}:parameter/portfolio/stg"

  # EC2 で、作る・変える・消す操作。下の Deny（本番のタグ）の対象にもする
  stg_ec2_write_actions = [
    "ec2:CreateVpc",
    "ec2:DeleteVpc",
    "ec2:ModifyVpcAttribute",
    "ec2:CreateInternetGateway",
    "ec2:DeleteInternetGateway",
    "ec2:AttachInternetGateway",
    "ec2:DetachInternetGateway",
    "ec2:CreateSubnet",
    "ec2:DeleteSubnet",
    "ec2:ModifySubnetAttribute",
    "ec2:CreateRouteTable",
    "ec2:DeleteRouteTable",
    "ec2:CreateRoute",
    "ec2:DeleteRoute",
    "ec2:ReplaceRoute",
    "ec2:AssociateRouteTable",
    "ec2:DisassociateRouteTable",
    "ec2:CreateSecurityGroup",
    "ec2:DeleteSecurityGroup",
    "ec2:AuthorizeSecurityGroupIngress",
    "ec2:AuthorizeSecurityGroupEgress",
    "ec2:RevokeSecurityGroupIngress",
    "ec2:RevokeSecurityGroupEgress",
    "ec2:ModifySecurityGroupRules",
    "ec2:UpdateSecurityGroupRuleDescriptionsIngress",
    "ec2:UpdateSecurityGroupRuleDescriptionsEgress",
    "ec2:RunInstances",
    "ec2:TerminateInstances",
    "ec2:StartInstances",
    "ec2:StopInstances",
    "ec2:ModifyInstanceAttribute",
    "ec2:ModifyInstanceMetadataOptions",
    "ec2:ModifyInstanceCreditSpecification",
    "ec2:AssociateIamInstanceProfile",
    "ec2:ReplaceIamInstanceProfileAssociation",
    "ec2:DisassociateIamInstanceProfile",
    "ec2:CreateTags",
    "ec2:DeleteTags",
  ]
}

data "aws_iam_policy_document" "terraform_stg_assume" {
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

    # Environment「staging」を指定したジョブだけ（ブランチではなく Environment で絞る。Environment で実行できるのは main だけ）
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${local.github_repository}:environment:staging"]
    }
  }
}

resource "aws_iam_role" "terraform_stg" {
  name                 = "github-terraform-stg"
  assume_role_policy   = data.aws_iam_policy_document.terraform_stg_assume.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "terraform_stg" {
  # --- tfstate：stg/ のキーだけ（prod/・shared/ の状態は読めない） ---

  # キーの名前の一覧だけ（中身は読めない）。S3 のバックエンドが init のときにワークスペースを探すため
  statement {
    sid       = "TfstateList"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${local.tfstate_bucket}"]
  }

  statement {
    sid       = "TfstateStg"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::${local.tfstate_bucket}/stg/*"]
  }

  # --- EC2 とネットワーク ---

  statement {
    sid       = "Ec2Read"
    actions   = ["ec2:Describe*"]
    resources = ["*"]
  }

  statement {
    sid       = "Ec2Write"
    actions   = local.stg_ec2_write_actions
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "aws:RequestedRegion"
      values   = [local.region]
    }
  }

  # Env タグが stg 以外（本番など）のリソースは、変えられない・消せない・その中に作れない。
  # 対象の VPC・サブネット・セキュリティグループ・インスタンスのどれかに Env=prod があれば拒否される
  # （本番の VPC にサブネットを作る、本番の EC2 のタグを stg に書き換える、なども含む）。Env タグの無いもの（AMI・ENI など）は対象外
  statement {
    sid       = "DenyNonStgResources"
    effect    = "Deny"
    actions   = local.stg_ec2_write_actions
    resources = ["*"]

    condition {
      test     = "Null"
      variable = "ec2:ResourceTag/Env"
      values   = ["false"]
    }

    condition {
      test     = "StringNotEquals"
      variable = "ec2:ResourceTag/Env"
      values   = ["stg"]
    }
  }

  # stg 以外の Env タグを付けて作らない（Env=prod の EC2 を作ると、本番のデプロイの対象を取り違えさせられるため）
  statement {
    sid       = "DenyNonStgRequestTag"
    effect    = "Deny"
    actions   = local.stg_ec2_write_actions
    resources = ["*"]

    condition {
      test     = "Null"
      variable = "aws:RequestTag/Env"
      values   = ["false"]
    }

    condition {
      test     = "StringNotEquals"
      variable = "aws:RequestTag/Env"
      values   = ["stg"]
    }
  }

  # EC2 の AMI（Amazon Linux 2023 の最新）を、AWS の公開パラメーターから引く
  statement {
    sid       = "ReadAmiParameter"
    actions   = ["ssm:GetParameter", "ssm:GetParameters"]
    resources = ["arn:aws:ssm:${local.region}::parameter/aws/service/ami-amazon-linux-latest/*"]
  }

  # --- IAM：portfolio-stg-* のロールとインスタンスプロファイルだけ ---

  statement {
    sid = "IamRoleManage"
    actions = [
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
      "iam:ListInstanceProfilesForRole",
      "iam:ListRoleTags",
      "iam:TagRole",
      "iam:UntagRole",
      "iam:DeleteRole",
    ]
    resources = ["arn:aws:iam::${local.account_id}:role/${local.stg_name_prefix}-*"]
  }

  # 作る・権限を足すときは、権限の上限（portfolio-stg-boundary）が付いていることを条件にする。
  # これで、ワークフローを書き換えられても、上限を超える（本番に届く）ロールは作れない
  statement {
    sid = "IamRoleWriteWithBoundary"
    actions = [
      "iam:CreateRole",
      "iam:PutRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:PutRolePermissionsBoundary",
    ]
    resources = ["arn:aws:iam::${local.account_id}:role/${local.stg_name_prefix}-*"]

    condition {
      test     = "StringEquals"
      variable = "iam:PermissionsBoundary"
      values   = [aws_iam_policy.stg_boundary.arn]
    }
  }

  # 付けられる管理ポリシーは、Session Manager と SSM Run Command のためのものだけ
  statement {
    sid       = "IamRoleAttachWithBoundary"
    actions   = ["iam:AttachRolePolicy", "iam:DetachRolePolicy"]
    resources = ["arn:aws:iam::${local.account_id}:role/${local.stg_name_prefix}-*"]

    condition {
      test     = "StringEquals"
      variable = "iam:PermissionsBoundary"
      values   = [aws_iam_policy.stg_boundary.arn]
    }

    condition {
      test     = "ArnEquals"
      variable = "iam:PolicyARN"
      values   = ["arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"]
    }
  }

  statement {
    sid = "IamInstanceProfile"
    actions = [
      "iam:CreateInstanceProfile",
      "iam:DeleteInstanceProfile",
      "iam:GetInstanceProfile",
      "iam:AddRoleToInstanceProfile",
      "iam:RemoveRoleFromInstanceProfile",
      "iam:TagInstanceProfile",
      "iam:UntagInstanceProfile",
      "iam:ListInstanceProfileTags",
    ]
    resources = ["arn:aws:iam::${local.account_id}:instance-profile/${local.stg_name_prefix}-*"]
  }

  # 渡せるのは、ステージングのインスタンスロールだけ。インスタンスプロファイルに入れるとき（AddRoleToInstanceProfile）にも
  # PassRole が要り、そのときは iam:PassedToService で絞れないので、条件は付けない。
  # このロールにも権限の上限が付いているので、どこに渡しても本番には届かない
  statement {
    sid       = "PassStgAppRole"
    actions   = ["iam:PassRole"]
    resources = ["arn:aws:iam::${local.account_id}:role/${local.stg_name_prefix}-app"]
  }

  # --- S3：stg の画像バケットだけ（作る・設定する・中身ごと消す） ---

  statement {
    sid     = "StgImageBucket"
    actions = ["s3:*"]
    resources = [
      "arn:aws:s3:::${local.stg_image_bucket}",
      "arn:aws:s3:::${local.stg_image_bucket}/*",
    ]
  }

  # --- Parameter Store：秘密でない設定（/portfolio/stg/config/）だけ。秘密（/portfolio/stg/APP_KEY など）は読めない ---

  statement {
    sid = "StgConfigParameters"
    actions = [
      "ssm:PutParameter",
      "ssm:DeleteParameter",
      "ssm:DeleteParameters",
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:AddTagsToResource",
      "ssm:RemoveTagsFromResource",
      "ssm:ListTagsForResource",
    ]
    resources = ["${local.stg_parameter_arn}/config/*"]
  }

  # 名前や型などの属性だけ（値は返さない）
  statement {
    sid       = "DescribeParameters"
    actions   = ["ssm:DescribeParameters"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "terraform_stg" {
  name   = "github-terraform-stg"
  role   = aws_iam_role.terraform_stg.id
  policy = data.aws_iam_policy_document.terraform_stg.json
}

# --- ステージングのロールの権限の上限（permissions boundary） ---
# github-terraform-stg が作るロール（portfolio-stg-app）に必ず付けさせる。ロールの実際の権限は、
# ロールのポリシーとこの上限の両方で許可されたものだけになる。ステージングの EC2 が必要とするもの（modules/app の iam.tf）を、
# stg のリソースだけに絞って並べる。modules/app のインスタンスロールに権限を足したときは、ここにも足す

data "aws_iam_policy_document" "stg_boundary" {
  statement {
    sid = "ImageBucket"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      "arn:aws:s3:::${local.stg_image_bucket}",
      "arn:aws:s3:::${local.stg_image_bucket}/*",
    ]
  }

  statement {
    sid       = "DeployBundles"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.deploy.arn}/bundles/develop-*"]
  }

  statement {
    sid       = "StgParameters"
    actions   = ["ssm:GetParametersByPath", "ssm:GetParameters", "ssm:GetParameter"]
    resources = [local.stg_parameter_arn, "${local.stg_parameter_arn}/*"]
  }

  # SecureString（既定の鍵 aws/ssm）を Parameter Store 経由で復号する
  statement {
    sid       = "DecryptViaSsm"
    actions   = ["kms:Decrypt"]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${local.region}.amazonaws.com"]
    }
  }

  # AmazonSSMManagedInstanceCore のうち、パラメーターの読み取り以外（Session Manager と Run Command を受け取るため）
  statement {
    sid = "SsmAgent"
    actions = [
      "ssm:DescribeAssociation",
      "ssm:GetDeployablePatchSnapshotForInstance",
      "ssm:GetDocument",
      "ssm:DescribeDocument",
      "ssm:GetManifest",
      "ssm:ListAssociations",
      "ssm:ListInstanceAssociations",
      "ssm:PutInventory",
      "ssm:PutComplianceItems",
      "ssm:PutConfigurePackageResult",
      "ssm:UpdateAssociationStatus",
      "ssm:UpdateInstanceAssociationStatus",
      "ssm:UpdateInstanceInformation",
      "ssmmessages:CreateControlChannel",
      "ssmmessages:CreateDataChannel",
      "ssmmessages:OpenControlChannel",
      "ssmmessages:OpenDataChannel",
      "ec2messages:AcknowledgeMessage",
      "ec2messages:DeleteMessage",
      "ec2messages:FailMessage",
      "ec2messages:GetEndpoint",
      "ec2messages:GetMessages",
      "ec2messages:SendReply",
    ]
    resources = ["*"]
  }

  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid       = "EcrPull"
    actions   = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"]
    resources = [aws_ecr_repository.app.arn]
  }

  statement {
    sid       = "PutStgMetrics"
    actions   = ["cloudwatch:PutMetricData"]
    resources = ["*"]

    condition {
      test     = "StringLike"
      variable = "cloudwatch:namespace"
      values   = ["Portfolio/stg/*"]
    }
  }

  statement {
    sid       = "SendMail"
    actions   = ["ses:SendRawEmail"]
    resources = ["arn:aws:ses:${local.region}:${local.account_id}:identity/*"]

    condition {
      test     = "StringLike"
      variable = "ses:FromAddress"
      values   = ["no-reply@takuosblog.com", "*<no-reply@takuosblog.com>"]
    }
  }
}

resource "aws_iam_policy" "stg_boundary" {
  name        = "portfolio-stg-boundary"
  description = "Permissions boundary for roles created by github-terraform-stg (staging only)."
  policy      = data.aws_iam_policy_document.stg_boundary.json
}
