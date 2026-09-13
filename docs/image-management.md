# 画像管理の仕組み

記事に添付する画像を、ストレージ（S3 / MinIO）と DB でどう管理しているかをまとめます。

## 目次

- [解決したかった問題](#解決したかった問題)
- [全体像](#全体像)
- [DB は「キー」だけを持つ](#db-はキーだけを持つ)
- [tmp/ と images/](#tmp-と-images)
- [アップロードから保存までの流れ](#アップロードから保存までの流れ)
- [未使用画像の削除（images:prune）](#未使用画像の削除imagesprune)
- [設定](#設定)
- [本番で必要な準備](#本番で必要な準備)
- [関連ファイル](#関連ファイル)
- [既知の制約・今後の課題](#既知の制約今後の課題)

---

## 解決したかった問題

改修前は、次の3つが同時に起きていました。

### 1. DB にフルURLを保存していた

`article_images.url` に `http://localhost:9002/portfolio-images/images/xxx.png` がそのまま入っていました。

- MinIO から本番 S3 に移る、バケット名を変える、CloudFront を挟む → **既存レコードが全部壊れる**
- そのせいで「URL のホストが許可されたものか」を検証するルール（`AllowedImageHost`）が必要だった
- ストレージ上の実体（オブジェクトキー）と DB のレコードを突き合わせるのに、毎回 URL をパースする必要があった

### 2. 孤児オブジェクトが構造的に発生していた

画像が不要になる経路は複数あり、そのすべてを発生時点で捕まえることはできません。

| 経路 | 発生時点で検知できるか |
| --- | --- |
| 署名付きURLでアップロードしたが、記事を保存せずブラウザを閉じた | **できない**（サーバーは離脱を知る手段がない） |
| 記事を削除した | できる |
| 記事本文から画像を1つ消した | できる（更新APIを作れば） |

1つ目は原理的にサーバーから検知できません。そして誰も「ストレージにあるが DB にない」オブジェクトを掃除していませんでした。

### 3. 記事を削除してもストレージには残り続けた

`ArticleImage` は論理削除（`SoftDeletes`）なので、記事を消してもストレージ側は何も起きません。

---

## 全体像

```
        ブラウザ                      Laravel                     ストレージ
           │                            │                        (S3 / MinIO)
           │  ① 署名付きURLを要求        │                             │
           ├───────────────────────────>│                             │
           │  ② upload_url + object_key │                             │
           │<───────────────────────────┤                             │
           │                            │                             │
           │  ③ 画像を直接PUT ────────────────────────────────────────>│ tmp/uuid.png
           │                            │                             │
           │  ④ 記事を保存(object_key)   │                             │
           ├───────────────────────────>│  ⑤ tmp/ → images/ へ移動     │
           │                            ├────────────────────────────>│ images/uuid.png
           │                            │  ⑥ object_key を DB に保存   │
           │                            │                             │
           │                            │                             │
   （毎日4:00）                          │  images:prune               │
                                        ├────────────────────────────>│ 未参照のものを削除
                                        │                             │
                                        │  ライフサイクルルール         │
                                        │                          tmp/ は1日で自動削除
```

画像の実体はストレージにあり、DB はそれを指す**キーだけ**を持ちます。両者がズレた分（＝どこからも参照されていない実体）は、後から突き合わせて回収します。

---

## DB は「キー」だけを持つ

`article_images` テーブル:

| カラム | 例 | 説明 |
| --- | --- | --- |
| `object_key` | `images/0f9a...c1.png` | ストレージ上のオブジェクトキー |
| `type` | `header` / `body` | ヘッダー画像か本文画像か |

表示用URLは保存せず、**実行時に組み立てます**。

```php
// app/Models/ArticleImage.php
protected function url(): Attribute
{
    return Attribute::get(
        fn (): string => app(ImageStorage::class)->objectUrl($this->object_key)
    );
}
```

`ImageStorage::objectUrl()` は `filesystems.disks.s3` の設定値から URL を作るため、パススタイル（MinIO）と仮想ホストスタイル（実 S3）の差は AWS SDK が吸収します。

| 環境 | 同じ `object_key` から生成されるURL |
| --- | --- |
| ローカル（MinIO） | `http://localhost:9002/portfolio-images/images/xxx.png` |
| 本番（AWS S3） | `https://<bucket>.s3.<region>.amazonaws.com/images/xxx.png` |

### これで得られたこと

- **環境・ドメイン変更に強い**: エンドポイントやバケットを変えても DB に手を入れなくてよい
- **バリデーションが単純になった**: ホストの許可リスト（`AllowedImageHost`）が不要になり、「アプリが発行したキーの形式か」という正規表現1本（`ArticleImageKey`）で済む
- **突き合わせが可能になった**: ストレージのキー集合と DB のキー集合をそのまま比較できる ← 未使用画像の削除が成り立つ土台

---

## tmp/ と images/

オブジェクトは用途で2つのプレフィックスに分かれます。

| プレフィックス | 中身 | 消え方 |
| --- | --- | --- |
| `tmp/` | アップロード直後の一時置き場 | ストレージのライフサイクルルールで **1日後に自動削除** |
| `images/` | 記事に添付された本置き場 | `images:prune` が未参照のものを削除 |

分けている理由は、**「記事を保存せず離脱した」分をコードを書かずに回収するため**です。アップロード先を最初から `tmp/` にしておけば、記事に添付されなかったものは `tmp/` に残り続け、ストレージ側のライフサイクルルールが勝手に消してくれます。

```
アップロード ──> tmp/uuid.png
                    │
                    ├── 記事が保存された ──> images/uuid.png へ移動（DBから参照される）
                    │
                    └── 離脱した ─────────> tmp/ に残る ──> 1日後に自動削除
```

---

## アップロードから保存までの流れ

### ① 署名付きURLの発行（`POST /api/images/upload-url`）

```php
// app/Http/Controllers/ImageController.php
$key = ImageStorage::TMP_PREFIX . Str::uuid() . '.' . $request->extension();
```

レスポンス:

```json
{
  "upload_url": "http://localhost:9002/portfolio-images/tmp/xxx.png?X-Amz-Signature=...",
  "object_key": "tmp/xxx.png",
  "image_url":  "http://localhost:9002/portfolio-images/tmp/xxx.png"
}
```

| フィールド | 用途 |
| --- | --- |
| `upload_url` | ブラウザが画像を直接 PUT する先（15分で失効） |
| `object_key` | 記事保存時に API へ渡すキー |
| `image_url` | 入力中のプレビュー表示用（一時置き場のURL） |

**拡張子はファイル名ではなく `media_type` から決めます。** アップロード元のファイル名を信用すると `photo.php` のような拡張子がキーに入り込むため、検証済みのメディアタイプから引き当てています。

```php
// app/Http/Requests/GetImageUploadUrlRequest.php
public const EXTENSIONS_BY_MEDIA_TYPE = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    'image/gif'  => 'gif',
];
```

これにより、キーの形式は常に `tmp/{uuid}.{jpg|png|webp|gif}` に固定されます。

### ② ブラウザからの直接アップロード

署名付きURLには `ContentLength` も含めているため、バリデーション済みのサイズと違うファイルを PUT しようとすると署名不一致で拒否されます。

アップロードは**フォーム送信の直前**に行います（選択・貼り付け時ではありません）。入力が長引いたときに署名付きURLの有効期限（15分）が切れるのを避けるためです。また、本文から削除された貼り付け画像は、そもそもアップロードされません。

```ts
// nextjs-front/app/articles/new/page.tsx
const usedImages = pendingImages.filter((img) => body.includes(img.blobUrl));
```

### ③ 記事の保存（`POST /api/articles`）

フロントは URL ではなく**キー**を送ります。

```json
{
  "title": "...",
  "body": "本文 ![](http://localhost:9002/portfolio-images/tmp/xxx.png)",
  "header_image_key": "tmp/yyy.png"
}
```

**本文画像の一覧は送りません。** サーバーが保存しようとしている本文から抽出します（後述）。

キーは `ArticleImageKey` ルールで形式を検証します。

```php
// app/Rules/ArticleImageKey.php
public const PATTERN = '(?:tmp\/{uuid}|images\/[0-9A-Za-z_-]+)\.(?:jpg|png|webp|gif)';
```

`images/` 配下のキーも形式としては通りますが（更新時にヘッダー画像を据え置く場合に必要）、**その記事が既に参照しているキーかどうかをサービス層が照合します**。他の記事の画像を指定しても弾かれます。`../` のようなパス操作は形式の時点で弾かれます。

### ④ サーバー側の処理

```php
// app/Services/ArticleService.php
preg_match_all('#' . ArticleImageKey::PATTERN . '#', $body, $matches);

foreach (array_unique($matches[0]) as $key) {
    $published = $this->publishKey($key, $ownedKeys, null);

    if ($published === null) {
        continue;   // この記事のものでないキーは参照として扱わない
    }

    $body = str_replace($key, $published, $body);   // 本文中の参照も書き換える
    $bodyKeys[] = $published;
}
```

`publishKey()` は `tmp/xxx.png` を `images/xxx.png` へ移動して新しいキーを返します。S3 にはリネームが無いため、実装はコピー＋削除です。

`images/` のキーは、**その記事が既に参照している場合だけ**引き継ぎます。そうでないものは本文の見た目を変えずに無視します（記事内のコードブロックにキーらしき文字列を書いても保存が失敗しないように）。

**本文の書き換えが必要な理由**: 本文には貼り付け時点の一時置き場のURLが埋まっています。移動しただけでは本文中の参照が `tmp/` を指したままになり、1日後にライフサイクルルールで消えて画像が壊れます。キー部分は URL の中の `tmp/xxx.png` という部分文字列なので、`str_replace` でホストに依存せず置換できます。

同じ画像が本文に複数回貼られている場合、移動は `array_unique` で一度だけ行います（2回目は移動元が既に無く失敗するため）。

### 更新時（`PUT /api/articles/{id}`）

本文には、前回の保存で本置き場へ移された `images/` のキーが既に入っています。作成時と同じ処理で扱えるよう、キーの解決は2通りに分かれます。

| 本文中のキー | 扱い |
| --- | --- |
| `tmp/xxx.png` | 本置き場へ移し、本文の参照を書き換える（新しく貼られた画像） |
| `images/xxx.png` でこの記事が参照済み | そのまま引き継ぐ |
| `images/xxx.png` でこの記事のものでない | 参照として登録しない。本文はそのまま |

最後の行が重要です。他の記事の画像キーを本文に書いても自分の記事には紐付きません。かといってエラーにもしないのは、記事本文にキーらしき文字列（このドキュメントのような解説記事）を書けなくなるのを避けるためです。

ヘッダー画像は本文外の明示的な項目なので、この記事のものでないキーを指定した場合は 422 で弾きます。

参照が外れた画像の行は論理削除され、ストレージ上の実体は `images:prune` が回収します。

### 失敗したときどうなるか

| 失敗箇所 | 結果 |
| --- | --- |
| 移動に失敗 | 例外が伝播して記事が保存されない。`tmp/` の画像は1日後に自動削除される |
| 移動後、DB保存に失敗 | トランザクションがロールバックされ記事は残らない。`images/` に参照されないオブジェクトが残るが、`images:prune` が回収する |

つまり、どちらに転んでも**ゴミは最終的に回収されます**。これが「後追いで掃除する」方式にしている理由でもあります。

---

## 未使用画像の削除（`images:prune`）

```bash
docker compose exec app php artisan images:prune --dry-run  # 対象の確認のみ
docker compose exec app php artisan images:prune            # 実際に削除
```

スケジューラに登録済みで、毎日 4:00 に自動実行されます（`routes/console.php`）。

### 判定ロジック

```
【本置き場 images/】
  ストレージにある
    かつ DBのどの article_images からも参照されていない
    かつ 最終更新から24時間以上経過している        → 削除

【一時置き場 tmp/】
  最終更新から24時間以上経過している               → 削除
```

`tmp/` はストレージのライフサイクルルールでも消えますが、ルールが未設定の環境でも溜まらないよう、コマンド側でも回収しています。

### 「参照されている」の判定

論理削除されていても、猶予期間内なら復元される可能性があるため保護します。

```php
// app/Console/Commands/PruneUnusedImages.php
ArticleImage::withTrashed()
    ->join('articles', 'articles.id', '=', 'article_images.article_id')
    ->where(fn ($q) => $q->whereNull('article_images.deleted_at')
                         ->orWhere('article_images.deleted_at', '>', $retentionThreshold))
    ->where(fn ($q) => $q->whereNull('articles.deleted_at')
                         ->orWhere('articles.deleted_at', '>', $retentionThreshold))
    ->pluck('article_images.object_key');
```

記事側・画像側のどちらの `deleted_at` も見るのは、Laravel の論理削除が親子でカスケードしないためです（記事を消しても `article_images` の行は生きたまま残ります）。

### 24時間の猶予がある理由

記事の保存処理は「`images/` へ移動 → DB にコマット」の順で進みます。この間にコマンドが走ると、まだ DB に無いオブジェクトを「未参照」と判定して消してしまいます。最終更新からの猶予時間はこの競合に対する安全域です。

### 削除の流れの例

```
ストレージ                              DB(article_images)
  images/aaa.png  (30日前)   ←──────── images/aaa.png     ... 参照あり → 残す
  images/bbb.png  (30日前)                                ... 参照なし → 削除
  images/ccc.png  (1時間前)                               ... 猶予内   → 残す
  tmp/ddd.png     (2日前)                                 ... 期限切れ → 削除
  tmp/eee.png     (たった今)                              ... 猶予内   → 残す
```

---

## 設定

`config/images.php`

| 設定（環境変数） | 既定値 | 意味 |
| --- | --- | --- |
| `IMAGE_DELETED_ARTICLE_RETENTION_DAYS` | 30 | 論理削除された記事の画像を残す日数。この期間内に記事を復元すれば画像も元通りになる |
| `IMAGE_ORPHAN_GRACE_HOURS` | 24 | 最終更新からこの時間内のオブジェクトを削除対象外にする安全域 |

ストレージの接続設定は `filesystems.disks.s3` です。

| 設定 | ローカル（MinIO） | 本番（AWS S3） |
| --- | --- | --- |
| `AWS_ENDPOINT` | `http://minio:9000`（コンテナ内から見たMinIO） | 空 |
| `AWS_PUBLIC_ENDPOINT` | `http://localhost:9002`（ブラウザから見たMinIO） | 空 |
| `AWS_USE_PATH_STYLE_ENDPOINT` | `true` | `false` |

`ImageStorage` はこの2つのエンドポイントに応じて、内部で S3 クライアントを2つ使い分けます。

| クライアント | 使うエンドポイント | 用途 |
| --- | --- | --- |
| public | `AWS_PUBLIC_ENDPOINT` 優先 | 署名付きURL・表示用URLの組み立て（ブラウザが到達できる必要がある） |
| server | `AWS_ENDPOINT` 優先 | コピー・列挙・削除（サーバーから到達できる必要がある） |

ローカルでこれを分けないと、コンテナ内から `localhost:9002` へ接続しようとして失敗します。なお署名付きURLはホスト名も署名対象に含まれるため、発行後にホストを差し替えることはできません。

---

## 本番で必要な準備

1. **スケジューラの起動**

   ```bash
   php artisan schedule:work
   # または cron から毎分
   * * * * * cd /path/to/app && php artisan schedule:run >> /dev/null 2>&1
   ```

2. **S3 バケットのライフサイクルルール**

   `tmp/` プレフィックスに、有効期限1日のルールを設定します。未設定でも `images:prune` が回収しますが、実行間隔のぶん滞留します。

   ローカルの MinIO では `docker-compose.yml` の `minio-init` が自動設定します。

---

## 関連ファイル

| ファイル | 役割 |
| --- | --- |
| `app/Services/ImageStorage.php` | ストレージへのアクセス全般（署名付きURL、表示用URL、移動、列挙、削除） |
| `app/Http/Controllers/ImageController.php` | 署名付きURLの発行 |
| `app/Http/Requests/GetImageUploadUrlRequest.php` | メディアタイプ・サイズの検証と拡張子の決定 |
| `app/Rules/ArticleImageKey.php` | 記事に添付するキーの形式検証 |
| `app/Services/ArticleService.php` | `tmp/` → `images/` の移動、本文の書き換え、レコード作成 |
| `app/Models/ArticleImage.php` | キーから表示用URLを組み立てるアクセサ |
| `app/Console/Commands/PruneUnusedImages.php` | 未使用画像の削除 |
| `config/images.php` | 猶予期間の設定 |
| `tests/Support/FakeImageStorage.php` | テスト用のメモリ上ストレージ |
| `docker-compose.yml` (`minio-init`) | バケット作成・公開設定・ライフサイクルルール |

### テスト

| ファイル | 内容 |
| --- | --- |
| `tests/Feature/ImageUploadUrlTest.php` | 署名付きURLの発行、`tmp/` への払い出し、拡張子の決定 |
| `tests/Feature/ArticleTest.php` | キーの保存、`tmp/` → `images/` の移動、本文の書き換え、キー形式の検証 |
| `tests/Feature/PruneUnusedImagesTest.php` | 削除の判定（参照あり／なし、猶予期間、論理削除、dry-run） |

テストでは `fakeImageStorage()` でストレージをメモリ上のフェイクに差し替えます。URLの組み立ては設定値だけで完結し通信しないため、実際に S3 を叩くコピー・列挙・削除だけを差し替えています。

```php
$storage = fakeImageStorage();
$storage->put('tmp/xxx.png', Carbon::now()->subDays(2));  // 古いオブジェクトを再現
// ...
expect($storage->keys())->toBe([...]);                    // 残ったキーを検証
```

---

## 既知の制約・今後の課題

### ArticleResource のハードコードURL

`app/Http/Resources/ArticleResource.php` のヘッダー画像フォールバックに、旧開発用バケットの URL が直接書かれています。

```php
'header_image' => $this->headerImage?->url ?? 'https://takuo-portfolio-develop-bucket-....s3....amazonaws.com/test.png',
```

今回の改修対象外ですが、同じ理由（環境依存のURLをコードに埋める）でいずれ壊れます。

### ストレージ側の削除失敗

`images:prune` は削除に失敗した場合に例外が伝播して終了します。次回実行時に再度対象になるため、実害は「その回の残りが処理されない」ことです。件数が増えてきたら、失敗を記録して続行する形に変える余地があります。
