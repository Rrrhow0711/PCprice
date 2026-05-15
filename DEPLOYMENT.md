# Deployment Checklist

## 1. Supabase

Create a Supabase project, then run:

```sql
-- supabase/migrations/001_initial_schema.sql
```

Copy these values:

- Project URL
- anon public key
- service role key

## 2. GitHub Secrets

Repository: `Rrrhow0711/PCprice`

Add Actions secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

These are used only by `.github/workflows/daily-scrape.yml`.

## 3. Vercel

Import GitHub repository:

```text
https://github.com/Rrrhow0711/PCprice
```

Framework preset:

```text
Next.js
```

Environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` to frontend runtime variables.

## 4. First Data Run

After Supabase secrets are set, run the GitHub workflow manually:

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
