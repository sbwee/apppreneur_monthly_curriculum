process.env.NODE_ENV = "test";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../src/app");

describe("createApp", () => {
  test("GET /api/health returns ok and supabaseConfigured", async () => {
    const app = createApp({
      frontendUrl: "http://localhost:3000",
      supabase: { client: null, configured: false },
      env: {},
    });
    const res = await request(app).get("/api/health");
    assert.ok(res.headers["x-request-id"], "X-Request-Id header should be set");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      ok: true,
      supabaseConfigured: false,
    });
  });

  test("GET /api/hello returns 503 when Supabase is not configured", async () => {
    const app = createApp({
      frontendUrl: "http://localhost:3000",
      supabase: { client: null, configured: false },
      env: {},
    });
    const res = await request(app).get("/api/hello");
    assert.equal(res.status, 503);
    assert.equal(res.body.error?.code, "SUPABASE_NOT_CONFIGURED");
    assert.match(res.body.error?.message || "", /SUPABASE_URL/);
  });

  test("GET /api/folders without auth returns 401", async () => {
    const app = createApp({
      frontendUrl: "http://localhost:3000",
      supabase: { client: null, configured: false },
      env: {},
    });
    const res = await request(app).get("/api/folders");
    assert.equal(res.status, 401);
    assert.equal(res.body.error?.code, "UNAUTHORIZED");
  });

  test("GET /api/folders with Bearer but admin not configured returns 503", async () => {
    const app = createApp({
      frontendUrl: "http://localhost:3000",
      supabase: { client: null, configured: false },
      env: { supabaseAnonKey: "anon" },
    });
    const res = await request(app).get("/api/folders").set("Authorization", "Bearer fake");
    assert.equal(res.status, 503);
    assert.equal(res.body.error?.code, "SERVER_CONFIG");
  });

  test("GET /api/curricula without auth returns 401", async () => {
    const app = createApp({
      frontendUrl: "http://localhost:3000",
      supabase: { client: null, configured: false },
      env: {},
    });
    const res = await request(app).get("/api/curricula");
    assert.equal(res.status, 401);
    assert.equal(res.body.error?.code, "UNAUTHORIZED");
  });

  test("POST /api/curricula/:id/schedule/reslide without auth returns 401", async () => {
    const app = createApp({
      frontendUrl: "http://localhost:3000",
      supabase: { client: null, configured: false },
      env: {},
    });
    const id = "00000000-0000-4000-8000-000000000001";
    const res = await request(app).post(`/api/curricula/${id}/schedule/reslide`).send({ missed_date: "2026-05-01" });
    assert.equal(res.status, 401);
    assert.equal(res.body.error?.code, "UNAUTHORIZED");
  });

  test("GET /api/notes without auth returns 401", async () => {
    const app = createApp({
      frontendUrl: "http://localhost:3000",
      supabase: { client: null, configured: false },
      env: {},
    });
    const res = await request(app).get("/api/notes").query({ resource_id: "00000000-0000-4000-8000-000000000002" });
    assert.equal(res.status, 401);
    assert.equal(res.body.error?.code, "UNAUTHORIZED");
  });

  test("GET /api/public/:slug without admin returns 503", async () => {
    const app = createApp({
      frontendUrl: "http://localhost:3000",
      supabase: { client: null, configured: false },
      env: {},
    });
    const res = await request(app).get("/api/public/my-showcase");
    assert.equal(res.status, 503);
    assert.equal(res.body.error?.code, "SERVER_CONFIG");
  });

  test("GET /api/public/:slug with invalid slug returns 400", async () => {
    const app = createApp({
      frontendUrl: "http://localhost:3000",
      supabase: { client: null, configured: false },
      env: {},
    });
    const res = await request(app).get("/api/public/not%20valid");
    assert.equal(res.status, 400);
    assert.equal(res.body.error?.code, "VALIDATION_ERROR");
  });

  test("GET /api/missing returns 404 envelope", async () => {
    const app = createApp({
      frontendUrl: "http://localhost:3000",
      supabase: { client: null, configured: false },
      env: {},
    });
    const res = await request(app).get("/api/missing");
    assert.equal(res.status, 404);
    assert.equal(res.body.error?.code, "NOT_FOUND");
  });
});
