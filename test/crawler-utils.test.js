import assert from "node:assert/strict";
import test from "node:test";

import CrawlFilter from "../services/crawlerPython/crawlerJs/filter/crawlFilter.js";
import CrawlPriority from "../services/crawlerPython/crawlerJs/ranker/crawlPriority.js";
import TextNormalizer from "../services/crawlerPython/crawlerJs/ranker/textNormalizer.js";

test("CrawlFilter rejects utility pages and malformed URLs", () => {
    assert.equal(CrawlFilter.isBlacklisted("https://example.com/privacy-policy"), true);
    assert.equal(CrawlFilter.isBlacklisted("not a URL"), true);
    assert.equal(CrawlFilter.isBlacklisted("https://example.com/destinations/munnar"), false);
});

test("TextNormalizer produces searchable tokens", () => {
    assert.deepEqual(
        TextNormalizer.normalize("Waterfalls & beaches!"),
        ["waterfal", "beach"],
    );
});

test("CrawlPriority rewards travel-related links and anchor text", () => {
    const score = CrawlPriority.urlScore({
        url: "https://example.com/guides/waterfalls",
        text: "Hidden waterfall travel guide",
    });

    assert.ok(score > 1);
});
