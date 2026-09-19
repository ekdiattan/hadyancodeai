import { describe, expect, it } from "vitest";
import type { ModelInfo } from "../catalog/types";
import {
	buildHadyanCodeGatewayModels,
	filterHadyanCodeGatewayModels,
	HADYANCODE_GATEWAY_MODEL_VENDORS,
	isHadyanCodeGatewayModel,
} from "./first-party-models";

function model(id: string): ModelInfo {
	return { id, name: id };
}

describe("first-party gateway model policy", () => {
	it("allows marketplace ids from the allowed labs", () => {
		expect(HADYANCODE_GATEWAY_MODEL_VENDORS).toEqual([
			"anthropic",
			"deepseek",
		]);
		expect(isHadyanCodeGatewayModel("anthropic/claude-sonnet-5")).toBe(true);
		expect(isHadyanCodeGatewayModel("deepseek/deepseek-v4-flash")).toBe(true);
	});

	it("allows gateway-scoped ids whose slug belongs to an allowed lab", () => {
		// The subscription feed addresses models as `<gateway>/<slug>`, so the
		// lab cannot be read off the first path segment.
		expect(isHadyanCodeGatewayModel("hadyancode-pass/deepseek-v4-pro")).toBe(
			true,
		);
		expect(isHadyanCodeGatewayModel("deepseek-v4-pro")).toBe(true);
		expect(isHadyanCodeGatewayModel("claude-sonnet-5")).toBe(true);
	});

	it("rejects every other lab, including gateway-namespaced ids", () => {
		for (const modelId of [
			"hadyancode-pass/glm-5.2",
			"hadyancode-pass/qwen3.8-max",
			"hadyancode-pass/kimi-k3",
			"hadyancode-pass/minimax-m3",
			"hadyancode-pass/mimo-v2.5",
			"hadyancode-free/longcat-2.0",
			"z-ai/glm-5.3-flash",
			"poolside/laguna-s-2.1:free",
			"kwaipilot/kat-coder-pro",
			"arcee-ai/trinity-large-preview:free",
			"google/gemini-3.1-pro-preview",
			"openai/gpt-5.3-codex",
		]) {
			expect(isHadyanCodeGatewayModel(modelId), modelId).toBe(false);
		}
	});

	it("drops disallowed models from a merged live catalog", () => {
		const filtered = filterHadyanCodeGatewayModels({
			"hadyancode-pass/deepseek-v4-pro": model("hadyancode-pass/deepseek-v4-pro"),
			"hadyancode-pass/glm-5.2": model("hadyancode-pass/glm-5.2"),
			"deepseek/deepseek-v4-flash": model("deepseek/deepseek-v4-flash"),
			"google/gemini-3.1-pro-preview": model(
				"google/gemini-3.1-pro-preview",
			),
		});

		expect(Object.keys(filtered).sort()).toEqual([
			"deepseek/deepseek-v4-flash",
			"hadyancode-pass/deepseek-v4-pro",
		]);
	});

	it("bakes only Claude and DeepSeek models with marketplace ids", () => {
		const models = buildHadyanCodeGatewayModels();
		const modelIds = Object.keys(models);

		expect(modelIds.length).toBeGreaterThan(0);
		expect(
			modelIds.filter(
				(modelId) =>
					!modelId.startsWith("anthropic/") &&
					!modelId.startsWith("deepseek/"),
			),
		).toEqual([]);
		// Ids must stay marketplace-qualified: the gateway is OpenRouter-backed.
		expect(models["anthropic/claude-sonnet-5"]?.id).toBe(
			"anthropic/claude-sonnet-5",
		);
	});
});
