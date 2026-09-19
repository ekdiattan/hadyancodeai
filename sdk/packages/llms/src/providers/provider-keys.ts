/**
 * Relates the provider identifiers used at each stage of catalog generation and
 * runtime provider selection:
 *
 * - `modelsDevKey` is the provider's key in the models.dev API payload.
 * - `generatedProviderId` is HadyanCode's canonical ID for the provider spec and
 *   model catalog generated from that payload. Generation maps
 *   `modelsDevKey -> generatedProviderId` so upstream names do not leak into
 *   HadyanCode's public provider IDs.
 * - `runtimeProviderId` is the ID of a configured provider implementation that
 *   should read models from that generated catalog.
 *
 * Generated and runtime IDs are separate because multiple runtime transports or
 * authentication methods can share one catalog. For example, `openai-native`,
 * `openai-codex`, and `openai-codex-cli` are distinct runtime providers, but all
 * resolve to the `openai-native` catalog generated from models.dev's `openai`
 * entry. `resolveProviderModelCatalogKeys` performs that runtime-to-catalog
 * lookup. An omitted generated or runtime ID means that row participates only
 * in the other applicable lookup.
 */
const PROVIDER_IDS_MAP: ReadonlyArray<{
	modelsDevKey: string;
	generatedProviderId?: string;
	runtimeProviderId?: string;
}> = [
	{ modelsDevKey: "anthropic", generatedProviderId: "anthropic" },
	{
		modelsDevKey: "anthropic",
		generatedProviderId: "anthropic",
		runtimeProviderId: "claude-code",
	},
	{
		modelsDevKey: "deepseek",
		generatedProviderId: "deepseek",
		runtimeProviderId: "deepseek",
	},
	{
		// The first-party gateway is OpenRouter-backed: its catalog is the
		// marketplace's Claude + DeepSeek subset, baked under our own provider id
		// so the marketplace provider itself is never registered. The model-level
		// policy is applied by scripts/generate-models.ts and by
		// filterHadyanCodeGatewayModels at runtime.
		modelsDevKey: "openrouter",
		generatedProviderId: "hadyancode",
	},
];

function dedupe(values: readonly string[]): string[] {
	return [...new Set(values)];
}

export const MODELS_DEV_PROVIDER_KEY_MAP = Object.fromEntries(
	PROVIDER_IDS_MAP.flatMap((entry) =>
		entry.generatedProviderId
			? [[entry.modelsDevKey, entry.generatedProviderId]]
			: [],
	),
);

/**
 * Providers that must remain excluded even when their models.dev entry uses a
 * supported AI SDK package. IDs use HadyanCode's generated provider identifiers
 * after applying MODELS_DEV_PROVIDER_KEY_MAP.
 */
export const MODELS_DEV_BLOCKED_PROVIDER_IDS: ReadonlySet<string> = new Set();

export const MODELS_DEV_CURRENT_BUILTIN_PROVIDER_KEYS = new Set(
	PROVIDER_IDS_MAP.map((entry) => entry.modelsDevKey),
);

export function resolveGeneratedProviderIdForModelsDevKey(
	modelsDevKey: string,
): string | undefined {
	return MODELS_DEV_PROVIDER_KEY_MAP[modelsDevKey];
}

export function resolveProviderModelCatalogKeys(providerId: string): string[] {
	const mapped = PROVIDER_IDS_MAP.flatMap((entry) => {
		if (!entry.generatedProviderId) {
			return [];
		}
		if (
			entry.generatedProviderId === providerId ||
			entry.runtimeProviderId === providerId
		) {
			return [entry.generatedProviderId];
		}
		return [];
	});

	if (providerId === "nousResearch") {
		return dedupe([...mapped, "nousresearch", providerId]);
	}

	return dedupe([...mapped, providerId]);
}
