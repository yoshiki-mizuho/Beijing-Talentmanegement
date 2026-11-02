"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  type CollisionDetection,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { reorderSkillsAction } from "./actions";
import type { SkillManagementCategory } from "./skill-management";
import type { SkillRow } from "./skill-search-table";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

type ReorderCategory = SkillManagementCategory & { skillIds: string[] };
const categoryKey = (id: string) => `category:${id}`;
const containerKey = (id: string) => `container:${id}`;
const skillKey = (id: string) => `skill:${id}`;

export function SkillReorder({
  categories: sourceCategories,
  skills,
  onClose,
}: {
  categories: SkillManagementCategory[];
  skills: SkillRow[];
  onClose: () => void;
}) {
  const initial = useMemo(
    () =>
      sourceCategories.map((category) => ({
        ...category,
        skillIds: skills
          .filter((skill) => skill.categoryId === category.id)
          .map((skill) => skill.id),
      })),
    [sourceCategories, skills],
  );
  const [categories, setCategories] = useState<ReorderCategory[]>(initial);
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const skillsById = new Map(skills.map((skill) => [skill.id, skill]));
  const changed =
    JSON.stringify(toPayload(categories)) !==
    JSON.stringify(toPayload(initial));

  function findCategory(id: string) {
    if (id.startsWith("category:")) return id.slice("category:".length);
    if (id.startsWith("container:")) return id.slice("container:".length);
    const skillId = id.slice("skill:".length);
    return categories.find((category) => category.skillIds.includes(skillId))
      ?.id;
  }

  function labelOf(id: UniqueIdentifier) {
    const key = String(id);
    if (key.startsWith("skill:"))
      return skillsById.get(key.slice("skill:".length))?.name ?? "スキル";
    return (
      sourceCategories.find((category) => category.id === findCategory(key))
        ?.name ?? "カテゴリ"
    );
  }

  function positionOf(activeId: UniqueIdentifier, overId: UniqueIdentifier) {
    const active = String(activeId);
    const over = String(overId);
    if (active.startsWith("category:")) {
      const index = categories.findIndex(
        (category) => categoryKey(category.id) === over,
      );
      return index >= 0 ? `${index + 1}番目に移動しました` : "移動しました";
    }
    const categoryId = findCategory(over);
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return "移動しました";
    const index = over.startsWith("skill:")
      ? category.skillIds.indexOf(over.slice("skill:".length))
      : category.skillIds.length - 1;
    return `${category.name}の${Math.max(index, 0) + 1}番目に移動しました`;
  }

  // カテゴリを動かしているときはカテゴリだけ、スキルを動かしているときはスキルと受け皿だけを落とし先にする
  const collisionDetection: CollisionDetection = (args) => {
    const draggingCategory = String(args.active.id).startsWith("category:");
    return closestCorners({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (container) =>
          String(container.id).startsWith("category:") === draggingCategory,
      ),
    });
  };

  function handleDragOver(event: DragOverEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : "";
    if (!activeId.startsWith("skill:") || !overId) return;
    const fromId = findCategory(activeId);
    const toId = findCategory(overId);
    if (!fromId || !toId || fromId === toId) return;
    const movedSkillId = activeId.slice("skill:".length);
    setCategories((current) =>
      current.map((category) => {
        if (category.id === fromId) {
          return {
            ...category,
            skillIds: category.skillIds.filter((id) => id !== movedSkillId),
          };
        }
        if (category.id === toId) {
          const overSkillId = overId.startsWith("skill:")
            ? overId.slice("skill:".length)
            : null;
          const insertAt = overSkillId
            ? Math.max(0, category.skillIds.indexOf(overSkillId))
            : category.skillIds.length;
          const next = [...category.skillIds];
          next.splice(insertAt, 0, movedSkillId);
          return { ...category, skillIds: next };
        }
        return category;
      }),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : "";
    if (!overId || activeId === overId) return;
    if (activeId.startsWith("category:") && overId.startsWith("category:")) {
      setCategories((current) =>
        arrayMove(
          current,
          current.findIndex(
            (category) => categoryKey(category.id) === activeId,
          ),
          current.findIndex((category) => categoryKey(category.id) === overId),
        ),
      );
      return;
    }
    if (activeId.startsWith("skill:") && overId.startsWith("skill:")) {
      const categoryId = findCategory(activeId);
      if (!categoryId || categoryId !== findCategory(overId)) return;
      setCategories((current) =>
        current.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                skillIds: arrayMove(
                  category.skillIds,
                  category.skillIds.indexOf(activeId.slice("skill:".length)),
                  category.skillIds.indexOf(overId.slice("skill:".length)),
                ),
              }
            : category,
        ),
      );
    }
  }

  function save() {
    startTransition(async () => {
      const result = await reorderSkillsAction(toPayload(categories));
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onClose();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          キャンセル
        </Button>
        <Button onClick={save} disabled={!changed || pending}>
          {pending ? "保存中…" : "保存"}
        </Button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "並び替える項目でスペースキーを押し、矢印キーで移動し、もう一度スペースキーで確定します。",
          },
          announcements: {
            onDragStart: ({ active }) =>
              `${labelOf(active.id)}を持ち上げました`,
            onDragOver: ({ active, over }) =>
              over
                ? `${labelOf(active.id)}を${positionOf(active.id, over.id)}`
                : undefined,
            onDragEnd: ({ active }) =>
              `${labelOf(active.id)}の移動を確定しました`,
            onDragCancel: () => "並び替えを取り消しました",
          },
        }}
      >
        <SortableContext
          items={categories.map((category) => categoryKey(category.id))}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {categories.map((category) => (
              <SortableCategory
                key={category.id}
                category={category}
                skillsById={skillsById}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableCategory({
  category,
  skillsById,
}: {
  category: ReorderCategory;
  skillsById: Map<string, SkillRow>;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categoryKey(category.id) });
  const reducedMotion = useReducedMotion();
  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: reducedMotion ? undefined : transition,
      }}
      className={`rounded-2xl border bg-white p-4 ${isDragging ? "border-[var(--primary)] shadow-lg" : "border-[var(--border)]"}`}
    >
      <div className="mb-3 flex min-h-11 items-center gap-2 font-semibold">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-[var(--surface-subtle)]"
          aria-label={`${category.name}を並び替える`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" aria-hidden="true" />
        </button>
        <span>{category.name}</span>
        <span className="text-sm font-normal text-[var(--muted-foreground)]">
          {category.skillIds.length}件
        </span>
      </div>
      <SortableContext
        items={category.skillIds.map(skillKey)}
        strategy={verticalListSortingStrategy}
      >
        <SkillDropArea
          categoryId={category.id}
          empty={category.skillIds.length === 0}
        >
          {category.skillIds.map((id) => {
            const skill = skillsById.get(id);
            return skill ? <SortableSkill key={id} skill={skill} /> : null;
          })}
        </SkillDropArea>
      </SortableContext>
    </section>
  );
}

function SkillDropArea({
  categoryId,
  empty,
  children,
}: {
  categoryId: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: containerKey(categoryId) });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-16 space-y-2 rounded-xl border border-dashed p-2 ${isOver ? "border-[var(--primary)] bg-[var(--primary-subtle)]" : "border-[var(--border)]"}`}
    >
      {empty ? (
        <p className="flex min-h-11 items-center justify-center text-sm text-[var(--muted-foreground)]">
          ここにスキルを移動
        </p>
      ) : (
        children
      )}
    </div>
  );
}

function SortableSkill({ skill }: { skill: SkillRow }) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: skillKey(skill.id) });
  const reducedMotion = useReducedMotion();
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: reducedMotion ? undefined : transition,
      }}
      className={`flex min-h-12 items-center gap-2 rounded-lg border bg-white px-2 ${isDragging ? "border-[var(--primary)] shadow-md" : "border-[var(--border)]"}`}
    >
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--surface-subtle)]"
        aria-label={`${skill.name}を並び替える`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" aria-hidden="true" />
      </button>
      <span className="font-medium">{skill.name}</span>
      {!skill.isActive ? <Badge variant="neutral">無効</Badge> : null}
    </div>
  );
}

function toPayload(categories: ReorderCategory[]) {
  return {
    categories: categories.map((category) => ({
      categoryId: category.id,
      skillIds: category.skillIds,
    })),
  };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}
