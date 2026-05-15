export type Retailer = "coolpc" | "sinya";

export type Product = {
  id: string;
  category: string;
  brand: string | null;
  model: string | null;
  capacity: string | null;
  interface: string | null;
  form_factor: string | null;
  standard_name: string;
  created_at: string;
  updated_at: string;
};

export type RetailerProduct = {
  id: string;
  product_id: string;
  retailer: Retailer | string;
  retailer_product_name: string;
  url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PriceSnapshot = {
  id: string;
  retailer_product_id: string;
  price: number | null;
  stock_status: string;
  scraped_at: string;
  raw_payload: Record<string, unknown>;
};

export type ProductSummary = {
  product: Product;
  latestByRetailer: Partial<Record<Retailer, PriceSnapshot & { retailerProduct: RetailerProduct }>>;
  sevenDayChange: number | null;
  thirtyDayLow: number | null;
  priceGap: number | null;
  lowestRetailer: Retailer | null;
  lastUpdatedAt: string | null;
};

export type ProductDetail = {
  product: Product;
  retailerProducts: RetailerProduct[];
  snapshots: Array<PriceSnapshot & { retailerProduct: RetailerProduct }>;
};
