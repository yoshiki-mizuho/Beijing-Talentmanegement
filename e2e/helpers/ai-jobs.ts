import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runAiJobsOnce() {
  // Windows の Node は .cmd を shell なしで起動できないため、node で tsx を直接動かす。
  const tsxCli = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  await execFileAsync(process.execPath, [tsxCli, "scripts/run-ai-jobs.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HUB_NAME: "talenthub",
      PLATFORM_LLM_GRPC_ADDR: "127.0.0.1:50051",
    },
    timeout: 7 * 60 * 1000,
  });
}

export async function setFakeLlmError(error: "unavailable" | null) {
  await fetch("http://127.0.0.1:50052/__fake/llm-error", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ error }),
  });
}
