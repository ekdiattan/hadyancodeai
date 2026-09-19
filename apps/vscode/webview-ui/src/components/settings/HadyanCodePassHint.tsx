import type { Mode } from "@shared/storage/types"
import { Sparkles, XIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { HADYANCODE_PASS_PROVIDER_ID, useHadyanCodePassPromo } from "@/hooks/useHadyanCodePassPromo"
import { StateServiceClient } from "@/services/grpc-client"
import { isBannerDismissedForSession, markBannerDismissedForSession } from "@/utils/sessionBannerDismissals"
import { useApiConfigurationHandlers } from "./utils/useApiConfigurationHandlers"

const HADYANCODE_PASS_SETTINGS_HINT_ID = "hadyancode-pass-settings-hint-v1"

interface HadyanCodePassHintProps {
	selectedProvider: string
	currentMode: Mode
}

/**
 * Compact, dismissible callout under the API provider dropdown that lets users
 * of any provider discover HadyanCodePass. Selecting it swaps the provider in place
 * so its settings render right below.
 */
export const HadyanCodePassHint = ({ selectedProvider, currentMode }: HadyanCodePassHintProps) => {
	// Covers self-hosted mode and org-managed provider allowlists.
	const { isHadyanCodePassEnabled } = useHadyanCodePassPromo()
	const { dismissedBanners } = useExtensionState()
	const { handleModeFieldChange } = useApiConfigurationHandlers()
	// Seeded from the session-scoped record so the dismissal survives unmounts.
	const [locallyDismissed, setLocallyDismissed] = useState(() => isBannerDismissedForSession(HADYANCODE_PASS_SETTINGS_HINT_ID))

	const isDismissed =
		locallyDismissed || (dismissedBanners ?? []).some((dismissed) => dismissed.bannerId === HADYANCODE_PASS_SETTINGS_HINT_ID)

	if (!isHadyanCodePassEnabled || selectedProvider === HADYANCODE_PASS_PROVIDER_ID || isDismissed) {
		return null
	}

	const handleDismiss = () => {
		markBannerDismissedForSession(HADYANCODE_PASS_SETTINGS_HINT_ID)
		setLocallyDismissed(true)
		StateServiceClient.dismissBanner({ value: HADYANCODE_PASS_SETTINGS_HINT_ID }).catch(console.error)
	}

	// Mirror the provider dropdown: only touch the current mode's provider when
	// plan/act use separate models, otherwise update both.
	const handleTryIt = () => {
		handleModeFieldChange(
			{ plan: "planModeApiProvider", act: "actModeApiProvider" },
			HADYANCODE_PASS_PROVIDER_ID,
			currentMode,
		).catch((error) => console.error("Failed to switch to HadyanCodePass provider:", error))
	}

	return (
		<div
			className="flex items-start gap-2 rounded-sm bg-[var(--vscode-textBlockQuote-background)] px-2.5 py-2 mt-1"
			data-testid="hadyancode-pass-settings-hint">
			<Sparkles className="size-3.5 shrink-0 mt-0.5 text-[var(--vscode-charts-yellow)]" />
			<div className="grow text-xs text-description">
				<span className="font-semibold text-foreground">HadyanCodePass</span> — a low-cost subscription for the latest
				open-weights models.{" "}
				<button
					className="cursor-pointer border-0 bg-transparent p-0 text-xs text-[var(--vscode-textLink-foreground)] underline hover:text-[var(--vscode-textLink-activeForeground,var(--vscode-textLink-foreground))]"
					onClick={handleTryIt}
					type="button">
					Try it
				</button>
			</div>
			<Button
				aria-label="Dismiss HadyanCodePass hint"
				className="shrink-0 -mt-0.5 -mr-1"
				onClick={handleDismiss}
				size="icon"
				variant="icon">
				<XIcon className="size-3.5" />
			</Button>
		</div>
	)
}
