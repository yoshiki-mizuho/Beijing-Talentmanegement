import "dotenv/config";

import { runAiJobs } from "../src/modules/ai-evaluation/application/ai-job-runner";
import { prisma } from "../src/server/db/prisma";

try {
  await runAiJobs();
} finally {
  await prisma.$disconnect();
}
