/**
 * @param {Record<string, unknown>} env
 */
function llmEnrichTransportEnv(env) {
  return {
    openaiApiKey: String(env.openaiApiKey || ""),
    openaiModel: String(env.openaiModel || "gpt-4o-mini"),
    openaiTimeoutMs: Number(env.openaiTimeoutMs ?? 120_000),
    openaiMaxRetries: Number(env.openaiMaxRetries ?? 1),
    llmMaxCompletionTokensEnrich: Number(env.llmMaxCompletionTokensEnrich ?? 1024),
  };
}

/**
 * @param {Record<string, unknown>} env
 */
function llmSyllabusCallOpts(env) {
  return {
    apiKey: String(env.openaiApiKey),
    model: String(env.openaiModel || "gpt-4o-mini"),
    timeoutMs: Number(env.openaiTimeoutMs ?? 120_000),
    maxRetries: Number(env.openaiMaxRetries ?? 1),
    maxCompletionTokens: Number(env.llmMaxCompletionTokensSyllabus ?? 12_000),
  };
}

module.exports = { llmEnrichTransportEnv, llmSyllabusCallOpts };
