import { describe, expect, it } from "vitest";
import {
	buildFeaturedModelEntries,
	HADYANCODE_PASS_FREE_SECTION_DESCRIPTION,
	freeTierDescriptionFor,
} from "./hadyancode-model-entries";

const model = (id: string) => ({ id, name: id, description: "", tags: [] });

describe("hadyancode model picker entries", () => {
	it("builds Recommended/Free sections for the hadyancode provider", () => {
		const entries = buildFeaturedModelEntries("hadyancode", {
			recommended: [model("anthropic/claude-sonnet-5")],
			free: [model("deepseek/deepseek-v4-flash")],
			hadyancodePass: [model("hadyancode-pass/glm-5.1")],
		});

		expect(entries).toEqual([
			{
				kind: "model",
				model: model("anthropic/claude-sonnet-5"),
				tier: "recommended",
			},
			{
				kind: "model",
				model: model("deepseek/deepseek-v4-flash"),
				tier: "free",
			},
			{ kind: "browse" },
		]);
	});

	it("builds Subscribed/Free sections for the hadyancode-pass provider", () => {
		const entries = buildFeaturedModelEntries("hadyancode-pass", {
			recommended: [model("anthropic/claude-sonnet-5")],
			free: [model("deepseek/deepseek-v4-flash")],
			hadyancodePass: [model("hadyancode-pass/glm-5.1"), model("hadyancode-pass/kimi-k2.6")],
		});

		expect(entries).toEqual([
			{ kind: "model", model: model("hadyancode-pass/glm-5.1"), tier: "subscribed" },
			{
				kind: "model",
				model: model("hadyancode-pass/kimi-k2.6"),
				tier: "subscribed",
			},
			{
				kind: "model",
				model: model("deepseek/deepseek-v4-flash"),
				tier: "free",
			},
		]);
	});

	it("adds the browse-all escape when the hadyancodePass bucket is empty", () => {
		// The fetch fell back to the bundled list (no pass models); the sections
		// alone would leave a subscriber able to pick only free models.
		const entries = buildFeaturedModelEntries("hadyancode-pass", {
			recommended: [],
			free: [model("deepseek/deepseek-v4-flash")],
			hadyancodePass: [],
		});

		expect(entries).toEqual([
			{
				kind: "model",
				model: model("deepseek/deepseek-v4-flash"),
				tier: "free",
			},
			{ kind: "browse" },
		]);
	});

	it("attaches the quota explainer only to the HadyanCodePass picker's free section", () => {
		const data = {
			recommended: [model("anthropic/claude-sonnet-5")],
			free: [model("deepseek/deepseek-v4-flash")],
			hadyancodePass: [model("hadyancode-pass/glm-5.1")],
		};

		expect(
			freeTierDescriptionFor(buildFeaturedModelEntries("hadyancode-pass", data)),
		).toBe(HADYANCODE_PASS_FREE_SECTION_DESCRIPTION);
		expect(
			freeTierDescriptionFor(buildFeaturedModelEntries("hadyancode", data)),
		).toBe(undefined);
	});
});
