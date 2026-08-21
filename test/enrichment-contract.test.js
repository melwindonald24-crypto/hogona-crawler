import assert from "node:assert/strict";
import test from "node:test";
import { buildBatchPayload, parseSerperResponse, sourcePlaceId, validateCompletedBatch } from "../services/enrichment/enrichmentContract.js";

function result() {
    return {
        job_id: "9ec4b63a-af6a-4bcf-b2b2-ff304049f104",
        place_fields: { traversability: "easy", micro_region: null, vibe: null, summary: null, best_time: null, visit_duration_minutes: 45 },
        planning_attributes: { description: null, elevation_or_height: null, legend_or_history: null, how_to_reach: null, access_restrictions: null, safety_notes: null, local_name_variants: [], notes: null },
        sources: [],
    };
}

function batch(places = [result()]) { return { batch_id: "batch-2026-08-17-test", status: "completed", places }; }

test("parses Serper Places records and creates stable provider identities", () => {
    assert.deepEqual(parseSerperResponse('{"places":[{"title":"Abbey Falls"}]}'), [{ title: "Abbey Falls" }]);
    assert.equal(sourcePlaceId({ placeId: "abc" }), "place:abc");
    assert.match(sourcePlaceId({ title: "Fallback" }), /^hash:/);
});

test("builds a self-contained Drive batch", () => {
    const payload = buildBatchPayload([{ id: result().job_id, district: "Kodagu", category: "water", input_data: { serper_metadata: { title: "Abbey Falls" } } }], "batch-1");
    assert.equal(payload.batch_id, "batch-1");
    assert.equal(payload.status, "pending");
    assert.equal(payload.places[0].serper_metadata.title, "Abbey Falls");
});

test("accepts a completed all-null factual result with required estimates", () => {
    const value = batch();
    assert.deepEqual(validateCompletedBatch(value), value);
});

test("requires a completed identified batch with unique jobs", () => {
    assert.throws(() => validateCompletedBatch({ status: "completed", places: [result()] }), /batch_id/);
    assert.throws(() => validateCompletedBatch({ batch_id: "batch-1", status: "pending", places: [result()] }), /completed/);
    assert.throws(() => validateCompletedBatch(batch([result(), result()])), /Duplicate/);
});

test("requires a valid field-specific source for filled facts", () => {
    const unsupported = result();
    unsupported.planning_attributes.description = "A waterfall near Madikeri.";
    unsupported.sources = [{ url: "https://example.com", supports: ["summary"] }];
    assert.throws(() => validateCompletedBatch(batch([unsupported])), /description/);

    const supported = result();
    supported.planning_attributes.description = "A waterfall near Madikeri.";
    supported.sources = [{ url: "https://example.com", supports: ["description"] }];
    const value = batch([supported]);
    assert.deepEqual(validateCompletedBatch(value), value);
});
