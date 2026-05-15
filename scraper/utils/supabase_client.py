from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

from scraper.utils.normalize import NormalizedProduct, normalize_ssd_name


load_dotenv()


def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
    return create_client(url, key)


def create_scrape_log(
    client: Client,
    retailer: str,
    category: str,
    status: str = "running",
    message: str | None = None,
) -> str:
    response = (
        client.table("scrape_logs")
        .insert(
            {
                "retailer": retailer,
                "category": category,
                "status": status,
                "message": message,
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .execute()
    )
    return response.data[0]["id"]


def finish_scrape_log(
    client: Client,
    log_id: str,
    status: str,
    message: str,
    items_found: int,
    items_saved: int,
) -> None:
    (
        client.table("scrape_logs")
        .update(
            {
                "status": status,
                "message": message[:2000],
                "items_found": items_found,
                "items_saved": items_saved,
                "finished_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", log_id)
        .execute()
    )


def save_scraped_item(client: Client, item: dict[str, Any]) -> str:
    normalized = normalize_ssd_name(item["retailer_product_name"])
    product_id = _get_or_create_product(client, normalized)
    retailer_product_id = _get_or_create_retailer_product(client, item, product_id)

    snapshot = {
        "retailer_product_id": retailer_product_id,
        "price": item.get("price"),
        "stock_status": item.get("stock_status", "unknown"),
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "raw_payload": item.get("raw_payload") or {},
    }
    client.table("price_snapshots").insert(snapshot).execute()
    return retailer_product_id


def _get_or_create_product(client: Client, normalized: NormalizedProduct) -> str:
    existing = (
        client.table("products")
        .select("id")
        .ilike("standard_name", normalized.standard_name)
        .limit(1)
        .execute()
    )
    if existing.data:
        product_id = existing.data[0]["id"]
        (
            client.table("products")
            .update(
                {
                    "brand": normalized.brand,
                    "model": normalized.model,
                    "capacity": normalized.capacity,
                    "interface": normalized.interface,
                    "form_factor": normalized.form_factor,
                }
            )
            .eq("id", product_id)
            .execute()
        )
        return product_id

    response = (
        client.table("products")
        .insert(
            {
                "category": normalized.category,
                "brand": normalized.brand,
                "model": normalized.model,
                "capacity": normalized.capacity,
                "interface": normalized.interface,
                "form_factor": normalized.form_factor,
                "standard_name": normalized.standard_name,
            }
        )
        .execute()
    )
    return response.data[0]["id"]


def _get_or_create_retailer_product(client: Client, item: dict[str, Any], product_id: str) -> str:
    retailer = item["retailer"]
    url = item.get("url")
    name = item["retailer_product_name"]

    query = client.table("retailer_products").select("id, product_id").eq("retailer", retailer)
    if url:
        query = query.eq("url", url)
    else:
        query = query.ilike("retailer_product_name", name)

    existing = query.limit(1).execute()
    if existing.data:
        retailer_product_id = existing.data[0]["id"]
        (
            client.table("retailer_products")
            .update(
                {
                    "product_id": product_id,
                    "retailer_product_name": name,
                    "url": url,
                    "is_active": True,
                }
            )
            .eq("id", retailer_product_id)
            .execute()
        )
        return retailer_product_id

    response = (
        client.table("retailer_products")
        .insert(
            {
                "product_id": product_id,
                "retailer": retailer,
                "retailer_product_name": name,
                "url": url,
                "is_active": True,
            }
        )
        .execute()
    )
    return response.data[0]["id"]
