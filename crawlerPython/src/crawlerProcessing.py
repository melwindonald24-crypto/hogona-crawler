import argparse
import asyncio
import json
from crawl4ai import AsyncWebCrawler


async def crawl(url):
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=url)
        if not result.success:
            raise Exception(f"Crawling failed: {result.error_message}")

        markdown = result.markdown
        content = getattr(markdown, "raw_markdown", markdown)

        document = {
            "sourceUrl": url,
            "content": content,
        }

        links = []
        for link in result.links.get("internal", []):
            links.append(
                {
                    "url": link.get("href") or link.get("url"),
                    "text": link.get("text", ""),
                }
            )

        return {
            "documents": [document],
            "links": links,
        }


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    args = parser.parse_args()

    result = await crawl(args.url)
    print(json.dumps(result))


if __name__ == "__main__":
    asyncio.run(main())
