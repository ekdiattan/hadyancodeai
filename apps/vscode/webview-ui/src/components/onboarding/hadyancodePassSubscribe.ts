import { StringRequest } from "@shared/proto/hadyancode/common"
import { UiServiceClient } from "@/services/grpc-client"

// HadyanCodePass subscription signup page in the dashboard (requires auth).
const HADYANCODE_PASS_SUBSCRIBE_PATH = "/onboarding/individual-plan"
const HADYANCODE_PASS_USAGE_PATH = "/dashboard/subscription"
export const DEFAULT_APP_BASE_URL = "https://app.cline.bot"

// Module-level so the pending intent survives OnboardingView unmounting: handleAuthCallback
// completes the welcome view (unmounting onboarding) before it pushes the auth-status update
// that sets hadyancodeUser, so this must outlive the component to fire the redirect.
let pendingHadyanCodePassSubscribe = false

export function setPendingHadyanCodePassSubscribe(pending: boolean): void {
	pendingHadyanCodePassSubscribe = pending
}

// Appends a dashboard path to the app base URL, preserving any path prefix in
// the base (new URL(path, base) would drop it for leading-slash paths).
function joinAppBaseUrl(appBaseUrl: string | undefined, path: string): string {
	const baseUrl = appBaseUrl || DEFAULT_APP_BASE_URL
	return `${baseUrl.replace(/\/+$/, "")}${path}`
}

// Opens the HadyanCodePass subscription page once a pending signup is authenticated (guarded so it fires once).
export function openHadyanCodePassSubscriptionIfPending(appBaseUrl: string | undefined): void {
	if (!pendingHadyanCodePassSubscribe) {
		return
	}
	pendingHadyanCodePassSubscribe = false
	UiServiceClient.openUrl(StringRequest.create({ value: joinAppBaseUrl(appBaseUrl, HADYANCODE_PASS_SUBSCRIBE_PATH) })).catch(
		(err) => console.error("Failed to open HadyanCodePass subscription page:", err),
	)
}

export function buildHadyanCodePassSubscriptionPageUrl(appBaseUrl: string | undefined): string {
	// HadyanCodePass always bills the personal account, so force the personal
	// dashboard context for org-context users (matches EntitlementError and
	// the CLI's subscription links).
	return `${joinAppBaseUrl(appBaseUrl, HADYANCODE_PASS_USAGE_PATH)}?personal=true`
}

// Signup/subscribe page for users who don't have a HadyanCodePass subscription yet.
export function buildHadyanCodePassSubscribeUrl(appBaseUrl: string | undefined): string {
	return joinAppBaseUrl(appBaseUrl, HADYANCODE_PASS_SUBSCRIBE_PATH)
}
