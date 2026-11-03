# 記事の画像。images/* だけを公開し、tmp/*（保存前の画像）は公開しない（infra/design.md の「S3（画像）」）
resource "aws_s3_bucket" "images" {
  bucket        = var.image_bucket_name
  force_destroy = var.image_bucket_force_destroy
}

# バケットポリシーでの公開だけを許し、ACL での公開は塞ぐ
resource "aws_s3_bucket_public_access_block" "images" {
  bucket = aws_s3_bucket.images.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_ownership_controls" "images" {
  bucket = aws_s3_bucket.images.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

data "aws_iam_policy_document" "images_bucket" {
  statement {
    sid       = "PublicReadImages"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.images.arn}/images/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }

  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.images.arn, "${aws_s3_bucket.images.arn}/*"]

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

resource "aws_s3_bucket_policy" "images" {
  bucket = aws_s3_bucket.images.id
  policy = data.aws_iam_policy_document.images_bucket.json

  # Block Public Access を緩めてからでないと、公開のポリシーを付けられない
  depends_on = [aws_s3_bucket_public_access_block.images]
}

# ブラウザが署名付き URL へ直接 PUT する。付けるヘッダーは Content-Type だけ（nextjs-front/app/lib/uploadImage.ts）
resource "aws_s3_bucket_cors_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  cors_rule {
    allowed_origins = [var.frontend_origin]
    allowed_methods = ["PUT", "GET"]
    allowed_headers = ["Content-Type"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  # 記事に保存されなかった画像（docs/image-management.md）
  rule {
    id     = "expire-tmp"
    status = "Enabled"

    filter {
      prefix = "tmp/"
    }

    expiration {
      days = 1
    }
  }

  rule {
    id     = "abort-incomplete-multipart-upload"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}
