import type { Metadata } from "next";

import SignIn from "./SignIn";

export const metadata: Metadata = {
  title: "サインイン",
};

export default function SignInPage() {
  return <SignIn />;
}
