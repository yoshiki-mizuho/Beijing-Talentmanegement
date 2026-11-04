"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  assignSkillCategoryGroupAction,
  createSkillCategoryGroupAction,
  deleteSkillCategoryGroupAction,
  reorderSkillCategoryGroupsAction,
  updateSkillCategoryGroupAction,
} from "@/modules/skills/presentation/actions";
import { ActionForm, ConfirmSubmitButton } from "@/shared/ui/action-form";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { SubmitButton } from "@/shared/ui/submit-button";
import { cn } from "@/shared/lib/utils";

type Group = {
  id: string;
  name: string;
  displayOrder: number;
  _count: { categories: number };
};

type Category = {
  id: string;
  name: string;
  groupId: string | null;
  _count: { skills: number };
};

export function SkillCategoryGroupsPanel({
  initialGroups,
  categories,
}: {
  initialGroups: Group[];
  categories: Category[];
}) {
  // 並べ替えの直後は手元の順で表示し、サーバーから新しい一覧が届いたらそちらを使う。
  const [orderOverride, setOrderOverride] = useState<{
    base: Group[];
    groups: Group[];
  } | null>(null);
  const groups =
    orderOverride && orderOverride.base === initialGroups
      ? orderOverride.groups
      : initialGroups;
  const [editing, setEditing] = useState<Group | null>(null);
  const [isPending, startTransition] = useTransition();

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= groups.length) return;
    const next = [...groups];
    [next[index], next[target]] = [next[target], next[index]];
    setOrderOverride({ base: initialGroups, groups: next });
    startTransition(async () => {
      const result = await reorderSkillCategoryGroupsAction({
        groupIds: next.map((group) => group.id),
      });
      if (result.status === "success") toast.success(result.message);
      else {
        setOrderOverride(null);
        toast.error(result.message);
      }
    });
  }

  function assign(categoryId: string, groupId: string) {
    const formData = new FormData();
    formData.set("categoryId", categoryId);
    formData.set("groupId", groupId);
    startTransition(async () => {
      const result = await assignSkillCategoryGroupAction(formData);
      if (result.status === "success") toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(440px,1.2fr)]">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-base font-semibold">大分類</h2>
        <div className="mt-4 space-y-2">
          {groups.map((group, index) => (
            <div
              key={group.id}
              className="flex min-h-12 items-center gap-1 rounded-lg border border-[var(--border)] px-2"
            >
              <button
                type="button"
                onClick={() => setEditing(group)}
                className="min-h-11 min-w-0 flex-1 truncate text-left text-sm font-semibold text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                {group.name}
              </button>
              <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                {group._count.categories}カテゴリ
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={index === 0 || isPending}
                onClick={() => move(index, -1)}
                aria-label={`${group.name}を上へ移動`}
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={index === groups.length - 1 || isPending}
                onClick={() => move(index, 1)}
                aria-label={`${group.name}を下へ移動`}
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setEditing(group)}
                aria-label={`${group.name}を編集`}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
              <ActionForm action={deleteSkillCategoryGroupAction}>
                <input type="hidden" name="id" value={group.id} />
                <ConfirmSubmitButton
                  variant="ghost"
                  size="icon"
                  aria-label={`${group.name}を削除`}
                  confirm={{
                    title: "大分類を削除しますか",
                    description: "中のカテゴリは未分類に戻ります。",
                    confirmLabel: "削除する",
                    destructive: true,
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </ConfirmSubmitButton>
              </ActionForm>
            </div>
          ))}
        </div>
        <ActionForm
          action={createSkillCategoryGroupAction}
          className="mt-4 flex gap-2"
        >
          <label htmlFor="new-skill-category-group" className="sr-only">
            新しい大分類
          </label>
          <Input
            id="new-skill-category-group"
            name="name"
            minLength={1}
            maxLength={30}
            required
            placeholder="新しい大分類"
          />
          <SubmitButton>追加</SubmitButton>
        </ActionForm>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold">カテゴリ</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-subtle)] text-left text-xs text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3">カテゴリ</th>
                <th className="px-4 py-3">スキルの件数</th>
                <th className="px-4 py-3">大分類</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className="border-t border-[var(--border)]"
                >
                  <td className="px-4 py-3 font-medium">{category.name}</td>
                  <td className="px-4 py-3">{category._count.skills}</td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`${category.name}の大分類`}
                      defaultValue={category.groupId ?? "unclassified"}
                      disabled={isPending}
                      onChange={(event) =>
                        assign(category.id, event.target.value)
                      }
                      className={cn(
                        "min-h-11 w-full rounded-lg border bg-[var(--surface)] px-3",
                        category.groupId === null
                          ? "border-amber-500"
                          : "border-[var(--border-strong)]",
                      )}
                    >
                      <option value="unclassified">未分類</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="大分類名を編集"
      >
        {editing ? (
          <ActionForm
            action={updateSkillCategoryGroupAction}
            onSuccess={() => setEditing(null)}
            className="space-y-4"
          >
            <input type="hidden" name="id" value={editing.id} />
            <label
              htmlFor="edit-skill-category-group"
              className="text-sm font-medium"
            >
              大分類名
            </label>
            <Input
              id="edit-skill-category-group"
              name="name"
              defaultValue={editing.name}
              minLength={1}
              maxLength={30}
              required
            />
            <div className="flex justify-end">
              <SubmitButton>保存</SubmitButton>
            </div>
          </ActionForm>
        ) : null}
      </Dialog>
    </div>
  );
}
