"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createMemberAction } from "@/modules/members/presentation/actions";
import { getMemberStatusLabel } from "@/modules/members/presentation/member-display";
import type {
  DepartmentOption,
  ManagerOption,
  TargetRoleOption
} from "@/modules/members/presentation/member-presentation-types";
import { ActionForm } from "@/shared/ui/action-form";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { FormField, SelectField } from "@/shared/ui/form-field";
import { SubmitButton } from "@/shared/ui/submit-button";

const memberStatuses = ["ACTIVE", "LEAVE", "INACTIVE"] as const;

export function MemberCreateDialog({
  departments,
  managerCandidates,
  targetRoles,
  canEditGrowthSettings
}: {
  departments: DepartmentOption[];
  managerCandidates: ManagerOption[];
  targetRoles: TargetRoleOption[];
  canEditGrowthSettings: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  function close() {
    setOpen(false);
  }

  return (
    <>
      <Button className="min-h-11" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        メンバーを追加
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="メンバーを追加"
        description="基盤の利用者 ID は、TalentHub を利用する人だけ入力してください。"
        className="max-w-3xl"
      >
        <ActionForm
          action={createMemberAction}
          className="grid gap-4 md:grid-cols-2"
          onSuccess={() => {
            close();
            router.refresh();
          }}
        >
          <FormField
            id="create-member-employee-no"
            label="社員番号"
            name="employeeNo"
            required
          />
          <FormField
            id="create-member-name"
            label="氏名"
            name="name"
            required
          />
          <FormField
            id="create-member-email"
            label="メール"
            name="email"
            type="email"
            required
          />
          <FormField
            id="create-member-platform-user-id"
            label="基盤の利用者 ID"
            name="platformUserId"
            placeholder="UUID（未登録なら空欄）"
          />
          <SelectField
            id="create-member-department"
            label="部署"
            name="departmentId"
            required
          >
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </SelectField>
          <FormField
            id="create-member-job-title"
            label="役職"
            name="jobTitle"
          />
          <SelectField
            id="create-member-status"
            label="状態"
            name="status"
            defaultValue="ACTIVE"
          >
            {memberStatuses.map((status) => (
              <option key={status} value={status}>
                {getMemberStatusLabel(status)}
              </option>
            ))}
          </SelectField>
          {canEditGrowthSettings ? (
            <>
              <SelectField
                id="create-member-manager"
                label="上司"
                name="managerId"
                defaultValue=""
              >
                <option value="">未設定</option>
                {managerCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.employeeNo} / {candidate.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id="create-member-target-role"
                label="目標ロール"
                name="targetRoleId"
                defaultValue=""
              >
                <option value="">未設定</option>
                {targetRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </SelectField>
            </>
          ) : null}
          <div className="flex justify-end md:col-span-2">
            <SubmitButton pendingLabel="登録中…">
              <Plus className="h-4 w-4" aria-hidden="true" />
              メンバーを追加
            </SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}
