import assert from "node:assert/strict";
import test from "node:test";

import { chatGptPacket, parseSerperResponse, sourcePlaceId, validateImportedResults } from "../services/enrichment/manualEnrichment.js";

const baseFilled = () => ({
    job_id: "9ec4b63a-af6a-4bcf-b2b2-ff304049f104",
    place_fields: {
        traversability: "easy",
        micro_region: null,
        vibe: null,
        summary: null,
        best_time: null,
        visit_duration_minutes: 45,
    },
    planning_attributes: {
        description: null,
        elevation_or_height: null,
        legend_or_history: null,
        how_to_reach: null,
        access_restrictions: null,
        safety_notes: null,
        local_name_variants: [],
        notes: null,
    },
    sources: [],
});

test("parses only Serper Places records", () => {
    assert.deepEqual(parseSerperResponse('{"places":[{"title":"Abbey Falls"}]}'), [{ title: "Abbey Falls" }]);
    assert.deepEqual(parseSerperResponse('{"organic":[]}'), []);
});

test("uses a stable provider identity for enrichment jobs", () => {
    assert.equal(sourcePlaceId({ placeId: "ChIJ123" }), "place:ChIJ123");
    assert.equal(sourcePlaceId({ cid: "123" }), "cid:123");
    assert.match(sourcePlaceId({ title: "Fallback" }), /^hash:/);
});

test("creates a paste-ready packet with a worked example for both the filled and empty case", () => {
    const packet = chatGptPacket([{
        id: "9ec4b63a-af6a-4bcf-b2b2-ff304049f104",
        district: "Kodagu",
        category: "water",
        input_data: { serper_metadata: { title: "Abbey Falls" } },
    }]);

    assert.equal(packet.places[0].serper_metadata.title, "Abbey Falls");
    assert.equal(packet.places[0].category, "water");
    // both worked examples are inlined into the instructions the same way,
    // so ChatGPT sees a filled AND a mostly-null case as equally valid
    assert.ok(packet.instructions.some((line) => line.includes("micro_region")));
    assert.ok(packet.instructions.some((line) => line.includes("example-uuid-2")));
});

test("accepts a fully null-heavy result as long as the two estimate fields are set", () => {
    const value = [baseFilled()];
    assert.deepEqual(validateImportedResults(value), value);
});

test("rejects a missing place_fields or planning_attributes bucket", () => {
    assert.throws(
        () => validateImportedResults([{ job_id: "x", planning_attributes: {} }]),
        /place_fields/,
    );
});

test("rejects an invalid traversability value", () => {
    const value = baseFilled();
    value.place_fields.traversability = "moderate-ish";
    assert.throws(() => validateImportedResults([value]), /must be exactly one of/);
});

test("rejects a missing visit_duration_minutes", () => {
    const value = baseFilled();
    value.place_fields.visit_duration_minutes = null;
    assert.throws(() => validateImportedResults([value]), /visit_duration_minutes/);
});

test("rejects narrative content in planning_attributes with no sources", () => {
    const value = baseFilled();
    value.planning_attributes.description = "A waterfall near Madikeri.";
    assert.throws(() => validateImportedResults([value]), /no sources/);
});

test("rejects narrative content in place_fields (e.g. summary) with no sources", () => {
    const value = baseFilled();
    value.place_fields.summary = "A 70ft waterfall near Madikeri.";
    assert.throws(() => validateImportedResults([value]), /no sources/);
});

test("accepts sourced narrative content", () => {
    const value = baseFilled();
    value.planning_attributes.description = "A waterfall near Madikeri.";
    value.sources = ["https://karnatakatourism.org/abbey-falls"];
    assert.deepEqual(validateImportedResults([value]), [value]);
});

test("rejects a result that tries to self-assign verified confidence", () => {
    const value = baseFilled();
    value.confidence = "verified";
    assert.throws(() => validateImportedResults([value]), /never by the enrichment pass/);
});
