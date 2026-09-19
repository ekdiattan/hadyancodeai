import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react"
import { Sparkles } from "lucide-react"
import { useHadyanCodePassPromo } from "@/hooks/useHadyanCodePassPromo"
import VSCodeButtonLink from "../common/VSCodeButtonLink"

/**
 * HadyanCodePass section for the signed-in account view. Promotes the subscription
 * to users who aren't on the HadyanCodePass provider, and links to subscription
 * management for those who are.
 */
export const HadyanCodePassCard = () => {
	const {
		isHadyanCodePassEnabled,
		isUsingHadyanCodePass,
		subscribeUrl,
		manageSubscriptionUrl,
		switchToHadyanCodePassProvider,
	} = useHadyanCodePassPromo()

	if (!isHadyanCodePassEnabled) {
		return null
	}

	return (
		<div className="flex flex-col gap-2" data-testid="hadyancode-pass-card">
			<VSCodeDivider className="w-full mt-6 mb-3" />
			<div className="flex items-center gap-2">
				<Sparkles className="size-4 shrink-0 text-[var(--vscode-charts-yellow)]" />
				<span className="text-base font-semibold">HadyanCodePass</span>
			</div>

			{isUsingHadyanCodePass ? (
				<>
					<p className="m-0 text-sm text-description">
						You're using the HadyanCodePass provider. Manage your subscription and view usage from your dashboard.
					</p>
					<div className="w-full flex gap-2 flex-col min-[225px]:flex-row">
						<div className="w-full min-[225px]:w-1/2">
							<VSCodeButtonLink appearance="secondary" className="w-full" href={manageSubscriptionUrl}>
								Manage Subscription
							</VSCodeButtonLink>
						</div>
					</div>
				</>
			) : (
				<>
					<p className="m-0 text-sm text-description">
						A monthly subscription for the latest open-weights models, at much lower cost than paying for direct API
						access.
					</p>
					<div className="w-full flex gap-2 flex-col min-[225px]:flex-row">
						<div className="w-full min-[225px]:w-1/2">
							<VSCodeButtonLink appearance="primary" className="w-full" href={subscribeUrl}>
								Get HadyanCodePass
							</VSCodeButtonLink>
						</div>
						<VSCodeButton
							appearance="secondary"
							className="w-full min-[225px]:w-1/2"
							onClick={() => void switchToHadyanCodePassProvider()}>
							Use HadyanCodePass Provider
						</VSCodeButton>
					</div>
				</>
			)}
		</div>
	)
}

/**
 * Compact HadyanCodePass callout for the signed-out account welcome view.
 */
export const HadyanCodePassWelcomeCallout = () => {
	const { isHadyanCodePassEnabled } = useHadyanCodePassPromo()

	if (!isHadyanCodePassEnabled) {
		return null
	}

	return (
		<div
			className="w-full flex items-start gap-2 rounded-sm bg-[var(--vscode-textBlockQuote-background)] p-3 mb-2"
			data-testid="hadyancode-pass-welcome-callout">
			<Sparkles className="size-4 shrink-0 mt-0.5 text-[var(--vscode-charts-yellow)]" />
			<p className="m-0 text-xs text-description">
				<span className="font-semibold text-foreground">HadyanCodePass</span> — a low-cost monthly subscription for the
				latest open-weights models, much cheaper than direct API access. Sign up to subscribe from your dashboard.
			</p>
		</div>
	)
}
