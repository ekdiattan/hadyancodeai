import {
	HadyanCodeAsk as AppHadyanCodeAsk,
	HadyanCodeMessage as AppHadyanCodeMessage,
	HadyanCodeSay as AppHadyanCodeSay,
} from "@shared/ExtensionMessage"
import {
	HadyanCodeAsk,
	HadyanCodeMessageType,
	HadyanCodeSay,
	HadyanCodeMessage as ProtoHadyanCodeMessage,
} from "@shared/proto/hadyancode/ui"

// Helper function to convert HadyanCodeAsk string to enum
function convertHadyanCodeAskToProtoEnum(ask: AppHadyanCodeAsk | undefined): HadyanCodeAsk | undefined {
	if (!ask) {
		return undefined
	}

	const mapping: Record<AppHadyanCodeAsk, HadyanCodeAsk> = {
		followup: HadyanCodeAsk.FOLLOWUP,
		plan_mode_respond: HadyanCodeAsk.PLAN_MODE_RESPOND,
		act_mode_respond: HadyanCodeAsk.ACT_MODE_RESPOND,
		command: HadyanCodeAsk.COMMAND,
		command_output: HadyanCodeAsk.COMMAND_OUTPUT,
		completion_result: HadyanCodeAsk.COMPLETION_RESULT,
		tool: HadyanCodeAsk.TOOL,
		api_req_failed: HadyanCodeAsk.API_REQ_FAILED,
		resume_task: HadyanCodeAsk.RESUME_TASK,
		resume_completed_task: HadyanCodeAsk.RESUME_COMPLETED_TASK,
		mistake_limit_reached: HadyanCodeAsk.MISTAKE_LIMIT_REACHED,
		browser_action_launch: HadyanCodeAsk.BROWSER_ACTION_LAUNCH,
		use_mcp_server: HadyanCodeAsk.USE_MCP_SERVER,
		new_task: HadyanCodeAsk.NEW_TASK,
		condense: HadyanCodeAsk.CONDENSE,
		summarize_task: HadyanCodeAsk.SUMMARIZE_TASK,
		report_bug: HadyanCodeAsk.REPORT_BUG,
		use_subagents: HadyanCodeAsk.USE_SUBAGENTS,
	}

	const result = mapping[ask]
	if (result === undefined) {
	}
	return result
}

// Helper function to convert HadyanCodeAsk enum to string
function convertProtoEnumToHadyanCodeAsk(ask: HadyanCodeAsk): AppHadyanCodeAsk | undefined {
	if (ask === HadyanCodeAsk.UNRECOGNIZED) {
		return undefined
	}

	const mapping: Record<Exclude<HadyanCodeAsk, HadyanCodeAsk.UNRECOGNIZED>, AppHadyanCodeAsk> = {
		[HadyanCodeAsk.FOLLOWUP]: "followup",
		[HadyanCodeAsk.PLAN_MODE_RESPOND]: "plan_mode_respond",
		[HadyanCodeAsk.ACT_MODE_RESPOND]: "act_mode_respond",
		[HadyanCodeAsk.COMMAND]: "command",
		[HadyanCodeAsk.COMMAND_OUTPUT]: "command_output",
		[HadyanCodeAsk.COMPLETION_RESULT]: "completion_result",
		[HadyanCodeAsk.TOOL]: "tool",
		[HadyanCodeAsk.API_REQ_FAILED]: "api_req_failed",
		[HadyanCodeAsk.RESUME_TASK]: "resume_task",
		[HadyanCodeAsk.RESUME_COMPLETED_TASK]: "resume_completed_task",
		[HadyanCodeAsk.MISTAKE_LIMIT_REACHED]: "mistake_limit_reached",
		[HadyanCodeAsk.BROWSER_ACTION_LAUNCH]: "browser_action_launch",
		[HadyanCodeAsk.USE_MCP_SERVER]: "use_mcp_server",
		[HadyanCodeAsk.NEW_TASK]: "new_task",
		[HadyanCodeAsk.CONDENSE]: "condense",
		[HadyanCodeAsk.SUMMARIZE_TASK]: "summarize_task",
		[HadyanCodeAsk.REPORT_BUG]: "report_bug",
		[HadyanCodeAsk.USE_SUBAGENTS]: "use_subagents",
	}

	return mapping[ask]
}

// Helper function to convert HadyanCodeSay string to enum
function convertHadyanCodeSayToProtoEnum(say: AppHadyanCodeSay | undefined): HadyanCodeSay | undefined {
	if (!say) {
		return undefined
	}

	const mapping: Record<AppHadyanCodeSay, HadyanCodeSay> = {
		task: HadyanCodeSay.TASK,
		error: HadyanCodeSay.ERROR,
		api_req_started: HadyanCodeSay.API_REQ_STARTED,
		api_req_finished: HadyanCodeSay.API_REQ_FINISHED,
		text: HadyanCodeSay.TEXT,
		reasoning: HadyanCodeSay.REASONING,
		completion_result: HadyanCodeSay.COMPLETION_RESULT_SAY,
		plan_completion_result: HadyanCodeSay.PLAN_COMPLETION_RESULT,
		user_feedback: HadyanCodeSay.USER_FEEDBACK,
		user_feedback_diff: HadyanCodeSay.USER_FEEDBACK_DIFF,
		command: HadyanCodeSay.COMMAND_SAY,
		command_output: HadyanCodeSay.COMMAND_OUTPUT_SAY,
		tool: HadyanCodeSay.TOOL_SAY,
		shell_integration_warning: HadyanCodeSay.SHELL_INTEGRATION_WARNING,
		shell_integration_warning_with_suggestion: HadyanCodeSay.SHELL_INTEGRATION_WARNING,
		browser_action_launch: HadyanCodeSay.BROWSER_ACTION_LAUNCH_SAY,
		browser_action: HadyanCodeSay.BROWSER_ACTION,
		browser_action_result: HadyanCodeSay.BROWSER_ACTION_RESULT,
		mcp_server_request_started: HadyanCodeSay.MCP_SERVER_REQUEST_STARTED,
		mcp_server_response: HadyanCodeSay.MCP_SERVER_RESPONSE,
		mcp_notification: HadyanCodeSay.MCP_NOTIFICATION,
		use_mcp_server: HadyanCodeSay.USE_MCP_SERVER_SAY,
		diff_error: HadyanCodeSay.DIFF_ERROR,
		deleted_api_reqs: HadyanCodeSay.DELETED_API_REQS,
		hadyancodeignore_error: HadyanCodeSay.HADYANCODEIGNORE_ERROR,
		command_permission_denied: HadyanCodeSay.COMMAND_PERMISSION_DENIED,
		checkpoint_created: HadyanCodeSay.CHECKPOINT_CREATED,
		load_mcp_documentation: HadyanCodeSay.LOAD_MCP_DOCUMENTATION,
		info: HadyanCodeSay.INFO,
		task_progress: HadyanCodeSay.TASK_PROGRESS,
		hook_status: HadyanCodeSay.HOOK_STATUS,
		hook_output_stream: HadyanCodeSay.HOOK_OUTPUT_STREAM,
		conditional_rules_applied: HadyanCodeSay.CONDITIONAL_RULES_APPLIED,
		subagent: HadyanCodeSay.SUBAGENT_STATUS,
		use_subagents: HadyanCodeSay.USE_SUBAGENTS_SAY,
		subagent_usage: HadyanCodeSay.SUBAGENT_USAGE,
		compaction: HadyanCodeSay.COMPACTION,
	}

	const result = mapping[say]

	return result
}

// Helper function to convert HadyanCodeSay enum to string
function convertProtoEnumToHadyanCodeSay(say: HadyanCodeSay): AppHadyanCodeSay | undefined {
	if (say === HadyanCodeSay.UNRECOGNIZED) {
		return undefined
	}

	const mapping: Record<Exclude<HadyanCodeSay, HadyanCodeSay.UNRECOGNIZED>, AppHadyanCodeSay> = {
		[HadyanCodeSay.TASK]: "task",
		[HadyanCodeSay.ERROR]: "error",
		[HadyanCodeSay.API_REQ_STARTED]: "api_req_started",
		[HadyanCodeSay.API_REQ_FINISHED]: "api_req_finished",
		[HadyanCodeSay.TEXT]: "text",
		[HadyanCodeSay.REASONING]: "reasoning",
		[HadyanCodeSay.COMPLETION_RESULT_SAY]: "completion_result",
		[HadyanCodeSay.PLAN_COMPLETION_RESULT]: "plan_completion_result",
		[HadyanCodeSay.USER_FEEDBACK]: "user_feedback",
		[HadyanCodeSay.USER_FEEDBACK_DIFF]: "user_feedback_diff",
		[HadyanCodeSay.COMMAND_SAY]: "command",
		[HadyanCodeSay.COMMAND_OUTPUT_SAY]: "command_output",
		[HadyanCodeSay.TOOL_SAY]: "tool",
		[HadyanCodeSay.SHELL_INTEGRATION_WARNING]: "shell_integration_warning",
		[HadyanCodeSay.BROWSER_ACTION_LAUNCH_SAY]: "browser_action_launch",
		[HadyanCodeSay.BROWSER_ACTION]: "browser_action",
		[HadyanCodeSay.BROWSER_ACTION_RESULT]: "browser_action_result",
		[HadyanCodeSay.MCP_SERVER_REQUEST_STARTED]: "mcp_server_request_started",
		[HadyanCodeSay.MCP_SERVER_RESPONSE]: "mcp_server_response",
		[HadyanCodeSay.MCP_NOTIFICATION]: "mcp_notification",
		[HadyanCodeSay.USE_MCP_SERVER_SAY]: "use_mcp_server",
		[HadyanCodeSay.DIFF_ERROR]: "diff_error",
		[HadyanCodeSay.DELETED_API_REQS]: "deleted_api_reqs",
		[HadyanCodeSay.HADYANCODEIGNORE_ERROR]: "hadyancodeignore_error",
		[HadyanCodeSay.COMMAND_PERMISSION_DENIED]: "command_permission_denied",
		[HadyanCodeSay.CHECKPOINT_CREATED]: "checkpoint_created",
		[HadyanCodeSay.LOAD_MCP_DOCUMENTATION]: "load_mcp_documentation",
		[HadyanCodeSay.INFO]: "info",
		[HadyanCodeSay.TASK_PROGRESS]: "task_progress",
		[HadyanCodeSay.HOOK_STATUS]: "hook_status",
		[HadyanCodeSay.HOOK_OUTPUT_STREAM]: "hook_output_stream",
		[HadyanCodeSay.CONDITIONAL_RULES_APPLIED]: "conditional_rules_applied",
		[HadyanCodeSay.SUBAGENT_STATUS]: "subagent",
		[HadyanCodeSay.USE_SUBAGENTS_SAY]: "use_subagents",
		[HadyanCodeSay.SUBAGENT_USAGE]: "subagent_usage",
		[HadyanCodeSay.COMPACTION]: "compaction",
	}

	return mapping[say]
}

/**
 * Convert application HadyanCodeMessage to proto HadyanCodeMessage
 */
export function convertHadyanCodeMessageToProto(message: AppHadyanCodeMessage): ProtoHadyanCodeMessage {
	// For sending messages, we need to provide values for required proto fields
	const askEnum = message.ask ? convertHadyanCodeAskToProtoEnum(message.ask) : undefined
	const sayEnum = message.say ? convertHadyanCodeSayToProtoEnum(message.say) : undefined

	// Determine appropriate enum values based on message type
	let finalAskEnum: HadyanCodeAsk = HadyanCodeAsk.FOLLOWUP // Proto default
	let finalSayEnum: HadyanCodeSay = HadyanCodeSay.TEXT // Proto default

	if (message.type === "ask") {
		finalAskEnum = askEnum ?? HadyanCodeAsk.FOLLOWUP // Use FOLLOWUP as default for ask messages
	} else if (message.type === "say") {
		finalSayEnum = sayEnum ?? HadyanCodeSay.TEXT // Use TEXT as default for say messages
	}

	const protoMessage: ProtoHadyanCodeMessage = {
		ts: message.ts,
		type: message.type === "ask" ? HadyanCodeMessageType.ASK : HadyanCodeMessageType.SAY,
		ask: finalAskEnum,
		say: finalSayEnum,
		text: message.text ?? "",
		reasoning: message.reasoning ?? "",
		images: message.images ?? [],
		files: message.files ?? [],
		partial: message.partial ?? false,
		// Convergent-replica fields (default 0 = unstamped, e.g. classic/legacy path).
		seq: message.seq ?? 0,
		epoch: message.epoch ?? 0,
		lastCheckpointHash: message.lastCheckpointHash ?? "",
		isCheckpointCheckedOut: message.isCheckpointCheckedOut ?? false,
		isOperationOutsideWorkspace: message.isOperationOutsideWorkspace ?? false,
		conversationHistoryIndex: message.conversationHistoryIndex ?? 0,
		conversationHistoryDeletedRange: message.conversationHistoryDeletedRange
			? {
					startIndex: message.conversationHistoryDeletedRange[0],
					endIndex: message.conversationHistoryDeletedRange[1],
				}
			: undefined,
		// Additional optional fields for specific ask/say types
		sayTool: undefined,
		sayBrowserAction: undefined,
		browserActionResult: undefined,
		askUseMcpServer: undefined,
		planModeResponse: undefined,
		askQuestion: undefined,
		askNewTask: undefined,
		apiReqInfo: undefined,
		modelInfo: message.modelInfo ?? undefined,
	}

	return protoMessage
}

/**
 * Convert proto HadyanCodeMessage to application HadyanCodeMessage
 */
export function convertProtoToHadyanCodeMessage(protoMessage: ProtoHadyanCodeMessage): AppHadyanCodeMessage {
	const message: AppHadyanCodeMessage = {
		ts: protoMessage.ts,
		type: protoMessage.type === HadyanCodeMessageType.ASK ? "ask" : "say",
	}

	// Convert ask enum to string
	if (protoMessage.type === HadyanCodeMessageType.ASK) {
		const ask = convertProtoEnumToHadyanCodeAsk(protoMessage.ask)
		if (ask !== undefined) {
			message.ask = ask
		}
	}

	// Convert say enum to string
	if (protoMessage.type === HadyanCodeMessageType.SAY) {
		const say = convertProtoEnumToHadyanCodeSay(protoMessage.say)
		if (say !== undefined) {
			message.say = say
		}
	}

	// Convert other fields - preserve empty strings as they may be intentional
	if (protoMessage.text !== "") {
		message.text = protoMessage.text
	}
	if (protoMessage.reasoning !== "") {
		message.reasoning = protoMessage.reasoning
	}
	if (protoMessage.images.length > 0) {
		message.images = protoMessage.images
	}
	if (protoMessage.files.length > 0) {
		message.files = protoMessage.files
	}
	if (protoMessage.partial) {
		message.partial = protoMessage.partial
	}
	if (protoMessage.lastCheckpointHash !== "") {
		message.lastCheckpointHash = protoMessage.lastCheckpointHash
	}
	if (protoMessage.isCheckpointCheckedOut) {
		message.isCheckpointCheckedOut = protoMessage.isCheckpointCheckedOut
	}
	if (protoMessage.isOperationOutsideWorkspace) {
		message.isOperationOutsideWorkspace = protoMessage.isOperationOutsideWorkspace
	}
	if (protoMessage.conversationHistoryIndex !== 0) {
		message.conversationHistoryIndex = protoMessage.conversationHistoryIndex
	}

	// Convert conversationHistoryDeletedRange from object to tuple
	if (protoMessage.conversationHistoryDeletedRange) {
		message.conversationHistoryDeletedRange = [
			protoMessage.conversationHistoryDeletedRange.startIndex,
			protoMessage.conversationHistoryDeletedRange.endIndex,
		]
	}

	// Convergent-replica fields. 0 means unstamped (classic/legacy path) — leave undefined so
	// the webview reducer treats such messages as always-applicable rather than epoch 0.
	if (protoMessage.seq && protoMessage.seq !== 0) {
		message.seq = protoMessage.seq
	}
	if (protoMessage.epoch && protoMessage.epoch !== 0) {
		message.epoch = protoMessage.epoch
	}

	return message
}
