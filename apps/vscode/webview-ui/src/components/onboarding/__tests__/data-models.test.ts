import type { OnboardingModel, OnboardingModelGroup } from "@shared/proto/hadyancode/state"
import { describe, expect, it } from "vitest"
import {
	getHadyanCodeUIOnboardingGroups,
	getOnboardingGroupDisplayName,
	getRecommendedModelsData,
	HADYANCODEPASS_GROUP,
} from "../data-models"

function model(id: string, group: string): OnboardingModel {
	return {
		id,
		name: id,
		group,
		badge: "",
		score: 0,
		latency: 0,
		info: undefined,
	} as OnboardingModel
}

function groupOf(models: OnboardingModel[]): OnboardingModelGroup {
	return { models } as OnboardingModelGroup
}

describe("getHadyanCodeUIOnboardingGroups", () => {
	it("buckets HadyanCodePass models into the hadyancodePass group", () => {
		const result = getHadyanCodeUIOnboardingGroups(
			groupOf([
				model("hadyancode-pass/glm-5.2", HADYANCODEPASS_GROUP),
				model("free-model", "free"),
				model("anthropic/claude", "frontier"),
				model("z-ai/glm", "open source"),
			]),
		)

		expect(result.hadyancodePass).toHaveLength(1)
		expect(result.hadyancodePass[0].group).toBe(HADYANCODEPASS_GROUP)
		expect(result.hadyancodePass[0].models.map((m) => m.id)).toEqual(["hadyancode-pass/glm-5.2"])
		expect(result.free[0].models.map((m) => m.id)).toEqual(["free-model"])
		expect(result.power.flatMap((g) => g.models.map((m) => m.id))).toEqual(["anthropic/claude", "z-ai/glm"])
	})

	it("does not bucket hadyancode-pass ids without a HadyanCodePass group label", () => {
		const result = getHadyanCodeUIOnboardingGroups(groupOf([model("hadyancode-pass/glm-5.2", "frontier")]))

		expect(result.hadyancodePass).toEqual([])
	})

	it("returns an empty hadyancodePass group when no HadyanCodePass models are present", () => {
		const result = getHadyanCodeUIOnboardingGroups(groupOf([model("free-model", "free")]))
		expect(result.hadyancodePass).toEqual([])
	})
})

describe("getRecommendedModelsData", () => {
	it("includes HadyanCodePass-only responses without depending on feature-flag timing", () => {
		const result = getRecommendedModelsData({
			recommended: [],
			free: [],
			hadyancodePass: [{ id: "hadyancode-pass/glm-5.2", name: "GLM 5.1", description: "", tags: [] }],
		})

		expect(result?.hadyancodePass.map((model) => model.id)).toEqual(["hadyancode-pass/glm-5.2"])
	})

	it("keeps classic recommended/free responses and HadyanCodePass responses", () => {
		const result = getRecommendedModelsData({
			recommended: [{ id: "anthropic/claude", name: "Claude", description: "", tags: [] }],
			free: [{ id: "free-model", name: "Free", description: "", tags: [] }],
			hadyancodePass: [{ id: "hadyancode-pass/glm-5.2", name: "GLM 5.1", description: "", tags: [] }],
		})

		expect(result?.recommended.map((model) => model.id)).toEqual(["anthropic/claude"])
		expect(result?.free.map((model) => model.id)).toEqual(["free-model"])
		expect(result?.hadyancodePass.map((model) => model.id)).toEqual(["hadyancode-pass/glm-5.2"])
	})

	it("returns undefined when every recommended bucket is empty", () => {
		const result = getRecommendedModelsData({ recommended: [], free: [], hadyancodePass: [] })

		expect(result).toBeUndefined()
	})
})

describe("onboarding display labels", () => {
	it("renders the canonical HadyanCodePass group as a user-facing product name", () => {
		expect(getOnboardingGroupDisplayName(HADYANCODEPASS_GROUP)).toBe("HadyanCodePass")
		expect(getOnboardingGroupDisplayName("frontier")).toBe("frontier")
	})
})
