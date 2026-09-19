import type {
	AgentExtensionAutomationContext,
	AgentResult,
	AutomationEventEnvelope,
	BasicLogger,
	ChatRunTurnRequest,
	ChatStartSessionRequest,
	ChatTurnResult,
	ExtensionContext,
	ITelemetryService,
} from "@hadyancode/shared";
import type { CronEventIngressResult } from "../cron/events/cron-event-ingress";
import type { CronService } from "../cron/service/cron-service";
import type { HubScheduleRuntimeHandlers } from "../cron/service/schedule-service";
import type { RuntimeHost } from "../runtime/host/runtime-host";
import { normalizeProviderId } from "../services/llms/provider-settings";
import {
	resolveClientSessionSource,
	withSessionHistoryOriginMetadata,
} from "../session/history-origin";
import { SessionSource } from "../types/common";
import type {
	HadyanCodeAutomationEventIngressResult,
	HadyanCodeAutomationEventLog,
	HadyanCodeAutomationListEventsOptions,
	HadyanCodeAutomationListRunsOptions,
	HadyanCodeAutomationListSpecsOptions,
	HadyanCodeAutomationRun,
	HadyanCodeAutomationSpec,
	HadyanCodeCoreAutomationApi,
	HadyanCodeCoreAutomationOptions,
} from "./types";

export function normalizeAutomationOptions(
	options: HadyanCodeCoreAutomationOptions | boolean | undefined,
): HadyanCodeCoreAutomationOptions | undefined {
	if (options === true) return {};
	if (!options) return undefined;
	return options;
}

export function normalizeAutomationCronScope(
	scope: HadyanCodeCoreAutomationOptions["cronScope"],
): "global" | "workspace" | undefined {
	if (scope === "user") return "global";
	return scope;
}

export class HadyanCodeCoreAutomationController implements HadyanCodeCoreAutomationApi {
	constructor(private readonly getService: () => CronService) {}

	async start(): Promise<void> {
		await this.getService().start();
	}

	async stop(): Promise<void> {
		await this.getService().stop();
	}

	async reconcileNow(): Promise<void> {
		await this.getService().reconcileNow();
	}

	ingestEvent(
		event: AutomationEventEnvelope,
	): HadyanCodeAutomationEventIngressResult {
		const result: CronEventIngressResult = this.getService().ingestEvent(event);
		return {
			event: result.event,
			duplicate: result.duplicate,
			matchedSpecIds: result.matchedSpecs.map((spec) => spec.specId),
			queuedRuns: result.queuedRuns,
			suppressions: result.suppressions,
		};
	}

	listEvents(
		options?: HadyanCodeAutomationListEventsOptions,
	): HadyanCodeAutomationEventLog[] {
		return this.getService().listEventLogs(options);
	}

	getEvent(eventId: string): HadyanCodeAutomationEventLog | undefined {
		return this.getService().getEventLog(eventId);
	}

	listSpecs(options?: HadyanCodeAutomationListSpecsOptions): HadyanCodeAutomationSpec[] {
		return this.getService().listSpecs(options);
	}

	listRuns(options?: HadyanCodeAutomationListRunsOptions): HadyanCodeAutomationRun[] {
		return this.getService().listRuns(options);
	}
}

export interface HadyanCodeCoreAutomationRuntimeHandlersInput {
	host: RuntimeHost;
	getExtensionContext(): ExtensionContext | undefined;
}

export function createHadyanCodeCoreAutomationRuntimeHandlers(
	input: HadyanCodeCoreAutomationRuntimeHandlersInput,
): HubScheduleRuntimeHandlers {
	const { host } = input;
	return {
		async startSession(request, options) {
			const cwd = (request.cwd?.trim() || request.workspaceRoot).trim();
			const extensionContext = input.getExtensionContext();
			const started = await host.startSession({
				source:
					resolveClientSessionSource(extensionContext?.client) ??
					SessionSource.CORE,
				mode: "automation",
				// Record the spec-defined trigger source (e.g. "hub-schedule"
				// or a custom label from spec frontmatter) as provenance; the
				// top-level `source` is reserved for the client surface.
				sessionMetadata: withSessionHistoryOriginMetadata(
					options?.sessionMetadata,
					{
						mode: "automation",
						trigger: request.source,
					},
				),
				interactive: false,
				config: {
					providerId: normalizeProviderId(request.provider),
					modelId: request.model,
					apiKey: request.apiKey?.trim() || undefined,
					cwd,
					workspaceRoot: request.workspaceRoot,
					systemPrompt: request.systemPrompt ?? "",
					mode: resolveMode(request),
					maxIterations: request.maxIterations,
					enableTools: request.enableTools !== false,
					enableSpawnAgent: request.enableSpawn !== false,
					enableAgentTeams: request.enableTeams !== false,
					disableMcpSettingsTools: request.disableMcpSettingsTools,
					agentPluginPaths: request.agentPluginPaths,
					missionLogIntervalSteps: request.missionStepInterval,
					missionLogIntervalMs: request.missionTimeIntervalMs,
				},
				toolPolicies: request.toolPolicies ?? {
					"*": {
						autoApprove: request.autoApproveTools !== false,
					},
				},
				localRuntime: {
					extensionContext,
					configExtensions: request.configExtensions,
				},
			});
			return {
				sessionId: started.sessionId,
				startResult: {
					sessionId: started.sessionId,
					manifestPath: started.manifestPath,
					messagesPath: started.messagesPath,
				},
			};
		},
		async sendSession(sessionId, request) {
			const result = await host.runTurn({
				sessionId,
				prompt: request.prompt,
				userImages: request.attachments?.userImages,
				userFiles: request.attachments?.userFiles?.map((file) => file.content),
				delivery: request.delivery,
			});
			if (!result) {
				throw new Error("HadyanCodeCore automation runtime returned no result");
			}
			return { result: toChatTurnResult(result) };
		},
		async abortSession(sessionId) {
			await host.abort(sessionId, new Error("HadyanCodeCore automation abort"));
			return { applied: true };
		},
		async stopSession(sessionId) {
			await host.stopSession(sessionId);
			return { applied: true };
		},
	};
}

export interface HadyanCodeCoreAutomationExtensionContextInput {
	automationService?: CronService;
	automation: HadyanCodeCoreAutomationApi;
	context?: ExtensionContext;
	clientName?: string;
	distinctId?: string;
	logger?: BasicLogger;
	telemetry?: ITelemetryService;
}

export function createHadyanCodeCoreAutomationExtensionContext(
	input: HadyanCodeCoreAutomationExtensionContextInput,
): ExtensionContext | undefined {
	const automation = createAutomationPluginContext(
		input.automationService,
		input.automation,
	);
	const client =
		input.context?.client ??
		(input.clientName ? { name: input.clientName } : undefined);
	const user =
		input.context?.user ??
		(input.distinctId ? { distinctId: input.distinctId } : undefined);
	const logger = input.context?.logger ?? input.logger;
	const telemetry = input.context?.telemetry ?? input.telemetry;
	if (!automation && !client && !user && !logger && !telemetry) {
		return input.context;
	}
	return {
		...(input.context ?? {}),
		...(client ? { client } : {}),
		...(user ? { user } : {}),
		...(logger ? { logger } : {}),
		...(telemetry ? { telemetry } : {}),
		...(automation ? { automation } : {}),
	};
}

function createAutomationPluginContext(
	automationService: CronService | undefined,
	automation: HadyanCodeCoreAutomationApi,
): AgentExtensionAutomationContext | undefined {
	if (!automationService) {
		return undefined;
	}
	return {
		ingestEvent: (event: AutomationEventEnvelope) => {
			automation.ingestEvent(event);
		},
	};
}

function toChatTurnResult(result: AgentResult): ChatTurnResult {
	return {
		text: result.text,
		usage: {
			inputTokens: result.usage.inputTokens,
			outputTokens: result.usage.outputTokens,
			cacheReadTokens: result.usage.cacheReadTokens,
			cacheWriteTokens: result.usage.cacheWriteTokens,
			totalCost: result.usage.totalCost,
		},
		inputTokens: result.usage.inputTokens,
		outputTokens: result.usage.outputTokens,
		iterations: result.iterations,
		finishReason: result.finishReason,
		toolCalls: result.toolCalls.map((call) => ({
			name: call.name,
			input: call.input,
			output: call.output,
			error: call.error,
			durationMs: call.durationMs,
		})),
	};
}

function resolveMode(
	request: ChatStartSessionRequest | ChatRunTurnRequest["config"],
): "act" | "plan" | "yolo" {
	return request.mode === "plan"
		? "plan"
		: request.mode === "yolo"
			? "yolo"
			: "act";
}
