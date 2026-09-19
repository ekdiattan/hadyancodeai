import { getGeneratedModelsForProvider } from "../catalog/catalog.generated-access";
import type { ModelInfo } from "../catalog/types";

/**
 * Product policy for the first-party HadyanCode gateway providers
 * (`hadyancode` and `hadyancode-pass`).
 *
 * The gateway is OpenRouter-backed, so its model ids keep the marketplace
 * `vendor/model` shape. This policy declares which labs the first-party account
 * surfaces; every other lab is deliberately excluded.
 *
 * The policy is applied twice so the surface cannot widen by accident:
 * - statically, by `buildHadyanCodeGatewayModels()` (the baked offline catalog)
 * - at runtime, by `filterHadyanCodeGatewayModels()` around the live
 *   recommended-models feed.
 */
export const HADYANCODE_GATEWAY_MODEL_VENDORS = ["anthropic", "deepseek"] as const;

/**
 * Provider ids backed by the first-party gateway. Their model lists are clamped
 * by {@link filterHadyanCodeGatewayModels} wherever they are merged.
 */
export const HADYANCODE_GATEWAY_PROVIDER_IDS = [
	"hadyancode",
	"hadyancode-pass",
] as const;

export function isHadyanCodeGatewayProviderId(providerId: string): boolean {
	return (HADYANCODE_GATEWAY_PROVIDER_IDS as readonly string[]).includes(
		providerId,
	);
}

const ALLOWED_VENDORS: ReadonlySet<string> = new Set(
	HADYANCODE_GATEWAY_MODEL_VENDORS,
);

let allowedModelSlugCache: Set<string> | undefined;

/**
 * Model ids belonging to the allowed vendors, in both the bare (`claude-sonnet-5`)
 * and marketplace-qualified (`anthropic/claude-sonnet-5`) spellings.
 *
 * The live recommended-models feed mixes both spellings — subscription entries
 * arrive as `<gateway>/<slug>` (e.g. `hadyancode-pass/deepseek-v4-pro`) while
 * free entries arrive marketplace-qualified — so a slug lookup is required to
 * classify them without hardcoding gateway namespaces.
 */
function allowedModelSlugs(): Set<string> {
	allowedModelSlugCache ??= new Set(
		HADYANCODE_GATEWAY_MODEL_VENDORS.flatMap((vendor) =>
			Object.keys(getGeneratedModelsForProvider(vendor)).flatMap((modelId) => [
				modelId,
				`${vendor}/${modelId}`,
			]),
		),
	);
	return allowedModelSlugCache;
}

/**
 * Whether a model id may be served through the first-party gateway.
 *
 * Accepts a marketplace id (`anthropic/claude-sonnet-5`), a gateway-scoped id
 * (`hadyancode-pass/deepseek-v4-pro`) or a bare catalog id (`claude-sonnet-5`).
 */
export function isHadyanCodeGatewayModel(modelId: string): boolean {
	const segments = modelId.split("/");
	const vendor = segments.length > 1 ? segments[0]?.trim().toLowerCase() : undefined;
	if (vendor && ALLOWED_VENDORS.has(vendor)) {
		return true;
	}
	const slug = (segments.at(-1) ?? modelId).trim().replace(/:free$/, "");
	return allowedModelSlugs().has(slug);
}

/**
 * Drop every model that the first-party gateway policy does not allow.
 *
 * Keys are preserved: callers rely on the live feed's own ids (e.g.
 * `hadyancode-pass/deepseek-v4-pro`) to address the gateway.
 */
export function filterHadyanCodeGatewayModels(
	models: Record<string, ModelInfo>,
): Record<string, ModelInfo> {
	return Object.fromEntries(
		Object.entries(models).filter(([modelId, model]) =>
			isHadyanCodeGatewayModel(model.id || modelId),
		),
	);
}

/**
 * Baked catalog for the first-party gateway.
 *
 * Sourced from the marketplace catalog generated for `hadyancode`
 * (`scripts/generate-models.ts` maps models.dev's `openrouter` entry to this
 * provider and applies the policy while writing), so ids keep the
 * marketplace-qualified spelling the OpenRouter-backed gateway expects on the
 * wire. The policy is re-applied here so a stale generated file can never widen
 * the surface.
 */
export function buildHadyanCodeGatewayModels(): Record<string, ModelInfo> {
	return filterHadyanCodeGatewayModels(
		Object.fromEntries(
			Object.entries(getGeneratedModelsForProvider("hadyancode")).map(
				([modelId, info]) => [modelId, { ...info }],
			),
		),
	);
}
