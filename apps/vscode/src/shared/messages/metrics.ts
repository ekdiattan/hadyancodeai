import { Mode } from "../storage/types"

export interface HadyanCodeMessageModelInfo {
	modelId: string
	providerId: string
	mode: Mode
}

interface HadyanCodeTokensInfo {
	prompt: number // Total input tokens (includes cached + non-cached)
	completion: number // Total output tokens
	cached: number // Subset of prompt_tokens that were cache hits
}

export interface HadyanCodeMessageMetricsInfo {
	tokens?: HadyanCodeTokensInfo
	cost?: number // Monetary cost for this turn
}
