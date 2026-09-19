import type { HadyanCodeRecommendedModel, OpenRouterModelInfo } from "@shared/proto/hadyancode/models"
import type { OnboardingModel, OnboardingModelGroup } from "@shared/proto/hadyancode/state"

export const HADYANCODEPASS_GROUP = "hadyancode-pass"

export interface RecommendedModelsData {
	recommended: HadyanCodeRecommendedModel[]
	free: HadyanCodeRecommendedModel[]
	hadyancodePass: HadyanCodeRecommendedModel[]
}

type RecommendedModelsResponseLike = {
	recommended?: HadyanCodeRecommendedModel[]
	free?: HadyanCodeRecommendedModel[]
	hadyancodePass?: HadyanCodeRecommendedModel[]
}

export function getRecommendedModelsData(response: RecommendedModelsResponseLike): RecommendedModelsData | undefined {
	const recommended = response.recommended ?? []
	const free = response.free ?? []
	const hadyancodePass = response.hadyancodePass ?? []

	if (recommended.length === 0 && free.length === 0 && hadyancodePass.length === 0) {
		return undefined
	}

	return { recommended, free, hadyancodePass }
}

export interface OnboardingModelsByGroup {
	hadyancodePass: ModelGroup[]
	free: ModelGroup[]
	power: ModelGroup[]
}

interface ModelGroup {
	group: string
	models: OnboardingModel[]
}

function isHadyanCodePassOnboardingModel(model: OnboardingModel): boolean {
	return model.group === HADYANCODEPASS_GROUP
}

export function getHadyanCodeUIOnboardingGroups(groupedModels: OnboardingModelGroup): OnboardingModelsByGroup {
	const { models } = groupedModels

	const hadyancodePassModels = models.filter(isHadyanCodePassOnboardingModel)
	const freeModels = models.filter((m) => m.group === "free")
	const frontierModels = models.filter((m) => m.group === "frontier")
	const openSourceModels = models.filter((m) => m.group === "open source")

	return {
		hadyancodePass: hadyancodePassModels.length > 0 ? [{ group: HADYANCODEPASS_GROUP, models: hadyancodePassModels }] : [],
		free: freeModels.length > 0 ? [{ group: "free", models: freeModels }] : [],
		power: [
			...(frontierModels.length > 0 ? [{ group: "frontier", models: frontierModels }] : []),
			...(openSourceModels.length > 0 ? [{ group: "open source", models: openSourceModels }] : []),
		],
	}
}

export function getOnboardingGroupDisplayName(group: string): string {
	if (group === HADYANCODEPASS_GROUP) {
		return "HadyanCodePass"
	}
	return group
}

export function getPriceRange(modelInfo: OpenRouterModelInfo): string {
	const prompt = Number(modelInfo.inputPrice ?? 0)
	const completion = Number(modelInfo.outputPrice ?? 0)
	const cost = prompt + completion
	if (cost === 0) {
		return "Free"
	}
	if (cost < 10) {
		return "$"
	}
	if (cost > 50) {
		return "$$$"
	}
	return "$$"
}

export function getCapabilities(modelInfo: OpenRouterModelInfo): string[] {
	const capabilities = new Set<string>()
	if (modelInfo.supportsImages) {
		capabilities.add("Images")
	}
	if (modelInfo.supportsPromptCache) {
		capabilities.add("Prompt Cache")
	}
	capabilities.add("Tools")
	return Array.from(capabilities)
}

export function getSpeedLabel(latency?: number): string {
	if (!latency) {
		return "Average"
	}
	if (latency < 1) {
		return "Instant"
	}
	if (latency < 2) {
		return "Fast"
	}
	if (latency > 5) {
		return "Slow"
	}

	return "Average"
}
