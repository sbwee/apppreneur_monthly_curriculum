const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  SYLLABUS_SCHEMA_VERSION,
  syllabusPayloadV1Schema,
  normalizeLlmSyllabusJson,
} = require("../src/schemas/syllabusPayload");

const RESOURCE_A = "11111111-1111-4111-8111-111111111111";
const RESOURCE_B = "22222222-2222-4222-8222-222222222222";
const DEFAULT_SKELETON_RATIONALE = "Complete this resource as part of your learning path.";

function validPayload(overrides = {}) {
  return {
    schema: SYLLABUS_SCHEMA_VERSION,
    overview: "A comprehensive learning arc across four weeks.",
    source_resource_ids: [RESOURCE_A, RESOURCE_B],
    items: [
      {
        resource_id: RESOURCE_A,
        week_index: 0,
        day_index: 0,
        sequence: 0,
        consumption_minutes: 30,
        practice_minutes: 15,
        rationale: "Foundations and core concepts with applied exercises.",
      },
      {
        resource_id: RESOURCE_B,
        week_index: 0,
        day_index: 2,
        sequence: 1,
        consumption_minutes: 45,
        practice_minutes: null,
        rationale: "Deep dive into advanced patterns and synthesis tasks.",
      },
    ],
    ...overrides,
  };
}

describe("normalizeLlmSyllabusJson", () => {
  test("defaults missing gap_suggestions to []", () => {
    const raw = validPayload();
    delete raw.gap_suggestions;

    const normalized = normalizeLlmSyllabusJson(raw);
    const parsed = syllabusPayloadV1Schema.safeParse(normalized);

    assert.equal(parsed.success, true);
    assert.deepEqual(parsed.data.gap_suggestions, []);
  });

  test("coerces string UUID items into objects", () => {
    const raw = validPayload({
      items: [
        validPayload().items[0],
        RESOURCE_B,
      ],
    });

    const normalized = normalizeLlmSyllabusJson(raw);
    const parsed = syllabusPayloadV1Schema.safeParse(normalized);

    assert.equal(parsed.success, true);
    assert.equal(parsed.data.items[1].resource_id, RESOURCE_B);
    assert.equal(typeof parsed.data.items[1].rationale, "string");
  });

  test("parses JSON-string items into objects", () => {
    const itemObject = validPayload().items[1];
    const raw = validPayload({
      items: [validPayload().items[0], JSON.stringify(itemObject)],
    });

    const normalized = normalizeLlmSyllabusJson(raw);
    const parsed = syllabusPayloadV1Schema.safeParse(normalized);

    assert.equal(parsed.success, true);
    assert.equal(parsed.data.items[1].resource_id, RESOURCE_B);
  });

  test("drops unparseable string items", () => {
    const raw = validPayload({
      items: [validPayload().items[0], "not-a-valid-item"],
    });

    const normalized = normalizeLlmSyllabusJson(raw);
    const parsed = syllabusPayloadV1Schema.safeParse(normalized);

    assert.equal(parsed.success, false);
  });

  test("dedupes duplicate resource_id items and keeps the richer entry", () => {
    const richB = validPayload().items[1];
    const raw = validPayload({
      items: [
        validPayload().items[0],
        richB,
        {
          resource_id: RESOURCE_B,
          week_index: 0,
          day_index: 0,
          sequence: 99,
          consumption_minutes: null,
          practice_minutes: null,
          rationale: DEFAULT_SKELETON_RATIONALE,
        },
      ],
    });

    const normalized = normalizeLlmSyllabusJson(raw);
    const parsed = syllabusPayloadV1Schema.safeParse(normalized);

    assert.equal(parsed.success, true);
    assert.equal(parsed.data.items.length, 2);
    assert.equal(parsed.data.items[1].resource_id, RESOURCE_B);
    assert.equal(parsed.data.items[1].rationale, richB.rationale);
    assert.deepEqual(
      parsed.data.items.map((item) => item.sequence),
      [0, 1],
    );
  });

  test("dedupes when full object and UUID string refer to the same resource", () => {
    const richB = validPayload().items[1];
    const raw = validPayload({
      items: [validPayload().items[0], richB, RESOURCE_B],
    });

    const normalized = normalizeLlmSyllabusJson(raw);
    const parsed = syllabusPayloadV1Schema.safeParse(normalized);

    assert.equal(parsed.success, true);
    assert.equal(parsed.data.items.length, 2);
    assert.equal(parsed.data.items[1].rationale, richB.rationale);
  });

  test("dedupes duplicate source_resource_ids", () => {
    const raw = validPayload({
      source_resource_ids: [RESOURCE_A, RESOURCE_B, RESOURCE_A],
    });

    const normalized = normalizeLlmSyllabusJson(raw);
    const parsed = syllabusPayloadV1Schema.safeParse(normalized);

    assert.equal(parsed.success, true);
    assert.deepEqual(parsed.data.source_resource_ids, [RESOURCE_A, RESOURCE_B]);
  });
});
