import argparse
import asyncio
import json
from urllib.parse import urlparse
from crawl4ai import AsyncWebCrawler


async def crawl(url):
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=url)
        if not result.success:
            raise Exception(f"Crawling failed: {result.error_message}")

        markdown = result.markdown
        content = getattr(markdown, "raw_markdown", markdown)

        document = content
        

        links = []
        for link in (result.links or {}).get("internal", []):
            links.append(
                {
                    "url": link.get("href") or link.get("url"),
                    "text": link.get("text", ""),
                }
            )

        return {
            "documents": document,
            "links": links,
        }


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    args = parser.parse_args()

    parsed_url = urlparse(args.url)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        parser.error("--url must be an absolute http or https URL")

    result = await crawl(args.url)
    print(json.dumps(result))


if __name__ == "__main__":
    asyncio.run(main())
