export function formatPrice(price: number | null | undefined) {
  if (price == null) return "-";
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(price);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function formatPercentLikeChange(value: number | null) {
  if (value == null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPrice(value)}`;
}

export function retailerName(retailer: string) {
  const names: Record<string, string> = {
    coolpc: "原價屋",
    sinya: "欣亞"
  };
  return names[retailer] ?? retailer;
}
