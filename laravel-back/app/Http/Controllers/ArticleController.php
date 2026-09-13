<?php

namespace App\Http\Controllers;

use App\Http\Requests\IndexArticleRequest;
use App\Http\Requests\IndexMyArticleRequest;
use App\Http\Requests\ShowArticleRequest;
use App\Http\Requests\StoreArticleRequest;
use App\Http\Requests\UpdateArticleRequest;
use App\Http\Requests\UpdateArticleStatusRequest;
use App\Http\Resources\ArticleDetailResource;
use App\Http\Resources\ArticleEditResource;
use App\Http\Resources\ArticleResource;
use App\Http\Resources\MyArticleResource;
use App\Models\Article;
use App\Services\ArticleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class ArticleController extends Controller
{
    //CRUDの順で追加予定～
    public function __construct(private ArticleService $articleService) {}

    public function store(StoreArticleRequest $request): JsonResponse
    {
        $article = $this->articleService->store($request->user(), $request->validated());

        return response()->json($article, 201);
    }

    public function index(IndexArticleRequest $request): AnonymousResourceCollection
    {
        $articles = $this->articleService->index($request->validated());

        return ArticleResource::collection($articles);
    }

    public function show(ShowArticleRequest $request): ArticleDetailResource
    {
        $article = $this->articleService->show($request->validated()['id']);

        return new ArticleDetailResource($article);
    }

    /** 記事管理画面の一覧。自分が書いた記事を下書きも含めて返す */
    public function mine(IndexMyArticleRequest $request): AnonymousResourceCollection
    {
        $articles = $this->articleService->mine($request->user(), $request->validated());

        return MyArticleResource::collection($articles);
    }

    /** 編集フォームの初期値。公開・下書きのどちらも返す */
    public function edit(Article $article): ArticleEditResource
    {
        // 記事の存在チェックはルートモデルバインディングが担う（未存在・論理削除済みは404）
        Gate::authorize('update', $article);

        return new ArticleEditResource($article->load(['category', 'tags', 'images']));
    }

    /** 一覧からの下書き⇔公開の切り替え */
    public function updateStatus(UpdateArticleStatusRequest $request, Article $article): MyArticleResource
    {
        $updated = $this->articleService->updateStatus($article, $request->validated()['status']);

        return new MyArticleResource($updated);
    }

    public function update(UpdateArticleRequest $request, Article $article): ArticleEditResource
    {
        $updated = $this->articleService->update(
            $article,
            $request->validated()
        );

        return new ArticleEditResource($updated);
    }

    public function destroy(Article $article): JsonResponse
    {
        // 記事の存在チェックはルートモデルバインディングが担う（未存在・論理削除済みは404）
        Gate::authorize('delete', $article);

        $this->articleService->delete($article);

        return response()->json(null, 204);
    }
}
