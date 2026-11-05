import type { Metadata } from "next";

import SignUp from "./SignUp";

export const metadata: Metadata = {
  title: "サインアップ",
};

export default function SignUpPage() {
  return <SignUp />;
}
