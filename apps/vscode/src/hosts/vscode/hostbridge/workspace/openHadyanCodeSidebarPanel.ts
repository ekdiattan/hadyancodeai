import * as vscode from "vscode"
import { ExtensionRegistryInfo } from "@/registry"
import { OpenHadyanCodeSidebarPanelRequest, OpenHadyanCodeSidebarPanelResponse } from "@/shared/proto/index.host"

export async function openHadyanCodeSidebarPanel(
	_: OpenHadyanCodeSidebarPanelRequest,
): Promise<OpenHadyanCodeSidebarPanelResponse> {
	await vscode.commands.executeCommand(`${ExtensionRegistryInfo.views.Sidebar}.focus`)
	return {}
}
