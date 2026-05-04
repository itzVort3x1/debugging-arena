import { Suspense } from "react";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "Register — Debugging Arena" };

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
