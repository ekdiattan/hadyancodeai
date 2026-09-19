import { EmptyRequest } from "@shared/proto/hadyancode/common"
import { HadyanCodeRecommendedModel, HadyanCodeRecommendedModelsResponse } from "@shared/proto/hadyancode/models"
import type { Controller } from "../index"
import { refreshHadyanCodeRecommendedModels } from "./refreshHadyanCodeRecommendedModels"

export async function refreshHadyanCodeRecommendedModelsRpc(
	_controller: Controller,
	_request: EmptyRequest,
): Promise<HadyanCodeRecommendedModelsResponse> {
	const models = await refreshHadyanCodeRecommendedModels()
	return HadyanCodeRecommendedModelsResponse.create({
		recommended: models.recommended.map((model) =>
			HadyanCodeRecommendedModel.create({
				id: model.id,
				name: model.name,
				description: model.description,
				tags: model.tags,
			}),
		),
		free: models.free.map((model) =>
			HadyanCodeRecommendedModel.create({
				id: model.id,
				name: model.name,
				description: model.description,
				tags: model.tags,
			}),
		),
		hadyancodePass: (models.hadyancodePass ?? []).map((model) =>
			HadyanCodeRecommendedModel.create({
				id: model.id,
				name: model.name,
				description: model.description,
				tags: model.tags,
			}),
		),
	})
}
