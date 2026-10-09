import {
  BarChart3,
  Grid3X3,
  Layers3,
  TrendingUp,
  UsersRound
} from "lucide-react";
import Link from "next/link";

import { getSkillMapPageData } from "@/modules/skill-map/application/skill-map-service";
import { SkillMapTable } from "@/modules/skill-map/presentation/skill-map-table";
import { buildSkillMapPresentation } from "@/modules/skill-map/presentation/skill-map-view-model";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Metric } from "@/shared/ui/metric";
import { PageHeader } from "@/shared/ui/page-header";
import { Select } from "@/shared/ui/select";

export const dynamic = "force-dynamic";

type SkillMapSearchParams = Promise<{
  q?: string | string[];
  department?: string | string[];
  category?: string | string[];
}>;

export default async function SkillMapPage({
  searchParams
}: {
  searchParams: SkillMapSearchParams;
}) {
  const params = await searchParams;
  const filters = {
    q: getSingleParam(params.q).trim(),
    departmentId: getSingleParam(params.department),
    categoryId: getSingleParam(params.category)
  };
  const { matrix, departments, categories } = await getSkillMapPageData(filters);
  const summary = buildSkillMapPresentation(matrix);
  const hasFilters = Boolean(filters.q || filters.departmentId || filters.categoryId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="分析"
        title="スキルマップ"
        description="メンバーとスキルの保有状況を横断し、組織の強みと育成余地を把握します。"
      />

      <Card>
        <CardContent className="pt-5">
          <form
            method="get"
            action="/skill-map"
            className="grid gap-4 bg-[var(--surface-subtle)] p-4 md:grid-cols-3 xl:grid-cols-[minmax(16rem,2fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_auto] xl:items-end"
          >
            <div>
              <Label htmlFor="skill-map-q">キーワード</Label>
              <Input
                id="skill-map-q"
                name="q"
                defaultValue={filters.q}
                placeholder="氏名、社員番号"
                className="mt-1 h-11 w-full"
              />
            </div>
            <div>
              <Label htmlFor="skill-map-department">部署</Label>
              <Select
                id="skill-map-department"
                name="department"
                defaultValue={filters.departmentId}
                className="mt-1 h-11"
              >
                <option value="">すべて</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="skill-map-category">カテゴリ</Label>
              <Select
                id="skill-map-category"
                name="category"
                defaultValue={filters.categoryId}
                className="mt-1 h-11"
              >
                <option value="">すべて</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="min-h-11">絞り込む</Button>
              {hasFilters ? (
                <Link
                  href="/skill-map"
                  className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  リセット
                </Link>
              ) : (
                <Button type="button" variant="ghost" className="min-h-11" disabled>
                  リセット
                </Button>
              )}
            </div>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {summary.memberCount}人・{summary.skillCount}スキル
            </span>
            {hasFilters ? <Badge variant="primary">条件適用中</Badge> : null}
          </div>
        </CardContent>
      </Card>

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
            見出しを押すと並べ替えられます。横スクロール中も社員番号と氏名は固定されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matrix.rows.length === 0 || matrix.skills.length === 0 ? (
            <EmptyState
              icon={Grid3X3}
              title={hasFilters ? "条件に一致するデータがありません" : "表示できるスキルマップがありません"}
              description={hasFilters
                ? "検索条件を変更するか、リセットして一覧を確認してください。"
                : "メンバーと有効なスキルが登録されると、ここに保有レベルが表示されます。"}
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

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
