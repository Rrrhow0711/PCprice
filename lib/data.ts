import { getSql, hasDatabaseEnv } from "@/lib/db";
import type { PriceSnapshot, Product, ProductDetail, ProductSummary, Retailer, RetailerProduct } from "@/lib/types";

const RETAILERS: Retailer[] = ["coolpc", "sinya"];

type SummaryRow = Product & {
  retailer_product_id: string;
  retailer: string;
  retailer_product_name: string;
  url: string | null;
  is_active: boolean;
  retailer_product_created_at: string;
  retailer_product_updated_at: string;
  snapshot_id: string;
  price: number | null;
  stock_status: string;
  scraped_at: string;
  raw_payload: Record<string, unknown>;
};

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export async function getProductSummaries(): Promise<ProductSummary[]> {
  if (!hasDatabaseEnv()) return [];

  const sql = getSql();
  const rows = await sql<SummaryRow[]>`
    select
      p.id,
      p.category,
      p.brand,
      p.model,
      p.capacity,
      p.interface,
      p.form_factor,
      p.standard_name,
      p.created_at,
      p.updated_at,
      rp.id as retailer_product_id,
      rp.retailer,
      rp.retailer_product_name,
      rp.url,
      rp.is_active,
      rp.created_at as retailer_product_created_at,
      rp.updated_at as retailer_product_updated_at,
      ps.id as snapshot_id,
      ps.price,
      ps.stock_status,
      ps.scraped_at,
      ps.raw_payload
    from price_snapshots ps
    join retailer_products rp on rp.id = ps.retailer_product_id
    join products p on p.id = rp.product_id
    where p.category = 'ssd'
      and ps.scraped_at >= ${daysAgo(30)}
    order by p.standard_name asc, ps.scraped_at desc
  `;

  const byProduct = new Map<
    string,
    {
      product: Product;
      snapshots: Array<PriceSnapshot & { retailerProduct: RetailerProduct }>;
    }
  >();

  for (const row of rows) {
    const product = rowToProduct(row);
    const retailerProduct = rowToRetailerProduct(row);
    const snapshot = rowToSnapshot(row, retailerProduct);

    const existing = byProduct.get(product.id);
    if (existing) {
      existing.snapshots.push(snapshot);
    } else {
      byProduct.set(product.id, { product, snapshots: [snapshot] });
    }
  }

  return Array.from(byProduct.values())
    .map(({ product, snapshots }) => {
      const latestByRetailer: ProductSummary["latestByRetailer"] = {};

      for (const retailer of RETAILERS) {
        const latest = snapshots.find((snapshot) => snapshot.retailerProduct.retailer === retailer);
        if (latest) {
          latestByRetailer[retailer] = latest;
        }
      }

      const latestPrices = Object.values(latestByRetailer)
        .map((snapshot) => snapshot?.price)
        .filter((price): price is number => typeof price === "number");

      const lowest = Object.entries(latestByRetailer)
        .filter((entry): entry is [Retailer, PriceSnapshot & { retailerProduct: RetailerProduct }] => {
          return typeof entry[1]?.price === "number";
        })
        .sort((a, b) => (a[1].price ?? Number.MAX_SAFE_INTEGER) - (b[1].price ?? Number.MAX_SAFE_INTEGER))[0];

      const latestOverall = snapshots.find((snapshot) => typeof snapshot.price === "number");
      const sevenDayCutoff = new Date(daysAgo(7)).getTime();
      const latestPrice = latestOverall?.price ?? null;
      const baseline = snapshots
        .filter((snapshot) => typeof snapshot.price === "number" && new Date(snapshot.scraped_at).getTime() <= sevenDayCutoff)
        .sort((a, b) => new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime())[0];

      const thirtyDayLow =
        snapshots
          .map((snapshot) => snapshot.price)
          .filter((price): price is number => typeof price === "number")
          .sort((a, b) => a - b)[0] ?? null;

      return {
        product,
        latestByRetailer,
        sevenDayChange: latestPrice != null && baseline?.price != null ? latestPrice - baseline.price : null,
        thirtyDayLow,
        priceGap: latestPrices.length >= 2 ? Math.max(...latestPrices) - Math.min(...latestPrices) : null,
        lowestRetailer: lowest?.[0] ?? null,
        lastUpdatedAt: snapshots[0]?.scraped_at ?? null
      };
    })
    .sort((a, b) => a.product.standard_name.localeCompare(b.product.standard_name));
}

export async function getProductDetail(productId: string): Promise<ProductDetail | null> {
  if (!hasDatabaseEnv()) return null;

  const sql = getSql();
  const products = await sql<Product[]>`
    select *
    from products
    where id = ${productId}
    limit 1
  `;

  const product = products[0];
  if (!product) return null;

  const retailerProducts = await sql<RetailerProduct[]>`
    select *
    from retailer_products
    where product_id = ${productId}
    order by retailer asc
  `;

  const retailerProductIds = retailerProducts.map((item) => item.id);
  if (retailerProductIds.length === 0) {
    return { product, retailerProducts: [], snapshots: [] };
  }

  const snapshots = await sql<PriceSnapshot[]>`
    select *
    from price_snapshots
    where retailer_product_id in ${sql(retailerProductIds)}
    order by scraped_at desc
    limit 500
  `;

  const retailerProductById = new Map(retailerProducts.map((item) => [item.id, item]));

  return {
    product,
    retailerProducts,
    snapshots: snapshots
      .map((snapshot) => {
        const retailerProduct = retailerProductById.get(snapshot.retailer_product_id);
        if (!retailerProduct) return null;
        return { ...snapshot, retailerProduct };
      })
      .filter((snapshot): snapshot is PriceSnapshot & { retailerProduct: RetailerProduct } => snapshot != null)
  };
}

export async function getScrapeLogs() {
  if (!hasDatabaseEnv()) return [];

  const sql = getSql();
  return sql`
    select *
    from scrape_logs
    order by started_at desc
    limit 100
  `;
}

function rowToProduct(row: SummaryRow): Product {
  return {
    id: row.id,
    category: row.category,
    brand: row.brand,
    model: row.model,
    capacity: row.capacity,
    interface: row.interface,
    form_factor: row.form_factor,
    standard_name: row.standard_name,
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  };
}

function rowToRetailerProduct(row: SummaryRow): RetailerProduct {
  return {
    id: row.retailer_product_id,
    product_id: row.id,
    retailer: row.retailer,
    retailer_product_name: row.retailer_product_name,
    url: row.url,
    is_active: row.is_active,
    created_at: toIsoString(row.retailer_product_created_at),
    updated_at: toIsoString(row.retailer_product_updated_at)
  };
}

function rowToSnapshot(row: SummaryRow, retailerProduct: RetailerProduct): PriceSnapshot & { retailerProduct: RetailerProduct } {
  return {
    id: row.snapshot_id,
    retailer_product_id: row.retailer_product_id,
    price: row.price,
    stock_status: row.stock_status,
    scraped_at: toIsoString(row.scraped_at),
    raw_payload: row.raw_payload,
    retailerProduct
  };
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}
