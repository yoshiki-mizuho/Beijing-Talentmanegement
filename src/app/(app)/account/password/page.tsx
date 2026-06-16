import { PasswordForm } from "@/modules/auth/presentation/password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

export default function PasswordPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">パスワード変更</h1>
        <p className="mt-1 text-sm text-slate-600">
          初期パスワードでログインした場合は、業務機能を利用する前にパスワード変更が必要です。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新しいパスワード</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
