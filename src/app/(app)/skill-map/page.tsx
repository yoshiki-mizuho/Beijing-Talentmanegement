import {
  BarChart3,
  Grid3X3,
  Layers3,
  TrendingUp,
  UsersRound
} from "lucide-react";

import { getSkillMapMatrix } from "@/modules/skill-map/application/skill-map-service";
import { SkillMapTable } from "@/modules/skill-map/presentation/skill-map-table";
import { buildSkillMapPresentation } from "@/modules/skill-map/presentation/skill-map-view-model";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Metric } from "@/shared/ui/metric";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function SkillMapPage() {
  const matrix = await getSkillMapMatrix();
  const summary = buildSkillMapPresentation(matrix);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Analytics"
        title="スキルマップ"
        description="メンバーとスキルの保有状況を横断し、組織の強みと育成余地を把握します。"
      />

      <section
        aria-label="スキルマップ集計"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Metric
          label="対象メンバー"
          value={summary.memberCount}
          caption="スキルマップの集計対象"
          icon={UsersRound}
          tone="teal"
        />
        <Metric
          label="対象スキル"
          value={summary.skillCount}
          caption="有効なスキル"
          icon={Layers3}
          tone="coral"
        />
        <Metric
          label="設定済みセル"
          value={summary.assignedCount}
          caption={`全体の ${summary.coverageRate}%`}
          icon={Grid3X3}
          tone="green"
        />
        <Metric
          label="平均レベル"
          value={summary.averageLevel === null ? 0 : Number(summary.averageLevel.toFixed(1))}
          caption={summary.averageLevel === null ? "レベル設定なし" : "設定済みスキルの平均"}
          icon={TrendingUp}
          tone="amber"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>メンバー × スキル</CardTitle>
          <CardDescription>
            横にスクロールして各スキルを確認できます。未設定は「未設定」と表示します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matrix.rows.length === 0 || matrix.skills.length === 0 ? (
            <EmptyState
              icon={Grid3X3}
              title="表示できるスキルマップがありません"
              description="メンバーと有効なスキルが登録されると、ここに保有レベルが表示されます。"
            />
          ) : (
            <SkillMapTable matrix={matrix} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>スキル別サマリー</CardTitle>
            <CardDescription>
              保有人数と平均レベルを比較し、育成対象を見つけます。
            </CardDescription>
          </div>
          <Badge variant="neutral">{matrix.skillSummaries.length}スキル</Badge>
        </CardHeader>
        <CardContent>
          {matrix.skillSummaries.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="集計対象のスキルがありません"
              description="有効なスキルが登録されると、保有状況をスキル別に集計します。"
            />
          ) : (
            <div className="overflow-x-auto border-t border-[var(--border)]">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-[var(--surface-subtle)] text-left text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">スキル</th>
                    <th className="px-4 py-3 font-medium">カテゴリ</th>
                    <th className="px-4 py-3 text-right font-medium">保有人数</th>
                    <th className="px-4 py-3 text-right font-medium">平均レベル</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {matrix.skillSummaries.map((item) => {
                    const skill = matrix.skills.find(
                      (candidate) => candidate.id === item.skillId
                    );

                    return (
                      <tr key={item.skillId}>
                        <td className="max-w-72 px-4 py-3 font-medium text-[var(--foreground)]">
                          <span className="break-words">{skill?.name ?? "不明なスキル"}</span>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {skill?.category.name ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--foreground)]">
                          {item.holderCount}人
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.averageLevel === null ? (
                            <Badge variant="neutral">未設定</Badge>
                          ) : (
                            <span className="font-semibold tabular-nums text-[var(--primary)]">
                              Lv.{item.averageLevel.toFixed(1)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
