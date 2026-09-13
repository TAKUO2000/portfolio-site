<?php

namespace App\Services;

use App\Models\Article;
use App\Models\ArticleImage;
use App\Models\Tag;
use App\Models\User;
use App\Rules\ArticleImageKey;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
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

            return $article->load('tags');
        });
    }

    public function update(Article $article, array $data): Article
    {
        $images = $this->publishImages($article, $data);

        return DB::transaction(function () use ($article, $data, $images) {
            // 一度公開した記事の公開日時は維持する。下書きに戻して再公開しても初回公開日のまま
            $publishedAt = $article->published_at;

            if ($data['status'] === 'published' && $publishedAt === null) {
                $publishedAt = Carbon::now();
            }

            $article->update([
                'category_id'  => $data['category_id'],
                'title'        => $data['title'],
                'summary'      => $data['summary'],
                'body'         => $images['body'],
                'status'       => $data['status'],
                'published_at' => $publishedAt,
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

        // ヘッダー画像は本文外の明示的な項目なので、解決できなければ黙って捨てずに弾く
        $headerKey = $this->publishKey($data['header_image_key'], $ownedKeys);

        if ($headerKey === null) {
            throw ValidationException::withMessages([
                'header_image_key' => 'この記事の画像ではありません。',
            ]);
        }

        $body = $data['body'];
        $bodyKeys = [];

        preg_match_all('#' . ArticleImageKey::PATTERN . '#', $body, $matches);

        // 同じ画像が複数回貼られていても移動は一度だけ（二度目は移動元が無く失敗するため）
        foreach (array_unique($matches[0]) as $key) {
            $published = $this->publishKey($key, $ownedKeys);

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
     * キーを本置き場のものに解決する。
     *
     * - 一時置き場のキー : 本置き場へ移して新しいキーを返す
     * - 本置き場のキー   : 既にこの記事が参照している場合だけ引き継ぐ。そうしないと
     *                      他の記事の画像を指定するだけで自分の記事に紐付けられてしまう
     *
     * 解決できなかった場合にエラーにするかは呼び出し側で決める。ヘッダー画像と本文とで
     * 扱いが違うため、その判断をここに持たせない
     */
    private function publishKey(string $key, array $ownedKeys): ?string
    {
        if (str_starts_with($key, ImageStorage::TMP_PREFIX)) {
            $published = ImageStorage::IMAGE_PREFIX . substr($key, strlen(ImageStorage::TMP_PREFIX));

            $this->imageStorage->move($key, $published);

            return $published;
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
        return $query->withCount(['reactions as like_count']);
    }

    public function delete(Article $article): void
    {
        $article->delete();
    }
}
