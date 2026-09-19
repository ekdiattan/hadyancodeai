/**
 * Canonical default model for the first-party HadyanCode gateway provider.
 *
 * The gateway is OpenRouter-backed, so this keeps the marketplace `vendor/model`
 * shape the gateway expects on the wire, and must stay inside the first-party
 * model policy (Claude + DeepSeek).
 */
export const HADYANCODE_DEFAULT_MODEL_ID = "anthropic/claude-sonnet-5";
