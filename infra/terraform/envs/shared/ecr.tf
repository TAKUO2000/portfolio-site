# バックエンドのイメージ。本番とステージングで共有し、`<ブランチ>-<コミットの SHA>` をタグにする
# （main は `main-<SHA>`、develop は `develop-<SHA>`）。保持のルールを接頭辞ごとに分けるため
resource "aws_ecr_repository" "app" {
  name = "portfolio/app"

  # 同じタグを別のイメージで上書きできないようにする（ロールバック先が変わらないように）
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  # タグなしのイメージは、ビルドのたびに出る中間のものなので早めに消す。
  # buildx の provenance（attestation）を付けるとタグなしのマニフェストができ、これで消えてしまうので、
  # デプロイのワークフローでは provenance: false でビルドする。
  # 接頭辞ごとに数えるので、develop への push が続いても本番（main-）のイメージは消えない。
  # どちらの接頭辞も付いていないタグ（手で push したものなど）は、自動では消えない
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
        description  = "本番（main-）はロールバック用に直近の20個だけ残す"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["main-"]
          countType     = "imageCountMoreThan"
          countNumber   = 20
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 3
        description  = "ステージング（develop-）は直近の10個だけ残す"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["develop-"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = { type = "expire" }
      },
    ]
  })
}
