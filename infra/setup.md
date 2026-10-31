# インフラの構築手順

`infra/design.md` の構成を、AWS アカウントに最初に作るときの手順です。手作業で行うことと、手元から `terraform apply` することをまとめています。

`envs/shared` と `envs/prod` は GitHub Actions からは apply せず、この手順のとおりに手元から MFA 付きのユーザーで apply します（[GitHub Actions のロール](design.md#github-actions-のロール)）。

## 目次

1. [前提](#前提)
2. [管理用のユーザーを作る](#管理用のユーザーを作る)
3. [Terraform を実行するときの認証](#terraform-を実行するときの認証)
4. [tfstate のバケットを作る（bootstrap）](#tfstate-のバケットを作るbootstrap)
5. [共有のリソースを作る（envs/shared）](#共有のリソースを作るenvsshared)
6. [秘密情報を Parameter Store に入れる](#秘密情報を-parameter-store-に入れる)

---

## 前提

| ツール | バージョン |
| --- | --- |
| Terraform | 1.11 以上（S3 のバックエンドのロック `use_lockfile` を使うため） |
| AWS CLI | v2.32 以上（`aws login` を使うため） |

リージョンはすべて東京（`ap-northeast-1`）です。

---

## 管理用のユーザーを作る

このプロジェクト専用の AWS アカウントを使います。ほかのプロジェクトと同じアカウントには置きません（Budgets がアカウント全体の費用を見るため。被害の範囲を分けるため）。

アカウントは従来の登録方法（`https://signin.aws.amazon.com/signup?request_type=register`）で作ります。新しい登録方法（Google などのログインで作る「プロジェクト」）は、リージョンが住所の国で決まり（日本はシドニー）、ルートユーザーと IAM ユーザーのコンソールへのログインも無いため使いません。

ルートユーザーは日常の作業に使わず、この手順のためだけに使います。

### ルートユーザーで行うこと

1. ルートユーザーに MFA を設定する（まだなら）
2. 「アカウント」の画面で「IAM ユーザーおよびロールによる請求情報へのアクセス」を有効にする
   - 有効にしないと、管理用のユーザーで AWS Budgets と Cost Explorer を使えない（`envs/shared` の apply が失敗する）

### 管理用の IAM ユーザーを作る

1. IAM ユーザー `portfolio-admin` を作り、`AdministratorAccess` を付ける。コンソールへのアクセスを有効にする
2. `portfolio-admin` でサインインし、MFA を設定する
3. **アクセスキーは作らない**。手元の CLI は、次の `aws login` でコンソールのサインイン（MFA を含む）から一時的な認証情報を受け取る

---

## Terraform を実行するときの認証

```bash
# ブラウザが開き、portfolio-admin でサインインする（MFA を求められる）
# 初回はリージョンを聞かれるので ap-northeast-1 と答える
aws login --profile portfolio

# 確かめる
aws sts get-caller-identity --profile portfolio
```

Terraform にこのプロファイルを使わせます。

```bash
export AWS_PROFILE=portfolio
```

Terraform の AWS プロバイダーが `aws login` の認証情報を読めずにエラーになる場合は、CLI から一時的な認証情報を環境変数に書き出して渡します。

```bash
eval "$(aws configure export-credentials --profile portfolio --format env)"
```

認証情報は一定時間で切れます。切れたら `aws login` からやり直します。

---

## tfstate のバケットを作る（bootstrap）

Terraform の状態（tfstate）を置く S3 バケット `takuosblog-tfstate` を、`infra/terraform/bootstrap` で作ります。ほかの環境（`shared`・`prod`・`stg`）は、このバケットに状態を置きます。

このバケット自体の状態もこのバケットに置きたいのですが、作る前はバケットがありません。そのため、初回だけ状態をローカルに置いて作り、作ったあとでバケットへ移します。

```bash
cd infra/terraform/bootstrap

cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars の aws_account_id に、このアカウントの ID を入れる（コミットしない）

# 1. 初回だけ、状態をローカルに置く（*_override.tf は .gitignore 済み）
cat > backend_override.tf <<'EOF'
terraform {
  backend "local" {}
}
EOF

terraform init
terraform apply

# 2. バケットができたら、状態をバケットへ移す
rm backend_override.tf
terraform init -migrate-state   # 「copy existing state」に yes と答える
rm terraform.tfstate terraform.tfstate.backup
```

- `aws_account_id` と違うアカウントの認証情報で実行すると、プロバイダーの `allowed_account_ids` で止まります
- バケット名は世界で一意である必要があります。`takuosblog-tfstate` が使われていて作れなかったら、`bootstrap/` と各環境の `versions.tf` の `bucket` をまとめて書き換えます
- バケットには `prevent_destroy` を付けています。消すときは、先にこの行を外します

### バケットの設定

| 設定 | 内容 |
| --- | --- |
| バージョニング | 有効。状態を壊したときに前の版に戻せる。上書きされた版は90日で消す |
| 暗号化 | SSE-S3（AES256）。KMS のキーは月額がかかるので使わない。読める相手は IAM のポリシーで絞る |
| パブリックアクセス | すべてブロックする |
| オブジェクトの所有者 | `BucketOwnerEnforced`（ACL を使わない） |
| バケットポリシー | HTTPS 以外での読み書きを拒否する |
| ロック | `use_lockfile = true`。同時に apply しないよう、状態の隣に `.tflock` を置く（DynamoDB は使わない） |

GitHub Actions のロールに、自分の環境のキー（`stg/` など）だけを読み書きさせる設定は、ロールを作るとき（#115・#116）に行います。

---

## 共有のリソースを作る（envs/shared）

本番とステージングで共有し、ずっと残すリソースを作ります。

| リソース | 内容 |
| --- | --- |
| ECR | リポジトリ `portfolio/app`。タグの上書きを禁止し、プッシュ時にスキャンする。タグなしは1日、それ以外は直近の20個だけ残す |
| GitHub の OIDC プロバイダー | GitHub Actions がアクセスキーなしでロールを引き受けるため。ロールは #115・#116 で作る |
| AWS Budgets | 月 $20。実績が 80%、月末の予測が 100% を超えたらメールで知らせる。クレジットを差し引く前の金額で比べる |

```bash
cd infra/terraform/envs/shared

cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars の aws_account_id と alert_email を入れる（コミットしない）

terraform init
terraform plan
terraform apply
```

apply のあとに、Budgets の通知先のアドレスに AWS から確認のメールが届いていないか確かめます。

---

## 秘密情報を Parameter Store に入れる

秘密情報は SSM Parameter Store に SecureString で置きます。**Terraform の `aws_ssm_parameter` では作りません**。Terraform は作ったリソースの属性を tfstate に平文で残すため、変数に `sensitive = true` を付けても、値は状態に入ります。

Terraform 側では、インスタンスプロファイルのポリシーで `/portfolio/<env>/*` の ARN を指定するだけにします（#112）。

### 入れるもの

| 名前 | 作り方 |
| --- | --- |
| `/portfolio/prod/APP_KEY` | `base64:` ＋ 32バイトの乱数を base64 にしたもの（`php artisan key:generate --show` と同じ形） |
| `/portfolio/prod/DB_PASSWORD` | 32バイトの乱数を16進数にしたもの |
| `/portfolio/prod/DB_ROOT_PASSWORD` | 同上 |
| `/portfolio/prod/FRONTEND_REVALIDATE_SECRET` | 同上。Vercel の `REVALIDATE_SECRET` にも同じ値を入れる |

DB のパスワードを16進数にするのは、`.env` や compose で特別な意味を持つ記号（`$`・`#`・引用符など）を含めないためです。

ステージングは `/portfolio/stg/*` に同じ名前で、本番とは別の値を入れます（#116）。ステージングを destroy しても消えないよう、Terraform の管理の外に置きます。

### 入れ方

値を画面に出さず、シェルの履歴にも残さないよう、乱数をその場で作ってそのまま渡します（履歴に残るのは `$(...)` の式だけです）。

```bash
export AWS_PROFILE=portfolio

aws ssm put-parameter --name /portfolio/prod/APP_KEY --type SecureString \
  --value "base64:$(openssl rand -base64 32)"

aws ssm put-parameter --name /portfolio/prod/DB_PASSWORD --type SecureString \
  --value "$(openssl rand -hex 32)"

aws ssm put-parameter --name /portfolio/prod/DB_ROOT_PASSWORD --type SecureString \
  --value "$(openssl rand -hex 32)"

aws ssm put-parameter --name /portfolio/prod/FRONTEND_REVALIDATE_SECRET --type SecureString \
  --value "$(openssl rand -hex 32)"
```

決まった値（外のサービスで発行された値など）を入れるときは、入力を画面に出さずに読み込んでから渡します。

```bash
read -rs VALUE   # 値を貼り付けて Enter（画面には出ない）
aws ssm put-parameter --name /portfolio/prod/<名前> --type SecureString --value "$VALUE" --overwrite
unset VALUE
```

- 値を見るときは `aws ssm get-parameter --name <名前> --with-decryption --query Parameter.Value --output text`（Vercel に `FRONTEND_REVALIDATE_SECRET` を入れるときなど）
- 値を替えるときは `--overwrite` を付けます。替えたあとは、デプロイ（`.env` の作り直しとコンテナの再起動）をしないと反映されません
- `APP_KEY` を替えると、セッションと暗号化した値がすべて無効になります。`DB_PASSWORD` は、MySQL 側のユーザーのパスワードも合わせて替えます（`DB_ROOT_PASSWORD` と `DB_PASSWORD` は、mysql コンテナがデータを初めて作るときにだけ使われます）

### 確かめる

```bash
# 名前の一覧（値は出ない）
aws ssm get-parameters-by-path --path /portfolio/prod/ --query 'Parameters[].[Name,Type]' --output table

# 状態に秘密が入っていないこと（何も出なければよい）
cd infra/terraform/envs/shared
terraform state pull | grep -E 'APP_KEY|DB_PASSWORD|DB_ROOT_PASSWORD|REVALIDATE_SECRET'
```
