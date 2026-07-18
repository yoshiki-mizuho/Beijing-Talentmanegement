import { getSkillMapMatrix } from "@/modules/skill-map/application/skill-map-service";
import { SkillMapTable } from "@/modules/skill-map/presentation/skill-map-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

export default async function SkillMapPage() {
  const matrix = await getSkillMapMatrix();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">スキルマップ</h1>
        <p className="mt-1 text-sm text-slate-600">
          メンバー別の保有スキルとレベルを横断的に確認します。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>対象メンバー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-cyan-800">
              {matrix.rows.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>対象スキル</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-cyan-800">
              {matrix.skills.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>設定済みセル</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-cyan-800">
              {matrix.rows.reduce(
                (count, row) =>
                  count +
                  row.levels.filter((level) => level.level !== null).length,
                0
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>メンバー x スキル</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillMapTable matrix={matrix} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>スキル別傾向</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {matrix.skillSummaries.map((summary) => {
            const skill = matrix.skills.find((item) => item.id === summary.skillId);

            return (
              <div key={summary.skillId} className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-950">{skill?.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  保有 {summary.holderCount}人 / 平均Lv.
                  {summary.averageLevel === null
                    ? "-"
                    : summary.averageLevel.toFixed(1)}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
