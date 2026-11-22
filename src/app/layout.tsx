import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/500.css";
import "@fontsource/noto-sans-jp/600.css";
import "@fontsource/noto-sans-jp/700.css";

import { Toaster } from "@/shared/ui/toaster";

import "./globals.css";

export const metadata: Metadata = {
  title: "TalentHub",
  description: "スキルと成長をつなぐ社内タレントマネジメントシステム"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // CSP の nonce をリクエストごとに付けるため、全ページを動的に描画する
  await connection();
  return (
    <html lang="ja">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
