import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Toaster } from "@/shared/ui/toaster";

import "./globals.css";

export const metadata: Metadata = {
  title: "TalentHub",
  description: "スキルと成長をつなぐ社内タレントマネジメントシステム"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
