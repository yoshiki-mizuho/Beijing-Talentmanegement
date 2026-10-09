import { spawnSync } from "node:child_process";
import process from "node:process";

const steps = [
  { name: "typecheck", script: "typecheck" },
  { name: "lint", script: "lint" },
  { name: "test", script: "test" },
  { name: "build", script: "build" },
  { name: "migrate", script: "prisma:migrate:check" },
];

const knownStepNames = new Set(steps.map(({ name }) => name));
const skipArgument = process.argv.slice(2).find((argument) => argument.startsWith("--skip="));
const skippedSteps = new Set(
  skipArgument
    ? skipArgument
        .slice("--skip=".length)
        .split(",")
        .filter((name) => name.length > 0)
    : [],
);
const unknownStepNames = [...skippedSteps].filter((name) => !knownStepNames.has(name));

if (unknownStepNames.length > 0) {
  console.error(`不明なスキップ対象です: ${unknownStepNames.join(", ")}`);
  console.error(`指定可能な手順: ${[...knownStepNames].join(", ")}`);
  process.exitCode = 1;
} else {
  const results = [];

  for (const step of steps) {
    if (skippedSteps.has(step.name)) {
      results.push({ name: step.name, status: "SKIP", durationSeconds: null });
      continue;
    }

    console.log(`\n=== ${step.name} ===`);
    const startedAt = process.hrtime.bigint();
    const npmExecPath = process.env.npm_execpath;
    let result;

    if (npmExecPath) {
      result = spawnSync(process.execPath, [npmExecPath, "run", step.script], {
        stdio: "inherit",
      });
    } else if (process.platform === "win32") {
      result = spawnSync(
        process.env.ComSpec ?? "cmd.exe",
        ["/d", "/s", "/c", `npm.cmd run ${step.script}`],
        { stdio: "inherit" },
      );
    } else {
      result = spawnSync("npm", ["run", step.script], { stdio: "inherit" });
    }

    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    const succeeded = result.status === 0 && result.error === undefined;

    if (result.error) {
      console.error(`${step.name} の起動に失敗しました: ${result.error.message}`);
    }

    results.push({
      name: step.name,
      status: succeeded ? "OK" : "NG",
      durationSeconds,
    });
  }

  console.log("\n検証結果");
  console.log("手順名 / OK・NG / 所要秒数");
  for (const result of results) {
    const duration = result.durationSeconds === null ? "-" : `${result.durationSeconds.toFixed(2)}秒`;
    console.log(`${result.name} / ${result.status} / ${duration}`);
  }

  process.exitCode = results.some(({ status }) => status === "NG") ? 1 : 0;
}
