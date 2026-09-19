import { describe, expect, it } from "vitest";
import { BUILTIN_PROVIDER_REGISTRATIONS } from "./builtins-runtime";
import { BUILT_IN_PROVIDER_IDS, normalizeProviderId } from "./ids";
import { getProviderIds } from "./model-registry";

// Remaining providers: Claude (Anthropic + Claude Code), DeepSeek, and the
// first-party HadyanCode gateway with its subscription tier.
const EXPECTED_BUILTIN_IDS = [
	"anthropic",
	"claude-code",
	"deepseek",
	"hadyancode",
	"hadyancode-pass",
];

describe("provider-ids", () => {
	it("keeps built-in provider ids aligned with model registry loaders", () => {
		const registryProviderIds = new Set(getProviderIds());
		for (const providerId of BUILT_IN_PROVIDER_IDS) {
			expect(registryProviderIds.has(providerId)).toBe(true);
		}
		for (const providerId of registryProviderIds) {
			expect(BUILT_IN_PROVIDER_IDS).toContain(providerId);
		}
	});

	it("exposes exactly the Claude, DeepSeek, and first-party providers as built-in providers", () => {
		expect([...BUILT_IN_PROVIDER_IDS].sort()).toEqual(
			[...EXPECTED_BUILTIN_IDS].sort(),
		);
	});

	it("registers runtime factories for every remaining built-in provider", async () => {
		for (const providerId of EXPECTED_BUILTIN_IDS) {
			const registration = BUILTIN_PROVIDER_REGISTRATIONS.find(
				(item) => item.manifest.id === providerId,
			);
			expect(registration).toBeDefined();
			expect(registration?.loadProvider).toBeDefined();
		}
	});

	it("no longer resolves legacy provider aliases", () => {
		expect(normalizeProviderId("openai")).toBe("openai");
		expect(normalizeProviderId("togetherai")).toBe("togetherai");
	});
});
