import { redirect } from "next/navigation";

import { LoginForm } from "@/modules/auth/presentation/login-form";
import { getCurrentSession } from "@/server/auth/session";

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-6">
          <p className="text-sm font-medium text-cyan-800">Talent Management</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            ログイン
          </h1>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
