from __future__ import annotations

import re
from typing import Any

import requests
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential


RETAILER = "coolpc"
COOLPC_PRICE_URL = "https://www.coolpc.com.tw/evaluate.php"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; TaiwanSSDPriceTracker/0.1; +https://github.com/your-org/your-repo)"
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _get(url: str) -> requests.Response:
    response = requests.get(url, headers=HEADERS, timeout=20)
    response.raise_for_status()
    return response


def fetch_ssd_products() -> list[dict[str, Any]]:
    response = _get(COOLPC_PRICE_URL)
    soup = BeautifulSoup(response.text, "html.parser")

    # TODO: 原價屋報價頁的 HTML 結構可能隨時間調整。若 evaluate.php 改版，
    # 優先改這個 adapter，不要動 main.py 或 Supabase 寫入層。
    text = soup.get_text("\n", strip=True)
    candidates = _extract_ssd_lines(text)

    products: list[dict[str, Any]] = []
    for line in candidates:
        try:
            price = _extract_price(line)
            if price is None:
                continue
            products.append(
                {
                    "retailer": RETAILER,
                    "retailer_product_name": _strip_price(line),
                    "price": price,
                    "stock_status": _extract_stock_status(line),
                    "url": COOLPC_PRICE_URL,
                    "raw_payload": {"line": line},
                }
            )
        except Exception as exc:
            products.append(
                {
                    "retailer": RETAILER,
                    "retailer_product_name": line[:160],
                    "price": None,
                    "stock_status": "unknown",
                    "url": COOLPC_PRICE_URL,
                    "raw_payload": {"line": line, "parse_error": str(exc)},
                }
            )

    return products


def _extract_ssd_lines(text: str) -> list[str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    keywords = ("ssd", "m.2", "nvme", "固態", "sn850", "990 pro", "p3 plus", "kc3000")
    return [line for line in lines if any(keyword in line.lower() for keyword in keywords) and _extract_price(line)]


def _extract_price(text: str) -> int | None:
    matches = re.findall(r"(?:\$|NT\$?)?\s?([1-9]\d{2,5})(?:\s?元)?", text.replace(",", ""))
    if not matches:
        return None
    prices = [int(match) for match in matches]
    plausible = [price for price in prices if 300 <= price <= 100000]
    return plausible[-1] if plausible else None


def _strip_price(text: str) -> str:
    return re.sub(r"(?:\$|NT\$?)?\s?[1-9]\d{2,5}(?:\s?元)?", " ", text.replace(",", "")).strip(" -｜|")


def _extract_stock_status(text: str) -> str:
    lowered = text.lower()
    if any(word in lowered for word in ["售完", "缺貨", "補貨", "out of stock"]):
        return "out_of_stock"
    if any(word in lowered for word in ["現貨", "熱賣", "有貨", "in stock"]):
        return "in_stock"
    return "unknown"
