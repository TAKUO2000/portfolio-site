output "tfstate_bucket" {
  description = "各環境の backend \"s3\" の bucket に指定するバケット名"
  value       = aws_s3_bucket.tfstate.id
}
