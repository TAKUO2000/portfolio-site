output "instance_id" {
  description = "EC2 のインスタンス ID（Session Manager の接続先）"
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "自動で割り当てられたパブリック IP（本番は Elastic IP を付けると変わる）"
  value       = aws_instance.app.public_ip
}

output "image_bucket_name" {
  description = "画像バケットの名前（Laravel の AWS_BUCKET）"
  value       = aws_s3_bucket.images.bucket
}

output "image_bucket_host" {
  description = "画像バケットのホスト名（Vercel の S3_IMAGE_HOST）"
  value       = aws_s3_bucket.images.bucket_regional_domain_name
}

output "instance_role_name" {
  description = "EC2 のインスタンスロール（本番のバックアップ用バケットへの権限などを足すとき）"
  value       = aws_iam_role.app.name
}
