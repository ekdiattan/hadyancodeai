import {
	mkdtempSync,
	readdirSync,
	readFileSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import { access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type AgentMessage,
	type AgentModelEvent,
	DEFAULT_MAX_IMAGE_ENCODED_BYTES,
	DEFAULT_MAX_TOTAL_MEDIA_BYTES,
	estimateRequestInputTokens,
	type GatewayModelHandleOptions,
	IMAGE_UNSUPPORTED_PLACEHOLDER,
	type ITelemetryService,
	resetSdkErrorRateLimiterForTests,
} from "@hadyancode/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeModelsDevProviderModels } from "../catalog/catalog-live";
import { createOpenAICompatibleProvider } from "./ai-sdk";
import {
	createGateway,
	DEFAULT_GATEWAY_MAX_OUTPUT_TOKENS,
	resolveGatewayRequestMaxTokens,
} from "./gateway";

const streamTextSpy = vi.fn();
const generateImageSpy = vi.fn();
const vercelGatewayFactorySpy = vi.fn();
const vercelGatewayImageSpy = vi.fn((modelId: string) => ({
	modelId,
	family: "vercel-gateway-image",
}));
const openaiCompatibleFactorySpy = vi.fn();
const openaiCompatibleSpy = vi.fn((modelId: string) => ({
	modelId,
	family: "openai-compatible",
}));
const openaiResponsesSpy = vi.fn((modelId: string) => ({
	modelId,
	family: "openai",
}));
const openaiImageSpy = vi.fn((modelId: string) => ({
	modelId,
	family: "openai-image",
}));
const openaiImageGenerationToolSpy = vi.fn((options: unknown) => ({
	type: "provider-tool",
	id: "openai.image_generation",
	options,
}));
const openRouterFactorySpy = vi.fn();
const openRouterChatSpy = vi.fn((modelId: string) => ({
	modelId,
	family: "openrouter-chat",
}));
const openRouterImageSpy = vi.fn((modelId: string) => ({
	modelId,
	family: "openrouter-image",
}));
const anthropicSpy = vi.fn((modelId: string) => ({
	modelId,
	family: "anthropic",
}));
const googleSpy = vi.fn((modelId: string) => ({ modelId, family: "google" }));
const nativeWebSearchSpy = vi.fn((options?: unknown) => ({
	type: "provider-tool",
	options,
}));
const codexExecFactorySpy = vi.fn();
const codexExecSpy = vi.fn((modelId: string) => ({
	modelId,
	family: "openai-codex",
}));
const claudeCodeFactorySpy = vi.fn();
const claudeCodeSpy = vi.fn((modelId: string) => ({
	modelId,
	family: "claude-code",
}));

function createFetchMock() {
	const fetchMock = vi.fn(
		async (
			_input: Parameters<typeof fetch>[0],
			_init?: Parameters<typeof fetch>[1],
		) => new Response("ok"),
	);
	return {
		fetchMock,
		fetch: fetchMock as unknown as typeof fetch,
	};
}

vi.mock("ai", () => ({
	jsonSchema: (schema: unknown, options: unknown) => ({
		jsonSchema: schema,
		...(options && typeof options === "object" ? options : {}),
	}),
	generateImage: (input: unknown) => generateImageSpy(input),
	streamText: (input: unknown) => streamTextSpy(input),
	// `wrapLanguageModel` is used by the openai-compatible and mistral
	// vendors to attach `splitToolImagesMiddleware`. The middleware itself
	// is exercised by its own unit tests; here we just need an identity
	// pass-through so the vendor factories' downstream `model:` callbacks
	// keep returning the spy-produced mock objects unchanged. (The mock
	// objects don't satisfy the real `LanguageModelV4` interface, so we
	// can't call the real `wrapLanguageModel` either way.)
	wrapLanguageModel: ({ model }: { model: unknown }) => model,
}));

vi.mock("@ai-sdk/openai", () => ({
	createOpenAI: () => ({
		responses: (modelId: string) => openaiResponsesSpy(modelId),
		image: (modelId: string) => openaiImageSpy(modelId),
		tools: {
			webSearch: (options?: unknown) => nativeWebSearchSpy(options),
			imageGeneration: (options: unknown) =>
				openaiImageGenerationToolSpy(options),
		},
	}),
}));

vi.mock("@ai-sdk/gateway", () => ({
	createGateway: (config: unknown) => {
		vercelGatewayFactorySpy(config);
		return {
			imageModel: (modelId: string) => vercelGatewayImageSpy(modelId),
		};
	},
}));

vi.mock("@ai-sdk/openai-compatible", () => ({
	createOpenAICompatible: (config: unknown) => {
		openaiCompatibleFactorySpy(config);
		return (modelId: string) => openaiCompatibleSpy(modelId);
	},
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
	createOpenRouter: (config: unknown) => {
		openRouterFactorySpy(config);
		return {
			chat: (modelId: string) => openRouterChatSpy(modelId),
			imageModel: (modelId: string) => openRouterImageSpy(modelId),
		};
	},
}));

vi.mock("@ai-sdk/anthropic", () => ({
	createAnthropic: () =>
		Object.assign((modelId: string) => anthropicSpy(modelId), {
			tools: {
				webSearch_20250305: (options?: unknown) => nativeWebSearchSpy(options),
			},
		}),
}));

vi.mock("@ai-sdk/google", () => ({
	createGoogleGenerativeAI: () =>
		Object.assign((modelId: string) => googleSpy(modelId), {
			tools: {
				googleSearch: (options?: unknown) => nativeWebSearchSpy(options),
			},
		}),
}));

vi.mock("ai-sdk-provider-codex-cli", () => ({
	createCodexExec: (config: unknown) => {
		codexExecFactorySpy(config);
		return (modelId: string) => codexExecSpy(modelId);
	},
}));

vi.mock("ai-sdk-provider-claude-code", () => ({
	createClaudeCode: (config: unknown) => {
		claudeCodeFactorySpy(config);
		return (modelId: string) => claudeCodeSpy(modelId);
	},
}));

async function* makeStreamParts(parts: unknown[]) {
	for (const part of parts) {
		yield part;
	}
}

async function* makeFailingStreamParts(error: unknown, parts: unknown[] = []) {
	for (const part of parts) {
		yield part;
	}
	throw error;
}

async function collect(
	iterable: AsyncIterable<AgentModelEvent>,
): Promise<AgentModelEvent[]> {
	const events: AgentModelEvent[] = [];
	for await (const event of iterable) {
		events.push(event);
	}
	return events;
}

function mockSuccessfulStream(): void {
	streamTextSpy.mockReturnValue({
		fullStream: makeStreamParts([
			{ type: "finish", usage: { inputTokens: 1, outputTokens: 1 } },
		]),
	});
}

function createTelemetryMock(): {
	telemetry: ITelemetryService;
	capture: ReturnType<typeof vi.fn>;
} {
	const capture = vi.fn();
	return {
		capture,
		telemetry: { capture } as unknown as ITelemetryService,
	};
}

const baseMessages: AgentMessage[] = [
	{
		id: "user_1",
		role: "user",
		content: [{ type: "text", text: "Hello" }],
		createdAt: Date.now(),
	},
];

function generatedImageEvent(mediaType: string, data: string) {
	return expect.objectContaining({
		type: "media",
		media: expect.objectContaining({
			id: expect.any(String),
			modality: "image",
			mediaType,
			source: { type: "base64", data },
		}),
	});
}

async function captureReasoningOptions({
	providerId,
	options,
	defaults,
}: {
	providerId: "hadyancode" | "openrouter";
	options: Record<string, unknown>;
	defaults?: GatewayModelHandleOptions;
}): Promise<unknown> {
	mockSuccessfulStream();
	const isHadyanCode = providerId === "hadyancode";
	const modelId = isHadyanCode ? "anthropic/claude-sonnet-4.6" : "openai/gpt-5.4";
	const gateway = createGateway({
		providerConfigs: [
			isHadyanCode
				? {
						providerId: "hadyancode",
						apiKey: "hadyancode-key",
						models: [
							{
								id: modelId,
								name: "Claude Sonnet 4.6",
								metadata: { family: "claude-sonnet" },
							},
						],
					}
				: {
						providerId: "openrouter",
						apiKey: "openrouter-key",
					},
		],
	});
	const model = gateway.createAgentModel({ providerId, modelId }, defaults);

	await collect(
		await model.stream({
			messages: baseMessages,
			tools: [],
			options,
		}),
	);

	const call = streamTextSpy.mock.calls.at(-1)?.[0] as
		| {
				reasoning?: unknown;
				providerOptions?: Record<string, { reasoning?: unknown }>;
		  }
		| undefined;
	return call?.reasoning ?? call?.providerOptions?.[providerId]?.reasoning;
}

const originalOpenRouterApiKey = process.env.OPENROUTER_API_KEY;
const originalCaptureProviderRequest =
	process.env.HADYANCODE_CAPTURE_PROVIDER_REQUEST;
const originalCaptureWire = process.env.HADYANCODE_CAPTURE_WIRE;
const originalCaptureDir = process.env.HADYANCODE_CAPTURE_DIR;
const originalCaptureDataDir = process.env.HADYANCODE_DATA_DIR;
const originalCaptureMaxPreviewBytes =
	process.env.HADYANCODE_CAPTURE_MAX_PREVIEW_BYTES;
const originalCaptureCleanup = process.env.HADYANCODE_CAPTURE_CLEANUP;

function readCaptureRecords(dir: string): Array<Record<string, unknown>> {
	return readdirSync(dir)
		.filter((file) => file.endsWith(".provider-request.json"))
		.sort()
		.map(
			(file) =>
				JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<
					string,
					unknown
				>,
		);
}

describe("sdk-gateway", () => {
	beforeEach(() => {
		resetSdkErrorRateLimiterForTests();
		streamTextSpy.mockReset();
		generateImageSpy.mockReset();
		vercelGatewayFactorySpy.mockReset();
		vercelGatewayImageSpy.mockReset();
		openaiCompatibleFactorySpy.mockReset();
		openaiCompatibleSpy.mockReset();
		openaiResponsesSpy.mockReset();
		openaiImageSpy.mockReset();
		openaiImageGenerationToolSpy.mockReset();
		openRouterFactorySpy.mockReset();
		openRouterChatSpy.mockReset();
		openRouterImageSpy.mockReset();
		anthropicSpy.mockReset();
		googleSpy.mockReset();
		nativeWebSearchSpy.mockReset();
		codexExecFactorySpy.mockReset();
		codexExecSpy.mockReset();
		googleSpy.mockImplementation((modelId: string) => ({
			modelId,
			family: "google",
		}));
		openaiCompatibleSpy.mockImplementation((modelId: string) => ({
			modelId,
			family: "openai-compatible",
		}));
		openaiResponsesSpy.mockImplementation((modelId: string) => ({
			modelId,
			family: "openai",
		}));
		openaiImageSpy.mockImplementation((modelId: string) => ({
			modelId,
			family: "openai-image",
		}));
		openaiImageGenerationToolSpy.mockImplementation((options: unknown) => ({
			type: "provider-tool",
			id: "openai.image_generation",
			options,
		}));
		openRouterChatSpy.mockImplementation((modelId: string) => ({
			modelId,
			family: "openrouter-chat",
		}));
		openRouterImageSpy.mockImplementation((modelId: string) => ({
			modelId,
			family: "openrouter-image",
		}));
		vercelGatewayImageSpy.mockImplementation((modelId: string) => ({
			modelId,
			family: "vercel-gateway-image",
		}));
		anthropicSpy.mockImplementation((modelId: string) => ({
			modelId,
			family: "anthropic",
		}));
		codexExecSpy.mockImplementation((modelId: string) => ({
			modelId,
			family: "openai-codex",
		}));
		if (originalOpenRouterApiKey === undefined) {
			delete process.env.OPENROUTER_API_KEY;
		} else {
			process.env.OPENROUTER_API_KEY = originalOpenRouterApiKey;
		}
		if (originalCaptureProviderRequest === undefined) {
			delete process.env.HADYANCODE_CAPTURE_PROVIDER_REQUEST;
		} else {
			process.env.HADYANCODE_CAPTURE_PROVIDER_REQUEST =
				originalCaptureProviderRequest;
		}
		if (originalCaptureWire === undefined) {
			delete process.env.HADYANCODE_CAPTURE_WIRE;
		} else {
			process.env.HADYANCODE_CAPTURE_WIRE = originalCaptureWire;
		}
		if (originalCaptureDir === undefined) {
			delete process.env.HADYANCODE_CAPTURE_DIR;
		} else {
			process.env.HADYANCODE_CAPTURE_DIR = originalCaptureDir;
		}
		if (originalCaptureDataDir === undefined) {
			delete process.env.HADYANCODE_DATA_DIR;
		} else {
			process.env.HADYANCODE_DATA_DIR = originalCaptureDataDir;
		}
		if (originalCaptureMaxPreviewBytes === undefined) {
			delete process.env.HADYANCODE_CAPTURE_MAX_PREVIEW_BYTES;
		} else {
			process.env.HADYANCODE_CAPTURE_MAX_PREVIEW_BYTES =
				originalCaptureMaxPreviewBytes;
		}
		if (originalCaptureCleanup === undefined) {
			delete process.env.HADYANCODE_CAPTURE_CLEANUP;
		} else {
			process.env.HADYANCODE_CAPTURE_CLEANUP = originalCaptureCleanup;
		}
	});

	it("uses the old default output cap when request max tokens are omitted", () => {
		expect(
			resolveGatewayRequestMaxTokens({
				requestedMaxTokens: undefined,
				model: { maxOutputTokens: 202_800, contextWindow: 202_800 },
				estimatedInputTokens: 1_000,
			}),
		).toBe(DEFAULT_GATEWAY_MAX_OUTPUT_TOKENS);
	});

	it("lifts the default output cap above an explicit reasoning budget", () => {
		expect(
			resolveGatewayRequestMaxTokens({
				requestedMaxTokens: undefined,
				reasoningBudgetTokens: 50_000,
				model: { maxOutputTokens: 202_800, contextWindow: 202_800 },
				estimatedInputTokens: 1_000,
				outputReserveTokens: 1_024,
			}),
		).toBe(51_024);

		// Still clamped by the model's max output tokens.
		expect(
			resolveGatewayRequestMaxTokens({
				requestedMaxTokens: undefined,
				reasoningBudgetTokens: 50_000,
				model: { maxOutputTokens: 40_000, contextWindow: 202_800 },
				estimatedInputTokens: 1_000,
			}),
		).toBe(40_000);

		// Explicit request max tokens still win over the reasoning floor.
		expect(
			resolveGatewayRequestMaxTokens({
				requestedMaxTokens: 8_192,
				reasoningBudgetTokens: 50_000,
				model: { maxOutputTokens: 202_800, contextWindow: 202_800 },
				estimatedInputTokens: 1_000,
			}),
		).toBe(8_192);
	});

	it("resolves explicit request max tokens from model and context caps", () => {
		expect(
			resolveGatewayRequestMaxTokens({
				requestedMaxTokens: 8_192,
				model: { maxOutputTokens: 202_800, contextWindow: 202_800 },
				estimatedInputTokens: 1_000,
			}),
		).toBe(8_192);

		expect(
			resolveGatewayRequestMaxTokens({
				requestedMaxTokens: 202_800,
				model: { maxOutputTokens: 202_800, contextWindow: 202_800 },
				estimatedInputTokens: 201_500,
				outputReserveTokens: 1_024,
			}),
		).toBe(276);

		expect(
			resolveGatewayRequestMaxTokens({
				requestedMaxTokens: undefined,
				model: {},
				estimatedInputTokens: 1_000,
			}),
		).toBeUndefined();
	});

	it("does not collapse to one output token when estimated input exceeds context", () => {
		const onContextOverflow = vi.fn();

		expect(
			resolveGatewayRequestMaxTokens({
				requestedMaxTokens: 8_192,
				model: { maxOutputTokens: 202_800, contextWindow: 10_000 },
				estimatedInputTokens: 9_500,
				outputReserveTokens: 1_024,
				onContextOverflow,
			}),
		).toBeUndefined();
		expect(onContextOverflow).toHaveBeenCalledWith({
			contextWindow: 10_000,
			estimatedInputTokens: 9_500,
			reserveTokens: 1_024,
		});
	});

	it("keeps estimating when request tools cannot be JSON stringified", () => {
		const circularTool = {
			name: "large_tool",
			description: "x".repeat(12_000),
		} as Record<string, unknown>;
		circularTool.self = circularTool;

		const estimatedTokens = estimateRequestInputTokens({
			systemPrompt: "system",
			messages: baseMessages,
			tools: [circularTool] as never,
		});

		expect(estimatedTokens).toBeGreaterThan(4_000);
	});

	it("applies the old default output cap when the request omits max tokens", async () => {
		const createProvider = vi.fn(() => ({
			async *stream(request: { maxTokens?: number }) {
				expect(request.maxTokens).toBe(DEFAULT_GATEWAY_MAX_OUTPUT_TOKENS);
				yield { type: "finish", reason: "stop" } satisfies AgentModelEvent;
			},
		}));

		const gateway = createGateway({
			builtins: false,
			providers: [
				{
					manifest: {
						id: "custom-provider",
						name: "CustomProvider",
						defaultModelId: "large-output",
						models: [
							{
								id: "large-output",
								name: "Large Output",
								providerId: "custom-provider",
								contextWindow: 202_800,
								maxInputTokens: 202_800,
								maxOutputTokens: 202_800,
							},
						],
					},
					createProvider,
				},
			],
		});

		await collect(
			await gateway.stream({
				providerId: "custom-provider",
				modelId: "large-output",
				messages: baseMessages,
			}),
		);
	});


	it("translates portable web_search intent into a native provider tool", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{
					type: "tool-call",
					toolCallId: "search_1",
					toolName: "web_search",
					input: { query: "HadyanCode" },
					providerExecuted: true,
				},
				{
					type: "tool-result",
					toolCallId: "search_1",
					toolName: "web_search",
					input: { query: "HadyanCode" },
					output: { results: [] },
					providerExecuted: true,
				},
				{ type: "finish", usage: { inputTokens: 1, outputTokens: 1 } },
			]),
		});
		const gateway = createGateway({
			providerConfigs: [{ providerId: "anthropic", apiKey: "anthropic-key" }],
		});

		const events = await collect(
			await gateway.stream({
				providerId: "anthropic",
				modelId: "claude-sonnet-4-5",
				messages: baseMessages,
				modelTools: [
					{
						name: "web_search",
						maxUses: 3,
						allowedDomains: ["cline.bot"],
					},
				],
			}),
		);
		expect(events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool-call-delta",
					toolCallId: "search_1",
					toolName: "web_search",
					execution: "provider",
				}),
				expect.objectContaining({
					type: "tool-result",
					toolCallId: "search_1",
					output: { results: [] },
					execution: "provider",
				}),
			]),
		);

		expect(nativeWebSearchSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				maxUses: 3,
				allowedDomains: ["cline.bot"],
			}),
		);
		expect(streamTextSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				tools: expect.objectContaining({
					web_search: expect.objectContaining({ type: "provider-tool" }),
				}),
			}),
		);
	});

	it("surfaces provider-executed tool activity as observational events", async () => {
		// Providers like the Claude Code CLI execute their own tools inside the
		// inference request and mark every part providerExecuted. That activity
		// must surface as execution-tagged events (visible in the transcript)
		// without ever entering AgentRuntime's local execution/approval loop.
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{
					type: "tool-call",
					toolCallId: "cli_read_1",
					toolName: "Read",
					input: { file_path: "/tmp/a.txt" },
					providerExecuted: true,
				},
				{
					type: "tool-result",
					toolCallId: "cli_read_1",
					toolName: "Read",
					input: { file_path: "/tmp/a.txt" },
					output: { content: "hello" },
					providerExecuted: true,
				},
				{ type: "text-delta", text: "done" },
				{ type: "finish", finishReason: "stop" },
			]),
		});
		const gateway = createGateway({
			providerConfigs: [{ providerId: "anthropic", apiKey: "anthropic-key" }],
		});

		const events = await collect(
			await gateway.stream({
				providerId: "anthropic",
				modelId: "claude-sonnet-4-5",
				messages: baseMessages,
			}),
		);

		expect(events).toContainEqual(
			expect.objectContaining({
				type: "tool-call-delta",
				toolCallId: "cli_read_1",
				toolName: "Read",
				execution: "provider",
			}),
		);
		expect(events).toContainEqual(
			expect.objectContaining({
				type: "tool-result",
				toolCallId: "cli_read_1",
				toolName: "Read",
				execution: "provider",
				output: { content: "hello" },
			}),
		);
		// Never the runtime-execution path: no execution-less tool events, and
		// the turn finishes as a normal completion, not a tool-call handoff.
		expect(
			events.filter(
				(event) =>
					event.type === "tool-call-delta" && event.execution === undefined,
			),
		).toHaveLength(0);
		expect(events.at(-1)).toEqual({ type: "finish", reason: "stop" });
	});

	it("matches flag-less results and errors to observational provider tool calls by ID", async () => {
		// Some provider packages set providerExecuted only on the call half of
		// the pair. Results and errors are matched by tool-call ID so the
		// activity still completes observationally instead of being dropped or
		// misread as a runtime tool call.
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{
					type: "tool-call",
					toolCallId: "cli_bash_1",
					toolName: "Bash",
					input: { command: "ls" },
					providerExecuted: true,
				},
				{
					type: "tool-result",
					toolCallId: "cli_bash_1",
					toolName: "Bash",
					output: { stdout: "a.txt" },
				},
				{
					type: "tool-call",
					toolCallId: "cli_bash_2",
					toolName: "Bash",
					input: { command: "boom" },
					providerExecuted: true,
				},
				{
					type: "tool-error",
					toolCallId: "cli_bash_2",
					toolName: "Bash",
					error: new Error("command failed"),
				},
				// Deliberately no trailing text: a tool-only stream must still
				// surface the activity and finish cleanly.
				{ type: "finish", finishReason: "stop" },
			]),
		});
		const gateway = createGateway({
			providerConfigs: [{ providerId: "anthropic", apiKey: "anthropic-key" }],
		});

		const events = await collect(
			await gateway.stream({
				providerId: "anthropic",
				modelId: "claude-sonnet-4-5",
				messages: baseMessages,
			}),
		);

		expect(events).toContainEqual(
			expect.objectContaining({
				type: "tool-result",
				toolCallId: "cli_bash_1",
				toolName: "Bash",
				execution: "provider",
				output: { stdout: "a.txt" },
			}),
		);
		expect(events).toContainEqual(
			expect.objectContaining({
				type: "tool-result",
				toolCallId: "cli_bash_2",
				toolName: "Bash",
				execution: "provider",
				isError: true,
				output: { error: "command failed" },
			}),
		);
		expect(events.at(-1)).toEqual({ type: "finish", reason: "stop" });
	});

	it("rejects model tools not declared by the provider manifest", async () => {
		const createProvider = vi.fn(() => ({
			async *stream() {
				yield { type: "finish", reason: "stop" } satisfies AgentModelEvent;
			},
		}));
		const gateway = createGateway({
			builtins: false,
			providers: [
				{
					manifest: {
						id: "custom-provider",
						name: "Custom Provider",
						defaultModelId: "alpha",
						models: [
							{
								id: "alpha",
								name: "Alpha",
								providerId: "custom-provider",
							},
						],
					},
					createProvider,
				},
			],
		});

		await expect(
			gateway.stream({
				providerId: "custom-provider",
				modelId: "alpha",
				messages: baseMessages,
				modelTools: [{ name: "web_search" }],
			}),
		).rejects.toThrow(
			'Provider "custom-provider" model "alpha" does not support model tool(s): web_search.',
		);
		expect(createProvider).not.toHaveBeenCalled();
	});

	it("fails loudly when a declared model tool has no adapter builder", async () => {
		const gateway = createGateway({
			builtins: false,
			providers: [
				{
					manifest: {
						id: "compatible-with-search",
						name: "Compatible With Search",
						defaultModelId: "alpha",
						models: [
							{
								id: "alpha",
								name: "Alpha",
								providerId: "compatible-with-search",
							},
						],
						modelToolCapabilities: [{ name: "web_search" }],
					},
					defaults: {
						apiKey: "test-key",
						baseUrl: "https://example.com/v1",
					},
					createProvider: createOpenAICompatibleProvider,
				},
			],
		});

		const events = await collect(
			await gateway.stream({
				providerId: "compatible-with-search",
				modelId: "alpha",
				messages: baseMessages,
				modelTools: [{ name: "web_search" }],
			}),
		);

		expect(events).toContainEqual(
			expect.objectContaining({
				type: "finish",
				reason: "error",
				error:
					'Provider adapter for "compatible-with-search" does not implement requested model tool(s): web_search.',
			}),
		);
		expect(streamTextSpy).not.toHaveBeenCalled();
	});

	it("keeps custom provider loading lazy until first use", async () => {
		const createProvider = vi.fn(() => ({
			async *stream() {
				yield { type: "text-delta", text: "lazy" } satisfies AgentModelEvent;
				yield { type: "finish", reason: "stop" } satisfies AgentModelEvent;
			},
		}));
		const loadProvider = vi.fn(async () => ({ createProvider }));
		const gateway = createGateway({
			builtins: false,
			providers: [
				{
					manifest: {
						id: "custom",
						name: "Custom",
						defaultModelId: "alpha",
						models: [{ id: "alpha", name: "Alpha", providerId: "custom" }],
					},
					loadProvider,
				},
			],
		});

		expect(loadProvider).not.toHaveBeenCalled();
		const events = await collect(
			await gateway.stream({
				providerId: "custom",
				modelId: "alpha",
				messages: baseMessages,
			}),
		);

		expect(loadProvider).toHaveBeenCalledOnce();
		expect(createProvider).toHaveBeenCalledOnce();
		expect(events).toContainEqual({ type: "text-delta", text: "lazy" });
	});

	it("passes generated assistant images to the next vision request as user image input", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{ type: "finish", usage: { inputTokens: 1, outputTokens: 1 } },
			]),
		});

		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "anthropic",
					apiKey: "test",
				},
			],
		});

		await collect(
			await gateway.stream({
				providerId: "anthropic",
				modelId: "claude-haiku-latest",
				messages: [
					{
						id: "user_1",
						role: "user",
						content: [{ type: "text", text: "Generate a picture" }],
						createdAt: 1,
					},
					{
						id: "assistant_1",
						role: "assistant",
						content: [
							{
								type: "image",
								mediaType: "image/jpeg",
								image: "aGVsbG8=",
							},
						],
						createdAt: 2,
					},
					{
						id: "user_2",
						role: "user",
						content: [{ type: "text", text: "Tell me about the image" }],
						createdAt: 3,
					},
				],
			}),
		);

		const call = streamTextSpy.mock.calls.at(-1)?.[0] as {
			messages?: Array<Record<string, unknown>>;
		};
		expect(call.messages?.[1]).toEqual({
			role: "assistant",
			content: [{ type: "text", text: "[generated image]" }],
		});
		expect(call.messages?.[2]).toEqual(
			expect.objectContaining({
				role: "user",
				content: expect.arrayContaining([
					expect.objectContaining({
						type: "text",
						text: "Tell me about the image",
					}),
					{
						type: "file",
						data: "aGVsbG8=",
						mediaType: "image/jpeg",
					},
				]),
			}),
		);
	});

	describe("image capability gating", () => {
		// Simulates a "wedged" history: an image entered the conversation at
		// message N (user attachment + a tool result carrying an image), and
		// every request built after that must stay valid for the target model.
		const imageBase64 = Buffer.alloc(24, 7).toString("base64");
		const imageHistory: AgentMessage[] = [
			{
				id: "user_1",
				role: "user",
				content: [{ type: "text", text: "Hello" }],
				createdAt: Date.now(),
			},
			{
				id: "user_2",
				role: "user",
				content: [
					{ type: "text", text: "see this screenshot" },
					{
						type: "image",
						image: `data:image/png;base64,${imageBase64}`,
						mediaType: "image/png",
					},
				],
				createdAt: Date.now(),
			},
			{
				id: "assistant_1",
				role: "assistant",
				content: [
					{
						type: "tool-call",
						toolCallId: "call_img",
						toolName: "read_file",
						input: { path: "/tmp/image.png" },
					},
				],
				createdAt: Date.now(),
			},
			{
				id: "user_3",
				role: "user",
				content: [
					{
						type: "tool-result",
						toolCallId: "call_img",
						toolName: "read_file",
						output: [
							{ type: "text", text: "Successfully read image" },
							{ type: "image", data: imageBase64, mediaType: "image/png" },
						],
					},
				],
				createdAt: Date.now(),
			},
			{
				id: "user_4",
				role: "user",
				content: [{ type: "text", text: "continue" }],
				createdAt: Date.now(),
			},
		];

		it("substitutes image content with placeholder text for models without image input", async () => {
			mockSuccessfulStream();

			const gateway = createGateway({
				providerConfigs: [
					{
						providerId: "deepseek",
						apiKey: "deepseek-key",
						models: [
							{
								id: "deepseek-text-only",
								name: "DeepSeek Text Only",
								// Advertises no "images" capability.
								capabilities: ["text"],
							},
						],
					},
				],
			});

			await collect(
				await gateway.stream({
					providerId: "deepseek",
					modelId: "deepseek-text-only",
					messages: imageHistory,
				}),
			);

			const call = streamTextSpy.mock.calls.at(-1)?.[0] as
				| { messages?: unknown }
				| undefined;
			const serialized = JSON.stringify(call?.messages);
			expect(serialized).toContain(IMAGE_UNSUPPORTED_PLACEHOLDER);
			expect(serialized).not.toContain(imageBase64);
			expect(serialized).not.toContain('"type":"image"');
			expect(serialized).not.toContain('"type":"image-data"');
		});

		it("keeps image content for models that advertise image input", async () => {
			mockSuccessfulStream();

			const gateway = createGateway({
				providerConfigs: [
					{
						providerId: "deepseek",
						apiKey: "deepseek-key",
						models: [
							{
								id: "deepseek-vision",
								name: "DeepSeek Vision",
								capabilities: ["text", "images"],
							},
						],
					},
				],
			});

			await collect(
				await gateway.stream({
					providerId: "deepseek",
					modelId: "deepseek-vision",
					messages: imageHistory,
				}),
			);

			const call = streamTextSpy.mock.calls.at(-1)?.[0] as
				| { messages?: unknown }
				| undefined;
			const serialized = JSON.stringify(call?.messages);
			expect(serialized).toContain(imageBase64);
			expect(serialized).not.toContain(IMAGE_UNSUPPORTED_PLACEHOLDER);
		});

		it("keeps image content for models with no capability data (fail open)", async () => {
			mockSuccessfulStream();

			const gateway = createGateway({
				providerConfigs: [{ providerId: "deepseek", apiKey: "deepseek-key" }],
			});

			await collect(
				await gateway.stream({
					providerId: "deepseek",
					// Not in the catalog: resolves to an unregistered model
					// definition without capability data.
					modelId: "some-unknown-model",
					messages: imageHistory,
				}),
			);

			const call = streamTextSpy.mock.calls.at(-1)?.[0] as
				| { messages?: unknown }
				| undefined;
			const serialized = JSON.stringify(call?.messages);
			expect(serialized).toContain(imageBase64);
			expect(serialized).not.toContain(IMAGE_UNSUPPORTED_PLACEHOLDER);
		});
	});

	it("reads Anthropic cache usage from provider metadata", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{
					type: "finish",
					finishReason: "tool-calls",
					usage: {
						prompt_tokens: 10091,
						completion_tokens: 87,
						cache_creation_input_tokens: 2770,
					},
					providerMetadata: {
						anthropic: {
							usage: {
								input_tokens: 3,
								output_tokens: 87,
								cache_creation_input_tokens: 2770,
								cache_read_input_tokens: 7318,
							},
						},
					},
				},
			]),
		});

		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "anthropic",
					apiKey: "anthropic-key",
				},
			],
		});

		const events = await collect(
			await gateway.stream({
				providerId: "anthropic",
				modelId: "claude-sonnet-4-5",
				messages: baseMessages,
			}),
		);

		expect(events).toContainEqual({
			type: "usage",
			usage: expect.objectContaining({
				inputTokens: 10091,
				outputTokens: 87,
				cacheReadTokens: 7318,
				cacheWriteTokens: 2770,
			}),
		});
		expect(events.at(-1)).toEqual({ type: "finish", reason: "tool-calls" });
	});

	it("reads cache usage from nested prompt token details", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{
					type: "finish",
					usage: {
						prompt_tokens: 9125,
						completion_tokens: 96,
						prompt_tokens_details: {
							cached_tokens: 8885,
						},
						cache_creation_input_tokens: 237,
					},
				},
			]),
		});

		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "anthropic",
					apiKey: "anthropic-key",
				},
			],
		});

		const events = await collect(
			await gateway.stream({
				providerId: "anthropic",
				modelId: "claude-sonnet-4-5",
				messages: baseMessages,
			}),
		);

		expect(events).toContainEqual({
			type: "usage",
			usage: expect.objectContaining({
				inputTokens: 9125,
				outputTokens: 96,
				cacheReadTokens: 8885,
				cacheWriteTokens: 237,
			}),
		});
		expect(events.at(-1)).toEqual({ type: "finish", reason: "stop" });
	});

	it("prefers LanguageModelUsage inputTokenDetails cache reads", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{
					type: "finish",
					usage: {
						inputTokens: 50,
						outputTokens: 10,
						inputTokenDetails: {
							cacheReadTokens: 12,
						},
						cachedInputTokens: 4,
					},
				},
			]),
		});

		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "anthropic",
					apiKey: "anthropic-key",
				},
			],
		});

		const events = await collect(
			await gateway.stream({
				providerId: "anthropic",
				modelId: "claude-sonnet-4-5",
				messages: baseMessages,
			}),
		);

		expect(events).toContainEqual({
			type: "usage",
			usage: expect.objectContaining({
				inputTokens: 50,
				outputTokens: 10,
				cacheReadTokens: 12,
				cacheWriteTokens: 0,
			}),
		});
	});

	it("formats assistant tool calls and tool results into valid AI SDK messages", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{ type: "text-delta", textDelta: "done" },
				{ type: "finish", usage: { inputTokens: 1, outputTokens: 1 } },
			]),
		});

		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "anthropic",
					apiKey: "anthropic-key",
				},
			],
		});

		await collect(
			await gateway.stream({
				providerId: "anthropic",
				modelId: "claude-sonnet-4-5",
				messages: [
					{
						id: "user_1",
						role: "user",
						content: [{ type: "text", text: "hey" }],
						createdAt: Date.now(),
					},
					{
						id: "assistant_1",
						role: "assistant",
						content: [
							{ type: "text", text: "Let me inspect that." },
							{
								type: "tool-call",
								toolCallId: "call_1",
								toolName: "run_commands",
								input: { commands: ["pwd"] },
							},
						],
						createdAt: Date.now(),
					},
					{
						id: "user_2",
						role: "user",
						content: [
							{
								type: "tool-result",
								toolCallId: "call_1",
								toolName: "run_commands",
								output: { ok: true },
							},
						],
						createdAt: Date.now(),
					},
				],
				tools: [
					{
						name: "run_commands",
						description: "Runs shell commands",
						inputSchema: { type: "object" },
					},
				],
			}),
		);

		expect(streamTextSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				messages: [
					expect.objectContaining({
						role: "user",
						content: expect.arrayContaining([
							expect.objectContaining({ type: "text", text: "hey" }),
						]),
					}),
					{
						role: "assistant",
						content: [
							{ type: "text", text: "Let me inspect that." },
							{
								type: "tool-call",
								toolCallId: "call_1",
								toolName: "run_commands",
								input: { commands: ["pwd"] },
							},
						],
					},
					{
						role: "tool",
						content: [
							{
								type: "tool-result",
								toolCallId: "call_1",
								toolName: "run_commands",
								output: { type: "json", value: { ok: true } },
							},
						],
					},
				],
				tools: expect.objectContaining({
					run_commands: expect.not.objectContaining({
						providerOptions: expect.anything(),
					}),
				}),
			}),
		);
	});

	it("does not pass extra tools to the Claude Code provider", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{ type: "finish", usage: { inputTokens: 1, outputTokens: 1 } },
			]),
		});

		const gateway = createGateway({
			providerConfigs: [{ providerId: "claude-code" }],
		});

		await collect(
			await gateway.stream({
				providerId: "claude-code",
				modelId: "sonnet",
				messages: baseMessages,
				tools: [
					{
						name: "run_commands",
						description: "Runs shell commands",
						inputSchema: { type: "object" },
					},
				],
			}),
		);

		const streamTextOptions = streamTextSpy.mock.calls.at(-1)?.[0];
		expect(streamTextOptions).not.toHaveProperty("tools");
	});

	it("anchors the Claude Code session on workspace cwd, user settings, and auto-accepted edits", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{ type: "finish", usage: { inputTokens: 1, outputTokens: 1 } },
			]),
		});
		claudeCodeFactorySpy.mockClear();

		const workspaceDir = mkdtempSync(join(tmpdir(), "claude-code-cwd-"));
		const gateway = createGateway({
			providerConfigs: [
				{ providerId: "claude-code", options: { cwd: workspaceDir } },
			],
		});

		await collect(
			await gateway.stream({
				providerId: "claude-code",
				modelId: "sonnet",
				messages: baseMessages,
			}),
		);

		expect(claudeCodeFactorySpy).toHaveBeenCalledWith(
			expect.objectContaining({
				defaultSettings: expect.objectContaining({
					cwd: workspaceDir,
					settingSources: ["user", "project"],
					permissionMode: "acceptEdits",
				}),
			}),
		);
		// The host-forwarded top-level cwd is lifted into defaultSettings, not
		// leaked as a provider option.
		expect(claudeCodeFactorySpy.mock.calls.at(-1)?.[0]).not.toHaveProperty(
			"cwd",
		);
	});

	it("preserves explicit Claude Code session settings over the gateway defaults", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{ type: "finish", usage: { inputTokens: 1, outputTokens: 1 } },
			]),
		});
		claudeCodeFactorySpy.mockClear();

		const workspaceDir = mkdtempSync(join(tmpdir(), "claude-code-cwd-"));
		const explicitDir = mkdtempSync(join(tmpdir(), "claude-code-explicit-"));
		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "claude-code",
					options: {
						cwd: workspaceDir,
						defaultSettings: {
							cwd: explicitDir,
							settingSources: [],
							permissionMode: "default",
						},
					},
				},
			],
		});

		await collect(
			await gateway.stream({
				providerId: "claude-code",
				modelId: "sonnet",
				messages: baseMessages,
			}),
		);

		expect(claudeCodeFactorySpy).toHaveBeenCalledWith(
			expect.objectContaining({
				defaultSettings: expect.objectContaining({
					cwd: explicitDir,
					settingSources: [],
					permissionMode: "default",
				}),
			}),
		);
	});

	it("drops a non-existent workspace cwd instead of failing Claude Code settings validation", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{ type: "finish", usage: { inputTokens: 1, outputTokens: 1 } },
			]),
		});
		claudeCodeFactorySpy.mockClear();

		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "claude-code",
					options: { cwd: "/nonexistent/workspace/path" },
				},
			],
		});

		await collect(
			await gateway.stream({
				providerId: "claude-code",
				modelId: "sonnet",
				messages: baseMessages,
			}),
		);

		const factoryOptions = claudeCodeFactorySpy.mock.calls.at(-1)?.[0] as {
			defaultSettings?: Record<string, unknown>;
		};
		expect(factoryOptions.defaultSettings).not.toHaveProperty("cwd");
	});

	it("passes reasoning effort through the AI SDK top-level option", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{ type: "finish", usage: { inputTokens: 1, outputTokens: 1 } },
			]),
		});

		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "anthropic",
					apiKey: "anthropic-key",
					models: [
						{
							id: "claude-sonnet-4-5",
							name: "Claude Sonnet 4.5",
							metadata: {
								family: "claude-sonnet",
							},
						},
					],
				},
			],
		});

		await collect(
			await gateway.stream({
				providerId: "anthropic",
				modelId: "claude-sonnet-4-5",
				messages: baseMessages,
				reasoning: {
					effort: "high",
				},
			}),
		);

		expect(streamTextSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				reasoning: "high",
			}),
		);
		const call = streamTextSpy.mock.calls.at(-1)?.[0];
		expect(call?.providerOptions?.anthropic).not.toHaveProperty("thinking");
	});

	it("does not enable adaptive thinking for Anthropic when reasoning is not requested", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{ type: "finish", usage: { inputTokens: 1, outputTokens: 1 } },
			]),
		});

		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "anthropic",
					apiKey: "anthropic-key",
				},
			],
		});

		await collect(
			await gateway.stream({
				providerId: "anthropic",
				modelId: "claude-sonnet-4-5",
				messages: baseMessages,
			}),
		);

		expect(streamTextSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				providerOptions: expect.objectContaining({
					anthropic: expect.not.objectContaining({
						thinking: { type: "adaptive" },
					}),
				}),
			}),
		);
	});

	it("does not apply anthropic prompt-cache shaping for non-remapped providers", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{ type: "finish", usage: { inputTokens: 1, outputTokens: 1 } },
			]),
		});

		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "deepseek",
					apiKey: "deepseek-key",
					models: [
						{
							id: "deepseek-claude-alias",
							name: "DeepSeek Claude Alias",
							metadata: {
								family: "claude-sonnet",
							},
						},
					],
				},
			],
		});

		await collect(
			await gateway.stream({
				providerId: "deepseek",
				modelId: "deepseek-claude-alias",
				messages: baseMessages,
				reasoning: {
					enabled: true,
					effort: "high",
				},
			}),
		);

		expect(streamTextSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				messages: [
					{ role: "user", content: [{ type: "text", text: "Hello" }] },
				],
				providerOptions: expect.objectContaining({
					openaiCompatible: expect.not.objectContaining({
						cache_control: { type: "ephemeral" },
					}),
					deepseek: expect.not.objectContaining({
						cache_control: { type: "ephemeral" },
					}),
					anthropic: expect.not.objectContaining({
						cache_control: { type: "ephemeral" },
					}),
				}),
			}),
		);
	});

	it("applies anthropic prompt-cache shaping for direct anthropic provider", async () => {
		streamTextSpy.mockReturnValue({
			fullStream: makeStreamParts([
				{ type: "finish", usage: { inputTokens: 1, outputTokens: 1 } },
			]),
		});

		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "anthropic",
					apiKey: "anthropic-key",
					models: [
						{
							id: "claude-sonnet-4-6",
							name: "Claude Sonnet 4.6",
							metadata: {
								family: "claude-sonnet",
							},
						},
					],
				},
			],
		});

		await collect(
			await gateway.stream({
				providerId: "anthropic",
				modelId: "claude-sonnet-4-6",
				messages: baseMessages,
			}),
		);

		expect(streamTextSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				messages: [
					expect.objectContaining({
						role: "user",
						content: expect.arrayContaining([
							expect.objectContaining({
								type: "text",
								text: "Hello",
								providerOptions: expect.objectContaining({
									anthropic: expect.objectContaining({
										cache_control: { type: "ephemeral" },
									}),
									openaiCompatible: expect.objectContaining({
										cache_control: { type: "ephemeral" },
									}),
								}),
							}),
						]),
					}),
				],
				providerOptions: expect.objectContaining({
					anthropic: expect.objectContaining({
						cache_control: { type: "ephemeral" },
					}),
				}),
			}),
		);
	});



	it("forwards a per-provider fetch through to the provider config", async () => {
		const customFetch = vi.fn() as unknown as typeof fetch;
		const createProvider = vi.fn((config: { fetch?: typeof fetch }) => ({
			async *stream() {
				expect(config.fetch).toBe(customFetch);
				yield { type: "text-delta", text: "ok" } satisfies AgentModelEvent;
				yield { type: "finish", reason: "stop" } satisfies AgentModelEvent;
			},
		}));

		const gateway = createGateway({
			builtins: false,
			providers: [
				{
					manifest: {
						id: "custom-fetch",
						name: "CustomFetch",
						defaultModelId: "alpha",
						models: [
							{ id: "alpha", name: "Alpha", providerId: "custom-fetch" },
						],
					},
					createProvider,
				},
			],
			providerConfigs: [{ providerId: "custom-fetch", fetch: customFetch }],
		});

		await collect(
			await gateway.stream({
				providerId: "custom-fetch",
				modelId: "alpha",
				messages: baseMessages,
			}),
		);

		expect(createProvider).toHaveBeenCalledOnce();
	});

	it("falls back to the top-level gateway fetch when no provider fetch is set", async () => {
		const fallbackFetch = vi.fn() as unknown as typeof fetch;
		const createProvider = vi.fn((config: { fetch?: typeof fetch }) => ({
			async *stream() {
				expect(config.fetch).toBe(fallbackFetch);
				yield { type: "text-delta", text: "ok" } satisfies AgentModelEvent;
				yield { type: "finish", reason: "stop" } satisfies AgentModelEvent;
			},
		}));

		const gateway = createGateway({
			builtins: false,
			fetch: fallbackFetch,
			providers: [
				{
					manifest: {
						id: "custom-fetch-fallback",
						name: "CustomFetchFallback",
						defaultModelId: "alpha",
						models: [
							{
								id: "alpha",
								name: "Alpha",
								providerId: "custom-fetch-fallback",
							},
						],
					},
					createProvider,
				},
			],
		});

		await collect(
			await gateway.stream({
				providerId: "custom-fetch-fallback",
				modelId: "alpha",
				messages: baseMessages,
			}),
		);

		expect(createProvider).toHaveBeenCalledOnce();
	});
});
