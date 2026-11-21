export const UNSET_MEMBER_NAME = "（名前未設定）";

export function displayMemberName(name: string | null | undefined) {
  return name?.trim() || UNSET_MEMBER_NAME;
}
