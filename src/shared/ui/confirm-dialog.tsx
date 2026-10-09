"use client";

import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";

export type ConfirmDialogOptions = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  destructive = false
}: ConfirmDialogOptions & {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      closeOnBackdrop
      footer={
        <>
          <Button type="button" variant="secondary" className="min-h-11" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "primary"}
            className="min-h-11"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--muted-foreground)]">
        実行前に内容を確認してください。
      </p>
    </Dialog>
  );
}
