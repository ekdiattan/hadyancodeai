import {
	HADYANCODE_DEFAULT_MODEL_ID,
	type GatewayProviderContext,
} from "@hadyancode/shared";
import { describe, expect, it } from "vitest";
import {
	BUILTIN_PROVIDER_MANIFESTS_BY_ID,
	BUILTIN_SPECS,
	resolveProviderApiLineBaseUrl,
} from "./builtins";
import { getModelsForProvider, getProvider } from "./model-registry";
import { resolveAnthropicReasoningRequestPolicy } from "./routing/anthropic-compatible";

describe("only remaining providers", () => {
	it("registers exactly the Claude, DeepSeek, and first-party providers", () => {
		expect(BUILTIN_SPECS.map((spec) => spec.id).sort()).toEqual([
			"anthropic",
			"claude-code",
			"deepseek",
			"hadyancode",
			"hadyancode-pass",
		]);
	});

	it("restricts the first-party gateway catalog to Claude and DeepSeek", async () => {
		const models = await getModelsForProvider("hadyancode");
		const modelIds = Object.keys(models);
		expect(modelIds.length).toBeGreaterThan(0);
		expect(
			modelIds.filter(
				(modelId) =>
					!modelId.startsWith("anthropic/") &&
					!modelId.startsWith("deepseek/"),
			),
		).toEqual([]);
		expect(models).toHaveProperty(HADYANCODE_DEFAULT_MODEL_ID);
	});

	it("declares a policy-compliant default for the subscription tier", async () => {
		await expect(getProvider("hadyancode-pass")).resolves.toMatchObject({
			id: "hadyancode-pass",
			name: "HadyanCodePass",
		});
		const models = await getModelsForProvider("hadyancode-pass");
		expect(Object.keys(models).length).toBeGreaterThan(0);
	});

	it("applies the handwritten DeepSeek override on top of the generated spec", async () => {
		await expect(getProvider("deepseek")).resolves.toMatchObject({
			id: "deepseek",
			name: "DeepSeek",
			baseUrl: "https://api.deepseek.com/v1",
			defaultModelId: "deepseek-v4-flash",
			client: "openai-compatible",
		});
		const models = await getModelsForProvider("deepseek");
		expect(Object.keys(models).length).toBeGreaterThan(0);
		expect(models).toHaveProperty("deepseek-v4-flash");
	});

	it("registers the Anthropic provider with the generated catalog", async () => {
		await expect(getProvider("anthropic")).resolves.toMatchObject({
			id: "anthropic",
			name: "Anthropic",
			baseUrl: "https://api.anthropic.com/v1",
			client: "anthropic",
		});
		const models = await getModelsForProvider("anthropic");
		expect(Object.keys(models).length).toBeGreaterThan(0);
		expect(BUILTIN_PROVIDER_MANIFESTS_BY_ID.anthropic).toBeDefined();
	});

	it("registers Claude Code with its own model list", async () => {
		await expect(getProvider("claude-code")).resolves.toMatchObject({
			id: "claude-code",
			name: "Claude Code",
			client: "ai-sdk-community",
		});
		const models = await getModelsForProvider("claude-code");
		expect(Object.keys(models).sort()).toEqual(["haiku", "opus", "sonnet"]);
	});
});

describe("baked anthropic catalog reasoning options", () => {
	// Regression guard for the offline fallback: when the live models.dev
	// fetch fails, models resolve from the baked catalog. If that catalog
	// drops reasoningOptions, adaptive-era Claude models fall back to the
	// manual thinking wire shape and every reasoning request is rejected by
	// the Anthropic API.
	it("carries effort options that resolve to adaptive thinking for adaptive-era Claude models", async () => {
		const models = await getModelsForProvider("anthropic");
		const adaptiveEraModelIds = [
			"claude-sonnet-5",
			"claude-fable-5",
			"claude-opus-5",
			"claude-opus-4-8",
			"claude-opus-4-7",
			"claude-opus-4-6",
			"claude-sonnet-4-6",
		];

		for (const modelId of adaptiveEraModelIds) {
			const model = models[modelId];
			expect(model, modelId).toBeDefined();
			expect(
				model.reasoningOptions?.some((option) => option.type === "effort"),
				modelId,
			).toBe(true);

			const context: GatewayProviderContext = {
				provider: {
					id: "anthropic",
					name: "Anthropic",
					defaultModelId: modelId,
					models: [],
					metadata: {
						routing: {
							reasoning: {
								format: "anthropic-thinking",
								routes: [{ matcher: "anthropic-compatible" }],
							},
						},
					},
				},
				model: {
					id: modelId,
					name: model.name,
					providerId: "anthropic",
					reasoningOptions: model.reasoningOptions,
					metadata: model.family ? { family: model.family } : undefined,
				},
				config: { providerId: "anthropic" },
			};
			expect(
				resolveAnthropicReasoningRequestPolicy(
					{
						providerId: "anthropic",
						modelId,
						messages: [],
						reasoning: { enabled: true },
					},
					context,
				),
				modelId,
			).toEqual({ kind: "anthropic-adaptive" });
		}
	});
});

describe("regional API line base URLs", () => {
	it("returns undefined for unknown lines and non-regional providers", () => {
		expect(resolveProviderApiLineBaseUrl("anthropic", undefined)).toBeUndefined();
		expect(resolveProviderApiLineBaseUrl("anthropic", "mars")).toBeUndefined();
		expect(resolveProviderApiLineBaseUrl("anthropic", "china")).toBeUndefined();
		expect(resolveProviderApiLineBaseUrl("deepseek", "international")).toBeUndefined();
	});
});
