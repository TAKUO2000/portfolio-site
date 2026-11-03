# Amazon Linux 2023（arm64）の最新の AMI。作ったあとは ignore_changes で固定し、新しくするときは意図して作り直す
data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

resource "aws_instance" "app" {
  ami                         = data.aws_ssm_parameter.al2023_arm64.value
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.app.id]
  iam_instance_profile        = aws_iam_instance_profile.app.name
  associate_public_ip_address = true

  # CPU クレジットを使い切ったら遅くなる代わりに、追加の課金をしない（infra/design.md の「CPU クレジットと費用の監視」）
  credit_specification {
    cpu_credits = "standard"
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required" # IMDSv2 だけ
    # 既定の 1 だと、Docker のコンテナ（bridge ネットワーク）からインスタンスロールの認証情報を取れない（#109）
    http_put_response_hop_limit = 2
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_size
    encrypted   = true
  }

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    env             = var.env
    extra_user_data = var.extra_user_data
    render_env      = file("${path.module}/files/render-env.sh")
  })

  tags = {
    Name = "portfolio-${var.env}"
    # デプロイ用のロールが、このタグで SSM Run Command の対象を絞る（infra/design.md の「GitHub Actions のロール」）
    Env = var.env
  }

  # user_data は起動してすぐ dnf や GitHub からダウンロードするので、インターネットへの経路を先に作る
  depends_on = [aws_route_table_association.public]

  lifecycle {
    # AMI や user_data が変わるたびに作り直されないようにする（infra/design.md の「データの置き場所」）
    ignore_changes = [ami, user_data]
  }
}
