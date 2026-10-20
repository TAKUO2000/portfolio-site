<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    /**
     * Mark the user's email address as verified.
     *
     * メールアプリなど、ログインしたのとは別のブラウザで開かれることがあるため、ログインは求めない。
     * 署名と、id・hash（メールアドレスのsha1）の一致で、そのメールを受け取った本人だと確かめる。
     * 結果はJSONではなくFEの画面で見せるため、無効なリンクでもFEへリダイレクトする。
     */
    public function __invoke(Request $request, string $id, string $hash): RedirectResponse
    {
        $user = User::find($id);

        if (! $request->hasValidSignature()
            || ! $user
            || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return $this->redirectToFrontend('invalid');
        }

        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return $this->redirectToFrontend('verified');
    }

    private function redirectToFrontend(string $status): RedirectResponse
    {
        return redirect()->away(config('app.frontend_url')."/auth/email-verified?status={$status}");
    }
}
