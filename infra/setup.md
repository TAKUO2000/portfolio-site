# インフラの構築手順

`infra/design.md` の構成を、AWS アカウントに最初に作るときの手順です。手作業で行うことと、手元から `terraform apply` することをまとめています。

`envs/shared` と `envs/prod` は GitHub Actions からは apply せず、この手順のとおりに手元から MFA 付きのユーザーで apply します（[GitHub Actions のロール](design.md#github-actions-のロール)）。

## 目次

1. [前提](#前提)
2. [管理用のユーザーを作る](#管理用のユーザーを作る)
3. [Terraform を実行するときの認証](#terraform-を実行するときの認証)
4. [tfstate のバケットを作る（bootstrap）](#tfstate-のバケットを作るbootstrap)
5. [Cloudflare の API トークンを作る](#cloudflare-の-api-トークンを作る)
6. [共有のリソースを作る（envs/shared）](#共有のリソースを作るenvsshared)
7. [SES の本番アクセスを申請する](#ses-の本番アクセスを申請する)
8. [秘密情報を Parameter Store に入れる](#秘密情報を-parameter-store-に入れる)
9. [本番のリソースを作る（envs/prod）](#本番のリソースを作るenvsprod)
10. [デプロイする（GitHub Actions）](#デプロイするgithub-actions)
11. [証明書を取る（初回）](#証明書を取る初回)
12. [バックアップと監視を確かめる](#バックアップと監視を確かめる)

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

## Cloudflare の API トークンを作る

DNS は Cloudflare にあるので、Terraform の Cloudflare プロバイダーでレコードを作ります（[DNS（Cloudflare）](design.md#dnscloudflare)）。そのための API トークンを、`takuosblog.com` ゾーンの DNS 編集権限だけに絞って作ります。手元の Terraform と、GitHub Actions（ステージングの DNS レコード）の両方で使います。

1. Cloudflare のダッシュボードの右上の人のアイコン → **My Profile** → **API Tokens** → **Create Token**
   - 「Global API Key」はアカウント全体の権限を持つので使わない
2. テンプレートの **Edit zone DNS** を選び、次のようにする

| 項目 | 設定 |
| --- | --- |
| Token name | `portfolio-terraform-dns` |
| Permissions | `Zone` / `DNS` / `Edit` だけ |
| Zone Resources | `Include` / `Specific zone` / `takuosblog.com` |
| Client IP Address Filtering | 空（GitHub Actions の IP は決まらない） |
| TTL | 空（期限なし。下の「期限を付けない理由」） |

3. **Continue to summary** で「takuosblog.com - DNS:Edit」だけになっているのを確かめ、**Create Token**。トークンは一度しか表示されない

**期限を付けない理由**：期限が切れると、ステージングを作るワークフローが DNS レコードを作れずに途中で失敗し、気づくのが使うときになるためです。その代わりに、漏れたときの被害を次のように絞ります。

- 権限は `takuosblog.com` の DNS の編集だけ。ほかのゾーン、アカウントの設定、Registrar（ドメインの移管）には届かない
- ただし DNS を書き換えられると、`api` の向き先や、メールの認証のレコード（DKIM・SPF・DMARC）を書き換えたなりすましができる。漏れたかもしれないときは、すぐに作り直す
  1. Cloudflare の **API Tokens** で、このトークンの **Roll**（値の作り直し）を押す。古い値はその場で使えなくなる
  2. 新しい値を、上の手順でファイルに保存し直し、`gh secret set` で GitHub のシークレットも上書きする
  3. Cloudflare の **Audit Logs** と DNS レコードの一覧で、身に覚えのない変更がないかを見る

トークンはチャットやリポジトリに貼らず、リポジトリの外のファイルに置きます。手元のターミナルで実行し、トークンを貼り付けて Enter を押します（画面には出ない）。

```bash
mkdir -p ~/.config/portfolio && chmod 700 ~/.config/portfolio
read -rs CF && printf '%s' "$CF" > ~/.config/portfolio/cloudflare-api-token && unset CF
chmod 600 ~/.config/portfolio/cloudflare-api-token

# "status":"active" と出ればよい
curl -s -H "Authorization: Bearer $(cat ~/.config/portfolio/cloudflare-api-token)" \
  https://api.cloudflare.com/client/v4/user/tokens/verify

# GitHub の Environment「staging」を作り、実行できるブランチを main だけにする
gh api -X PUT repos/TAKUO2000/portfolio-site/environments/staging \
  -F 'deployment_branch_policy[protected_branches]=false' \
  -F 'deployment_branch_policy[custom_branch_policies]=true'
gh api -X POST repos/TAKUO2000/portfolio-site/environments/staging/deployment-branch-policies \
  -f name=main -f type=branch

# Environment「staging」のシークレットに登録する（値は画面に出ない）
gh secret set CLOUDFLARE_API_TOKEN --env staging < ~/.config/portfolio/cloudflare-api-token
gh secret list --env staging
```

トークンは、リポジトリ全体のシークレットではなく、**Environment「staging」のシークレット**に置きます。リポジトリのシークレットはどのワークフローのどのジョブからも読めますが、Environment のシークレットは `environment: staging` を指定したジョブ（`envs/stg` を apply / destroy するジョブ）からしか読めません。さらに、Environment で実行できるブランチを `main` に絞るので、ほかのブランチでワークフローを書き換えても、トークンを取り出せません（[GitHub Actions のロール](design.md#github-actions-のロール)の `github-terraform-stg` と同じ Environment）。

ゾーンの ID は、ダッシュボードで `takuosblog.com` を開き、**Overview** の右下の「API」の欄の **Zone ID** を控えます。トークンにゾーンを読む権限を与えないため、Terraform にはドメイン名から引かせず、`terraform.tfvars` で直接渡します。

---

## 共有のリソースを作る（envs/shared）

本番とステージングで共有し、ずっと残すリソースを作ります。

| リソース | 内容 |
| --- | --- |
| ECR | リポジトリ `portfolio/app`。タグの上書きを禁止し、プッシュ時にスキャンする。タグなしは1日で消し、`main-` は直近の20個、`develop-` は直近の10個だけ残す |
| GitHub の OIDC プロバイダー | GitHub Actions がアクセスキーなしでロールを引き受けるため |
| デプロイ用のロール | `github-deploy-prod`（`main` のワークフローだけ）・`github-deploy-stg`（`develop` のワークフローだけ）。[GitHub Actions のロール](design.md#github-actions-のロール) |
| デプロイの部品の置き場 | バケット `takuosblog-deploy`。公開はすべて塞ぎ、HTTPS 以外は拒否する |
| SSM ドキュメント | `portfolio-deploy`。EC2 で決まったデプロイの手順だけを実行する（[デプロイ](design.md#デプロイ)） |
| AWS Budgets | 月 $20。実績が 80%、月末の予測が 100% を超えたらメールで知らせる。クレジットを差し引く前の金額で比べる |
| SES | 送信元ドメイン `takuosblog.com` の ID（Easy DKIM）と、MAIL FROM の `mail.takuosblog.com` |
| Cloudflare の DNS レコード | DKIM の CNAME 3つ、`mail` の MX と SPF、`_dmarc` の TXT（[メール送信（SES）](design.md#メール送信ses)） |

```bash
cd infra/terraform/envs/shared

cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars の aws_account_id、alert_email、cloudflare_zone_id、dmarc_report_email を入れる（コミットしない）

# Cloudflare のトークンは環境変数で渡す
export CLOUDFLARE_API_TOKEN="$(cat ~/.config/portfolio/cloudflare-api-token)"

terraform init
terraform plan
terraform apply
```

apply のあとに、Budgets の2つの通知に通知先のアドレスが登録されているか確かめます。通知先にメールアドレスを直接指定した場合、AWS から確認のメールは届きません（届くのは予算を超えたときだけ）。

```bash
for n in "NotificationType=ACTUAL,ComparisonOperator=GREATER_THAN,Threshold=80,ThresholdType=PERCENTAGE" \
         "NotificationType=FORECASTED,ComparisonOperator=GREATER_THAN,Threshold=100,ThresholdType=PERCENTAGE"; do
  aws budgets describe-subscribers-for-notification \
    --account-id "$(aws sts get-caller-identity --query Account --output text)" \
    --budget-name portfolio-monthly --notification "$n" \
    --query 'Subscribers[].Address' --output text
done
```

コンソールでは「請求とコスト管理」→「予算」→ `portfolio-monthly` のアラートの欄で見られます。

### SES の ID を確かめる

SES が DNS を確かめると、ID が検証済みになります。数分から、長いと72時間かかります。

```bash
# verified が true、dkim と mailfrom が SUCCESS になればよい
aws sesv2 get-email-identity --email-identity takuosblog.com \
  --query '{verified:VerifiedForSendingStatus,dkim:DkimAttributes.Status,mailfrom:MailFromAttributes.MailFromDomainStatus}'

dig +short TXT _dmarc.takuosblog.com
dig +short MX mail.takuosblog.com
dig +short TXT mail.takuosblog.com
```

コンソールでは「Amazon SES」→「ID」→ `takuosblog.com` で、ID が「検証済み」、DKIM と MAIL FROM が「成功」になっているのを見られます。

---

## SES の本番アクセスを申請する

新しいアカウントの SES はサンドボックスの中にあり、検証済みのアドレスにしか送れません（1日200通、毎秒1通）。本番アクセスを申請して外してもらいます。**AWS の担当者の審査に時間がかかるので、ID を作ったらすぐに出します。** 説明が空のまま出すと、すぐに却下されます。

用途の説明には、どんなメールを、誰に、どれくらい送るかと、バウンスと苦情の扱いを書きます。英語のほうが審査が早く進みやすいです。

```text
takuosblog.com is my personal blog and portfolio site (Laravel API + Next.js).
The site is under construction and not yet public; the source code is public at
https://github.com/TAKUO2000/portfolio-site.

We will send only transactional emails triggered by a user's own action:
- email address verification when a user registers
- password reset links when a user requests one
We never send marketing or bulk email, and we never send to purchased or third-party lists.
Every recipient is a user who entered their own address on the site.

Expected volume is very low: at most a few emails per week.

Bounces and complaints: the SES account-level suppression list is enabled for
BOUNCE and COMPLAINT, so we never send again to an address that bounced or complained.
Registration requires email verification, so invalid addresses do not stay active.
The domain is authenticated with Easy DKIM, a custom MAIL FROM domain
(mail.takuosblog.com, SPF), and DMARC.
```

コンソールの「Amazon SES」→「アカウントダッシュボード」→「本番アクセスをリクエスト」から出すか、上の説明を `use-case.txt` に保存して CLI で出します。

```bash
aws sesv2 put-account-details \
  --production-access-enabled \
  --mail-type TRANSACTIONAL \
  --website-url https://github.com/TAKUO2000/portfolio-site \
  --contact-language EN \
  --use-case-description "$(cat use-case.txt)"

# 審査の状態（PENDING → GRANTED。DENIED ならサポートセンターのケースを見る）
aws sesv2 get-account --query '{prod:ProductionAccessEnabled,review:Details.ReviewDetails}'
```

却下されたら、サポートセンターのケース（`CaseId`）に返信して説明を補います。無料のサポートプランでは、ケースへの返信はコンソールから行います。通ると `ProductionAccessEnabled` が `true` になり、送信の上限が上がります。料金のプランは「アカウントダッシュボード」で確かめます。

---

## 秘密情報を Parameter Store に入れる

秘密情報は SSM Parameter Store に SecureString で置きます。**Terraform の `aws_ssm_parameter` では作りません**。Terraform は作ったリソースの属性を tfstate に平文で残すため、変数に `sensitive = true` を付けても、値は状態に入ります。

Terraform 側では、インスタンスプロファイルのポリシーで `/portfolio/<env>/*` の ARN を指定するだけにします。秘密でない設定（`/portfolio/<env>/config/*`）は Terraform が作るので、ここでは入れません（[環境変数と秘密情報](design.md#環境変数と秘密情報)）。

### 入れるもの

| 名前 | 作り方 |
| --- | --- |
| `/portfolio/prod/APP_KEY` | `base64:` ＋ 32バイトの乱数を base64 にしたもの（`php artisan key:generate --show` と同じ形） |
| `/portfolio/prod/DB_PASSWORD` | 32バイトの乱数を16進数にしたもの |
| `/portfolio/prod/FRONTEND_REVALIDATE_SECRET` | 同上。Vercel の `REVALIDATE_SECRET` にも同じ値を入れる |

DB のパスワードを16進数にするのは、`.env` や compose で特別な意味を持つ記号（`$`・`#`・引用符など）を含めないためです。**どの値も、単一引用符（`'`）・改行・タブを含めないでください**。EC2 の上で `.env` を作る `portfolio-render-env` が、値を単一引用符で囲んで1行に1つずつ書くので、含まれていると止まります（上の作り方なら含まれません）。

MySQL の root のパスワードは置きません。初期化のときに MySQL が乱数で作り、どこにも保存しません（[EC2 上のコンテナ構成](design.md#ec2-上のコンテナ構成)）。

ステージングは `/portfolio/stg/*` に同じ名前で、本番とは別の値を入れます（#116）。ステージングを destroy しても消えないよう、Terraform の管理の外に置きます。

### 入れ方

値を画面に出さず、シェルの履歴にも残さないよう、乱数をその場で作ってそのまま渡します（履歴に残るのは `$(...)` の式だけです）。初めて作るときは `--overwrite` は要りません（既にある名前に付けずに実行すると、上書きせずにエラーになるので、誤って替えることがありません）。

```bash
export AWS_PROFILE=portfolio

aws ssm put-parameter --name /portfolio/prod/APP_KEY --type SecureString \
  --value "base64:$(openssl rand -base64 32)"

aws ssm put-parameter --name /portfolio/prod/DB_PASSWORD --type SecureString \
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
- `APP_KEY` を替えると、セッションと暗号化した値がすべて無効になります。`DB_PASSWORD` は、MySQL 側のユーザーのパスワードも合わせて替えます（`DB_PASSWORD` は、mysql コンテナがデータを初めて作るときにユーザーを作るのにも使われ、そのあとは MySQL 側で変えないかぎり変わりません）

### 確かめる

```bash
# 名前の一覧（値は出ない）
aws ssm get-parameters-by-path --path /portfolio/prod/ --query 'Parameters[].[Name,Type]' --output table

```

Terraform の状態に秘密の値が入っていないことは、Parameter Store の値を読む環境（`envs/prod`・`envs/stg`）を作ったあとに、その環境の状態で確かめます。誤って `aws_ssm_parameter` などで値を扱っていると、ここに出ます。

```bash
cd infra/terraform/envs/prod   # stg も同じ
# 0 と出ればよい（見つかった行の数だけを出し、値は画面に出さない）
terraform state pull | grep -cF -f <(
  for n in APP_KEY DB_PASSWORD FRONTEND_REVALIDATE_SECRET; do
    aws ssm get-parameter --name "/portfolio/prod/$n" --with-decryption --query Parameter.Value --output text
  done
)
```

名前ではなく値そのもので探すので、値が別の属性名で入っていても見つかります。

---

## 本番のリソースを作る（envs/prod）

`modules/app`（ステージングと共有）を本番の値で呼び、本番だけのもの（データ用 EBS・Elastic IP・`api.takuosblog.com` のレコード）を足します。**apply した時点から、EC2 と Elastic IP の課金が始まります。** 先に、上の手順で `/portfolio/prod/*` の秘密を入れておきます（EC2 の上で `.env` を作るときに使う）。

| リソース | 内容 |
| --- | --- |
| ネットワーク | VPC `10.0.0.0/16`、パブリックサブネット `10.0.1.0/24`（`ap-northeast-1a`）、IGW、ルートテーブル。セキュリティグループは 80 / 443（IPv4）だけ |
| EC2 | t4g.micro、Amazon Linux 2023（arm64）、IMDSv2 だけ（ホップ数の上限 2）、CPU クレジットは Standard、ルートは gp3 12GB 暗号化、`Env=prod` タグ |
| データ用 EBS | gp3 10GB 暗号化。`/data` にマウントする。`prevent_destroy` |
| Elastic IP | EC2 に付ける。`api.takuosblog.com` の向き先 |
| IAM | インスタンスロール `portfolio-prod-app`（画像バケット、`/portfolio/prod/*` の読み取り、ECR の pull、SSM、SES） |
| 画像バケット | `takuosblog-images-prod`。`images/*` だけ公開、HTTPS 以外は拒否、CORS は `https://takuosblog.com`、`tmp/` は1日で削除 |
| Parameter Store | 秘密でない設定（`/portfolio/prod/config/*`） |
| Cloudflare | `api.takuosblog.com` の A レコード（DNS only） |

```bash
cd infra/terraform/envs/prod

cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars の aws_account_id と cloudflare_zone_id を入れる（envs/shared と同じ値。コミットしない）

export CLOUDFLARE_API_TOKEN="$(cat ~/.config/portfolio/cloudflare-api-token)"

terraform init
terraform plan
terraform apply
```

EC2 は最初の起動で `user_data`（`modules/app/user_data.sh.tftpl`）を実行します。swap 2GB、Docker と compose、データ用 EBS の `/data` へのマウント（ファイルシステムが無いときだけフォーマットする）、`/usr/local/bin/portfolio-render-env` の配置です。t4g.micro では終わるまでに5分ほどかかります。`user_data` は最初の起動でしか実行されず、`ignore_changes` で固定しているので、あとから直しても今の EC2 には反映されません。直したときは、下の「[user_data で置いたものを直したとき](#user_data-で置いたものを直したとき)」の手順で、今の EC2 にも反映します。

### EC2 に接続する

SSH は開けていないので、Session Manager で接続します。手元に [Session Manager のプラグイン](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) を入れておきます。

```bash
aws ssm start-session --target "$(terraform output -raw instance_id)"
```

Session Manager で入ると、`ssm-user` というユーザーになります。`.env` などの秘密を置いている `/opt/portfolio` は root だけが入れる（パーミッション 700）ので、compose を使うときは `sudo -i` で root のシェルに切り替えてから `cd` します。

```bash
sudo -i
cd /opt/portfolio
docker compose -f docker-compose.prod.yml ps
```

`php artisan tinker` は、設定を書こうとして `Writing to directory /var/www/.config/psysh is not allowed.` という警告を出します（イメージは `www-data` で動かし、書き込めるのを `storage/` と `bootstrap/cache/` だけにしているため）。動きには影響しませんが、`-e HOME=/tmp` を付けると出ません。

```bash
docker compose -f docker-compose.prod.yml exec -e HOME=/tmp app php artisan tinker --execute='echo App\Models\User::count();'
```

### 本番のリソースを確かめる

EC2 の中で：

```bash
cloud-init status                 # done になればよい（ログは /var/log/cloud-init-output.log）
findmnt /data                     # データ用 EBS（xfs）がマウントされている
swapon --show                     # /swapfile 2G
docker compose version
sudo aws ssm get-parameter --region ap-northeast-1 --name /portfolio/prod/APP_KEY --query Parameter.Name --output text  # 読める
sudo aws ssm get-parameter --region ap-northeast-1 --name /portfolio/stg/APP_KEY   # AccessDenied になればよい（ParameterNotFound なら権限が広すぎる）
sudo portfolio-render-env <APP_IMAGE> && sudo ls -l /opt/portfolio   # .env と .env.production が 600 でできる
```

手元で：

```bash
# images/ は誰でも読め（200）、tmp/ は読めない（403）
B=takuosblog-images-prod
echo check | aws s3 cp - "s3://$B/images/verify.txt"
echo check | aws s3 cp - "s3://$B/tmp/verify.txt"
curl -s -o /dev/null -w '%{http_code}\n' "https://$B.s3.ap-northeast-1.amazonaws.com/images/verify.txt"
curl -s -o /dev/null -w '%{http_code}\n' "https://$B.s3.ap-northeast-1.amazonaws.com/tmp/verify.txt"
aws s3 rm "s3://$B/images/verify.txt" && aws s3 rm "s3://$B/tmp/verify.txt"

terraform plan   # 変更なし。aws_instance が must be replaced になっていないこと
```

tfstate に秘密が入っていないことは、[上の手順](#確かめる)の `terraform state pull` の確認で確かめます（0 と出ればよい）。

### MySQL の root で作業するとき

MySQL の root のパスワードは誰も持ちません（`MYSQL_RANDOM_ROOT_PASSWORD`。[EC2 上のコンテナ構成](design.md#ec2-上のコンテナ構成)）。ふだんの作業は、アプリ用のユーザー（`.env` の `DB_USERNAME`。`DB_DATABASE` のすべての権限を持つ）で行います。

```bash
sudo -i                # /opt/portfolio は root だけが入れる（パーミッション 700）
cd /opt/portfolio
# アプリ用のユーザーで入る（パスワードは .env の DB_PASSWORD）
docker compose -f docker-compose.prod.yml exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'

# バックアップもアプリ用のユーザーで取る。PROCESS の権限が無いので --no-tablespaces を付ける（#114 で timer にする）
docker compose -f docker-compose.prod.yml exec -T mysql sh -c \
  'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --single-transaction --no-tablespaces "$MYSQL_DATABASE"' > dump.sql
```

ユーザーの作り直しや権限の付け直しなど、root でしかできない作業が要るときは、MySQL を権限の確認なしで起動し直して、root のパスワードを設定します。その間は（コンテナの中からなら）誰でも DB に入れるので、API を止めてから行い、終わったら元に戻します。動いている `mysql` も止めます（同じ `/data/mysql` を2つの mysqld が開くと、InnoDB のロックが取れずに起動できない）。

```bash
sudo -i                # /opt/portfolio は root だけが入れる（パーミッション 700）
cd /opt/portfolio
docker compose -f docker-compose.prod.yml stop app scheduler nginx mysql
docker compose -f docker-compose.prod.yml run --rm -d --name mysql-recovery mysql \
  --skip-grant-tables --skip-networking
docker exec -it mysql-recovery mysql   # 中で FLUSH PRIVILEGES; のあと ALTER USER 'root'@'localhost' IDENTIFIED BY '...'; など
docker stop mysql-recovery
docker ps --filter name=mysql-recovery --format '{{.Names}}'   # 何も出ないこと（止まっている）
docker compose -f docker-compose.prod.yml up -d
```

root のパスワードを設定した場合は、作業が終わったら `ALTER USER 'root'@'localhost' ACCOUNT LOCK;` で使えなくするか、値を Parameter Store に置かずに控えないでおきます。

### user_data が途中で失敗したとき

`cloud-init status` が `error` のときは、`/var/log/cloud-init-output.log` の最後で、どこで止まったかを見ます（`set -x` なので、実行したコマンドが順に出ています）。たとえばデータ用 EBS が5分たっても見えなかった、`blkid` が失敗した、などです。`user_data` は最初の起動でしか実行されないので、そのままでは Docker や `portfolio-render-env` が入らないまま残ります。

原因を取り除いたら、Session Manager で入って、同じスクリプトをもう一度実行します。どの処理も2回目に実行しても壊れないように書いてあります（swap と fstab は済んでいれば足さない、データ用 EBS はファイルシステムがあればフォーマットしない）。

```bash
sudo bash -x /var/lib/cloud/instance/scripts/part-001
```

### user_data で置いたものを直したとき

`user_data`（`modules/app/user_data.sh.tftpl`・`envs/prod/mount-data.sh.tftpl`）と、それが置く `portfolio-render-env`（`modules/app/files/render-env.sh`）を直しても、今の EC2 には届きません。`terraform plan` にも差分は出ないので、リポジトリと EC2 が気づかないうちにずれます。直したら、SSM Run Command で同じ変更を EC2 にも行います。`portfolio-render-env` だけは、デプロイのたびにデプロイ用の SSM ドキュメントが部品から置き直すので、次のデプロイで自動で最新になります。デプロイを待たずに直したいときは、下の手順で置き直します。

`portfolio-render-env` を置き直して、ハッシュが一致するのを確かめる：

```bash
cd infra/terraform/envs/prod
I=$(terraform output -raw instance_id)
S=../../modules/app/files/render-env.sh
PARAMS=$(python3 - "$S" <<'PY'
import base64, hashlib, json, sys
data = open(sys.argv[1], "rb").read()
b64, sha = base64.b64encode(data).decode(), hashlib.sha256(data).hexdigest()
dst = "/usr/local/bin/portfolio-render-env"
print(json.dumps({"commands": [
    f"echo {b64} | base64 -d > {dst}.new",
    f"echo '{sha}  {dst}.new' | sha256sum -c -",
    f"chmod 700 {dst}.new",
    f"mv {dst}.new {dst}",
]}))
PY
)
CID=$(aws ssm send-command --instance-ids "$I" --document-name AWS-RunShellScript \
  --parameters "$PARAMS" --query Command.CommandId --output text)
aws ssm wait command-executed --command-id "$CID" --instance-id "$I"
aws ssm get-command-invocation --command-id "$CID" --instance-id "$I" \
  --query '[Status,StandardOutputContent]' --output text   # Success と「OK」が出ればよい
```

ずれていないかだけを確かめるときは、EC2 の中の `sha256sum /usr/local/bin/portfolio-render-env` と、手元の `sha256sum infra/terraform/modules/app/files/render-env.sh` を比べます。

---

## デプロイする（GitHub Actions）

バックエンドは、`.github/workflows/deploy.yml` でデプロイします（[デプロイ](design.md#デプロイ)）。`main` への push で本番に、`develop` への push でステージング（EC2 があるときだけ）にデプロイされます。

### 最初に一度だけ

ワークフローは、アカウント ID からロールの ARN を組み立てます。公開リポジトリに書かないよう、GitHub のシークレットに入れます。

```bash
aws sts get-caller-identity --query Account --output text | gh secret set AWS_ACCOUNT_ID
```

### デプロイの結果を確かめる

GitHub の Actions の画面で「Deploy backend」の結果を見ます。最後のステップに、EC2 の上で実行したデプロイの出力（`docker compose ps` など）が出ます。EC2 の中で確かめるときは、Session Manager で入ります。

```bash
sudo -i                # /opt/portfolio は root だけが入れる（パーミッション 700）
cd /opt/portfolio
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail 100 app
```

### デプロイの手順（SSM ドキュメント）を直したとき

EC2 で動くデプロイの手順（`infra/terraform/envs/shared/files/deploy.sh.tftpl`）は、Terraform が SSM ドキュメント `portfolio-deploy` として置きます。ワークフローや部品と一緒に直したときは、**`main` にマージしてデプロイする前に、`envs/shared` を apply します**。先にデプロイすると、古い手順で動き、新しい部品（スクリプトや unit など）が置かれません。

### ロールバックする

Actions の画面で「Deploy backend」を手動で実行し（Run workflow）、ブランチに `main`、`image_tag` に戻したいタグ（`main-<コミットの SHA>`）を入れます。ビルドはせず、そのタグのイメージと部品でデプロイし直します。ECR に残っているのは、`main-` の直近の20個と `develop-` の直近の10個です。

```bash
# 残っているタグの一覧（新しい順）
aws ecr describe-images --repository-name portfolio/app \
  --query 'reverse(sort_by(imageDetails, &imagePushedAt))[].imageTags[0]' --output text
```

### 手でデプロイ用のドキュメントを実行する

GitHub Actions を使わずに、手元から同じデプロイを実行することもできます（ECR のイメージと S3 の部品がすでにあるタグだけ）。

```bash
I=$(cd infra/terraform/envs/prod && terraform output -raw instance_id)
CID=$(aws ssm send-command --instance-ids "$I" --document-name portfolio-deploy \
  --parameters imageTag=main-<コミットの SHA> --query Command.CommandId --output text)
aws ssm wait command-executed --command-id "$CID" --instance-id "$I"
aws ssm get-command-invocation --command-id "$CID" --instance-id "$I" \
  --query '[Status,StandardOutputContent,StandardErrorContent]' --output text
```

---

## 証明書を取る（初回）

API（`api.takuosblog.com`）の TLS の証明書を、Let's Encrypt から certbot で取ります（[証明書（certbot）](design.md#証明書certbot)）。最初のデプロイのあと、1回だけ行います。証明書が無いうちは、nginx は 443 の設定を読めずに起動を繰り返します（想定どおり）。

取得のスクリプト（`portfolio-cert-init`）と、更新の timer（`portfolio-cert-renew.timer`）は、デプロイで EC2 に置かれます。

Session Manager で EC2 に入って実行します。メールアドレスは Let's Encrypt のアカウントの連絡先です（期限切れの通知は来ない）。

```bash
# 1. 試験用の認証局で、手順が通るかを確かめる（本物は同じドメインで週5回までしか発行できないため）
sudo portfolio-cert-init --staging <メールアドレス>

# 2. 通ったら本物を取る（試験用の証明書は自動で消してから取る）
sudo portfolio-cert-init <メールアドレス>
```

スクリプトは、nginx を止める → `certbot certonly --standalone` で取る → nginx を起動する → `certbot renew --dry-run --webroot` で、ふだんの更新が通るかを確かめる → `https://<ドメイン>/up` の状態コードと、証明書の発行元と期限を表示する、の順に進みます。最後に `200` と出て、本物のときは発行元が Let's Encrypt（`STAGING` が付かない）になっていればよいです。

### 確かめる

```bash
# EC2 の中で
systemctl list-timers portfolio-cert-renew.timer   # 次に動く時刻が出る
sudo systemctl start portfolio-cert-renew.service  # 今すぐ更新を試す（期限が30日以上残っていれば、更新はしない）
journalctl -u portfolio-cert-renew --no-pager -n 30

# 手元で
curl -sI https://api.takuosblog.com/up | head -1   # HTTP/2 200
```

---

## バックアップと監視を確かめる

`envs/prod` の apply で、バックアップ用バケット（`takuosblog-backup-prod`）・DLM・SNS（`portfolio-prod-alerts`）・CloudWatch のアラームができます（[バックアップと監視](design.md#バックアップと監視)）。`mysqldump` の timer と、証明書の残りの日数を送る処理は、デプロイで EC2 に置かれます。

### 通知を受け取れるようにする

apply のあと、`alert_email` に「AWS Notification - Subscription Confirmation」のメールが届くので、「Confirm subscription」を押します。押すまで、アラームのメールは届きません。

```bash
# PendingConfirmation でなく、ARN が出ればよい
aws sns list-subscriptions-by-topic \
  --topic-arn "$(aws sns list-topics --query "Topics[?contains(TopicArn,'portfolio-prod-alerts')].TopicArn" --output text)" \
  --query 'Subscriptions[].SubscriptionArn' --output text

# アラームの状態（OK になればよい）
aws cloudwatch describe-alarms --alarm-name-prefix portfolio --query 'MetricAlarms[].[AlarmName,StateValue]' --output table
```

証明書のアラーム（`portfolio-prod-tls-expiring`）は、残りの日数が届くまで ALARM（または INSUFFICIENT_DATA）になります。デプロイのあとに、EC2 で更新を1回動かすと値が届きます。

```bash
sudo systemctl start portfolio-cert-renew.service
journalctl -u portfolio-cert-renew --no-pager -n 10   # 「残り N 日」が出ればよい
```

### mysqldump を試す

```bash
# EC2 の中で
systemctl list-timers portfolio-mysqldump.timer      # 次に動く時刻
sudo systemctl start portfolio-mysqldump.service     # 今すぐ取る
journalctl -u portfolio-mysqldump --no-pager -n 10   # uploaded s3://takuosblog-backup-prod/mysql/... と出ればよい

# EC2 からは、バックアップを読む・消すことはできない（AccessDenied になればよい）
aws s3 ls s3://takuosblog-backup-prod/mysql/
```

```bash
# 手元で（管理用のユーザー）
aws s3 ls --recursive s3://takuosblog-backup-prod/mysql/
```

### mysqldump から復元する

本番の MySQL では、アプリ用のユーザーは別の DB を作れず、root のパスワードも誰も持っていません。復元の手順は、本番に触らずに、手元の Docker の MySQL 8.4 で試します。

```bash
# 手元で。新しいものを1つ取ってくる
KEY=$(aws s3 ls --recursive s3://takuosblog-backup-prod/mysql/ | sort | tail -1 | awk '{print $4}')
aws s3 cp "s3://takuosblog-backup-prod/$KEY" ./dump.sql.gz

docker run -d --name restore-test -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=portfolio mysql:8.4
until docker exec restore-test mysqladmin ping -uroot -proot --silent 2>/dev/null; do sleep 2; done
sleep 5   # 初期化の一時サーバーが終わるのを待つ
gunzip -c dump.sql.gz | docker exec -i restore-test mysql -uroot -proot portfolio

# テーブルと件数を確かめる
docker exec restore-test mysql -uroot -proot portfolio -e "SHOW TABLES; SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM migrations;"

docker rm -f restore-test && rm dump.sql.gz
```

本番の DB を mysqldump から戻すときは、`app`・`scheduler`・`nginx` を止めてから、アプリ用のユーザーで流し込みます（`DB_DATABASE` のすべての権限を持つ）。

```bash
# EC2 の中で。dump.sql.gz は管理用のユーザーで S3 から取って、Session Manager などで EC2 に置く
sudo -i                # /opt/portfolio は root だけが入れる（パーミッション 700）
cd /opt/portfolio
DUMP=/home/ssm-user/dump.sql.gz   # 置いた場所を絶対パスで指定する（root のシェルでは ~ が /root になるため）

# 止める前に、ファイルがあって壊れていないかを確かめる（止めたあとで失敗すると、サイトが止まったままになる）
gzip -t "$DUMP" && zcat "$DUMP" | tail -n 1 | grep -q '^-- Dump completed' && echo OK

docker compose -f docker-compose.prod.yml stop app scheduler nginx
gunzip -c "$DUMP" | docker compose -f docker-compose.prod.yml exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE"'
docker compose -f docker-compose.prod.yml up -d
```

データ用 EBS ごと戻すときは、DLM のスナップショットから新しいボリュームを作って付け替えます。データ用 EBS は Terraform（`envs/prod` の `aws_ebs_volume.data`、`prevent_destroy`）が管理しているので、付け替えたら Terraform の状態も合わせる必要があります。手順は、必要になったときに決めます。

