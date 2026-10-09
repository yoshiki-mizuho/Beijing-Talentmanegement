import { unstable_rethrow } from "next/navigation";
import { ZodError, type ZodIssue } from "zod";

import { AuthorizationError } from "@/server/auth/authorization";
import { UserFacingError } from "@/shared/lib/user-facing-error";

export type ActionResult = {
  status: "success" | "error";
  message: string;
};

type SuccessMessage<T> = string | ((value: T) => string);

const genericErrorMessage =
  "処理に失敗しました。時間をおいて再度お試しください。";

export async function runAction<T>(
  fn: () => Promise<T>,
  successMessage: SuccessMessage<T>
): Promise<ActionResult> {
  try {
    const value = await fn();

    return {
      status: "success",
      message:
        typeof successMessage === "function"
          ? successMessage(value)
          : successMessage
    };
  } catch (error) {
    unstable_rethrow(error);

    if (error instanceof AuthorizationError) {
      throw error;
    }

    if (error instanceof UserFacingError) {
      return { status: "error", message: error.message };
    }

    if (error instanceof ZodError) {
      return {
        status: "error",
        message: translateZodIssue(error.issues[0])
      };
    }

    console.error("Server Action failed", error);
    return { status: "error", message: genericErrorMessage };
  }
}

function translateZodIssue(issue: ZodIssue | undefined) {
  if (!issue) return "入力内容を確認してください。";
  if (containsJapanese(issue.message)) return issue.message;

  const field = issue.path.length > 0 ? `${issue.path.join(".")}の` : "";

  switch (issue.code) {
    case "invalid_type":
      return `${field}形式が正しくありません。`;
    case "too_small":
      return `${field}値が小さすぎます。入力内容を確認してください。`;
    case "too_big":
      return `${field}値が大きすぎます。入力内容を確認してください。`;
    case "invalid_format":
      return `${field}形式が正しくありません。`;
    case "invalid_value":
      return `${field}値を選択肢から選んでください。`;
    default:
      return `${field}入力内容を確認してください。`;
  }
}

function containsJapanese(value: string) {
  return /[\u3040-\u30ff\u3400-\u9fff]/u.test(value);
}
