import { redirect } from "next/navigation";
import { Award, TrendingUp, Users } from "lucide-react";

import { LoginForm } from "@/modules/auth/presentation/login-form";
import { getCurrentSession } from "@/server/auth/session";

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen bg-[var(--background)] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="relative flex min-h-36 overflow-hidden bg-[linear-gradient(150deg,var(--primary)_0%,var(--primary-hover)_100%)] px-6 py-6 text-[var(--primary-foreground)] md:min-h-screen md:flex-col md:justify-between md:p-14">
        <div
          className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[var(--surface)]/5 md:-right-32 md:-top-32 md:h-[420px] md:w-[420px]"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-40 -left-20 hidden h-[360px] w-[360px] rounded-full bg-[var(--surface)]/5 md:block"
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3 text-xl font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface)] text-[19px] text-[var(--primary)]">
            T
          </span>
          TalentHub
        </div>
        <div className="relative ml-auto self-center text-right md:ml-0 md:max-w-[460px] md:self-auto md:text-left">
          <p className="text-lg font-bold leading-relaxed md:text-[34px] md:leading-[1.45]">
            スキルの成長を、
            <br className="hidden md:block" />
            チームの力に。
          </p>
          <div className="mt-9 hidden gap-3 md:flex" aria-hidden="true">
            {[
              { name: "growth", Icon: TrendingUp },
              { name: "badge", Icon: Award },
              { name: "team", Icon: Users }
            ].map(({ name, Icon }) => (
              <span
                key={name}
                className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--primary-foreground)]/30 bg-[var(--primary-foreground)]/15"
              >
                <Icon className="h-[22px] w-[22px]" />
              </span>
            ))}
          </div>
        </div>
        <p className="relative hidden text-xs opacity-70 md:block">© TalentHub</p>
      </section>
      <section className="grid place-items-center px-6 py-12 md:px-10">
        <div className="w-full max-w-[380px]">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
