# Taiwan SSD Price Tracker

台灣電腦零組件價格追蹤網站 MVP。第一版追蹤 SSD，資料來源先做原價屋與欣亞，保留每日價格快照，前端顯示最新價格、通路價差、7 日變化、30 日最低價與單一商品歷史折線圖。

專案已改成純 Postgres 架構，建議線上資料庫使用 Neon。只要提供 `DATABASE_URL`，也可以接 Supabase Postgres、Railway Postgres、Render Postgres 或自架 Postgres。

## Stack

- Frontend: Next.js App Router + React + TypeScript
- UI: Tailwind CSS
- Database: Postgres, recommended Neon
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
  db.ts
  data.ts
scraper/
  main.py
  sites/
    coolpc.py
    sinya.py
  utils/
    normalize.py
    db_client.py
database/
  migrations/001_initial_schema.sql
.github/workflows/
```

## Setup

```bash
npm install
```

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env.local`:

```bash
copy .env.example .env.local
```

Fill:

```env
DATABASE_URL=
```

## Database Schema

Run this SQL in Neon SQL Editor or any Postgres SQL console:

```sql
-- paste database/migrations/001_initial_schema.sql
```

Tables:

- `products`: standardized SSD product master data
- `retailer_products`: retailer-specific listings
- `price_snapshots`: append-only daily price snapshots
- `scrape_logs`: scraper run status

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

Add GitHub Secret:

```text
DATABASE_URL
```

## Scraper Notes

- 原價屋 adapter: `scraper/sites/coolpc.py`
- 欣亞 adapter: `scraper/sites/sinya.py`
- selector/API 需要實測時，只修改對應 adapter。
- `main.py` 只負責調度與錯誤隔離。
- 不要在前端寫爬蟲邏輯。
- 不要覆蓋 `price_snapshots`，歷史價格永遠 append-only。
- requests 預設 timeout 20 秒，retry 3 次，商品寫入間隔 0.2 秒，通路間隔 2 秒。

目前原價屋解析 `evaluate.php` 裡「固態硬碟 M.2｜SSD」分類的 option 商品。欣亞先用靜態 HTML 探測常見商品 selector，並預留 `fetch_ssd_products_with_playwright()`。正式上線前建議用 DevTools Network 找欣亞 SSD 分類 API，找不到再啟用 Playwright fallback；需要啟用時再安裝 Chromium browser dependencies。

## Extending Retailers

新增 PChome、momo、蝦皮商城、酷澎時：

1. 新增 `scraper/sites/<retailer>.py`
2. 實作 `fetch_ssd_products() -> list[dict]`
3. 在 `scraper/main.py` 的 `SITE_MODULES` 加入 retailer
4. 必要時更新 `normalize.py` 的品牌、型號、容量規則
5. 前端若要顯示新通路，更新 `lib/types.ts`, `lib/data.ts`, `components/HomeDashboard.tsx`, `components/ProductHistoryChart.tsx`
