import type { ModelInfo } from "./types";

/**
 * Remove models that declare image output from a model catalog.
 *
 * This includes both dedicated image-generation models and language models
 * that can return mixed text-and-image output.
 */
export function filterImageOutputModels(
	models: Record<string, ModelInfo>,
): Record<string, ModelInfo> {
	return Object.fromEntries(
		Object.entries(models).filter(
			([, model]) =>
				model.operation !== "image-generation" &&
				model.modalities?.output.includes("image") !== true,
		),
	);
}

/**
 * Vendors whose models run without a thinking mode.
 *
 * Product policy: DeepSeek is exposed as a non-reasoning model in HadyanCode, so
 * thinking support is stripped wherever catalog models are normalized — the
 * models.dev live payload (which also feeds catalog generation) and the baked
 * generated catalog.
 *
 * Matching is by the id's vendor segment (`deepseek/deepseek-v4-pro`) or by the
 * catalog `family` (`deepseek-flash`), because provider-scoped catalogs key their
 * models by the bare id (`deepseek-v4-flash`) and the gateway uses its own
 * namespace (`hadyancode-pass/deepseek-v4-pro`).
 */
export const NON_REASONING_MODEL_VENDORS = ["deepseek"] as const;

export function isNonReasoningVendorModel(
	modelId: string,
	model: Pick<ModelInfo, "family">,
): boolean {
	// Every id segment is a candidate, not just the leading vendor: the gateway
	// namespaces its ids (`hadyancode-pass/deepseek-v4-pro`), and provider-scoped
	// catalogs use bare ids (`deepseek-v4-flash`).
	const candidates = [...modelId.split("/"), model.family ?? ""];
	return NON_REASONING_MODEL_VENDORS.some((vendor) =>
		candidates.some((candidate) => {
			const value = candidate.trim().toLowerCase();
			return value === vendor || value.startsWith(`${vendor}-`);
		}),
	);
}

function withoutReasoningMetadata(
	metadata: ModelInfo["metadata"],
): ModelInfo["metadata"] {
	if (!metadata) {
		return undefined;
	}
	const { reasoningDefaultOn: _reasoningDefaultOn, ...rest } = metadata;
	return Object.keys(rest).length > 0 ? rest : undefined;
}

function withoutThinkingSupport(model: ModelInfo): ModelInfo {
	const {
		reasoningOptions: _reasoningOptions,
		thinkingConfig: _thinkingConfig,
		metadata,
		...rest
	} = model;
	const capabilities = model.capabilities?.filter(
		(capability) => capability !== "reasoning",
	);
	const nextMetadata = withoutReasoningMetadata(metadata);
	return {
		...rest,
		...(capabilities ? { capabilities } : {}),
		...(nextMetadata ? { metadata: nextMetadata } : {}),
	};
}

/**
 * Strip thinking support (capability, options, config and default-on metadata)
 * from every model owned by a {@link NON_REASONING_MODEL_VENDORS} vendor.
 */
export function stripNonReasoningModelSupport(
	models: Record<string, ModelInfo>,
): Record<string, ModelInfo> {
	return Object.fromEntries(
		Object.entries(models).map(([modelId, model]) => [
			modelId,
			isNonReasoningVendorModel(model.id || modelId, model)
				? withoutThinkingSupport(model)
				: model,
		]),
	);
}
