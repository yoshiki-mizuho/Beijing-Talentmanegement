import { redirect } from "next/navigation";

import { getMonthlyRecap } from "@/modules/growth/application/monthly-recap-service";
import { MonthlyRecapPage } from "@/modules/growth/presentation/monthly-recap-page";
import { getCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function RecapPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session?.user.memberId) redirect("/login");
  const { month } = await searchParams;
  const result = await getMonthlyRecap(session.user.memberId, month);
  if (!result) redirect("/login");
  return <MonthlyRecapPage result={result} />;
}
