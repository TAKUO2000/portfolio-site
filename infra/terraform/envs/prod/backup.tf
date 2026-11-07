# 本番のバックアップ（infra/design.md の「バックアップと監視」）
#   - データ用 EBS：DLM で日次スナップショットを7世代
#   - MySQL：EC2 の systemd timer（infra/ec2/mysqldump.sh）が毎日 mysqldump を取り、このバケットに置く

locals {
  backup_bucket_name = "takuosblog-backup-prod"
}

# --- mysqldump の置き場 ---

resource "aws_s3_bucket" "backup" {
  bucket = local.backup_bucket_name
}

resource "aws_s3_bucket_public_access_block" "backup" {
  bucket = aws_s3_bucket.backup.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# EC2 には書き込み（s3:PutObject）だけを許すが、同じキーへの上書きはできてしまう。
# バージョニングで前の版を残し、EC2 が乗っ取られて上書きされても、元のバックアップを取り出せるようにする
resource "aws_s3_bucket_versioning" "backup" {
  bucket = aws_s3_bucket.backup.id

  versioning_configuration {
    status = "Enabled"
  }
}

# 削除は EC2 に許さず、ライフサイクルに任せる。前の版も30日で消す
resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    id     = "expire-after-30-days"
    status = "Enabled"

    filter {}

    expiration {
      days = 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }

  rule {
    id     = "remove-expired-delete-markers"
    status = "Enabled"

    filter {}

    expiration {
      expired_object_delete_marker = true
    }
  }

  # バージョニングを有効にしてから、ライフサイクルを付ける
  depends_on = [aws_s3_bucket_versioning.backup]
}

data "aws_iam_policy_document" "backup_bucket" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.backup.arn, "${aws_s3_bucket.backup.arn}/*"]

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

resource "aws_s3_bucket_policy" "backup" {
  bucket = aws_s3_bucket.backup.id
  policy = data.aws_iam_policy_document.backup_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.backup]
}

# 本番の EC2 だけに、mysqldump を置く権限を足す（modules/app はステージングと共有するので、ここで足す）。
# 読む・消す権限は与えない（EC2 が乗っ取られても、バックアップを読まれたり消されたりしないように）
data "aws_iam_policy_document" "app_backup" {
  statement {
    sid       = "PutMysqlDump"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.backup.arn}/mysql/*"]
  }
}

resource "aws_iam_role_policy" "app_backup" {
  name   = "portfolio-prod-app-backup"
  role   = module.app.instance_role_name
  policy = data.aws_iam_policy_document.app_backup.json
}

# --- データ用 EBS のスナップショット（DLM） ---

data "aws_iam_policy_document" "dlm_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["dlm.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "dlm" {
  name               = "portfolio-prod-dlm"
  assume_role_policy = data.aws_iam_policy_document.dlm_assume.json
}

resource "aws_iam_role_policy_attachment" "dlm" {
  role       = aws_iam_role.dlm.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

# mysqldump（UTC の 18時台）のあと、UTC の 19時から日次で取り、7世代残す。
# 対象はデータ用 EBS のタグで決める（ルートの EBS は作り直せばよいので対象にしない）
resource "aws_dlm_lifecycle_policy" "data" {
  description        = "Daily snapshots of the prod data volume - keep 7"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]
    target_tags = {
      Name = "portfolio-prod-data"
    }

    schedule {
      name      = "daily"
      copy_tags = true

      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["19:00"]
      }

      retain_rule {
        count = 7
      }
    }
  }
}
