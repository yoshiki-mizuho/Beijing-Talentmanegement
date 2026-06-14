import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

type DevPlaceholderPageProps = {
  title: string;
  phase: string;
};

export function DevPlaceholderPage({ title, phase }: DevPlaceholderPageProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          この画面の業務機能は {phase} で実装します。
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Phase2の開発確認用プレースホルダー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            ルーティング、認証後レイアウト、モジュール境界、CI/CDとコンテナ起動の土台を確認します。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
