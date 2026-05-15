"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { formatDateTime, formatPercentLikeChange, formatPrice, retailerName } from "@/lib/format";
import type { ProductSummary } from "@/lib/types";

const BRANDS = ["Samsung", "Western Digital", "Crucial", "Kingston", "ADATA", "Solidigm", "Seagate", "Lexar", "Kioxia"];
const CAPACITIES = ["1TB", "2TB", "4TB"];

export function HomeDashboard({ summaries }: { summaries: ProductSummary[] }) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [capacity, setCapacity] = useState("all");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return summaries.filter((summary) => {
      const product = summary.product;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        product.standard_name.toLowerCase().includes(normalizedQuery) ||
        (product.model ?? "").toLowerCase().includes(normalizedQuery);
      const matchesBrand = brand === "all" || product.brand === brand;
      const matchesCapacity = capacity === "all" || product.capacity === capacity;
      return matchesQuery && matchesBrand && matchesCapacity;
    });
  }, [brand, capacity, query, summaries]);

  const updatedAt = summaries
    .map((summary) => summary.lastUpdatedAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-accent">SSD / 原價屋 / 欣亞</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">今日 SSD 價格總覽</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            追蹤每日快照、通路價差、7 日變化與 30 日最低價。最後更新：{formatDateTime(updatedAt)}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-line bg-white p-2 shadow-subtle">
          <Metric label="商品數" value={filtered.length.toString()} />
          <Metric label="通路" value="2" />
          <Metric label="週期" value="每日" />
        </div>
      </section>

      <section className="mb-5 rounded-lg border border-line bg-white p-4 shadow-subtle">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜尋商品名稱、型號"
              className="h-11 w-full rounded-md border border-line bg-[#fbfbf8] pl-10 pr-3 text-sm outline-none transition focus:border-accent focus:bg-white"
            />
          </label>
          <select
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            className="h-11 rounded-md border border-line bg-[#fbfbf8] px-3 text-sm outline-none focus:border-accent"
          >
            <option value="all">全部品牌</option>
            {BRANDS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            className="h-11 rounded-md border border-line bg-[#fbfbf8] px-3 text-sm outline-none focus:border-accent"
          >
            <option value="all">全部容量</option>
            {CAPACITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-subtle">
        <div className="table-scroll overflow-x-auto">
          <table className="min-w-[1060px] w-full border-collapse text-left text-sm">
            <thead className="border-b border-line bg-[#f4f3ee] text-xs font-semibold uppercase tracking-normal text-muted">
              <tr>
                <th className="px-4 py-3">商品名稱</th>
                <th className="px-4 py-3">品牌</th>
                <th className="px-4 py-3">容量</th>
                <th className="px-4 py-3">原價屋</th>
                <th className="px-4 py-3">欣亞</th>
                <th className="px-4 py-3">最低價</th>
                <th className="px-4 py-3">價差</th>
                <th className="px-4 py-3">7 日變化</th>
                <th className="px-4 py-3">30 日最低</th>
                <th className="px-4 py-3">更新</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((summary) => {
                const coolpc = summary.latestByRetailer.coolpc;
                const sinya = summary.latestByRetailer.sinya;
                return (
                  <tr key={summary.product.id} className="hover:bg-[#fbfbf8]">
                    <td className="px-4 py-4">
                      <Link href={`/products/${summary.product.id}`} className="font-semibold text-ink hover:text-accent">
                        {summary.product.standard_name}
                      </Link>
                      <div className="mt-1 text-xs text-muted">{summary.product.interface ?? "-"} · {summary.product.form_factor ?? "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-muted">{summary.product.brand ?? "-"}</td>
                    <td className="px-4 py-4 text-muted">{summary.product.capacity ?? "-"}</td>
                    <PriceCell snapshot={coolpc} />
                    <PriceCell snapshot={sinya} />
                    <td className="px-4 py-4">
                      {summary.lowestRetailer ? <Badge tone="good">{retailerName(summary.lowestRetailer)}</Badge> : "-"}
                    </td>
                    <td className="px-4 py-4 font-semibold text-ink">{formatPrice(summary.priceGap)}</td>
                    <td className={summary.sevenDayChange != null && summary.sevenDayChange > 0 ? "px-4 py-4 font-semibold text-rise" : "px-4 py-4 font-semibold text-fall"}>
                      {formatPercentLikeChange(summary.sevenDayChange)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-ink">{formatPrice(summary.thirtyDayLow)}</td>
                    <td className="px-4 py-4 text-muted">{formatDateTime(summary.lastUpdatedAt)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-muted">
                    沒有符合篩選的 SSD 商品。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-md bg-[#fbfbf8] px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
    </div>
  );
}

function PriceCell({ snapshot }: { snapshot: ProductSummary["latestByRetailer"]["coolpc"] }) {
  if (!snapshot) return <td className="px-4 py-4 text-muted">-</td>;
  return (
    <td className="px-4 py-4">
      <div className="font-semibold text-ink">{formatPrice(snapshot.price)}</div>
      <div className="mt-1 text-xs text-muted">{snapshot.stock_status}</div>
    </td>
  );
}
