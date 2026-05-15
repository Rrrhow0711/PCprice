from __future__ import annotations

from typing import Any

import requests
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

from scraper.sites.coolpc import _extract_price, _extract_stock_status, _strip_price


RETAILER = "sinya"
SINYA_SSD_URL = "https://www.sinya.com.tw"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; TaiwanSSDPriceTracker/0.1; +https://github.com/your-org/your-repo)"
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _get(url: str) -> requests.Response:
    response = requests.get(url, headers=HEADERS, timeout=20)
    response.raise_for_status()
    return response


def fetch_ssd_products() -> list[dict[str, Any]]:
    # TODO: 實測欣亞 SSD 分類頁或 API。
    # 建議先用瀏覽器 DevTools Network 找 JSON API；若只有 JS render，
    # 再新增 Playwright fallback function，輸出同一份 dict 格式即可。
    response = _get(SINYA_SSD_URL)
    soup = BeautifulSoup(response.text, "html.parser")

    products: list[dict[str, Any]] = []

    for node in soup.select("[data-product], .product, .prod-item, li"):
        text = node.get_text(" ", strip=True)
        lowered = text.lower()
        if not any(keyword in lowered for keyword in ["ssd", "m.2", "nvme", "固態"]):
            continue
        price = _extract_price(text)
        if price is None:
            continue
        link = node.select_one("a[href]")
        href = link.get("href") if link else None
        url = href if href and href.startswith("http") else f"{SINYA_SSD_URL}{href}" if href else SINYA_SSD_URL
        products.append(
            {
                "retailer": RETAILER,
                "retailer_product_name": _strip_price(text),
                "price": price,
                "stock_status": _extract_stock_status(text),
                "url": url,
                "raw_payload": {"text": text},
            }
        )

    return products


async def fetch_ssd_products_with_playwright() -> list[dict[str, Any]]:
    # TODO: 若 requests 無法取得商品資料，在 main.py 中切換呼叫此 function。
    # 保留這個入口是為了避免未來把 Playwright 邏輯混入 requests parser。
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
      browser = await p.chromium.launch()
      page = await browser.new_page()
      await page.goto(SINYA_SSD_URL, wait_until="networkidle", timeout=30000)
      html = await page.content()
      await browser.close()

    soup = BeautifulSoup(html, "html.parser")
    products: list[dict[str, Any]] = []
    for node in soup.select("[data-product], .product, .prod-item, li"):
        text = node.get_text(" ", strip=True)
        if "ssd" not in text.lower() and "固態" not in text:
            continue
        price = _extract_price(text)
        if price is None:
            continue
        products.append(
            {
                "retailer": RETAILER,
                "retailer_product_name": _strip_price(text),
                "price": price,
                "stock_status": _extract_stock_status(text),
                "url": SINYA_SSD_URL,
                "raw_payload": {"text": text, "source": "playwright"},
            }
        )
    return products
