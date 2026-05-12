/**
 * Verifies Supabase connectivity via Storage API (existing hello behavior).
 * @param {import("@supabase/supabase-js").SupabaseClient} client
 */
async function listStorageBuckets(client) {
  return client.storage.listBuckets();
}

module.exports = { listStorageBuckets };
