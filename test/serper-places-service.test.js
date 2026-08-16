import assert from "node:assert/strict";
import test from "node:test";
import axios from "axios";

import serperPlacesService, { SERPER_PLACES_URL } from "../services/discovery/serperPlacesService.js";

test("Serper Places sends the configured query and returns the raw provider response", async (t) => {
    const originalPost = axios.post;
    const originalApiKey = process.env.SERPER_API_KEY;
    let request;

    process.env.SERPER_API_KEY = "test-key";
    axios.post = async (url, body, options) => {
        request = { url, body, options };
        return { data: { places: [{ title: "Test Place" }] } };
    };

    t.after(() => {
        axios.post = originalPost;
        if (originalApiKey === undefined) delete process.env.SERPER_API_KEY;
        else process.env.SERPER_API_KEY = originalApiKey;
    });

    const documents = await serperPlacesService.getDocuments({
        config: { q: "tourist places in Udupi, Karnataka", gl: "in", hl: "en" },
    });

    assert.equal(request.url, SERPER_PLACES_URL);
    assert.deepEqual(request.body, {
        q: "tourist places in Udupi, Karnataka",
        gl: "in",
        hl: "en",
    });
    assert.equal(request.options.headers["X-API-KEY"], "test-key");
    assert.deepEqual(documents, [{
        source_url: SERPER_PLACES_URL,
        content: { places: [{ title: "Test Place" }] },
    }]);
});

test("Serper Places requires an API key and a query", async () => {
    const originalApiKey = process.env.SERPER_API_KEY;
    delete process.env.SERPER_API_KEY;

    await assert.rejects(
        serperPlacesService.getDocuments({ config: { q: "tourist places in Udupi" } }),
        /SERPER_API_KEY is not configured/,
    );
    await assert.rejects(
        serperPlacesService.getDocuments({ config: {} }),
        /config\.q query/,
    );

    if (originalApiKey !== undefined) process.env.SERPER_API_KEY = originalApiKey;
});
