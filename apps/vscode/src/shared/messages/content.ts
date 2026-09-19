import type { Anthropic } from "@anthropic-ai/sdk"
import type { HadyanCodeMessageMetricsInfo, HadyanCodeMessageModelInfo } from "./metrics"

export type HadyanCodePromptInputContent = string

export type HadyanCodeMessageRole = "user" | "assistant"

export interface HadyanCodeReasoningDetailParam {
	type: "reasoning.text" | string
	text: string
	signature: string
	format: "anthropic-claude-v1" | string
	index: number
}

interface HadyanCodeSharedMessageParam {
	// The id of the response that the block belongs to
	call_id?: string
}

export const REASONING_DETAILS_PROVIDERS = ["hadyancode", "openrouter"]

/**
 * An extension of Anthropic.MessageParam that includes HadyanCode-specific fields: reasoning_details.
 * This ensures backward compatibility where the messages were stored in Anthropic format with additional
 * fields unknown to Anthropic SDK.
 */
export interface HadyanCodeTextContentBlock extends Anthropic.TextBlockParam, HadyanCodeSharedMessageParam {
	// reasoning_details only exists for providers listed in REASONING_DETAILS_PROVIDERS
	reasoning_details?: HadyanCodeReasoningDetailParam[]
	// Thought Signature associates with Gemini
	signature?: string
}

export interface HadyanCodeImageContentBlock extends Anthropic.ImageBlockParam, HadyanCodeSharedMessageParam {}

export interface HadyanCodeDocumentContentBlock extends Anthropic.DocumentBlockParam, HadyanCodeSharedMessageParam {}

export interface HadyanCodeUserToolResultContentBlock extends Anthropic.ToolResultBlockParam, HadyanCodeSharedMessageParam {}

/**
 * Assistant only content types
 */
export interface HadyanCodeAssistantToolUseBlock extends Anthropic.ToolUseBlockParam, HadyanCodeSharedMessageParam {
	// reasoning_details only exists for providers listed in REASONING_DETAILS_PROVIDERS
	reasoning_details?: unknown[] | HadyanCodeReasoningDetailParam[]
	// Thought Signature associates with Gemini
	signature?: string
}

export interface HadyanCodeAssistantThinkingBlock extends Anthropic.ThinkingBlock, HadyanCodeSharedMessageParam {
	// The summary items returned by OpenAI response API
	// The reasoning details that will be moved to the text block when finalized
	summary?: unknown[] | HadyanCodeReasoningDetailParam[]
}

export interface HadyanCodeAssistantRedactedThinkingBlock
	extends Anthropic.RedactedThinkingBlockParam,
		HadyanCodeSharedMessageParam {}

export type HadyanCodeToolResponseContent =
	| HadyanCodePromptInputContent
	| Array<HadyanCodeTextContentBlock | HadyanCodeImageContentBlock>

export type HadyanCodeUserContent =
	| HadyanCodeTextContentBlock
	| HadyanCodeImageContentBlock
	| HadyanCodeDocumentContentBlock
	| HadyanCodeUserToolResultContentBlock

export type HadyanCodeAssistantContent =
	| HadyanCodeTextContentBlock
	| HadyanCodeImageContentBlock
	| HadyanCodeDocumentContentBlock
	| HadyanCodeAssistantToolUseBlock
	| HadyanCodeAssistantThinkingBlock
	| HadyanCodeAssistantRedactedThinkingBlock

export type HadyanCodeContent = HadyanCodeUserContent | HadyanCodeAssistantContent

/**
 * An extension of Anthropic.MessageParam that includes HadyanCode-specific fields.
 * This ensures backward compatibility where the messages were stored in Anthropic format,
 * while allowing for additional metadata specific to HadyanCode to avoid unknown fields in Anthropic SDK
 * added by ignoring the type checking for those fields.
 */
export interface HadyanCodeStorageMessage extends Anthropic.MessageParam {
	/**
	 * Response ID associated with this message
	 */
	id?: string
	role: HadyanCodeMessageRole
	content: HadyanCodePromptInputContent | HadyanCodeContent[]
	/**
	 * NOTE: model information used when generating this message.
	 * Internal use for message conversion only.
	 * MUST be removed before sending message to any LLM provider.
	 */
	modelInfo?: HadyanCodeMessageModelInfo
	/**
	 * LLM operational and performance metrics for this message
	 * Includes token counts, costs.
	 */
	metrics?: HadyanCodeMessageMetricsInfo
	/**
	 * Timestamp of when the message was created
	 */
	ts?: number
}

/**
 * Converts HadyanCodeStorageMessage to Anthropic.MessageParam by removing HadyanCode-specific fields
 * HadyanCode-specific fields (like modelInfo, reasoning_details) are properly omitted.
 */
export function convertHadyanCodeStorageToAnthropicMessage(
	hadyancodeMessage: HadyanCodeStorageMessage,
	provider = "anthropic",
): Anthropic.MessageParam {
	const { role, content } = hadyancodeMessage

	// Handle string content - fast path
	if (typeof content === "string") {
		return { role, content }
	}

	// Removes thinking block that has no signature (invalid thinking block that's incompatible with Anthropic API)
	const filteredContent = content.filter((b) => b.type !== "thinking" || !!b.signature)

	// Handle array content - strip HadyanCode-specific fields for non-reasoning_details providers
	const shouldCleanContent = !REASONING_DETAILS_PROVIDERS.includes(provider)
	const cleanedContent = shouldCleanContent
		? filteredContent.map(cleanContentBlock)
		: (filteredContent as Anthropic.MessageParam["content"])

	return { role, content: cleanedContent }
}

/**
 * HadyanCode stores images as base64, so an image block's source is always a base64 source.
 * The Anthropic SDK types the source as a Base64ImageSource | URLImageSource union, so this
 * narrows to the base64 variant for the transform layer. URL sources are not produced by HadyanCode,
 * so they degrade to empty values rather than throwing.
 */
export function getBase64ImageSource(source: Anthropic.ImageBlockParam["source"]): { mediaType: string; data: string } {
	if (source.type === "base64") {
		return { mediaType: source.media_type, data: source.data }
	}
	return { mediaType: "", data: "" }
}

/**
 * Builds a base64 data URL from an image block's source. See getBase64ImageSource.
 */
export function getImageDataUrl(source: Anthropic.ImageBlockParam["source"]): string {
	const { mediaType, data } = getBase64ImageSource(source)
	return `data:${mediaType};base64,${data}`
}

/**
 * Clean a content block by removing HadyanCode-specific fields and returning only Anthropic-compatible fields
 */
export function cleanContentBlock(block: HadyanCodeContent): Anthropic.ContentBlock {
	// Fast path: if no HadyanCode-specific fields exist, return as-is
	const hasHadyanCodeFields =
		"reasoning_details" in block ||
		"call_id" in block ||
		"summary" in block ||
		(block.type !== "thinking" && "signature" in block)

	if (!hasHadyanCodeFields) {
		return block as Anthropic.ContentBlock
	}

	// Removes HadyanCode-specific fields & the signature field that's added for Gemini.
	const { reasoning_details, call_id, summary, ...rest } = block as any

	// Remove signature from non-thinking blocks that were added for Gemini
	if (block.type !== "thinking" && rest.signature) {
		rest.signature = undefined
	}

	return rest satisfies Anthropic.ContentBlock
}
