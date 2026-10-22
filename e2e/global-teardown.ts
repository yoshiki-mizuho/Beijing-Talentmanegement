import { execFileSync } from "node:child_process";

import { isLocalDatabaseUrl } from "../prisma/cleanup-e2e-policy";

// E2E が作ったデータを最後に片付ける。ローカルの DB のときだけ動き、CI では何もしない。
export default function globalTeardown() {
  if (process.env.CI) {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !isLocalDatabaseUrl(databaseUrl)) {
    console.log(
      "E2Eデータの掃除はスキップしました（ローカルDBではありません）。",
    );
    return;
  }

  try {
    // npm を介さず tsx を直接呼ぶ（OS ごとの npm の呼び方の違いを避ける）
    execFileSync(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/cleanup-e2e-data.ts", "--yes"],
      { stdio: "inherit" },
    );
  } catch {
    // 掃除に失敗してもテストの結果は変えない
    console.log(
      "E2Eデータの掃除に失敗しました。npm.cmd run db:cleanup-e2e で確認してください。",
    );
  }
}
