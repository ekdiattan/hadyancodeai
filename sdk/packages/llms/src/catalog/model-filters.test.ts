import { describe, expect, it } from "vitest";
import {
	isNonReasoningVendorModel,
	NON_REASONING_MODEL_VENDORS,
	stripNonReasoningModelSupport,
} from "./model-filters";
import type { ModelInfo } from "./types";

function reasoningModel(id: string, family?: string): ModelInfo {
	return {
		id,
		name: id,
		...(family ? { family } : {}),
		capabilities: ["tools", "reasoning", "prompt-cache"],
		reasoningOptions: [{ type: "toggle" }],
		thinkingConfig: { maxBudget: 1000 },
		metadata: { reasoningDefaultOn: true },
	};
}

describe("non-reasoning vendor policy", () => {
	it("matches provider-scoped, marketplace and gateway-namespaced ids", () => {
		expect(NON_REASONING_MODEL_VENDORS).toEqual(["deepseek"]);
		expect(isNonReasoningVendorModel("deepseek-v4-flash", {})).toBe(true);
		expect(
			isNonReasoningVendorModel("deepseek-v4-flash", {
				family: "deepseek-flash",
			}),
		).toBe(true);
		expect(isNonReasoningVendorModel("deepseek/deepseek-v4-pro", {})).toBe(
			true,
		);
		expect(
			isNonReasoningVendorModel("hadyancode-pass/deepseek-v4-pro", {}),
		).toBe(true);
	});

	it("leaves other vendors' models alone", () => {
		expect(
			isNonReasoningVendorModel("anthropic/claude-sonnet-5", {
				family: "claude-sonnet",
			}),
		).toBe(false);
		expect(
			isNonReasoningVendorModel("claude-fable-5-1", {
				family: "claude-fable",
			}),
		).toBe(false);
		expect(
			isNonReasoningVendorModel("hadyancode-pass/claude-sonnet-4.6", {}),
		).toBe(false);
	});

	it("strips capability, options, thinking config and default-on metadata", () => {
		const stripped = stripNonReasoningModelSupport({
			"deepseek-v4-flash": reasoningModel(
				"deepseek-v4-flash",
				"deepseek-flash",
			),
			"anthropic/claude-sonnet-5": reasoningModel(
				"anthropic/claude-sonnet-5",
				"claude-sonnet",
			),
		});

		const deepseek = stripped["deepseek-v4-flash"];
		expect(deepseek.capabilities).toEqual(["tools", "prompt-cache"]);
		expect(deepseek).not.toHaveProperty("reasoningOptions");
		expect(deepseek).not.toHaveProperty("thinkingConfig");
		expect(deepseek.metadata).toBeUndefined();

		// Claude is untouched.
		const claude = stripped["anthropic/claude-sonnet-5"];
		expect(claude.capabilities).toContain("reasoning");
		expect(claude.reasoningOptions).toEqual([{ type: "toggle" }]);
		expect(claude.metadata).toEqual({ reasoningDefaultOn: true });
	});

	it("keeps unrelated metadata on a stripped model", () => {
		const stripped = stripNonReasoningModelSupport({
			"hadyancode-pass/deepseek-v4-pro": {
				...reasoningModel("hadyancode-pass/deepseek-v4-pro"),
				metadata: {
					reasoningDefaultOn: true,
					pricing: { input: 0, output: 0 },
				},
			},
		});

		expect(stripped["hadyancode-pass/deepseek-v4-pro"].metadata).toEqual({
			pricing: { input: 0, output: 0 },
		});
	});
});
