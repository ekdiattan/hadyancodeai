import { Empty, StringRequest } from "@shared/proto/hadyancode/common"
import * as vscode from "vscode"

const HADYANCODE_OUTPUT_CHANNEL = vscode.window.createOutputChannel("HadyanCode")

// Appends a log message to all HadyanCode output channels.
export async function debugLog(request: StringRequest): Promise<Empty> {
	HADYANCODE_OUTPUT_CHANNEL.appendLine(request.value)
	return Empty.create({})
}

// Register the HadyanCode output channel within the VSCode extension context.
export function registerHadyanCodeOutputChannel(context: vscode.ExtensionContext): vscode.OutputChannel {
	context.subscriptions.push(HADYANCODE_OUTPUT_CHANNEL)
	return HADYANCODE_OUTPUT_CHANNEL
}
