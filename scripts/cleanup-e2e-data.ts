import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { isE2eMember, isLocalDatabaseUrl } from "../e2e/cleanup/cleanup-e2e-policy";
import { deleteE2eData } from "../e2e/cleanup/delete-e2e-data";

function printCounts(heading: string, counts: Record<string, number>) {
  console.log(heading);
  for (const [label, count] of Object.entries(counts)) {
    console.log(`  ${label}: ${count}`);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !isLocalDatabaseUrl(databaseUrl)) {
    console.error("E2Eデータの掃除はローカルDBでのみ実行できます。");
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const [members, skills, categories, roles, departments] = await Promise.all([
      prisma.member.findMany({ select: { id: true, employeeNo: true, name: true, email: true } }),
      prisma.skill.findMany({ where: { OR: [{ name: { startsWith: "E2E" } }, { name: { startsWith: "DBG-" } }] }, select: { id: true } }),
      prisma.skillCategory.findMany({ where: { name: { startsWith: "E2E" } }, select: { id: true } }),
      prisma.role.findMany({ where: { name: { startsWith: "E2E" } }, select: { id: true } }),
      prisma.department.findMany({ where: { name: { startsWith: "E2E" } }, select: { id: true } }),
    ]);
    const ids = {
      memberIds: members.filter(isE2eMember).map((member) => member.id),
      skillIds: skills.map((item) => item.id),
      categoryIds: categories.map((item) => item.id),
      roleIds: roles.map((item) => item.id),
      departmentIds: departments.map((item) => item.id),
    };
    printCounts("削除候補", {
      members: ids.memberIds.length,
      skills: ids.skillIds.length,
      skillCategories: ids.categoryIds.length,
      roles: ids.roleIds.length,
      departments: ids.departmentIds.length,
    });
    if (!process.argv.includes("--yes")) {
      console.log("確認のみです。削除する場合は --yes を付けて再実行してください。");
      return;
    }
    printCounts("削除結果", await deleteE2eData(prisma, ids));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`E2Eデータの掃除に失敗しました：${message}`);
  process.exitCode = 1;
});
