import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, AuthRole, MemberStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

import { readDemoSeedPasswords } from "./seed-config";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL
  })
});

const skillLevels = [
  {
    level: 1,
    label: "Beginner",
    description: "基本概念を理解し、支援を受けて作業できる"
  },
  {
    level: 2,
    label: "Basic",
    description: "定型作業を自力で進められる"
  },
  {
    level: 3,
    label: "Intermediate",
    description: "通常業務で実用でき、周囲へ説明できる"
  },
  {
    level: 4,
    label: "Advanced",
    description: "複雑な課題を解決し、設計や改善を主導できる"
  },
  {
    level: 5,
    label: "Expert",
    description: "組織横断で標準化、育成、技術判断をリードできる"
  }
];

async function main() {
  const demoPasswords = readDemoSeedPasswords();
  const passwordHashes = {
    ADMIN: await bcrypt.hash(demoPasswords.admin, 12),
    MANAGER: await bcrypt.hash(demoPasswords.manager, 12),
    MEMBER: await bcrypt.hash(demoPasswords.member, 12)
  } satisfies Record<AuthRole, string>;

  await prisma.$transaction(async (tx) => {
    for (const level of skillLevels) {
      await tx.skillLevel.upsert({
        where: { level: level.level },
        update: level,
        create: level
      });
    }

    const department = await tx.department.upsert({
      where: { code: "DEV" },
      update: {
        name: "開発部",
        isActive: true
      },
      create: {
        code: "DEV",
        name: "開発部",
        isActive: true
      }
    });

    const members = [
      {
        employeeNo: "TM0001",
        name: "Admin User",
        email: "admin@example.com",
        jobTitle: "System Admin",
        role: AuthRole.ADMIN
      },
      {
        employeeNo: "TM0002",
        name: "Manager User",
        email: "manager@example.com",
        jobTitle: "Engineering Manager",
        role: AuthRole.MANAGER
      },
      {
        employeeNo: "TM0003",
        name: "Member User",
        email: "member@example.com",
        jobTitle: "Engineer",
        role: AuthRole.MEMBER
      }
    ];

    for (const memberInput of members) {
      const member = await tx.member.upsert({
        where: { employeeNo: memberInput.employeeNo },
        update: {
          name: memberInput.name,
          email: memberInput.email,
          departmentId: department.id,
          jobTitle: memberInput.jobTitle,
          status: MemberStatus.ACTIVE
        },
        create: {
          employeeNo: memberInput.employeeNo,
          name: memberInput.name,
          email: memberInput.email,
          departmentId: department.id,
          jobTitle: memberInput.jobTitle,
          status: MemberStatus.ACTIVE
        }
      });

      const existingUser = await tx.user.findUnique({
        where: { email: memberInput.email },
        select: { id: true }
      });

      if (existingUser) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name: memberInput.name,
            role: memberInput.role,
            memberId: member.id
          }
        });
        continue;
      }

      await tx.user.create({
        data: {
          email: memberInput.email,
          name: memberInput.name,
          passwordHash: passwordHashes[memberInput.role],
          role: memberInput.role,
          memberId: member.id
        }
      });
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
