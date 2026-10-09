"use client";

import { FolderTree, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createSkillAction,
  createSkillCategoryAction,
  deleteSkillCategoryAction,
  updateSkillCategoryAction
} from "@/modules/skills/presentation/actions";
import { ActionForm, ConfirmSubmitButton } from "@/shared/ui/action-form";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormField, SelectField, TextareaField } from "@/shared/ui/form-field";
import { PageHeader } from "@/shared/ui/page-header";
import { SubmitButton } from "@/shared/ui/submit-button";

type SkillCategory = {
  id: string;
  name: string;
  displayOrder: number;
  _count: { skills: number };
};

export function SkillPageHeader({
  categories,
  canManage
}: {
  categories: SkillCategory[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const refresh = () => router.refresh();

  return (
    <>
      <PageHeader
        title="スキル管理"
        description="スキル体系とカテゴリを整備し、組織共通の評価基準を管理します。"
        actions={
          canManage ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setCategoriesOpen(true)}>
                <FolderTree className="h-4 w-4" aria-hidden="true" />
                カテゴリを管理
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                スキルを追加
              </Button>
            </div>
          ) : undefined
        }
      />

      {canManage ? (
        <>
          <Dialog
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            title="スキルを追加"
            description="スキルコードは登録時に自動で採番されます。"
          >
            {categories.length === 0 ? (
              <EmptyState
                icon={FolderTree}
                title="先にカテゴリを登録してください"
                description="スキルを追加するには、所属先となるカテゴリが必要です。"
              />
            ) : (
              <ActionForm
                action={createSkillAction}
                className="space-y-4"
                onSuccess={() => {
                  setCreateOpen(false);
                  refresh();
                }}
              >
                <FormField
                  id="create-skill-name"
                  label="スキル名"
                  name="name"
                  required
                />
                <SelectField
                  id="create-skill-category"
                  label="カテゴリ"
                  name="categoryId"
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </SelectField>
                <TextareaField
                  id="create-skill-description"
                  label="説明"
                  name="description"
                />
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  登録後すぐに有効化する
                </label>
                <div className="flex justify-end">
                  <SubmitButton pendingLabel="登録中…">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    スキルを追加
                  </SubmitButton>
                </div>
              </ActionForm>
            )}
          </Dialog>

          <Dialog
            open={categoriesOpen}
            onClose={() => setCategoriesOpen(false)}
            title="カテゴリを管理"
            description="カテゴリ名と表示順を整えます。スキルが残るカテゴリは削除できません。"
            className="max-w-3xl"
          >
            <div className="space-y-6">
              <ActionForm
                action={createSkillCategoryAction}
                className="grid gap-3 rounded-lg bg-[var(--surface-subtle)] p-4 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end"
                onSuccess={refresh}
              >
                <FormField
                  id="create-category-name"
                  label="カテゴリ名"
                  name="name"
                  required
                />
                <FormField
                  id="create-category-order"
                  label="表示順"
                  name="displayOrder"
                  type="number"
                  defaultValue={0}
                  min={0}
                  required
                />
                <SubmitButton pendingLabel="追加中…">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  追加
                </SubmitButton>
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
                    <div key={category.id} className="space-y-3 py-4">
                      <ActionForm
                        action={updateSkillCategoryAction}
                        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end"
                        onSuccess={refresh}
                      >
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
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Badge variant="neutral">
                          スキル {category._count.skills}件
                        </Badge>
                        <ActionForm
                          action={deleteSkillCategoryAction}
                          onSuccess={refresh}
                        >
                          <input type="hidden" name="id" value={category.id} />
                          <ConfirmSubmitButton
                            pendingLabel="削除中…"
                            variant="destructive"
                            disabled={category._count.skills > 0}
                            title={
                              category._count.skills > 0
                                ? "スキルが残っているカテゴリは削除できません"
                                : "カテゴリを削除"
                            }
                            confirm={{
                              title: "カテゴリを削除しますか",
                              description: `「${category.name}」を削除します。この操作は取り消せません。`,
                              confirmLabel: "削除する",
                              destructive: true
                            }}
                          >
                            削除
                          </ConfirmSubmitButton>
                        </ActionForm>
                      </div>
                      {category._count.skills > 0 ? (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          スキルが残っているため、このカテゴリは削除できません。
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Dialog>
        </>
      ) : null}
    </>
  );
}
