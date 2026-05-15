from __future__ import annotations

import argparse
import importlib
import time
from collections.abc import Callable
from typing import Any

from scraper.utils.db_client import (
    create_scrape_log,
    finish_scrape_log,
    get_connection,
    save_scraped_item,
)


SITE_MODULES = {
    "coolpc": "scraper.sites.coolpc",
    "sinya": "scraper.sites.sinya",
}


def run_site(retailer: str, fetcher: Callable[[], list[dict[str, Any]]]) -> None:
    with get_connection() as conn:
        log_id = create_scrape_log(conn, retailer=retailer, category="ssd")
        items_found = 0
        items_saved = 0
        errors: list[str] = []

        try:
            print(f"[{retailer}] fetching SSD products...", flush=True)
            items = fetcher()
            items_found = len(items)
            print(f"[{retailer}] found {items_found} candidate items", flush=True)
            for item in items:
                try:
                    if item.get("price") is None:
                        errors.append(f"Skipped item without price: {item.get('retailer_product_name', '')[:80]}")
                        continue
                    save_scraped_item(conn, item)
                    items_saved += 1
                    if items_saved % 25 == 0:
                        print(f"[{retailer}] saved {items_saved}/{items_found}", flush=True)
                    time.sleep(0.03)
                except Exception as exc:
                    errors.append(f"{item.get('retailer_product_name', 'unknown')[:80]}: {exc}")

            status = "success" if not errors else "partial"
            message = "OK" if not errors else " ; ".join(errors[:20])
            finish_scrape_log(conn, log_id, status, message, items_found, items_saved)
            print(f"[{retailer}] finished with status={status}, saved={items_saved}", flush=True)
        except Exception as exc:
            finish_scrape_log(conn, log_id, "failed", str(exc), items_found, items_saved)
            raise


def load_fetcher(retailer: str) -> Callable[[], list[dict[str, Any]]]:
    module_name = SITE_MODULES[retailer]
    module = importlib.import_module(module_name)
    return getattr(module, "fetch_ssd_products")


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape Taiwan SSD prices.")
    parser.add_argument("--retailer", choices=[*SITE_MODULES.keys(), "all"], default="all")
    args = parser.parse_args()

    retailers = SITE_MODULES.keys() if args.retailer == "all" else [args.retailer]
    for retailer in retailers:
        fetcher = load_fetcher(retailer)
        run_site(retailer, fetcher)
        time.sleep(2)


if __name__ == "__main__":
    main()
