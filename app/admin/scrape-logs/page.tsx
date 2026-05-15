import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { getScrapeLogs } from "@/lib/data";
import { formatDateTime, retailerName } from "@/lib/format";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function ScrapeLogsPage() {
  const logs = await getScrapeLogs();

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6">
          <p className="text-sm font-semibold text-accent">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">爬蟲狀態</h1>
          <p className="mt-2 text-sm text-muted">最近 100 次 scraper 執行結果。</p>
        </section>

        <section className="overflow-hidden rounded-lg border border-line bg-white shadow-subtle">
          <div className="table-scroll overflow-x-auto">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className="border-b border-line bg-[#f4f3ee] text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">retailer</th>
                  <th className="px-4 py-3">category</th>
                  <th className="px-4 py-3">status</th>
                  <th className="px-4 py-3">items_found</th>
                  <th className="px-4 py-3">items_saved</th>
                  <th className="px-4 py-3">message</th>
                  <th className="px-4 py-3">started_at</th>
                  <th className="px-4 py-3">finished_at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-muted">{retailerName(log.retailer)}</td>
                    <td className="px-4 py-3 text-muted">{log.category}</td>
                    <td className="px-4 py-3">
                      <Badge tone={log.status === "success" ? "good" : log.status === "partial" ? "warning" : "neutral"}>{log.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{log.items_found}</td>
                    <td className="px-4 py-3 text-muted">{log.items_saved}</td>
                    <td className="max-w-md px-4 py-3 text-muted">{log.message ?? "-"}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(log.started_at)}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(log.finished_at)}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center text-muted">
                      還沒有爬蟲執行紀錄。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
