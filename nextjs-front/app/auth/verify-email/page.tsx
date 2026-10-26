import type { Metadata } from "next";

import VerifyEmail from "./VerifyEmail";

export const metadata: Metadata = {
  title: "メールアドレスの確認",
};

export default function VerifyEmailPage() {
  return <VerifyEmail />;
}
