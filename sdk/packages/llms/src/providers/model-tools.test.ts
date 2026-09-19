import type { GatewayProviderManifest } from "@hadyancode/shared";
import { describe, expect, it } from "vitest";
import {
	providerManifestSupportsModelTool,
	providerOffersModelTool,
	supportsModelTool,
} from "./model-tools";

describe("supportsModelTool", () => {
	it("supports native web search for Anthropic", () => {
		expect(supportsModelTool({ providerId: "anthropic" }, "web_search")).toBe(
			true,
		);
	});

	it("normalizes aliases before resolving support", () => {
		expect(
			supportsModelTool(
				{ providerId: "openai-compatible", modelId: "custom" },
				"web_search",
			),
		).toBe(false);
	});

	it("resolves custom provider support from manifest metadata", () => {
		const manifest = {
			id: "custom",
			name: "Custom",
			defaultModelId: "alpha",
			models: [{ id: "alpha", name: "Alpha", providerId: "custom" }],
			modelToolCapabilities: [{ name: "web_search" }],
		} satisfies GatewayProviderManifest;

		expect(
			providerManifestSupportsModelTool(manifest, "alpha", "web_search"),
		).toBe(true);
	});

	it("reports provider-level availability independent of model routes", () => {
		expect(providerOffersModelTool("anthropic", "web_search")).toBe(true);
		expect(providerOffersModelTool("deepseek", "web_search")).toBe(false);
		expect(providerOffersModelTool("unknown-custom", "web_search")).toBe(false);
	});

	it("falls back to the manifest default model when no model id is given", () => {
		const manifest = {
			id: "custom",
			name: "Custom",
			defaultModelId: "excluded",
			models: [
				{ id: "excluded", name: "Excluded", providerId: "custom" },
				{ id: "allowed", name: "Allowed", providerId: "custom" },
			],
			modelToolCapabilities: [
				{
					name: "web_search",
					excludeRoutes: [{ matcher: "model-id", modelId: "excluded" }],
				},
			],
		} satisfies GatewayProviderManifest;

		expect(
			providerManifestSupportsModelTool(manifest, undefined, "web_search"),
		).toBe(false);
		expect(
			providerManifestSupportsModelTool(manifest, "allowed", "web_search"),
		).toBe(true);
	});
});
