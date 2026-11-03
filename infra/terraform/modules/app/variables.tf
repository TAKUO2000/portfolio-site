variable "env" {
  description = "環境の名前。IAM の ARN、Parameter Store のパス、タグに使う"
  type        = string

  validation {
    condition     = contains(["prod", "stg"], var.env)
    error_message = "env は prod か stg を指定してください。"
  }
}

variable "vpc_cidr" {
  description = "VPC の CIDR（本番 10.0.0.0/16、ステージング 10.1.0.0/16）"
  type        = string
}

variable "public_subnet_cidr" {
  description = "パブリックサブネットの CIDR"
  type        = string
}

variable "availability_zone" {
  description = "サブネット・EC2 を置く AZ。データ用 EBS も同じ AZ に作る"
  type        = string
}

variable "instance_type" {
  description = "EC2 のインスタンスタイプ"
  type        = string
  default     = "t4g.micro"
}

variable "root_volume_size" {
  description = "ルートの EBS の大きさ（GB）。OS と Docker のイメージを置く"
  type        = number
  default     = 12
}

variable "image_bucket_name" {
  description = "画像バケットの名前。記事の画像の URL に入るので、作ったあとに変えない（docs/image-management.md）"
  type        = string
}

variable "image_bucket_force_destroy" {
  description = "中身が残っていても画像バケットを消せるようにするか（ステージングだけ true）"
  type        = bool
  default     = false
}

variable "frontend_origin" {
  description = "ブラウザから画像バケットへ PUT するフロントエンドのオリジン（CORS）"
  type        = string
}

variable "ecr_repository_arn" {
  description = "pull を許可する ECR のリポジトリ（envs/shared の portfolio/app）"
  type        = string
}

variable "mail_from_address" {
  description = "SES の送信を許可する送信元のアドレス（Laravel の MAIL_FROM_ADDRESS）"
  type        = string
}

variable "compose_config" {
  description = "EC2 の .env（compose の変数の置き換え）に書く、秘密でない値。Parameter Store の /portfolio/<env>/config/compose/ に置く"
  type        = map(string)
}

variable "app_config" {
  description = "EC2 の .env.production（Laravel の設定）に書く、秘密でない値。Parameter Store の /portfolio/<env>/config/app/ に置く"
  type        = map(string)

  validation {
    # render-env.sh は値を単一引用符で囲んで書く。Parameter Store は空の値を置けないので、空にしたい変数は書かない
    condition     = alltrue([for v in values(merge(var.app_config, var.compose_config)) : v != "" && !strcontains(v, "'")])
    error_message = "app_config と compose_config の値は、空にせず、単一引用符（'）を含めないでください。"
  }
}

variable "extra_user_data" {
  description = "user_data の途中（/data を作る前）に足す処理。本番はデータ用 EBS のマウントに使う"
  type        = string
  default     = ""
}
