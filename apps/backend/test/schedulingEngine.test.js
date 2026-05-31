const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  spreadDayOffsets,
  buildBootstrapRowsAcrossSprint,
  computeSprintRebalanceUpdates,
  clampSprintDays,
} = require("../src/services/schedulingEngine");

describe("schedulingEngine sprint spread", () => {
  test("spreadDayOffsets distributes evenly across sprint days", () => {
    assert.deepEqual(spreadDayOffsets(5, 30), [0, 7, 15, 22, 29]);
    assert.deepEqual(spreadDayOffsets(1, 30), [0]);
  });

  test("clampSprintDays enforces bounds", () => {
    assert.equal(clampSprintDays(30), 30);
    assert.equal(clampSprintDays(3), 7);
    assert.equal(clampSprintDays(120), 90);
  });

  test("buildBootstrapRowsAcrossSprint maps items to calendar dates", () => {
    const rows = buildBootstrapRowsAcrossSprint(
      [
        { id: "a", position: 0 },
        { id: "b", position: 1 },
        { id: "c", position: 2 },
      ],
      "2026-05-01",
      30,
    );

    assert.equal(rows.length, 3);
    assert.equal(rows[0].scheduled_date, "2026-05-01");
    assert.equal(rows[2].scheduled_date, "2026-05-30");
  });

  test("computeSprintRebalanceUpdates skips done assignments", () => {
    const updates = computeSprintRebalanceUpdates(
      [
        { id: "item-a", position: 0 },
        { id: "item-b", position: 1 },
      ],
      [
        {
          id: "assign-a",
          curriculum_item_id: "item-a",
          scheduled_date: "2026-05-01",
          status: "done",
        },
        {
          id: "assign-b",
          curriculum_item_id: "item-b",
          scheduled_date: "2026-05-15",
          status: "planned",
        },
      ],
      "2026-05-01",
      30,
    );

    assert.equal(updates.length, 1);
    assert.equal(updates[0].id, "assign-b");
    assert.equal(updates[0].scheduled_date, "2026-05-30");
  });
});
