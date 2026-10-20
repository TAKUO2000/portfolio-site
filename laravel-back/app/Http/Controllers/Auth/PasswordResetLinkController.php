<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;

use function Illuminate\Support\defer;

class PasswordResetLinkController extends Controller
{
    /**
     * Handle an incoming password reset link request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        // 登録済みのときだけメール送信（SES）の時間がかかり、応答時間の差で登録の有無が分かってしまう。
        // そのため応答を返したあとに送る（php-fpmでは応答を先に返してから実行される。キューのワーカーは置かない）
        $credentials = $request->only('email');
        defer(fn () => Password::sendResetLink($credentials));

        // 未登録・再送の待ち時間中でも同じ応答にし、登録済みのメールアドレスかを判別できないようにする
        return response()->json(['status' => __('passwords.sent_if_registered')]);
    }
}
