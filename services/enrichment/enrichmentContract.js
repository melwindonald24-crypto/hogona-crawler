import crypto from "node:crypto";

export const TRAVERSABILITY_VALUES = ["easy", "moderate", "difficult"];
export const NARRATIVE_PLACE_FIELDS = [
  "micro_region",
  "vibe",
  "summary",
  "best_time",
];
export const PLANNING_ATTRIBUTE_FIELDS = [
  "description",
  "elevation_or_height",
  "legend_or_history",
  "how_to_reach",
  "access_restrictions",
  "safety_notes",
  "local_name_variants",
  "notes",
];

export function parseSerperResponse(content) {
  const response = typeof content === "string" ? JSON.parse(content) : content;
  return Array.isArray(response?.places) ? response.places : [];
}

export function sourcePlaceId(place) {
  if (place.placeId) return `place:${place.placeId}`;
  if (place.cid) return `cid:${place.cid}`;
  return `hash:${crypto.createHash("sha256").update(JSON.stringify(place)).digest("hex")}`;
}

const EXAMPLE_FILLED = {
    job_id: "example-uuid-1",
    place_fields: {
        traversability: "easy",
        micro_region: "Madikeri",
        vibe: "quick-scenic-stop",
        summary: "A majestic waterfall near Madikeri, reached through coffee estates via a short walk.",
        best_time: "Jun-Sep, monsoon for full flow",
        visit_duration_minutes: 45,
        co_ords: {
            lat: 12.3456,
            lng: 78.9012
        },
    },
    planning_attributes: {
        description:
            "A waterfall on an early tributary of the Kaveri, reached through private coffee and cardamom estates. A hanging bridge gives an elevated view; swimming isn't allowed.",
        elevation_or_height: "~70 ft (21 m)",
        legend_or_history: null,
        how_to_reach: "Short walk/drive from Madikeri via estate roads; entry 9 AM-5 PM.",
        access_restrictions: null,
        safety_notes: "No swimming permitted; slippery rocks near the base.",
        local_name_variants: ["Jessy Falls"],
        notes: null,
    },
    sources: ["https://karnatakatourism.org/abbey-falls", "https://kodagu.nic.in"],
};


const EXAMPLE_EMPTY = {
    job_id: "example-uuid-2",
    place_fields: {
        traversability: "moderate",
        micro_region: null,
        vibe: null,
        summary: null,
        best_time: null,
        visit_duration_minutes: 60,
        co_ords: {
            lat: 12.3456,
            lng: 78.9012
        },
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
};

export function buildBatchPayload(jobs, batchId) {
    return {
        batch_id: batchId,
        status: "pending",
        instructions: [
            "You are filling in real data fields for GPS-confirmed tourist places in Karnataka, India, for a travel app's database. Every field either gets shown to a traveler directly or read by an AI writing their itinerary — accuracy matters more than completeness.",
            "RULE 0-if you find the place irrelevant like a random park or a random place that is not a tourist place, then you can skip it and leave all fields null. This is not a failure case.",
            "RULE 1 — Cite or leave null. Use web search for every fact. If you can't find a reliable source for a field, set it to null. Never fill a null with a plausible-sounding guess. For obscure places, most fields being null is the normal, correct outcome, not a failure.",
            "RULE 2 — Report disagreement, don't resolve it silently. If sources give different numbers for the same fact (e.g. two different heights for one waterfall), don't pick one or average — state both and which source said what.",
            "RULE 3 — Every filled narrative field needs a source behind it. If \"sources\" is empty, every narrative field listed below must be null.",
            "RULE 4 — traversability and visit_duration_minutes are always required, and are the one exception to Rule 3 — they don't need a source. These are your reasoned estimate based on what kind of place it is, not a cited fact. traversability is exactly one of: \"easy\" (drive-up or short walk), \"moderate\" (a walk or short trek with real effort), \"difficult\" (a real trek, technical terrain, or requires a guide/permit) — no other values. visit_duration_minutes is a whole number: how long a typical visitor spends here (a quick photo stop is ~30-45, a half-day trek is 180+).",
            "RULE 5 — Do not include a confidence field. That is set separately after human review, never by this step.",
            "Return a JSON array only, no prose before or after, one object per place, in exactly this shape (a fully-documented example):",
            JSON.stringify(EXAMPLE_FILLED, null, 2),
            "And here's an equally correct result for an obscure place where nothing checks out — this is not a failure case, submit it exactly like this:",
            JSON.stringify(EXAMPLE_EMPTY, null, 2),
            "Field meanings — place_fields.micro_region: the named town/area this place clusters under, ONLY if that town has its own real tourism identity (its own lodging, its own 'things to do in X' search results). Most places should get null here — don't invent a cluster to fill the field.",
            "place_fields.vibe: a short mood/theme tag, e.g. 'spiritual', 'adventure-trek', 'family-day-trip', 'quick-scenic-stop', 'wildlife', 'pilgrimage' — a tag, not a sentence.",
            "place_fields.summary: one factual sentence, written for a browse card.",
            "place_fields.best_time: season/month guidance in your own words.",
            "planning_attributes.description: 2-4 sentences on what makes this place distinct from similar ones nearby — synthesized prose, not a fact dump.",
            "planning_attributes.elevation_or_height: with unit, for peaks/waterfalls; else null.",
            "planning_attributes.legend_or_history: a notable story, myth, or historical origin, if one exists.",
            "planning_attributes.how_to_reach: base town/village and physical access — trek, drive, boat.",
            "planning_attributes.access_restrictions: permits, seasonal bans, closed periods. Being ALLOWED there, not the physical route — keep this out of how_to_reach.",
            "planning_attributes.safety_notes: real hazards — flash floods, cliff edges, wildlife activity, drowning risk — the kind of thing that should make an itinerary add a caution. Not generic safety filler.",
            "planning_attributes.local_name_variants: other names this place is called locally, if any.",
            "planning_attributes.notes: anything else true and worth knowing that doesn't fit a field above.",
            "place_fields.co_ords: the GPS coordinates of the place, in decimal degrees.same as it is in the input data,if the input data has no co_ords, then it should be null.",],
        places: jobs.map((job) => ({
            job_id: job.id,
            district: job.district,
            category: job.category,
            serper_metadata: job.input_data.serper_metadata,
        })),
    };
}


function isFilled(value) {
  return typeof value === "string"
    ? value.trim() !== ""
    : Array.isArray(value) && value.length > 0;
}

function hasSourceForField(sources, fieldName) {
  return (
    Array.isArray(sources) &&
    sources.some((source) => {
      try {
        const url = new URL(source?.url);
        return (
          ["http:", "https:"].includes(url.protocol) &&
          Array.isArray(source.supports) &&
          source.supports.includes(fieldName)
        );
      } catch {
        return false;
      }
    })
  );
}

export function validateCompletedBatch(batch) {
  if (!batch || typeof batch !== "object" || Array.isArray(batch))
    throw new Error("The result file must contain a JSON object.");
  if (typeof batch.batch_id !== "string" || !batch.batch_id.trim())
    throw new Error("Result is missing batch_id.");
  if (batch.status !== "completed")
    throw new Error('Result status must be "completed".');
  if (!Array.isArray(batch.places) || batch.places.length === 0)
    throw new Error("Result must contain at least one place.");

  const jobIds = new Set();
  for (const result of batch.places) {
    if (
      !result ||
      typeof result.job_id !== "string" ||
      !result.place_fields ||
      !result.planning_attributes
    )
      throw new Error(
        "Every place requires job_id, place_fields, and planning_attributes.",
      );
    if (jobIds.has(result.job_id))
      throw new Error(`Duplicate job_id in result: ${result.job_id}.`);
    jobIds.add(result.job_id);

    const { place_fields, planning_attributes, sources } = result;
    if (!TRAVERSABILITY_VALUES.includes(place_fields.traversability))
      throw new Error(
        `Result for ${result.job_id} has invalid traversability.`,
      );
    if (
      !Number.isInteger(place_fields.visit_duration_minutes) ||
      place_fields.visit_duration_minutes <= 0
    )
      throw new Error(
        `Result for ${result.job_id} needs a positive whole visit_duration_minutes.`,
      );
    if ("confidence" in result)
      throw new Error(`Result for ${result.job_id} must not set confidence.`);
    for (const field of NARRATIVE_PLACE_FIELDS)
      if (isFilled(place_fields[field]) && !hasSourceForField(sources, field))
        throw new Error(
          `Result for ${result.job_id} has "${field}" filled without a supporting source.`,
        );

    for (const field of PLANNING_ATTRIBUTE_FIELDS)
      if (
        isFilled(planning_attributes[field]) &&
        !hasSourceForField(sources, field)
      )
        throw new Error(
          `Result for ${result.job_id} has "${field}" filled without a supporting source.`,
        );
  }
  return batch;
}
