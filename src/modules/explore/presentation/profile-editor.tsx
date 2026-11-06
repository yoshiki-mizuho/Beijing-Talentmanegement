"use client";

import { Pencil, X } from "lucide-react";
import { useState, useTransition, type KeyboardEvent } from "react";
import { toast } from "sonner";
import type { getSkillProfile } from "@/modules/explore/application/explore-service";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { updateMyProfileAction } from "./actions";

type Profile = NonNullable<Awaited<ReturnType<typeof getSkillProfile>>>;

export function ProfileEditor({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(profile.profileMessage ?? "");
  const [topics, setTopics] = useState(profile.consultTopics);
  const [topicInput, setTopicInput] = useState("");
  const [pending, startTransition] = useTransition();

  function addTopic() {
    const topic = topicInput.trim();
    if (!topic || topics.includes(topic) || topic.length > 20 || topics.length >= 8) return;
    setTopics((current) => [...current, topic]);
    setTopicInput("");
  }

  function handleTopicKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addTopic();
  }

  function close() {
    setMessage(profile.profileMessage ?? "");
    setTopics(profile.consultTopics);
    setTopicInput("");
    setOpen(false);
  }

  function save() {
    const formData = new FormData();
    formData.set("profileMessage", message);
    topics.forEach((topic) => formData.append("consultTopics", topic));
    startTransition(async () => {
      const result = await updateMyProfileAction(formData);
      toast[result.status === "success" ? "success" : "error"](result.message);
      if (result.status === "success") setOpen(false);
    });
  }

  return (
    <>
      <Button variant="secondary" className={compact ? "w-full" : undefined} onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" aria-hidden="true" />
        プロフィールを編集
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="プロフィールを編集"
        className="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={close}>キャンセル</Button>
            <Button onClick={save} disabled={pending}>保存</Button>
          </>
        }
      >
        <div className="space-y-6">
          <label className="block text-sm font-semibold">
            ひとこと
            <textarea
              value={message}
              maxLength={120}
              onChange={(event) => setMessage(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] p-3 font-normal"
            />
            <span className="mt-1 block text-right text-xs font-normal text-[var(--muted-foreground)]">残り {120 - message.length}字</span>
          </label>
          <div>
            <p className="text-sm font-semibold">相談に乗れること</p>
            <div className="mt-2 flex gap-2">
              <input
                value={topicInput}
                maxLength={20}
                onChange={(event) => setTopicInput(event.target.value)}
                onKeyDown={handleTopicKeyDown}
                aria-label="相談に乗れること"
                className="h-11 min-w-0 flex-1 rounded-md border border-[var(--border-strong)] px-3"
              />
              <Button variant="secondary" onClick={addTopic} disabled={!topicInput.trim() || topics.length >= 8}>追加</Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {topics.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-3 text-sm"
                >
                  {topic}
                  <button
                    type="button"
                    className="grid h-11 w-11 place-items-center"
                    aria-label={`${topic}を外す`}
                    onClick={() =>
                      setTopics((current) => current.filter((item) => item !== topic))
                    }
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
