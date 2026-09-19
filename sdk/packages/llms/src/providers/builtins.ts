import {
	type GatewayModelDefinition,
	type GatewayModelOperationCapability,
	type GatewayModelToolCapability,
	type GatewayProviderManifest,
	type GatewayProviderMetadata,
	type GatewayProviderSettings,
	getHadyanCodeEnvironmentConfig,
	HADYANCODE_DEFAULT_MODEL_ID,
	type JsonValue,
	type ProviderCapability,
	type ProviderConfigField,
} from "@hadyancode/shared";
import { getGeneratedModelsForProvider } from "../catalog/catalog.generated-access";
import type {
	ModelCollection,
	ModelInfo,
	ProviderClient,
	ProviderProtocol,
} from "../catalog/types";
import type { BuiltinSpec, ProviderApiLine } from "./builtin-types";
import {
	extractHadyanCodePassLimitMessage,
	HadyanCodeFreeModelLimitError,
	HadyanCodeNotSubscribedError,
	HadyanCodeOrgIndividualInferenceSubscriptionError,
	HadyanCodePassLimitError,
	isHadyanCodeFreeModelLimitMessage,
	isHadyanCodeNotSubscribedMessage,
	isHadyanCodeOrgIndividualInferenceSubscriptionMessage,
} from "./errors";
import { buildHadyanCodeGatewayModels } from "./first-party-models";
import { toGatewayModelCapabilities } from "./model-capabilities";
import {
	BUILTIN_MODEL_OPERATION_CAPABILITIES,
	BUILTIN_TRANSCRIPTION_TRANSPORTS,
} from "./model-operations";
import { GENERATED_PROVIDER_SPECS } from "./providers.generated";
import {
	ANTHROPIC_AND_QWEN_CACHE_ROUTING_METADATA,
	ANTHROPIC_ROUTING_METADATA,
} from "./routing/anthropic-compatible";

/**
 * This registry exposes the Claude providers (Anthropic, Claude Code), DeepSeek,
 * and the first-party HadyanCode gateway (usage billing and its subscription
 * tier). The gateway providers are restricted to Claude + DeepSeek models by
 * ./first-party-models.
 *
 * Retained for backwards-compatible exports used by routing and host code;
 * the Ollama provider itself is no longer registered.
 */
export const OLLAMA_DEFAULT_CONTEXT_WINDOW = 32768;

export type {
	BuiltinSpec,
	ProviderApiLine,
	ProviderFamily,
} from "./builtin-types";

type BuiltinSpecOverride = Pick<BuiltinSpec, "id"> &
	Partial<Omit<BuiltinSpec, "id">>;

const API_KEY_FIELD = {
	path: "apiKey",
	label: "API Key",
	type: "password",
	placeholder: "Enter API key...",
	description: "API key issued by the provider.",
	secret: true,
} as const;

const BASE_URL_FIELD = {
	path: "baseUrl",
	label: "Base URL",
	type: "url",
	placeholder: "https://...",
	description: "Base endpoint used for provider requests.",
} as const;

const NATIVE_WEB_SEARCH_MODEL_TOOL_CAPABILITIES: readonly GatewayModelToolCapability[] =
	[{ name: "web_search" }];

function defaultConfigFieldsForSpec(
	spec: BuiltinSpec,
): readonly ProviderConfigField[] {
	const fields: ProviderConfigField[] = [];
	if (spec.apiKeyEnv?.length) {
		fields.push(API_KEY_FIELD as ProviderConfigField);
	}
	if (spec.defaults?.baseUrl?.trim()) {
		fields.push(BASE_URL_FIELD as ProviderConfigField);
	}
	return fields;
}

function cloneModels(
	models: Record<string, ModelInfo>,
): Record<string, ModelInfo> {
	return Object.fromEntries(
		Object.entries(models).map(([id, info]) => [id, { ...info }]),
	);
}

function uniqueCapabilities(
	capabilities: readonly ProviderCapability[] | undefined,
): ProviderCapability[] | undefined {
	if (!capabilities?.length) return undefined;
	return [...new Set(capabilities)];
}

function getProviderCapabilities(
	spec: BuiltinSpec,
): ProviderCapability[] | undefined {
	return uniqueCapabilities([
		...(spec.capabilities ?? []),
		...(spec.popular !== undefined ? (["popular"] as const) : []),
	]);
}

function getProviderMetadata(
	spec: BuiltinSpec,
): GatewayProviderMetadata | undefined {
	const configFields = spec.configFields ?? defaultConfigFieldsForSpec(spec);
	const metadata: GatewayProviderMetadata = {
		...spec.metadata,
		configFields,
	};
	if (spec.popular !== undefined) {
		metadata.popularRank = spec.popular;
	}
	return metadata;
}

function mergeDefaults(
	base: GatewayProviderSettings | undefined,
	override: GatewayProviderSettings | undefined,
): GatewayProviderSettings | undefined {
	if (!override) {
		return base;
	}
	if (!base) {
		return override;
	}
	return {
		...base,
		...override,
	};
}

function mergeBuiltinSpec(
	base: BuiltinSpec | undefined,
	override: BuiltinSpecOverride,
): BuiltinSpec {
	return {
		...base,
		...override,
		defaults: mergeDefaults(base?.defaults, override.defaults),
	} as BuiltinSpec;
}

function mergeBuiltinSpecs(
	generatedSpecs: readonly BuiltinSpec[],
	overrides: BuiltinSpecOverride[],
): BuiltinSpec[] {
	const generatedById = new Map(
		generatedSpecs.map((spec) => [spec.id, spec] as const),
	);
	const overriddenIds = new Set<string>();
	const mergedOverrides = overrides.map((override) => {
		overriddenIds.add(override.id);
		return mergeBuiltinSpec(generatedById.get(override.id), override);
	});
	const generatedOnlySpecs = generatedSpecs.filter(
		(spec) => !overriddenIds.has(spec.id),
	);

	return [...mergedOverrides, ...generatedOnlySpecs].map((spec) => {
		const transcription = (
			BUILTIN_TRANSCRIPTION_TRANSPORTS as Readonly<
				Record<
					string,
					{ transport: GatewayProviderMetadata["transcriptionTransport"] }
				>
			>
		)[spec.id];
		return {
			...spec,
			modelOperationCapabilities:
				spec.modelOperationCapabilities ??
				BUILTIN_MODEL_OPERATION_CAPABILITIES[spec.id],
			metadata: transcription
				? {
						...spec.metadata,
						transcriptionTransport: transcription.transport,
					}
				: spec.metadata,
		};
	});
}
function generatedModels(providerId: string): Record<string, ModelInfo> {
	return cloneModels(getGeneratedModelsForProvider(providerId));
}

function pickAnthropicModel(match: (id: string) => boolean): ModelInfo {
	const entry = Object.entries(generatedModels("anthropic")).find(([id]) =>
		match(id),
	);
	if (entry) {
		return entry[1];
	}
	return {
		id: "sonnet",
		name: "Claude Sonnet",
		capabilities: ["streaming", "reasoning"],
	};
}

function buildClaudeCodeModels(): Record<string, ModelInfo> {
	function toClaudeCodeModel(id: "opus" | "sonnet" | "haiku"): ModelInfo {
		const source =
			id === "opus"
				? pickAnthropicModel((modelId) => modelId.includes("opus"))
				: id === "haiku"
					? pickAnthropicModel((modelId) => modelId.includes("haiku"))
					: pickAnthropicModel((modelId) => modelId.includes("sonnet"));
		return {
			...source,
			id,
			name: `Claude ${id.charAt(0).toUpperCase()}${id.slice(1)}`,
		};
	}

	return {
		opus: toClaudeCodeModel("opus"),
		sonnet: toClaudeCodeModel("sonnet"),
		haiku: toClaudeCodeModel("haiku"),
	};
}

function fallbackModelInfo(id: string, spec?: BuiltinSpec): ModelInfo {
	const info: ModelInfo = {
		id,
		name: id,
	};
	if (spec?.family === "openai-compatible") {
		info.contextWindow = 128_000;
		info.maxInputTokens = 128_000;
		info.capabilities = ["streaming", "tools", "images"];
	}
	return info;
}

function modelInfoToGateway(
	providerId: string,
	info: ModelInfo,
): GatewayModelDefinition {
	const metadata: Record<string, JsonValue | undefined> = {};
	if (info.family) {
		metadata.family = info.family;
	}
	if (info.pricing) {
		metadata.pricing = info.pricing;
	}
	if (info.status) {
		metadata.status = info.status;
	}
	if (info.releaseDate) {
		metadata.releaseDate = info.releaseDate;
	}
	if (typeof info.metadata?.reasoningDefaultOn === "boolean") {
		metadata.reasoningDefaultOn = info.metadata.reasoningDefaultOn;
	}
	return {
		id: info.id,
		name: info.name ?? info.id,
		providerId,
		description: info.description,
		contextWindow: info.contextWindow,
		maxInputTokens: info.maxInputTokens,
		maxOutputTokens: info.maxTokens,
		operation: info.operation,
		operationModes: info.operationModes,
		modalities: info.modalities,
		capabilities: toGatewayModelCapabilities(info.capabilities),
		reasoningOptions: info.reasoningOptions,
		metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
	};
}

function inferProtocol(spec: BuiltinSpec): ProviderProtocol {
	if (spec.client === "openai") {
		return "openai-responses";
	}
	switch (spec.family) {
		case "openai":
			return "openai-responses";
		case "anthropic":
		case "bedrock":
			return "anthropic";
		case "google":
		case "vertex":
			return "gemini";
		default:
			return "openai-chat";
	}
}

function inferClient(spec: BuiltinSpec): ProviderClient {
	if (spec.protocol === "openai-responses") {
		return "openai";
	}
	switch (spec.family) {
		case "openai":
			return "openai";
		case "anthropic":
			return "anthropic";
		case "google":
			return "gemini";
		case "vertex":
			return "vertex";
		case "bedrock":
			return "bedrock";
		case "claude-code":
			// Claude Code runs through the optional `ai-sdk-provider-claude-code`
			// community adapter (see vendors/community.ts and the `claude-code`
			// ProviderModuleKind in routing/provider-options-types.ts), not the
			// generic OpenAI-compatible client.
			return "ai-sdk-community";
		case "mistral":
		default:
			return "openai-compatible";
	}
}
/**
 * Handwritten openai-compatible providers that require runtime or product
 * policy on top of the generated catalog. Providers fully described by
 * models.dev must not be duplicated here.
 */
const OPENAI_COMPATIBLE_SPEC_OVERRIDES: BuiltinSpecOverride[] = [
	{
		id: "deepseek",
		name: "DeepSeek",
		description: "Advanced AI models for coding and agentic work",
		family: "openai-compatible",
		popular: 10,
		// DeepSeek is offered without a thinking mode (see
		// ../catalog/model-filters.ts), so the provider must not advertise
		// reasoning either — listings and pickers read this list.
		capabilities: ["prompt-cache"],
		defaultModelId: "deepseek-v4-flash",
		apiKeyEnv: ["DEEPSEEK_API_KEY"],
		defaults: { baseUrl: "https://api.deepseek.com/v1" },
	},
];

/**
 * Default model for the `hadyancode-pass` subscription tier. The tier's catalog
 * is served live (and policy-filtered); this id carries the offline picker entry
 * and must stay inside the first-party policy (see ./first-party-models).
 */
const HADYANCODE_PASS_DEFAULT_MODEL_ID = "deepseek/deepseek-v4-flash";

/**
 * Spec for the OpenRouter-backed first-party gateway providers. The base URL is
 * resolved lazily from the environment so tests and hosts can point the gateway
 * at a local server.
 */
function createHadyanCodeGatewaySpec(
	input: Pick<BuiltinSpec, "id" | "name" | "defaultModelId"> &
		Partial<
			Pick<
				BuiltinSpec,
				| "description"
				| "popular"
				| "modelsProviderId"
				| "modelsFactory"
				| "metadata"
				| "defaults"
			>
		>,
): BuiltinSpec {
	return {
		id: input.id,
		name: input.name,
		description: input.description ?? "HadyanCode API endpoint",
		family: "hadyancode",
		popular: input.popular,
		modelToolCapabilities: NATIVE_WEB_SEARCH_MODEL_TOOL_CAPABILITIES,
		capabilities: ["reasoning", "prompt-cache", "tools", "oauth"],
		modelsProviderId: input.modelsProviderId,
		modelsFactory: input.modelsFactory,
		defaultModelId: input.defaultModelId,
		apiKeyEnv: ["HADYANCODE_API_KEY"],
		defaults: {
			get baseUrl(): string {
				return `${getHadyanCodeEnvironmentConfig().apiBaseUrl}/api/v1`;
			},
			...input.defaults,
		},
		metadata: {
			...ANTHROPIC_AND_QWEN_CACHE_ROUTING_METADATA,
			imageTransport: "openrouter",
			responseEnvelope: "success-data",
			...input.metadata,
		},
	};
}

async function handleHadyanCodeResponseError(
	response: Response,
	providerId: string,
): Promise<void> {
	if (response.status < 400) {
		return;
	}

	const body = await response
		.clone()
		.text()
		.catch(() => "");

	if (isHadyanCodeOrgIndividualInferenceSubscriptionMessage(body)) {
		throw new HadyanCodeOrgIndividualInferenceSubscriptionError(providerId);
	}

	if (isHadyanCodeFreeModelLimitMessage(body)) {
		throw new HadyanCodeFreeModelLimitError(body, providerId);
	}

	const passLimitMessage = extractHadyanCodePassLimitMessage(body);
	if (passLimitMessage) {
		throw new HadyanCodePassLimitError(passLimitMessage, providerId);
	}

	if (isHadyanCodeNotSubscribedMessage(body)) {
		throw new HadyanCodeNotSubscribedError(providerId);
	}
}

const hadyancode = createHadyanCodeGatewaySpec({
	id: "hadyancode",
	name: "HadyanCode",
	description: "HadyanCode usage billing (Claude and DeepSeek models)",
	popular: 1,
	// Baked fallback catalog, already restricted by the first-party policy. The
	// live recommended-models feed refines it at runtime and is filtered by the
	// same policy in @hadyancode/core.
	modelsFactory: buildHadyanCodeGatewayModels,
	defaultModelId: HADYANCODE_DEFAULT_MODEL_ID,
	defaults: {
		options: {
			onResponseError: async (response: Response) => {
				await handleHadyanCodeResponseError(response, "hadyancode");
			},
		},
	},
});

const hadyancodePass = createHadyanCodeGatewaySpec({
	id: "hadyancode-pass",
	name: "HadyanCodePass",
	description: "HadyanCode API endpoint with HadyanCodePass models",
	popular: 2,
	// The subscription catalog is served live, so there is no baked list: the
	// declared default supplies the offline picker entry.
	defaultModelId: HADYANCODE_PASS_DEFAULT_MODEL_ID,
	metadata: { usageCostDisplay: "subscription" },
	defaults: {
		options: {
			onResponseError: async (response: Response) => {
				await handleHadyanCodeResponseError(response, "hadyancode-pass");
			},
		},
	},
});

/**
 * Non-OpenAI-compatible runtime/product overrides. Keep generated catalog facts
 * in providers.generated.ts and only retain HadyanCode-owned behavior here.
 */
const BUILTIN_SPEC_OVERRIDES: BuiltinSpecOverride[] = [
	{
		id: "anthropic",
		name: "Anthropic",
		description: "Creator of Claude, the AI assistant",
		family: "anthropic",
		modelToolCapabilities: NATIVE_WEB_SEARCH_MODEL_TOOL_CAPABILITIES,
		popular: 15,
		capabilities: ["reasoning", "prompt-cache"],
		defaultModelId: "claude-fable-5-1",
		apiKeyEnv: ["ANTHROPIC_API_KEY"],
		modelsProviderId: "anthropic",
		defaults: { baseUrl: "https://api.anthropic.com/v1" },
		metadata: ANTHROPIC_ROUTING_METADATA,
	},
	{
		id: "claude-code",
		name: "Claude Code",
		description: "Use Claude Code SDK with Claude Pro/Max subscription",
		family: "claude-code",
		// provider-tools: the Claude Code CLI executes its own native tools
		// (Read/Write/Bash/...) inside the spawned agent session and cannot
		// bridge externally-executed AI SDK tools. Without this capability the
		// gateway sends HadyanCode's tool definitions (which the provider drops)
		// while the CLI's own tools stay enabled with no approval plumbing —
		// every write is refused and no prompt can appear (#13146).
		capabilities: ["reasoning", "provider-tools"],
		defaultModelId: "sonnet",
		modelsFactory: buildClaudeCodeModels,
		defaults: { baseUrl: "" },
		configFields: [],
		// Claude Code is typically authenticated with a Pro/Max subscription,
		// where any dollar figure would be an API-rate estimate rather than a
		// real charge. The CLI does report a cost when it runs on API-key
		// billing, but the provider cannot tell the two apart from here, so
		// prefer not showing a number over showing a misleading one.
		metadata: { usageCostDisplay: "subscription" },
	},
	...OPENAI_COMPATIBLE_SPEC_OVERRIDES,
	hadyancode,
	hadyancodePass,
];

export const BUILTIN_SPECS: BuiltinSpec[] = mergeBuiltinSpecs(
	GENERATED_PROVIDER_SPECS,
	BUILTIN_SPEC_OVERRIDES,
);

const API_LINE_BASE_URLS_BY_PROVIDER_ID: ReadonlyMap<
	string,
	Readonly<Partial<Record<ProviderApiLine, string>>>
> = new Map(
	BUILTIN_SPECS.flatMap((spec) =>
		spec.apiLineBaseUrls ? [[spec.id, spec.apiLineBaseUrls] as const] : [],
	),
);

export function isProviderApiLine(value: unknown): value is ProviderApiLine {
	return value === "china" || value === "international";
}

/**
 * Resolve the regional base URL for a provider's selected API line. Returns
 * undefined when the provider has no regional endpoints or the api line is not
 * a recognized value. Callers must let an explicit user-configured base URL
 * win over this resolution.
 */
export function resolveProviderApiLineBaseUrl(
	providerId: string,
	apiLine: unknown,
): string | undefined {
	if (!isProviderApiLine(apiLine)) {
		return undefined;
	}
	return API_LINE_BASE_URLS_BY_PROVIDER_ID.get(providerId)?.[apiLine];
}

function getModels(spec: BuiltinSpec): Record<string, ModelInfo> {
	if (spec.modelsFactory) {
		return spec.modelsFactory();
	}
	if (spec.modelsProviderId) {
		return generatedModels(spec.modelsProviderId);
	}
	return {};
}

function toModelCollection(spec: BuiltinSpec): ModelCollection {
	const sourceModels = getModels(spec);
	const capabilities = getProviderCapabilities(spec);
	const metadata = getProviderMetadata(spec);
	const models: Record<string, ModelInfo> =
		Object.keys(sourceModels).length > 0
			? { ...sourceModels }
			: spec.defaultModelId
				? {
						[spec.defaultModelId]: fallbackModelInfo(spec.defaultModelId, spec),
					}
				: {};
	if (spec.defaultModelId && !models[spec.defaultModelId]) {
		models[spec.defaultModelId] = fallbackModelInfo(spec.defaultModelId, spec);
	}
	const modelIds = Object.keys(models);
	const defaultModelId = spec.defaultModelId || modelIds[0] || "default";

	return {
		provider: {
			id: spec.id,
			name: spec.name,
			description: spec.description,
			protocol: spec.protocol ?? inferProtocol(spec),
			baseUrl: spec.defaults?.baseUrl,
			modelsSourceUrl: spec.modelsSourceUrl,
			defaultModelId,
			capabilities,
			env: spec.apiKeyEnv ? [...spec.apiKeyEnv] : undefined,
			client: spec.client ?? inferClient(spec),
			source: "system",
			metadata,
		},
		models,
	};
}
export function toManifest(spec: BuiltinSpec): GatewayProviderManifest {
	const collection = toModelCollection(spec);
	const capabilities = getProviderCapabilities(spec);
	const metadata = getProviderMetadata(spec);
	const models = Object.values(collection.models).map((info) =>
		modelInfoToGateway(spec.id, info),
	);
	const resolvedModels =
		models.length > 0
			? models
			: [
					// A placeholder for a provider whose collection is empty.
					modelInfoToGateway(spec.id, {
						id: collection.provider.defaultModelId || "default",
						name: collection.provider.defaultModelId || "Default",
					}),
				];

	return {
		id: spec.id,
		name: spec.name,
		description: spec.description,
		defaultModelId:
			collection.provider.defaultModelId || resolvedModels[0]?.id || "default",
		models: resolvedModels,
		modelOperationCapabilities: spec.modelOperationCapabilities?.map(
			(capability: GatewayModelOperationCapability) => ({
				...capability,
				modes: capability.modes ? [...capability.modes] : undefined,
				inputModalities: capability.inputModalities
					? [...capability.inputModalities]
					: undefined,
				outputModalities: capability.outputModalities
					? [...capability.outputModalities]
					: undefined,
				routes: capability.routes?.map((route) => ({ ...route })),
				excludeRoutes: capability.excludeRoutes?.map((route) => ({ ...route })),
			}),
		),
		modelToolCapabilities: spec.modelToolCapabilities?.map((capability) => ({
			...capability,
			routes: capability.routes?.map((route) => ({ ...route })),
			excludeRoutes: capability.excludeRoutes?.map((route) => ({ ...route })),
		})),
		capabilities,
		env: spec.env ?? ["browser", "node"],
		api: spec.defaults?.baseUrl,
		apiKeyEnv: spec.apiKeyEnv,
		docsUrl: spec.docsUrl,
		metadata,
	};
}

/** Static manifests used for synchronous capability checks before providers load. */
export const BUILTIN_PROVIDER_MANIFESTS_BY_ID: Readonly<
	Record<string, GatewayProviderManifest>
> = Object.fromEntries(
	BUILTIN_SPECS.map((spec) => [spec.id, toManifest(spec)] as const),
);

export const BUILTIN_PROVIDER_COLLECTION_LIST: ModelCollection[] =
	BUILTIN_SPECS.map(toModelCollection);

export const BUILTIN_PROVIDER_COLLECTIONS_BY_ID: Record<
	string,
	ModelCollection
> = Object.fromEntries(
	BUILTIN_PROVIDER_COLLECTION_LIST.map((collection) => [
		collection.provider.id,
		collection,
	]),
);
