import type { Metadata } from "next";

import ResetPasswordForm from "./ResetPasswordForm";

// URLに再設定トークンとメールアドレスが入るため、この画面から外へ出るリクエストにReferrerを付けない
export const metadata: Metadata = {
  title: "パスワードの再設定",
  referrer: "no-referrer",
};

// 再設定メールのリンク（BEのAppServiceProviderで組み立てる）から開く画面
export default async function PasswordReset({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await params;
  const { email } = await searchParams;

  return (
    <ResetPasswordForm
      token={token}
      initialEmail={typeof email === "string" ? email : ""}
    />
  );
}
