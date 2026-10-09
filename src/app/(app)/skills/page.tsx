import {
  Activity,
  BookOpenCheck,
  FolderTree,
  Plus,
  Save,
  Sparkles,
  UsersRound
} from "lucide-react";

import { listSkillCategories, listSkills } from "@/modules/skills/application/skill-service";
import {
  createSkillAction,
  createSkillCategoryAction,
  deactivateSkillAction,
  deleteSkillCategoryAction,
  updateSkillAction,
  updateSkillCategoryAction
} from "@/modules/skills/presentation/actions";
import { canManageSkillMaster } from "@/modules/skills/presentation/skill-permissions";
import { SkillSearchTable } from "@/modules/skills/presentation/skill-search-table";
import { ActionForm } from "@/shared/ui/action-form";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormField, SelectField } from "@/shared/ui/form-field";
import { Metric } from "@/shared/ui/metric";
import { PageHeader } from "@/shared/ui/page-header";
import { SubmitButton } from "@/shared/ui/submit-button";
import { managerOrAdmin, requireRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const session = await requireRoles(managerOrAdmin);
  const canManageSkills = canManageSkillMaster(session.user.role);
  const [categories, skills] = await Promise.all([
    listSkillCategories(),
    listSkills()
  ]);
  const activeSkillCount = skills.filter((skill) => skill.isActive).length;
  const assignedMemberCount = skills.reduce(
    (total, skill) => total + skill._count.memberSkills,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="スキル管理"
        description="スキル体系とカテゴリを整備し、組織共通の評価基準を管理します。"
      />

      <section
        aria-label="スキル集計"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Metric
          label="登録スキル"
          value={skills.length}
          caption="有効・無効を含む"
          icon={BookOpenCheck}
          tone="teal"
        />
        <Metric
          label="有効なスキル"
          value={activeSkillCount}
          caption={`全体の ${skills.length === 0 ? 0 : Math.round((activeSkillCount / skills.length) * 100)}%`}
          icon={Activity}
          tone="green"
        />
        <Metric
          label="カテゴリ"
          value={categories.length}
          caption="表示順に整理"
          icon={FolderTree}
          tone="coral"
        />
        <Metric
          label="メンバー設定数"
          value={assignedMemberCount}
          caption="スキル保有の延べ件数"
          icon={UsersRound}
          tone="amber"
        />
      </section>

      {canManageSkills ? (
        <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ管理</CardTitle>
            <CardDescription>
              分析や検索に使うカテゴリ名と表示順を設定します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ActionForm
              action={createSkillCategoryAction}
              className="grid gap-3 border-y border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:grid-cols-[minmax(0,1fr)_7rem_auto]"
            >
              <FormField
                id="new-category-name"
                label="カテゴリ名"
                name="name"
                required
              />
              <FormField
                id="new-category-order"
                label="表示順"
                name="displayOrder"
                type="number"
                defaultValue={0}
                min={0}
                required
              />
              <div className="self-end">
                <SubmitButton pendingLabel="追加中…" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  追加
                </SubmitButton>
              </div>
            </ActionForm>

            {categories.length === 0 ? (
              <EmptyState
                icon={FolderTree}
                title="カテゴリがありません"
                description="最初のカテゴリを追加して、スキルを分類できる状態にしてください。"
              />
            ) : (
              <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_7rem_auto_auto] sm:items-end"
                  >
                    <ActionForm action={updateSkillCategoryAction} className="contents">
                      <input type="hidden" name="id" value={category.id} />
                      <FormField
                        id={`category-name-${category.id}`}
                        label="カテゴリ名"
                        name="name"
                        defaultValue={category.name}
                        required
                      />
                      <FormField
                        id={`category-order-${category.id}`}
                        label="表示順"
                        name="displayOrder"
                        type="number"
                        defaultValue={category.displayOrder}
                        min={0}
                        required
                      />
                      <SubmitButton pendingLabel="更新中…" variant="secondary">
                        <Save className="h-4 w-4" aria-hidden="true" />
                        更新
                      </SubmitButton>
                    </ActionForm>
                    <ActionForm
                      action={deleteSkillCategoryAction}
                      className="self-end"
                      confirm={{
                        title: "カテゴリを削除しますか",
                        description: `「${category.name}」を削除します。この操作は取り消せません。`,
                        confirmLabel: "削除する",
                        destructive: true
                      }}
                    >
                      <input type="hidden" name="id" value={category.id} />
                      <SubmitButton
                        pendingLabel="削除中…"
                        variant="destructive"
                        disabled={category._count.skills > 0}
                        title={
                          category._count.skills > 0
                            ? "配下にスキルがあるカテゴリは削除できません"
                            : "カテゴリを削除"
                        }
                      >
                        削除
                      </SubmitButton>
                    </ActionForm>
                    <p className="text-xs text-[var(--muted-foreground)] sm:col-span-4">
                      配下のスキル: {category._count.skills}件
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>新しいスキル</CardTitle>
            <CardDescription>
              スキルコードは登録時に自動で採番されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="先にカテゴリを登録してください"
                description="スキルを追加するには、所属先となるカテゴリが必要です。"
              />
            ) : (
              <ActionForm
                action={createSkillAction}
                className="grid gap-4 border-y border-[var(--border)] py-4 sm:grid-cols-2"
              >
                <FormField
                  id="new-skill-name"
                  label="スキル名"
                  name="name"
                  required
                />
                <SelectField
                  id="new-skill-category"
                  label="カテゴリ"
                  name="categoryId"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </SelectField>
                <FormField
                  id="new-skill-description"
                  label="説明"
                  name="description"
                  className="sm:col-span-2"
                />
                <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  登録後すぐに有効化する
                </label>
                <div className="flex items-center sm:justify-end">
                  <SubmitButton pendingLabel="登録中…" className="w-full sm:w-auto">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    スキルを登録
                  </SubmitButton>
                </div>
              </ActionForm>
            )}
          </CardContent>
        </Card>
        </section>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>スキル検索</CardTitle>
          <CardDescription>
            キーワード、カテゴリ、状態を組み合わせて登録済みスキルを確認します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SkillSearchTable initialSkills={skills} categories={categories} />
        </CardContent>
      </Card>

      {canManageSkills ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>スキル編集</CardTitle>
            <CardDescription>
              名称、カテゴリ、説明、公開状態をスキルごとに更新します。
            </CardDescription>
          </div>
          <Badge variant="neutral">{skills.length}件</Badge>
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <EmptyState
              icon={BookOpenCheck}
              title="編集できるスキルがありません"
              description="スキルを登録すると、ここから詳細を更新できます。"
            />
          ) : (
            <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="grid gap-3 py-5 md:grid-cols-2 xl:grid-cols-[8rem_minmax(10rem,1fr)_12rem_minmax(12rem,1.4fr)_7rem_auto_auto] xl:items-end"
                >
                  <ActionForm action={updateSkillAction} className="contents">
                    <input type="hidden" name="id" value={skill.id} />
                    <FormField
                      id={`skill-code-${skill.id}`}
                      label="コード"
                      name="code"
                      value={skill.code}
                      readOnly
                    />
                    <FormField
                      id={`skill-name-${skill.id}`}
                      label="スキル名"
                      name="name"
                      defaultValue={skill.name}
                      required
                    />
                    <SelectField
                      id={`skill-category-${skill.id}`}
                      label="カテゴリ"
                      name="categoryId"
                      defaultValue={skill.categoryId}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </SelectField>
                    <FormField
                      id={`skill-description-${skill.id}`}
                      label="説明"
                      name="description"
                      defaultValue={skill.description ?? ""}
                    />
                    <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={skill.isActive}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />
                      有効
                    </label>
                    <SubmitButton pendingLabel="更新中…" variant="secondary">
                      <Save className="h-4 w-4" aria-hidden="true" />
                      更新
                    </SubmitButton>
                  </ActionForm>
                  <ActionForm
                    action={deactivateSkillAction}
                    className="self-end"
                    confirm={{
                      title: "スキルを無効化しますか",
                      description: `「${skill.name}」を無効化します。既存の設定内容は保持されます。`,
                      confirmLabel: "無効化する",
                      destructive: true
                    }}
                  >
                    <input type="hidden" name="id" value={skill.id} />
                    <SubmitButton
                      pendingLabel="無効化中…"
                      variant="destructive"
                      disabled={!skill.isActive}
                    >
                      無効化
                    </SubmitButton>
                  </ActionForm>
                  <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)] md:col-span-2 xl:col-span-7">
                    <span>保有メンバー {skill._count.memberSkills}人</span>
                    <span aria-hidden="true">・</span>
                    <span>ロール要件 {skill._count.roleRequirements}件</span>
                    <Badge variant={skill.isActive ? "success" : "neutral"}>
                      {skill.isActive ? "有効" : "無効"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
