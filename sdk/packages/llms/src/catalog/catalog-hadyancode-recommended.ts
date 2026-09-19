import { getHadyanCodeEnvironmentConfig } from "@hadyancode/shared";
import { stripNonReasoningModelSupport } from "./model-filters";
import type { ModelInfo } from "./types";

export interface HadyanCodeRecommendedModelEntry {
	id: string;
	name?: string;
	description?: string;
}

export interface HadyanCodeRecommendedModelsPayload {
	hadyancodePass?: HadyanCodeRecommendedModelEntry[];
	free?: HadyanCodeRecommendedModelEntry[];
}

type ModelCapabilities = Pick<
	ModelInfo,
	| "contextWindow"
	| "maxInputTokens"
	| "maxTokens"
	| "capabilities"
	| "reasoningOptions"
	| "pricing"
>;

const HADYANCODE_PASS_PROVIDER_ID = "hadyancode-pass";
const HADYANCODE_PROVIDER_ID = "hadyancode";

const HADYANCODE_PASS_MODEL_DEFAULTS = {
	contextWindow: 128_000,
	maxInputTokens: 128_000,
	maxTokens: 8_192,
	capabilities: ["tools", "reasoning", "temperature"],
	pricing: {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
	},
} as const satisfies ModelCapabilities;

function findORModelCapabilities(
	entry: HadyanCodeRecommendedModelEntry,
	openRouterModels: Record<string, ModelInfo>,
): ModelCapabilities {
	if (!openRouterModels) {
		return HADYANCODE_PASS_MODEL_DEFAULTS;
	}

	const modelSlug = entry.id.split("/").at(-1) ?? entry.id;

	return openRouterModels[modelSlug] || HADYANCODE_PASS_MODEL_DEFAULTS;
}

// HadyanCode-Pass models have only the model name (and not the lab),
// so we need to look-up using glm-5.2 instead of hadyancode-pass/glm-5.2
function buildModelsNameMap(
	openrouterModels: Record<string, ModelInfo>,
): Record<string, ModelInfo> {
	const nameMap: Record<string, ModelInfo> = {};

	for (const model of Object.values(openrouterModels)) {
		const modelSlugWithoutProvider = model.id.split("/").at(-1) ?? model.id;

		nameMap[modelSlugWithoutProvider] = model;
	}

	return nameMap;
}

export function normalizeHadyanCodeRecommendedProviderModels(
	payload: HadyanCodeRecommendedModelsPayload,
	openRouterModels: Record<string, ModelInfo>,
): Record<string, Record<string, ModelInfo>> {
	const hadyancodePass = payload.hadyancodePass ?? [];
	const models: Record<string, ModelInfo> = {};
	const hadyancodeFreeModels: Record<string, ModelInfo> = {};
	const openRouterModelsByName = buildModelsNameMap(openRouterModels);

	hadyancodePass.forEach((entry) => {
		const capabilities = findORModelCapabilities(entry, openRouterModelsByName);

		models[entry.id] = {
			// We should use the OR name, unless there is not one (like when using defaults)
			name: entry.name,
			...capabilities,
			id: entry.id,
			description: entry.description,
		};
	});

	// HadyanCode free models are selectable on the HadyanCodePass provider too (same API
	// underneath; they ride usage billing at $0 instead of the subscription quota).
	// Unlike pass models their ids are full OpenRouter-style ids or hadyancode-free ids,
	// so look up capabilities by full id before falling back to the slug map.
	(payload.free ?? []).forEach((entry) => {
		const capabilities =
			openRouterModels?.[entry.id] ??
			findORModelCapabilities(entry, openRouterModelsByName);
		// The recommended-models endpoint only sends slug-like names (e.g.
		// "deepseek-v4-flash"), so prefer the OpenRouter catalog's display name
		// for every free entry. Without this, the free overlay overwrites the
		// nice OpenRouter names in the merged hadyancode/hadyancode-pass catalogs and the
		// pickers end up rendering raw model ids for the Free section.
		const entryName =
			capabilities.name?.trim() || entry.name?.trim() || entry.id;
		const name = entry.id.startsWith("hadyancode-free/")
			? `${entryName} (free)`
			: entryName;

		const modelInfo = {
			...capabilities,
			name,
			id: entry.id,
			description: entry.description,
		};

		hadyancodeFreeModels[entry.id] = {
			...modelInfo,
			pricing: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		};

		if (models[entry.id]) {
			return;
		}

		models[entry.id] = {
			...modelInfo,
			pricing: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		};
	});

	const result: Record<string, Record<string, ModelInfo>> = {};
	if (Object.keys(hadyancodeFreeModels).length > 0) {
		result[HADYANCODE_PROVIDER_ID] =
			stripNonReasoningModelSupport(hadyancodeFreeModels);
	}
	if (hadyancodePass.length > 0) {
		result[HADYANCODE_PASS_PROVIDER_ID] = stripNonReasoningModelSupport(models);
	}
	return result;
}

export async function fetchHadyanCodeRecommendedModelsPayload(
	fetcher: typeof fetch = fetch,
): Promise<HadyanCodeRecommendedModelsPayload> {
	const url = `${getHadyanCodeEnvironmentConfig().apiBaseUrl}/api/v1/ai/hadyancode/recommended-models`;
	const response = await fetcher(url);
	if (!response.ok) {
		throw new Error(
			`Failed to load HadyanCode recommended models from ${url}: HTTP ${response.status}`,
		);
	}

	return (await response.json()) as HadyanCodeRecommendedModelsPayload;
}

export async function fetchHadyanCodeRecommendedProviderModels(
	fetcher: typeof fetch = fetch,
	openRouterModels: Record<string, ModelInfo>,
): Promise<Record<string, Record<string, ModelInfo>>> {
	const payload = await fetchHadyanCodeRecommendedModelsPayload(fetcher);
	return normalizeHadyanCodeRecommendedProviderModels(
		payload,
		openRouterModels,
	);
}
