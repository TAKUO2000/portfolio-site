import ResetPasswordForm from "./ResetPasswordForm";

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
