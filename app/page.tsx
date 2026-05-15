import { AppShell } from "@/components/AppShell";
import { HomeDashboard } from "@/components/HomeDashboard";
import { getProductSummaries } from "@/lib/data";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const summaries = await getProductSummaries();

  return (
    <AppShell>
      <HomeDashboard summaries={summaries} />
    </AppShell>
  );
}
