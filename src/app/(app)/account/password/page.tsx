import { PasswordForm } from "@/modules/auth/presentation/password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default function PasswordPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="パスワード変更"
        description="初期パスワードでログインした場合は、業務機能を利用する前にパスワード変更が必要です。"
      />

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
