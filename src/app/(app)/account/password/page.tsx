import { PasswordForm } from "@/modules/auth/presentation/password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { requireAuthenticatedMember } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const session = await requireAuthenticatedMember();
  const initialChange = session.user.passwordChangeRequired;
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title={initialChange ? "ようこそ。パスワードを決めましょう" : "パスワード変更"}
        description={initialChange ? "8文字以上。次回からこのパスワードでログインします。" : "現在のパスワードを確認して、新しいパスワードへ変更します。"}
      />

      <Card>
        {initialChange ? null : (
          <CardHeader>
            <CardTitle>新しいパスワード</CardTitle>
          </CardHeader>
        )}
        <CardContent className={initialChange ? "pt-5" : undefined}>
          <PasswordForm initialChange={initialChange} />
        </CardContent>
      </Card>
    </div>
  );
}
