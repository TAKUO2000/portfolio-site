import type { Metadata } from "next";

import ForgotPassword from "./ForgotPassword";

export const metadata: Metadata = {
  title: "パスワードの再設定",
};

export default function ForgotPasswordPage() {
  return <ForgotPassword />;
}
