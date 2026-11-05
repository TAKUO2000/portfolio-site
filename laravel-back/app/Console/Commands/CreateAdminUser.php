<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules;

/**
 * 管理者アカウントを作る。
 *
 * role は fillable ではなく、会員登録から管理者になる経路は無い。本番で固定の
 * パスワードの管理者をシーダーで作らないよう、管理者はこのコマンドだけで作る。
 * パスワードを引数やオプションで受け取ると、シェルの履歴やプロセス一覧に残るため、
 * 対話入力でだけ受け取る。
 */
class CreateAdminUser extends Command
{
    protected $signature = 'user:create-admin
        {email? : 管理者のメールアドレス（省略すると対話的に聞く）}
        {name? : 管理者の名前（省略すると対話的に聞く）}';

    protected $description = '管理者アカウントを作る（パスワードは対話的に入力する）';

    public function handle(): int
    {
        $input = [
            'email'                 => $this->argument('email') ?? $this->ask('メールアドレス'),
            'name'                  => $this->argument('name') ?? $this->ask('名前'),
            'password'              => $this->secret('パスワード'),
            'password_confirmation' => $this->secret('パスワード（確認）'),
        ];

        // 会員登録（RegisteredUserController）と同じルールで検証する
        $validator = Validator::make($input, [
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:' . User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        $user = new User([
            'name'     => $input['name'],
            'email'    => $input['email'],
            'password' => $input['password'],
        ]);

        // 確認メールを経ずに作るので、確認済みにしておく。未確認のままだと、
        // 管理者もいいねできない（確認済みのユーザーに絞っているため）
        $user->forceFill([
            'role'              => 'admin',
            'email_verified_at' => Carbon::now(),
        ])->save();

        $this->info("管理者 {$user->email} を作りました。");

        return self::SUCCESS;
    }
}
