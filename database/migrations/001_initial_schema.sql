create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  brand text,
  model text,
  capacity text,
  interface text,
  form_factor text,
  standard_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists retailer_products (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  retailer text not null,
  retailer_product_name text not null,
  url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_snapshots (
  id uuid primary key default gen_random_uuid(),
  retailer_product_id uuid not null references retailer_products(id) on delete cascade,
  price integer,
  stock_status text not null default 'unknown',
  scraped_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb
);

create table if not exists scrape_logs (
  id uuid primary key default gen_random_uuid(),
  retailer text not null,
  category text not null,
  status text not null,
  message text,
  items_found integer not null default 0,
  items_saved integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_products_standard_name on products (standard_name);
create index if not exists idx_products_category_capacity_brand on products (category, capacity, brand);
create unique index if not exists uniq_products_standard_name on products (lower(standard_name));

create index if not exists idx_retailer_products_retailer on retailer_products (retailer);
create index if not exists idx_retailer_products_product_id on retailer_products (product_id);
create unique index if not exists uniq_retailer_products_retailer_url
  on retailer_products (retailer, url)
  where url is not null;
create unique index if not exists uniq_retailer_products_retailer_name
  on retailer_products (retailer, lower(retailer_product_name))
  where url is null;

create index if not exists idx_price_snapshots_scraped_at on price_snapshots (scraped_at desc);
create index if not exists idx_price_snapshots_retailer_product_id on price_snapshots (retailer_product_id);
create index if not exists idx_price_snapshots_retailer_product_scraped
  on price_snapshots (retailer_product_id, scraped_at desc);

create index if not exists idx_scrape_logs_started_at on scrape_logs (started_at desc);
create index if not exists idx_scrape_logs_retailer_category on scrape_logs (retailer, category);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
before update on products
for each row execute function set_updated_at();

drop trigger if exists trg_retailer_products_updated_at on retailer_products;
create trigger trg_retailer_products_updated_at
before update on retailer_products
for each row execute function set_updated_at();

create or replace view latest_price_snapshots as
select distinct on (ps.retailer_product_id)
  ps.*
from price_snapshots ps
order by ps.retailer_product_id, ps.scraped_at desc;
