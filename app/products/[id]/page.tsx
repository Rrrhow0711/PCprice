import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { ProductHistoryChart } from "@/components/ProductHistoryChart";
import { formatDateTime, formatPrice, retailerName } from "@/lib/format";
import { getProductDetail } from "@/lib/data";
import type { ProductDetail } from "@/lib/types";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const detail = await getProductDetail(params.id);
  if (!detail) notFound();

  const latestByRetailer = detail.retailerProducts.map((retailerProduct) => {
    const latest = detail.snapshots.find((snapshot) => snapshot.retailer_product_id === retailerProduct.id);
    return { retailerProduct, latest };
  });

  const chartData = buildChartData(detail.snapshots);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          回今日價格
        </Link>

        <section className="mb-6 rounded-lg border border-line bg-white p-6 shadow-subtle">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-accent">SSD 商品</p>
              <h1 className="mt-2 text-2xl font-semibold text-ink">{detail.product.standard_name}</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>{detail.product.brand ?? "Unknown brand"}</Badge>
                <Badge>{detail.product.capacity ?? "Unknown capacity"}</Badge>
                <Badge>{detail.product.interface ?? "Unknown interface"}</Badge>
                <Badge>{detail.product.form_factor ?? "Unknown form factor"}</Badge>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2">
          {latestByRetailer.map(({ retailerProduct, latest }) => (
            <div key={retailerProduct.id} className="rounded-lg border border-line bg-white p-5 shadow-subtle">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-muted">{retailerName(retailerProduct.retailer)}</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{formatPrice(latest?.price)}</div>
                  <div className="mt-1 text-sm text-muted">{latest?.stock_status ?? "unknown"} · {formatDateTime(latest?.scraped_at)}</div>
                </div>
                {retailerProduct.url && (
                  <a
                    href={retailerProduct.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-line p-2 text-muted hover:bg-[#f4f3ee] hover:text-ink"
                    aria-label={`Open ${retailerName(retailerProduct.retailer)} product`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              <div className="mt-4 text-sm leading-6 text-muted">{retailerProduct.retailer_product_name}</div>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-lg border border-line bg-white p-5 shadow-subtle">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">歷史價格折線圖</h2>
            <span className="text-sm text-muted">最多最近 500 筆快照</span>
          </div>
          <ProductHistoryChart data={chartData} />
        </section>

        <section className="overflow-hidden rounded-lg border border-line bg-white shadow-subtle">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-ink">Price snapshots</h2>
          </div>
          <div className="table-scroll overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="border-b border-line bg-[#f4f3ee] text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">通路</th>
                  <th className="px-4 py-3">價格</th>
                  <th className="px-4 py-3">庫存</th>
                  <th className="px-4 py-3">抓取時間</th>
                  <th className="px-4 py-3">通路商品名稱</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {detail.snapshots.map((snapshot) => (
                  <tr key={snapshot.id}>
                    <td className="px-4 py-3 text-muted">{retailerName(snapshot.retailerProduct.retailer)}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{formatPrice(snapshot.price)}</td>
                    <td className="px-4 py-3 text-muted">{snapshot.stock_status}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(snapshot.scraped_at)}</td>
                    <td className="px-4 py-3 text-muted">{snapshot.retailerProduct.retailer_product_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function buildChartData(snapshots: ProductDetail["snapshots"]) {
  const byDate = new Map<string, { date: string; coolpc?: number | null; sinya?: number | null }>();

  for (const snapshot of [...snapshots].reverse()) {
    const date = new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit" }).format(new Date(snapshot.scraped_at));
    const existing = byDate.get(date) ?? { date };
    if (snapshot.retailerProduct.retailer === "coolpc") existing.coolpc = snapshot.price;
    if (snapshot.retailerProduct.retailer === "sinya") existing.sinya = snapshot.price;
    byDate.set(date, existing);
  }

  return Array.from(byDate.values());
}
