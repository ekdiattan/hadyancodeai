import { FALLBACK_HADYANCODE_RECOMMENDED_MODELS, fetchHadyanCodeRecommendedModels } from "@hadyancode/core"
import { HadyanCodeEnv } from "@/config"
import { fetch } from "@/shared/net"

interface HadyanCodeRecommendedModelData {
	id: string
	name: string
	description: string
	tags: string[]
}

export interface HadyanCodeRecommendedModelsData {
	recommended: HadyanCodeRecommendedModelData[]
	free: HadyanCodeRecommendedModelData[]
	hadyancodePass?: HadyanCodeRecommendedModelData[]
}

const RECOMMENDED_MODELS_CACHE_TTL_MS = 60 * 60 * 1000

let pendingRefresh: Promise<HadyanCodeRecommendedModelsData> | null = null
let inMemoryCache: { data: HadyanCodeRecommendedModelsData; timestamp: number } | null = null

export async function refreshHadyanCodeRecommendedModels(): Promise<HadyanCodeRecommendedModelsData> {
	if (inMemoryCache && Date.now() - inMemoryCache.timestamp <= RECOMMENDED_MODELS_CACHE_TTL_MS) {
		return inMemoryCache.data
	}

	if (pendingRefresh) {
		return pendingRefresh
	}

	pendingRefresh = (async () => {
		try {
			return await fetchAndCacheHadyanCodeRecommendedModels()
		} finally {
			pendingRefresh = null
		}
	})()

	return pendingRefresh
}

export function resetHadyanCodeRecommendedModelsCacheForTests(): void {
	pendingRefresh = null
	inMemoryCache = null
}

function isFallbackRecommendedModels(data: HadyanCodeRecommendedModelsData): boolean {
	return JSON.stringify(data) === JSON.stringify(FALLBACK_HADYANCODE_RECOMMENDED_MODELS)
}

async function fetchAndCacheHadyanCodeRecommendedModels(): Promise<HadyanCodeRecommendedModelsData> {
	// Delegate the actual HTTP fetch + response normalization + offline fallback
	// to the SDK so the CLI/JetBrains and the extension share one implementation.
	// We pass the proxy-aware fetch (per .hadyancoderules/network.md) and the
	// extension's configured API base URL. On failure the SDK returns its own
	// fallback list.
	const result = await fetchHadyanCodeRecommendedModels({
		baseUrl: HadyanCodeEnv.config().apiBaseUrl,
		fetchImpl: fetch,
	})

	// Only pin a populated, non-fallback result in memory for the full TTL; a
	// transient failure (SDK returns a clone of its fallback) should be retried
	// next call.
	if ((result.recommended.length > 0 || result.free.length > 0) && !isFallbackRecommendedModels(result)) {
		inMemoryCache = { data: result, timestamp: Date.now() }
	}
	return result
}
