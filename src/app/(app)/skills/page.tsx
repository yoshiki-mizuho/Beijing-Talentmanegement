import { listSkillCategories, listSkills } from "@/modules/skills/application/skill-service";
import {
  createSkillAction,
  createSkillCategoryAction,
  deleteSkillCategoryAction,
  deactivateSkillAction,
  updateSkillCategoryAction,
  updateSkillAction
} from "@/modules/skills/presentation/actions";
import { SkillSearchTable } from "@/modules/skills/presentation/skill-search-table";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const [categories, skills] = await Promise.all([
    listSkillCategories(),
    listSkills()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">スキル管理</h1>
        <p className="mt-1 text-sm text-slate-600">
          スキルカテゴリとスキルマスタを管理します。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={createSkillCategoryAction} className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
              <Field label="カテゴリ名" name="name" required />
              <Field label="表示順" name="displayOrder" type="number" defaultValue={0} min={0} required />
              <div className="self-end">
                <Button type="submit">追加</Button>
              </div>
            </form>
            <div className="grid gap-2">
              {categories.map((category) => (
                <form
                  key={category.id}
                  action={updateSkillCategoryAction}
                  className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-[1fr_120px_auto_auto]"
                >
                  <input type="hidden" name="id" value={category.id} />
                  <Input name="name" defaultValue={category.name} aria-label="カテゴリ名" required />
                  <Input
                    name="displayOrder"
                    type="number"
                    defaultValue={category.displayOrder}
                    min={0}
                    aria-label="表示順"
                    required
                  />
                  <Button type="submit">更新</Button>
                  <Button
                    type="submit"
                    formAction={deleteSkillCategoryAction}
                    variant="secondary"
                    disabled={category._count.skills > 0}
                    title={
                      category._count.skills > 0
                        ? "配下スキルがあるカテゴリは削除できません"
                        : undefined
                    }
                  >
                    削除
                  </Button>
                </form>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>スキル追加</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createSkillAction} className="grid gap-3 md:grid-cols-2">
              <Field label="スキル名" name="name" required />
              <Select label="カテゴリ" name="categoryId">
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Field label="説明" name="description" />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="isActive" defaultChecked />
                有効
              </label>
              <div>
                <Button type="submit">登録</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>スキル検索</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillSearchTable initialSkills={skills} categories={categories} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>スキル編集</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {skills.map((skill) => (
            <form
              key={skill.id}
              action={updateSkillAction}
              className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[120px_1fr_180px_1fr_80px_auto_auto]"
            >
              <input type="hidden" name="id" value={skill.id} />
              <Input name="code" value={skill.code} aria-label="コード" readOnly />
              <Input name="name" defaultValue={skill.name} aria-label="スキル名" required />
              <select
                name="categoryId"
                defaultValue={skill.categoryId}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Input name="description" defaultValue={skill.description ?? ""} aria-label="説明" />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="isActive" defaultChecked={skill.isActive} />
                有効
              </label>
              <Button type="submit">更新</Button>
              <Button type="submit" formAction={deactivateSkillAction} variant="secondary">
                無効化
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className="mt-1 w-full" {...props} />
    </div>
  );
}

function Select({
  label,
  name,
  children
}: {
  label: string;
  name: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
      >
        {children}
      </select>
    </div>
  );
}
