<?php

namespace App\Services;

use App\Http\Requests\GetImageUploadUrlRequest;
use App\Models\Article;
use App\Models\ArticleImage;
use App\Models\Reaction;
use App\Models\Tag;
use App\Models\User;
use App\Rules\ArticleImageKey;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ArticleService
{
    public function __construct(private readonly ImageStorage $imageStorage) {}

    public function store(User $user, array $data): Article
    {
        // 画像の移動はトランザクションの外。ストレージはロールバックできないため、
        // DB側が失敗して残ったオブジェクトはimages:pruneに回収させる
        $images = $this->publishImages(null, $data);

        return DB::transaction(function () use ($user, $data, $images) {
            $article = $user->articles()->create([
                'category_id'  => $data['category_id'],
                'title'        => $data['title'],
                'summary'      => $data['summary'],
                'body'         => $images['body'],
                'status'       => $data['status'],
                'published_at' => $data['status'] === 'published' ? Carbon::now() : null,
            ]);

            $article->tags()->sync($this->resolveTagIds($data));
            $this->syncImages($article, $images['header_key'], $images['body_keys']);

            // ArticleEditResourceが参照するリレーションを揃えてから返す
            return $article->load(['category', 'tags', 'images']);
        });
    }

    public function update(Article $article, array $data): Article
    {
        $images = $this->publishImages($article, $data);

        return DB::transaction(function () use ($article, $data, $images) {
            $article->update([
                'category_id'  => $data['category_id'],
                'title'        => $data['title'],
                'summary'      => $data['summary'],
                'body'         => $images['body'],
                'status'       => $data['status'],
                'published_at' => $this->publishedAtFor($article, $data['status']),
            ]);

            // syncなので、リクエストに含まれないタグは外れる
            $article->tags()->sync($this->resolveTagIds($data));
            $this->syncImages($article, $images['header_key'], $images['body_keys']);

            // ArticleEditResourceが参照するリレーションを揃えてから返す
            return $article->load(['category', 'tags', 'images']);
        });
    }

    /**
     * tagsの既存IDと、new_tagsから解決したIDをまとめて返す。
     * new_tagsは既存タグ（論理削除済み含む）に大文字小文字を無視して一致すればそれを再利用し、
     * 無ければ新規作成する
     */
    private function resolveTagIds(array $data): array
    {
        $tagIds = $data['tags'] ?? [];

        if (!empty($data['new_tags'])) {
            // 全角スペースを半角に正規化してからtrim（trim()は全角スペースを除去しないため）
            $normalizedNames = array_map(
                fn (string $name) => trim(str_replace('　', ' ', $name)),
                $data['new_tags']
            );

            // new_tags内での重複（大文字小文字・全角スペース差異込み）を正規化して除去
            $uniqueNamesByLower = [];
            foreach ($normalizedNames as $name) {
                $uniqueNamesByLower[mb_strtolower($name)] ??= $name;
            }
            $trimmedNames = array_values($uniqueNamesByLower);
            $lowerNames = array_keys($uniqueNamesByLower);

            // 大文字小文字を無視して既存タグ（論理削除済み含む）を一括取得（N+1回避）
            // lower_nameはDB側のLOWER()の結果をそのままキーに使う。PHPのmb_strtolower()で
            // 取得後に再計算すると、非ASCII文字でLOWER()の結果とズレてマップから引けなくなる
            // 恐れがあるため（DBのcollationは大文字小文字を区別しないutf8mb4_unicode_ci）
            $placeholders = implode(',', array_fill(0, count($lowerNames), '?'));
            $existingByLower = Tag::withTrashed()
                ->selectRaw('*, LOWER(name) AS lower_name')
                ->whereRaw("LOWER(name) IN ({$placeholders})", $lowerNames)
                ->get()
                ->keyBy('lower_name');

            foreach ($trimmedNames as $name) {
                $lowerName = mb_strtolower($name);
                $tag = $existingByLower[$lowerName] ?? null;

                if ($tag === null) {
                    try {
                        // 見つからなければ入力された表記のまま新規作成
                        $tag = Tag::create(['name' => $name]);
                    } catch (UniqueConstraintViolationException) {
                        // 一括取得後に別リクエストが同名タグを先に作成した場合（TOCTOU）は再取得して使う
                        $tag = Tag::withTrashed()
                            ->whereRaw('LOWER(name) = ?', [$lowerName])
                            ->firstOrFail();
                    }

                    $existingByLower[$lowerName] = $tag;
                }

                // 論理削除済みタグが同名で再登録された場合は復活させる
                if ($tag->trashed()) {
                    $tag->restore();
                }

                // 大文字小文字違いで既存タグに一致した場合は今回の表記に更新する
                if ($tag->name !== $name) {
                    $tag->update(['name' => $name]);
                }

                $tagIds[] = $tag->id;
            }
        }

        return $tagIds;
    }

    /**
     * 添付された画像を一時置き場から本置き場へ移し、本文中の参照も新しいキーに合わせる。
     *
     * 本文画像の一覧はクライアントから受け取らず、保存しようとしている本文から抽出する。
     * 本文と一覧を別々に受け取ると両者がズレる余地が生まれ、本文がまだ参照している画像を
     * images:pruneが削除してしまうため。
     *
     * @param  Article|null  $article  更新時のみ。既にこの記事が参照しているキーの判定に使う
     * @return array{header_key: string, body: string, body_keys: list<string>}
     */
    private function publishImages(?Article $article, array $data): array
    {
        $ownedKeys = $article === null
            ? []
            : $article->images()->pluck('object_key')->flip()->all();

        preg_match_all('#' . ArticleImageKey::PATTERN . '#', $data['body'], $matches);
        $bodyCandidates = array_unique($matches[0]);

        // 一時置き場の画像は、1つも動かす前にすべて確かめる。途中で見つからない画像があって
        // 422 にしたときに、先に移した画像だけが本置き場に残り、同じ内容で送り直すと今度はそれが
        // 「見つからない」になる、ということが起きないように。
        // 大きさと種類もここで確かめる（署名付きURLでは縛れないため。#129）
        // 確かめたときの中身の目印（キー => ETag）。移すときに、中身が同じときだけ移すのに使う。
        // ヘッダー画像と本文で同じ画像を使っていても、確かめるのは一度だけ
        $verified = [];
        foreach ([$data['header_image_key'] => 'header_image_key'] + array_fill_keys($bodyCandidates, 'body') as $key => $field) {
            $etag = $this->ensureUploaded($key, $field);
            if ($etag !== null) {
                $verified[$key] = $etag;
            }
        }

        // この保存で移したキー（一時置き場 => 本置き場）。ヘッダー画像と本文で同じ画像を使っていても、
        // 移すのは一度だけにする（二度目は移動元が無く失敗するため）
        $moved = [];

        // ヘッダー画像は本文外の明示的な項目なので、解決できなければ黙って捨てずに弾く
        $headerKey = $this->publishKey($data['header_image_key'], $ownedKeys, $verified, $moved, 'header_image_key');

        if ($headerKey === null) {
            throw ValidationException::withMessages([
                'header_image_key' => 'この記事の画像ではありません。',
            ]);
        }

        $body = $data['body'];
        $bodyKeys = [];

        // 同じ画像が複数回貼られていても移動は一度だけ（二度目は移動元が無く失敗するため）
        foreach ($bodyCandidates as $key) {
            $published = $this->publishKey($key, $ownedKeys, $verified, $moved, 'body');

            if ($published === null) {
                // 本文は自由記述なので、この記事のものでないキーはエラーにせず参照として扱わない。
                // 見た目も変えないため、記事の書き方（コードブロック内の例示など）を壊さずに済む
                continue;
            }

            $body = str_replace($key, $published, $body);
            $bodyKeys[] = $published;
        }

        return ['header_key' => $headerKey, 'body' => $body, 'body_keys' => $bodyKeys];
    }

    /**
     * 一時置き場のキーなら、ストレージにあるか、大きさと種類がアップロードの決まりに合っているかを確かめる。
     * 署名付きURLは大きさと種類を縛れないので、申告と違うファイル（大きすぎる、画像でない）が置かれうる。
     * 合っていなければ一時置き場から消し、公開される本置き場には移さない。
     * 本置き場のキーは、この記事のものかどうかを publishKey で判断するので、ここでは見ない
     */
    private function ensureUploaded(string $key, string $field): ?string
    {
        if (! str_starts_with($key, ImageStorage::TMP_PREFIX)) {
            return null;
        }

        $metadata = $this->imageStorage->metadata($key);

        if ($metadata === null) {
            throw $this->imageNotFound($field);
        }

        // キーの拡張子は、URL を発行したときに申告された種類から決めている（ImageController）
        $expectedType = array_search(
            pathinfo($key, PATHINFO_EXTENSION),
            GetImageUploadUrlRequest::EXTENSIONS_BY_MEDIA_TYPE,
            true,
        );

        // Content-Type は PUT した人が自由に決められるので、先頭のバイト（マジックナンバー）でも確かめる
        if (
            $metadata['size'] < 1
            || $metadata['size'] > GetImageUploadUrlRequest::MAX_FILE_SIZE_BYTES
            || $metadata['type'] !== $expectedType
            || ! self::hasImageSignature($expectedType, $this->imageStorage->readHead($key, 12))
        ) {
            $this->imageStorage->delete([$key]);

            throw ValidationException::withMessages([
                $field => '画像の形式か大きさが正しくありません（5MB 以下の JPEG・PNG・WebP・GIF）。もう一度アップロードしてください。',
            ]);
        }

        return $metadata['etag'];
    }

    /** ファイルの先頭のバイトが、その種類の画像のマジックナンバーで始まっているか */
    private static function hasImageSignature(string $type, string $head): bool
    {
        return match ($type) {
            'image/png'  => str_starts_with($head, "\x89PNG\r\n\x1a\n"),
            'image/jpeg' => str_starts_with($head, "\xFF\xD8\xFF"),
            'image/gif'  => str_starts_with($head, 'GIF87a') || str_starts_with($head, 'GIF89a'),
            'image/webp' => str_starts_with($head, 'RIFF') && substr($head, 8, 4) === 'WEBP',
            default      => false,
        };
    }

    private function imageNotFound(string $field): ValidationException
    {
        return ValidationException::withMessages([
            $field => '画像が見つかりません。時間がたって消えた可能性があるので、もう一度アップロードしてください。',
        ]);
    }

    /**
     * キーを本置き場のものに解決する。
     *
     * - 一時置き場のキー : 本置き場へ移して新しいキーを返す
     * - 本置き場のキー   : 既にこの記事が参照している場合だけ引き継ぐ。そうしないと
     *                      他の記事の画像を指定するだけで自分の記事に紐付けられてしまう
     *
     * 解決できなかった場合にエラーにするかは呼び出し側で決める。ヘッダー画像と本文とで
     * 扱いが違うため、その判断をここに持たせない。
     * ただし一時置き場のキーがストレージに無いとき（アップロードの失敗や期限切れ）は、どちらでも
     * バリデーションエラーにする。そのまま保存すると、読めない画像が記事に残るため
     *
     * @param  array<string, string>  $verified  確かめたときの中身の目印（一時置き場のキー => ETag）
     * @param  array<string, string>  $moved  この保存で移したキー（一時置き場 => 本置き場）。移したら書き足す
     */
    private function publishKey(string $key, array $ownedKeys, array $verified, array &$moved, string $field): ?string
    {
        if (str_starts_with($key, ImageStorage::TMP_PREFIX)) {
            if (isset($moved[$key])) {
                return $moved[$key];
            }

            $published = ImageStorage::IMAGE_PREFIX . substr($key, strlen(ImageStorage::TMP_PREFIX));

            try {
                $this->imageStorage->move($key, $published, $verified[$key] ?? null);
            } catch (ImageNotFoundException) {
                // 先に ensureUploaded で確かめているので、ここに来るのは、確かめたあとに消えたときだけ
                throw $this->imageNotFound($field);
            } catch (ImageChangedException) {
                // 確かめたあとに、署名付きURLで別のファイルに差し替えられた。確かめていない中身は公開しない
                throw ValidationException::withMessages([
                    $field => '画像がアップロードのあとに変わりました。もう一度アップロードしてください。',
                ]);
            }

            return $moved[$key] = $published;
        }

        return isset($ownedKeys[$key]) ? $key : null;
    }

    /**
     * 記事の画像をリクエストの内容に合わせる。
     * 参照されなくなった行は論理削除する（ストレージ上の実体はimages:pruneが回収する）
     *
     * @param  list<string>  $bodyKeys
     */
    private function syncImages(Article $article, string $headerKey, array $bodyKeys): void
    {
        $wanted = ["header|{$headerKey}" => ['type' => 'header', 'object_key' => $headerKey]];

        foreach ($bodyKeys as $key) {
            $wanted["body|{$key}"] = ['type' => 'body', 'object_key' => $key];
        }

        $current = $article->images()->get()->keyBy(
            fn (ArticleImage $image) => "{$image->type}|{$image->object_key}"
        );

        foreach ($current as $identity => $image) {
            if (!isset($wanted[$identity])) {
                $image->delete();
            }
        }

        foreach ($wanted as $identity => $attributes) {
            if (!$current->has($identity)) {
                $article->images()->create($attributes);
            }
        }
    }

    /**
     * 管理画面用に、そのユーザーが書いた記事を下書きも含めて返す。
     *
     * 読者向けのindexとは別にしているのは、公開記事だけを返す絞り込みが前提にあり、
     * そこに「自分の記事なら下書きも見せる」を混ぜると条件が絡み合うため。
     */
    public function mine(User $user, array $data): LengthAwarePaginator
    {
        $query = $this->mineQuery($user, $data)->with(['category', 'tags', 'headerImage']);

        if (!empty($data['status'])) {
            $query->where('status', $data['status']);
        }

        // 作成日の新しい順。更新日で並べると、一覧から公開状態を切り替えただけで
        // その記事が先頭へ移り、操作した行を見失うため。
        // 同時刻に作られた記事でもページをまたいで順序が揺れないよう、idで決着させる
        return $query->orderByDesc('created_at')->orderByDesc('id')->paginate($data['per_page'] ?? 15);
    }

    /**
     * 記事管理画面のステータス別の件数。
     *
     * 絞り込みボタンに添える件数なので、keywordは反映するがstatusでは絞らない。
     * 「下書き」を選んでいる間も、公開中の件数を出し続ける必要があるため。
     *
     * @return array{all: int, published: int, draft: int}
     */
    public function mineStatusCounts(User $user, array $data): array
    {
        $counts = $this->mineQuery($user, $data)
            ->toBase()
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        // 記事が1件も無いステータスはGROUP BYの結果に出てこないため、0で埋める
        $published = (int) ($counts['published'] ?? 0);
        $draft     = (int) ($counts['draft'] ?? 0);

        return ['all' => $published + $draft, 'published' => $published, 'draft' => $draft];
    }

    /** 一覧と件数で絞り込み条件を揃えるための共通部分 */
    private function mineQuery(User $user, array $data): HasMany
    {
        $query = $user->articles();

        if (!empty($data['keyword'])) {
            $query->where('title', 'like', '%' . $data['keyword'] . '%');
        }

        return $query;
    }

    /**
     * 記事のステータスだけを差し替える。
     *
     * 更新APIは全置換なので、一覧から下書き⇔公開を切り替えるだけでも本文やヘッダー画像を
     * 送る必要がある。一覧はそれらを持たないため、別の操作として切り出している。
     */
    public function updateStatus(Article $article, string $status): Article
    {
        $article->update([
            'status'       => $status,
            'published_at' => $this->publishedAtFor($article, $status),
        ]);

        return $article->load(['category', 'tags', 'headerImage']);
    }

    /**
     * 一度公開した記事の公開日時は維持する。
     * 下書きに戻して再公開しても初回公開日のままになる（編集のたびに一覧の並び順が
     * 変わらないようにするため）
     */
    private function publishedAtFor(Article $article, string $status): ?Carbon
    {
        if ($status === 'published' && $article->published_at === null) {
            return Carbon::now();
        }

        return $article->published_at;
    }

    public function index(array $data): LengthAwarePaginator
    {
        $query = Article::query()->where('status', 'published');

        if (!empty($data['keyword'])) {
            //記事件数が増えたら検索エンジンの導入検討
            $query->where('title', 'like', '%' . $data['keyword'] . '%');
        }

        if (!empty($data['categories'])) {
            $query->whereIn('category_id', $data['categories']);
        }

        if (!empty($data['tags'])) {
            $query->whereHas('tags', fn($q) => $q->whereIn('tags.id', $data['tags']));
        }

        if (!empty($data['author_id'])) {
            $query->where('user_id', $data['author_id']);
        }

        // nullの場合最近
        //最近、人気、以外のソートタイプ追加するかも
        if (empty($data['sort']) || $data['sort'] === 'latest') {
            $query->orderByDesc('published_at');
        } else if ($data['sort'] === 'popular') {
            $query->orderByDesc('like_count');
        }

        return $this->withLikeCount($query->with(['user', 'category', 'tags', 'headerImage']))
            ->paginate($data['per_page'] ?? 15);
    }

    public function show(int $id): Article
    {
        return $this->withLikeCount(
            Article::with(['user', 'category', 'tags', 'images'])->where('status', 'published')
        )->findOrFail($id);
    }

    private function withLikeCount(Builder $query): Builder
    {
        // reactionsにはbadやbookmarkも入るため、likeだけを数える
        return $query->withCount([
            'reactions as like_count' => fn(Builder $q) => $q->where('type', Reaction::TYPE_LIKE),
        ]);
    }

    public function delete(Article $article): void
    {
        $article->delete();
    }
}
