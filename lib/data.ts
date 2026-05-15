import { createBrowserSafeSupabaseClient, hasBrowserSafeSupabaseEnv } from "@/lib/supabase";
import type { PriceSnapshot, Product, ProductDetail, ProductSummary, Retailer, RetailerProduct } from "@/lib/types";

const RETAILERS: Retailer[] = ["coolpc", "sinya"];

type RetailerProductRow = RetailerProduct & {
  products: Product | Product[] | null;
};

type SnapshotRow = PriceSnapshot & {
  retailer_products: RetailerProductRow | RetailerProductRow[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export async function getProductSummaries(): Promise<ProductSummary[]> {
  if (!hasBrowserSafeSupabaseEnv()) return [];

  const supabase = createBrowserSafeSupabaseClient();

  const { data, error } = await supabase
    .from("price_snapshots")
    .select(
      `
      id,
      retailer_product_id,
      price,
      stock_status,
      scraped_at,
      raw_payload,
      retailer_products (
        id,
        product_id,
        retailer,
        retailer_product_name,
        url,
        is_active,
        created_at,
        updated_at,
        products (
          id,
          category,
          brand,
          model,
          capacity,
          interface,
          form_factor,
          standard_name,
          created_at,
          updated_at
        )
      )
    `
    )
    .gte("scraped_at", daysAgo(30))
    .order("scraped_at", { ascending: false });

  if (error) throw error;

  const byProduct = new Map<
    string,
    {
      product: Product;
      snapshots: SnapshotRow[];
    }
  >();

  for (const snapshot of (data ?? []) as unknown as SnapshotRow[]) {
    const retailerProduct = firstOrNull(snapshot.retailer_products);
    const product = firstOrNull(retailerProduct?.products);
    if (!retailerProduct || !product || product.category !== "ssd") continue;

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
        const latest = snapshots.find((snapshot) => firstOrNull(snapshot.retailer_products)?.retailer === retailer);
        const latestRetailerProduct = firstOrNull(latest?.retailer_products);
        if (latest && latestRetailerProduct) {
          latestByRetailer[retailer] = {
            ...latest,
            retailerProduct: latestRetailerProduct
          };
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
  if (!hasBrowserSafeSupabaseEnv()) return null;

  const supabase = createBrowserSafeSupabaseClient();

  const { data: product, error: productError } = await supabase.from("products").select("*").eq("id", productId).single();
  if (productError) return null;

  const { data: retailerProducts, error: retailerError } = await supabase
    .from("retailer_products")
    .select("*")
    .eq("product_id", productId)
    .order("retailer");

  if (retailerError) throw retailerError;

  const retailerProductIds = (retailerProducts ?? []).map((item) => item.id);
  if (retailerProductIds.length === 0) {
    return { product, retailerProducts: [], snapshots: [] };
  }

  const { data: snapshots, error: snapshotError } = await supabase
    .from("price_snapshots")
    .select("*")
    .in("retailer_product_id", retailerProductIds)
    .order("scraped_at", { ascending: false })
    .limit(500);

  if (snapshotError) throw snapshotError;

  const retailerProductById = new Map((retailerProducts ?? []).map((item) => [item.id, item]));

  return {
    product,
    retailerProducts: retailerProducts ?? [],
    snapshots: ((snapshots ?? []) as PriceSnapshot[])
      .map((snapshot) => {
        const retailerProduct = retailerProductById.get(snapshot.retailer_product_id);
        if (!retailerProduct) return null;
        return { ...snapshot, retailerProduct };
      })
      .filter((snapshot): snapshot is PriceSnapshot & { retailerProduct: RetailerProduct } => snapshot != null)
  };
}

export async function getScrapeLogs() {
  if (!hasBrowserSafeSupabaseEnv()) return [];

  const supabase = createBrowserSafeSupabaseClient();
  const { data, error } = await supabase
    .from("scrape_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data ?? [];
}
