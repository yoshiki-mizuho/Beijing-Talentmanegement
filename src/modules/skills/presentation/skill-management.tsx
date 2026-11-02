"use client";

import { useState } from "react";

import { Card, CardContent } from "@/shared/ui/card";
import { SkillPageHeader } from "./skill-page-header";
import { SkillReorder } from "./skill-reorder";
import { SkillSearchTable, type SkillRow } from "./skill-search-table";

export type SkillManagementCategory = {
  id: string;
  name: string;
  displayOrder: number;
  _count: { skills: number };
};

export function SkillManagement({
  categories,
  skills,
  levels,
  canManage,
}: {
  categories: SkillManagementCategory[];
  skills: SkillRow[];
  levels: Array<{ level: number; description: string }>;
  canManage: boolean;
}) {
  const [reordering, setReordering] = useState(false);

  return (
    <div className="space-y-6">
      <SkillPageHeader
        categories={categories}
        canManage={canManage}
        skillCount={skills.length}
        levels={levels}
        onReorder={() => setReordering(true)}
      />
      {reordering && canManage ? (
        <SkillReorder
          categories={categories}
          skills={skills}
          onClose={() => setReordering(false)}
        />
      ) : (
        <Card>
          <CardContent className="pt-5">
            <SkillSearchTable
              initialSkills={skills}
              categories={categories}
              levels={levels}
              canManage={canManage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
