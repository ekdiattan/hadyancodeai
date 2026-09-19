import { describe, expect, it } from "vitest";
import {
	applyHadyanCodeFeaturedModels,
	type HadyanCodeRecommendedModelsData,
	FALLBACK_HADYANCODE_RECOMMENDED_MODELS,
	fetchHadyanCodeRecommendedModels,
	getCachedHadyanCodeRecommendedModels,
	peekHadyanCodeRecommendedModels,
	resetHadyanCodeRecommendedModelsCacheForTests,
} from "./hadyancode-recommended-models";
import type { ModelInfo } from "./provider-settings";

const BASE_URL = "https://api.example.test";

function jsonResponse(payload: unknown): typeof fetch {
	return async () =>
		new Response(JSON.stringify(payload), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
}

function model(id: string, name: string): ModelInfo {
	return { id, name };
}

// The endpoint only sends slug-like names, mirroring production behavior.
const ENDPOINT_PAYLOAD = {
	recommended: [
		{
			id: "anthropic/claude-opus-5",
			name: "claude-opus-5",
			description: "",
			tags: ["NEW"],
		},
		{ id: "vendor/named-model", name: "named-model", description: "" },
		{ id: "vendor/unnamed-model", description: "" },
		// Vercel-style id; the catalog keys this model under "z-ai/glm-5.2"
		{ id: "zai/glm-5.2", name: "glm-5.2", description: "" },
	],
	free: [
		{
			id: "deepseek/deepseek-v4-flash",
			name: "deepseek-v4-flash",
			description: "",
		},
		{ id: "hadyancode-free/glm-5.2", name: "hadyancode-free/glm-5.2", description: "" },
		{
			id: "poolside/laguna-s-2.1:free",
			name: "laguna-s-2.1:free",
			description: "",
		},
	],
	hadyancodePass: [
		{ id: "hadyancode-pass/glm-5.2", name: "hadyancode-pass/glm-5.2", description: "" },
		{ id: "hadyancode-pass/mystery", name: "hadyancode-pass/mystery", description: "" },
	],
};

const CATALOG = {
	openrouter: {
		"anthropic/claude-opus-5": model(
			"anthropic/claude-opus-5",
			"Claude Opus 5",
		),
		"z-ai/glm-5.2": model("z-ai/glm-5.2", "GLM-5.2"),
	},
	hadyancode: {
		"deepseek/deepseek-v4-flash": model(
			"deepseek/deepseek-v4-flash",
			"DeepSeek V4 Flash",
		),
		"hadyancode-free/glm-5.2": model("hadyancode-free/glm-5.2", "GLM-5.2 (free)"),
		"poolside/laguna-s-2.1:free": model(
			"poolside/laguna-s-2.1:free",
			"Laguna S 2.1 (free)",
		),
	},
	"hadyancode-pass": {
		"hadyancode-pass/glm-5.2": model("hadyancode-pass/glm-5.2", "GLM-5.2"),
	},
};

function namesOf(data: HadyanCodeRecommendedModelsData) {
	return {
		recommended: data.recommended.map((m) => m.name),
		free: data.free.map((m) => m.name),
		hadyancodePass: data.hadyancodePass.map((m) => m.name),
	};
}

describe("fetchHadyanCodeRecommendedModels", () => {
	it("resolves display names from the models catalog", async () => {
		const data = await fetchHadyanCodeRecommendedModels({
			baseUrl: BASE_URL,
			fetchImpl: jsonResponse(ENDPOINT_PAYLOAD),
			catalogLoader: async () => CATALOG,
		});

		expect(namesOf(data)).toEqual({
			// Catalog name first (including via id aliases like zai/ -> z-ai/);
			// endpoint name when the catalog misses; the id slug when the
			// endpoint name is just the id.
			recommended: ["Claude Opus 5", "named-model", "unnamed-model", "GLM-5.2"],
			// Free markers are redundant next to the pickers' FREE chips.
			free: ["DeepSeek V4 Flash", "GLM-5.2", "Laguna S 2.1"],
			hadyancodePass: ["GLM-5.2", "mystery"],
		});
		// Ids are preserved untouched.
		expect(data.free.map((m) => m.id)).toEqual([
			"deepseek/deepseek-v4-flash",
			"hadyancode-free/glm-5.2",
			"poolside/laguna-s-2.1:free",
		]);
	});

	it("degrades to endpoint names and id slugs when the catalog is unavailable", async () => {
		const data = await fetchHadyanCodeRecommendedModels({
			baseUrl: BASE_URL,
			fetchImpl: jsonResponse(ENDPOINT_PAYLOAD),
			catalogLoader: async () => {
				throw new Error("models.dev unreachable");
			},
		});

		expect(namesOf(data)).toEqual({
			recommended: ["claude-opus-5", "named-model", "unnamed-model", "glm-5.2"],
			free: ["deepseek-v4-flash", "glm-5.2", "laguna-s-2.1"],
			hadyancodePass: ["glm-5.2", "mystery"],
		});
	});

	it("does not wait for a hung catalog loader beyond the timeout", async () => {
		const data = await fetchHadyanCodeRecommendedModels({
			baseUrl: BASE_URL,
			fetchImpl: jsonResponse(ENDPOINT_PAYLOAD),
			timeoutMs: 25,
			catalogLoader: () => new Promise(() => {}),
		});

		expect(data.recommended[0]?.name).toBe("claude-opus-5");
	});

	it("shares one timeout budget between the feed request and the catalog lookup", async () => {
		// A feed response that consumes most of the window must not grant the
		// hung catalog loader a fresh full window on top (which would roughly
		// double the worst-case loading time).
		const feedDelayMs = 400;
		const timeoutMs = 500;
		const slowFeed: typeof fetch = async () => {
			await new Promise((resolve) => setTimeout(resolve, feedDelayMs));
			return new Response(JSON.stringify(ENDPOINT_PAYLOAD), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		};

		const startedAt = Date.now();
		const data = await fetchHadyanCodeRecommendedModels({
			baseUrl: BASE_URL,
			fetchImpl: slowFeed,
			timeoutMs,
			catalogLoader: () => new Promise(() => {}),
		});
		const elapsedMs = Date.now() - startedAt;

		// Stacked windows would take ~feedDelayMs + timeoutMs (~900ms).
		expect(elapsedMs).toBeLessThan(feedDelayMs + timeoutMs - 100);
		expect(data.recommended[0]?.name).toBe("claude-opus-5");
	});

	it("still applies an instantly-resolving catalog when the budget is exhausted", async () => {
		// Simulates a cached catalog: getLiveModelsCatalog resolves cached data
		// on a microtask, which beats the zero-delay degradation timer even
		// when the feed request consumed the whole window.
		const timeoutMs = 50;
		const slowFeed: typeof fetch = async () => {
			await new Promise((resolve) => setTimeout(resolve, timeoutMs));
			return new Response(JSON.stringify(ENDPOINT_PAYLOAD), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		};

		const data = await fetchHadyanCodeRecommendedModels({
			baseUrl: BASE_URL,
			fetchImpl: slowFeed,
			timeoutMs,
			catalogLoader: async () => CATALOG,
		});

		expect(data.recommended[0]?.name).toBe("Claude Opus 5");
	});

	it("returns the bundled fallback untouched when the endpoint fails", async () => {
		const data = await fetchHadyanCodeRecommendedModels({
			baseUrl: BASE_URL,
			fetchImpl: async () => new Response("nope", { status: 500 }),
			catalogLoader: async () => CATALOG,
		});

		// Exact equality lets callers detect a transient failure (the VS Code
		// controller compares against the fallback to skip caching it).
		expect(data).toEqual(FALLBACK_HADYANCODE_RECOMMENDED_MODELS);
	});
});

describe("applyHadyanCodeFeaturedModels", () => {
	const data: HadyanCodeRecommendedModelsData = {
		recommended: [
			{
				id: "anthropic/claude-opus-5",
				name: "Claude Opus 5",
				description: "Most intelligent model",
				tags: ["NEW"],
			},
			// Vercel-style spelling; the catalog keys it as "z-ai/glm-5.2".
			{ id: "zai/glm-5.2", name: "GLM 5.2", description: "", tags: [] },
		],
		free: [
			{
				id: "deepseek/deepseek-v4-flash",
				name: "DeepSeek V4 Flash",
				description: "Fast and efficient",
				tags: [],
			},
		],
		hadyancodePass: [
			{
				id: "hadyancode-pass/kimi-k3",
				name: "Kimi K3",
				description: "Leading open weights model",
				tags: [],
			},
		],
	};

	it("stamps recommended and free tiers onto the hadyancode model list", () => {
		const models = applyHadyanCodeFeaturedModels(
			"hadyancode",
			[
				{ id: "anthropic/claude-opus-5", name: "Claude Opus 5" },
				{ id: "z-ai/glm-5.2", name: "GLM 5.2" },
				{ id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash" },
				{ id: "vendor/unrelated", name: "Unrelated" },
			],
			data,
		);

		expect(models[0]?.featured).toEqual({
			tier: "recommended",
			rank: 0,
			tags: ["NEW"],
		});
		expect(models[0]?.description).toBe("Most intelligent model");
		// Alias spellings resolve through the Vercel/OpenRouter rules.
		expect(models[1]?.featured).toEqual({
			tier: "recommended",
			rank: 1,
			tags: [],
		});
		expect(models[2]?.featured).toEqual({ tier: "free", rank: 0, tags: [] });
		expect(models[3]?.featured).toBeUndefined();
	});

	it("stamps subscribed and free tiers for hadyancode-pass and skips other providers", () => {
		const models = applyHadyanCodeFeaturedModels(
			"hadyancode-pass",
			[
				{ id: "hadyancode-pass/kimi-k3", name: "Kimi K3" },
				{ id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash" },
			],
			data,
		);
		expect(models[0]?.featured?.tier).toBe("subscribed");
		expect(models[1]?.featured?.tier).toBe("free");

		const untouched = [{ id: "claude-sonnet-4-6", name: "Claude Sonnet" }];
		expect(applyHadyanCodeFeaturedModels("anthropic", untouched, data)).toBe(
			untouched,
		);
	});

	it("matches vendor-prefix mismatches by unambiguous slug without duplicating tiers", () => {
		const fallbackVintage: HadyanCodeRecommendedModelsData = {
			recommended: [],
			free: [
				{
					id: "kwaipilot/kat-coder-pro",
					name: "KwaiKAT Kat Coder Pro",
					description: "Advanced agentic coding model",
					tags: ["FREE"],
				},
			],
			hadyancodePass: [],
		};

		// Catalog knows the model only under the hadyancode-free prefix: the slug
		// fallback stamps it even though no alias rule covers the prefix.
		const slugOnly = applyHadyanCodeFeaturedModels(
			"hadyancode",
			[{ id: "hadyancode-free/kat-coder-pro", name: "Kat Coder Pro" }],
			fallbackVintage,
		);
		expect(slugOnly[0]?.featured?.tier).toBe("free");

		// Catalog carries BOTH spellings: the exact id wins and the slug match
		// must not stamp the second row, or the tier would render twice.
		const bothSpellings = applyHadyanCodeFeaturedModels(
			"hadyancode",
			[
				{ id: "kwaipilot/kat-coder-pro", name: "Kat Coder Pro" },
				{ id: "hadyancode-free/kat-coder-pro", name: "Kat Coder Pro (free)" },
			],
			fallbackVintage,
		);
		expect(bothSpellings[0]?.featured?.tier).toBe("free");
		expect(bothSpellings[1]?.featured).toBeUndefined();

		// An ambiguous slug (two different feed entries) stamps nothing.
		const ambiguous = applyHadyanCodeFeaturedModels(
			"hadyancode",
			[{ id: "hadyancode-free/shared-slug", name: "Shared" }],
			{
				recommended: [
					{ id: "vendor-a/shared-slug", name: "A", description: "", tags: [] },
					{ id: "vendor-b/shared-slug", name: "B", description: "", tags: [] },
				],
				free: [],
				hadyancodePass: [],
			},
		);
		expect(ambiguous[0]?.featured).toBeUndefined();
	});

	it("keeps the model's own description when the feed entry has none", () => {
		const models = applyHadyanCodeFeaturedModels(
			"hadyancode",
			[
				{
					id: "z-ai/glm-5.2",
					name: "GLM 5.2",
					description: "Catalog description",
				},
			],
			data,
		);
		expect(models[0]?.description).toBe("Catalog description");
	});
});

describe("getCachedHadyanCodeRecommendedModels", () => {
	it("serves one fetch to concurrent and subsequent callers", async () => {
		resetHadyanCodeRecommendedModelsCacheForTests();
		let calls = 0;
		const fetchImpl: typeof fetch = async () => {
			calls += 1;
			return new Response(JSON.stringify(ENDPOINT_PAYLOAD), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		};
		const options = {
			baseUrl: BASE_URL,
			fetchImpl,
			catalogLoader: async () => CATALOG,
		};

		const [first, second] = await Promise.all([
			getCachedHadyanCodeRecommendedModels(options),
			getCachedHadyanCodeRecommendedModels(options),
		]);
		const third = await getCachedHadyanCodeRecommendedModels(options);

		expect(calls).toBe(1);
		expect(first.recommended.length).toBeGreaterThan(0);
		expect(second.recommended.length).toBe(first.recommended.length);
		expect(third.recommended.length).toBe(first.recommended.length);
		resetHadyanCodeRecommendedModelsCacheForTests();
	});

	it("caches the bundled fallback so offline callers do not re-pay the timeout", async () => {
		resetHadyanCodeRecommendedModelsCacheForTests();
		let calls = 0;
		const fetchImpl: typeof fetch = async () => {
			calls += 1;
			return new Response("nope", { status: 500 });
		};
		const options = {
			baseUrl: BASE_URL,
			fetchImpl,
			catalogLoader: async () => CATALOG,
		};

		const first = await getCachedHadyanCodeRecommendedModels(options);
		const second = await getCachedHadyanCodeRecommendedModels(options);

		expect(calls).toBe(1);
		expect(first).toEqual(FALLBACK_HADYANCODE_RECOMMENDED_MODELS);
		expect(second).toEqual(FALLBACK_HADYANCODE_RECOMMENDED_MODELS);
		resetHadyanCodeRecommendedModelsCacheForTests();
	});

	it("does not let an in-flight request repopulate the cache after a reset", async () => {
		resetHadyanCodeRecommendedModelsCacheForTests();
		let release: (() => void) | undefined;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const staleFetch: typeof fetch = async () => {
			await gate;
			return new Response(JSON.stringify(ENDPOINT_PAYLOAD), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		};
		const stale = getCachedHadyanCodeRecommendedModels({
			baseUrl: BASE_URL,
			fetchImpl: staleFetch,
			catalogLoader: async () => CATALOG,
		});

		// Reset while the first request is still in flight, then resolve it:
		// its result must not land in the cleared cache.
		resetHadyanCodeRecommendedModelsCacheForTests();
		release?.();
		await stale;

		let calls = 0;
		const freshFetch: typeof fetch = async () => {
			calls += 1;
			return new Response(JSON.stringify(ENDPOINT_PAYLOAD), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		};
		await getCachedHadyanCodeRecommendedModels({
			baseUrl: BASE_URL,
			fetchImpl: freshFetch,
			catalogLoader: async () => CATALOG,
		});
		expect(calls).toBe(1);
		resetHadyanCodeRecommendedModelsCacheForTests();
	});
});

describe("peekHadyanCodeRecommendedModels", () => {
	it("returns the bundled fallback when the cache is cold", () => {
		resetHadyanCodeRecommendedModelsCacheForTests();
		expect(peekHadyanCodeRecommendedModels()).toEqual(
			FALLBACK_HADYANCODE_RECOMMENDED_MODELS,
		);
	});

	it("returns the cached live feed once warmed, without another fetch", async () => {
		resetHadyanCodeRecommendedModelsCacheForTests();
		let calls = 0;
		await getCachedHadyanCodeRecommendedModels({
			baseUrl: BASE_URL,
			fetchImpl: async () => {
				calls += 1;
				return new Response(JSON.stringify(ENDPOINT_PAYLOAD), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
			catalogLoader: async () => CATALOG,
		});

		const peeked = peekHadyanCodeRecommendedModels();

		expect(calls).toBe(1);
		expect(peeked.recommended.map((m) => m.id)).toEqual(
			ENDPOINT_PAYLOAD.recommended.map((m) => m.id),
		);
		resetHadyanCodeRecommendedModelsCacheForTests();
	});
});
