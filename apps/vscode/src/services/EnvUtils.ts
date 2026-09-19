import { HostProvider } from "@/hosts/host-provider"
import { ExtensionRegistryInfo } from "@/registry"
import { EmptyRequest } from "@/shared/proto/hadyancode/common"
import { Logger } from "@/shared/services/Logger"

// Canonical header names for extra client/host context
const HadyanCodeHeaders = {
	PLATFORM: "X-PLATFORM",
	PLATFORM_VERSION: "X-PLATFORM-VERSION",
	CLIENT_VERSION: "X-CLIENT-VERSION",
	CLIENT_TYPE: "X-CLIENT-TYPE",
	CORE_VERSION: "X-CORE-VERSION",
	IS_MULTIROOT: "X-IS-MULTIROOT",
} as const

export function buildExternalBasicHeaders(): Record<string, string> {
	return {
		"User-Agent": `HadyanCode/${ExtensionRegistryInfo.version}`,
	}
}

export async function buildBasicHadyanCodeHeaders(): Promise<Record<string, string>> {
	const headers: Record<string, string> = buildExternalBasicHeaders()
	try {
		const host = await HostProvider.env.getHostVersion(EmptyRequest.create({}))
		headers[HadyanCodeHeaders.PLATFORM] = host.platform || "unknown"
		headers[HadyanCodeHeaders.PLATFORM_VERSION] = host.version || "unknown"
		headers[HadyanCodeHeaders.CLIENT_TYPE] = host.hadyancodeType || "unknown"
		headers[HadyanCodeHeaders.CLIENT_VERSION] = host.hadyancodeVersion || "unknown"
	} catch (error) {
		Logger.log("Failed to get IDE/platform info via HostBridge EnvService.getHostVersion", error)
		headers[HadyanCodeHeaders.PLATFORM] = "unknown"
		headers[HadyanCodeHeaders.PLATFORM_VERSION] = "unknown"
		headers[HadyanCodeHeaders.CLIENT_TYPE] = "unknown"
		headers[HadyanCodeHeaders.CLIENT_VERSION] = "unknown"
	}
	headers[HadyanCodeHeaders.CORE_VERSION] = ExtensionRegistryInfo.version

	return headers
}
