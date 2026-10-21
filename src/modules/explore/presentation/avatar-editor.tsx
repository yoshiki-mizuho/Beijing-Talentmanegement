"use client";

import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { deleteMyAvatarAction, updateMyAvatarAction } from "@/modules/explore/presentation/actions";

const sourceMaxBytes = 10 * 1024 * 1024;
const acceptedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export function AvatarEditor({ hasAvatar }: { hasAvatar: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!acceptedTypes.has(file.type)) {
      toast.error("写真や画像のファイル（PNG・JPEG・WebP）を選んでください。");
      return;
    }
    if (file.size > sourceMaxBytes) {
      toast.error("10MB以下の画像を選んでください。");
      return;
    }
    setPending(true);
    try {
      const resized = await resizeAvatar(file);
      const formData = new FormData();
      formData.set("avatar", resized, `avatar.${resized.type === "image/webp" ? "webp" : "jpg"}`);
      const result = await updateMyAvatarAction(formData);
      toast[result.status === "success" ? "success" : "error"](result.message);
    } catch {
      toast.error("画像を読み込めませんでした。別の画像を選んでください。");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    setPending(true);
    try {
      const result = await deleteMyAvatarAction();
      toast[result.status === "success" ? "success" : "error"](result.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <button
        type="button"
        aria-label="アイコン画像を変更"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[var(--primary)] text-white disabled:opacity-50"
      >
        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {hasAvatar ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void handleDelete()}
          className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-xs text-[var(--destructive)] disabled:opacity-50"
        >
          画像を削除
        </button>
      ) : null}
    </>
  );
}

async function resizeAvatar(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available.");
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      256,
      256
    );
    return await canvasToBlob(canvas);
  } finally {
    bitmap.close();
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  const webp = await toBlob(canvas, "image/webp", 0.85);
  if (webp?.type === "image/webp") return webp;
  const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new Error("Image encoding failed.");
  return jpeg;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}
