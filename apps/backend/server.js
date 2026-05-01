const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path"); 
const { createClient } = require("@supabase/supabase-js");


const envPath = path.resolve(__dirname, ".env");
console.log("Checking absolute path:", envPath);
dotenv.config({ path: envPath });

const app = express();
const PORT = Number(process.env.PORT || 4000);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// --- DEBUG LOGS ---
console.log("--- Connection Debug ---");
console.log("Looking for .env at:", path.join(__dirname, ".env"));
console.log("SUPABASE_URL found:", !!process.env.SUPABASE_URL);
console.log("SUPABASE_KEY found:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("------------------------");

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

let supabase = null;

// Initialize Supabase only if we have the keys
// --- TEMPORARY HARDCODE FOR PHASE 0 VERIFICATION ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

try {
  supabase = createClient(HARDCODED_URL, HARDCODED_KEY);
  console.log("✅ Supabase client FORCE INITIALIZED (Hardcoded).");
} catch (err) {
  console.error("❌ Hardcode failed:", err.message);
}
// ----------------------------------------------------

app.get("/api/hello", async (_req, res) => {
  if (!supabase) {
    return res.status(500).json({
      message: "Backend is running but Supabase is not configured.",
    });
  }

  const { error } = await supabase.storage.listBuckets();

  if (error) {
    return res.status(500).json({
      message: "Could not verify Supabase connection.",
      error: error.message,
    });
  }

  return res.json({ message: "Hello World from backend + Supabase!" });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    supabaseConfigured: Boolean(supabase),
  });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
