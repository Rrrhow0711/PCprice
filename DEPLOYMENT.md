# Deployment Checklist

Recommended setup:

```text
GitHub repo -> Vercel frontend
GitHub Actions -> daily Python scraper
Neon Postgres -> product and price data
```

## 1. Create Neon Database

Go to Neon and create a Postgres project:

```text
https://neon.tech
```

Open SQL Editor and run:

```sql
-- paste database/migrations/001_initial_schema.sql
```

Copy the pooled or normal connection string. It should look like:

```text
postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

This value is `DATABASE_URL`.

## 2. GitHub Secrets

Repository:

```text
https://github.com/Rrrhow0711/PCprice
```

Add Actions secret:

```text
DATABASE_URL
```

This is used by `.github/workflows/daily-scrape.yml`.

## 3. Vercel

Import GitHub repository:

```text
https://github.com/Rrrhow0711/PCprice
```

Framework preset:

```text
Next.js
```

Environment variable:

```text
DATABASE_URL
```

## 4. First Data Run

After `DATABASE_URL` is set in GitHub, run the workflow manually:

```text
Actions -> Daily SSD scrape -> Run workflow
```

Then open:

```text
/admin/scrape-logs
```

Check `items_found`, `items_saved`, and `message`.

## 5. Expected Gaps

- 原價屋目前解析 `evaluate.php` 的 SSD select 區塊。
- 欣亞仍需實測正式 SSD 分類頁或 JSON API；目前 adapter 保留 requests parser 與 Playwright fallback 入口。
- 若商品名稱被錯誤合併，先調整 `scraper/utils/normalize.py`。
