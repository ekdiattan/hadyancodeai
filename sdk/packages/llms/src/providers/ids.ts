/**
 * Built-in provider IDs
 *
 * Single source of truth for all built-in provider identifiers.
 * Use BUILT_IN_PROVIDER_IDS for runtime operations (validation, iteration)
 * Use BuiltInProviderId type for compile-time type safety
 */
import { GENERATED_PROVIDER_IDS } from "./provider-ids.generated";

export enum BUILT_IN_PROVIDER {
	// Claude
	ANTHROPIC = "anthropic",
	CLAUDE_CODE = "claude-code",
	// DeepSeek
	DEEPSEEK = "deepseek",
	// First-party HadyanCode gateway (OpenRouter-backed) and its subscription tier.
	// Both are restricted to Claude + DeepSeek by ./first-party-models.
	HADYANCODE = "hadyancode",
	HADYANCODE_PASS = "hadyancode-pass",
}

/**
 * Provider ID aliases normalized to canonical built-in IDs.
 *
 * Keep this map as the single source of truth for alias handling.
 */
export type GeneratedBuiltInProviderId =
	(typeof GENERATED_PROVIDER_IDS)[number];

export type BuiltInProviderId = BUILT_IN_PROVIDER | GeneratedBuiltInProviderId;

export const PROVIDER_ID_ALIASES: Record<string, BuiltInProviderId> = {};

export const BUILT_IN_PROVIDER_IDS = [
	...new Set([...Object.values(BUILT_IN_PROVIDER), ...GENERATED_PROVIDER_IDS]),
] as readonly BuiltInProviderId[];

/** Check if a string is a valid built-in provider ID */
export function isBuiltInProviderId(id: string): id is BuiltInProviderId {
	return BUILT_IN_PROVIDER_IDS.includes(id as BuiltInProviderId);
}

/** Normalize provider aliases to canonical IDs */
export function normalizeProviderId(providerId: string): string {
	const normalized = providerId.trim();
	return PROVIDER_ID_ALIASES[normalized] ?? normalized;
}
