from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from scraper.utils.normalize import NormalizedProduct, normalize_ssd_name


load_dotenv()


@contextmanager
def get_connection() -> Iterator[psycopg.Connection]:
    database_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    if not database_url:
        raise RuntimeError("Missing DATABASE_URL.")

    with psycopg.connect(database_url, row_factory=dict_row, connect_timeout=20) as conn:
        yield conn


def create_scrape_log(
    conn: psycopg.Connection,
    retailer: str,
    category: str,
    status: str = "running",
    message: str | None = None,
) -> str:
    with conn.cursor() as cur:
        row = cur.execute(
            """
            insert into scrape_logs (retailer, category, status, message, started_at)
            values (%s, %s, %s, %s, %s)
            returning id
            """,
            (retailer, category, status, message, datetime.now(timezone.utc)),
        ).fetchone()
    conn.commit()
    return str(row["id"])


def finish_scrape_log(
    conn: psycopg.Connection,
    log_id: str,
    status: str,
    message: str,
    items_found: int,
    items_saved: int,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            update scrape_logs
            set status = %s,
                message = %s,
                items_found = %s,
                items_saved = %s,
                finished_at = %s
            where id = %s
            """,
            (status, message[:2000], items_found, items_saved, datetime.now(timezone.utc), log_id),
        )
    conn.commit()


def save_scraped_item(conn: psycopg.Connection, item: dict[str, Any]) -> str:
    normalized = normalize_ssd_name(item["retailer_product_name"])
    product_id = _get_or_create_product(conn, normalized)
    retailer_product_id = _get_or_create_retailer_product(conn, item, product_id)

    with conn.cursor() as cur:
        cur.execute(
            """
            insert into price_snapshots (retailer_product_id, price, stock_status, scraped_at, raw_payload)
            values (%s, %s, %s, %s, %s)
            """,
            (
                retailer_product_id,
                item.get("price"),
                item.get("stock_status", "unknown"),
                datetime.now(timezone.utc),
                Jsonb(item.get("raw_payload") or {}),
            ),
        )
    conn.commit()
    return str(retailer_product_id)


def reset_retailer_data(conn: psycopg.Connection, retailer: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            delete from price_snapshots ps
            using retailer_products rp
            where ps.retailer_product_id = rp.id
              and rp.retailer = %s
            """,
            (retailer,),
        )
        cur.execute("delete from retailer_products where retailer = %s", (retailer,))
        cur.execute(
            """
            delete from products p
            where not exists (
              select 1
              from retailer_products rp
              where rp.product_id = p.id
            )
            """
        )
    conn.commit()


def _get_or_create_product(conn: psycopg.Connection, normalized: NormalizedProduct) -> str:
    with conn.cursor() as cur:
        row = cur.execute(
            """
            select id
            from products
            where lower(standard_name) = lower(%s)
            limit 1
            """,
            (normalized.standard_name,),
        ).fetchone()

        if row:
            product_id = row["id"]
            cur.execute(
                """
                update products
                set brand = %s,
                    model = %s,
                    capacity = %s,
                    interface = %s,
                    form_factor = %s
                where id = %s
                """,
                (
                    normalized.brand,
                    normalized.model,
                    normalized.capacity,
                    normalized.interface,
                    normalized.form_factor,
                    product_id,
                ),
            )
            return str(product_id)

        row = cur.execute(
            """
            insert into products (category, brand, model, capacity, interface, form_factor, standard_name)
            values (%s, %s, %s, %s, %s, %s, %s)
            returning id
            """,
            (
                normalized.category,
                normalized.brand,
                normalized.model,
                normalized.capacity,
                normalized.interface,
                normalized.form_factor,
                normalized.standard_name,
            ),
        ).fetchone()
    return str(row["id"])


def _get_or_create_retailer_product(conn: psycopg.Connection, item: dict[str, Any], product_id: str) -> str:
    retailer = item["retailer"]
    url = item.get("url")
    name = item["retailer_product_name"]

    with conn.cursor() as cur:
        if url:
            row = cur.execute(
                """
                select id
                from retailer_products
                where retailer = %s and url = %s
                limit 1
                """,
                (retailer, url),
            ).fetchone()
        else:
            row = cur.execute(
                """
                select id
                from retailer_products
                where retailer = %s and lower(retailer_product_name) = lower(%s)
                limit 1
                """,
                (retailer, name),
            ).fetchone()

        if row:
            retailer_product_id = row["id"]
            cur.execute(
                """
                update retailer_products
                set product_id = %s,
                    retailer_product_name = %s,
                    url = %s,
                    is_active = true
                where id = %s
                """,
                (product_id, name, url, retailer_product_id),
            )
            return str(retailer_product_id)

        row = cur.execute(
            """
            insert into retailer_products (product_id, retailer, retailer_product_name, url, is_active)
            values (%s, %s, %s, %s, true)
            returning id
            """,
            (product_id, retailer, name, url),
        ).fetchone()
    return str(row["id"])
