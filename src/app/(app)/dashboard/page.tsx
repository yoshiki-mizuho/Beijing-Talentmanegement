import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const metrics = [
  { label: "メンバー", value: "Phase3", caption: "CRUD実装予定" },
  { label: "スキル", value: "Phase3", caption: "マスタ実装予定" },
  { label: "ロール", value: "Phase3", caption: "判定実装予定" },
  { label: "CSV", value: "Phase5", caption: "import/export強化予定" }
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">
          ダッシュボード
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Phase2ではアプリケーション基盤、認証、DB、CI/CD、Docker/Kubernetesの土台を確認します。
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardTitle>{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-cyan-800">
                {metric.value}
              </p>
              <p className="mt-1 text-sm text-slate-600">{metric.caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
