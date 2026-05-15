# Taiwan SSD Price Tracker

台灣電腦零組件價格追蹤網站 MVP。第一版追蹤 SSD，資料來源先放原價屋與欣亞，保留每日價格快照，前端提供最新價格、通路價差、7 日變化、30 日最低價與單一商品歷史折線圖。

這不是一次性 demo。專案把前端、爬蟲、資料標準化與資料庫寫入拆開，後續可以逐步擴充 PChome、momo、蝦皮商城、酷澎。

## Stack

- Frontend: Next.js App Router + React + TypeScript
- UI: Tailwind CSS
- Database: Supabase Postgres
- Scraper: Python, requests, BeautifulSoup, optional Playwright
- Scheduler: GitHub Actions cron
- Chart: Recharts

## Directory

```text
app/
  page.tsx
  products/[id]/page.tsx
  admin/scrape-logs/page.tsx
components/
lib/
scraper/
  main.py
  sites/
    coolpc.py
    sinya.py
  utils/
    normalize.py
    supabase_client.py
supabase/
  migrations/001_initial_schema.sql
.github/workflows/daily-scrape.yml
```

## Setup

1. Install Node dependencies

```bash
npm install
```

2. Install Python dependencies

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m playwright install chromium
```

3. Create env file

```bash
copy .env.example .env.local
```

Fill:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. It is only for the Python scraper and GitHub Actions.

## Supabase Schema

Open Supabase SQL editor and run:

```sql
-- paste supabase/migrations/001_initial_schema.sql
```

Or use Supabase CLI if your project is linked:

```bash
supabase db push
```

Tables:

- `products`: standardized SSD product master data
- `retailer_products`: retailer-specific listings
- `price_snapshots`: append-only daily price snapshots
- `scrape_logs`: scraper run status

Indexes are included for `products.standard_name`, `retailer_products.retailer`, `price_snapshots.scraped_at`, and `price_snapshots.retailer_product_id`.

## Run Frontend

```bash
npm run dev
```

Open `http://localhost:3000`.

Pages:

- `/`: 今日 SSD 價格總覽
- `/products/[id]`: 單一商品歷史價格
- `/admin/scrape-logs`: 爬蟲狀態

## Run Scraper Locally

Run both retailers:

```bash
python -m scraper.main
```

Run one retailer:

```bash
python -m scraper.main --retailer coolpc
python -m scraper.main --retailer sinya
```

Scraper output shape:

```json
{
  "retailer": "coolpc",
  "retailer_product_name": "WD_BLACK SN850X 1TB",
  "price": 2890,
  "stock_status": "in_stock",
  "url": "https://www.coolpc.com.tw/evaluate.php",
  "raw_payload": {}
}
```

Write flow:

1. Normalize SSD name in `scraper/utils/normalize.py`
2. Find or create `products` by `standard_name`
3. Find or create `retailer_products` by `retailer + url`, fallback `retailer + retailer_product_name`
4. Insert a new `price_snapshots` row every run
5. Write status to `scrape_logs`

## GitHub Actions

Workflow: `.github/workflows/daily-scrape.yml`

Schedule:

- UTC `01:00`
- Taiwan time `09:00`
- Manual `workflow_dispatch` supported

Add GitHub Secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Scraper Notes

- 原價屋 adapter: `scraper/sites/coolpc.py`
- 欣亞 adapter: `scraper/sites/sinya.py`
- selector/API 需要實測時，只修改對應 adapter。
- `main.py` 只負責調度與錯誤隔離。
- 不要在前端寫爬蟲邏輯。
- 不要覆蓋 `price_snapshots`，歷史價格永遠 append-only。
- requests 預設 timeout 20 秒，retry 3 次，商品寫入間隔 0.2 秒，通路間隔 2 秒。

目前欣亞先用靜態 HTML 探測常見商品 selector，並預留 `fetch_ssd_products_with_playwright()`。正式上線前建議用 DevTools Network 找欣亞 SSD 分類 API，找不到再啟用 Playwright fallback。

## Extending Retailers

新增 PChome、momo、蝦皮商城、酷澎時：

1. 新增 `scraper/sites/<retailer>.py`
2. 實作 `fetch_ssd_products() -> list[dict]`
3. 在 `scraper/main.py` 的 `SITE_MODULES` 加入 retailer
4. 必要時更新 `normalize.py` 的品牌、型號、容量規則
5. 前端若要顯示新通路，更新 `lib/types.ts`, `lib/data.ts`, `components/HomeDashboard.tsx`, `components/ProductHistoryChart.tsx`

## Roadmap

- 實測原價屋與欣亞 selector/API
- 加入 product matching confidence，降低錯誤合併機率
- 加入容量、介面、保固年限更完整的 parser
- 加入價格異常檢查
- 加入通知功能，例如 30 日低點或指定商品降價
- 擴充 PChome、momo、蝦皮商城、酷澎 adapter
