from __future__ import annotations

import re
from dataclasses import dataclass


BRAND_ALIASES = {
    "samsung": "Samsung",
    "三星": "Samsung",
    "wd": "Western Digital",
    "wd_black": "Western Digital",
    "western digital": "Western Digital",
    "威騰": "Western Digital",
    "威剛": "ADATA",
    "adata": "ADATA",
    "crucial": "Crucial",
    "美光": "Crucial",
    "kingston": "Kingston",
    "金士頓": "Kingston",
    "solidigm": "Solidigm",
    "seagate": "Seagate",
    "希捷": "Seagate",
    "lexar": "Lexar",
    "雷克沙": "Lexar",
    "kioxia": "Kioxia",
    "鎧俠": "Kioxia",
}

MODEL_PATTERNS = [
    r"\bSN\d{3,4}X?\b",
    r"\bP\d\s?(?:PLUS|PRO)?\b",
    r"\b(?:EVO|PRO)\s?\d{3,4}\b",
    r"\b(?:KC|NV|A|SX|LEGEND|FIRECUDA)\s?-?\d{3,4}[A-Z]?\b",
    r"\bMP\d{3,4}\b",
    r"\bNM\d{3,4}\b",
]


@dataclass
class NormalizedProduct:
    category: str
    brand: str | None
    model: str | None
    capacity: str | None
    interface: str | None
    form_factor: str | None
    standard_name: str


def normalize_ssd_name(name: str) -> NormalizedProduct:
    cleaned = _cleanup_name(name)
    lower = cleaned.lower()

    brand = _extract_brand(lower)
    capacity = _extract_capacity(cleaned)
    interface = _extract_interface(lower)
    form_factor = _extract_form_factor(lower)
    model = _extract_model(cleaned)
    if not model:
        model = _infer_model(cleaned, brand, capacity)

    parts = [part for part in [brand, model, capacity] if part]
    standard_name = " ".join(parts) if parts else cleaned[:120]

    return NormalizedProduct(
        category="ssd",
        brand=brand,
        model=model,
        capacity=capacity,
        interface=interface,
        form_factor=form_factor,
        standard_name=standard_name,
    )


def _cleanup_name(name: str) -> str:
    text = re.sub(r"<[^>]+>", " ", name)
    text = re.sub(r"[\[\]【】()（）,，/｜|]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_brand(lower_name: str) -> str | None:
    normalized = lower_name.replace("-", " ").replace("_", " ")
    for alias, brand in sorted(BRAND_ALIASES.items(), key=lambda item: len(item[0]), reverse=True):
        if alias.replace("_", " ") in normalized:
            return brand
    if "黑標" in lower_name or "black" in lower_name:
        return "Western Digital"
    return None


def _extract_capacity(name: str) -> str | None:
    match = re.search(r"(?P<num>\d+(?:\.\d+)?)\s?(?P<unit>TB|T|GB|G)\b", name, re.IGNORECASE)
    if not match:
        return None
    amount = float(match.group("num"))
    unit = match.group("unit").upper()
    if unit in {"T", "TB"}:
        return f"{int(amount) if amount.is_integer() else amount:g}TB"
    if amount >= 1000:
        tb = amount / 1000
        return f"{int(tb) if tb.is_integer() else tb:g}TB"
    return f"{int(amount)}GB"


def _extract_interface(lower_name: str) -> str | None:
    if "pcie 5" in lower_name or "gen5" in lower_name or "gen 5" in lower_name:
        return "PCIe 5.0 NVMe"
    if "pcie 4" in lower_name or "gen4" in lower_name or "gen 4" in lower_name:
        return "PCIe 4.0 NVMe"
    if "nvme" in lower_name or "m.2" in lower_name:
        return "NVMe"
    if "sata" in lower_name:
        return "SATA"
    return None


def _extract_form_factor(lower_name: str) -> str | None:
    if "m.2" in lower_name or "2280" in lower_name:
        return "M.2 2280"
    if "2.5" in lower_name or "2.5吋" in lower_name:
        return '2.5"'
    return None


def _extract_model(name: str) -> str | None:
    upper_name = name.upper().replace("_", " ")
    for pattern in MODEL_PATTERNS:
        match = re.search(pattern, upper_name)
        if match:
            return re.sub(r"\s+", " ", match.group(0).replace(" -", "-")).strip()
    return None


def _infer_model(name: str, brand: str | None, capacity: str | None) -> str | None:
    text = _cleanup_name(name)
    text = re.sub(r"【[^】]+】", " ", text)
    text = re.sub(r"\[[^\]]+\]", " ", text)
    text = re.sub(r"\([^)]*\)", " ", text)

    first_segment = re.split(r"/|,|，", text, maxsplit=1)[0]
    if capacity:
        first_segment = re.sub(re.escape(capacity).replace("TB", r"\s?(?:TB|T)").replace("GB", r"\s?(?:GB|G)"), " ", first_segment, flags=re.IGNORECASE)
    first_segment = re.sub(r"\b\d+(?:\.\d+)?\s?(?:TB|T|GB|G)\b", " ", first_segment, flags=re.IGNORECASE)

    for alias in sorted(BRAND_ALIASES, key=len, reverse=True):
        first_segment = re.sub(rf"\b{re.escape(alias)}\b", " ", first_segment, flags=re.IGNORECASE)

    if brand == "Western Digital":
        first_segment = re.sub(r"\bWD(?:_BLACK| BLACK)?\b|黑標|Western Digital", " ", first_segment, flags=re.IGNORECASE)

    first_segment = re.sub(r"\b(?:SSD|固態硬碟|M\.2|PCIe|Gen[345]|SATA3?|NVMe|含散熱片|散熱片)\b", " ", first_segment, flags=re.IGNORECASE)
    first_segment = re.sub(r"\s+", " ", first_segment).strip(" -")
    if not first_segment:
        return None

    tokens = first_segment.split()
    inferred = " ".join(tokens[:4]).strip()
    return inferred[:80] or None
