import { Clock3 } from "lucide-react";

import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

type ComingSoonPageProps = {
  title: string;
  description: string;
};

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Clock3}
        title="準備中です"
        description="ご利用いただけるようになるまで、しばらくお待ちください。"
      />
    </div>
  );
}
