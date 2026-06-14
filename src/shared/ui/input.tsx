import type { InputHTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20",
        className
      )}
      {...props}
    />
  );
}
