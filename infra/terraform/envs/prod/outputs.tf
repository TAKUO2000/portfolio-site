output "instance_id" {
  description = "EC2 のインスタンス ID。aws ssm start-session --target <これ> で接続する"
  value       = module.app.instance_id
}

output "public_ip" {
  description = "Elastic IP（api.takuosblog.com の向き先）"
  value       = aws_eip.app.public_ip
}

output "image_bucket_name" {
  description = "画像バケットの名前"
  value       = module.app.image_bucket_name
}

output "image_bucket_host" {
  description = "画像バケットのホスト名（Vercel の S3_IMAGE_HOST）"
  value       = module.app.image_bucket_host
}
