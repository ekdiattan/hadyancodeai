import {
	listLocalProviders as internalListLocalProviders,
	type ProviderSettingsManager,
} from "@hadyancode/core";

export async function listLocalProviders(
	manager: ProviderSettingsManager,
): ReturnType<typeof internalListLocalProviders> {
	return await internalListLocalProviders(manager, {
		isHadyanCodePassEnabled: true,
	});
}
