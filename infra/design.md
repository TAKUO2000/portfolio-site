# インフラ設計書

本アプリを本番公開するためのインフラ設計です。構成図は [architecture.md](./architecture.md) を参照してください。
Terraform のコードは #53 で `infra/terraform/` に追加する予定です。

## 目次

- [方針](#方針)
- [検討した構成](#検討した構成)
- [費用の見積もり](#費用の見積もり)
- [AWS リソース](#aws-リソース)
- [EC2 上のコンテナ構成](#ec2-上のコンテナ構成)
- [Laravel の実行性能](#laravel-の実行性能)
- [認証とCORS](#認証とcors)
- [S3（画像）](#s3画像)
- [Vercel](#vercel)
- [DNS（Cloudflare）](#dnscloudflare)
- [環境変数と秘密情報](#環境変数と秘密情報)
- [管理者アカウントの作成](#管理者アカウントの作成)
- [デプロイ](#デプロイ)
- [ステージング環境](#ステージング環境)
- [バックアップと監視](#バックアップと監視)
- [セキュリティ](#セキュリティ)
- [未決事項・今後の課題](#未決事項今後の課題)

---

## 方針

- **EC2 を中心に AWS の基本（VPC・SG・IAM・EBS・SSM）を学ぶ**
- **月額を抑える**。RDS・ECS・ALB・NAT Gateway は使わない
- フロントエンドは Vercel に任せ、EC2 にはバックエンドだけを載せる。これで EC2 を 1GB のインスタンスに収める
- インフラは Terraform でコード化する（#53）
- ステージングは常に置かず、**必要なときだけ作って消す**。ドメインも新しく用意せず、本番のドメインのサブドメインを使う

---

## 検討した構成

| 構成 | 月額の目安 | 採否 | 理由 |
| --- | --- | --- | --- |
| Lightsail 1台に全部 | $7〜12 | 不採用 | 最安だが、VPC・IAM ロールなど AWS の基本がほぼ学べない |
| EC2 1台に全部（Next.js 含む） | 約 $20 | 不採用 | Next.js も載せると 2GB が必要になり、割高 |
| **Vercel + EC2（バックエンドのみ）** | **約 $14** | **採用** | EC2 の学習範囲はほぼ変わらず、1GB で動く。フロントのデプロイは自動になる |
| ALB + ECS + RDS | $40〜 | 不採用 | 実務に近いが、個人開発で常時動かすには高い |

---

## 費用の見積もり

東京リージョン（ap-northeast-1）の単価で出した概算です。料金改定や為替で変わるため、構築前に料金ページで確かめてください。

| 項目 | 内容 | 月額の目安 |
| --- | --- | --- |
| EC2 | t4g.micro（2 vCPU / 1GB、ARM）を常時稼働 | 約 $7.9 |
| パブリック IPv4 | Elastic IP 1つ | 約 $3.6 |
| EBS | gp3 ルート 12GB ＋ データ用 10GB | 約 $2.1 |
| EBS スナップショット | データ用ボリュームを日次で7世代（差分のみ課金） | 〜$1 |
| S3（バックアップ） | `mysqldump` を30日分 | 〜$0.1 |
| ECR | イメージ数百MB | 〜$0.1 |
| S3 | 画像の保存と転送（小規模） | 〜$0.5 |
| Vercel | Hobby プラン | $0 |
| **合計** | | **約 $14〜15.5** |

DNS は Cloudflare（無料）を使うので、Route 53 の費用はかかりません。この表とは別に、ドメイン（`takuosblog.com`、Cloudflare で取得済み）の更新費が年額でかかります。

ステージングは動かしている時間だけ課金され、1時間あたり約 $0.02（EC2・パブリック IPv4・EBS）です。1日4時間を月10日使っても $1 未満です（[ステージング環境](#ステージング環境)）。

---

## AWS リソース

Terraform で作る単位です。Terraform のディレクトリは、ずっと残すもの（shared）と環境ごとのもの（prod / stg）に分けます。

```
infra/terraform/
├── modules/app/   # VPC・SG・EC2・IAM ロール・S3 の画像バケットなど、環境ごとに作るもの
└── envs/
    ├── shared/    # ECR、GitHub OIDC プロバイダー、Parameter Store、AWS Budgets
    ├── prod/      # modules/app を本番の値で呼ぶ。データ用 EBS・バックアップ用バケット・DLM・CloudWatch アラーム・Elastic IP・Cloudflare の DNS レコードもここ
    └── stg/       # modules/app をステージングの値で呼ぶ（必要なときだけ apply / destroy）。Cloudflare の DNS レコードもここ
```

tfstate は同じバケットに置き、キーを環境ごとに分けます（`shared/`、`prod/`、`stg/`）。DNS レコードは AWS ではなく Cloudflare にあるので、Terraform の Cloudflare プロバイダーで管理します。

以下の表は本番の構成です。ステージングとの違いは [ステージング環境](#ステージング環境) にまとめています。

| 区分 | リソース | 設定 |
| --- | --- | --- |
| ネットワーク | VPC | `10.0.0.0/16` |
| | パブリックサブネット | `10.0.1.0/24`（1つの AZ） |
| | インターネットゲートウェイ / ルートテーブル | `0.0.0.0/0` を IGW へ |
| | NAT Gateway | **作らない**（月 $45 前後かかるため） |
| セキュリティグループ | EC2 用 | インバウンドは 80 / 443 を `0.0.0.0/0` と `::/0` から許可するだけ。22 は開けない |
| EC2 | インスタンス | t4g.micro、Amazon Linux 2023（arm64）、IMDSv2 を必須にする。CPU クレジットは **Standard モード**（[CPU クレジットと費用の監視](#cpu-クレジットと費用の監視)） |
| | Elastic IP | `api.takuosblog.com` の向き先 |
| | EBS（ルート） | gp3 12GB、暗号化する。OS と Docker のイメージを置く。インスタンスを作り直すと消えてよいものだけを置く |
| | EBS（データ用） | gp3 10GB、暗号化する。`/data` にマウントし、MySQL のデータと証明書を置く。**`envs/prod` に置き、`prevent_destroy = true` にする**（[データの置き場所](#データの置き場所)） |
| IAM | インスタンスプロファイル | **自分の環境のものだけ**に絞る。S3 は自分の環境の画像バケットの読み書き（本番はバックアップ用バケットへの `s3:PutObject` も）、Parameter Store は `arn:aws:ssm:ap-northeast-1:<アカウント ID>:parameter/portfolio/<env>/*` の読み取りだけ。ほかに ECR の pull と SSM（`AmazonSSMManagedInstanceCore`）。`modules/app` に `env` 変数を渡して ARN を組み立てる |
| | GitHub Actions 用のロール | 用途ごとに3つに分ける（[GitHub Actions のロール](#github-actions-のロール)） |
| S3 | 画像バケット | [S3（画像）](#s3画像)を参照 |
| | バックアップ用バケット | `mysqldump` を置く（`envs/prod`）。パブリックアクセスをすべてブロックし、暗号化する。ライフサイクルで30日後に削除する |
| | tfstate バケット | Terraform の状態を保存する。バージョニングを有効にする |
| ECR | リポジトリ | `portfolio/app`。古いイメージはライフサイクルルールで消す |
| SSM | Parameter Store | 秘密情報（SecureString）を置く |
| DLM | ライフサイクルポリシー | データ用 EBS の日次スナップショットを7世代残す |
| CloudWatch | アラーム | ステータスチェックの失敗と CPU クレジット残高。通知先は SNS からメールに送る |
| Budgets | 月の予算（`envs/shared`） | アカウント全体で月 $20。実績が 80% を超えたとき、月末の予測が 100% を超えそうなときにメールで知らせる |

DB だけをプライベートサブネットに分ける構成は採らない。プライベートサブネットから外に出るには NAT Gateway が必要で、高くつくからです。MySQL は EC2 内のコンテナで動かし、ポートを外に公開しないことで守ります。

### GitHub Actions のロール

ステージングの EC2 はインターネットに公開され、DB も毎回作り直すので、本番より侵害されやすい環境です。どの環境からも、本番の秘密情報やリソースに届かないように、権限を環境と用途で分けます。

| ロール | 引き受けられる条件（OIDC の `sub`） | 許可すること |
| --- | --- | --- |
| `github-deploy-prod` | `repo:TAKUO2000/portfolio-site:ref:refs/heads/main` | ECR の `portfolio/app` への push。`Env=prod` タグの EC2 に、デプロイ用の SSM ドキュメントだけを `ssm:SendCommand` で実行する |
| `github-deploy-stg` | `repo:TAKUO2000/portfolio-site:ref:refs/heads/develop` | ECR への push。`Env=stg` タグの EC2 に、デプロイ用の SSM ドキュメントだけを実行する。ステージングの有無を確かめるための `ec2:DescribeInstances` |
| `github-terraform-stg` | `repo:TAKUO2000/portfolio-site:environment:staging` | `envs/stg` の apply / destroy に必要な権限（VPC・EC2・S3 の stg バケット・IAM など）。作る IAM ロールには permissions boundary を必須にし、自分より強い権限のロールを作れないようにする |

- **SSM Run Command は、EC2 の root でコマンドを実行できる**（実質的に EC2 のシェルと同じ）。`AWS-RunShellScript` のような任意のコマンドを実行できるドキュメントは許可せず、決まった手順（`.env` の作り直し、`docker compose pull` と `up -d`、`migrate`）だけを実行する独自の SSM ドキュメント（`portfolio-deploy`）を作って、それだけを許可する
- `github-terraform-stg` は、GitHub の Environment（`staging`）に結び付ける。Environment の設定で、実行できるブランチを `main` だけに限定する。`workflow_dispatch` で手動実行したときだけ使う
- **`envs/shared` と `envs/prod` は GitHub Actions から apply しない**。手元から、MFA を付けた管理用のユーザーで apply する。この2つを Actions から apply できるロールを作ると、ワークフローを書き換えられただけでアカウント全体を奪われるため
- Cloudflare の API トークンも、ステージングの DNS レコードを作るために GitHub Actions のシークレットに置く。対象ゾーンの DNS 編集権限だけに絞る

### データの置き場所

MySQL のデータと証明書は、ルートとは別の EBS（データ用）に置きます。

ルートボリュームは、インスタンスを終了すると一緒に削除されます（初期設定）。Terraform では、AMI や `user_data` を変えると `aws_instance` が作り直されることがあり、データをルートに置いているとそのときに DB と証明書が消えます。

| 対策 | 内容 |
| --- | --- |
| データ用 EBS を分ける | `aws_ebs_volume` と `aws_volume_attachment` で作り、`user_data` で `/data` にマウントする。compose は名前付きボリュームではなく `/data/mysql`、`/data/letsencrypt` をマウントする |
| 消せないようにする | データ用 EBS は `envs/prod` に置き、`lifecycle { prevent_destroy = true }` を付ける。`prevent_destroy` には変数を使えないので、ステージングと共有する `modules/app` には置かない（ステージングは DB を毎回空にするので、ルートの `/data` ディレクトリで足りる） |
| 作り直しを起こしにくくする | `aws_instance` に `lifecycle { ignore_changes = [ami, user_data] }` を付ける。AMI を新しくするときは、意図して作り直す |
| インスタンスタイプの変更 | t4g.small などへの変更は、停止して変えるだけで作り直しにならない（Terraform も停止・起動で変更する）。plan で `must be replaced` と出ていないかを確かめてから apply する |

### CPU クレジットと費用の監視

T4g はバースト可能なインスタンスで、CPU クレジットを使って動きます。t4g.micro は毎時12クレジットを獲得し、ベースラインは vCPU あたり 10%、最大288クレジットまで貯まります。

T4g の**初期設定は Unlimited モード**で、クレジットを使い切っても速度は落ちません。そのかわり、24時間の平均使用率がベースラインを超えた分に追加料金がかかります。個人のポートフォリオでは、遅くなることより費用が読めないことのほうが困るので、次の3つを組み合わせます。

| 対策 | 内容 |
| --- | --- |
| **Standard モードにする** | Terraform の `aws_instance` に `credit_specification { cpu_credits = "standard" }` を指定する。クレジットを使い切ると CPU がベースライン（10%）に抑えられて遅くなるが、追加料金はかからない。`modules/app` の既定値にして、ステージングも同じにする |
| **CPU クレジット残高のアラーム** | CloudWatch の `CPUCreditBalance` が少なくなったら SNS からメールで知らせる。遅くなる前に気づくため |
| **AWS Budgets** | アカウント全体の費用に月 $20 の予算を作り、メールで知らせる（下の例）。CPU クレジット以外の想定外の課金（ステージングの消し忘れ、データ転送量など）にも気づける |

```hcl
# envs/shared
resource "aws_budgets_budget" "monthly" {
  name         = "portfolio-monthly"
  budget_type  = "COST"
  limit_amount = "20"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # 実績が 80% を超えたら
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  # 月末の予測が 100% を超えそうなら
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
}
```

- 予算は見積もり（月 $14〜15.5）に余裕を持たせて $20 にする。このアカウントはこのアプリ専用で使う前提で、タグでは絞り込まない
- Budgets は通知するだけで、リソースは止めない（Budget actions は使わない）。費用のデータは1日に数回の更新なので、通知は数時間から半日ほど遅れることがある
- 予測の通知は、使い始めはデータが足りず動かないことがある
- 通知が来たら、Cost Explorer をサービス別に表示し、何が増えたかを確かめる
- 残高のアラームがたびたび鳴るようなら、Unlimited モードに戻して `CPUSurplusCreditsCharged` を監視するか、t4g.small（月 +$8 程度）に上げるかを決める

CPU を使いやすい場面と、その対策：

- イメージのビルドと `composer install`：EC2 では行わない（GitHub Actions でビルドする）
- メモリ不足による swap の読み書き：[1GB に収めるための設定](#1gb-に収めるための設定)で抑える
- クローラーなどからの大量のアクセス：Laravel のレート制限で抑える
- デプロイ時のイメージの pull と展開、深夜の `mysqldump`：一時的なので許容する

---

## EC2 上のコンテナ構成

本番用の `docker-compose.prod.yml` を EC2 に置き、docker compose で動かします。

| コンテナ | イメージ | 役割 | メモリの目安 |
| --- | --- | --- | --- |
| `nginx` | `nginx:stable-alpine` | TLS 終端、FastCGI で php-fpm へ渡す、HTTP から HTTPS へのリダイレクト | 約 10MB |
| `certbot` | `certbot/certbot` | Let's Encrypt の証明書の取得と更新。常駐させず、更新するときだけ `docker compose run --rm` で動かす | 0MB（実行中だけ約 50MB） |
| `app` | ECR の `portfolio/app` | php-fpm（Laravel）。起動時に migrate と optimize を実行する | 約 150MB |
| `scheduler` | `app` と同じイメージ | `php artisan schedule:work`（`images:prune` などを実行） | 約 60MB |
| `mysql` | `mysql:8.0` | DB。データはデータ用 EBS の `/data/mysql` に置く | 約 250MB |

Web サーバーは開発環境と同じ nginx にします。証明書の取得と更新は certbot で行います。Caddy（証明書を自動で管理する Web サーバー）とも比べましたが、開発環境とそろえることと、証明書の発行と更新の仕組みを学ぶことを優先しました。メモリの差は 10〜30MB ほどで、判断には影響しません。

### nginx の設定

開発用の `laravel-back/docker/nginx/default.conf` をもとに、本番用の設定（`laravel-back/docker/nginx/prod.conf`（予定））を作ります。

- **80 番**：`/.well-known/acme-challenge/` だけは certbot の webroot（共有ボリューム）から返し、それ以外は HTTPS へリダイレクトする
- **443 番**：`/etc/letsencrypt/live/<ドメイン>/` の `fullchain.pem` と `privkey.pem` を使う
- **すべてのリクエストを `public/index.php` に渡す**。`SCRIPT_FILENAME` を `/var/www/html/public/index.php` に固定する。API サーバーなので配信する静的ファイルはなく（画像は S3）、nginx のコンテナにソースを置く必要がなくなる。nginx のイメージを自分でビルドしたり、app のイメージから `public/` を共有したりしなくて済む
- `client_max_body_size 12M` は開発用と同じにする
- 開発用と同じく、`fastcgi_pass` は変数と `resolver 127.0.0.11` で都度解決する（app コンテナを入れ替えると IP が変わるため）

### 証明書（certbot）

- 証明書はデータ用 EBS の `/data/letsencrypt` に置き、nginx と certbot の `/etc/letsencrypt` にマウントして共有する。チャレンジ用の webroot（`/var/www/certbot`）も同じように共有する
- **初回の取得**：nginx は証明書がないと 443 の設定で起動できない。そのため、nginx を起動する前に `certbot certonly --standalone` で取得する（certbot が自分で 80 番を開いて確認を受ける）。手順はセットアップ用のスクリプトにまとめる
- **更新**：systemd timer で1日2回、次のように実行する。certbot は期限が残り30日を切った証明書だけを更新する。Amazon Linux 2023 には cron が入っていないので、systemd timer を使う

  ```bash
  docker compose -f docker-compose.prod.yml run --rm certbot renew --webroot -w /var/www/certbot
  docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
  ```

- **更新の認証方法を必ず指定する**：初回に `--standalone` で取った証明書は、更新の設定（`/etc/letsencrypt/renewal/<ドメイン>.conf`）に `authenticator = standalone` が記録される。そのまま `renew` すると certbot が 80 番を開こうとして nginx とぶつかり、90日後に初めて更新の失敗に気づくことになる。`--webroot -w /var/www/certbot` を渡すと webroot で更新され、成功すると設定も webroot に書き換わる
- reload は certbot の `--deploy-hook` ではなく、ホスト側で続けて実行する。certbot はコンテナの中で動くので、hook から nginx のコンテナを操作できないため
- **初回の取得のあとに `renew --dry-run` を実行し、webroot での更新が通ることを確かめる**。手順はセットアップ用のスクリプトに入れる
- 更新に失敗したまま期限（90日）が切れると、API に HTTPS でつながらなくなる。Let's Encrypt は期限切れが近づいても通知メールを送らないので、更新のログを確認できるようにしておく

### 1GB に収めるための設定

- 合計は OS を含めて約 700MB。余裕を持たせるため、**swap を 2GB 作る**
- MySQL：`innodb_buffer_pool_size=128M`、`performance_schema=OFF`
- php-fpm：`pm=ondemand`、`pm.max_children=5`
- メモリ不足で落ちるようなら t4g.small（2GB、月 +$8 程度）に上げる。Terraform の変数を1つ変えるだけで済むようにしておく（停止して変えるだけで、作り直しにはならない。[データの置き場所](#データの置き場所)）
- **イメージは EC2 上でビルドしない**（GitHub Actions でビルドする）

開発用の MinIO は本番では使いません。実際の S3 を使います（[S3（画像）](#s3画像)）。

---

## Laravel の実行性能

#52 の追記で挙げた論点を、次のように決めます。

| 論点 | 決定 |
| --- | --- |
| OPcache | 本番用の Dockerfile（`laravel-back/docker/php/Dockerfile.prod`）で `opcache` を入れる。コードはイメージに焼き込み、`opcache.validate_timestamps=0` にする。コードを変えるときは、必ずコンテナを入れ替える |
| `php artisan optimize` | 秘密情報は実行時に環境変数で渡す。`config:cache` が値を固めてしまうため、**イメージのビルド時ではなくコンテナ起動時（entrypoint）に実行する** |
| PHP-FPM か Octane か | PHP-FPM + OPcache + optimize で始める。Octane は使わない |
| キュー・セッション・キャッシュ | 今のまま MySQL（`database` ドライバー）。Redis は使わない |

本番用の entrypoint で行うこと（開発用の `entrypoint.sh` とは分ける）：

1. `composer install` はしない（ビルド時に `--no-dev --optimize-autoloader` で済ませておく）
2. `app` コンテナでだけ `php artisan migrate --force` を実行する（`scheduler` では実行しない）
3. `php artisan optimize`
4. `exec php-fpm`（`scheduler` は `exec php artisan schedule:work`）

---

## 認証とCORS

フロントは `takuosblog.com`（Vercel）、API は `api.takuosblog.com`（EC2）に置きます。

- **Cookie**：2つは**同じサイト**（登録ドメインが同じ）なので、`SameSite=Lax` のまま Sanctum のセッション Cookie が送られる。`*.vercel.app` と自分のドメインの組み合わせでは別サイトになり、ログインできない
- **CORS**：2つは**別オリジン**なので、CORS の許可が必要。`config/cors.php` はすでに `FRONTEND_URL` と `supports_credentials => true` に対応しているので、環境変数を設定するだけで済む

| 環境変数 | 本番の値 |
| --- | --- |
| `APP_URL` | `https://api.takuosblog.com` |
| `FRONTEND_URL` | `https://takuosblog.com`（末尾スラッシュなし。`www` の有無もそろえる） |
| `SANCTUM_STATEFUL_DOMAINS` | `takuosblog.com` |
| `SESSION_DOMAIN` | `.takuosblog.com` |
| `SESSION_SECURE_COOKIE` | `true` |

注意点：

- `allowed_origins` を `*` にしない（`supports_credentials` と一緒には使えない）
- プリフライト（OPTIONS）は nginx で弾かず、Laravel まで届ける
- Vercel のプレビュー環境（`*.vercel.app`）ではログインできない。ログインが絡む確認は、ローカルか本番で行う
- SSR（Vercel → API）は公開記事の取得だけなので、Cookie の中継はしない。ログインが必要な内容をサーバー側で描画するようになったら、Cookie と `Origin` を中継する作りを改めて検討する

---

## S3（画像）

| 設定 | 内容 |
| --- | --- |
| バケット | 本番用を新しく作る（開発用とは分ける） |
| パブリックアクセス | `images/*` だけ、バケットポリシーで `s3:GetObject` を公開する。**`tmp/*` は公開しない**（下の「`tmp/*` を公開しない理由」を参照） |
| CORS | ブラウザが署名付き URL へ直接 PUT するため、`AllowedOrigins: https://takuosblog.com`、`AllowedMethods: PUT, GET`、`AllowedHeaders: Content-Type` を設定する（ブラウザが PUT で付けるヘッダーは `Content-Type` だけ。`nextjs-front/app/lib/uploadImage.ts`） |
| ライフサイクル | `tmp/` プレフィックスは1日で削除する（[画像管理の仕組み](../docs/image-management.md#本番で必要な準備)） |
| アクセス方法 | EC2 の IAM ロールを使う。`AWS_ACCESS_KEY_ID` と `AWS_SECRET_ACCESS_KEY` は設定しない |
| `AWS_ENDPOINT` / `AWS_PUBLIC_ENDPOINT` | 空にする |
| `AWS_USE_PATH_STYLE_ENDPOINT` | `false` |

本番のバケット名は `nextjs-front/next.config.ts` の `images.remotePatterns` にも追加する（今は開発用のバケットだけが入っている）。

**`tmp/*` を公開しない理由**

`tmp/` は、アップロードしたがまだ記事に保存していない画像の置き場です。公開すると、使わなかった画像も URL を知っていれば誰でも読めるので、公開しません。公開しなくても、今のコードのまま動きます。

- 編集画面のプレビューは、ブラウザが持っているファイルから作った Blob URL（`URL.createObjectURL(file)`）で表示している（`MarkdownEditor.tsx`、`HeaderImageInput.tsx`）。`tmp/` の URL はプレビューに使っていない
- `tmp/` へのアップロードは記事を保存するときに行う。`/api/images/upload-url` が返す `image_url`（`tmp/` の URL）は、本文中の Blob URL と差し替えてサーバーへ送るだけで、ブラウザが読みに行くことはない（`ArticleForm.tsx`）
- サーバーは保存時に、本文の `tmp/` の URL からキーを取り出し、IAM ロールの権限で `images/` へコピーして、本文の URL も書き換える。公開設定は関係しない
- 保存に失敗したときも、画面の本文は Blob URL のまま残る
- 開発環境の MinIO はバケット全体を公開している（`docker-compose.yml` の `minio-init`）が、本番では `images/*` だけにする

注意：下書き・非表示の記事の画像は、保存した時点で `images/` に移り、記事から参照されている間は残ります。`images/*` は公開しているので、URL を知っていれば公開前の画像も読めます（キーは推測しにくい）。公開前の画像を隠したくなったら、記事の公開時に画像を移す、または下書きの画像を署名付き URL で返すなど、`images/` 側の設計を見直します。

---

## Vercel

| 設定 | 値 |
| --- | --- |
| プラン | Hobby（非商用の個人利用に限る） |
| Root Directory | `nextjs-front` |
| Functions のリージョン | `hnd1`（東京）。EC2 と同じリージョンにして、SSR の往復を短くする |
| 独自ドメイン | `takuosblog.com`。Cloudflare に Vercel 向けのレコードを作る（[DNS（Cloudflare）](#dnscloudflare)） |
| 環境変数 | `NEXT_PUBLIC_API_BASE_URL=https://api.takuosblog.com`、`REVALIDATE_SECRET`（秘密。下記） |

`REVALIDATE_SECRET` は、記事の変更時に API が `/api/revalidate` を呼ぶときのシークレットです（`nextjs-front/app/api/revalidate/route.ts`）。トップページは記事一覧を静的なページとしてキャッシュし、記事が変わったときと1時間ごとに作り直します。API 側の `FRONTEND_REVALIDATE_SECRET` と同じ値にし、Production（本番）と Preview（`develop` のステージング）で別の値を入れます。

トップページはビルドのときにも API から記事一覧を取ります。API に届かないとビルドは失敗します（記事0件のページを公開しないため）。Vercel はビルドに失敗しても今のデプロイを出し続けるので、API を戻してから再デプロイします。動いている間の作り直しで API に届かなかったときは、前のページを出し続けます。

`API_INTERNAL_BASE_URL` は設定しません。`app/lib/apiBaseUrl.ts` は、これが無ければ `NEXT_PUBLIC_API_BASE_URL` を使います。

Hobby プランでは、画像最適化（`next/image`）の回数に月ごとの上限があります。超えそうな場合は `unoptimized` にするか、S3 の前に CloudFront を置きます。

---

## DNS（Cloudflare）

ドメイン `takuosblog.com` は Cloudflare Registrar で取得済みです。**Cloudflare Registrar で取得したドメインは、ネームサーバーを Cloudflare から変えられません**。そのため Route 53 は使わず、DNS も Cloudflare で管理します。

| レコード | 種類 | 向き先 | プロキシ |
| --- | --- | --- | --- |
| `takuosblog.com` | Vercel の画面に表示される値（A または CNAME） | Vercel | **オフ（DNS only）** |
| `api.takuosblog.com` | A | 本番 EC2 の Elastic IP | **オフ（DNS only）** |
| `stg.takuosblog.com` | CNAME | Vercel（`develop` ブランチ） | **オフ（DNS only）** |
| `api.stg.takuosblog.com` | A | ステージングの EC2 のパブリック IP（apply のたびに登録） | **オフ（DNS only）** |

- **プロキシ（オレンジの雲）は使わない**。Vercel は Cloudflare のプロキシを通さない設定を推奨している。API 側も、certbot が Let's Encrypt の証明書を直接取得できるように（HTTP-01 の確認が EC2 に届くように）、まずは DNS only にする
- Cloudflare のプロキシで API を守る構成（DDoS 対策・キャッシュ・オリジン証明書）は、必要になったら検討する
- Terraform の Cloudflare プロバイダーで `api` と `api.stg` のレコードを作る。Cloudflare の API トークンは、対象ゾーンの DNS 編集権限だけに絞り、GitHub Actions のシークレットに置く
- Vercel 向けのレコード（`takuosblog.com` と `stg.takuosblog.com`）は、Vercel の画面に表示される値を見て手で作ってもよい

---

## 環境変数と秘密情報

- 秘密情報（`APP_KEY`、`DB_PASSWORD`、`DB_ROOT_PASSWORD`、`FRONTEND_REVALIDATE_SECRET`）は SSM Parameter Store に SecureString で置く。`FRONTEND_REVALIDATE_SECRET` だけは Vercel の `REVALIDATE_SECRET` にも同じ値を入れる（[Vercel](#vercel)）
- EC2 の起動時とデプロイ時に Parameter Store から取り出し、EC2 上の `.env`（パーミッション 600）に書き出す。compose はそこから読む
- 秘密でない値（`APP_ENV=production`、`APP_DEBUG=false`、`LOG_LEVEL=warning` など）も同じ `.env` にまとめる
- `.env` も秘密情報もリポジトリには入れない

---

## 管理者アカウントの作成

本番でもステージングでも、**管理者はシーダーで作らず、Artisan コマンドを対話的に実行して作ります**。
固定のパスワードがコードやシーダーに残らないようにするためです（#80）。

```bash
# Session Manager で EC2 に接続してから実行する
docker compose -f docker-compose.prod.yml exec app php artisan user:create-admin
```

`user:create-admin` の仕様：

- 名前・メールアドレス・パスワードを対話的に聞く（メールアドレスと名前は引数でも渡せる）。パスワードは画面に表示せず、確認のためにもう一度入力させる
- パスワードをコマンドの引数やオプションでは受け取らない（シェルの履歴やプロセス一覧に残るため）
- メールアドレスの重複とパスワードの強さは、会員登録と同じルールで検証する
- `role` を `admin` にし、メールアドレスを確認済みにして作る（未確認だと、管理者もいいねできないため）

シーダーの扱い：

- `UserSeeder`（`admin@example.com` / `password` などの固定ユーザー）は `local` と `testing` でだけ動く。`DatabaseSeeder` もその環境でだけ呼び、ほかの環境で `--class` で直接指定すると中断する
- `DatabaseSeeder` は、マスタ（`MasterDataSeeder`：カテゴリとタグ）とサンプルの記事（`ArticleImageSeeder`）を入れる。ステージングでも使う。`ArticleImageSeeder` は既存の管理者を記事の作者にするので、**先に `user:create-admin` で管理者を作ってから**実行する（管理者がいないと中断する）
- 本番では `DatabaseSeeder` と `ArticleImageSeeder` は中断する。カテゴリとタグには管理画面が無いので、マスタだけを `php artisan db:seed --class=MasterDataSeeder --force` で入れる（何度実行しても重複しない）

---

## デプロイ

**フロントエンド**：`main` への push で Vercel が自動でビルド・デプロイする（`develop` はステージング。[ステージング環境](#ステージング環境)）。

**バックエンド**：GitHub Actions で行う。

1. OIDC で AWS のロール（本番は `github-deploy-prod`）を引き受ける（長期のアクセスキーは使わない）
2. `Dockerfile.prod` から `linux/arm64` のイメージをビルドし、コミットの SHA をタグにして ECR へ push する
3. SSM Run Command で、デプロイ用の SSM ドキュメント（`portfolio-deploy`）を EC2 に実行させる。ドキュメントの中身は次のとおり
   - Parameter Store から `.env` を作り直す
   - `docker compose -f docker-compose.prod.yml pull`
   - `docker compose -f docker-compose.prod.yml up -d`

`up -d` でコンテナが入れ替わる間、数秒だけ API が止まります。個人開発なので許容します。

**ロールバック**：前のコミットの SHA のイメージを指定して `up -d` し直す。マイグレーションは後方互換を保つように書く。

---

## ステージング環境

本番に出す前の確認用です。**常には置かず、確認したいときだけ `terraform apply` で作り、終わったら `destroy` で消します**。ドメインは新しく用意せず、本番のドメインのサブドメインを使います。

### 本番との違い

| 項目 | 本番 | ステージング |
| --- | --- | --- |
| 動かす期間 | 常時 | 必要なときだけ（apply → 確認 → destroy） |
| Terraform | `envs/prod` | `envs/stg` |
| フロントエンド | `takuosblog.com`（Vercel の Production、`main`） | `stg.takuosblog.com`（Vercel の Preview、`develop` ブランチに独自ドメインを割り当てる） |
| API | `api.takuosblog.com` | `api.stg.takuosblog.com` |
| VPC | `10.0.0.0/16` | `10.1.0.0/16`（本番とは別の VPC） |
| EC2 | t4g.micro + Elastic IP | t4g.micro。**Elastic IP は使わず**、自動で割り当てられるパブリック IP を apply のたびに Cloudflare の DNS へ登録する |
| DB | データ用 EBS に保存して残す | データ用 EBS は作らず、ルートの `/data` に置く。作るたびに空。管理者をコマンドで作り、サンプルデータをシーダーで入れる |
| S3 | 本番用バケット（CORS は `https://takuosblog.com`） | stg 用バケット（CORS は `https://stg.takuosblog.com`）。`force_destroy` で destroy のときに中身ごと消す。`next.config.ts` の `remotePatterns` にも追加する |
| ECR | 共有（`envs/shared`） | 共有。本番と同じイメージを使う |
| Parameter Store | `/portfolio/prod/*` | `/portfolio/stg/*`（`envs/shared` で管理し、destroy しても残す） |
| バックアップ・監視 | DLM・`mysqldump`・CloudWatch アラーム | なし（AWS Budgets はアカウント全体なので、ステージングの費用も対象になる） |

### 使い方

1. GitHub Actions の手動実行（`workflow_dispatch`、`github-terraform-stg` のロール）で `envs/stg` を `terraform apply` する
2. EC2 の起動後、`develop` の最新イメージを SSM Run Command でデプロイする（`migrate` まで行う）
3. Session Manager で接続し、`php artisan user:create-admin` で管理者を作ってから、サンプルデータを入れる（[管理者アカウントの作成](#管理者アカウントの作成)）
   - サンプルデータは `php artisan db:seed --force` で入れる。ステージング（`APP_ENV=staging`）では固定のパスワードのユーザーは作られない
4. 起動している間は、`develop` に push するたびに同じ手順でデプロイする。ステージングが無いときはデプロイを飛ばす（EC2 のタグで有無を確かめる）
5. 確認が終わったら、手動実行で `terraform destroy` する

### 環境変数

| 環境変数 | ステージングの値 |
| --- | --- |
| `APP_ENV` | `staging` |
| `APP_URL` | `https://api.stg.takuosblog.com` |
| `FRONTEND_URL` | `https://stg.takuosblog.com` |
| `SANCTUM_STATEFUL_DOMAINS` | `stg.takuosblog.com` |
| `SESSION_DOMAIN` | `.stg.takuosblog.com` |
| `SESSION_COOKIE` | `portfolio_stg_session`（本番のセッション Cookie と名前を変える） |

Vercel の Preview 環境には `NEXT_PUBLIC_API_BASE_URL=https://api.stg.takuosblog.com` を設定します。

### 注意点

- **ステージングはシークレットウィンドウ（または別のブラウザプロファイル）で開く**。本番の Cookie は `.takuosblog.com` に向けて発行されるため、`stg.takuosblog.com` にも送られる。本番にログインしたブラウザでステージングを開くと `XSRF-TOKEN` が2つ存在する状態になり、CSRF エラー（419）が起きることがある
- **TLS 証明書は作るたびに取り直す**。作るたびに certbot の初回の取得（`--standalone`）から行う。Let's Encrypt には同じホスト名の証明書を週5回までという発行制限があり、超えると最長1週間は取得できない。1週間に何度も作り直すときは気をつける。手順を試すだけなら、`--staging`（Let's Encrypt のテスト用の環境。ブラウザは信頼しない）で取得する
- **ステージングが無い間、`stg.takuosblog.com` は API につながらずエラーになる**。Vercel の Preview はそのまま残るが、気にしない
- **固定のパスワードの管理者を作らない**。`UserSeeder` は `admin@example.com` / `password` の管理者を作る。ステージングはインターネットに公開されるので、作ると誰でも管理者としてログインできてしまう。そのため `UserSeeder` は `local` と `testing` 以外では中断する（`APP_ENV` を `local` にしない）
- 作り直すたびに DB は空になるので、管理者もそのたびに `user:create-admin` で作る
- シーダーの画像（`ArticleImageSeeder`）は S3 ディスクに直接置く作りなので、stg バケットでもそのまま動く

---

## バックアップと監視

| 対象 | 方法 |
| --- | --- |
| データ用 EBS（MySQL のデータと証明書） | DLM で日次スナップショットを7世代残す。ルートボリュームは対象にしない（作り直せばよいため） |
| MySQL | systemd timer で毎日 `mysqldump --single-transaction` を取り、バックアップ用バケットに日付入りのキーで置く（スナップショットだけだと、書き込み途中の状態を拾う可能性があるため）。EC2 の権限は `s3:PutObject` だけにし、削除はライフサイクル（30日）に任せる。EC2 が乗っ取られても、バックアップを消されないようにするため |
| S3 の画像 | バージョニングは使わない（`images:prune` の論理削除の猶予期間で代わりにする） |
| 死活監視 | CloudWatch のステータスチェックのアラーム。通知先は SNS からメールに送る |
| CPU クレジット | CloudWatch の `CPUCreditBalance` のアラーム（Standard モードで遅くなる前に気づく） |
| 費用 | AWS Budgets（月 $20）。アカウント全体なので、ステージングの費用も含まれる |
| ログ | まずは `docker compose logs` で見る。必要になったら CloudWatch Logs に送る |

---

## セキュリティ

- SSH の 22 番は開けず、Session Manager で接続する
- IAM の権限は環境ごとに分ける。ステージングの EC2 やロールから、本番の Parameter Store・S3・EC2 に届かないようにする（[GitHub Actions のロール](#github-actions-のロール)）
- `envs/shared` と `envs/prod` は GitHub Actions から apply せず、手元から MFA 付きのユーザーで apply する
- IMDSv2 を必須にする
- EBS を暗号化する
- MySQL のポートはホストに公開しない（compose の `ports` を書かない）
- API には Laravel のレート制限をかける（いいね API には実装済み）
- `APP_DEBUG=false`
- Vercel の送信元 IP は固定されていないので、セキュリティグループで送信元を絞ることはできない

---

## 未決事項・今後の課題

対応する issue を末尾の括弧に書いています。

**インフラ（#53）**

- [ ] 本番用の `Dockerfile.prod`、`docker-compose.prod.yml`、entrypoint、nginx の設定（`prod.conf`）を作る（#53）
- [ ] certbot の初回の取得スクリプト（`renew --dry-run` まで）と、更新用の systemd timer を作る（#53）
- [ ] データ用 EBS のマウント（`user_data`）と、`mysqldump` の systemd timer を作る。`mysqldump` から復元する手順を一度試して、この設計書に書く（#53）
- [ ] Terraform のコード化。tfstate のバケットを手で作るか Terraform で作るかを決める（#53）
- [ ] ルートユーザーで「IAM ユーザーおよびロールによる請求情報へのアクセス」を有効にする（Budgets と Cost Explorer を IAM ユーザーで見るため）。`envs/shared` は手元から apply するので、GitHub Actions のロールに Budgets の権限は与えない（#53）
- [ ] Cloudflare の API トークン（DNS 編集権限だけのもの）を作り、GitHub Actions のシークレットに登録する（#53）
- [ ] GitHub Actions のデプロイワークフローを作る（#53）
- [ ] ステージングを作る・消すワークフロー（`workflow_dispatch`）を作る（#53）

**アプリ側**

- [x] `php artisan user:create-admin` を作る（#80、[管理者アカウントの作成](#管理者アカウントの作成)）
- [x] `DatabaseSeeder` が `local` と `testing` 以外で `UserSeeder` を呼ばないようにする（#80）
- [ ] `config('app.frontend_url')` を定義し、S3 の認証情報をインスタンスロールで取れるようにする（`ImageStorage` がアクセスキーを常に渡している）。本番用の環境変数の雛形を作る（#79）
- [ ] 本番のバケットを `next.config.ts` の `remotePatterns` に追加できるようにする。`NEXT_PUBLIC_API_BASE_URL` の未設定を本番のビルドで検出する（#85）
- [ ] API の全ルートで `StartSession` が動き、ログインと関係ない応答にもセッション Cookie が付く件（#87）
- [ ] メール送信の扱いを決める。`routes/auth.php` にはパスワードリセットとメール認証のルートがあるが、`MAIL_MAILER` は `log` のまま。本番で使うなら SES などを用意する（#81 で方針を決める）

**デプロイ後**

- [ ] アクセスが増えたら CloudFront を前に置く（画像の配信と API の保護のため）（issue なし）
