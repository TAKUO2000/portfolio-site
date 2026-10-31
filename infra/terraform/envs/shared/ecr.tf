# バックエンドのイメージ。本番とステージングで共有し、コミットの SHA をタグにする
resource "aws_ecr_repository" "app" {
  name = "portfolio/app"

  # 同じ SHA のタグを別のイメージで上書きできないようにする（ロールバック先が変わらないように）
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  # タグなしのイメージは、ビルドのたびに出る中間のものなので早めに消す。
  # buildx の provenance（attestation）を付けるとタグなしのマニフェストができ、これで消えてしまうので、
  # デプロイのワークフローでは provenance: false でビルドする
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "タグなしのイメージを1日で消す"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "ロールバック用に直近の20個だけ残す"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 20
        }
        action = { type = "expire" }
      },
    ]
  })
}
