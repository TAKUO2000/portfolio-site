# NAT Gateway は作らない（月 $45 前後かかるため）。EC2 はパブリックサブネットに置き、SG で 80 / 443 だけを開ける
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "portfolio-${var.env}" }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = { Name = "portfolio-${var.env}" }
}

resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.public_subnet_cidr
  availability_zone = var.availability_zone

  # ステージングは Elastic IP を使わず、自動で割り当てられるパブリック IP で公開する
  map_public_ip_on_launch = true

  tags = { Name = "portfolio-${var.env}-public" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = { Name = "portfolio-${var.env}-public" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# IPv4 だけ。VPC に IPv6 を割り当てていないので、::/0 の許可は置かない
resource "aws_security_group" "app" {
  name        = "portfolio-${var.env}-app"
  description = "HTTP and HTTPS from the internet. No SSH (use Session Manager)."
  vpc_id      = aws_vpc.this.id

  tags = { Name = "portfolio-${var.env}-app" }
}

resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.app.id
  description       = "HTTP (ACME challenge and redirect to HTTPS)"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.app.id
  description       = "HTTPS"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

# ECR・Parameter Store・SES・S3・Docker Hub・dnf などへ出ていく
resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.app.id
  description       = "All outbound"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
