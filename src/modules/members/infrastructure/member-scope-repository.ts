import { prisma } from "@/server/db/prisma";

export async function getMemberScopeSource(memberId: string) {
  const [viewer, departments, members] = await Promise.all([
    prisma.member.findUniqueOrThrow({
      where: { id: memberId },
      select: {
        id: true,
        departmentId: true,
        department: { select: { name: true } }
      }
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.member.findMany({
      select: { id: true, departmentId: true, managerId: true, status: true }
    })
  ]);

  return {
    viewer: {
      id: viewer.id,
      departmentId: viewer.departmentId,
      departmentName: viewer.department.name
    },
    departments,
    members
  };
}
