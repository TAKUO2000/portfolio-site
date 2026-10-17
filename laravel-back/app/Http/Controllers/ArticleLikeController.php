<?php

namespace App\Http\Controllers;

use App\Services\ArticleLikeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** 公開記事へのいいね。ログインしていれば管理者以外も使える */
class ArticleLikeController extends Controller
{
    public function __construct(private ArticleLikeService $likeService) {}

    /** ログイン中のユーザーがいいね済みか。記事詳細はSSRでCookieを持たないため別に返す */
    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json(['data' => $this->likeService->status($request->user(), $id)]);
    }

    public function store(Request $request, int $id): JsonResponse
    {
        return response()->json(['data' => $this->likeService->like($request->user(), $id)]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        return response()->json(['data' => $this->likeService->unlike($request->user(), $id)]);
    }
}
