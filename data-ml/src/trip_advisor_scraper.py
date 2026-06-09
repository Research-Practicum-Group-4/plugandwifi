import asyncio
import json
from typing import List, TypedDict
from urllib.parse import quote

import httpx
from bs4 import BeautifulSoup
from loguru import logger as log


class LocationData(TypedDict, total=False):
    localizedName: str
    url: str


BASE_HEADERS = {
    "accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,*/*;q=0.8"
    ),
    "accept-language": "en-US,en;q=0.9",
    "user-agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}


async def scrape_location_data(query: str, client: httpx.AsyncClient) -> List[LocationData]:
    log.info(f"scraping location data: {query}")

    url = f"https://www.tripadvisor.com/Search?q={quote(query)}"

    response = await client.get(url)
    print("STATUS:", response.status_code)
    print("CONTENT-TYPE:", response.headers.get("content-type"))

    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    results: List[LocationData] = []

    for link in soup.select("a[href]"):
        href = link.get("href", "")
        text = link.get_text(" ", strip=True)

        if not text:
            continue

        if href.startswith("/"):
            href = "https://www.tripadvisor.com" + href

        if "tripadvisor.com" not in href:
            continue

        if any(part in href for part in ["/Tourism-", "/Hotels-", "/Attractions-", "/Restaurants-"]):
            results.append(
                {
                    "localizedName": text,
                    "url": href,
                }
            )

    # Deduplicate
    seen = set()
    unique_results = []

    for item in results:
        key = item["url"]
        if key not in seen:
            seen.add(key)
            unique_results.append(item)

    log.info(f"found {len(unique_results)} results")
    return unique_results[:10]


async def run():
    async with httpx.AsyncClient(
        headers=BASE_HEADERS,
        timeout=httpx.Timeout(30.0),
        follow_redirects=True,
    ) as client:
        result = await scrape_location_data("Malta", client)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    asyncio.run(run())