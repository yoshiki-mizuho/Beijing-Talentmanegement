import { MemberStatus } from "@prisma/client";
import { z } from "zod";

const optionalSkillLevelQuerySchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? undefined : value),
  z.coerce.number().int().min(1).max(5).optional()
);

export const memberSearchSchema = z.object({
  q: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  skillId: z.string().trim().optional(),
  minLevel: optionalSkillLevelQuerySchema,
  roleId: z.string().trim().optional(),
  status: z.enum(MemberStatus).optional()
});

export type MemberSearchInput = z.infer<typeof memberSearchSchema>;

export type MemberListUrlState = {
  filters: {
    q: string;
    departmentId: string;
    skillId: string;
    minLevel: string;
    roleId: string;
    status: string;
  };
  targetRole: "" | "unset" | "achieved" | "in_progress";
  page: number;
  memberId: string | null;
};

export const initialMemberListUrlState: MemberListUrlState = {
  filters: {
    q: "",
    departmentId: "",
    skillId: "",
    minLevel: "",
    roleId: "",
    status: "ACTIVE"
  },
  targetRole: "",
  page: 1,
  memberId: null
};

type SearchParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

export function parseMemberListSearchParams(source: SearchParamSource): MemberListUrlState {
  const getValue = (key: string) => {
    const value = source instanceof URLSearchParams ? source.get(key) : source[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  };
  const minLevel = getValue("minLevel");
  const status = getValue("status");
  const targetRole = getValue("targetRole");
  const page = getValue("page");
  const memberId = getValue("member");

  return {
    filters: {
      q: getValue("q"),
      departmentId: getValue("departmentId"),
      skillId: getValue("skillId"),
      minLevel: /^[1-5]$/.test(minLevel) ? minLevel : "",
      roleId: getValue("roleId"),
      status: status === "ALL" || Object.values(MemberStatus).includes(status as MemberStatus)
        ? status === "ALL" ? "" : status
        : "ACTIVE"
    },
    targetRole:
      targetRole === "unset" || targetRole === "achieved" || targetRole === "in_progress"
        ? targetRole
        : "",
    page: /^[1-9]\d*$/.test(page) ? Number(page) : 1,
    memberId: memberId || null
  };
}

export function buildMemberListSearchParams(state: MemberListUrlState) {
  const searchParams = new URLSearchParams();
  const { filters } = state;

  if (filters.q.trim()) searchParams.set("q", filters.q.trim());
  if (filters.departmentId) searchParams.set("departmentId", filters.departmentId);
  if (filters.skillId) searchParams.set("skillId", filters.skillId);
  if (filters.minLevel) searchParams.set("minLevel", filters.minLevel);
  if (filters.roleId) searchParams.set("roleId", filters.roleId);
  if (!filters.status) searchParams.set("status", "ALL");
  else if (filters.status !== "ACTIVE") searchParams.set("status", filters.status);
  if (state.targetRole) searchParams.set("targetRole", state.targetRole);
  if (state.page > 1) searchParams.set("page", String(state.page));
  if (state.memberId) searchParams.set("member", state.memberId);

  return searchParams;
}
