import { useCallback, useMemo } from "react"
import {
	buildHadyanCodePassSubscribeUrl,
	buildHadyanCodePassSubscriptionPageUrl,
} from "@/components/onboarding/hadyancodePassSubscribe"
import { useApiConfigurationHandlers } from "@/components/settings/utils/useApiConfigurationHandlers"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useHadyanCodeAuth } from "@/context/HadyanCodeAuthContext"
import { UiServiceClient } from "@/services/grpc-client"

export const HADYANCODE_PASS_PROVIDER_ID = "hadyancode-pass"

/**
 * Shared state + actions for the HadyanCodePass promotional surfaces (home banner,
 * account page card, settings provider hint). Promotions are hidden in
 * self-hosted mode (HadyanCodePass is a cloud subscription) and behind org
 * remote-config provider allowlists so they never offer a provider the
 * organization disallows.
 */
export function useHadyanCodePassPromo() {
	const { apiConfiguration, environment, navigateToSettings, remoteConfigSettings, mode, planActSeparateModelsSetting } =
		useExtensionState()
	const { hadyancodeUser } = useHadyanCodeAuth()
	const { handleModeFieldChange } = useApiConfigurationHandlers()

	const isSelfHostedOrUnknown = !environment || environment === "selfHosted"
	const remoteProviders: string[] = remoteConfigSettings?.remoteConfiguredProviders || []
	const isBlockedByRemoteConfig = remoteProviders.length > 0 && !remoteProviders.includes(HADYANCODE_PASS_PROVIDER_ID)
	const isHadyanCodePassEnabled = !isSelfHostedOrUnknown && !isBlockedByRemoteConfig

	// Mirrors the switch action's scope: with separate plan/act models the
	// promos only affect (and therefore only reflect) the current mode.
	const currentModeProvider = mode === "plan" ? apiConfiguration?.planModeApiProvider : apiConfiguration?.actModeApiProvider
	const isUsingHadyanCodePass = planActSeparateModelsSetting
		? currentModeProvider === HADYANCODE_PASS_PROVIDER_ID
		: apiConfiguration?.planModeApiProvider === HADYANCODE_PASS_PROVIDER_ID ||
			apiConfiguration?.actModeApiProvider === HADYANCODE_PASS_PROVIDER_ID

	const subscribeUrl = useMemo(() => buildHadyanCodePassSubscribeUrl(hadyancodeUser?.appBaseUrl), [hadyancodeUser?.appBaseUrl])
	const manageSubscriptionUrl = useMemo(
		() => buildHadyanCodePassSubscriptionPageUrl(hadyancodeUser?.appBaseUrl),
		[hadyancodeUser?.appBaseUrl],
	)

	const openSubscribePage = useCallback(() => {
		UiServiceClient.openUrl({ value: subscribeUrl }).catch((err) =>
			console.error("Failed to open HadyanCodePass subscribe page:", err),
		)
	}, [subscribeUrl])

	const openManageSubscriptionPage = useCallback(() => {
		UiServiceClient.openUrl({ value: manageSubscriptionUrl }).catch((err) =>
			console.error("Failed to open HadyanCodePass subscription page:", err),
		)
	}, [manageSubscriptionUrl])

	// Selects HadyanCodePass without navigating (for surfaces that already show the
	// provider settings inline). Mirrors the provider dropdown: updates both
	// modes, or only the current mode when plan/act use separate models, so the
	// other mode's provider is never silently overwritten. Returns whether the
	// provider update actually succeeded.
	const selectHadyanCodePassProvider = useCallback(async (): Promise<boolean> => {
		try {
			await handleModeFieldChange(
				{ plan: "planModeApiProvider", act: "actModeApiProvider" },
				HADYANCODE_PASS_PROVIDER_ID,
				mode,
			)
			return true
		} catch (error) {
			console.error("Failed to switch to HadyanCodePass provider:", error)
			return false
		}
	}, [handleModeFieldChange, mode])

	// Selects HadyanCodePass for both modes and lands the user on the provider
	// settings so they can pick a model / sign in. Only navigates when the
	// provider update succeeded, so a failure doesn't strand the user on the
	// settings page with their old provider still selected.
	const switchToHadyanCodePassProvider = useCallback(async () => {
		if (await selectHadyanCodePassProvider()) {
			navigateToSettings("api-config")
		}
	}, [selectHadyanCodePassProvider, navigateToSettings])

	return {
		isHadyanCodePassEnabled,
		isUsingHadyanCodePass,
		subscribeUrl,
		manageSubscriptionUrl,
		openSubscribePage,
		openManageSubscriptionPage,
		selectHadyanCodePassProvider,
		switchToHadyanCodePassProvider,
	}
}
