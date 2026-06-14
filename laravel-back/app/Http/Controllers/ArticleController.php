<?php

namespace App\Http\Controllers;

use App\Http\Requests\DeleteArticleRequest;
use App\Http\Requests\IndexArticleRequest;
use App\Http\Requests\ShowArticleRequest;
use App\Http\Requests\StoreArticleRequest;
use App\Services\ArticleService;
use Illuminate\Http\JsonResponse;

class ArticleController extends Controller
{
    //CRUDの順で追加予定～
    public function __construct(private ArticleService $articleService) {}

    public function store(StoreArticleRequest $request): JsonResponse
    {
        $article = $this->articleService->store($request->user(), $request->validated());

        return response()->json($article, 201);
    }

    public function index(IndexArticleRequest $request): JsonResponse
    {
        $articles = $this->articleService->index($request->validated());

        return response()->json($articles);
    }

    public function show(ShowArticleRequest $request): JsonResponse
    {
        $articles = $this->articleService->show($request->validated()['id']);

        return response()->json($articles);
    }

    public function delete(DeleteArticleRequest $request): JsonResponse
    {
        $this->articleService->delete($request->validated()['id']);

        return response()->json(null, 204);
    }
}
